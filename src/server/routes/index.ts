import { Express } from 'express';
import authRouter from './auth.js';
import credentialsRouter from './credentials.js';
import workflowRoutes from './workflows.js';
import scheduleRoutes from './schedules.js';
import { setupAuth } from '../replitAuth.js';
import emailRoutes from './emails.js';
/**
 * Register all auth and credential routes with the Express app
 * @param app Express application instance
 */
export async function registerAuthRoutes(app: Express): Promise<void> {
  // Set up authentication middleware and routes
  await setupAuth(app);
  // Register route handlers
  app.use('/api/auth', authRouter);
  app.use('/api/credentials', credentialsRouter);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/emails', emailRoutes);
  // Register schedule routes
  app.use('/api/schedules', scheduleRoutes);
  console.log('Auth, workflow, email, and schedule routes registered');
}
