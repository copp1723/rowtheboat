import { sql } from 'drizzle-orm';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { jobs, taskLogs } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Import the centralized BullMQ types
import {
  TaskJobData,
  JobStatus,
  Queue,
  QueueScheduler,
  Worker,
  Job,
  TypedJob
} from '../types/bullmq';
import type { Redis as IORedisClient, RedisOptions } from 'ioredis';

// In-memory job structure
export interface InMemoryJob {
  id: string;
  taskId: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  data: TaskJobData;
  createdAt: Date;
  updatedAt: Date;
  nextRunAt: Date;
  lastRunAt?: Date;
}

// In-memory job storage and mode flag
const inMemoryJobs: InMemoryJob[] = [];
let inMemoryMode = false;

// Redis/BullMQ clients
let redisClient: IORedisClient | null = null;
let jobQueue: Queue<TaskJobData> | null = null;
let scheduler: QueueScheduler | null = null;

// Redis connection options
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
};

// Exported function to initialize the job queue
export async function initializeJobQueue() {
  try {
    if (process.env.FORCE_IN_MEMORY_QUEUE === 'true') {
      throw new Error('Forcing in-memory queue mode');
    }
    const RedisModule = await import('ioredis');
    const Redis = RedisModule.default || RedisModule;
    redisClient = new Redis(redisOptions) as IORedisClient;
    redisClient.on('error', (err: Error) => {
      if (!inMemoryMode) {
        logger.error({
          event: 'redis_connection_error',
          errorMessage: err.message,
          timestamp: new Date().toISOString(),
        }, `Redis connection error: ${err.message}`);
      }
    });
    await redisClient.ping();
    const bullmqModule = await import('bullmq');

    // Get the Queue and QueueScheduler classes from the imported module
    const QueueClass = bullmqModule.default?.Queue || bullmqModule.Queue;
    const QueueSchedulerClass = bullmqModule.default?.QueueScheduler || bullmqModule.QueueScheduler;

    if (!QueueClass || !QueueSchedulerClass) {
      throw new Error('Failed to import BullMQ classes');
    }

    jobQueue = new QueueClass('taskProcessor', { connection: redisClient }) as Queue<TaskJobData>;
    scheduler = new QueueSchedulerClass('taskProcessor', { connection: redisClient });

    logger.info({ event: 'bullmq_initialized', timestamp: new Date().toISOString() }, 'BullMQ initialized with Redis connection');
    inMemoryMode = false;
  } catch (error) {
    logger.warn({
      event: 'redis_connection_failed',
      errorMessage: isError(error) ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, 'Redis connection failed, using in-memory job queue');
    inMemoryMode = true;
  }
  await setupWorker();
}

// --- Worker Setup Section ---
/**
 * Comprehensive BullMQ job interface
 */
export interface BullJob<T = TaskJobData> {
  id: string;
  name: string;
  queueName: string;
  data: T;
  opts: {
    attempts: number;
    backoff: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    priority?: number;
  };
  progress: (value: number) => Promise<void>;
  log: (message: string) => Promise<void>;
  update: (data: T) => Promise<void>;
}

/**
 * Initialize a BullMQ worker to process jobs from the queue.
 * Handles job completion and failure events with explicit typing.
 */
async function setupWorker() {
  if (!inMemoryMode && redisClient) {
    try {
      // Import BullMQ Worker class dynamically
      const bullmq = await import('bullmq');

      // Get the Worker class from the imported module
      // Use type assertion to handle dynamic import
      const WorkerClass = (bullmq as any).Worker || ((bullmq as any).default && (bullmq as any).default.Worker);

      if (!WorkerClass) {
        throw new Error('Failed to import BullMQ Worker class');
      }

      // Use type assertion to handle the worker creation
      const worker = new WorkerClass(
        'taskProcessor',
        async (job: BullJob<TaskJobData>) => {
          if (job?.id && job?.data) {
            await processJob(job.id, job.data);
          }
        },
        {
          connection: redisClient,
          autorun: false
        }
      ) as any;

      worker.on('completed', async (job: BullJob<TaskJobData>) => {
        if (job?.id) await updateJobStatus(job.id, 'completed');
      });

      worker.on('failed', async (job: BullJob<TaskJobData> | undefined, error: Error) => {
        if (job?.id) {
          await updateJobStatus(job.id, 'failed', error.message);
          if (job.opts.attempts > 1) {
            const nextRunAt = new Date(Date.now() + job.opts.backoff.delay);
            await updateJobForRetry(job.id, error.message, nextRunAt);
          }
        }
      });

      worker.run();
      logger.info('BullMQ worker initialized with type-safe job processing');
    } catch (error) {
      logger.error('Failed to initialize type-safe BullMQ worker', error);
      inMemoryMode = true;
    }
  } else {
    logger.info({ event: 'in_memory_processor_initialized', timestamp: new Date().toISOString() }, 'In-memory job processor initialized');
    setInterval(processInMemoryJobs, 5000);
  }
}

// Process in-memory jobs for dev environments
async function processInMemoryJobs() {
  const now = new Date();
  const pendingJobs = inMemoryJobs.filter((job) => job.status === 'pending' && job.nextRunAt <= now);
  for (const job of pendingJobs) {
    try {
      // Use 'processing' instead of 'running' to match JobStatus type
      job.status = 'processing';
      job.lastRunAt = new Date();
      await processJob(job.id, job.data);
      job.status = 'completed';
      job.updatedAt = new Date();
    } catch (error) {
      // Get error message
      const errorMsg = isError(error) ? error.message : String(error);
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.lastError = errorMsg;
      } else {
        job.attempts += 1;
        job.lastError = errorMsg;
        const backoffDelay = Math.pow(2, job.attempts) * 5000;
        job.nextRunAt = new Date(Date.now() + backoffDelay);
      }
      job.updatedAt = new Date();
    }
  }
}

