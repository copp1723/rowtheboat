import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  isAppError, 
  toAppError, 
  ERROR_CODES,
  type ErrorCode 
} from './errorTypes.js';
import { logger } from './logger.js';

/**
 * Log error with appropriate level and context
 */
export function logError(error: unknown, context: Record<string, any> = {}): void {
  const appError = toAppError(error);
  const { name, message, stack, code, statusCode, isOperational } = appError;
  
  const logContext = {
    error: {
      name,
      message,
      code,
      statusCode,
      isOperational,
      stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
    },
    context: {
      ...(appError.context || {}),
      ...context,
    },
    timestamp: new Date().toISOString(),
  };

  if (isOperational) {
    logger.warn('Operational error occurred', logContext);
  } else {
    logger.error('Unexpected error occurred', logContext);
  }
}

/**
 * Format error response for API clients
 */
export function formatErrorResponse(
  error: unknown,
  includeDetails: boolean = process.env.NODE_ENV !== 'production'
): Record<string, any> {
  const appError = toAppError(error);
  const response: Record<string, any> = {
    status: 'error',
    statusCode: appError.statusCode,
    code: appError.code,
    message: appError.message,
  };

  // Include additional context for debugging if available
  if (appError.context && Object.keys(appError.context).length > 0) {
    response.context = appError.context;
  }

  // Include stack trace in non-production environments
  if (includeDetails && appError.stack) {
    response.stack = appError.stack;
  }

  return response;
}

/**
 * Global error handler middleware for Express
 */
export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error with request context
  logError(error, {
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query,
    // Don't log the entire body as it might contain sensitive data
    body: Object.keys(req.body || {}).length > 0 ? '[REDACTED]' : undefined,
  });

  // Format the error response
  const response = formatErrorResponse(
    error,
    process.env.NODE_ENV !== 'production'
  );

  // Send the response
  res.status(response.statusCode).json(response);
}

/**
 * Async handler to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch((error) => {
      // Convert to AppError if not already
      const appError = toAppError(error);
      next(appError);
    });
  };
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    const appError = toAppError(error);
    logError(appError, { type: 'uncaughtException' });
    
    // Consider whether to crash the process or not based on error type
    if (!appError.isOperational) {
      logger.fatal('Uncaught exception - Application will exit', { error: appError });
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const appError = toAppError(reason);
    logError(appError, { type: 'unhandledRejection' });
    
    // Consider whether to crash the process or not based on error type
    if (!appError.isOperational) {
      logger.fatal('Unhandled rejection - Application will exit', { error: appError });
      process.exit(1);
    }
  });
}

/**
 * Try-catch wrapper for functions that return a value
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'An error occurred',
  context: Record<string, any> = {},
  errorCode: ErrorCode = 'UNEXPECTED_ERROR'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appError = toAppError(error);
    
    // Only override the message if it's the default one
    if (appError.message === 'An unexpected error occurred' || !appError.isOperational) {
      appError.message = errorMessage;
      appError.code = errorCode;
    }
    
    // Add context to the error
    if (Object.keys(context).length > 0) {
      appError.context = { ...appError.context, ...context };
    }
    
    logError(appError);
    throw appError;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxDelay?: number;
    retryCondition?: (error: any) => boolean;
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    retryCondition = () => true,
    context = {},
  } = options;

  let attempts = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      const appError = toAppError(error);
      const shouldRetry = 
        attempts < maxRetries && 
        (retryCondition ? retryCondition(appError) : true);

      if (!shouldRetry) {
        logError(appError, { 
          ...context, 
          retryAttempts: attempts,
          maxRetries,
          willRetry: false 
        });
        throw appError;
      }

      logError(appError, { 
        ...context, 
        retryAttempts: attempts,
        maxRetries,
        delay,
        willRetry: true
      });
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }
  // This should never be reached due to the throw in the catch block
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
