declare module 'workflowEmailServiceFixed' {
  /**
   * Send a workflow completion email
   * 
   * @param workflowId - ID of the workflow
   * @param recipient - Email address of the recipient
   * @param variables - Variables to include in the email template
   */
  export function sendWorkflowCompletionEmail(
    workflowId: string,
    recipient: string,
    variables: Record<string, unknown>
  ): Promise<void>;

  /**
   * Configure email notifications for a workflow
   * 
   * @param workflowId - ID of the workflow
   * @param config - Notification configuration
   */
  export function configureNotification(
    workflowId: string, 
    config: {
      recipientEmail: string;
      sendOnCompletion?: boolean;
      sendOnFailure?: boolean;
    }
  ): Promise<void>;

  /**
   * Get email logs for a workflow
   * 
   * @param workflowId - ID of the workflow
   */
  export function getEmailLogs(workflowId: string): Promise<unknown[]>;

  /**
   * Retry sending a failed email
   * 
   * @param emailId - ID of the failed email
   */
  export function retryEmail(emailId: string): Promise<void>;

  /**
   * Get notification settings for a workflow
   * 
   * @param workflowId - ID of the workflow
   */
  export function getNotificationSettings(workflowId: string): Promise<{
    recipientEmail: string;
    sendOnCompletion: boolean;
    sendOnFailure: boolean;
  }>;

  /**
   * Delete notification settings for a workflow
   * 
   * @param workflowId - ID of the workflow
   */
  export function deleteNotification(workflowId: string): Promise<void>;
}
