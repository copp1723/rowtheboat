import { sql } from 'drizzle-orm';
import { isAppError, isError } from '../utils/errorUtils';
import { db } from '../shared/db';
import { tasks, jobQueue as jobQueueTable } from '../shared/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { debug, info, warn, error } from '../shared/logger';

// Import types from bullmq
import type {
  Queue as BullQueue,
  QueueScheduler as BullQueueScheduler,
  Worker as BullWorker,
  Job as BullMQJob,
  ConnectionOptions as BullConnectionOptions,
  JobOptions as BullJobOptions
} from 'bullmq';
import type { Redis, RedisOptions } from 'ioredis';

// Re-export types for internal use
export type Queue<T = any> = BullQueue<T>;
export type QueueScheduler = BullQueueScheduler;
export type Worker<T = any> = BullWorker<T>;
export type Job<T = any> = BullMQJob<T>;
export type ConnectionOptions = BullConnectionOptions;
export type JobOptions = BullJobOptions;

// Global variables for Node.js
declare const __filename: string;
declare const __dirname: string;

// Set up __dirname for ESM
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const getDirname = (url: string) => {
  try {
    return dirname(fileURLToPath(url));
  } catch (e) {
    return process.cwd();
  }
};

// @ts-ignore - __dirname is defined in CommonJS
const globalDirname = typeof __dirname !== 'undefined' ? __dirname : getDirname(import.meta.url);
// @ts-ignore - __filename is defined in CommonJS
const globalFilename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);

// Local types
interface TaskJobData {
  taskId: string;
  workflowId?: string;
  [key: string]: any;
}

