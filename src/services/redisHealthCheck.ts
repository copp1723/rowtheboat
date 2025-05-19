/**
 * Redis Health Check
 * 
 * This module provides a health check function for Redis that can be registered
 * with the health monitoring service.
 */
import { HealthCheckResult } from './healthService';
import { redisService } from './redisService';
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';

/**
 * Check Redis health
 * @returns Health check result
 */
export async function checkRedisHealth(): Promise<HealthCheckResult> {
  const id = 'redis';
  const name = 'Redis';
  const startTime = Date.now();
  
  try {
    // Check if Redis service is initialized
    if (!redisService.getClient()) {
      // Try to initialize Redis service if not already initialized
      await redisService.initialize();
    }
    
    // Check Redis health
    const healthResult = await redisService.checkHealth();
    const responseTime = Date.now() - startTime;
    
    if (healthResult.status === 'connected') {
      return {
        id,
        name,
        status: 'ok',
        responseTime,
        lastChecked: new Date(),
        message: 'Redis is operational',
        details: {
          latency: healthResult.latency,
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || '6379',
        },
      };
    } else if (healthResult.status === 'connecting') {
      return {
        id,
        name,
        status: 'warning',
        responseTime,
        lastChecked: new Date(),
        message: 'Redis is connecting',
        details: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || '6379',
        },
      };
    } else {
      return {
        id,
        name,
        status: 'error',
        responseTime,
        lastChecked: new Date(),
        message: 'Redis is not available',
        details: {
          status: healthResult.status,
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || '6379',
        },
      };
    }
  } catch (err) {
    const errorMessage = isError(err) ? err.message : String(err);
    error('Redis health check error', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });
    
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Redis error: ${errorMessage}`,
    };
  }
}
