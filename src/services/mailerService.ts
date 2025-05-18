/**
 * Mailer Service
 * Handles email sending functionality using SendGrid
 */
import { MailService } from '....js';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { emailLogs } from '....js';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
// Initialize SendGrid client
const mailService = new MailService();
// Types for email service
export interface EmailContent {
  subject: string;
  text?: string;
  html?: string;
}
export interface EmailRecipient {
  email: string;
  name?: string;
}
export interface EmailSendOptions {
  from: EmailRecipient;
  to: EmailRecipient | EmailRecipient[];
  cc?: EmailRecipient | EmailRecipient[];
  bcc?: EmailRecipient | EmailRecipient[];
  content: EmailContent;
  attachments?: any[];
  workflowId?: string | null; // Optional reference to a workflow
}
/**
 * Initialize the mailer service with API key
 */
export function initializeMailer(apiKey?: string): void {
  try {
    // Use provided key or try to get from environment
    const key = apiKey || process.env.SENDGRID_API_KEY;
    if (!key) {
      console.warn('SendGrid API key not provided; email functionality is disabled');
      return;
    }
    mailService.setApiKey(key);
    console.log('SendGrid mailer service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize mailer service:', error);
    throw error;
  }
}
// Auto-initialize if API key is available in environment
if (process.env.SENDGRID_API_KEY) {
  initializeMailer();
}
/**
 * Send an email using the configured email service
 */
export async function sendEmail(options: EmailSendOptions): Promise<EmailLog> {
  const logId = uuidv4();
  let status: 'pending' | 'sent' | 'failed' = 'pending';
  let errorMessage: string | undefined;
  // Format recipients for log - convert to JSON array
  const recipients = Array.isArray(options.to)
    ? options.to.map((r) => r.email)
    : [options.to.email];
  try {
    // Create a log entry for this email attempt
    await db.insert(emailLogs).values({
      id: logId,
      workflowId: options.workflowId,
      status: 'pending',
      recipientEmail: Array.isArray(options.to) ? options.to[0].email : options.to.email,
      subject: options.content.subject,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Prepare email for SendGrid - we need to format according to SendGrid requirements
    // Create a message object with required fields
    const message: any = {
      to: options.to,
      from: options.from,
      subject: options.content.subject,
      // At least one of text or html is required
      text: options.content.text || ' ', // Always provide a text fallback
      // Include optional fields if present
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(options.attachments ? { attachments: options.attachments } : {}),
    };
    // Add HTML content only if it exists to avoid type issues
    if (options.content.html) {
      message.html = options.content.html;
    }
    // Send the email
    await mailService.send(message);
    // Update log with success
    status = 'sent';
    await db
      .update(emailLogs)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId.toString()));
    console.log(`Email sent successfully. Log ID: ${logId}`);
    // Get the updated log entry
    const [updatedLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, logId.toString()));
    return updatedLog;
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
    // Handle error
    console.error('Failed to send email:', error);
    status = 'failed';
    errorMessage =
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
        : String(error);
    // Update log with failure
    await db
      .update(emailLogs)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId.toString()));
    // Get the updated log entry
    const [updatedLog] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, logId.toString()));
    return updatedLog;
  }
}
/**
 * Get email logs for a specific workflow
 */
export async function getEmailLogsByWorkflowId(workflowId: string): Promise<EmailLog[]> {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.workflowId!, workflowId))
      .orderBy(emailLogs.createdAt);
    return logs;
  } catch (error) {
    console.error(`Failed to get email logs for workflow ${workflowId}:`, error);
    throw error;
  }
}
