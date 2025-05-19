/**
 * Retry Utility
 *
 * Provides configurable retry mechanisms with exponential backoff for handling
 * transient failures in network operations, API calls, and other error-prone tasks.
 */
import { debug, info, warn, error } from '../shared/logger.js';
/**
 * Retry options for configuring retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Initial delay in milliseconds before the first retry (default: 1000) */
  minTimeout?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxTimeout?: number;
  /** Backoff factor to increase delay between retries (default: 2) */
  factor?: number;
  /** Whether to add random jitter to the delay (default: true) */
  jitter?: boolean;
  /** Maximum total time in milliseconds for all retries (default: undefined) */
  maxRetryTime?: number;
  /** Function to determine if a particular error should trigger a retry (default: retry all errors) */
  retryIf?: (error: any) => boolean;
  /** Function to execute before each retry attempt (default: undefined) */
  onRetry?: (error: any, attempt: number) => void;
}
/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** The result of the operation if successful */
  result?: T;
  /** The error that caused the operation to fail */
  error?: any;
  /** The number of attempts made */
  attempts: number;
  /** Whether the operation was successful */
  success: boolean;
  /** Total time spent in milliseconds */
  totalTime: number;
}
/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error encountered if all retries fail
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 30000,
    factor = 2,
    jitter = true,
    maxRetryTime,
    retryIf = () => true,
    onRetry,
  } = options;
  let attempt = 0;
  const startTime = Date.now();
  let lastError: any;
  while (attempt < retries + 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;
      // If we've used all retries or the error shouldn't trigger a retry, throw
      if (attempt > retries || !retryIf(error)) {
        throw error;
      }
      // Check if we've exceeded the maximum retry time
      if (maxRetryTime && Date.now() - startTime > maxRetryTime) {
        warn(`Retry operation exceeded maximum time of ${maxRetryTime}ms`);
        throw error;
      }
      // Calculate delay with exponential backoff
      let delay = Math.min(minTimeout * Math.pow(factor, attempt - 1), maxTimeout);
      // Add jitter if enabled (±25% randomness)
      if (jitter) {
        const jitterFactor = 0.5 + Math.random();
        delay = Math.floor(delay * jitterFactor);
      }
      // Log retry attempt
      info(`Retry attempt ${attempt}/${retries} after ${delay}ms delay`, {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : String(error),
        attempt,
        delay,
      });
      // Execute onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt);
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // This should never be reached due to the throw in the catch block
  // but TypeScript requires a return statement
  throw lastError;
}
/**
 * Retry a function with exponential backoff and return detailed results
 * instead of throwing an exception on failure
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Object containing result or error and metadata
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;
  try {
    const result = await retry(fn, {
      ...options,
      onRetry: (error, attempt) => {
        attempts = attempt;
        if (options.onRetry) {
          options.onRetry(error, attempt);
        }
      },
    });
    return {
      result,
      attempts: attempts + 1, // +1 because the successful attempt isn't counted in onRetry
      success: true,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      error,
      attempts: attempts + 1, // +1 because the final failed attempt
      success: false,
      totalTime: Date.now() - startTime,
    };
  }
}
/**
 * Create a retryable version of an async function
 *
 * @param fn - The async function to make retryable
 * @param options - Default retry options for the function
 * @returns A new function that will retry the original function
 */
export function retryable<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  options: RetryOptions = {}
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    return retry(() => fn(...args), options);
  };
}
