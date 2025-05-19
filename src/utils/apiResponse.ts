/**
 * API Response Formatter
 * 
 * Provides consistent response formatting for API endpoints
 */
import { Response } from 'express';
import { getErrorMessage } from './errorHandling';

/**
 * Standard success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: {
    message?: string;
    statusCode?: number;
    meta?: Record<string, any>;
  } = {}
): void {
  const { message = 'Success', statusCode = 200, meta = {} } = options;
  
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
    ...meta,
  });
}

/**
 * Standard error response
 */
export function sendError(
  res: Response,
  error: unknown,
  options: {
    statusCode?: number;
    defaultMessage?: string;
    includeStack?: boolean;
    meta?: Record<string, any>;
  } = {}
): void {
  const { 
    statusCode = 500, 
    defaultMessage = 'An error occurred',
    includeStack = process.env.NODE_ENV === 'development',
    meta = {}
  } = options;
  
  const errorMessage = getErrorMessage(error) || defaultMessage;
  const errorResponse: Record<string, any> = {
    status: 'error',
    message: errorMessage,
    ...meta,
  };
  
  // Include stack trace in development
  if (includeStack && error instanceof Error && error.stack) {
    errorResponse.stack = error.stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Send a "not found" response
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found',
  meta: Record<string, any> = {}
): void {
  res.status(404).json({
    status: 'error',
    message,
    ...meta,
  });
}

/**
 * Send a "bad request" response
 */
export function sendBadRequest(
  res: Response,
  message: string = 'Invalid request',
  errors: Record<string, string> = {},
  meta: Record<string, any> = {}
): void {
  res.status(400).json({
    status: 'error',
    message,
    errors,
    ...meta,
  });
}

/**
 * Send an "unauthorized" response
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized',
  meta: Record<string, any> = {}
): void {
  res.status(401).json({
    status: 'error',
    message,
    ...meta,
  });
}

/**
 * Send a "forbidden" response
 */
export function sendForbidden(
  res: Response,
  message: string = 'Forbidden',
  meta: Record<string, any> = {}
): void {
  res.status(403).json({
    status: 'error',
    message,
    ...meta,
  });
}

/**
 * Create a route handler with standardized response formatting
 */
export function createRouteHandler<Req, Res>(
  handler: (req: Req, res: Response) => Promise<Res>
) {
  return async (req: Req, res: Response): Promise<void> => {
    try {
      const result = await handler(req, res);
      
      // If the response has already been sent, don't send again
      if (res.headersSent) {
        return;
      }
      
      sendSuccess(res, result);
    } catch (error) {
      // If the response has already been sent, don't send again
      if (res.headersSent) {
        return;
      }
      
      sendError(res, error);
    }
  };
}
