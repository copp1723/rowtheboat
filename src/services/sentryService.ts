/**
 * Sentry Integration Service
 * 
 * This service provides integration with Sentry for error tracking and monitoring.
 * It configures Sentry SDK, sets up error handlers, and provides utility functions
 * for capturing errors and custom events.
 */
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { isError } from '../utils/errorUtils.js';
import { logger } from '../shared/logger.js';
import { AppError } from '../utils/errors.js';

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
      logger.warn('Sentry DSN not provided, error tracking disabled');
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
    
    logger.info('Sentry initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Sentry:', isError(error) ? error : String(error));
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
    // Convert to AppError for consistent handling
    const appError = error instanceof AppError ? error : new AppError(
      isError(error) ? error.message : String(error),
      {
        cause: error,
        isOperational: false,
      }
    );
    
    // Add error context
    Sentry.setContext('error_details', {
      isOperational: appError.isOperational,
      statusCode: appError.statusCode,
      ...(appError.context || {}),
    });
    
    // Add custom context
    if (Object.keys(context).length > 0) {
      Sentry.setContext('additional_context', context);
    }
    
    // Capture the error
    const eventId = Sentry.captureException(appError);
    
    // Log that we've captured the error
    logger.info(`Error captured in Sentry with ID: ${eventId}`);
    
    return eventId;
  } catch (captureError) {
    // If Sentry capture fails, just log it
    logger.error('Failed to capture error in Sentry:', 
      isError(captureError) ? captureError : String(captureError)
    );
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
  message: string, 
  level: Sentry.SeverityLevel = 'info',
  context: Record<string, any> = {}
): string {
  try {
    // Add custom context
    if (Object.keys(context).length > 0) {
      Sentry.setContext('message_context', context);
    }
    
    // Capture the message
    const eventId = Sentry.captureMessage(message, level);
    
    return eventId;
  } catch (error) {
    logger.error('Failed to capture message in Sentry:', 
      isError(error) ? error : String(error)
    );
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
  } catch (error) {
    logger.error('Error flushing Sentry events:', isError(error) ? error : String(error));
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
