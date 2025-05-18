/**
 * PDF Extraction Adapter
 * 
 * A TypeScript adapter for PDF extraction using pdf-parse library.
 * Replaces legacy camelot implementation with standardized extraction methods.
 * Supports both lattice (bordered tables) and stream (whitespace-separated) extraction approaches.
 */

import fs from 'fs';
import pdfParse from 'pdf-parse';
import { isError } from './errorUtils.js';

/**
 * PDF Extraction Mode
 * - lattice: For PDFs with bordered tables (grid lines)
 * - stream: For PDFs with tables separated by whitespace
 */
export enum PDFExtractionMode {
  LATTICE = 'lattice',
  STREAM = 'stream',
  AUTO = 'auto', // Try both methods and select the best result
}

/**
 * PDF Extraction Options
 */
export interface PDFExtractionOptions {
  /** Extraction mode to use */
  mode?: PDFExtractionMode;
  /** Page numbers to extract (1-based, default: all pages) */
  pages?: number[];
  /** Whether to trim whitespace from cell values */
  trim?: boolean;
  /** Minimum confidence score to accept extraction results (0-1) */
  minConfidence?: number;
  /** Custom column headers to use instead of detected ones */
  headers?: string[];
  /** Whether to include page numbers in the output */
  includePageNumbers?: boolean;
}

/**
 * PDF Extraction Result
 */
export interface PDFExtractionResult {
  /** Extracted tables as array of records */
  tables: Record<string, any>[][];
  /** Metadata about the extraction */
  metadata: {
    /** Number of pages in the PDF */
    pageCount: number;
    /** Number of tables extracted */
    tableCount: number;
    /** Extraction mode used */
    extractionMode: PDFExtractionMode;
    /** Confidence score of the extraction (0-1) */
    confidence: number;
    /** Any processing issues encountered */
    processingIssues?: string[];
  };
  /** Raw text content of the PDF */
  text?: string;
  /** Whether the extraction was successful */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}

/**
 * PDF Extraction Error
 */
export class PDFExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFExtractionError';
  }
}

/**
 * Extract tables from a PDF file
 * 
 * @param pdfBuffer - Buffer containing the PDF data
 * @param options - Extraction options
 * @returns Extraction result with tables and metadata
 */
