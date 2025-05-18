/**
 * Parser Interface
 * 
 * Defines the common interface for all file parsers in the system.
 * This provides a unified way to parse different file types with consistent
 * options and return types.
 */

import { FileType, ParserOptions, ParserResult } from './types.js';

/**
 * Interface for all file parsers
 */
export interface IParser {
  /**
   * Parse a file from a file path
   * 
   * @param filePath - Path to the file to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  parseFile(filePath: string, options?: ParserOptions): Promise<ParserResult>;
  
  /**
   * Parse content directly (e.g., string for CSV, Buffer for PDF)
   * 
   * @param content - Content to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  parseContent(content: string | Buffer, options?: ParserOptions): Promise<ParserResult>;
  
  /**
   * Check if this parser can handle the given file type
   * 
   * @param fileType - Type of file to check
   * @returns True if this parser can handle the file type
   */
  canParse(fileType: FileType): boolean;
  
  /**
   * Get the file types supported by this parser
   * 
   * @returns Array of supported file types
   */
  getSupportedFileTypes(): FileType[];
}
