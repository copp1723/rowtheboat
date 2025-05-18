// src/api/server.ts
import express, { Request, Response } from 'express';
import { isError } from '../utils/errorUtils';
import { routeHandler } from '../utils/routeHandler';
import parseTask from '../services/taskParser';
import { getTaskLogs } from '../shared/logger';
import crypto from 'crypto';
import { registerAuthRoutes } from '../server/routes/index';
import { initializeJobQueue } from '../services/jobQueue';
import { initializeScheduler } from '../services/schedulerService';
import { initializeMailer } from '../services/mailerService';
import { startAllHealthChecks } from '../services/healthCheckScheduler';
import jobsRouter from '../server/routes/jobs';
import workflowsRouter from '../server/routes/workflows';
import { rateLimiters } from '../shared/middleware/rateLimiter';
import { errorHandlerMiddleware } from '../shared/errorHandler';
import { initializeEncryption } from '../utils/encryption';
import { logger } from '../shared/logger';
import config from '../config/index';
import { setupSwagger } from './middleware/swagger';
import * as monitoringService from '../services/monitoringService';
import { registerMonitoringMiddleware } from '../middleware/monitoringMiddleware';
import { registerMonitoringRoutes } from '../server/routes/monitoring';
import setDbContext from '../middleware/dbContextMiddleware';
import { performanceMonitoring } from '../middleware/performance';
import { taskLogs } from '../shared/schema';

// Log startup information
logger.info(
  {
    event: 'server_startup',
    environment: config.env,
    timestamp: new Date().toISOString(),
  },
  'Server starting with validated configuration'
);

