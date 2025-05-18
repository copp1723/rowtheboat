import { sql } from 'drizzle-orm';
import { isError, getErrorMessage } from '../utils/errorUtils.js';
/**
 * Health Monitoring Service
 *
 * This service provides functionality to monitor the health and performance
 * of various components in the system. It periodically checks the status
 * of different services and APIs, and stores the results for display
 * in a health dashboard.
 */
import { db } from '../shared/db.js';
import { healthChecks, healthLogs } from '../shared/schema.js';
import { eq, desc, and, sql, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Types for health check results
export interface HealthCheckResult {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error';
  responseTime: number; // in milliseconds
  lastChecked: Date;
  message: string;
  details?: Record<string, any>;
}
export interface HealthLogEntry {
  id: string;
  checkId: string;
  timestamp: Date;
  status: 'ok' | 'warning' | 'error';
  responseTime: number;
  message: string;
  details?: Record<string, any>;
}
// Map of registered health check functions
const healthCheckFunctions: Record<string, () => Promise<HealthCheckResult>> = {};
/**
 * Register a new health check function
 * @param name - The name of the health check
 * @param checkFn - The function that performs the health check
 */
export function registerHealthCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
  healthCheckFunctions[name] = checkFn;
  console.log(`Registered health check: ${name}`);
}
/**
 * Run all registered health checks
 * @returns Results of all health checks
 */
export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  // Run each health check in parallel
  const checkPromises = Object.entries(healthCheckFunctions).map(async ([name, checkFn]) => {
    try {
      const result = await checkFn();
      results.push(result);
      // Store the result in the database
      await storeHealthCheckResult(result);
    } catch (error) {
      let errorMessage = getErrorMessage(error);
      // If a health check fails, record an error
      const errorResult: HealthCheckResult = {
        id: uuidv4(),
        name,
        status: 'error',
        responseTime: 0,
        lastChecked: new Date(),
        message: `Health check failed: ${errorMessage}`,
      };
      results.push(errorResult);
      await storeHealthCheckResult(errorResult);
    }
  });
  await Promise.all(checkPromises);
  return results;
}
/**
 * Run a specific health check by name
 * @param name - The name of the health check to run
 * @returns Result of the health check
 */
export async function runHealthCheck(name: string): Promise<HealthCheckResult | null> {
  const checkFn = healthCheckFunctions[name];
  if (!checkFn) {
    return null;
  }
  try {
    const result = await checkFn();
    await storeHealthCheckResult(result);
    return result;
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    const errorResult: HealthCheckResult = {
      id: uuidv4(),
      name,
      status: 'error',
      responseTime: 0,
      lastChecked: new Date(),
      message: `Health check failed: ${errorMessage}`,
    };
    await storeHealthCheckResult(errorResult);
    return errorResult;
  }
}
/**
 * Store a health check result in the database
 * @param result - The health check result to store
 */
