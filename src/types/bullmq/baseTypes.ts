/**
 * Base types for BullMQ jobs
 * 
 * This file contains the base interfaces for all BullMQ job data types.
 * All job data types should extend the BaseJobData interface.
 */

/**
 * Base interface for all job data
 */
export interface BaseJobData {
  /**
   * Unique identifier for the job
   */
  id: string;
  
  /**
   * Timestamp when the job was created
   */
  createdAt: string;
  
  /**
   * User ID of the user who created the job (if applicable)
   */
  userId?: string;
  
  /**
   * Organization ID associated with the job (if applicable)
   */
  organizationId?: string;
  
  /**
   * Priority of the job (higher number = higher priority)
   */
  priority?: number;
  
  /**
   * Maximum number of attempts for this job
   */
  maxAttempts?: number;
  
  /**
   * Custom metadata for the job
   */
  metadata?: Record<string, any>;
}

/**
 * Job result interface
 */
export interface JobResult<T = any> {
  /**
   * Whether the job was successful
   */
  success: boolean;
  
  /**
   * Result data (if successful)
   */
  data?: T;
  
  /**
   * Error message (if failed)
   */
  error?: string;
  
  /**
   * Error stack trace (if failed)
   */
  stack?: string;
  
  /**
   * Timestamp when the job was completed
   */
  completedAt: string;
  
  /**
   * Duration of the job execution in milliseconds
   */
  duration: number;
  
  /**
   * Number of attempts made
   */
  attempts: number;
}

/**
 * Job status enum
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

/**
 * Job options interface
 */
export interface JobOptions {
  /**
   * Delay in milliseconds before the job is processed
   */
  delay?: number;
  
  /**
   * Number of attempts before the job is marked as failed
   */
  attempts?: number;
  
  /**
   * Backoff strategy for retries
   */
  backoff?: {
    /**
     * Type of backoff strategy
     */
    type: 'fixed' | 'exponential';
    
    /**
     * Delay in milliseconds
     */
    delay: number;
  };
  
  /**
   * Whether to remove the job when it's completed
   */
  removeOnComplete?: boolean | number;
  
  /**
   * Whether to remove the job when it fails
   */
  removeOnFail?: boolean | number;
  
  /**
   * Job priority (higher number = higher priority)
   */
  priority?: number;
  
  /**
   * Job timeout in milliseconds
   */
  timeout?: number;
}
