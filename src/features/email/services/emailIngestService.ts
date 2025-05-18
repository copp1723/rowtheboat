/**
 * Email Ingestion Service
 * 
 * This service provides functionality to ingest CRM reports via email.
 * It replaces the hybrid approach that used Playwright as a fallback.
 */
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../shared/logger.js';
import { fetchEmailsWithAttachments } from '../../../../services/imapIngestionService.js';
import { parseByExtension } from '../../../../services/attachmentParsers.js';
import { storeResults } from '../../../../services/resultsPersistence.js';
import { generateInsights } from '../../../../services/insightGenerator.js';
import { sendAdminAlert } from '../../../../services/alertMailer.js';
import { isError } from '../../../../utils/errorUtils.js';
// Types
export interface EmailIngestOptions {
  intent?: string;
  downloadDir?: string;
  batchSize?: number;
  maxResults?: number;
  markSeen?: boolean;
  generateInsights?: boolean;
  storeResults?: boolean;
}
export interface EmailIngestResult {
  success: boolean;
  platform: string;
  filePaths: string[];
  parsedData?: any;
  storageResult?: any;
  insights?: any;
  error?: string;
}
/**
 * Custom error for when no report is found in the email
 */
export class ReportNotFoundError extends Error {
  constructor(message = 'No scheduled report emails found') {
    super(message);
    this.name = 'ReportNotFoundError';
  }
}
/**
 * Ingest CRM reports from email
 * 
 * @param platform CRM platform name (e.g., 'VinSolutions', 'VAUTO')
 * @param options Optional configuration
 * @returns Result of the ingestion process
 */
export async function ingestReportFromEmail(
  platform: string,
  options: EmailIngestOptions = {}
): Promise<EmailIngestResult> {
  const startTime = Date.now();
  logger.info(`Starting email ingestion for ${platform}`);
  // Set default options
  const downloadDir = options.downloadDir || './downloads';
  const intent = options.intent! || 'sales_report';
  const generateInsightsFlag = options.generateInsights !== false;
  const storeResultsFlag = options.storeResults !== false;
  try {
    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    // Fetch emails with attachments
    logger.info(`Fetching emails for ${platform}...`);
    const emailResults = await fetchEmailsWithAttachments(platform, downloadDir, {
      batchSize: options.batchSize,
      maxResults: options.maxResults,
      markSeen: options.markSeen,
    });
    logger.info(`Found ${emailResults.length} emails with attachments for ${platform}`);
    // Process each email result
    const results: EmailIngestResult[] = [];
    for (const emailResult of emailResults) {
      const { filePaths, emailMetadata } = emailResult;
      for (const filePath of filePaths) {
        try {
          logger.info(`Processing attachment: ${path.basename(filePath)}`);
          // Parse the attachment
          const parsedData = await parseByExtension(filePath, {
            vendor: platform,
            reportType: intent,
          });
          logger.info(`Successfully parsed ${parsedData.recordCount} records from ${path.basename(filePath)}`);
          // Store results if requested
          let storageResult;
          if (storeResultsFlag) {
            logger.info(`Storing results for ${platform}`);
            storageResult = await storeResults(platform, parsedData, {
              sourceType: 'email',
              emailSubject: emailMetadata.subject,
              emailFrom: emailMetadata.from,
              emailDate: emailMetadata.date,
              filePath,
              metadata: {
                emailMetadata,
                parseTime: Date.now() - startTime,
              },
            });
            logger.info(`Results stored with ID: ${storageResult.id}`);
          }
          // Generate insights if requested
          let insights;
          if (generateInsightsFlag && storageResult) {
            logger.info(`Generating insights for ${platform}`);
            insights = await generateInsights(storageResult.id, {
              platform,
              reportType: intent,
            });
            logger.info(`Generated ${insights.length} insights`);
          }
          // Add to results
          results.push({
            success: true,
            platform,
            filePaths: [filePath],
            parsedData,
            storageResult,
            insights,
          });
        } catch (error) {
          logger.error(`Error processing attachment ${path.basename(filePath)}:`, isError(error) ? error : String(error));
          // Add to results with error
          results.push({
            success: false,
            platform,
            filePaths: [filePath],
            error: isError(error) ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error),
          });
          // Send alert for processing errors
          await sendAdminAlert(
            'Attachment Processing Error',
            `Error processing attachment ${path.basename(filePath)} for ${platform}`,
            {
              severity: 'warning',
              component: 'Email Ingestion',
              details: {
                platform,
                file: path.basename(filePath),
                error: isError(error) ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error),
              },
            }
          );
        }
      }
    }
    // Return the first successful result, or the first result if none were successful
    const successfulResult = results.find(r => r.success);
    if (successfulResult) {
      return successfulResult;
    }
    if (results.length > 0) {
      return results[0];
    }
    // If we got here, no results were processed
    throw new ReportNotFoundError(`No valid reports found for ${platform}`);
  } catch (error) {
    logger.error(`Email ingestion failed for ${platform}:`, isError(error) ? error : String(error));
    // Only send alert if it's not a "no reports found" error
    if (!(error instanceof ReportNotFoundError)) {
      await sendAdminAlert(
        'Email Ingestion Failed',
        `Failed to ingest reports for ${platform} via email`,
        {
          severity: 'error',
          component: 'Email Ingestion',
          details: {
            platform,
            error: isError(error) ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error),
            elapsed: `${(Date.now() - startTime) / 1000} seconds`,
          },
        }
      );
    }
    return {
      success: false,
      platform,
      filePaths: [],
      error: isError(error) ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error),
    };
  }
}
