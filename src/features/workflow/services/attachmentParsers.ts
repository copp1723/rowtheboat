/**
 * Attachment Parser Service
 *
 * Provides functions for parsing different types of attachments (CSV, XLSX, PDF)
 * with validation and normalization using Zod schemas.
 */
import fs from 'fs';
import { getErrorMessage } from '../../../../utils/errorUtils';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import pdfParse from 'pdf-parse';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { debug, info, warn, error } from '../../../../shared/logger';
// Define file types
export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx',
  XLS = 'xls',
  PDF = 'pdf',
  UNKNOWN = 'unknown',
}
// Base schema for parsed data
export const BaseRecordSchema = z.record(z.string(), z.any());
// Interface for parser result
export interface ParserResult {
  id: string;
  records: Record<string, any>[];
  recordCount: number;
  metadata: {
    fileType: FileType;
    fileName: string;
    parseDate: string;
    vendor?: string;
    reportType?: string;
    [key: string]: any;
  };
}
// Using isError from errorUtils.js
/**
 * Parse a CSV file
 * @param filePath - Path to the CSV file
 * @param options - Optional parsing options
 * @returns Parsed data with metadata
 */
export async function parseCSV(
  filePath: string,
  options: {
    schema?: z.ZodType;
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    // Parse CSV
    const csvOptions = {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    };
    const rawRecords = csvParse(content, csvOptions);
    // Validate with schema if provided
    let records = rawRecords;
    if (options.schema) {
      const arraySchema = z.array(options.schema);
      records = arraySchema.parse(rawRecords);
    }
    info(
      {
        event: 'parsed_csv_records',
        file: path.basename(filePath),
        recordsCount: records.length,
        timestamp: new Date().toISOString(),
      },
      'Parsed CSV records'
    );
    const metadata: ParserResult['metadata'] = {
      fileType: FileType.CSV,
      fileName: path.basename(filePath),
      parseDate: new Date().toISOString(),
      ...(options.vendor ? { vendor: options.vendor } : {}),
      ...(options.reportType ? { reportType: options.reportType } : {}),
    };
    return {
      id: uuidv4(),
      records,
      recordCount: records.length,
      metadata,
    };
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;

    error(
      {
        event: 'error_parsing_csv',
        file: filePath,
        errorMessage,
        stack,
        timestamp: new Date().toISOString(),
      },
      'Error parsing CSV file'
    );
    throw error;
  }
}
/**
 * Parse an Excel file (XLSX/XLS)
 * @param filePath - Path to the Excel file
 * @param options - Optional parsing options
 * @returns Parsed data with metadata
 */
export async function parseXLSX(
  filePath: string,
  options: {
    schema?: z.ZodType;
    sheetNames?: string[];
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  try {
    // Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const allRecords: Record<string, any>[] = [];
    // Determine which sheets to process
    let sheetsToProcess: string[] = [];
    if (options.sheetNames && options.sheetNames.length > 0) {
      sheetsToProcess = options.sheetNames;
    } else {
      // Use all sheets
      workbook.eachSheet((sheet) => {
        sheetsToProcess.push(sheet.name);
      });
    }
    // Process each sheet
    for (const sheetName of sheetsToProcess) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        console.warn(`Sheet not found: ${sheetName}`);
        continue;
      }
      // Get headers from the first row
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });
      // Process rows
      worksheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (rowNumber === 1) return;
        const record: Record<string, any> = {};
        // Map values to headers
        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length) {
            const header = headers[colNumber - 1];
            let value = cell.value;
            // Handle different cell types
            if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
              value = cell.value.toISOString().split('T')[0];
            } else if (typeof value === 'object' && value !== null) {
              // Handle formula cells
              if ('result' in value) {
                value = value.result;
              } else if ('text' in value) {
                value = value.text;
              } else if ('richText' in value && Array.isArray(value.richText)) {
                value = value.richText.map((rt: { text: string }) => rt.text).join('');
              }
            }
            record[header] = value;
          }
        });
        allRecords.push(record);
      });
    }
    // Validate with schema if provided
    let records = allRecords;
    if (options.schema) {
      const arraySchema = z.array(options.schema);
      records = arraySchema.parse(allRecords);
    }
    info(
      {
        event: 'parsed_excel_records',
        file: path.basename(filePath),
        recordsCount: records.length,
        timestamp: new Date().toISOString(),
      },
      'Parsed Excel records'
    );
    const metadata: ParserResult['metadata'] = {
      fileType: FileType.XLSX,
      fileName: path.basename(filePath),
      parseDate: new Date().toISOString(),
      sheets: sheetsToProcess,
      ...(options.vendor ? { vendor: options.vendor } : {}),
      ...(options.reportType ? { reportType: options.reportType } : {}),
    };
    return {
      id: uuidv4(),
      records,
      recordCount: records.length,
      metadata,
    };
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;
    error(
      {
        event: 'error_parsing_excel',
        file: filePath,
        errorMessage,
        stack,
        timestamp: new Date().toISOString(),
      },
      'Error parsing Excel file'
    );
    throw error;
  }
}
/**
 * Parse a PDF file
 * @param filePath - Path to the PDF file
 * @param options - Optional parsing options
 * @returns Parsed data with metadata
 */
