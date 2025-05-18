/**
 * Job type definitions for BullMQ
 * 
 * This file contains the type definitions for all job data types used in the application.
 * Each job type extends the BaseJobData interface.
 */

import { BaseJobData } from './baseTypes';

/**
 * Email job data interface
 */
export interface EmailJobData extends BaseJobData {
  /**
   * Email recipient
   */
  to: string | string[];
  
  /**
   * Email subject
   */
  subject: string;
  
  /**
   * Email body content
   */
  body: string;
  
  /**
   * Email template ID (if using a template)
   */
  templateId?: string;
  
  /**
   * Template variables
   */
  templateVars?: Record<string, any>;
  
  /**
   * Email attachments
   */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  
  /**
   * CC recipients
   */
  cc?: string | string[];
  
  /**
   * BCC recipients
   */
  bcc?: string | string[];
  
  /**
   * Reply-to address
   */
  replyTo?: string;
}

/**
 * Insight job data interface
 */
export interface InsightJobData extends BaseJobData {
  /**
   * Type of insight to generate
   */
  insightType: 'daily' | 'weekly' | 'monthly' | 'custom';
  
  /**
   * Data source for the insight
   */
  dataSource: string;
  
  /**
   * Query parameters for the insight
   */
  queryParams: Record<string, any>;
  
  /**
   * Date range for the insight
   */
  dateRange?: {
    start: string;
    end: string;
  };
  
  /**
   * Output format
   */
  outputFormat?: 'json' | 'csv' | 'pdf';
  
  /**
   * Whether to send notification when complete
   */
  notify?: boolean;
  
  /**
   * Notification recipients
   */
  notifyRecipients?: string[];
}

/**
 * Workflow job data interface
 */
export interface WorkflowJobData extends BaseJobData {
  /**
   * Workflow template ID
   */
  workflowId: string;
  
  /**
   * Current step in the workflow
   */
  currentStep?: number;
  
  /**
   * Total steps in the workflow
   */
  totalSteps?: number;
  
  /**
   * Input data for the workflow
   */
  input: Record<string, any>;
  
  /**
   * Context data for the workflow
   */
  context?: Record<string, any>;
  
  /**
   * Step results
   */
  stepResults?: Record<string, any>[];
}

/**
 * Report job data interface
 */
export interface ReportJobData extends BaseJobData {
  /**
   * Report type
   */
  reportType: string;
  
  /**
   * Report parameters
   */
  parameters: Record<string, any>;
  
  /**
   * Output format
   */
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  
  /**
   * Whether to send the report via email
   */
  sendEmail?: boolean;
  
  /**
   * Email recipients if sending via email
   */
  emailRecipients?: string[];
  
  /**
   * Storage location for the report
   */
  storageLocation?: string;
}

/**
 * Task job data interface
 */
export interface TaskJobData extends BaseJobData {
  /**
   * Task type
   */
  taskType: string;
  
  /**
   * Task parameters
   */
  params: Record<string, any>;
  
  /**
   * Whether the task is scheduled
   */
  scheduled?: boolean;
  
  /**
   * Cron expression for scheduled tasks
   */
  cronExpression?: string;
  
  /**
   * Task timeout in milliseconds
   */
  timeout?: number;
}
