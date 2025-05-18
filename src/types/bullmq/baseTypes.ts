/**
 * Base Types for BullMQ Jobs
 * 
 * This file contains the base types and interfaces for BullMQ jobs and queues.
 * These types provide a foundation for type-safe job processing throughout the application.
 */

import { JobsOptions, QueueOptions, WorkerOptions, Job as BullMQJob } from 'bullmq';

/**
 * Common job status values across all job types
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

/**
 * Base interface for all job data payloads
 * All specific job data types should extend this interface
 */
export interface BaseJobData {
  /**
   * Unique identifier for the job
   */
  jobId?: string;
  
  /**
   * Timestamp when the job was created
   */
  createdAt?: Date | string;
}

/**
 * Base interface for job options
 * Extends BullMQ's JobsOptions with our application-specific defaults
 */
export interface JobOptions extends JobsOptions {
  /**
   * Priority of the job (higher means higher priority)
   * Default is 1
   */
  priority?: number;
  
  /**
   * Number of attempts before marking job as failed
   * Default is 3
   */
  attempts?: number;
  
  /**
   * Delay in milliseconds before the job is processed
   */
  delay?: number;
  
  /**
   * Whether to remove the job when it completes
   */
  removeOnComplete?: boolean | number;
  
  /**
   * Whether to remove the job when it fails
   */
  removeOnFail?: boolean | number;
}

/**
 * Type for a BullMQ job with strongly typed data
 */
export type TypedJob<T extends BaseJobData> = BullMQJob<T, any, string>;

/**
 * Interface for job processor functions
 */
export interface JobProcessor<T extends BaseJobData> {
  (job: TypedJob<T>): Promise<any>;
}

/**
 * Base interface for queue configuration
 */
export interface QueueConfig {
  /**
   * Name of the queue
   */
  name: string;
  
  /**
   * Options for the queue
   */
  options?: QueueOptions;
  
  /**
   * Options for the worker
   */
  workerOptions?: WorkerOptions;
}
