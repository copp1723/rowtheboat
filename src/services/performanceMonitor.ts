/**
 * Performance Monitoring Service
 * 
 * This service provides functions for monitoring and analyzing application performance.
 */
import os from 'os';
import { logger } from '../shared/logger.js';
import { db } from '../shared/db.js';
import { sql } from 'drizzle-orm';
import { getPerformanceMetrics } from '../middleware/performance.js';
import { getCacheStats } from '../middleware/cache.js';

// Performance metrics table name
const PERFORMANCE_METRICS_TABLE = 'performance_metrics';

// Interval for collecting metrics (in milliseconds)
const METRICS_COLLECTION_INTERVAL = 60000; // 1 minute

// Maximum number of metrics to store
const MAX_METRICS_HISTORY = 1440; // 24 hours at 1-minute intervals

// Performance metrics interface
interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  loadAverage: number[];
  uptime: number;
}

// Store metrics history in memory
const metricsHistory: SystemMetrics[] = [];

/**
 * Get current system metrics
 * 
 * @returns System metrics
 */
export function getSystemMetrics(): SystemMetrics {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    timestamp: new Date().toISOString(),
    cpuUsage: getCpuUsage(),
    memoryUsage: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentUsed: (usedMemory / totalMemory) * 100,
    },
    loadAverage: os.loadavg(),
    uptime: os.uptime(),
  };
}

/**
 * Get CPU usage percentage
 * 
 * @returns CPU usage percentage
 */
function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  
  return 100 - (totalIdle / totalTick) * 100;
}

/**
 * Collect and store performance metrics
 */
export async function collectPerformanceMetrics(): Promise<void> {
  try {
    // Get system metrics
    const systemMetrics = getSystemMetrics();
    
    // Get application metrics
    const appMetrics = getPerformanceMetrics();
    
    // Get cache stats
    const cacheStats = getCacheStats();
    
    // Store metrics in memory
    metricsHistory.push(systemMetrics);
    
    // Keep only the most recent metrics
    if (metricsHistory.length > MAX_METRICS_HISTORY) {
      metricsHistory.shift();
    }
    
    // Store metrics in database
    await storeMetricsInDatabase(systemMetrics, appMetrics, cacheStats);
    
    logger.debug('Performance metrics collected');
  } catch (error) {
    logger.error('Error collecting performance metrics:', error);
  }
}

/**
 * Store metrics in database
 * 
 * @param systemMetrics System metrics
 * @param appMetrics Application metrics
 * @param cacheStats Cache statistics
 */
async function storeMetricsInDatabase(
  systemMetrics: SystemMetrics,
  appMetrics: any,
  cacheStats: any
): Promise<void> {
  try {
    // Check if table exists
    const tableExists = await checkTableExists(PERFORMANCE_METRICS_TABLE);
    
    // Create table if it doesn't exist
    if (!tableExists) {
      await createMetricsTable();
    }
    
    // Insert metrics into database
    await db.execute(sql.raw(`
      INSERT INTO ${PERFORMANCE_METRICS_TABLE} (
        timestamp,
        system_metrics,
        app_metrics,
        cache_stats
      ) VALUES (
        NOW(),
        $1,
        $2,
        $3
      )
    `), [
      JSON.stringify(systemMetrics),
      JSON.stringify(appMetrics),
      JSON.stringify(cacheStats),
    ]);
    
    // Clean up old metrics
    await cleanupOldMetrics();
  } catch (error) {
    logger.error('Error storing metrics in database:', error);
  }
}

/**
 * Check if a table exists
 * 
 * @param tableName Table name
 * @returns Whether the table exists
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `), [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    logger.error('Error checking if table exists:', error);
    return false;
  }
}

/**
 * Create metrics table
 */
async function createMetricsTable(): Promise<void> {
  try {
    await db.execute(sql.raw(`
      CREATE TABLE ${PERFORMANCE_METRICS_TABLE} (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        system_metrics JSONB NOT NULL,
        app_metrics JSONB NOT NULL,
        cache_stats JSONB NOT NULL
      )
    `));
    
    // Create index on timestamp
    await db.execute(sql.raw(`
      CREATE INDEX idx_${PERFORMANCE_METRICS_TABLE}_timestamp
      ON ${PERFORMANCE_METRICS_TABLE} (timestamp)
    `));
    
    logger.info(`Created ${PERFORMANCE_METRICS_TABLE} table`);
  } catch (error) {
    logger.error('Error creating metrics table:', error);
  }
}

/**
 * Clean up old metrics
 */
async function cleanupOldMetrics(): Promise<void> {
  try {
    await db.execute(sql.raw(`
      DELETE FROM ${PERFORMANCE_METRICS_TABLE}
      WHERE timestamp < NOW() - INTERVAL '24 hours'
    `));
  } catch (error) {
    logger.error('Error cleaning up old metrics:', error);
  }
}

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring(): void {
  // Collect metrics immediately
  collectPerformanceMetrics();
  
  // Set up interval for collecting metrics
  setInterval(collectPerformanceMetrics, METRICS_COLLECTION_INTERVAL);
  
  logger.info('Performance monitoring started');
}

/**
 * Get performance metrics history
 * 
 * @returns Performance metrics history
 */
export function getMetricsHistory(): SystemMetrics[] {
  return [...metricsHistory];
}
