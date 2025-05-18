import { db } from '../shared/db.js';
import { isError } from '../utils/errorUtils.js';
import { emailQueue as emailQueueTable } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { EmailSendOptions, sendEmail as sendEmailService } from './mailerService.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { formatError } from '../utils/logger.js';
interface EmailQueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffFactor?: number;
}
class EmailQueueService {
  private static instance: EmailQueueService;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds in milliseconds
  private backoffFactor: number = 2; // Exponential backoff factor
  private constructor(options?: EmailQueueOptions) {
    if (options) {
      if (options.maxRetries !== undefined) this.maxRetries = options.maxRetries;
      if (options.retryDelay !== undefined) this.retryDelay = options.retryDelay;
      if (options.backoffFactor !== undefined) this.backoffFactor = options.backoffFactor;
    }
  }
  static getInstance(options?: EmailQueueOptions): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService(options);
    }
    return EmailQueueService.instance;
  }
  async enqueue(options: EmailSendOptions): Promise<string> {
    const id = uuidv4();
    const to = Array.isArray(options.to) ? options.to[0] : options.to;
    await db.insert(emailQueueTable).values({
      id,
      recipientEmail: to.email,
      subject: options.content.subject,
      body: options.content.text || '',
      htmlBody: options.content.html || null,
      options: JSON.stringify(options),
      attempts: 0,
      status: 'pending',
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any); // @ts-ignore - Ensuring all required properties are provided;
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue().catch((error) =>
        logger.error({
          event: 'email_queue_process_error',
          ...formatError(error),
        })
      );
    }
    return id;
  }
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    try {
      this.isProcessing = true;
      while (true) {
        // Get next pending email
        const [email] = await db
          .select()
          .from(emailQueueTable)
          .where(eq(emailQueueTable.status, 'pending'))
          .orderBy(emailQueueTable.createdAt)
          .limit(1);
        if (!email) {
          break; // No more emails to process
        }
        // Mark as processing
        await db
          .update(emailQueueTable)
          .set({
            status: 'processing',
            updatedAt: new Date(),
          })
          .where(eq(emailQueueTable.id, email.id));
        try {
          const options = JSON.parse(email.options as string) as EmailSendOptions;
          await sendEmailService(options);
          // Mark as completed
          await db
            .update(emailQueueTable)
            .set({
              status: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(emailQueueTable.id, email.id));
          logger.info({
            event: 'email_sent',
            emailId: email.id,
            recipient: email.recipientEmail,
          });
        } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
          // Use type-safe error handling
          const errorMessage = isError(error)
            ? error instanceof Error
              ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
              : String(error)
            : String(error);
          // Use type-safe error handling
          const errorMessage = isError(error)
            ? error instanceof Error
              ? isError(error)
                ? error instanceof Error
                  ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                  : String(error)
                : String(error)
              : String(error)
            : String(error);
          const attempts = (email.attempts ?? 0) + 1;
          const status = attempts >= (email.maxAttempts ?? this.maxRetries) ? 'failed' : 'pending';
          // Calculate exponential backoff delay
          const retryDelay = this.calculateBackoff(attempts);
          await db
            .update(emailQueueTable)
            .set({
              status,
              attempts,
              lastError:
                error instanceof Error
                  ? isError(error)
                    ? error instanceof Error
                      ? isError(error)
                        ? error instanceof Error
                          ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                          : String(error)
                        : String(error)
                      : String(error)
                    : String(error)
                  : String(error),
              updatedAt: new Date(),
              processAfter: status === 'pending' ? new Date(Date.now() + retryDelay) : null,
            })
            .where(eq(emailQueueTable.id, email.id));
          logger.error({
            event: 'email_send_error',
            emailId: email.id,
            recipient: email.recipientEmail,
            attempt: attempts,
            maxAttempts: email.maxAttempts,
            ...formatError(error),
          });
          if (status === 'pending') {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(retryDelay, this.retryDelay))
            );
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
  private calculateBackoff(attempt: number): number {
    return Math.min(
      60 * 60 * 1000, // Cap at 1 hour
      this.retryDelay * Math.pow(this.backoffFactor, attempt - 1)
    );
  }
  async getStatus(id: string): Promise<EmailQueueStatus | null> {
    const [email] = await db
      .select()
      .from(emailQueueTable)
      .where(eq(emailQueueTable.id, id.toString()));
    if (!email) return null;
    return {
      id: email.id,
      options: JSON.parse(email.options as string) as EmailSendOptions,
      attempts: email.attempts ?? 0,
      status: email.status,
      error: email.lastError || '',
      createdAt: email.createdAt!,
      updatedAt: email.updatedAt!,
    };
  }
  async retryEmail(id: string): Promise<boolean> {
    const [email] = await db
      .select()
      .from(emailQueueTable)
      .where(eq(emailQueueTable.id, id.toString()));
    if (!email || email.status !== 'failed') {
      return false;
    }
    try {
      await db
        .update(emailQueueTable)
        .set({
          status: 'pending',
          attempts: 0,
          lastError: null,
          updatedAt: new Date(),
          processAfter: null,
        })
        .where(eq(emailQueueTable.id, id.toString()));
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue().catch((error) =>
          logger.error({
            event: 'email_queue_retry_error',
            emailId: id,
            ...formatError(error),
          })
        );
      }
      return true;
    } catch (error) {
      logger.error({
        event: 'email_retry_error',
        emailId: id,
        ...formatError(error),
      });
      return false;
    }
  }
}
interface EmailQueueStatus {
  id: string;
  options: EmailSendOptions;
  attempts: number;
  status: string;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}
// Export singleton instance
export const emailQueue = EmailQueueService.getInstance();
