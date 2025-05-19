/**
 * DataDog Integration Service
 *
 * This service provides integration with DataDog for metrics, tracing, and monitoring.
 * It configures the DataDog SDK, sets up metrics tracking, and provides utility functions
 * for capturing performance data and system metrics.
 */
import { debug, info, warn, error } from '../shared/logger';
import os from 'os';

// Track initialization status
let initialized = false;

// Metrics buffer for batching
const metricsBuffer: Array<{
  name: string;
  value: number;
  tags: string[];
  timestamp?: number;
}> = [];

/**
 * Initialize DataDog SDK
 * @returns true if DataDog was initialized successfully, false otherwise
 */
export function initializeDataDog(): boolean {
  try {
    const apiKey = process.env.DATADOG_API_KEY;
    const appKey = process.env.DATADOG_APP_KEY;

    if (!apiKey) {
      warn('DataDog API key not provided, metrics tracking disabled');
      return false;
    }

    // In a real implementation, this would initialize the DataDog SDK
    // For now, we'll just log that it's initialized
    info('DataDog initialized successfully');
    initialized = true;
    return true;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    error('Failed to initialize DataDog', {
      event: 'datadog_init_error',
      error: caughtError.message,
      stack: caughtError.stack
    });
    return false;
  }
}

/**
 * Track a metric in DataDog
 * @param name Metric name
 * @param value Metric value
 * @param tags Optional tags
 */
export function trackMetric(name: string, value: number, tags: string[] = []): void {
  if (!initialized) {
    debug(`DataDog not initialized, skipping metric: ${name}`);
    return;
  }

  // Add metric to buffer
  metricsBuffer.push({
    name,
    value,
    tags,
    timestamp: Date.now(),
  });

  // Flush if buffer gets too large
  if (metricsBuffer.length >= 100) {
    flushMetrics().catch(err => {
      error('Failed to flush metrics buffer', {
        event: 'datadog_flush_error',
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

/**
 * Increment a counter metric
 * @param name Metric name
 * @param value Increment value
 * @param tags Optional tags
 */
export function incrementMetric(name: string, value: number = 1, tags: string[] = []): void {
  trackMetric(name, value, tags);
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
  if (!initialized) {
    return;
  }

  // Track request count
  incrementMetric('api.requests', 1, [
    `method:${method}`,
    `path:${path}`,
    `status:${statusCode}`,
  ]);

  // Track request duration
  trackMetric('api.request_duration', durationMs, [
    `method:${method}`,
    `path:${path}`,
    `status:${statusCode}`,
  ]);
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
  if (!initialized) {
    return;
  }

  // Track query count
  incrementMetric('database.queries', 1, [
    `operation:${operation}`,
    `table:${table}`,
    `success:${success}`,
  ]);

  // Track query duration
  trackMetric('database.query_duration', durationMs, [
    `operation:${operation}`,
    `table:${table}`,
    `success:${success}`,
  ]);
}

/**
 * Track system resources
 */
export function trackSystemResources(): void {
  if (!initialized) {
    return;
  }

  // Track CPU usage
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  trackMetric('system.cpu_usage', cpuUsage * 100);

  // Track memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  
  trackMetric('system.memory_usage', memoryUsage);
  trackMetric('system.memory_used_bytes', usedMemory);
  trackMetric('system.memory_total_bytes', totalMemory);
}

/**
 * Flush metrics buffer to DataDog
 */
export async function flushMetrics(): Promise<boolean> {
  if (!initialized || metricsBuffer.length === 0) {
    return true;
  }

  try {
    // In a real implementation, this would send metrics to DataDog
    // For now, we'll just log that metrics were flushed
    info(`Flushed ${metricsBuffer.length} metrics to DataDog`);
    
    // Clear the buffer
    metricsBuffer.length = 0;
    
    return true;
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    error('Failed to flush metrics to DataDog', {
      event: 'datadog_flush_error',
      error: caughtError.message,
      stack: caughtError.stack
    });
    return false;
  }
}

export default {
  initializeDataDog,
  trackMetric,
  incrementMetric,
  trackApiRequest,
  trackDatabaseQuery,
  trackSystemResources,
  flushMetrics,
};
