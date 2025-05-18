/**
 * Queue type definitions for BullMQ
 * 
 * This file contains the type definitions for all queue types used in the application.
 */

import { 
  EmailJobData, 
  InsightJobData, 
  WorkflowJobData, 
  ReportJobData, 
  TaskJobData 
} from './jobTypes';

/**
 * Queue registry interface
 * 
 * Maps queue names to their respective job data types
 */
export interface QueueRegistry {
  // Email queues
  'email': EmailJobData;
  'email-notifications': EmailJobData;
  
  // Insight queues
  'insights': InsightJobData;
  'insight-generation': InsightJobData;
  
  // Workflow queues
  'workflows': WorkflowJobData;
  'workflow-steps': WorkflowJobData;
  
  // Report queues
  'reports': ReportJobData;
  'report-generation': ReportJobData;
  
  // Task queues
  'tasks': TaskJobData;
  'scheduled-tasks': TaskJobData;
  'taskProcessor': TaskJobData;
}

/**
 * Queue names type
 * 
 * Union type of all queue names
 */
export type QueueName = keyof QueueRegistry;

/**
 * Queue job data type
 * 
 * Gets the job data type for a given queue name
 */
export type QueueJobData<T extends QueueName> = QueueRegistry[T];

/**
 * Queue worker handler type
 * 
 * Type for worker handler functions
 */
export type QueueWorkerHandler<T extends QueueName> = (
  job: {
    data: QueueJobData<T>;
    id: string;
    name: string;
    timestamp: number;
    opts: any;
    progress: (progress: number | object) => Promise<void>;
    log: (row: string) => Promise<void>;
    updateData: (data: Partial<QueueJobData<T>>) => Promise<void>;
  }
) => Promise<any>;

/**
 * Queue processor options
 * 
 * Options for queue processors
 */
export interface QueueProcessorOptions<T extends QueueName> {
  /**
   * Queue name
   */
  queueName: T;
  
  /**
   * Concurrency level
   */
  concurrency?: number;
  
  /**
   * Handler function
   */
  handler: QueueWorkerHandler<T>;
  
  /**
   * Whether to use a scheduler
   */
  useScheduler?: boolean;
  
  /**
   * Connection options
   */
  connection?: any;
}
