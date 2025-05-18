/**
 * File Utilities
 * 
 * Utility functions for working with files in the parser system.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';
import os from 'os';

/**
 * Calculate SHA-256 hash of a file
 * 
 * @param filePath - Path to the file
 * @returns SHA-256 hash of the file
 */
export function calculateFileHash(filePath: string): Promise<string> {
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
 * Create a temporary file
 * 
 * @param prefix - Prefix for the temporary file name
 * @param suffix - Suffix for the temporary file name
 * @returns Path to the temporary file
 */
export function createTempFile(prefix: string = 'parser-', suffix: string = ''): string {
  const tempDir = os.tmpdir();
  const tempFileName = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 10)}${suffix}`;
  return path.join(tempDir, tempFileName);
}

/**
 * Stream a file to a temporary location
 * 
 * @param sourceStream - Source stream
 * @param options - Options for the temporary file
 * @returns Path to the temporary file
 */
export async function streamToTempFile(
  sourceStream: Readable,
  options: {
    prefix?: string;
    suffix?: string;
  } = {}
): Promise<string> {
  const tempFilePath = createTempFile(options.prefix, options.suffix);
  const writeStream = fs.createWriteStream(tempFilePath);
  
  try {
    await pipeline(sourceStream, writeStream);
    return tempFilePath;
  } catch (error) {
    // Clean up the temp file if there was an error
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

/**
 * Get MIME type from file extension
 * 
 * @param filePath - Path to the file
 * @returns MIME type
 */
export function getMimeTypeFromExtension(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase().replace('.', '');
  
  switch (extension) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
    case 'xls':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get file extension from MIME type
 * 
 * @param mimeType - MIME type
 * @returns File extension (with dot)
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'text/csv':
      return '.csv';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return '.xlsx';
    case 'application/pdf':
      return '.pdf';
    case 'application/json':
      return '.json';
    case 'text/plain':
      return '.txt';
    default:
      return '';
  }
}

/**
 * Clean up temporary files
 * 
 * @param filePaths - Paths to the temporary files
 */
export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
