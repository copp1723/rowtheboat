/**
 * CSV Parser
 * 
 * Implementation of the parser interface for CSV files.
 * Uses streaming for memory-efficient parsing of large files.
 */

import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { parse as csvParse } from 'csv-parse';
import { v4 as uuidv4 } from 'uuid';

import { BaseParser } from '../base/BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../base/types.js';
import { ParseError } from '../errors/ParserError.js';
import logger from '../../utils/logger.js';
import { getErrorMessage } from '../../utils/errorUtils.js';

/**
 * CSV parser options
 */
export interface CSVParserOptions extends ParserOptions {
  /** CSV delimiter (default: ',') */
  delimiter?: string;
  
  /** Whether to use the first row as column headers (default: true) */
  columns?: boolean | string[];
  
  /** Number of rows to skip at the beginning (default: 0) */
  skipRows?: number;
  
  /** Maximum number of rows to parse (default: unlimited) */
  maxRows?: number;
  
  /** Comment character (default: none) */
  comment?: string;
  
  /** Quote character (default: '"') */
  quote?: string;
  
  /** Escape character (default: '"') */
  escape?: string;
}

/**
 * CSV parser implementation
 */
export class CSVParser extends BaseParser {
  /**
   * Constructor
   */
  constructor() {
    super([FileType.CSV]);
  }
  
  /**
   * Parse CSV content
   * 
   * @param content - CSV content as string or Buffer
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: CSVParserOptions = {}): Promise<ParserResult> {
    try {
      // Convert Buffer to string if needed
      const csvContent = Buffer.isBuffer(content) ? content.toString('utf8') : content;
      
      // Configure CSV parser options
      const csvOptions = this.configureCsvOptions(options);
      
      // Parse the CSV content
      const rawRecords = csvParse(csvContent, csvOptions);
      
      // Validate with schema if provided
      const records = this.validateWithSchema(rawRecords, options.schema);
      
      // Log successful parsing
      logger.info({
        event: 'parsed_csv_records',
        file: options._fileName || 'unknown',
        recordCount: records.length,
        timestamp: new Date().toISOString(),
      }, 'Parsed CSV records');
      
      // Create and return the result
      return this.createResult(records, {
        ...options,
        _metadata: {
          delimiter: options.delimiter || ',',
          headerRow: options.columns !== false,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'csv_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'CSVParser',
      });
      
      // Throw a ParseError
      throw new ParseError(`Failed to parse CSV: ${getErrorMessage(error)}`, {
        originalError: error,
        fileName: options._fileName,
      });
    }
  }
  
  /**
   * Parse a CSV stream
   * 
   * @param stream - Stream to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseStream(stream: Readable, options: CSVParserOptions = {}): Promise<ParserResult> {
    return new Promise<ParserResult>((resolve, reject) => {
      try {
        // Configure CSV parser options
        const csvOptions = this.configureCsvOptions(options);
        
        // Create CSV parser
        const parser = csvParse(csvOptions);
        
        // Records array
        const records: Record<string, any>[] = [];
        
        // Set up event handlers
        parser.on('readable', () => {
          let record;
          while ((record = parser.read()) !== null) {
            records.push(record);
            
            // Check if we've reached the maximum number of rows
            if (options.maxRows && records.length >= options.maxRows) {
              parser.end();
              break;
            }
          }
        });
        
        parser.on('error', (error) => {
          reject(new ParseError(`Failed to parse CSV stream: ${getErrorMessage(error)}`, {
            originalError: error,
            fileName: options._fileName,
          }));
        });
        
        parser.on('end', () => {
          try {
            // Validate with schema if provided
            const validatedRecords = this.validateWithSchema(records, options.schema);
            
            // Log successful parsing
            logger.info({
              event: 'parsed_csv_stream',
              file: options._fileName || 'unknown',
              recordCount: validatedRecords.length,
              timestamp: new Date().toISOString(),
            }, 'Parsed CSV stream');
            
            // Create and return the result
            resolve(this.createResult(validatedRecords, {
              ...options,
              _metadata: {
                delimiter: options.delimiter || ',',
                headerRow: options.columns !== false,
                streaming: true,
              },
            }));
          } catch (error) {
            reject(error);
          }
        });
        
        // Pipe the stream to the parser
        stream.pipe(parser);
      } catch (error) {
        reject(new ParseError(`Failed to set up CSV stream parsing: ${getErrorMessage(error)}`, {
          originalError: error,
          fileName: options._fileName,
        }));
      }
    });
  }
  
  /**
   * Configure CSV parser options
   * 
   * @param options - Parser options
   * @returns CSV parser options
   */
  private configureCsvOptions(options: CSVParserOptions): any {
    return {
      // Use headers by default
      columns: options.columns !== false,
      
      // Skip empty lines by default
      skip_empty_lines: options.skipEmptyLines !== false,
      
      // Trim whitespace by default
      trim: options.trim !== false,
      
      // Use custom delimiter if provided
      delimiter: options.delimiter || ',',
      
      // Skip rows if specified
      from_line: options.skipRows ? options.skipRows + 1 : 1,
      
      // Comment character if specified
      comment: options.comment,
      
      // Quote character if specified
      quote: options.quote || '"',
      
      // Escape character if specified
      escape: options.escape || '"',
    };
  }
}
