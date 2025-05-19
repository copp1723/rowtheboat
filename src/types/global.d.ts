// Import declarations for JavaScript modules with relative paths
declare module '*/attachmentParsers.js' {
  interface ParserResult {
    content: string;
    metadata: Record<string, unknown>;
  }

  export function parseTextAttachment(content: string): Promise<ParserResult>;
  export function parsePdfAttachment(content: Buffer): Promise<ParserResult>;
  export function parseImageAttachment(content: Buffer): Promise<ParserResult>;
}

declare module '*/stepHandlers.js' {
  interface StepHandler {
    execute(input: unknown): Promise<unknown>;
  }

  export const stepHandlers: Record<string, (config: Record<string, any>, context: Record<string, any>) => Promise<unknown>>;
}

declare module '*/workflowEmailServiceFixed.js' {
  export function sendWorkflowCompletionEmail(
    workflowId: string,
    recipient: string,
    variables: Record<string, unknown>
  ): Promise<void>;

  export function configureNotification(
    workflowId: string,
    config: {
      recipientEmail: string;
      sendOnCompletion?: boolean;
      sendOnFailure?: boolean;
    }
  ): Promise<void>;

  export function getEmailLogs(workflowId: string): Promise<unknown[]>;
  export function retryEmail(emailId: string): Promise<void>;

  export function getNotificationSettings(workflowId: string): Promise<{
    recipientEmail: string;
    sendOnCompletion: boolean;
    sendOnFailure: boolean;
  }>;

  export function deleteNotification(workflowId: string): Promise<void>;
}

declare module '*/awsKmsService.js' {
  export function logSecurityEvent(eventType: string, userId?: string, metadata?: Record<string, unknown>): Promise<void>;

  export interface KmsOptions {
    region?: string;
    keyId?: string;
    enabled?: boolean;
    keyAlias?: string;
  }

  export function initializeKmsService(options?: KmsOptions): Promise<void>;
  export function createKey(description: string): Promise<string>;
  export function scheduleKeyDeletion(keyId: string, pendingWindowInDays: number): Promise<void>;
}

declare module 'cron' {
  export function scheduleJob(expression: string, callback: () => void): { cancel: () => void };
}
