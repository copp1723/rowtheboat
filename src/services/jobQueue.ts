import { sql } from 'drizzle-orm';
import { getErrorMessage, isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { jobs, taskLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
// We'll use dynamic imports for the actual implementations
// and just define the types here
import type { Redis } from 'ioredis';
import type { TaskJobData } from '../types/bullmq';

// Define types for BullMQ
type Queue<_DataType = any> = any; // Prefix with underscore to indicate unused
type QueueScheduler = any;
type ConnectionOptions = {
  host?: string;
  port?: number;
  password?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
};

/**
 * Job Queue Service
 * Implements a job queue with retry logic using BullMQ
 */

// Redis client instance
let redisClient: Redis | null = null;
// Queue instance
let jobQueue: Queue<TaskJobData> | null = null;
// Scheduler instance
let scheduler: QueueScheduler | null = null;

// Default connection options are defined inline where needed

// Use in-memory fallback for dev environments without Redis
interface InMemoryJob {
  id: string;
  taskId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  data: TaskJobData;
  createdAt: Date;
  updatedAt: Date;
  nextRunAt: Date;
  lastRunAt?: Date;
}
const inMemoryJobs: InMemoryJob[] = [];
let inMemoryMode = false;

// Initialize job queue with retry capability
export async function initializeJobQueue() {
  try {
    // Check if we want to force in-memory mode
    if (process.env.FORCE_IN_MEMORY_QUEUE === 'true') {
      throw new Error('Forcing in-memory queue mode');
    }
    // Create Redis client with proper options typing
    const options: ConnectionOptions = {
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
    // Create Redis client with proper typing
    redisClient = new RedisClient(options);
    // Handle connection errors gracefully
    redisClient.on('error', (err: Error) => {
      if (!inMemoryMode) {
        logger.error(
          {
            event: 'redis_connection_error',
            errorMessage: getErrorMessage(err),
            timestamp: new Date().toISOString(),
          },
          `Redis connection error: ${getErrorMessage(err)}`
        );
      }
    });
    await redisClient.ping();
    // Use dynamic import for BullMQ (ESM compatible)
    const bullMQModule = await import('bullmq');
    // Create job queue with connection using type assertion to handle module structure
    const BullQueue = (bullMQModule as any).Queue || (bullMQModule as any).default?.Queue || (bullMQModule as any).default;

    if (!BullQueue) {
      throw new Error('Could not find Queue class in bullmq module');
    }

    jobQueue = new BullQueue('taskProcessor', { connection: redisClient });

    try {
      // Import QueueScheduler directly from bullmq
      const BullQueueScheduler = (bullMQModule as any).QueueScheduler ||
                                (bullMQModule as any).default?.QueueScheduler;

      if (BullQueueScheduler) {
        scheduler = new BullQueueScheduler('taskProcessor', { connection: redisClient });
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
          errorMessage: getErrorMessage(err),
          stack: isError(err) ? err.stack : undefined,
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
    const errorMessage = getErrorMessage(error);
    // Fall back to in-memory job processing
    logger.warn(
      {
        event: 'redis_connection_failed',
        errorMessage,
        stack: isError(error) ? error.stack : undefined,
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
      const bullMQModule = await import('bullmq');

      // Use type assertion to handle different module structures
      const BullWorker = (bullMQModule as any).Worker ||
                        (bullMQModule as any).default?.Worker ||
                        (bullMQModule as any).default;

      if (!BullWorker) {
        throw new Error('Could not find Worker class in bullmq module');
      }

      // Create type-safe worker with correct typing
      const worker = new BullWorker(
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
        const errorMessage = getErrorMessage(error);
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
    } catch (error) {
      logger.warn(
        {
          event: 'worker_init_failed',
          errorMessage: getErrorMessage(error),
          stack: isError(error) ? error.stack : undefined,
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
      const errorMessage = getErrorMessage(error);
      job.attempts += 1;
      job.lastError = errorMessage;
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
async function processJob(jobId: string, data: TaskJobData) {
  try {
    // Extract task ID from job data
    const taskId = data.params?.taskId;
    if (!taskId) {
      throw new Error('Job data missing taskId in params');
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
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'job_processing_error',
        jobId,
        errorMessage,
        stack: isError(error) ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      `Error processing job ${jobId}`
    );
    // Update task with error
    const taskId = data?.params?.taskId;
    if (taskId) {
      await db
        .update(taskLogs)
        .set({
          status: 'failed',
          error: errorMessage,
        })
        .where(eq(taskLogs.id, taskId.toString()));
    }
    throw error; // Re-throw to let the queue handle retries
  }
}

/**
 * Add a new job to the queue
 */
export async function enqueueJob(taskId: string, priority: number = 1): Promise<string> {
  const jobId = uuidv4();
  const jobData: TaskJobData = {
    id: jobId,
    taskType: 'processTask',
    params: { taskId },
    createdAt: new Date().toISOString()
  };

  if (!inMemoryMode && jobQueue) {
    await jobQueue.add(
      'processTask',
      jobData,
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
      data: jobData,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRunAt: new Date(),
    });
  }
  // Insert job record in database
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
      // Get the task ID from the job data
      const taskId = jobData.taskId;

      const newJobData: TaskJobData = {
        id: jobId,
        taskType: 'processTask',
        params: { taskId },
        createdAt: new Date().toISOString()
      };

      await jobQueue.add(
        'processTask',
        newJobData,
        {
          jobId,
          priority: 10, // Higher priority for retries
          attempts: 3,
        }
      );
    }
    return true;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'retry_job_error',
        jobId,
        errorMessage,
        stack: isError(error) ? error.stack : undefined,
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
