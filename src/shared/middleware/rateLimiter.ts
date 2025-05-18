/**
 * Rate Limiting Middleware
 *
 * This middleware implements configurable rate limiting for API endpoints
 * to prevent abuse and ensure fair usage of the API.
 */
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../logger.js';
// Default rate limit settings
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 100; // 100 requests per window
/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  keyGenerator?: (req: Request) => string;
}
/**
 * Creates a rate limiting middleware with the specified configuration
 *
 * @param config Rate limit configuration
 * @returns Express middleware function
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const limiterConfig = {
    windowMs: config.windowMs || DEFAULT_WINDOW_MS,
    max: config.max || DEFAULT_MAX_REQUESTS,
    standardHeaders: config.standardHeaders !== false, // X-RateLimit-* headers
    legacyHeaders: config.legacyHeaders !== false, // X-RateLimit-* headers
    message: config.message || 'Too many requests, please try again later.',
    keyGenerator:
      config.keyGenerator ||
      ((req: Request) => {
        // Use IP address as default key
        return req.ip || 'unknown';
      }),
    handler: (req: Request, res: Response, _next: NextFunction, options: any) => {
      // Log rate limit exceeded
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.method} ${req.path}`, {
        ip: req.ip,
        method: req.method,
        path: req.path,
        headers: req.headers,
        rateLimitConfig: {
          windowMs: options.windowMs,
          max: options.max,
        },
      });
      // Return error response
      res.status(429).json({
        status: 'error',
        statusCode: 429,
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  };
  return rateLimit(limiterConfig);
}
/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  // API rate limiter (100 requests per 15 minutes)
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many API requests, please try again after 15 minutes',
  }),
  // Authentication rate limiter (5 requests per minute)
  auth: createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again after 1 minute',
  }),
  // Task submission rate limiter (10 requests per minute)
  taskSubmission: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many task submissions, please try again after 1 minute',
  }),
  // Health check rate limiter (30 requests per minute)
  healthCheck: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many health check requests, please try again after 1 minute',
  }),
};
