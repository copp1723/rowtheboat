/**
 * Monitoring Middleware
 *
 * This middleware integrates monitoring with Express.
 * It tracks API requests, response times, and errors.
 */
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { trackApiRequest, trackError } from '../services/monitoringService';
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';

/**
 * Create Sentry request handler middleware
 */
export function createSentryRequestHandler() {
  return Sentry.Handlers.requestHandler({
    // Customize request data collection
    request: ['headers', 'method', 'query_string', 'url'],
    // Don't include the body as it may contain sensitive data
    includeBody: false,
  });
}

/**
 * Create Sentry error handler middleware
 */
export function createSentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Middleware to track API requests and response times
 */
export function requestTrackerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip tracking for health check endpoints to avoid noise
  if (req.path.includes('/health') || req.path.includes('/ping')) {
    return next();
  }

  // Record start time
  const startTime = Date.now();

  // Store original end method
  const originalEnd = res.end;

  // Override end method to track response time
  res.end = function(chunk?: any, encoding?: BufferEncoding, callback?: () => void): Response {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Track request
    trackApiRequest(
      req.method,
      req.path,
      res.statusCode,
      duration
    );

    // Log request details
    info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      event: 'api_request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Error tracking middleware
 */
export function errorTrackerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Determine if error is critical based on status code
    const isCritical = res.statusCode >= 500;

    // Track error
    trackError(error, {
      component: 'api',
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
    }, isCritical);

    // Continue to next error handler
    next(error);
  } catch (middlewareError) {
    error('Error in error tracking middleware:',
      isError(middlewareError) ? middlewareError : String(middlewareError)
    );
    next(error);
  }
}

/**
 * Register all monitoring middleware with an Express app
 * @param app Express application
 */
export function registerMonitoringMiddleware(app: any) {
  // Sentry request handler (must be the first middleware)
  app.use(createSentryRequestHandler());

  // Request tracking middleware
  app.use(requestTrackerMiddleware);

  // Sentry error handler (must be before other error handlers)
  app.use(createSentryErrorHandler());

  // Error tracking middleware
  app.use(errorTrackerMiddleware);

  info('Monitoring middleware registered');
}

export default {
  createSentryRequestHandler,
  createSentryErrorHandler,
  requestTrackerMiddleware,
  errorTrackerMiddleware,
  registerMonitoringMiddleware,
};
