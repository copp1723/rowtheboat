/**
 * Performance Monitoring Middleware
 * 
 * This middleware tracks request performance metrics and logs them.
 */
import { Request, Response, NextFunction } from 'express';
import { debug, info, warn, error } from '../shared/logger';

// Performance metrics storage
interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerEndpoint: Record<string, number>;
  responseTimePerEndpoint: Record<string, number>;
  slowRequests: Array<{
    method: string;
    path: string;
    responseTime: number;
    timestamp: string;
  }>;
}

// Initialize performance metrics
const metrics: PerformanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: Number.MAX_SAFE_INTEGER,
  requestsPerEndpoint: {},
  responseTimePerEndpoint: {},
  slowRequests: [],
};

// Threshold for slow requests (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 1000;

// Maximum number of slow requests to store
const MAX_SLOW_REQUESTS = 100;

/**
 * Performance monitoring middleware
 */
export function performanceMonitoring(req: Request, res: Response, next: NextFunction): void {
  // Skip for static files
  if (req.path.startsWith('/static') || req.path.startsWith('/api-docs')) {
    return next();
  }

  // Record start time
  const start = Date.now();

  // Store original end method
  const originalEnd = res.end;

  // Override end method to calculate response time
  res.end = function(chunk?: any, encoding?: BufferEncoding, callback?: () => void): Response {
    // Calculate response time
    const responseTime = Date.now() - start;

    // Update metrics
    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
    metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);

    // Update endpoint-specific metrics
    const endpoint = `${req.method} ${req.path}`;
    metrics.requestsPerEndpoint[endpoint] = (metrics.requestsPerEndpoint[endpoint] || 0) + 1;
    metrics.responseTimePerEndpoint[endpoint] = (metrics.responseTimePerEndpoint[endpoint] || 0) + responseTime;

    // Track slow requests
    if (responseTime > SLOW_REQUEST_THRESHOLD) {
      metrics.slowRequests.push({
        method: req.method,
        path: req.path,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Keep only the most recent slow requests
      if (metrics.slowRequests.length > MAX_SLOW_REQUESTS) {
        metrics.slowRequests.shift();
      }

      // Log slow request
      warn({
        event: 'slow_request',
        method: req.method,
        path: req.path,
        responseTime,
        statusCode: res.statusCode,
      });
    }

    // Add response time header
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Call original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Get performance metrics
 * 
 * @returns Performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return {
    ...metrics,
    averageResponseTime: metrics.requestCount > 0 ? metrics.totalResponseTime / metrics.requestCount : 0,
  };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  metrics.requestCount = 0;
  metrics.totalResponseTime = 0;
  metrics.maxResponseTime = 0;
  metrics.minResponseTime = Number.MAX_SAFE_INTEGER;
  metrics.requestsPerEndpoint = {};
  metrics.responseTimePerEndpoint = {};
  metrics.slowRequests = [];
}
