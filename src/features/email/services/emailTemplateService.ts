/**
 * Email Template Service
 *
 * Service for managing and using email templates.
 */
import {
  renderEmailTemplate,
  EmailTemplateOptions,
  EmailTemplateResult,
} from './emailTemplateEngine.js';
import { sendEmail } from './mailerService.js';
/**
 * Email template types
 */
export type EmailTemplateType = 'notification' | 'alert' | 'report' | string;
/**
 * Email template data
 */
export interface EmailTemplateData {
  title: string;
  message: string;
  date?: string;
  details?: boolean;
  detailItems?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionText?: string;
  unsubscribeUrl?: string;
  summary?: string;
  metrics?: Array<{ label: string; value: string | number }>;
  tableTitle?: string;
  tableHeaders?: string[];
  tableData?: boolean;
  tableRows?: any[][];
  [key: string]: any;
}
/**
 * Email options
 */
export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject?: string;
  templateType: EmailTemplateType;
  templateData: EmailTemplateData;
}
/**
 * Generate email content from a template
 *
 * @param templateType - Type of template to use
 * @param templateData - Data to render in the template
 * @returns Rendered email content
 */
export function generateEmailContent(
  templateType: EmailTemplateType,
  templateData: EmailTemplateData
): EmailTemplateResult {
  // Set default date if not provided
  if (!templateData.date) {
    templateData.date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  // Render the template
  const options: EmailTemplateOptions = {
    templateName: templateType,
    data: templateData,
    format: 'both',
  };
  return renderEmailTemplate(options);
}
/**
 * Send an email using a template
 *
 * @param options - Email options
 * @returns Result of sending the email
 */
export async function sendTemplatedEmail(options: EmailOptions): Promise<any> {
  const { to, from, templateType, templateData } = options;
  // Generate email content
  const content = generateEmailContent(templateType, templateData);
  // Use template title as subject if not provided
  const subject = options.subject || templateData.title;
  // Send the email
  return await sendEmail({
    from: {
      email: process.env.DEFAULT_SENDER_EMAIL || 'noreply@example.com',
      name: 'System Notification',
    },
    to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
    from: from ? { email: from } : undefined,
    content: {
      subject,
      text: content.text,
      html: content.html,
    },
  });
}
/**
 * Send a notification email
 *
 * @param to - Recipient email(s)
 * @param title - Notification title
 * @param message - Notification message
 * @param options - Additional options
 * @returns Result of sending the email
 */
export async function sendNotificationEmail(
  to: string | string[],
  title: string,
  message: string,
  options: Partial<EmailTemplateData> = {}
): Promise<any> {
  return await sendTemplatedEmail({
    to,
    templateType: 'notification',
    templateData: {
      title,
      message,
      ...options,
    },
  });
}
/**
 * Send an alert email
 *
 * @param to - Recipient email(s)
 * @param title - Alert title
 * @param message - Alert message
 * @param options - Additional options
 * @returns Result of sending the email
 */
export async function sendAlertEmail(
  to: string | string[],
  title: string,
  message: string,
  options: Partial<EmailTemplateData> = {}
): Promise<any> {
  return await sendTemplatedEmail({
    to,
    templateType: 'alert',
    templateData: {
      title,
      message,
      ...options,
    },
  });
}
/**
 * Send a report email
 *
 * @param to - Recipient email(s)
 * @param title - Report title
 * @param message - Report message
 * @param options - Additional options
 * @returns Result of sending the email
 */
export async function sendReportEmail(
  to: string | string[],
  title: string,
  message: string,
  options: Partial<EmailTemplateData> = {}
): Promise<any> {
  return await sendTemplatedEmail({
    to,
    templateType: 'report',
    templateData: {
      title,
      message,
      ...options,
    },
  });
}
