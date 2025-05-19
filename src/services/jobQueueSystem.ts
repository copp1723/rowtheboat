/**
 * Job Queue System
 *
 * Main entry point for the distributed job queue system
 * Initializes all components and provides a unified interface
 */
import { initializeRedis, closeConnections } from './bullmqService';
import { isError } from '../utils/errorUtils.js';
import { initializeQueueManager } from './queueManager';
import { initializeIngestionWorker } from '../workers/ingestionWorker.js';
import { initializeProcessingWorker } from '../workers/processingWorker.js';
import { initializeInsightWorker } from '../workers/insightWorker.js';
import { initializeDistributedScheduler } from './distributedScheduler';
import { debug, info, warn, error } from '../shared/logger.js';
/**
 * Initialize the job queue system
 */
export async function initializeJobQueueSystem(): Promise<void> {
  try {
    info(
      {
        event: 'job_queue_system_initializing',
        timestamp: new Date().toISOString(),
      },
      'Initializing job queue system...'
    );
    // Initialize Redis connection
    await initializeRedis();
    // Initialize queue manager
    await initializeQueueManager();
    // Initialize workers
    initializeIngestionWorker();
    initializeProcessingWorker();
    initializeInsightWorker();
    // Initialize distributed scheduler
    await initializeDistributedScheduler();
    info(
      {
        event: 'job_queue_system_initialized',
        timestamp: new Date().toISOString(),
      },
      'Job queue system initialized successfully'
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    error(
      {
        event: 'job_queue_system_init_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error initializing job queue system: ${errorMessage}`
    );
    throw error;
  }
}
/**
 * Shutdown the job queue system
 */
export async function shutdownJobQueueSystem(): Promise<void> {
  try {
    info(
      {
        event: 'job_queue_system_shutting_down',
        timestamp: new Date().toISOString(),
      },
      'Shutting down job queue system...'
    );
    // Close all connections
    await closeConnections();
    info(
      {
        event: 'job_queue_system_shutdown_complete',
        timestamp: new Date().toISOString(),
      },
      'Job queue system shutdown complete'
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    error(
      {
        event: 'job_queue_system_shutdown_error',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
      `Error shutting down job queue system: ${errorMessage}`
    );
    throw error;
  }
}
// Export all components for direct access
export * from './bullmqService';
export * from './queueManager';
export * from './distributedScheduler';
export * from '../workers/ingestionWorker.js';
export * from '../workers/processingWorker.js';
export * from '../workers/insightWorker.js';