export async function extractTablesFromPDF(
  pdfBuffer: Buffer,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  try {
    // Set default options
    const mode = options.mode || PDFExtractionMode.AUTO;
    const trim = options.trim !== undefined ? options.trim : true;
    const minConfidence = options.minConfidence || 0.7;
    
    // Parse the PDF
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    
    // Initialize result
    const result: PDFExtractionResult = {
      tables: [],
      metadata: {
        pageCount: pdfData.numpages,
        tableCount: 0,
        extractionMode: mode,
        confidence: 0,
        processingIssues: [],
      },
      text: options.includePageNumbers ? text : undefined,
      success: false,
    };
    
    // Extract tables based on mode
    if (mode === PDFExtractionMode.AUTO) {
      // Try lattice first, then stream if lattice doesn't yield good results
      const latticeResult = await extractLatticeMode(text, options);
      
      if (latticeResult.tables.length > 0 && latticeResult.metadata.confidence >= minConfidence) {
        result.tables = latticeResult.tables;
        result.metadata.tableCount = latticeResult.metadata.tableCount;
        result.metadata.confidence = latticeResult.metadata.confidence;
        result.metadata.extractionMode = PDFExtractionMode.LATTICE;
      } else {
        const streamResult = await extractStreamMode(text, options);
        result.tables = streamResult.tables;
        result.metadata.tableCount = streamResult.metadata.tableCount;
        result.metadata.confidence = streamResult.metadata.confidence;
        result.metadata.extractionMode = PDFExtractionMode.STREAM;
      }
    } else if (mode === PDFExtractionMode.LATTICE) {
      const latticeResult = await extractLatticeMode(text, options);
      result.tables = latticeResult.tables;
      result.metadata.tableCount = latticeResult.metadata.tableCount;
      result.metadata.confidence = latticeResult.metadata.confidence;
    } else if (mode === PDFExtractionMode.STREAM) {
      const streamResult = await extractStreamMode(text, options);
      result.tables = streamResult.tables;
      result.metadata.tableCount = streamResult.metadata.tableCount;
      result.metadata.confidence = streamResult.metadata.confidence;
    }
    
    // Check if extraction was successful
    result.success = result.tables.length > 0 && result.metadata.confidence >= minConfidence;
    
    if (!result.success && result.tables.length === 0) {
      result.error = 'No tables found in PDF';
      result.metadata.processingIssues?.push('No tables found in PDF');
    } else if (!result.success) {
      result.error = `Extraction confidence too low: ${result.metadata.confidence.toFixed(2)}`;
      result.metadata.processingIssues?.push(`Extraction confidence too low: ${result.metadata.confidence.toFixed(2)}`);
    }
    
    return result;
  } catch (error) {
    // Handle errors
    const errorMessage = isError(error) ? error.message : String(error);
    return {
      tables: [],
      metadata: {
        pageCount: 0,
        tableCount: 0,
        extractionMode: options.mode || PDFExtractionMode.AUTO,
        confidence: 0,
        processingIssues: [errorMessage],
      },
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extract tables using lattice mode (for bordered tables)
 * 
 * @param text - PDF text content
 * @param options - Extraction options
 * @returns Extraction result
 */
async function extractLatticeMode(
  text: string,
  options: PDFExtractionOptions
): Promise<PDFExtractionResult> {
  // Implementation for lattice mode extraction
  // This detects tables with borders/grid lines
  
  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Find potential table boundaries by looking for horizontal lines
  // In lattice mode, we look for patterns that might indicate table borders
  const tables: Record<string, any>[][] = [];
  let currentTable: string[] = [];
  let inTable = false;
  let tableStartLine = -1;
  
  // Simple heuristic: Look for lines with many separator characters
  // that might indicate table borders (-, +, |, etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const borderChars = line.match(/[-+|=_]+/g);
    const isBorderLine = borderChars && borderChars.join('').length > line.length * 0.5;
    
    if (isBorderLine && !inTable) {
      // Start of a new table
      inTable = true;
      tableStartLine = i;
      currentTable = [];
    } else if (isBorderLine && inTable && currentTable.length > 0) {
      // End of current table
      inTable = false;
      
      // Process the table
      const processedTable = processLatticeTable(currentTable, options);
      if (processedTable.length > 0) {
        tables.push(processedTable);
      }
      
      currentTable = [];
    } else if (inTable) {
      // Add line to current table
      currentTable.push(line);
    }
  }
  
  // Process any remaining table
  if (inTable && currentTable.length > 0) {
    const processedTable = processLatticeTable(currentTable, options);
    if (processedTable.length > 0) {
      tables.push(processedTable);
    }
  }
  
  // Calculate confidence based on table structure
  const confidence = calculateLatticeConfidence(tables);
  
  return {
    tables,
    metadata: {
      pageCount: 1, // This will be overridden by the main function
      tableCount: tables.length,
      extractionMode: PDFExtractionMode.LATTICE,
      confidence,
    },
    success: tables.length > 0 && confidence >= (options.minConfidence || 0.7),
  };
}

/**
 * Process a lattice table (bordered table)
 * 
 * @param tableLines - Lines of text in the table
 * @param options - Extraction options
 * @returns Processed table as array of records
 */
function processLatticeTable(
  tableLines: string[],
  options: PDFExtractionOptions
): Record<string, any>[] {
  if (tableLines.length < 2) return [];
  
  // Try to identify header row
  let headerLine = 0;
  for (let i = 0; i < Math.min(3, tableLines.length); i++) {
    const words = tableLines[i].split(/\s+/);
    if (words.length >= 3 && words.filter(w => /^[A-Z]/.test(w)).length >= 2) {
      headerLine = i;
      break;
    }
  }
  
  // Extract headers
  let headers: string[];
  if (options.headers) {
    headers = options.headers;
  } else {
    headers = tableLines[headerLine]
      .split(/\s{2,}/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  
  if (headers.length < 2) return [];
  
  // Process data rows
  const records: Record<string, any>[] = [];
  
  for (let i = headerLine + 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (line.trim().length === 0) continue;
    
    // Split by multiple spaces (common in PDF tables)
    const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
    
    if (values.length >= Math.max(2, headers.length * 0.5)) {
      const record: Record<string, any> = {};
      
      // Map values to headers
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        record[headers[j]] = options.trim ? values[j].trim() : values[j];
      }
      
      // Add any remaining values to an "extra" field
      if (values.length > headers.length) {
        record['extra'] = values.slice(headers.length).join(' ');
      }
      
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Calculate confidence score for lattice extraction
 * 
 * @param tables - Extracted tables
 * @returns Confidence score (0-1)
 */
function calculateLatticeConfidence(tables: Record<string, any>[][]): number {
  if (tables.length === 0) return 0;
  
  // Calculate average number of fields per record
  let totalFields = 0;
  let totalRecords = 0;
  
  for (const table of tables) {
    for (const record of table) {
      totalFields += Object.keys(record).length;
      totalRecords++;
    }
  }
  
  const avgFields = totalRecords > 0 ? totalFields / totalRecords : 0;
  
  // Calculate consistency of fields across records
  let fieldConsistency = 1;
  if (totalRecords > 1) {
    let fieldVariance = 0;
    for (const table of tables) {
      for (const record of table) {
        const fieldCount = Object.keys(record).length;
        fieldVariance += Math.pow(fieldCount - avgFields, 2);
      }
    }
    const stdDev = Math.sqrt(fieldVariance / totalRecords);
    fieldConsistency = Math.max(0, 1 - (stdDev / avgFields));
  }
  
  // Combine factors for final confidence
  const confidence = (
    (avgFields >= 3 ? 0.7 : avgFields / 3 * 0.7) + // More fields = higher confidence
    (fieldConsistency * 0.3) // Consistent field count = higher confidence
  );
  
  return Math.min(1, Math.max(0, confidence));
}

/**
 * Extract tables using stream mode (for whitespace-separated tables)
 * 
 * @param text - PDF text content
 * @param options - Extraction options
 * @returns Extraction result
 */
async function extractStreamMode(
  text: string,
  options: PDFExtractionOptions
): Promise<PDFExtractionResult> {
  // Implementation for stream mode extraction
  // This detects tables separated by whitespace
  
  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Try to identify tables based on consistent whitespace patterns
  const tables: Record<string, any>[][] = [];
  let currentTableLines: string[] = [];
  let potentialTableStart = -1;
  
  // Look for consistent patterns of whitespace that might indicate columns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // Check if line has multiple words separated by whitespace
    const words = line.split(/\s+/);
    const hasMultipleWords = words.length >= 3;
    
    // Check if line might be a header (contains multiple capitalized words)
    const hasCapsWords = words.filter(w => /^[A-Z]/.test(w)).length >= 2;
    
    if (hasMultipleWords && hasCapsWords && potentialTableStart === -1) {
      // Potential start of a table
      potentialTableStart = i;
      currentTableLines = [line];
    } else if (potentialTableStart !== -1) {
      // Already tracking a potential table
      if (hasMultipleWords) {
        // Continue the table
        currentTableLines.push(line);
      } else if (currentTableLines.length >= 3) {
        // End of table with enough rows
        const processedTable = processStreamTable(currentTableLines, options);
        if (processedTable.length > 0) {
          tables.push(processedTable);
        }
        
        // Reset tracking
        potentialTableStart = -1;
        currentTableLines = [];
      } else {
        // Not enough rows, reset tracking
        potentialTableStart = -1;
        currentTableLines = [];
      }
    }
  }
  
  // Process any remaining table
  if (potentialTableStart !== -1 && currentTableLines.length >= 3) {
    const processedTable = processStreamTable(currentTableLines, options);
    if (processedTable.length > 0) {
      tables.push(processedTable);
    }
  }
  
  // Calculate confidence based on table structure
  const confidence = calculateStreamConfidence(tables);
  
  return {
    tables,
    metadata: {
      pageCount: 1, // This will be overridden by the main function
      tableCount: tables.length,
      extractionMode: PDFExtractionMode.STREAM,
      confidence,
    },
    success: tables.length > 0 && confidence >= (options.minConfidence || 0.7),
  };
}

/**
 * Process a stream table (whitespace-separated table)
 * 
 * @param tableLines - Lines of text in the table
 * @param options - Extraction options
 * @returns Processed table as array of records
 */
function processStreamTable(
  tableLines: string[],
  options: PDFExtractionOptions
): Record<string, any>[] {
  if (tableLines.length < 2) return [];
  
  // Extract headers from the first line
  let headers: string[];
  if (options.headers) {
    headers = options.headers;
  } else {
    // For stream tables, we need to detect column positions based on whitespace
    const headerLine = tableLines[0];
    headers = [];
    
    // Simple approach: split by multiple spaces
    headers = headerLine
      .split(/\s{2,}/)
      .map(h => h.trim())
      .filter(h => h.length > 0);
  }
  
  if (headers.length < 2) return [];
  
  // Process data rows
  const records: Record<string, any>[] = [];
  
  for (let i = 1; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (line.trim().length === 0) continue;
    
    // Split by multiple spaces (common in PDF tables)
    const values = line.split(/\s{2,}/).map(v => v.trim()).filter(v => v.length > 0);
    
    if (values.length >= Math.max(2, headers.length * 0.5)) {
      const record: Record<string, any> = {};
      
      // Map values to headers
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        record[headers[j]] = options.trim ? values[j].trim() : values[j];
      }
      
      // Add any remaining values to an "extra" field
      if (values.length > headers.length) {
        record['extra'] = values.slice(headers.length).join(' ');
      }
      
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Calculate confidence score for stream extraction
 * 
 * @param tables - Extracted tables
 * @returns Confidence score (0-1)
 */
function calculateStreamConfidence(tables: Record<string, any>[][]): number {
  if (tables.length === 0) return 0;
  
  // Similar to lattice confidence calculation
  let totalFields = 0;
  let totalRecords = 0;
  
  for (const table of tables) {
    for (const record of table) {
      totalFields += Object.keys(record).length;
      totalRecords++;
    }
  }
  
  const avgFields = totalRecords > 0 ? totalFields / totalRecords : 0;
  
  // Calculate consistency of fields across records
  let fieldConsistency = 1;
  if (totalRecords > 1) {
    let fieldVariance = 0;
    for (const table of tables) {
      for (const record of table) {
        const fieldCount = Object.keys(record).length;
        fieldVariance += Math.pow(fieldCount - avgFields, 2);
      }
    }
    const stdDev = Math.sqrt(fieldVariance / totalRecords);
    fieldConsistency = Math.max(0, 1 - (stdDev / avgFields));
  }
  
  // Stream mode is typically less reliable than lattice mode
  // so we apply a small penalty to the confidence
  const confidence = (
    (avgFields >= 3 ? 0.6 : avgFields / 3 * 0.6) + // More fields = higher confidence
    (fieldConsistency * 0.3) // Consistent field count = higher confidence
  ) * 0.9; // Apply a small penalty for stream mode
  
  return Math.min(1, Math.max(0, confidence));
}

/**
 * Extract tables from a PDF file
 * 
 * @param filePath - Path to the PDF file
 * @param options - Extraction options
 * @returns Extraction result with tables and metadata
 */
export async function extractTablesFromPDFFile(
  filePath: string,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    return extractTablesFromPDF(pdfBuffer, options);
  } catch (error) {
    // Handle errors
    const errorMessage = isError(error) ? error.message : String(error);
    return {
      tables: [],
      metadata: {
        pageCount: 0,
        tableCount: 0,
        extractionMode: options.mode || PDFExtractionMode.AUTO,
        confidence: 0,
        processingIssues: [errorMessage],
      },
      success: false,
      error: errorMessage,
    };
  }
}
