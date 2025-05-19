/**
 * Base Parser
 *
 * Abstract base class for all file parsers.
 * Provides common functionality and defines the structure for specific parser implementations.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { performance } from 'perf_hooks';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

import { FileType, ParserOptions, ParserResult } from './types';
import { IParser } from './IParser';
import {
  FileNotFoundError,
  UnsupportedFileTypeError,
  ValidationError,
  ParseError
} from '../errors/ParserError';

// Import logger and monitoring utilities
import { debug, info, warn, error } from '../../shared/logger';
import { getErrorMessage } from '../../utils/errorUtils';
import {
  recordParseStart,
  recordParseComplete,
  recordDuplicate
} from '../utils/monitoring';

/**
 * Abstract base class for all parsers
 */
export abstract class BaseParser implements IParser {
  /**
   * File types supported by this parser
   */
  protected supportedFileTypes: FileType[] = [];

  /**
   * Constructor for the base parser
   *
   * @param fileTypes - Array of file types supported by this parser
   */
  constructor(fileTypes: FileType[]) {
    this.supportedFileTypes = fileTypes;
  }

  /**
   * Parse a file from a file path
   *
   * @param filePath - Path to the file to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseFile(filePath: string, options: ParserOptions = {}): Promise<ParserResult> {
    // Get file stats for monitoring
    const fileStats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileType = this.detectFileType(filePath);

    // Start monitoring
    const { id, startTime } = recordParseStart(fileType, fileName, fileStats.size);

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }

      // Check if this parser supports the file type
      if (!this.canParse(fileType)) {
        throw new UnsupportedFileTypeError(fileType.toString(), {
          supportedTypes: this.getSupportedFileTypes()
        });
      }

      // For streaming parsers, we'll use createReadStream
      // For non-streaming parsers, we'll use readFileContent

      // Create a read stream for the file
      const fileStream = createReadStream(filePath);

      // Parse content with file metadata
      const result = await this.parseStream(fileStream, {
        ...options,
        _filePath: filePath,
        _fileName: fileName,
        _fileType: fileType,
      });

      // Record successful parse
      recordParseComplete(
        id,
        startTime,
        fileType,
        fileName,
        fileStats.size,
        true,
        result.recordCount
      );

      return result;
    } catch (error) {
      // Record failed parse
      recordParseComplete(
        id,
        startTime,
        fileType,
        fileName,
        fileStats.size,
        false,
        0,
        getErrorMessage(error)
      );

      // Return error result
      return {
        id: uuidv4(),
        records: [],
        recordCount: 0,
        success: false,
        metadata: {
          fileType: fileType,
          fileName: fileName,
          parseDate: new Date().toISOString(),
          error: getErrorMessage(error),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Parse content directly
   * This method must be implemented by subclasses
   *
   * @param content - Content to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public abstract parseContent(content: string | Buffer, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Parse a stream
   * This method can be overridden by subclasses for streaming support
   *
   * @param stream - Stream to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseStream(stream: Readable, options: ParserOptions = {}): Promise<ParserResult> {
    // Default implementation collects the stream into a buffer and calls parseContent
    return new Promise<ParserResult>((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await this.parseContent(buffer, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', (error) => {
        reject(new ParseError(`Error reading stream: ${getErrorMessage(error)}`, {
          originalError: error
        }));
      });
    });
  }

  /**
   * Check if this parser can handle the given file type
   *
   * @param fileType - Type of file to check
   * @returns True if this parser can handle the file type
   */
  public canParse(fileType: FileType): boolean {
    return this.supportedFileTypes.includes(fileType);
  }

  /**
   * Get the file types supported by this parser
   *
   * @returns Array of supported file types
   */
  public getSupportedFileTypes(): FileType[] {
    return [...this.supportedFileTypes];
  }

  /**
   * Detect the type of a file based on its extension
   *
   * @param filePath - Path to the file
   * @returns Detected file type
   */
  protected detectFileType(filePath: string): FileType {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');

    switch (extension) {
      case 'csv':
        return FileType.CSV;
      case 'xlsx':
        return FileType.XLSX;
      case 'xls':
        return FileType.XLS;
      case 'pdf':
        return FileType.PDF;
      case 'json':
        return FileType.JSON;
      default:
        return FileType.UNKNOWN;
    }
  }

  /**
   * Apply schema validation to parsed records
   *
   * @param records - Records to validate
   * @param schema - Zod schema to apply
   * @returns Validated records
   * @throws ValidationError if validation fails
   */
  protected validateWithSchema(records: Record<string, any>[], schema?: z.ZodType): Record<string, any>[] {
    if (!schema) {
      return records;
    }

    try {
      const arraySchema = z.array(schema);
      return arraySchema.parse(records);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Schema validation failed', {
          zodErrors: error.errors,
          recordCount: records.length,
        });
      }
      throw error;
    }
  }

  /**
   * Create a standard parser result
   *
   * @param records - Parsed records
   * @param options - Parser options
   * @returns Standard parser result
   */
  protected createResult(
    records: Record<string, any>[],
    options: ParserOptions & {
      _filePath?: string;
      _fileName?: string;
      _fileType?: FileType;
      _metadata?: Record<string, any>;
    } = {}
  ): ParserResult {
    const fileType = options._fileType || FileType.UNKNOWN;
    const fileName = options._fileName || 'unknown';

    const metadata: ParserResult['metadata'] = {
      fileType,
      fileName,
      parseDate: new Date().toISOString(),
      ...(options.vendor ? { vendor: options.vendor } : {}),
      ...(options.reportType ? { reportType: options.reportType } : {}),
      ...(options._metadata || {}),
    };

    return {
      id: uuidv4(),
      records,
      recordCount: records.length,
      success: true,
      metadata,
    };
  }
}
