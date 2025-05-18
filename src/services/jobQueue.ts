import { sql } from 'drizzle-orm';
import { getErrorMessage } from '....js';
import { getErrorMessage } from '....js';
import { isError } from '../utils/errorUtils.js';
/**
 * Job Queue Service
 * Implements a job queue with retry logic using BullMQ
 */
// Use CommonJS-style requires to avoid TypeScript errors with ESM compatibility
// We'll type everything with 'any' to avoid complex TypeScript errors
import { db } from '../shared/db.js';
import { jobs, taskLogs } from '../shared/schema.js';
import { eq, and, sql, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
// Initialize Redis connection for BullMQ
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // Only include password if it's defined
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
};
// Use 'any' type to avoid TypeScript issues with dynamic imports
let redisClient: any = null;
let jobQueue: any = null;
let scheduler: any = null;
// Export functions and variables for use in other services
// Use in-memory fallback for dev environments without Redis
type InMemoryJob = {
  id: string;
  taskId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
  nextRunAt: Date;
  lastRunAt?: Date;
};
const inMemoryJobs: InMemoryJob[] = [];
let inMemoryMode = false;
// Initialize job queue with retry capability
export async function initializeJobQueue() {
  try {
    // Check if we want to force in-memory mode
    if (process.env.FORCE_IN_MEMORY_QUEUE === 'true') {
      throw new Error('Forcing in-memory queue mode');
    }
    // Dynamically import for ESM compatibility
    const Redis = await import('ioredis').then((m) => m.default);
    // Create Redis client with proper options typing
    const options: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      // Set a lower connection timeout to fail faster
      connectTimeout: 5000,
      // Don't keep reconnecting if we're in a Replit environment without Redis
      maxRetriesPerRequest: 3,
    };
    // Add password if available
    if (process.env.REDIS_PASSWORD) {
      options.password = process.env.REDIS_PASSWORD;
    }
    logger.info(
      {
        event: 'redis_connect_attempt',
        host: options.host,
        port: options.port,
        timestamp: new Date().toISOString(),
      },
      `Attempting to connect to Redis at ${options.host}:${options.port}...`
    );
    // Import Redis dynamically to ensure ESM compatibility
    const IORedis = await import('ioredis');
    const RedisClient = IORedis.default;
    // Use type assertion to avoid TypeScript errors
    redisClient = new (RedisClient as any)(options);
    // Handle connection errors gracefully
    redisClient.on('error', (err: any) => {
      if (!inMemoryMode) {
        logger.error(
          {
            event: 'redis_connection_error',
            errorMessage: err.message,
            timestamp: new Date().toISOString(),
          },
          `Redis connection error: ${err.message}`
        );
      }
    });
    await redisClient.ping();
    // Use dynamic import for BullMQ (ESM compatible)
    const { Queue, Worker } = await import('bullmq');
    // Create job queue with connection
    jobQueue = new Queue('taskProcessor', { connection: redisClient });
    try {
      // Import QueueScheduler directly from bullmq
      const bullMQModule = await import('bullmq');
      // Use type assertion to avoid TypeScript errors with ESM exports
      const QueueScheduler = (bullMQModule as any).QueueScheduler;
      if (QueueScheduler) {
        scheduler = new QueueScheduler('taskProcessor', { connection: redisClient });
        logger.info(
          { event: 'scheduler_initialized', timestamp: new Date().toISOString() },
          'QueueScheduler initialized successfully'
        );
      } else {
        logger.warn(
          { event: 'scheduler_unavailable', timestamp: new Date().toISOString() },
          'QueueScheduler not available in bullmq package'
        );
      }
    } catch (err) {
      logger.warn(
        {
          event: 'scheduler_init_failed',
          errorMessage: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        },
        'QueueScheduler could not be initialized, continuing without scheduler'
      );
    }
    inMemoryMode = false;
    logger.info(
      { event: 'bullmq_initialized', timestamp: new Date().toISOString() },
      'BullMQ initialized with Redis connection'
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    // Fall back to in-memory job processing
    logger.warn(
      {
        event: 'redis_connection_failed',
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      'Redis connection failed, using in-memory job queue'
    );
    inMemoryMode = true;
  }
  // Set up job processing
  await setupWorker();
}
// Initialize a worker to process jobs
async function setupWorker() {
  if (!inMemoryMode && redisClient) {
    try {
      // Use dynamic import for ESM compatibility
      const { Worker } = await import('bullmq');
      // Create type-safe worker with correct typing
      const worker: any = new Worker(
        'taskProcessor',
        async (job: any) => {
          if (job && job.id && job.data) {
            await processJob(job.id, job.data);
          }
        },
        { connection: redisClient }
      );
      // Handle job completion
      worker.on('completed', async (job: any) => {
        if (job && job.id) {
          await updateJobStatus(job.id, 'completed');
        }
      });
      // Handle job failures
      worker.on('failed', async (job: any, error: any) => {
        if (!job || !job.id) return;
        const jobData = await getJobById(job.id);
        if (!jobData) return;
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : String(error);
        if (jobData.attempts >= jobData.maxAttempts) {
          await updateJobStatus(job.id, 'failed', errorMessage);
        } else {
          // Schedule retry
          const backoffDelay = Math.pow(2, jobData.attempts) * 5000; // Exponential backoff
          const nextRunAt = new Date(Date.now() + backoffDelay);
          await updateJobForRetry(job.id, errorMessage, nextRunAt);
        }
      });
      logger.info(
        { event: 'worker_initialized', timestamp: new Date().toISOString() },
        'BullMQ worker initialized'
      );
    } catch (error: any) {
      logger.warn(
        {
          event: 'worker_init_failed',
          errorMessage: getErrorMessage(error),
          stack:
            error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
          timestamp: new Date().toISOString(),
        },
        'Failed to initialize BullMQ worker'
      );
    }
  } else {
    // In-memory job processing using setInterval
    logger.info(
      { event: 'in_memory_processor_initialized', timestamp: new Date().toISOString() },
      'In-memory job processor initialized'
    );
    setInterval(processInMemoryJobs, 5000);
  }
}
// Process in-memory jobs for dev environments
async function processInMemoryJobs() {
  const now = new Date();
  const pendingJobs = inMemoryJobs.filter(
    (job) => job.status === 'pending' && job.nextRunAt <= now
  );
  for (const job of pendingJobs) {
    try {
      job.status = 'running';
      job.lastRunAt = new Date();
      await processJob(job.id, job.data);
      job.status = 'completed';
      job.updatedAt = new Date();
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error)
        ? error instanceof Error
          ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
          : String(error)
        : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error)
        ? error instanceof Error
          ? isError(error)
            ? error instanceof Error
              ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
              : String(error)
            : String(error)
          : String(error)
        : String(error);
      job.attempts += 1;
      job.lastError =
        error instanceof Error
          ? isError(error)
            ? error instanceof Error
              ? isError(error)
                ? error instanceof Error
                  ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                  : String(error)
                : String(error)
              : String(error)
            : String(error)
          : String(error);
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
      } else {
        job.status = 'pending';
        // Exponential backoff for retries
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
    // Extract task ID from job data
    const { taskId } = data;
    if (!taskId) {
      throw new Error('Job data missing taskId');
    }
    // Mark task as processing
    await db
      .update(taskLogs)
      .set({ status: 'processing' })
      .where(eq(taskLogs.id, taskId.toString()));
    // TODO: Dispatch to appropriate task handler based on task type
    // This will connect to the existing task execution system
    const taskData = await db.select().from(taskLogs).where(eq(taskLogs.id, taskId.toString()));
    if (!taskData || taskData.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const task = taskData[0];
    // Handle different task types
    // Need to check and type the taskData properly for TypeScript
    if (task.taskType === 'scheduledWorkflow' && task.taskData) {
      // We need to type-guard the taskData structure
      const taskData = task.taskData as { workflowId: string };
      if (taskData.workflowId!) {
        // For scheduled workflows, execute the workflow directly
        const { executeWorkflowById } = await import('./schedulerService.js');
        await executeWorkflowById(taskData.workflowId!);
        // Update the task log
        await db
          .update(taskLogs)
          .set({
            status: 'completed',
            completedAt: new Date(),
            result: { message: `Scheduled workflow ${taskData.workflowId!} executed successfully` },
          })
          .where(eq(taskLogs.id, taskId.toString()));
      }
    } else {
      // Default processing for other task types
      // TODO: Add specialized handling for different task types
      // Mark task as completed
      await db
        .update(taskLogs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          result: { message: 'Task processed successfully' },
        })
        .where(eq(taskLogs.id, taskId.toString()));
    }
    return true;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'job_processing_error',
        jobId,
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      `Error processing job ${jobId}`
    );
    // Update task with error
    if (data && data.taskId) {
      await db
        .update(taskLogs)
        .set({
          status: 'failed',
          error:
            error instanceof Error
              ? error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              : String(error),
        })
        .where(eq(taskLogs.id, data.taskId));
    }
    throw error; // Re-throw to let the queue handle retries
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
    // In-memory fallback
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
  // Insert job record in database
  await // @ts-ignore
  db.insert(jobs).values({
    id: jobId,
    taskId,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    nextRunAt: new Date(),
  } as any); // @ts-ignore - Ensuring all required properties are provided;
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
      attempts: sql`${jobs.attempts} + 1`, // Use SQL template literal for safe raw SQL
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
  // When status filter is provided, create a new query with where clause
  if (status) {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, status))
      .limit(limit)
      .orderBy(jobs.createdAt);
  }
  // Otherwise return all jobs with limit
  return await db.select().from(jobs).limit(limit).orderBy(jobs.createdAt);
}
/**
 * Manually retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  try {
    // Get the job data
    const jobData = await getJobById(jobId);
    if (!jobData) {
      throw new Error(`Job not found: ${jobId}`);
    }
    if (jobData.status !== 'failed') {
      throw new Error(`Cannot retry job with status: ${jobData.status}`);
    }
    // Reset attempt counter and schedule for immediate execution
    await db
      .update(jobs)
      .set({
        status: 'pending',
        attempts: 0,
        nextRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId.toString()));
    // For BullMQ, add back to queue
    if (!inMemoryMode && jobQueue) {
      await jobQueue.add(
        'processTask',
        { taskId: jobData.taskId },
        {
          jobId,
          priority: 10, // Higher priority for retries
          attempts: 3,
        }
      );
    }
    return true;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    logger.error(
      {
        event: 'retry_job_error',
        jobId,
        errorMessage: isError(error) ? getErrorMessage(error) : String(error),
        stack:
          error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.stack : undefined) : undefined) : undefined) : undefined,
        timestamp: new Date().toISOString(),
      },
      `Error retrying job ${jobId}`
    );
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
