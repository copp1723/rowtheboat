/**
 * Queue Type Definitions for BullMQ
 * 
 * This file contains type definitions for all queues used in the application.
 * Each queue is associated with specific job types and processing requirements.
 */

import { Queue, Worker, QueueScheduler } from 'bullmq';
import { 
  EmailJobData, 
  InsightJobData, 
  WorkflowJobData, 
  ReportJobData,
  TaskJobData
} from './jobTypes';
import { QueueConfig, BaseJobData } from './baseTypes';

/**
 * Email Queue Types
 */
export interface EmailQueue extends Queue<EmailJobData> {}
export interface EmailWorker extends Worker<EmailJobData> {}
export interface EmailQueueConfig extends QueueConfig {}

/**
 * Insight Queue Types
 */
export interface InsightQueue extends Queue<InsightJobData> {}
export interface InsightWorker extends Worker<InsightJobData> {}
export interface InsightQueueConfig extends QueueConfig {}

/**
 * Workflow Queue Types
 */
export interface WorkflowQueue extends Queue<WorkflowJobData> {}
export interface WorkflowWorker extends Worker<WorkflowJobData> {}
export interface WorkflowQueueConfig extends QueueConfig {}

/**
 * Report Queue Types
 */
export interface ReportQueue extends Queue<ReportJobData> {}
export interface ReportWorker extends Worker<ReportJobData> {}
export interface ReportQueueConfig extends QueueConfig {}

/**
 * Task Queue Types
 */
export interface TaskQueue extends Queue<TaskJobData> {}
export interface TaskWorker extends Worker<TaskJobData> {}
export interface TaskQueueConfig extends QueueConfig {}

/**
 * Queue Registry
 * 
 * Maps queue names to their respective job data types
 */
export interface QueueRegistry {
  'email': EmailJobData;
  'email-processing': EmailJobData;
  'insight': InsightJobData;
  'insight-processing': InsightJobData;
  'report': ReportJobData;
  'report-processing': ReportJobData;
  'workflow': WorkflowJobData;
  'workflow-step': WorkflowJobData;
  'scheduled-job': TaskJobData;
  'health-check': BaseJobData;
  [key: string]: any;
}

/**
 * Type-safe queue getter
 * 
 * @param queueName The name of the queue to get
 * @returns A strongly typed queue instance
 */
export function getTypedQueue<K extends keyof QueueRegistry>(
  queueName: K
): Queue<QueueRegistry[K]> {
  // This is just a type definition - implementation will be elsewhere
  throw new Error('Not implemented');
}

/**
 * Type-safe worker getter
 * 
 * @param queueName The name of the queue to get a worker for
 * @returns A strongly typed worker instance
 */
export function getTypedWorker<K extends keyof QueueRegistry>(
  queueName: K
): Worker<QueueRegistry[K]> {
  // This is just a type definition - implementation will be elsewhere
  throw new Error('Not implemented');
}

/**
 * Type-safe scheduler getter
 * 
 * @param queueName The name of the queue to get a scheduler for
 * @returns A queue scheduler instance
 */
export function getQueueScheduler(queueName: keyof QueueRegistry): QueueScheduler {
  // This is just a type definition - implementation will be elsewhere
  throw new Error('Not implemented');
}
