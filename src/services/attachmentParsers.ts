/**
 * Attachment Parsers
 * @stub
 * @fileImplementationStatus partial-mock
 * @fileStubNote This file contains mock implementations for attachment parsers. Replace with real logic for production.
 */
import { info, warn, error } from '../shared/logger';
import path from 'path';
import fs from 'fs';

/**
 * Parser metadata
 */
export interface ParserMetadata {
  fileType?: string;
  fileName?: string;
  parseDate?: string;
  vendor?: string;
  reportType?: string;
  sheetNames?: string[];
  pageCount?: number;
}

/**
 * Parser result
 */
export interface ParserResult {
  data: any[];
  metadata: ParserMetadata;
  recordCount: number;
  summary?: Record<string, any>;
}

/**
 * Parse a file by extension
 * @stub
 * @mock
 * @implementationStatus mock
 * @returns Mocked parser result
 */
export async function parseByExtension(
  filePath: string,
  options: {
    vendor?: string;
    reportType?: string;
    sheetNames?: string[];
  } = {}
): Promise<ParserResult> {
  warn('[STUB] Using mock parseByExtension', { filePath, options });
  return {
    data: [{ id: 1, name: 'Test', value: 100 }],
    metadata: {
      fileType: (filePath.split('.').pop() || 'unknown'),
      fileName: filePath.split('/').pop() || filePath,
      parseDate: new Date().toISOString(),
      vendor: options.vendor,
      reportType: options.reportType,
      sheetNames: options.sheetNames,
      pageCount: 1,
    },
    recordCount: 1,
    summary: { totalValue: 100 },
  };
}

/**
 * Parse a CSV file
 * @stub
 * @mock
 * @implementationStatus mock
 * @returns Mocked parser result
 */
export async function parseCSV(
  filePath: string,
  options: {
    delimiter?: string;
    header?: boolean;
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  warn('[STUB] Using mock parseCSV', { filePath, options });
  return {
    data: [{ id: 1, name: 'Test', value: 100 }],
    metadata: {
      fileType: 'csv',
      fileName: filePath.split('/').pop() || filePath,
      parseDate: new Date().toISOString(),
      vendor: options.vendor,
      reportType: options.reportType,
    },
    recordCount: 1,
    summary: { totalValue: 100 },
  };
}

/**
 * Parse an Excel file
 * @stub
 * @mock
 * @implementationStatus mock
 * @returns Mocked parser result
 */
export async function parseExcel(
  filePath: string,
  options: {
    sheetNames?: string[];
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  warn('[STUB] Using mock parseExcel', { filePath, options });
  return {
    data: [{ id: 1, name: 'Test', value: 100 }],
    metadata: {
      fileType: 'xlsx',
      fileName: filePath.split('/').pop() || filePath,
      parseDate: new Date().toISOString(),
      vendor: options.vendor,
      reportType: options.reportType,
      sheetNames: options.sheetNames || ['Sheet1'],
    },
    recordCount: 1,
    summary: { totalValue: 100 },
  };
}

/**
 * Parse a PDF file
 * @stub
 * @mock
 * @implementationStatus mock
 * @returns Mocked parser result
 */
export async function parsePDF(
  filePath: string,
  options: {
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  warn('[STUB] Using mock parsePDF', { filePath, options });
  return {
    data: [{ id: 1, name: 'Test', value: 100 }],
    metadata: {
      fileType: 'pdf',
      fileName: filePath.split('/').pop() || filePath,
      parseDate: new Date().toISOString(),
      vendor: options.vendor,
      reportType: options.reportType,
      pageCount: 1,
    },
    recordCount: 1,
    summary: { totalValue: 100 },
  };
}

// Export default object for modules that import the entire service
export default {
  parseByExtension,
  parseCSV,
  parseExcel,
  parsePDF,
};
