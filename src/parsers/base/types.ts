/**
 * Parser Types
 * 
 * Defines the common types and interfaces for all file parsers in the system.
 * This provides a unified way to parse different file types with consistent
 * options and return types.
 */

import { z } from 'zod';

/**
 * Supported file types for parsing
 */
export enum FileType {
  CSV = 'csv',
  XLSX = 'xlsx',
  XLS = 'xls',
  PDF = 'pdf',
  JSON = 'json',
  UNKNOWN = 'unknown',
}

/**
 * Common options for all parsers
 */
export interface ParserOptions {
  /** Optional Zod schema for validation */
  schema?: z.ZodType;
  
  /** Vendor name for the data source */
  vendor?: string;
  
  /** Report type identifier */
  reportType?: string;
  
  /** Whether to trim whitespace from values (default: true) */
  trim?: boolean;
  
  /** Whether to skip empty lines (default: true) */
  skipEmptyLines?: boolean;
  
  /** Whether to include empty cells (default: false) */
  includeEmptyCells?: boolean;
  
  /** Internal file path (used internally) */
  _filePath?: string;
  
  /** Internal file name (used internally) */
  _fileName?: string;
  
  /** Internal file type (used internally) */
  _fileType?: FileType;
  
  /** Additional options specific to parser implementations */
  [key: string]: any;
}

/**
 * Result of parsing a file
 */
export interface ParserResult {
  /** Unique identifier for the parsing result */
  id: string;
  
  /** Array of parsed records */
  records: Record<string, any>[];
  
  /** Number of records parsed */
  recordCount: number;
  
  /** Whether parsing was successful */
  success: boolean;
  
  /** Metadata about the parsing operation */
  metadata: {
    /** Type of file that was parsed */
    fileType: FileType;
    
    /** Name of the file that was parsed */
    fileName: string;
    
    /** Timestamp when the file was parsed */
    parseDate: string;
    
    /** Vendor name for the data source */
    vendor?: string;
    
    /** Report type identifier */
    reportType?: string;
    
    /** Error message if parsing failed */
    error?: string;
    
    /** Type of error if parsing failed */
    errorType?: string;
    
    /** Additional metadata specific to parser implementations */
    [key: string]: any;
  };
  
  /** Error message if parsing failed */
  error?: string;
}