// Job status types
type JobStatus = 'waiting' | 'active' | 'delayed' | 'completed' | 'failed' | 'paused' | 'stuck' | 'waiting-children' | 'processing' | 'pending';

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
let redisClient: Redis | null = null; // Changed IORedisClient to Redis
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
    // Initialize Redis client if not already initialized
    if (!redisClient) {
      try {
        const IORedis = (await import('ioredis')).default;
        redisClient = new IORedis(redisOptions as RedisOptions);
        redisClient.on('error', (err: Error) => {
          error('Redis client error: ' + err.message);
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error('Failed to initialize Redis client: ' + errorMessage);
        throw err;
      }
    }
    await redisClient.ping();
    const bullmqModule = await import('bullmq'); // Removed .js

    // Get the Queue and QueueScheduler classes from the imported module
    const QueueClass = bullmqModule.default?.Queue || bullmqModule.Queue;
    const QueueSchedulerClass = bullmqModule.default?.QueueScheduler || bullmqModule.QueueScheduler;

    if (!QueueClass || !QueueSchedulerClass) {
      throw new Error('Failed to import BullMQ classes');
    }

    // Initialize scheduler if not already initialized
    if (!scheduler && redisClient) {
      try {
        const { QueueScheduler } = await import('bullmq');
        scheduler = new QueueScheduler('task-queue', {
          connection: redisClient,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        error('Failed to initialize queue scheduler: ' + errorMessage);
        throw err;
      }
    }

    const { Queue } = await import('bullmq');
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    jobQueue = new Queue('taskProcessor', {
      connection: redisClient
    }) as unknown as Queue<TaskJobData>;

    info('BullMQ initialized with Redis connection', { event: 'bullmq_initialized', timestamp: new Date().toISOString() });
    inMemoryMode = false;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    warn(`Failed to initialize BullMQ, falling back to in-memory queue: ${errorMessage}`, {
      event: 'bullmq_initialization_failed',
      errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
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
      const bullmq = await import('bullmq'); // Removed .js

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
      info('BullMQ worker initialized with type-safe job processing');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error('Failed to initialize type-safe BullMQ worker', { error: err });
      inMemoryMode = true;
    }
  } else {
    info('In-memory job processor initialized', { event: 'in_memory_processor_initialized', timestamp: new Date().toISOString() });
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
    await db.update(tasks).set({ status: 'processing' }).where(eq(tasks.id, taskId.toString()));
    const taskData = await db.select().from(tasks).where(eq(tasks.id, taskId.toString()));
    if (!taskData || taskData.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const task = taskData[0];
    if (task.taskType === 'scheduledWorkflow' && task.taskData) {
      const taskData = task.taskData as { workflowId: string };
      if (taskData.workflowId!) {
        const { executeWorkflowById } = await import('./schedulerService.js');
        await executeWorkflowById(taskData.workflowId!);
        await db.update(tasks).set({
          status: 'completed',
          completedAt: new Date(),
          result: { message: `Scheduled workflow ${taskData.workflowId!} executed successfully` },
        }).where(eq(tasks.id, taskId.toString()));
      }
    } else {
      await db.update(tasks).set({
        status: 'completed',
        completedAt: new Date(),
        result: { message: 'Task processed successfully' },
      }).where(eq(tasks.id, taskId.toString()));
    }
    return true;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`Error in job processor for task ${data.taskId}: ${errorMessage}`, {
      originalError: err,
      taskId: data.taskId
    });
    await db.update(tasks).set({
      status: 'failed',
      error: errorMessage,
    }).where(eq(tasks.id, data.taskId));
    throw err;
  }
}

/**
 * Add a new job to the queue
 */
export async function enqueueJob(taskId: string, priority: number = 1): Promise<string> {
  const jobId = uuidv4();
  // Initialize BullMQ queue
  if (!jobQueue) {
    try {
      const { Queue } = await import('bullmq');
      if (!redisClient) {
        throw new Error('Redis client not initialized');
      }
      jobQueue = new Queue('task-queue', {
        connection: redisClient,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }) as unknown as Queue<TaskJobData>;

      // Set up event listeners with type assertions
      ;(jobQueue as any).on('completed', (job: { id: string | number | undefined }) => {
        info(`Job ${job.id} completed`);
        updateJobStatus(job.id?.toString() || 'unknown', 'completed');
      });

      ;(jobQueue as any).on('failed', (job: { id: string | number | undefined } | undefined, err: Error) => {
        const jobId = job?.id?.toString() || 'unknown';
        error(`Job ${jobId} failed: ${err.message}`, { error: err });
        updateJobStatus(jobId, 'failed', err.message);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error('Failed to initialize job queue: ' + errorMessage);
      throw err;
    }
  }
  if (!inMemoryMode && jobQueue) {
    const jobOptions: JobOptions = {
      jobId: jobId,
      priority: priority,
      removeOnComplete: true,
      removeOnFail: 1000,
      attempts: 3, // Set default number of attempts
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    };

    const job = await jobQueue.add(
      'processTask',
      { taskId },
      jobOptions
    );

    // Store job metadata in the database
    await db.insert(jobQueueTable).values({
      id: jobId,
      taskId: taskId,
      status: 'queued',
      priority: priority,
      attempts: 0,
      maxAttempts: 3, // Match the attempts in job options
      data: JSON.stringify({ taskId }),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
  await db.insert(tasks).values({
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
  const results = await db.select().from(jobQueueTable).where(eq(jobQueueTable.id, jobId.toString()));
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
    .update(jobQueueTable)
    .set({
      status,
      updatedAt: new Date(),
      lastError: error,
    })
    .where(eq(jobQueueTable.id, jobId.toString()));
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
    .update(jobQueueTable)
    .set({
      status: 'pending',
      attempts: sql`${jobQueueTable.attempts} + 1`,
      lastError: error,
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(jobQueueTable.id, jobId.toString()));
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
      .from(jobQueueTable)
      .where(eq(jobQueueTable.status, status))
      .limit(limit)
      .orderBy(jobQueueTable.createdAt);
  }
  return await db.select().from(jobQueueTable).limit(limit).orderBy(jobQueueTable.createdAt);
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
      .update(jobQueueTable)
      .set({
        status: 'pending',
        attempts: 0,
        nextRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobQueueTable.id, jobId.toString()));
    if (!inMemoryMode && jobQueue) {
      await jobQueue.add(
        'processTask',
        { taskId: jobData.taskId },
        {
          jobId,
          priority: 10,
        }
      );
    }
    return true;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    error(`Error retrying job ${jobId}: ${errorMessage}`, {
      event: 'retry_job_error',
      jobId,
      errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    throw err;
  }
}

/**
 * Clean up completed jobs from the queue
 */
export async function cleanupCompletedJobs(): Promise<boolean> {
  try {
    // Clear completed jobs from the queue
    await (jobQueue as any)?.clean(0, 0, 'completed');
    return true;
  } catch (err) {
    error('Error cleaning up completed jobs: ' + (err instanceof Error ? err.message : String(err)), {
      event: 'cleanup_completed_jobs_error',
      originalError: err, // Include the original error object
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

// Support cleanup to close connections
/**
 * Shutdown the job queue and clean up resources
 */
export async function shutdown(): Promise<void> {
  if (scheduler) {
    await scheduler.close();
  }
  if (jobQueue) {
    await jobQueue.close();
  }
  if (redisClient) {
    await redisClient.quit();
  }
}
