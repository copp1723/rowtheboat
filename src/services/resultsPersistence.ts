/**
 * Results Persistence Service
 *
 * Handles storing parsed results in both the filesystem and database
 * with support for deduplication and structured organization.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../shared/db.js';
import { reports, reportSources } from '../shared/report-schema.js';
import { eq, and } from 'drizzle-orm';
import { ParserResult } from './attachmentParsers.js';
// Interface for storing results
export interface StorageResult {
  id: string;
  reportId: string; // Added reportId property
  filePath: string;
  jsonPath: string;
  sourceId: string;
  recordCount: number;
  vendor: string;
  reportType?: string;
  status: 'pending_analysis' | 'analyzed' | 'error';
  metadata: Record<string, any>;
}
/**
 * Create directory structure for storing results
 * @param vendor - Vendor name
 * @returns Path to the created directory
 */
export function createResultsDirectory(vendor: string): string {
  const resultsDir = path.join(process.cwd(), 'results');
  const vendorDir = path.join(resultsDir, vendor);
  // Create directories if they don't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
  }
  return vendorDir;
}
/**
 * Store parsed results in the filesystem
 * @param vendor - Vendor name
 * @param data - Parsed data
 * @param reportId - Report ID
 * @returns Path to the stored JSON file
 */
export function storeResultsToFile(
  vendor: string,
  data: ParserResult,
  reportId: string = uuidv4()
): string {
  const vendorDir = createResultsDirectory(vendor);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${today}-${reportId}.json`;
  const filePath = path.join(vendorDir, fileName);
  // Write data to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Stored results to ${filePath}`);
  return filePath;
}
/**
 * Check if a report with the same content already exists
 * @param vendor - Vendor name
 * @param recordCount - Number of records
 * @param metadata - Report metadata
 * @returns Existing report ID if found, null otherwise
 */
export async function checkForDuplicateReport(
  vendor: string,
  recordCount: number,
  metadata: Record<string, any>
): Promise<string | null> {
  // Check for reports with the same vendor, record count, and file name
  const existingReports = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.vendor, vendor),
        eq(reports.recordCount, recordCount)
      )
    );
  if (existingReports.length === 0) {
    return null;
  }
  // Check if any of the existing reports have the same file name
  const fileName = metadata.fileName;
  for (const report of existingReports) {
    const reportMetadata = report.metadata as Record<string, any>;
    if (reportMetadata && reportMetadata.fileName === fileName) {
      console.log(`Found duplicate report: ${report.id}`);
      return report.id as string;
    }
  }
  return null;
}
/**
 * Store report source information in the database
 * @param sourceInfo - Source information
 * @returns Source ID
 */
export async function storeReportSource(sourceInfo: {
  vendor: string;
  sourceType: string;
  emailSubject?: string;
  emailFrom?: string;
  emailDate?: Date;
  filePath: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const sourceId = uuidv4();
  await db.insert(reportSources).values({
    id: sourceId,
    vendor: sourceInfo.vendor,
    sourceType: sourceInfo.sourceType,
    emailSubject: sourceInfo.emailSubject || null,
    emailFrom: sourceInfo.emailFrom || null,
    emailDate: sourceInfo.emailDate || null,
    filePath: sourceInfo.filePath,
    metadata: sourceInfo.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Stored report source: ${sourceId}`);
  return sourceId;
}
/**
 * Store report data in the database
 * @param reportData - Report data
 * @returns Report ID
 */
export async function storeReportData(reportData: {
  sourceId: string;
  reportData: ParserResult;
  recordCount: number;
  vendor: string;
  reportDate?: Date;
  reportType?: string;
  status?: 'pending_analysis' | 'analyzed' | 'error';
  metadata?: Record<string, any>;
}): Promise<string> {
  // Check for duplicates
  const duplicateId = await checkForDuplicateReport(
    reportData.vendor,
    reportData.recordCount,
    reportData.metadata || {}
  );
  if (duplicateId) {
    console.log(`Using existing report: ${duplicateId}`);
    return duplicateId;
  }
  const reportId = uuidv4();
  await db.insert(reports).values({
    id: reportId,
    sourceId: reportData.sourceId,
    reportData: reportData.reportData,
    recordCount: reportData.recordCount,
    vendor: reportData.vendor,
    reportDate: reportData.reportDate || new Date(),
    reportType: reportData.reportType || null,
    status: reportData.status || 'pending_analysis',
    metadata: reportData.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Stored report data: ${reportId}`);
  return reportId;
}
/**
 * Store parsed results in both filesystem and database
 * @param vendor - Vendor name
 * @param parserResult - Parser result
 * @param sourceInfo - Source information
 * @returns Storage result
 */
export async function storeResults(
  vendor: string,
  parserResult: ParserResult,
  sourceInfo: {
    sourceType: string;
    emailSubject?: string;
    emailFrom?: string;
    emailDate?: Date;
    filePath: string;
    metadata?: Record<string, any>;
  }
): Promise<StorageResult> {
  try {
    // Generate a report ID
    const reportId = uuidv4();
    // Store results to file
    const jsonPath = storeResultsToFile(vendor, parserResult, reportId);
    // Store report source
    const sourceId = await storeReportSource({
      vendor,
      sourceType: sourceInfo.sourceType,
      ...(sourceInfo.emailSubject ? { emailSubject: sourceInfo.emailSubject } : {}),
      ...(sourceInfo.emailFrom ? { emailFrom: sourceInfo.emailFrom } : {}),
      ...(sourceInfo.emailDate ? { emailDate: sourceInfo.emailDate } : {}),
      filePath: sourceInfo.filePath,
      ...(sourceInfo.metadata ? { metadata: sourceInfo.metadata } : {}),
    });
    // Store report data
    const storedReportId = await storeReportData({
      sourceId,
      reportData: parserResult,
      recordCount: parserResult.recordCount,
      vendor,
      ...(parserResult.metadata.reportType ? { reportType: parserResult.metadata.reportType } : {}),
      status: 'pending_analysis',
      metadata: {
        ...parserResult.metadata,
        jsonPath,
      },
    });
    return {
      id: storedReportId,
      reportId: storedReportId, // Added reportId property
      filePath: sourceInfo.filePath,
      jsonPath,
      sourceId,
      recordCount: parserResult.recordCount,
      vendor,
      reportType: parserResult.metadata.reportType ?? '',
      status: 'pending_analysis',
      metadata: {
        ...parserResult.metadata,
        sourceInfo: sourceInfo.metadata,
      },
    };
  } catch (error) {
    console.error('Error storing results:', error);
    throw error;
  }
}
export default {
  createResultsDirectory,
  storeResultsToFile,
  checkForDuplicateReport,
  storeReportSource,
  storeReportData,
  storeResults,
};
