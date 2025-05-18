/**
 * Job Type Definitions for BullMQ
 * 
 * This file contains type definitions for all job types used in the application.
 * Each job type has a specific data structure and processing requirements.
 */

import { BaseJobData } from './baseTypes';

/**
 * Email Job Data
 * 
 * Represents the data structure for email sending jobs
 */
export interface EmailJobData extends BaseJobData {
  /**
   * Email recipient(s)
   */
  to: string | string[] | { email: string; name?: string }[];
  
  /**
   * Email subject
   */
  subject: string;
  
  /**
   * Email content
   */
  content: {
    /**
     * Plain text version of the email
     */
    text?: string;
    
    /**
     * HTML version of the email
     */
    html?: string;
  };
  
  /**
   * Optional CC recipients
   */
  cc?: string | string[] | { email: string; name?: string }[];
  
  /**
   * Optional BCC recipients
   */
  bcc?: string | string[] | { email: string; name?: string }[];
  
  /**
   * Optional email sender
   * If not provided, the default system sender will be used
   */
  from?: { email: string; name?: string };
  
  /**
   * Optional attachments
   */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  
  /**
   * Optional metadata for tracking and analytics
   */
  metadata?: Record<string, any>;
}

/**
 * Insight Job Data
 * 
 * Represents the data structure for insight generation jobs
 */
export interface InsightJobData extends BaseJobData {
  /**
   * ID of the report to generate insights for
   */
  reportId: string;
  
  /**
   * Platform or source of the report
   */
  platform: string;
  
  /**
   * Optional role for targeted insight generation
   */
  role?: 'Executive' | 'Sales' | 'Lot';
  
  /**
   * Whether to save the generated insights
   */
  saveResults?: boolean;
  
  /**
   * Whether to evaluate the quality of the insights
   */
  evaluateQuality?: boolean;
  
  /**
   * Whether to assess the business impact of the insights
   */
  assessBusinessImpact?: boolean;
}

/**
 * Workflow Job Data
 * 
 * Represents the data structure for workflow execution jobs
 */
export interface WorkflowJobData extends BaseJobData {
  /**
   * ID of the workflow to execute
   */
  workflowId: string;
  
  /**
   * Optional step index to start from
   * If not provided, execution will start from the current step
   */
  startFromStep?: number;
  
  /**
   * Optional context data to be merged with the workflow context
   */
  contextData?: Record<string, any>;
  
  /**
   * Optional user ID associated with the workflow
   */
  userId?: string;
}

/**
 * Report Job Data
 * 
 * Represents the data structure for report processing jobs
 */
export interface ReportJobData extends BaseJobData {
  /**
   * ID of the report to process
   */
  reportId: string;
  
  /**
   * Type of report
   */
  reportType: string;
  
  /**
   * Source of the report
   */
  source: 'email' | 'api' | 'upload' | 'scheduled';
  
  /**
   * Optional processing options
   */
  options?: {
    /**
     * Whether to generate insights after processing
     */
    generateInsights?: boolean;
    
    /**
     * Whether to notify users after processing
     */
    notifyUsers?: boolean;
    
    /**
     * Optional format for export
     */
    exportFormat?: 'csv' | 'json' | 'pdf';
  };
}

/**
 * Task Job Data
 * 
 * Represents the data structure for generic task processing jobs
 */
export interface TaskJobData extends BaseJobData {
  /**
   * ID of the task to process
   */
  taskId: string;
  
  /**
   * Type of task
   */
  taskType?: 'scheduledWorkflow' | 'genericTask';
  
  /**
   * Optional workflow ID if the task is related to a workflow
   */
  workflowId?: string;
}
