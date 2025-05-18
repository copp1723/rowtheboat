/**
 * Monitoring Service
 *
 * This service provides a unified interface for monitoring and alerting.
 * It integrates with Sentry for error tracking and DataDog for performance monitoring,
 * and provides utility functions for tracking errors, performance, and system health.
 */
import * as sentryService from './sentryService.js';
import * as datadogService from './datadogService.js';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { sendAdminAlert, sendImmediateAdminAlert } from './alertMailer.js';
import { db } from '../shared/db.js';
import { healthChecks, healthLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Import monitoring configuration
import monitoringConfig from '../config/monitoring.js';

// Track initialization status
let sentryInitialized = false;
let datadogInitialized = false;

// Alert thresholds from configuration
const ERROR_RATE_THRESHOLD = monitoringConfig.alertThresholds.errorRate;
const DB_QUERY_DURATION_THRESHOLD = monitoringConfig.alertThresholds.dbQueryDuration;
const API_RESPONSE_TIME_THRESHOLD = monitoringConfig.alertThresholds.apiResponseTime;

// Error tracking
const errorCounts: Record<string, number> = {
  total: 0,
  operational: 0,
  critical: 0,
};

// Request tracking
const requestCounts: Record<string, number> = {
  total: 0,
  success: 0,
  error: 0,
};

/**
 * Initialize the monitoring service
 * @returns Object with initialization status
 */
export async function initialize(): Promise<{
  sentryInitialized: boolean;
  datadogInitialized: boolean;
}> {
  try {
    // Check if monitoring is enabled
    if (!monitoringConfig.enabled) {
      logger.info('Monitoring is disabled by configuration');
      return {
        sentryInitialized: false,
        datadogInitialized: false,
      };
    }

    // Initialize Sentry with configuration
    sentryInitialized = sentryService.initializeSentry(monitoringConfig.sentry.dsn);

    // Initialize DataDog with configuration
    datadogInitialized = datadogService.initializeDataDog();

    // Log initialization status
    logger.info(`Monitoring service initialized: Sentry=${sentryInitialized}, DataDog=${datadogInitialized}`);

    // Start system resource tracking if DataDog is initialized
    if (datadogInitialized) {
      startResourceTracking();
    }

    return {
      sentryInitialized,
      datadogInitialized,
    };
  } catch (error) {
    logger.error('Failed to initialize monitoring service:', isError(error) ? error : String(error));
    return {
      sentryInitialized: false,
      datadogInitialized: false,
    };
  }
}

/**
 * Track an error
 * @param error Error to track
 * @param context Additional context
 * @param isCritical Whether this is a critical error
 * @returns Error ID from Sentry (if available)
 */
export function trackError(
  error: unknown,
  context: Record<string, any> = {},
  isCritical: boolean = false
): string {
  try {
    // Update error counts
    errorCounts.total++;

    // Determine if error is operational
    const isOperational = error instanceof Error && 'isOperational' in error
      ? (error as any).isOperational
      : false;

    if (isOperational) {
      errorCounts.operational++;
    }

    if (isCritical) {
      errorCounts.critical++;

      // Send immediate alert for critical errors
      sendImmediateAdminAlert(
        'Critical Error Detected',
        `A critical error has occurred: ${isError(error) ? error.message : String(error)}`,
        {
          severity: 'critical',
          component: context.component || 'unknown',
          details: {
            ...context,
            errorType: isError(error) ? error.constructor.name : 'Unknown',
          },
        }
      ).catch(alertError => {
        logger.error('Failed to send critical error alert:',
          isError(alertError) ? alertError : String(alertError)
        );
      });
    }

    // Track in DataDog if initialized
    if (datadogInitialized) {
      datadogService.incrementMetric('errors.count', 1, [
        `type:${isError(error) ? error.constructor.name : 'unknown'}`,
        `operational:${isOperational}`,
        `critical:${isCritical}`,
        ...(context.component ? [`component:${context.component}`] : []),
      ]);
    }

    // Track in Sentry if initialized
    if (sentryInitialized) {
      return sentryService.captureError(error, {
        ...context,
        isCritical,
      });
    }

    return '';
  } catch (trackError) {
    logger.error('Failed to track error:', isError(trackError) ? trackError : String(trackError));
    return '';
  }
}

/**
 * Track an API request
 * @param method HTTP method
 * @param path API path
 * @param statusCode HTTP status code
 * @param durationMs Duration in milliseconds
 */
export function trackApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  try {
    // Update request counts
    requestCounts.total++;

    if (statusCode >= 200 && statusCode < 400) {
      requestCounts.success++;
    } else {
      requestCounts.error++;
    }

    // Calculate error rate
    const errorRate = requestCounts.total > 0
      ? requestCounts.error / requestCounts.total
      : 0;

    // Check if error rate exceeds threshold
    if (errorRate > ERROR_RATE_THRESHOLD && requestCounts.total >= 100) {
      // Send alert for high error rate
      sendAdminAlert(
        'High API Error Rate Detected',
        `The API error rate has exceeded the threshold of ${ERROR_RATE_THRESHOLD * 100}%. Current rate: ${(errorRate * 100).toFixed(2)}%`,
        {
          severity: 'warning',
          component: 'api',
          details: {
            totalRequests: requestCounts.total,
            errorRequests: requestCounts.error,
            errorRate: errorRate,
          },
        }
      ).catch(alertError => {
        logger.error('Failed to send error rate alert:',
          isError(alertError) ? alertError : String(alertError)
        );
      });
    }

    // Check if response time exceeds threshold
    if (durationMs > API_RESPONSE_TIME_THRESHOLD) {
      logger.warn(`Slow API response: ${method} ${path} took ${durationMs}ms`);

      // Track in DataDog if initialized
      if (datadogInitialized) {
        datadogService.incrementMetric('api.slow_requests', 1, [
          `method:${method}`,
          `path:${path}`,
        ]);
      }
    }

    // Track in DataDog if initialized
    if (datadogInitialized) {
      datadogService.trackApiRequest(method, path, statusCode, durationMs);
    }
  } catch (error) {
    logger.error('Failed to track API request:', isError(error) ? error : String(error));
  }
}

