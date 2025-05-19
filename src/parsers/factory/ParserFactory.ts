/**
 * Parser Factory
 *
 * Factory class for creating parser instances.
 * Provides a central registry for parser implementations and methods to create parsers.
 */

import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createReadStream } from 'fs';

import { FileType } from '../base/types';
import { IParser } from '../base/IParser';
import { UnsupportedFileTypeError, DuplicateFileError } from '../errors/ParserError';
import { debug, info, warn, error } from '../../shared/logger';
import { recordDuplicate } from '../utils/monitoring';

// Import database connection for deduplication
// This will need to be created or imported
import { db } from '../../db/index';

/**
 * Factory for creating parser instances
 */
export class ParserFactory {
  /**
   * Registry of parser classes by file type
   */
  private static parsers: Map<FileType, new () => IParser> = new Map();

  /**
   * Register a parser class for a file type
   *
   * @param fileType - File type to register the parser for
   * @param parserClass - Parser class constructor
   */
  public static registerParser(fileType: FileType, parserClass: new () => IParser): void {
    ParserFactory.parsers.set(fileType, parserClass);
  }

  /**
   * Create a parser instance for a specific file type
   *
   * @param fileType - File type to create a parser for
   * @returns Parser instance
   * @throws UnsupportedFileTypeError if no parser is registered for the file type
   */
  public static createParser(fileType: FileType): IParser {
    const ParserClass = ParserFactory.parsers.get(fileType);
    if (!ParserClass) {
      throw new UnsupportedFileTypeError(fileType.toString(), {
        registeredTypes: Array.from(ParserFactory.parsers.keys()),
      });
    }
    return new ParserClass();
  }

  /**
   * Create a parser instance for a file based on its extension
   *
   * @param filePath - Path to the file
   * @returns Parser instance
   * @throws UnsupportedFileTypeError if no parser is registered for the file type
   */
  public static createParserForFile(filePath: string): IParser {
    const fileType = ParserFactory.detectFileType(filePath);
    return ParserFactory.createParser(fileType);
  }

  /**
   * Create a parser instance for a file based on its extension, with deduplication check
   *
   * @param filePath - Path to the file
   * @param options - Options for deduplication
   * @returns Parser instance
   * @throws UnsupportedFileTypeError if no parser is registered for the file type
   * @throws DuplicateFileError if the file is a duplicate
   */
  public static async createParserForFileWithDeduplication(
    filePath: string,
    options: {
      checkDuplicates?: boolean,
      metadata?: Record<string, any>
    } = {}
  ): Promise<IParser> {
    // Check for duplicates if enabled
    if (options.checkDuplicates) {
      const fileHash = await ParserFactory.calculateFileHash(filePath);
      const fileType = ParserFactory.detectFileType(filePath);
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      const isDuplicate = await ParserFactory.checkForDuplicate(fileHash, options.metadata || {});

      if (isDuplicate) {
        // Record duplicate detection in monitoring
        recordDuplicate(fileType, fileName, fileStats.size, fileHash);

        throw new DuplicateFileError(fileHash, {
          filePath,
          fileType,
          fileName,
          fileSize: fileStats.size,
          ...options.metadata
        });
      }

      // Store the hash for future deduplication
      await ParserFactory.storeFileHash(fileHash, options.metadata || {});
    }

    // Create the parser
    return ParserFactory.createParserForFile(filePath);
  }

  /**
   * Get all registered file types
   *
   * @returns Array of registered file types
   */
  public static getRegisteredFileTypes(): FileType[] {
    return Array.from(ParserFactory.parsers.keys());
  }

  /**
   * Check if a parser is registered for a file type
   *
   * @param fileType - File type to check
   * @returns True if a parser is registered for the file type
   */
  public static hasParserForType(fileType: FileType): boolean {
    return ParserFactory.parsers.has(fileType);
  }

  /**
   * Detect the type of a file based on its extension
   *
   * @param filePath - Path to the file
   * @returns Detected file type
   */
  public static detectFileType(filePath: string): FileType {
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
   * Calculate SHA-256 hash of a file
   *
   * @param filePath - Path to the file
   * @returns SHA-256 hash of the file
   */
  public static calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if a file hash exists in the database
   *
   * @param fileHash - SHA-256 hash of the file
   * @param metadata - Additional metadata
   * @returns True if the file hash exists
   */
  public static async checkForDuplicate(fileHash: string, metadata: Record<string, any> = {}): Promise<boolean> {
    try {
      // Query the database for the hash
      const result = await db.query(
        'SELECT * FROM attachment_hashes WHERE hash = $1 AND expires_at > NOW()',
        [fileHash]
      );

      // If we found a matching hash, it's a duplicate
      return result.rows.length > 0;
    } catch (error) {
      error('Error checking for duplicate file', { fileHash, error });
      return false;
    }
  }

  /**
   * Store a file hash in the database
   *
   * @param fileHash - SHA-256 hash of the file
   * @param metadata - Additional metadata
   */
  public static async storeFileHash(fileHash: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      // Calculate expiration date (60 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      // Store the hash in the database
      await db.query(
        'INSERT INTO attachment_hashes (hash, metadata, created_at, expires_at) VALUES ($1, $2, $3, $4)',
        [fileHash, JSON.stringify(metadata), new Date(), expiresAt]
      );

      info('Stored file hash', { fileHash, metadata, expiresAt });
    } catch (error) {
      error('Error storing file hash', { fileHash, error });
    }
  }
}