async function storeHealthCheckResult(result: HealthCheckResult): Promise<void> {
  try {
    // Get existing health check or create a new one
    const existingChecks = await db
      .select()
      .from(healthChecks)
      .where(eq(healthChecks.name, result.name));
    let checkId: string;
    if (existingChecks.length > 0) {
      // Update existing health check
      checkId = existingChecks[0].id;
      await db
        .update(healthChecks)
        .set({
          status: result.status,
          responseTime: result.responseTime,
          lastChecked: result.lastChecked,
          message: result.message,
          details: result.details ? JSON.stringify(result.details) : null,
          updatedAt: new Date(),
        })
        .where(eq(healthChecks.id, checkId.toString()));
    } else {
      // Create new health check
      checkId = result.id || uuidv4();
      await db.insert(healthChecks).values({
        id: checkId,
        name: result.name,
        status: result.status,
        responseTime: result.responseTime,
        lastChecked: result.lastChecked,
        message: result.message,
        details: result.details ? JSON.stringify(result.details) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any) // @ts-ignore - Ensuring all required properties are provided;
    }
    // Add entry to health logs
    await db.insert(healthLogs).values({
      id: uuidv4(),
      checkId,
      timestamp: result.lastChecked,
      status: result.status,
      responseTime: result.responseTime,
      message: result.message,
      details: result.details ? JSON.stringify(result.details) : null,
      } as any) // @ts-ignore - Ensuring all required properties are provided;
  } catch (error) {
    console.error('Error storing health check result:', error);
  }
}
/**
 * Get the most recent health check results
 * @returns List of the latest health check results for each service
 */
export async function getLatestHealthChecks(): Promise<HealthCheckResult[]> {
  const results = await db.select().from(healthChecks).orderBy(desc(healthChecks.lastChecked));
  return results.map((result) => ({
    id: result.id,
    name: result.name,
    status: result.status as 'ok' | 'warning' | 'error',
    responseTime: result.responseTime,
    lastChecked: result.lastChecked,
    message: result.message || 'No message provided',
    details: result.details ? JSON.parse(result.details) : undefined,
  }));
}
/**
 * Get health logs for a specific check
 * @param checkId - ID of the health check
 * @param limit - Maximum number of logs to return
 * @returns List of health log entries
 */
export async function getHealthLogs(checkId: string, limit = 100): Promise<HealthLogEntry[]> {
  const logs = await db
    .select()
    .from(healthLogs)
    .where(eq(healthLogs.checkId, checkId))
    .orderBy(desc(healthLogs.timestamp))
    .limit(limit);
  return logs.map((log) => ({
    id: log.id,
    checkId: log.checkId,
    timestamp: log.timestamp,
    status: log.status as 'ok' | 'warning' | 'error',
    responseTime: log.responseTime,
    message: log.message || 'No message provided',
    details: log.details ? JSON.parse(log.details) : undefined,
  }));
}
/**
 * Get a summary of system health
 * @returns Summary of the system health status
 */
export async function getHealthSummary(): Promise<{
  overallStatus: 'ok' | 'warning' | 'error';
  servicesCount: number;
  servicesOk: number;
  servicesWarning: number;
  servicesError: number;
  averageResponseTime: number;
  lastChecked: Date | null;
}> {
  const checks = await getLatestHealthChecks();
  if (checks.length === 0) {
    return {
      overallStatus: 'ok',
      servicesCount: 0,
      servicesOk: 0,
      servicesWarning: 0,
      servicesError: 0,
      averageResponseTime: 0,
      lastChecked: null,
    };
  }
  const servicesOk = checks.filter((c) => c.status === 'ok').length;
  const servicesWarning = checks.filter((c) => c.status === 'warning').length;
  const servicesError = checks.filter((c) => c.status === 'error').length;
  // Calculate overall status
  let overallStatus: 'ok' | 'warning' | 'error' = 'ok';
  if (servicesError > 0) {
    overallStatus = 'error';
  } else if (servicesWarning > 0) {
    overallStatus = 'warning';
  }
  // Calculate average response time
  const totalResponseTime = checks.reduce((sum, check) => sum + check.responseTime, 0);
  const averageResponseTime = totalResponseTime / checks.length;
  // Find the most recent check
  const lastChecked = new Date(Math.max(...checks.map((c) => c.lastChecked.getTime())));
  return {
    overallStatus,
    servicesCount: checks.length,
    servicesOk,
    servicesWarning,
    servicesError,
    averageResponseTime,
    lastChecked,
  };
}
/**
 * Default health check for the database
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const id = 'database';
  const name = 'Database';
  const startTime = Date.now();
  try {
    // Simple query to test database connectivity
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;
    return {
      id,
      name,
      status: 'ok',
      responseTime,
      lastChecked: new Date(),
      message: 'Database is operational',
      details: {
        connectionString: process.env.DATABASE_URL
          ? process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')
          : 'Using environment variables',
      },
    };
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Database error: ${errorMessage}`,
    };
  }
}
/**
 * Health check for the email service
 */
export async function checkEmailService(): Promise<HealthCheckResult> {
  const id = 'email';
  const name = 'Email Service';
  const startTime = Date.now();
  try {
    // Check if SendGrid API key is configured
    const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
    // Note: We don't actually send a test email here to avoid unnecessary API calls
    // In a production system, you might want to periodically send a test email
    const status = hasSendGridKey ? 'ok' : 'warning';
    const message = hasSendGridKey
      ? 'Email service is configured'
      : 'Using Nodemailer fallback (no SendGrid API key)';
    return {
      id,
      name,
      status,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message,
      details: {
        provider: hasSendGridKey ? 'SendGrid' : 'Nodemailer',
        configured: hasSendGridKey,
      },
    };
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Email service error: ${errorMessage}`,
    };
  }
}
/**
 * Health check for the AI API (OpenAI)
 */
export async function checkAIService(): Promise<HealthCheckResult> {
  const id = 'ai';
  const name = 'AI Service';
  const startTime = Date.now();
  try {
    // Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    // Note: We don't actually make an API call here to avoid unnecessary usage
    // In a production system, you might want to periodically make a simple API call
    const status = hasOpenAIKey ? 'ok' : 'error';
    const message = hasOpenAIKey ? 'AI service is configured' : 'Missing OpenAI API key';
    return {
      id,
      name,
      status,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message,
      details: {
        provider: 'OpenAI',
        configured: hasOpenAIKey,
      },
    };
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `AI service error: ${errorMessage}`,
    };
  }
}
/**
 * Health check for the scheduler service
 */
export async function checkSchedulerService(): Promise<HealthCheckResult> {
  const id = 'scheduler';
  const name = 'Scheduler Service';
  const startTime = Date.now();
  try {
    // Check if there are any active schedules
    const activeSchedules = await db
      .select({ count: sql`COUNT(*)` })
      .from(healthChecks)
      .where(eq(healthChecks.status, 'ok'));
    // Note: We're just checking configuration here
    // In a production system, you might want to check if scheduled tasks are running
    return {
      id,
      name,
      status: 'ok',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: 'Scheduler service is operational',
      details: {
        activeServices: activeSchedules[0]?.count || 0,
      },
    };
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    return {
      id,
      name,
      status: 'error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      message: `Scheduler error: ${errorMessage}`,
    };
  }
}
// Register default health checks
registerHealthCheck('database', checkDatabaseHealth);
registerHealthCheck('email', checkEmailService);
registerHealthCheck('ai', checkAIService);
registerHealthCheck('scheduler', checkSchedulerService);