async function startServer(): Promise<import('http').Server> {
  console.log('[1/5] Loading configuration...');
  const config = await loadConfig();

  console.log('[2/5] Initializing Express app...');
  const app = express();
  app.use(express.json());
  // Serve static files from the public directory
  app.use(express.static('public'));
  // Apply global rate limiter to all routes
  app.use(rateLimiters.api);
  // Set up Swagger UI for API documentation
  setupSwagger(app);
  // Apply performance monitoring middleware
  app.use(performanceMonitoring);

  console.log('[3/5] Applying middleware...');
  // Apply database context middleware for RLS
  app.use(setDbContext);

  console.log('[4/5] Setting up routes...');
  // Configure and register authentication routes
  (async () => {
    try {
      // Initialize monitoring services
      const monitoringStatus = await monitoringService.initialize();
      logger.info(`Monitoring services initialized: Sentry=${monitoringStatus.sentryInitialized}, DataDog=${monitoringStatus.datadogInitialized}`);

      // Start performance monitoring
      import { startPerformanceMonitoring } from '../services/performanceMonitor';
      startPerformanceMonitoring();
      logger.info('Performance monitoring started');

      // Initialize job queue service
      await initializeJobQueue();
      console.log('Job queue initialized');

      // Initialize the task scheduler
      await initializeScheduler();
      console.log('Task scheduler initialized');

      // Start health check schedulers
      startAllHealthChecks();
      console.log('Health check schedulers started');

      // Initialize email service if SendGrid API key is available
      if (config.apiKeys.sendgrid) {
        initializeMailer();
      } else {
        console.warn('SendGrid API key not found; email functionality will be limited');
      }

      // Register authentication and API routes
      await registerAuthRoutes(app);
      console.log('Authentication routes registered successfully');

      // Register job management routes
      app.use('/api/jobs', jobsRouter);

      // Register workflow routes
      app.use('/api/workflows', workflowsRouter);

      // Register monitoring routes
      registerMonitoringRoutes(app);
      console.log('Monitoring routes registered');

      console.log('Job management and workflow routes registered');
    } catch (error) {
      console.error('Failed to register routes:', error);
      // Track error in monitoring service
      monitoringService.trackError(error, { component: 'server_initialization' }, true);
    }
  })();

  // Set up routes
  const router = express.Router();
  // Health check
  router.get(
    '/health',
    rateLimiters.healthCheck,
    routeHandler(async (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'up',
        version: '1.0.0',
        message: 'API server is running',
      });
    })
  );
  // Test-parser endpoint
  router.post(
    '/test-parser',
    routeHandler(async (req: Request, res: Response) => {
      const task = req.body.task || '';
      // Pass the EKO API key from configuration
      const ekoApiKey = config.apiKeys.eko || '';
      const result = await parseTask(task, ekoApiKey);
      res.json(result);
    })
  );
  // Tasks listing endpoint
  router.get(
    '/tasks',
    routeHandler(async (_req: Request, res: Response) => {
      const tasks = await getTaskLogs('all');
      res.json(tasks);
    })
  );

  // Performance metrics endpoint
  router.get(
    '/performance',
    routeHandler(async (_req: Request, res: Response) => {
      // Import performance metrics functions
      const { getPerformanceMetrics } = await import('../middleware/performance');
      const { getSystemMetrics, getMetricsHistory } = await import('../services/performanceMonitor');

      // Get metrics
      const performanceMetrics = getPerformanceMetrics();
      const systemMetrics = getSystemMetrics();
      const metricsHistory = getMetricsHistory();

      // Return metrics
      res.json({
        performance: performanceMetrics,
        system: systemMetrics,
        history: metricsHistory.slice(-10), // Return only the last 10 metrics
      });
    })
  );
  // Register API routes
  app.use('/api', router);
  // Serve the index.html file for the root route
  app.get(
    '/',
    routeHandler((_req: Request, res: Response) => {
      res.sendFile('index.html', { root: './public' });
    })
  );
  // Import job queue and database dependencies
  import { enqueueJob } from '../services/jobQueue';
  import { db } from '../shared/db';
  // API endpoint to submit a new task
  app.post('/api/tasks', rateLimiters.taskSubmission, async (req: Request, res: Response) => {
    try {
      const { task } = req.body;
      if (!task || typeof task !== 'string') {
        return res.status(400).json({ error: 'Task is required and must be a string' });
      }
      // Parse the task to determine its type and parameters
      const parsedTask = await parseTask(task);
      // Generate task ID
      const taskId = crypto.randomUUID();
      // Create the task object and insert into database
      await // @ts-ignore
      db.insert(taskLogs).values({
        id: taskId,
        userId: req.user?.claims?.sub,
        taskType: parsedTask.type,
        taskText: task,
        taskData: parsedTask.parameters,
        status: 'pending',
      } as any); // @ts-ignore - Ensuring all required properties are provided;
      // Enqueue the task for processing with job queue
      const jobId = await enqueueJob(taskId);
      console.log(`Task ${taskId} submitted and enqueued as job ${jobId}`);
      // Return the task ID
      return res.status(201).json({
        id: taskId,
        jobId: jobId,
        message: 'Task submitted and enqueued successfully',
      });
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      console.error('Error in task submission:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : 'Unknown error',
      });
    }
  });
  // API endpoint for direct task execution
  app.post('/submit-task', rateLimiters.taskSubmission, async (req: Request, res: Response) => {
    try {
      const { task } = req.body;
      if (!task || typeof task !== 'string') {
        return res.status(400).json({ error: 'Task is required and must be a string' });
      }
      // Parse the task to determine its type and parameters
      const parsedTask = await parseTask(task);
      // Generate task ID
      const taskId = crypto.randomUUID();
      // Create the task object and insert into database
      await // @ts-ignore
      db.insert(taskLogs).values({
        id: taskId,
        userId: req.user?.claims?.sub,
        taskType: parsedTask.type,
        taskText: task,
        taskData: parsedTask.parameters,
        status: 'pending',
      } as any); // @ts-ignore - Ensuring all required properties are provided;
      // Enqueue the task with high priority (1 is highest)
      const jobId = await enqueueJob(taskId, 1);
      console.log(`Direct task ${taskId} submitted and enqueued as job ${jobId}`);
      // Return the task ID
      return res.status(201).json({
        id: taskId,
        jobId: jobId,
        message: 'Task submitted for immediate processing',
      });
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      console.error('Error in direct task execution:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : 'Unknown error',
      });
    }
  });
  // Add global error handler middleware
  app.use(errorHandlerMiddleware);

  console.log('[5/5] Starting server...');
  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info(`Server running on ${config.server.host}:${config.server.port}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });

  // Add error handler for server startup
  server.on('error', (err) => {
    console.error('Server failed to start:', err);
    monitoringService.trackError(err, { component: 'server_startup' }, true);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    // Shutdown monitoring services
    await monitoringService.shutdown();

    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  });

  return server;
}

export { startServer };
