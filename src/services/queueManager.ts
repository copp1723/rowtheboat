/**
 * Queue Manager Service
 *
 * Manages job queues and provides a unified interface for enqueueing jobs
 * Handles job scheduling, tracking, and persistence
 */
import { JobsOptions } from 'bullmq';
import { getErrorMessage } from '../utils/errorUtils.js';
import { v4 as uuidv4 } from 'uuid';
import { debug, info, warn, error } from '../shared/logger.js';
import { db } from '../shared/db.js';
import { jobs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import {
  initializeRedis,
  createQueue,
  createScheduler,
  QUEUE_NAMES,
  JOB_TYPES,
  defaultJobOptions,
} from './bullmqService';

// Import the centralized BullMQ types
import {
  Queue,
  EmailQueue,
  InsightQueue,
  ReportQueue,
  WorkflowQueue,
  EmailJobData,
  InsightJobData,
  ReportJobData,
  WorkflowJobData,
  BaseJobData
} from '../types/bullmq.js';

// Queue instances with proper typing
let ingestionQueue: Queue<ReportJobData> | null = null;
let processingQueue: Queue<ReportJobData> | null = null;
let emailQueue: EmailQueue | null = null;
let insightQueue: InsightQueue | null = null;

// In-memory job storage for fallback mode
interface InMemoryJob {
  id: string;
  queueName: string;
  jobName: string;
  data: BaseJobData;
  options: JobsOptions;
  status: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  nextRunAt: Date;
}

// In-memory jobs array
const inMemoryJobs: InMemoryJob[] = [];

// In-memory mode flag
let inMemoryMode = false;
/**
 * Initialize the queue manager
 */
export async function initializeQueueManager(): Promise<void> {
  try {
    // Initialize Redis connection
    const redisClient = await initializeRedis();
    // Set in-memory mode based on Redis connection
    inMemoryMode = !redisClient;
    if (!inMemoryMode) {
      // Create queues
      ingestionQueue = createQueue(QUEUE_NAMES.INGESTION);
      processingQueue = createQueue(QUEUE_NAMES.PROCESSING);
      emailQueue = createQueue(QUEUE_NAMES.EMAIL);
      insightQueue = createQueue(QUEUE_NAMES.INSIGHT);
      // Create schedulers for each queue
      createScheduler(QUEUE_NAMES.INGESTION);
      createScheduler(QUEUE_NAMES.PROCESSING);
      createScheduler(QUEUE_NAMES.EMAIL);
      createScheduler(QUEUE_NAMES.INSIGHT);
      info(
        {
          event: 'queue_manager_initialized',
          timestamp: new Date().toISOString(),
        },
        'Queue manager initialized with Redis'
      );
    } else {
      // Set up in-memory job processing
      setInterval(processInMemoryJobs, 5000);
      info(
        {
          event: 'in_memory_queue_manager_initialized',
          timestamp: new Date().toISOString(),
        },
        'Queue manager initialized in in-memory mode'
      );
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    error(
      {
        event: 'queue_manager_init_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error initializing queue manager: ${errorMessage}`
    );
    // Fall back to in-memory mode
    inMemoryMode = true;
    setInterval(processInMemoryJobs, 5000);
  }
}
/**
 * Process in-memory jobs
 */
async function processInMemoryJobs(): Promise<void> {
  const now = new Date();
  const pendingJobs = inMemoryJobs.filter(
    (job) => job.status === 'pending' && job.nextRunAt <= now
  );
  for (const job of pendingJobs) {
    try {
      job.status = 'running';
      job.updatedAt = new Date();
      // Emit job for processing
      await processInMemoryJob(job);
      job.status = 'completed';
      job.updatedAt = new Date();
      // Update job status in database
      await db
        .update(jobs)
        .set({
          status: 'completed',
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      job.attempts += 1;
      job.updatedAt = new Date();
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        // Update job status in database
        await db
          .update(jobs)
          .set({
            status: 'failed',
            attempts: job.attempts,
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, job.id));
      } else {
        job.status = 'pending';
        // Exponential backoff for retries
        const backoffDelay = Math.pow(2, job.attempts) * 5000;
        job.nextRunAt = new Date(Date.now() + backoffDelay);
        // Update job status in database
        await db
          .update(jobs)
          .set({
            status: 'pending',
            attempts: job.attempts,
            lastError: errorMessage,
            nextRunAt: job.nextRunAt,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, job.id));
      }
    }
  }
}
/**
 * Process an in-memory job
 */
async function processInMemoryJob(job: any): Promise<void> {
  // This is a placeholder for actual job processing
  // In a real implementation, this would dispatch to the appropriate handler
  info(
    {
      event: 'in_memory_job_processing',
      jobId: job.id,
      queueName: job.queueName,
      jobName: job.jobName,
      timestamp: new Date().toISOString(),
    },
    `Processing in-memory job ${job.id} (${job.jobName}) in queue ${job.queueName}`
  );
  // Simulate job processing
  await new Promise((resolve) => setTimeout(resolve, 100));
}
/**
 * Add a job to a queue with type safety
 */
export async function addJob<T extends BaseJobData>(
  queueName: string,
  jobName: string,
  data: T,
  options: JobsOptions = {}
): Promise<string> {
  try {
    // Generate job ID
    const jobId = options.jobId || uuidv4();

    // Merge default options with provided options
    const jobOptions: JobsOptions = {
      ...defaultJobOptions,
      ...options,
      jobId,
    };

    // Add job to queue
    if (!inMemoryMode) {
      // Get the appropriate queue with proper typing
      let queue: Queue<any> | null = null;

      switch (queueName) {
        case QUEUE_NAMES.INGESTION:
          queue = ingestionQueue as Queue<ReportJobData>;
          break;
        case QUEUE_NAMES.PROCESSING:
          queue = processingQueue as Queue<ReportJobData>;
          break;
        case QUEUE_NAMES.EMAIL:
          queue = emailQueue as Queue<EmailJobData>;
          break;
        case QUEUE_NAMES.INSIGHT:
          queue = insightQueue as Queue<InsightJobData>;
          break;
      }

      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      // Add job to queue with proper typing
      await queue.add(jobName, data, jobOptions);

      info(
        {
          event: 'job_added',
          jobId,
          queueName,
          jobName,
          timestamp: new Date().toISOString(),
        },
        `Added job ${jobId} (${jobName}) to queue ${queueName}`
      );
    } else {
      // Add job to in-memory queue
      inMemoryJobs.push({
        id: jobId,
        queueName,
        jobName,
        data,
        options: jobOptions,
        status: 'pending',
        attempts: 0,
        maxAttempts: jobOptions.attempts || 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        nextRunAt: new Date(),
      });

      info(
        {
          event: 'in_memory_job_added',
          jobId,
          queueName,
          jobName,
          timestamp: new Date().toISOString(),
        },
        `Added in-memory job ${jobId} (${jobName}) to queue ${queueName}`
      );
    }

    // Store job in database
    await db.insert(jobs).values({
      id: jobId,
      taskId: (data as any).taskId || null,
      status: 'pending',
      attempts: 0,
      maxAttempts: jobOptions.attempts || 3,
      nextRunAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return jobId;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    error(
      {
        event: 'add_job_error',
        queueName,
        jobName,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error adding job to queue ${queueName}: ${errorMessage}`
    );
    throw error;
  }
}
/**
 * Add a repeatable job to a queue with type safety
 */
export async function addRepeatedJob<T extends BaseJobData>(
  queueName: string,
  jobName: string,
  data: T,
  pattern: string,
  options: JobsOptions = {}
): Promise<string> {
  try {
    // Generate job ID
    const jobId = options.jobId || uuidv4();

    // Merge default options with provided options
    const jobOptions: JobsOptions = {
      ...defaultJobOptions,
      ...options,
      jobId,
      repeat: {
        pattern,
      },
    };

    // Add job to queue
    if (!inMemoryMode) {
      // Get the appropriate queue with proper typing
      let queue: Queue<any> | null = null;

      switch (queueName) {
        case QUEUE_NAMES.INGESTION:
          queue = ingestionQueue as Queue<ReportJobData>;
          break;
        case QUEUE_NAMES.PROCESSING:
          queue = processingQueue as Queue<ReportJobData>;
          break;
        case QUEUE_NAMES.EMAIL:
          queue = emailQueue as Queue<EmailJobData>;
          break;
        case QUEUE_NAMES.INSIGHT:
          queue = insightQueue as Queue<InsightJobData>;
          break;
      }

      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      // Add repeatable job to queue with proper typing
      await queue.add(jobName, data, jobOptions);

      info(
        {
          event: 'repeated_job_added',
          jobId,
          queueName,
          jobName,
          pattern,
          timestamp: new Date().toISOString(),
        },
        `Added repeatable job ${jobId} (${jobName}) to queue ${queueName} with pattern ${pattern}`
      );
    } else {
      // Add job to in-memory queue
      // Note: In-memory mode doesn't fully support repeatable jobs
      inMemoryJobs.push({
        id: jobId,
        queueName,
        jobName,
        data,
        options: jobOptions,
        status: 'pending',
        attempts: 0,
        maxAttempts: jobOptions.attempts || 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        nextRunAt: new Date(),
      });

      info(
        {
          event: 'in_memory_repeated_job_added',
          jobId,
          queueName,
          jobName,
          pattern,
          timestamp: new Date().toISOString(),
        },
        `Added in-memory repeatable job ${jobId} (${jobName}) to queue ${queueName} with pattern ${pattern}`
      );
    }

    // Store job in database
    await db.insert(jobs).values({
      id: jobId,
      taskId: (data as any).taskId || null,
      status: 'pending',
      attempts: 0,
      maxAttempts: jobOptions.attempts || 3,
      nextRunAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return jobId;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    error(
      {
        event: 'add_repeated_job_error',
        queueName,
        jobName,
        pattern,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error adding repeatable job to queue ${queueName}: ${errorMessage}`
    );
    throw error;
  }
}
export { QUEUE_NAMES, JOB_TYPES };
