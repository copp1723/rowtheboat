import { sql } from 'drizzle-orm';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { jobs, taskLogs } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Types for Redis and BullMQ
import type { RedisOptions } from 'ioredis';
// BullMQ types are imported dynamically, so we will define minimal interfaces for type safety

// Job data interface
export interface JobData {
  [key: string]: unknown;
}

// In-memory job structure
export interface InMemoryJob {
  id: string;
  taskId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  data: JobData;
  createdAt: Date;
  updatedAt: Date;
  nextRunAt: Date;
  lastRunAt?: Date;
}

// In-memory job storage and mode flag
const inMemoryJobs: InMemoryJob[] = [];
let inMemoryMode = false;

// Redis/BullMQ clients (set after dynamic import)
import type { Redis as IORedisClient } from 'ioredis';
import type { Queue, QueueScheduler, Worker, Job } from 'bullmq';
let redisClient: IORedisClient | null = null;
let jobQueue: Queue | null = null;
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
    const QueueClass = bullmqModule.Queue || (bullmqModule.default && bullmqModule.default.Queue);
    const QueueSchedulerClass = bullmqModule.QueueScheduler || (bullmqModule.default && bullmqModule.default.QueueScheduler);
    jobQueue = new QueueClass('taskProcessor', { connection: redisClient }) as Queue;
    scheduler = new QueueSchedulerClass('taskProcessor', { connection: redisClient }) as QueueScheduler;
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
 * Initialize a BullMQ worker to process jobs from the queue.
 * Handles job completion and failure events with explicit typing.
 */
async function setupWorker() {
  if (!inMemoryMode && redisClient) {
    try {
      // Import BullMQ Worker class dynamically
      const bullmq = await import('bullmq');
      type BullJob = { id: string; data: JobData };
      // Use explicit type for worker
      const WorkerClass = bullmq.Worker as unknown as new (
        name: string,
        processor: (job: BullJob) => Promise<void>,
        opts: { connection: unknown }
      ) => { on: (event: string, handler: (...args: any[]) => void) => void };
      const worker = new WorkerClass(
        'taskProcessor',
        async (job: BullJob) => {
          if (job && job.id && job.data) {
            await processJob(job.id, job.data);
          }
        },
        { connection: redisClient }
      );
      // Job completed event
      worker.on('completed', async (job: BullJob) => {
        if (job && job.id) {
          await updateJobStatus(job.id, 'completed');
        }
      });
      // Job failed event
      worker.on('failed', async (job: BullJob, error: Error) => {
        if (!job || !job.id) return;
        const jobData = await getJobById(job.id);
        if (!jobData) return;
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (jobData.attempts >= jobData.maxAttempts) {
          await updateJobStatus(job.id, 'failed', errorMessage);
        } else {
          const backoffDelay = Math.pow(2, jobData.attempts) * 5000;
          const nextRunAt = new Date(Date.now() + backoffDelay);
          await updateJobForRetry(job.id, errorMessage, nextRunAt);
        }
      });
      logger.info({ event: 'worker_initialized', timestamp: new Date().toISOString() }, 'BullMQ worker initialized');
    } catch (error) {
      logger.warn({
        event: 'worker_init_failed',
        errorMessage: isError(error) ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      }, 'Failed to initialize BullMQ worker');
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
      job.status = 'running';
      job.lastRunAt = new Date();
      await processJob(job.id, job.data);
      job.status = 'completed';
      job.updatedAt = new Date();
    } catch (error) {
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.lastError = error instanceof Error ? error.message : String(error);
      } else {
        job.attempts += 1;
        job.lastError = error instanceof Error ? error.message : String(error);
        const backoffDelay = Math.pow(2, job.attempts) * 5000;
        job.nextRunAt = new Date(Date.now() + backoffDelay);
      }
      job.updatedAt = new Date();
    }
  }
}

// Core job processing logic
async function processJob(jobId: string, data: any) {
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
export async function updateJobStatus(jobId: string, status: string, error?: string) {
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