// Core job processing logic
async function processJob(_jobId: string, data: TaskJobData) {
  // Basic validation
  if (typeof data.taskId !== 'string') {
    throw new Error('Invalid job data: taskId must be a string');
  }

  if (data.taskType === 'scheduledWorkflow' && !data.workflowId) {
    throw new Error('workflowId required for scheduledWorkflow tasks');
  }

  try {
    const { taskId } = data;
    if (!taskId) {
      throw new Error('Job data missing taskId');
    }
    await db.update(taskLogs).set({ status: 'processing' }).where(eq(taskLogs.id, taskId.toString()));
    const taskData = await db.select().from(taskLogs).where(eq(taskLogs.id, taskId.toString()));
    if (!taskData || taskData.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const task = taskData[0];
    if (task.taskType === 'scheduledWorkflow' && task.taskData) {
      const taskData = task.taskData as { workflowId: string };
      if (taskData.workflowId!) {
        const { executeWorkflowById } = await import('./schedulerService.js');
        await executeWorkflowById(taskData.workflowId!);
        await db.update(taskLogs).set({
          status: 'completed',
          completedAt: new Date(),
          result: { message: `Scheduled workflow ${taskData.workflowId!} executed successfully` },
        }).where(eq(taskLogs.id, taskId.toString()));
      }
    } else {
      await db.update(taskLogs).set({
        status: 'completed',
        completedAt: new Date(),
        result: { message: 'Task processed successfully' },
      }).where(eq(taskLogs.id, taskId.toString()));
    }
    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    await db.update(taskLogs).set({
      status: 'failed',
      error: errorMessage,
    }).where(eq(taskLogs.id, data.taskId));
    throw error;
  }
}

/**
 * Add a new job to the queue
 */
export async function enqueueJob(taskId: string, priority: number = 1): Promise<string> {
  const jobId = uuidv4();
  if (!inMemoryMode && jobQueue) {
    await jobQueue.add(
      'processTask',
      { taskId },
      {
        jobId,
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
  } else {
    inMemoryJobs.push({
      id: jobId,
      taskId,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      data: { taskId },
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRunAt: new Date(),
    });
  }
  await db.insert(jobs).values({
    id: jobId,
    taskId,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    nextRunAt: new Date(),
  });
  return jobId;
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string) {
  if (inMemoryMode) {
    return inMemoryJobs.find((job) => job.id === jobId);
  }
  const results = await db.select().from(jobs).where(eq(jobs.id, jobId.toString()));
  return results.length > 0 ? results[0] : null;
}

/**
 * Update job status
 */
export async function updateJobStatus(jobId: string, status: JobStatus, error?: string) {
  if (inMemoryMode) {
    const job = inMemoryJobs.find((job) => job.id === jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
      if (error) job.lastError = error;
    }
    return;
  }
  await db
    .update(jobs)
    .set({
      status,
      updatedAt: new Date(),
      lastError: error,
    })
    .where(eq(jobs.id, jobId.toString()));
}

/**
 * Update job for retry
 */
export async function updateJobForRetry(jobId: string, error: string, nextRunAt: Date) {
  if (inMemoryMode) {
    const job = inMemoryJobs.find((job) => job.id === jobId);
    if (job) {
      job.status = 'pending';
      job.attempts += 1;
      job.lastError = error;
      job.nextRunAt = nextRunAt;
      job.updatedAt = new Date();
    }
    return;
  }
  await db
    .update(jobs)
    .set({
      status: 'pending',
      attempts: sql`${jobs.attempts} + 1`,
      lastError: error,
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId.toString()));
}

/**
 * List all jobs with optional filtering
 */
export async function listJobs(status?: string, limit: number = 100) {
  if (inMemoryMode) {
    let result = inMemoryJobs;
    if (status) {
      result = result.filter((job) => job.status === status);
    }
    return result.slice(0, limit);
  }
  if (status) {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, status))
      .limit(limit)
      .orderBy(jobs.createdAt);
  }
  return await db.select().from(jobs).limit(limit).orderBy(jobs.createdAt);
}

/**
 * Manually retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  try {
    const jobData = await getJobById(jobId);
    if (!jobData) {
      throw new Error(`Job not found: ${jobId}`);
    }
    if (jobData.status !== 'failed') {
      throw new Error(`Cannot retry job with status: ${jobData.status}`);
    }
    await db
      .update(jobs)
      .set({
        status: 'pending',
        attempts: 0,
        nextRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId.toString()));
    if (!inMemoryMode && jobQueue) {
      await jobQueue.add(
        'processTask',
        { taskId: jobData.taskId },
        {
          jobId,
          priority: 10,
          attempts: 3,
        }
      );
    }
    return true;
  } catch (error) {
    logger.error({
      event: 'retry_job_error',
      jobId,
      errorMessage: isError(error) ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, `Error retrying job ${jobId}`);
    return false;
  }
}

// Support cleanup to close connections
export async function shutdown() {
  if (!inMemoryMode) {
    if (scheduler) await scheduler.close();
    if (jobQueue) await jobQueue.close();
    if (redisClient) await redisClient.quit();
  }
}
