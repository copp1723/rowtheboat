/**
 * BullMQ Service
 *
 * Provides a unified interface for working with BullMQ queues, workers, and schedulers.
 * Implements type-safe queue operations using the defined job types.
 */

import { Queue, Worker, QueueScheduler, ConnectionOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import logger from '../utils/logger.js';
import { isError } from '../utils/errorUtils.js';
import { QUEUE_NAMES } from '../shared/constants.js';
import {
  BaseJobData,
  QueueRegistry,
  EmailJobData,
  InsightJobData,
  WorkflowJobData,
  ReportJobData,
  TaskJobData
} from '../types/bullmq';

// Redis client instance
let redisClient: Redis | null = null;

// Queue instances registry
const queues: Map<string, Queue<any>> = new Map();

// Worker instances registry
const workers: Map<string, Worker<any>> = new Map();

// Scheduler instances registry
const schedulers: Map<string, QueueScheduler> = new Map();

// Default connection options
const defaultConnectionOptions: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Default job options
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 100,
};

// Job types mapping
export const JOB_TYPES = {
  // Email jobs
  SEND_EMAIL: 'send-email',
  PROCESS_EMAIL: 'process-email',

  // Insight jobs
  GENERATE_INSIGHT: 'generate-insight',
  EVALUATE_INSIGHT: 'evaluate-insight',

  // Report jobs
  PROCESS_REPORT: 'process-report',
  EXPORT_REPORT: 'export-report',

  // Workflow jobs
  EXECUTE_WORKFLOW: 'execute-workflow',
  EXECUTE_WORKFLOW_STEP: 'execute-workflow-step',

  // Task jobs
  PROCESS_TASK: 'process-task',
  SCHEDULED_TASK: 'scheduled-task',

  // Health check jobs
  HEALTH_CHECK: 'health-check',
};

/**
 * Initialize Redis connection
 *
 * @param options Optional connection options
 * @returns Redis client instance or null if connection fails
 */
export async function initializeRedis(options?: ConnectionOptions): Promise<Redis | null> {
  try {
    if (process.env.FORCE_IN_MEMORY_QUEUE === 'true') {
      throw new Error('Forcing in-memory queue mode');
    }

    const connectionOptions = {
      ...defaultConnectionOptions,
      ...options,
    };

    const RedisModule = await import('ioredis');
    const Redis = RedisModule.default || RedisModule;

    redisClient = new Redis(connectionOptions);

    redisClient.on('error', (err: Error) => {
      logger.error({
        event: 'redis_connection_error',
        errorMessage: err.message,
        timestamp: new Date().toISOString(),
      }, `Redis connection error: ${err.message}`);
    });

    await redisClient.ping();

    logger.info({
      event: 'redis_connected',
      timestamp: new Date().toISOString(),
    }, 'Redis connection established');

    return redisClient;
  } catch (error) {
    logger.warn({
      event: 'redis_connection_failed',
      errorMessage: isError(error) ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, 'Redis connection failed, using in-memory mode');

    return null;
  }
}

/**
 * Create a typed queue
 *
 * @param queueName Name of the queue to create
 * @param options Optional queue options
 * @returns Queue instance
 */
export function createQueue<K extends keyof QueueRegistry>(
  queueName: K,
  options?: any
): Queue<QueueRegistry[K]> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  if (queues.has(queueName)) {
    return queues.get(queueName) as Queue<QueueRegistry[K]>;
  }

  const queue = new Queue(queueName, {
    connection: redisClient,
    ...options,
  });

  queues.set(queueName, queue);

  logger.info({
    event: 'queue_created',
    queueName,
    timestamp: new Date().toISOString(),
  }, `Created queue: ${queueName}`);

  return queue as Queue<QueueRegistry[K]>;
}

/**
 * Create a queue scheduler
 *
 * @param queueName Name of the queue to create a scheduler for
 * @param options Optional scheduler options
 * @returns QueueScheduler instance
 */
export function createScheduler(
  queueName: keyof QueueRegistry,
  options?: any
): QueueScheduler {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }

  if (schedulers.has(queueName)) {
    return schedulers.get(queueName) as QueueScheduler;
  }

  const scheduler = new QueueScheduler(queueName, {
    connection: redisClient,
    ...options,
  });

  schedulers.set(queueName, scheduler);

  logger.info({
    event: 'scheduler_created',
    queueName,
    timestamp: new Date().toISOString(),
  }, `Created scheduler for queue: ${queueName}`);

  return scheduler;
}

/**
 * Get a typed queue instance
 *
 * @param queueName Name of the queue to get
 * @returns Queue instance
 */
export function getQueue<K extends keyof QueueRegistry>(
  queueName: K
): Queue<QueueRegistry[K]> | null {
  return (queues.get(queueName) as Queue<QueueRegistry[K]>) || null;
}

/**
 * Close all connections
 */
export async function closeConnections(): Promise<void> {
  try {
    // Close all schedulers
    for (const [name, scheduler] of schedulers.entries()) {
      await scheduler.close();
      logger.info({
        event: 'scheduler_closed',
        queueName: name,
        timestamp: new Date().toISOString(),
      }, `Closed scheduler for queue: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of queues.entries()) {
      await queue.close();
      logger.info({
        event: 'queue_closed',
        queueName: name,
        timestamp: new Date().toISOString(),
      }, `Closed queue: ${name}`);
    }

    // Close all workers
    for (const [name, worker] of workers.entries()) {
      await worker.close();
      logger.info({
        event: 'worker_closed',
        workerName: name,
        timestamp: new Date().toISOString(),
      }, `Closed worker: ${name}`);
    }

    // Close Redis connection
    if (redisClient) {
      await redisClient.quit();
      logger.info({
        event: 'redis_connection_closed',
        timestamp: new Date().toISOString(),
      }, 'Redis connection closed');
    }
  } catch (error) {
    logger.error({
      event: 'close_connections_error',
      errorMessage: isError(error) ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, 'Error closing connections');

    throw error;
  }
}

// Export queue names for convenience
export { QUEUE_NAMES };