export async function parsePDF(
  filePath: string,
  options: {
    schema?: z.ZodType;
    vendor?: string;
    reportType?: string;
  } = {}
): Promise<ParserResult> {
  try {
    // Read file content
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    // Extract text content
    const text = pdfData.text;
    info(
      {
        event: 'extracted_pdf_text',
        file: path.basename(filePath),
        charCount: text.length,
        timestamp: new Date().toISOString(),
      },
      'Extracted PDF text'
    );
    // Extract tabular data (simplified implementation)
    const rawRecords = extractTabularDataFromPDF(text);
    // Validate with schema if provided
    let records = rawRecords;
    if (options.schema) {
      const arraySchema = z.array(options.schema);
      records = arraySchema.parse(rawRecords);
    }
    info(
      {
        event: 'parsed_pdf_records',
        source: 'pdfContent',
        recordsCount: records.length,
        timestamp: new Date().toISOString(),
      },
      'Parsed PDF records'
    );
    const metadata: ParserResult['metadata'] = {
      fileType: FileType.PDF,
      fileName: path.basename(filePath),
      parseDate: new Date().toISOString(),
      pageCount: pdfData.numpages,
      ...(options.vendor ? { vendor: options.vendor } : {}),
      ...(options.reportType ? { reportType: options.reportType } : {}),
    };
    return {
      id: uuidv4(),
      records,
      recordCount: records.length,
      metadata,
    };
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;
    error(
      {
        event: 'error_parsing_pdf',
        file: filePath,
        errorMessage,
        stack,
        timestamp: new Date().toISOString(),
      },
      'Error parsing PDF file'
    );
    throw error;
  }
}
/**
 * Extract tabular data from PDF text content
 * This is a simplified approach - real-world PDF parsing is more complex
 */
function extractTabularDataFromPDF(text: string): Record<string, any>[] {
  try {
    // Split text into lines
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    // Try to identify header row (this is a simple heuristic)
    let headerLine = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      // Check if line has multiple words with capital letters
      const words = lines[i].split(/\s+/);
      if (words.length >= 3 && words.filter((w) => /^[A-Z]/.test(w)).length >= 3) {
        headerLine = i;
        break;
      }
    }
    if (headerLine === -1) {
      console.warn('Could not identify header row in PDF. Using first line as header.');
      headerLine = 0;
    }
    // Extract headers
    const headers = lines[headerLine]
      .split(/\s{2,}/)
      .map((h) => h.trim())
      .filter((h) => h.length > 0);
    // Extract data rows
    const records: Record<string, any>[] = [];
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines that are too short
      if (line.length < 10) continue;
      // Try to extract values
      const values = line
        .split(/\s{2,}/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      // Only process lines that might be data rows
      if (values.length >= 3) {
        const record: Record<string, any> = {};
        // Map values to headers
        for (let j = 0; j < Math.min(headers.length, values.length); j++) {
          record[headers[j]] = values[j];
        }
        // Only add if we have enough data
        if (Object.keys(record).length >= 3) {
          records.push(record);
        }
      }
    }
    info(
      {
        event: 'parsed_pdf_records',
        source: 'pdfContent',
        recordsCount: records.length,
        timestamp: new Date().toISOString(),
      },
      'Parsed PDF records'
    );
    return records;
  } catch (error) {
    // Use type-safe error handling
    const errorMessage = getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;
    error(
      {
        event: 'error_extracting_pdf_table',
        errorMessage,
        stack,
        timestamp: new Date().toISOString(),
      },
      'Error extracting tabular data from PDF'
    );
    return [];
  }
}
/**
 * Detect file type from file path
 * @param filePath - Path to the file
 * @returns File type
 */
export function detectFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase().substring(1);
  switch (ext) {
    case 'csv':
      return FileType.CSV;
    case 'xlsx':
      return FileType.XLSX;
    case 'xls':
      return FileType.XLS;
    case 'pdf':
      return FileType.PDF;
    default:
      return FileType.UNKNOWN;
  }
}
/**
 * Parse a file based on its extension
 * @param filePath - Path to the file
 * @param options - Optional parsing options
 * @returns Parsed data with metadata
 */
export async function parseByExtension(
  filePath: string,
  options: {
    schema?: z.ZodType;
    vendor?: string;
    reportType?: string;
    sheetNames?: string[];
  } = {}
): Promise<ParserResult> {
  const fileType = detectFileType(filePath);
  switch (fileType) {
    case FileType.CSV:
      return parseCSV(filePath, options);
    case FileType.XLSX:
    case FileType.XLS:
      return parseXLSX(filePath, options);
    case FileType.PDF:
      return parsePDF(filePath, options);
    default:
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
  }
}
export default {
  parseCSV,
  parseXLSX,
  parsePDF,
  parseByExtension,
  detectFileType,
};
