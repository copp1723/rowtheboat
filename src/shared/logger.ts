/**
 * Logger Module
 *
 * This module provides centralized logging functionality for the application.
 * It supports different log levels and can log to both console and files.
 */
import * as fs from 'fs';
import * as path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const generalLogPath = path.join(logsDir, 'general.log');
const insightRunsLogPath = path.join(logsDir, 'insight_runs.log');

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Write to log file with timestamp
 * @param filePath - Path to the log file
 * @param level - Log level
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
function writeToLogFile(filePath: string, level: LogLevel, message: string, meta?: any): void {
  try {
    const timestamp = new Date().toISOString();
    const metaString = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const logEntry = `[${timestamp}] [${level}] ${message}${metaString}\n`;
    fs.appendFileSync(filePath, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string | Error, meta?: object): void;
  debug(message: string, meta?: object): void;
  fatal(message: string, meta?: object): void;
}

/**
 * Debug level logging
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
export function debug(message: string, meta?: any): void {
  console.debug(`[DEBUG] ${message}`);
  writeToLogFile(generalLogPath, LogLevel.DEBUG, message, meta);
}

/**
 * Info level logging
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
export function info(message: string, meta?: any): void {
  console.info(`[INFO] ${message}`);
  writeToLogFile(generalLogPath, LogLevel.INFO, message, meta);
}

/**
 * Warning level logging
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
export function warn(message: string, meta?: any): void {
  console.warn(`[WARN] ${message}`);
  writeToLogFile(generalLogPath, LogLevel.WARN, message, meta);
}

/**
 * Error level logging
 * @param message - Message to log or Error object
 * @param meta - Optional metadata to include
 */
export function error(message: string | Error, meta?: any): void {
  const errorMessage = typeof message === 'string' ? message : message.message;
  console.error(`[ERROR] ${errorMessage}`);

  const errorMeta = meta || {};
  if (typeof message !== 'string' && message.stack) {
    errorMeta.stack = message.stack;
  }

  writeToLogFile(generalLogPath, LogLevel.ERROR, errorMessage, errorMeta);
}

/**
 * Fatal level logging
 * @param message - Message to log
 * @param meta - Optional metadata to include
 */
export function fatal(message: string, meta?: object): void {
  console.error(`[FATAL] ${message}`);
  writeToLogFile(generalLogPath, LogLevel.ERROR, message, meta);
}

/**
 * General purpose logger for application events
 * @deprecated Use individual functions (debug, info, warn, error, fatal) instead
 */
export const logger: Logger = {
  debug,
  info,
  warn,
  error,
  fatal
};
/**
 * Specialized logger for insight generation runs
 */
export interface InsightRunLogData {
  platform: string;
  inputFile?: string;
  promptIntent: string;
  promptVersion: string;
  durationMs: number;
  outputSummary: string[];
  error?: string;
  timestamp?: string;
}
/**
 * Log insight generation run details
 * @param data - Insight run log data
 */
export function logInsightRun(data: InsightRunLogData): void {
  // Add timestamp if not provided
  const logData = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  };
  // Log to console
  console.info(
    `[INSIGHT RUN] Platform: ${logData.platform!}, Intent: ${logData.promptIntent}, Version: ${logData.promptVersion}`
  );
  console.info(
    `[INSIGHT RUN] Duration: ${logData.durationMs}ms, File: ${logData.inputFile || 'direct content'}`
  );
  if (logData.error) {
    console.error(`[INSIGHT RUN] Error: ${logData.error}`);
  } else {
    console.info(`[INSIGHT RUN] Generated ${logData.outputSummary.length} insights`);
  }
  // Write to insight runs log file
  writeToLogFile(insightRunsLogPath, LogLevel.INFO, 'Insight Generation Run', logData);
}
/**
 * Get task logs from DB (placeholder for DB integration)
 * @param taskId - Task ID to retrieve logs for
 * @returns Array of log entries
 */
export async function getTaskLogs(taskId: string): Promise<string[]> {
  // This is a placeholder. In a real implementation, this would
  // fetch logs from a database or other persistent storage.
  return [`Task ${taskId} logs would be retrieved from DB`];
}
