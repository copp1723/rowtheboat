/**
 * PostgreSQL Health Check
 *
 * This module provides a health check function for PostgreSQL that can be registered
 * with the health monitoring service.
 */
import { db } from '../shared/db';
import { logger } from '../shared/logger';
import { isError } from '../utils/errorUtils';
import { HealthCheckResult } from './healthService'; // Assuming HealthCheckResult is defined here or in a shared types file

/**
 * Check PostgreSQL health
 * @returns Health check result
 */
export async function checkPostgresHealth(): Promise<HealthCheckResult> {
  const id = 'postgresql';
  const name = 'PostgreSQL';
  const startTime = Date.now();

  try {
    // Attempt a simple query to check connectivity
    await db.execute('SELECT 1');
    const responseTime = Date.now() - startTime;
    logger.info('PostgreSQL health check: OK', { duration: responseTime });
    return {
      id,
      name,
      status: 'ok',
      responseTime,
      lastChecked: new Date(),
      message: 'PostgreSQL is operational',
      details: {
        host: process.env.PGHOST || 'localhost', // Or extract from DATABASE_URL if used
        database: process.env.PGDATABASE, // Or extract from DATABASE_URL if used
      },
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMessage = isError(err) ? err.message : String(err);
    logger.error('PostgreSQL health check failed', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      duration: responseTime,
    });
    return {
      id,
      name,
      status: 'error',
      responseTime,
      lastChecked: new Date(),
      message: 'PostgreSQL is not available',
      details: {
        error: errorMessage,
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE,
      },
    };
  }
}
