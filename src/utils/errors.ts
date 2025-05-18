/**
 * Centralized error handling utilities and error classes
 * 
 * This module provides a consistent way to handle errors across the application,
 * including custom error classes, error boundaries, and error formatting.
 */

import { logger } from '../shared/logger.js';
import { AppError, isAppError, toAppError } from '../shared/errorTypes.js';
import { Request, Response, NextFunction } from 'express';
import React from 'react';

// Re-export error types for convenience
export * from '../shared/errorTypes.js';

/**
 * Error codes for common error scenarios
 */
export const ERROR_CODES = {
  // General errors (1000-1999)
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // Authentication & Authorization (2000-2999)
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors (3000-3999)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // Database errors (4000-4999)
  DATABASE_ERROR: 'DATABASE_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  
  // External service errors (5000-5999)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  
  // Workflow errors (6000-6999)
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  TASK_ERROR: 'TASK_ERROR',
  
  // Rate limiting (7000-7999)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Email errors (8000-8999)
  EMAIL_SEND_ERROR: 'EMAIL_SEND_ERROR',
  EMAIL_VALIDATION_ERROR: 'EMAIL_VALIDATION_ERROR',
} as const;

type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Extended AppError with error codes and additional context
 */
export class CodedError extends AppError {
  public readonly code: string;
  
  constructor(
    message: string,
    code: ErrorCode = 'UNEXPECTED_ERROR',
    statusCode: number = 500,
    context: Record<string, any> = {},
    isOperational: boolean = true
  ) {
    super(message, statusCode, isOperational, {
      ...context,
      errorCode: code,
    });
    this.code = code;
    this.name = this.constructor.name;
  }
}

/**
 * Format an error for API responses
 */
export function formatErrorForResponse(
  error: unknown,
  includeDetails: boolean = process.env.NODE_ENV !== 'production'
) {
  const appError = toAppError(error);
  const response: any = {
    status: 'error',
    code: appError.context?.errorCode || 'INTERNAL_SERVER_ERROR',
    message: appError.message,
  };

  if (includeDetails) {
    response.details = {
      name: appError.name,
      stack: appError.stack,
      ...(appError.context || {})
    };
  }

  return response;
}

/**
 * Log an error with appropriate level based on error type
 */
export function logError(error: unknown, context: Record<string, any> = {}) {
  const appError = toAppError(error);
  const logData = {
    error: {
      name: appError.name,
      message: appError.message,
      code: appError.context?.errorCode,
      stack: appError.stack,
      statusCode: appError.statusCode,
      isOperational: appError.isOperational,
    },
    context: {
      ...(appError.context || {}),
      ...context,
    },
    timestamp: new Date().toISOString(),
  };

  if (appError.isOperational) {
    logger.warn('Operational error occurred', logData);
  } else {
    logger.error('Unexpected error occurred', logData);
  }
}

/**
 * Error boundary for React components
 */
export class ErrorBoundary extends React.Component<
  { 
    children: React.ReactNode;
    fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error: Error | null }
> {
  public state = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, { componentStack: errorInfo.componentStack });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      return this.props.fallback || React.createElement('h1', null, 'Something went wrong.');
    }

    return this.props.children;
  }
}

/**
 * Express error handler middleware
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const appError = toAppError(error);
  
  // Log the error
  logError(appError, {
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query,
    // Don't log the entire body as it might contain sensitive data
    body: Object.keys(req.body || {}).length > 0 ? '[REDACTED]' : undefined,
  });

  // Format the error response
  const response = formatErrorForResponse(
    appError,
    process.env.NODE_ENV !== 'production'
  );

  // Send the response
  res.status(appError.statusCode).json(response);
}

/**
 * Async handler for Express routes
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Wrap a function with error handling and logging
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string = 'unknown',
  options: {
    logError?: boolean;
    rethrow?: boolean;
    defaultError?: Error;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = toAppError(error);
      
      if (options.logError !== false) {
        logError(appError, { context });
      }

      if (options.rethrow) {
        throw options.defaultError || appError;
      }

      // Return a rejected promise with the error
      return Promise.reject(options.defaultError || appError);
    }
  };
}

/**
 * Assert that a condition is true, otherwise throw an error
 */
export function assert(
  condition: any,
  message: string,
  code: ErrorCode = 'VALIDATION_ERROR',
  statusCode: number = 400
): asserts condition {
  if (!condition) {
    throw new CodedError(message, code, statusCode);
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is required',
  code: ErrorCode = 'VALIDATION_ERROR',
  statusCode: number = 400
): asserts value is T {
  if (value === null || value === undefined) {
    throw new CodedError(message, code, statusCode);
  }
}
