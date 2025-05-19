/**
 * Simplified error handling utilities
 * This module provides a cleaner, more consistent approach to error handling
 */
import { isError, isErrorWithMessage, toErrorWithMessage } from './errorUtils';
import { debug, info, warn, error } from '../shared/logger.js';

/**
 * Get a clean error message from any error type
 * Simplifies the complex nested ternary operators seen throughout the codebase
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  return String(error);
}

/**
 * Get error stack if available
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  
  if (isErrorWithMessage(error) && error.stack) {
    return error.stack;
  }
  
  return undefined;
}

/**
 * Format error for logging with consistent structure
 */
export function formatError(error: unknown): Record<string, any> {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
    name: isError(error) ? error.name : 'UnknownError',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log an error with consistent formatting
 */
export function logFormattedError(
  error: unknown, 
  context: Record<string, any> = {},
  level: 'error' | 'warn' = 'error'
): void {
  const errorData = {
    ...formatError(error),
    ...context,
  };
  
  if (level === 'error') {
    error(`Error: ${errorData.message}`, errorData);
  } else {
    warn(`Warning: ${errorData.message}`, errorData);
  }
}

/**
 * Try-catch wrapper with simplified error handling
 */
export async function tryCatchWithContext<T>(
  fn: () => Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logFormattedError(error, context);
    throw error;
  }
}

/**
 * Execute a function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoffFactor?: number;
    context?: Record<string, any>;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoffFactor = 2,
    context = {},
    shouldRetry = () => true,
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we've reached max retries or if shouldRetry returns false
      if (attempt === retries || !shouldRetry(error)) {
        logFormattedError(error, {
          ...context,
          attempt,
          maxRetries: retries,
        });
        throw error;
      }
      
      // Calculate backoff delay
      const backoffDelay = delay * Math.pow(backoffFactor, attempt);
      
      // Log retry attempt
      info(`Retry attempt ${attempt + 1}/${retries} after ${backoffDelay}ms`, {
        ...context,
        errorMessage: getErrorMessage(error),
        attempt: attempt + 1,
        maxRetries: retries,
        backoffDelay,
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  // This should never be reached due to the throw in the catch block
  throw lastError;
}
