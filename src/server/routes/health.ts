/**
 * Health Monitoring API Routes
 *
 * Exposes endpoints for checking system health and viewing health metrics
 */
import express from 'express';
import { isError } from '../../utils/errorUtils.js';
import { debug, info, warn, error } from '../../shared/logger.js';
import {
  runAllHealthChecks,
  runHealthCheck,
  getLatestHealthChecks,
  getHealthLogs,
  getHealthSummary,
  registerHealthCheck,
  checkDatabaseHealth,
  checkEmailService,
  checkAIService,
  checkSchedulerService,
} from '../../services/healthService.js';

const router = express.Router();

/**
 * Get overall system health summary
 */
router.get('/summary', async (_req, res) => {
  try {
    const summary = await getHealthSummary();
    res.json(summary);
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    error(`Health summary error: ${message}`);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});

/**
 * Manually run all health checks
 */
router.get('/run-checks', async (_req, res) => {
  try {
    const results = await runAllHealthChecks();
    res.json(results);
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    error(`Health checks error: ${message}`);
    res.status(500).json({ error: 'Failed to run health checks' });
  }
});

/**
 * Run a specific health check
 */
router.post('/checks/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await runHealthCheck(id);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: `Health check "${id}" not found` });
    }
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    error(`Health check error: ${message}`);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

/**
 * Get all health checks
 */
router.get('/checks', async (_req, res) => {
  try {
    const healthChecks = await getLatestHealthChecks();
    res.json(healthChecks);
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    error(`Health checks error: ${message}`);
    res.status(500).json({ error: 'Failed to get health checks' });
  }
});

/**
 * Get health logs for a specific check
 */
router.get('/logs/:checkId', async (req, res) => {
  try {
    const { checkId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = await getHealthLogs(checkId, limit);
    res.json(logs);
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    error(`Health logs error: ${message}`);
    res.status(500).json({ error: 'Failed to get health logs' });
  }
});

/**
 * Get queue system health status
 */
router.get('/queues', async (_req, res) => {
  try {
    // @ts-ignore - Will add types when implementing enhancedBullmqService
    const { healthCheck } = await import('../../features/scheduler/services/enhancedBullmqService.js');
    const status = await healthCheck();
    
    res.json({
      status: 'success',
      data: status
    });
  } catch (error: unknown) {
    const message = isError(error) ? error.message : String(error);
    
    error(`Queue health check failed: ${message}`, {
      event: 'queue_health_check_error',
      error: message
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to check queue health',
      error: message
    });
  }
});

/**
 * Register routes
 */
export function registerHealthRoutes(app: express.Express): void {
  app.get('/api/health', async (_req, res) => {
    try {
      const dbCheck = await checkDatabaseHealth();
      res.json({
        status: 'success',
        data: {
          database: dbCheck.status,
          message: dbCheck.message,
        },
      });
    } catch (error: unknown) {
      const message = isError(error) ? error.message : String(error);
      error(`Health check error: ${message}`);
      res.status(500).json({ error: 'Failed to get health check' });
    }
  });
  
  app.use('/api/health', router);
  // Register default health checks
  registerHealthCheck('database', checkDatabaseHealth);
  registerHealthCheck('email', checkEmailService);
  registerHealthCheck('ai', checkAIService);
  registerHealthCheck('scheduler', checkSchedulerService);
  console.log('Health monitoring routes registered');
}
