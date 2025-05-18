/**
 * Monitoring Configuration
 *
 * This module provides configuration for monitoring and alerting services.
 */
import { z } from 'zod';
import { debug, info, warn, error } from '../shared/logger';

// Sentry configuration schema
export const SentryConfigSchema = z.object({
  dsn: z.string().optional(),
  environment: z.string().default('development'),
  tracesSampleRate: z.number().min(0).max(1).default(0.2),
  profilesSampleRate: z.number().min(0).max(1).default(0.1),
});
export type SentryConfig = z.infer<typeof SentryConfigSchema>;

// DataDog configuration schema
export const DataDogConfigSchema = z.object({
  apiKey: z.string().optional(),
  appKey: z.string().optional(),
  service: z.string().default('agentflow'),
  env: z.string().default('development'),
  host: z.string().default('localhost'),
  metricInterval: z.number().default(10),
});
export type DataDogConfig = z.infer<typeof DataDogConfigSchema>;

// Alert thresholds configuration schema
export const AlertThresholdsSchema = z.object({
  errorRate: z.number().min(0).max(1).default(0.05),
  dbQueryDuration: z.number().default(1000),
  apiResponseTime: z.number().default(2000),
  memoryUsage: z.number().default(800),
  cpuUsage: z.number().default(90),
});
export type AlertThresholds = z.infer<typeof AlertThresholdsSchema>;

// Monitoring configuration schema
export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sentry: SentryConfigSchema.default({}),
  datadog: DataDogConfigSchema.default({}),
  alertThresholds: AlertThresholdsSchema.default({}),
  adminEmails: z.array(z.string().email()).default([]),
});
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;

/**
 * Load monitoring configuration from environment variables
 */
export function loadMonitoringConfig(): MonitoringConfig {
  try {
    // Load Sentry configuration
    const sentryConfig = SentryConfigSchema.parse({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.2,
      profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
        : 0.1,
    });

    // Load DataDog configuration
    const datadogConfig = DataDogConfigSchema.parse({
      apiKey: process.env.DD_API_KEY,
      appKey: process.env.DD_APP_KEY,
      service: process.env.DD_SERVICE || 'agentflow',
      env: process.env.NODE_ENV || 'development',
      host: process.env.DD_AGENT_HOST || 'localhost',
      metricInterval: process.env.DD_METRIC_INTERVAL
        ? parseInt(process.env.DD_METRIC_INTERVAL, 10)
        : 10,
    });

    // Load alert thresholds
    const alertThresholds = AlertThresholdsSchema.parse({
      errorRate: process.env.ERROR_RATE_THRESHOLD
        ? parseFloat(process.env.ERROR_RATE_THRESHOLD)
        : 0.05,
      dbQueryDuration: process.env.DB_QUERY_DURATION_THRESHOLD
        ? parseInt(process.env.DB_QUERY_DURATION_THRESHOLD, 10)
        : 1000,
      apiResponseTime: process.env.API_RESPONSE_TIME_THRESHOLD
        ? parseInt(process.env.API_RESPONSE_TIME_THRESHOLD, 10)
        : 2000,
      memoryUsage: process.env.MEMORY_USAGE_THRESHOLD
        ? parseInt(process.env.MEMORY_USAGE_THRESHOLD, 10)
        : 800,
      cpuUsage: process.env.CPU_USAGE_THRESHOLD
        ? parseInt(process.env.CPU_USAGE_THRESHOLD, 10)
        : 90,
    });

    // Load admin emails
    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
      : [];

    // Combine all configurations
    return MonitoringConfigSchema.parse({
      enabled: process.env.MONITORING_ENABLED !== 'false',
      sentry: sentryConfig,
      datadog: datadogConfig,
      alertThresholds,
      adminEmails,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      error('Monitoring configuration validation failed:', {
        issues: err.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      error('Failed to load monitoring configuration:', err);
    }

    // Return default configuration
    return MonitoringConfigSchema.parse({});
  }
}

// Export the monitoring configuration
const monitoringConfig = loadMonitoringConfig();
export default monitoringConfig;