/**
 * Track a database query
 * @param operation Query operation (e.g., 'select', 'insert')
 * @param table Table name
 * @param durationMs Duration in milliseconds
 * @param success Whether the query was successful
 */
export function trackDatabaseQuery(
  operation: string,
  table: string,
  durationMs: number,
  success: boolean = true
): void {
  try {
    // Check if query duration exceeds threshold
    if (durationMs > DB_QUERY_DURATION_THRESHOLD) {
      logger.warn(`Slow database query: ${operation} on ${table} took ${durationMs}ms`);

      // Track in DataDog if initialized
      if (datadogInitialized) {
        datadogService.incrementMetric('database.slow_queries', 1, [
          `operation:${operation}`,
          `table:${table}`,
        ]);
      }
    }

    // Track in DataDog if initialized
    if (datadogInitialized) {
      datadogService.trackDatabaseQuery(operation, table, durationMs, success);
    }
  } catch (error) {
    logger.error('Failed to track database query:', isError(error) ? error : String(error));
  }
}

/**
 * Start tracking system resources
 * @param intervalMs Interval in milliseconds (default: 60000 = 1 minute)
 */
function startResourceTracking(intervalMs: number = 60000): void {
  // Track resources immediately
  datadogService.trackSystemResources();

  // Set up interval for tracking resources
  setInterval(() => {
    datadogService.trackSystemResources();
  }, intervalMs);

  logger.info(`System resource tracking started with interval of ${intervalMs}ms`);
}

/**
 * Shutdown the monitoring service
 */
export async function shutdown(): Promise<void> {
  try {
    // Flush Sentry events
    if (sentryInitialized) {
      await sentryService.flushSentryEvents();
    }

    // Flush DataDog metrics
    if (datadogInitialized) {
      await datadogService.flushMetrics();
    }

    logger.info('Monitoring service shut down successfully');
  } catch (error) {
    logger.error('Error shutting down monitoring service:', isError(error) ? error : String(error));
  }
}

export default {
  initialize,
  trackError,
  trackApiRequest,
  trackDatabaseQuery,
  shutdown,
};
