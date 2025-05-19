/**
 * Health Check Scheduler
 * 
 * This module provides functionality to schedule periodic health checks
 * for various services in the system. It uses node-cron to schedule
 * the execution of health checks at regular intervals.
 */

import cron from 'node-cron';
import { runAllHealthChecks } from './healthService';
import { info, warn, error } from '../shared/logger.js';

// Default schedule: every 5 minutes
const DEFAULT_SCHEDULE = '*/5 * * * *';

// Store the active cron job
let activeScheduler: ReturnType<typeof cron.schedule> | null = null;
let currentSchedule: string | null = null;

/**
 * Start all health checks on a schedule
 * 
 * @param schedule - Cron schedule for health checks (default: every 5 minutes)
 */
export function startAllHealthChecks(schedule: string = DEFAULT_SCHEDULE): void {
  // If there's already an active scheduler, stop it first
  if (activeScheduler) {
    stopAllHealthChecks();
  }

  // Validate the cron expression
  if (!cron.validate(schedule)) {
    error({
      event: 'health_check_scheduler_invalid_cron',
      schedule,
      timestamp: new Date().toISOString(),
    }, `Invalid cron expression for health check scheduler: ${schedule}`);
    
    // Fall back to default schedule
    schedule = DEFAULT_SCHEDULE;
    warn({
      event: 'health_check_scheduler_fallback',
      schedule,
      timestamp: new Date().toISOString(),
    }, `Falling back to default schedule: ${schedule}`);
  }

  try {
    // Create a new scheduler with the specified schedule
    activeScheduler = cron.schedule(schedule, async () => {
      try {
        info({
          event: 'health_check_scheduler_running',
          schedule,
          timestamp: new Date().toISOString(),
        }, 'Running scheduled health checks');
        
        // Run all health checks
        const results = await runAllHealthChecks();
        
        // Log the results
        const statuses = {
          ok: results.filter(r => r.status === 'ok').length,
          warning: results.filter(r => r.status === 'warning').length,
          error: results.filter(r => r.status === 'error').length,
        };
        
        info({
          event: 'health_check_scheduler_completed',
          schedule,
          checks: results.length,
          statuses,
          timestamp: new Date().toISOString(),
        }, `Completed scheduled health checks: ${statuses.ok} ok, ${statuses.warning} warnings, ${statuses.error} errors`);
      } catch (err) {
        // Log error but don't stop the scheduler
        error({
          event: 'health_check_scheduler_error',
          schedule,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString(),
        }, 'Error running scheduled health checks');
      }
    }, {
      scheduled: true,
      timezone: 'UTC', // Use UTC to avoid timezone issues
    });

    // Store the current schedule
    currentSchedule = schedule;
    
    info({
      event: 'health_check_scheduler_started',
      schedule,
      timestamp: new Date().toISOString(),
    }, `Health check scheduler started with schedule: ${schedule}`);
  } catch (err) {
    error({
      event: 'health_check_scheduler_start_error',
      schedule,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    }, 'Error starting health check scheduler');
    
    // Reset state
    activeScheduler = null;
    currentSchedule = null;
  }
}

/**
 * Stop all scheduled health checks
 */
export function stopAllHealthChecks(): void {
  if (activeScheduler) {
    activeScheduler.stop();
    
    info({
      event: 'health_check_scheduler_stopped',
      schedule: currentSchedule,
      timestamp: new Date().toISOString(),
    }, 'Health check scheduler stopped');
    
    activeScheduler = null;
    currentSchedule = null;
  }
}

/**
 * Get the current health check schedule
 * 
 * @returns The current cron schedule or null if not running
 */
export function getHealthCheckSchedule(): string | null {
  return currentSchedule;
}
