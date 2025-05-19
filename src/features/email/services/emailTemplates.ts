/**
 * Email Templates Service
 * Provides templates for various email types in the application
 */
import { Workflow } from '../../../../shared/schema';
interface TemplateData {
  workflowId: string;
  workflowStatus: string;
  summary?: string;
  insights?: any[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  [key: string]: any;
}
interface StatusColor {
  bg: string;
  text: string;
}
/**
 * Generate a workflow summary email (HTML)
 */
export function generateWorkflowSummaryHtml(data: TemplateData): string {
  try {
    const duration =
      data.completedAt && data.createdAt
        ? getDurationString(new Date(data.createdAt), new Date(data.completedAt))
        : 'N/A';
    const statusColor = getStatusColor(data.workflowStatus);
    const formattedDate = formatDate(new Date());
    const insightsHtml = generateInsightsHtml(data.insights);
    const errorHtml = generateErrorHtml(data.error);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workflow Summary</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background-color: ${statusColor.bg}; padding: 20px; border-bottom: 1px solid #e8e8e8;">
            <h2 style="margin: 0; color: ${statusColor.text};">Workflow Summary Report</h2>
            <p style="margin: 8px 0 0 0; color: #666;">${formattedDate}</p>
          </div>
          <div style="padding: 24px;">
            <div style="margin-bottom: 24px;">
              <div style="display: flex; margin-bottom: 12px;">
                <strong style="width: 120px;">Workflow ID:</strong>
                <span>${data.workflowId!}</span>
              </div>
              <div style="display: flex; margin-bottom: 12px;">
                <strong style="width: 120px;">Status:</strong>
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background-color: ${statusColor.bg}; color: ${statusColor.text};">
                  ${data.workflowStatus.toUpperCase()}
                </span>
              </div>
              <div style="display: flex; margin-bottom: 12px;">
                <strong style="width: 120px;">Duration:</strong>
                <span>${duration}</span>
              </div>
            </div>
            ${
              data.summary
                ? `
            <div style="margin-bottom: 24px;">
              <h3 style="color: #333; margin: 0 0 12px 0;">Summary</h3>
              <p style="margin: 0;">${data.summary}</p>
            </div>
            `
                : ''
            }
            ${insightsHtml}
            ${errorHtml}
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center; color: #666;">
              <p style="margin: 0; font-size: 14px;">This is an automated notification. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    console.error('Error generating email template:', error);
    return generateErrorTemplate(data.workflowId!);
  }
}
function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function generateInsightsHtml(insights?: any[]): string {
  if (!insights?.length) return '';
  return `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #333; margin: 0 0 12px 0;">Key Insights</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${insights.map((insight) => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
      </ul>
    </div>
  `;
}
function generateErrorHtml(error?: string): string {
  if (!error) return '';
  return `
    <div style="background-color: #fff1f0; border-left: 4px solid #ff4d4f; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="color: #cf1322; margin: 0 0 8px 0;">Error Details</h3>
      <p style="margin: 0; color: #434343;">${error}</p>
    </div>
  `;
}
function generateErrorTemplate(workflowId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <p>An error occurred while generating the email template for workflow ${workflowId}.</p>
      <p>Please check the workflow status in the dashboard.</p>
    </body>
    </html>
  `;
}
function getStatusColor(status: string): StatusColor {
  const colors: Record<string, StatusColor> = {
    completed: { bg: '#f6ffed', text: '#52c41a' },
    failed: { bg: '#fff1f0', text: '#f5222d' },
    running: { bg: '#e6f7ff', text: '#1890ff' },
    pending: { bg: '#fffbe6', text: '#faad14' },
    paused: { bg: '#f5f5f5', text: '#8c8c8c' },
  };
  return colors[status.toLowerCase()] || { bg: '#f5f5f5', text: '#595959' };
}
function getDurationString(startDate: Date, endDate: Date): string {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationSec = Math.floor(durationMs / 1000);
  if (durationSec < 60) return `${durationSec} seconds`;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  if (minutes < 60) return `${minutes} min ${seconds} sec`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes} min`;
}
