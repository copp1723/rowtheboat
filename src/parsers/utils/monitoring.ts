/**
 * Parser Monitoring Utilities
 * 
 * Provides monitoring and metrics collection for parser operations.
 */

import { performance } from 'perf_hooks';
import { FileType } from '../base/types.js';
import logger from '../../utils/logger.js';

// Metrics storage
interface ParserMetrics {
  totalParsed: number;
  totalSuccess: number;
  totalFailure: number;
  totalDuplicates: number;
  totalBytes: number;
  totalDuration: number;
  byFileType: Record<FileType, {
    count: number;
    success: number;
    failure: number;
    bytes: number;
    duration: number;
  }>;
  recentParses: Array<{
    fileType: FileType;
    fileName: string;
    timestamp: number;
    duration: number;
    success: boolean;
    bytes: number;
    recordCount: number;
  }>;
}

// Initialize metrics
const metrics: ParserMetrics = {
  totalParsed: 0,
  totalSuccess: 0,
  totalFailure: 0,
  totalDuplicates: 0,
  totalBytes: 0,
  totalDuration: 0,
  byFileType: {
    [FileType.CSV]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
    [FileType.XLSX]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
    [FileType.XLS]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
    [FileType.PDF]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
    [FileType.JSON]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
    [FileType.UNKNOWN]: { count: 0, success: 0, failure: 0, bytes: 0, duration: 0 },
  },
  recentParses: [],
};

// Maximum number of recent parses to keep
const MAX_RECENT_PARSES = 100;

/**
 * Record the start of a parse operation
 * 
 * @param fileType - Type of file being parsed
 * @param fileName - Name of the file being parsed
 * @param fileSize - Size of the file in bytes
 * @returns Parse operation ID and start time
 */
export function recordParseStart(
  fileType: FileType,
  fileName: string,
  fileSize: number
): { id: string, startTime: number } {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const startTime = performance.now();
  
  // Log parse start
  logger.debug({
    event: 'parser_start',
    id,
    fileType,
    fileName,
    fileSize,
    timestamp: new Date().toISOString(),
  });
  
  return { id, startTime };
}

/**
 * Record the completion of a parse operation
 * 
 * @param id - Parse operation ID
 * @param startTime - Start time of the parse operation
 * @param fileType - Type of file being parsed
 * @param fileName - Name of the file being parsed
 * @param fileSize - Size of the file in bytes
 * @param success - Whether the parse was successful
 * @param recordCount - Number of records parsed
 * @param error - Error message if parse failed
 */
export function recordParseComplete(
  id: string,
  startTime: number,
  fileType: FileType,
  fileName: string,
  fileSize: number,
  success: boolean,
  recordCount: number,
  error?: string
): void {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Update metrics
  metrics.totalParsed++;
  metrics.totalBytes += fileSize;
  metrics.totalDuration += duration;
  
  if (success) {
    metrics.totalSuccess++;
  } else {
    metrics.totalFailure++;
  }
  
  // Update file type metrics
  const fileTypeMetrics = metrics.byFileType[fileType] || metrics.byFileType[FileType.UNKNOWN];
  fileTypeMetrics.count++;
  fileTypeMetrics.bytes += fileSize;
  fileTypeMetrics.duration += duration;
  
  if (success) {
    fileTypeMetrics.success++;
  } else {
    fileTypeMetrics.failure++;
  }
  
  // Add to recent parses
  metrics.recentParses.unshift({
    fileType,
    fileName,
    timestamp: Date.now(),
    duration,
    success,
    bytes: fileSize,
    recordCount,
  });
  
  // Trim recent parses if needed
  if (metrics.recentParses.length > MAX_RECENT_PARSES) {
    metrics.recentParses.length = MAX_RECENT_PARSES;
  }
  
  // Log parse completion
  logger.info({
    event: success ? 'parser_success' : 'parser_failure',
    id,
    fileType,
    fileName,
    fileSize,
    duration: `${duration.toFixed(2)}ms`,
    recordCount,
    timestamp: new Date().toISOString(),
    ...(error ? { error } : {}),
  });
  
  // Log memory usage
  const memoryUsage = process.memoryUsage();
  logger.debug({
    event: 'parser_memory_usage',
    id,
    fileType,
    fileName,
    rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Record a duplicate file detection
 * 
 * @param fileType - Type of file
 * @param fileName - Name of the file
 * @param fileSize - Size of the file in bytes
 * @param fileHash - Hash of the file
 */
export function recordDuplicate(
  fileType: FileType,
  fileName: string,
  fileSize: number,
  fileHash: string
): void {
  metrics.totalDuplicates++;
  
  logger.info({
    event: 'parser_duplicate',
    fileType,
    fileName,
    fileSize,
    fileHash,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current parser metrics
 * 
 * @returns Current parser metrics
 */
export function getParserMetrics(): ParserMetrics {
  return { ...metrics };
}

/**
 * Reset parser metrics
 */
export function resetParserMetrics(): void {
  metrics.totalParsed = 0;
  metrics.totalSuccess = 0;
  metrics.totalFailure = 0;
  metrics.totalDuplicates = 0;
  metrics.totalBytes = 0;
  metrics.totalDuration = 0;
  
  Object.values(metrics.byFileType).forEach(typeMetrics => {
    typeMetrics.count = 0;
    typeMetrics.success = 0;
    typeMetrics.failure = 0;
    typeMetrics.bytes = 0;
    typeMetrics.duration = 0;
  });
  
  metrics.recentParses = [];
}

export default {
  recordParseStart,
  recordParseComplete,
  recordDuplicate,
  getParserMetrics,
  resetParserMetrics,
};
