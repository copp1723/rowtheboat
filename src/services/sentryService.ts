/**
 * Sentry Integration Service
 * 
 * This service provides integration with Sentry for error tracking and monitoring.
 * It configures Sentry SDK, sets up error handlers, and provides utility functions
 * for capturing errors and custom events.
 */
import { AppError } from '../shared/errorTypes';
import { error, warn, info } from '../shared/logger';
import * as Sentry from '@sentry/node';
import { isError } from '../utils/errorUtils';
import { ProfilingIntegration } from '@sentry/profiling-node';

/**
 * Custom error type for application errors
 */
// export interface AppError extends Error {
//   statusCode?: number;
//   isOperational?: boolean;
//   code?: string;
//   details?: unknown;
//   cause?: unknown;
// }

// Environment-specific configuration
const SENTRY_ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_TRACES_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE 
  ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) 
  : 0.2; // Default to 20% of transactions
const SENTRY_PROFILES_SAMPLE_RATE = process.env.SENTRY_PROFILES_SAMPLE_RATE 
  ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) 
  : 0.1; // Default to 10% of transactions

/**
 * Initialize Sentry SDK
 * @param dsn Sentry DSN (if not provided, will use SENTRY_DSN environment variable)
 * @returns true if Sentry was initialized successfully, false otherwise
 */
export function initializeSentry(dsn?: string): boolean {
  try {
    const sentryDsn = dsn || process.env.SENTRY_DSN;
    
    if (!sentryDsn) {
      warn('Sentry DSN not provided, error tracking disabled');
      return false;
    }
    
    Sentry.init({
      dsn: sentryDsn,
      environment: SENTRY_ENVIRONMENT,
      integrations: [
        // Enable HTTP capturing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express(),
        // Enable Node.js profiling
        new ProfilingIntegration(),
      ],
      // Performance monitoring
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      // Set sampling rate for profiling
      profilesSampleRate: SENTRY_PROFILES_SAMPLE_RATE,
    });
    
    info('Sentry initialized successfully');
    return true;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    error('Failed to initialize Sentry', { 
      event: 'sentry_init_error',
      error: caughtError.message,
      stack: caughtError.stack
    });
    return false;
  }
}

/**
 * Set user context for Sentry
 * @param userId User ID
 * @param email Optional user email
 */
export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context from Sentry
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Capture an error in Sentry
 * @param error Error to capture
 * @param context Additional context to include
 */
export function captureError(error: unknown, context: Record<string, any> = {}): string {
  try {
    // Ensure the error is an AppError or convert it to one
    const appError: AppError = error instanceof Error ? 
      (error as AppError) : 
      new Error(String(error)) as AppError;

    // Set default properties if not already set
    if (!appError.statusCode) appError.statusCode = 500;
    if (appError.isOperational === undefined) appError.isOperational = false;

    const eventId = Sentry.captureException(appError);
    
    // Log that we've captured the error
    info(`Error captured in Sentry with ID: ${eventId}`, {
      event: 'sentry_capture',
      errorId: eventId,
      statusCode: appError.statusCode,
      isOperational: appError.isOperational
    });
    
    return eventId;
  } catch (captureError: unknown) {
    const caughtError = captureError instanceof Error ? captureError : new Error(String(captureError));
    error('Failed to capture error in Sentry', {
      event: 'sentry_capture_error',
      error: caughtError.message,
      stack: caughtError.stack
    });
    return '';
  }
}

/**
 * Capture a message in Sentry
 * @param message Message to capture
 * @param level Severity level
 * @param context Additional context
 */
export function captureMessage(
  message: string | Error | unknown,
  level: Sentry.SeverityLevel = 'info',
  context: Record<string, any> = {}
): string {
  try {
    if (!isSentryInitialized()) {
      throw new Error('Sentry not initialized');
    }

    // Normalize the message to string
    const normalizedMessage = typeof message === 'string' ? message : 
      message instanceof Error ? message.message : 
      String(message);

    // Add custom context
    if (Object.keys(context).length > 0) {
      Sentry.setContext('message_context', context);
    }
    
    // Capture the message
    const eventId = Sentry.captureMessage(normalizedMessage, level);
    
    return eventId;
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    error('Failed to capture message in Sentry', {
      event: 'sentry_message_error',
      error: errorObj.message,
      stack: errorObj.stack
    });
    return '';
  }
}

/**
 * Create Express middleware for Sentry request handler
 */
export function createSentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Create Express middleware for Sentry error handler
 */
export function createSentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Flush Sentry events before shutting down
 */
export async function flushSentryEvents(timeout: number = 2000): Promise<boolean> {
  try {
    const result = await Sentry.close(timeout);
    return result;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    error('Error flushing Sentry events', {
      event: 'sentry_flush_error',
      error: caughtError.message,
      stack: caughtError.stack
    });
    return false;
  }
}

export default {
  initializeSentry,
  setUserContext,
  clearUserContext,
  captureError,
  captureMessage,
  createSentryRequestHandler,
  createSentryErrorHandler,
  flushSentryEvents,
};

function isSentryInitialized(): boolean {
  return Sentry.getCurrentHub().getClient() !== null;
}
