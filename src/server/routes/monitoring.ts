/**
 * Monitoring API Routes
 *
 * Exposes endpoints for monitoring dashboards and alerts.
 */
import express from 'express';
import { isError } from '../../utils/errorUtils.js';
import { logger } from '../../shared/logger.js';
import * as dashboardService from '../../services/dashboardService.js';
import {
  runAllHealthChecks,
  runHealthCheck,
  getLatestHealthChecks,
  getHealthLogs,
  getHealthSummary,
} from '../../services/healthService.js';

const router = express.Router();

/**
 * Get overall system health summary
 */
router.get('/health/summary', async (req, res) => {
  try {
    const summary = await getHealthSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get health summary:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get health summary',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Get all health checks
 */
router.get('/health/checks', async (req, res) => {
  try {
    const checks = await getLatestHealthChecks();
    res.json(checks);
  } catch (error) {
    logger.error('Failed to get health checks:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get health checks',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Run all health checks
 */
router.post('/health/checks/run', async (req, res) => {
  try {
    const results = await runAllHealthChecks();
    res.json(results);
  } catch (error) {
    logger.error('Failed to run health checks:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to run health checks',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Run a specific health check
 */
router.post('/health/checks/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await runHealthCheck(id);
    
    if (!result) {
      return res.status(404).json({
        error: 'Health check not found',
        message: `No health check found with ID: ${id}`,
      });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to run health check:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to run health check',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Get health logs for a specific check
 */
router.get('/health/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const logs = await getHealthLogs(id, limit);
    res.json(logs);
  } catch (error) {
    logger.error('Failed to get health logs:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get health logs',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Get error rate data for dashboard
 */
router.get('/dashboard/error-rates', async (req, res) => {
  try {
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string, 10) : 24;
    const data = await dashboardService.getErrorRateData(timeRange);
    res.json(data);
  } catch (error) {
    logger.error('Failed to get error rate data:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get error rate data',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Get performance metrics for dashboard
 */
router.get('/dashboard/performance', async (req, res) => {
  try {
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string, 10) : 24;
    const data = await dashboardService.getPerformanceMetrics(timeRange);
    res.json(data);
  } catch (error) {
    logger.error('Failed to get performance metrics:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Get database performance metrics for dashboard
 */
router.get('/dashboard/database', async (req, res) => {
  try {
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string, 10) : 24;
    const data = await dashboardService.getDatabasePerformanceMetrics(timeRange);
    res.json(data);
  } catch (error) {
    logger.error('Failed to get database performance metrics:', isError(error) ? error : String(error));
    res.status(500).json({
      error: 'Failed to get database performance metrics',
      message: isError(error) ? error.message : String(error),
    });
  }
});

/**
 * Register monitoring routes with an Express app
 * @param app Express application
 */
export function registerMonitoringRoutes(app: any) {
  app.use('/api/monitoring', router);
  logger.info('Monitoring routes registered');
}

export default {
  router,
  registerMonitoringRoutes,
};
