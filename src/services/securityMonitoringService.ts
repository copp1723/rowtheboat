/**
 * Security Monitoring Service
 * 
 * Provides security monitoring and alerting functionality
 */
import { debug, info, warn, error } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { securityAuditLogs } from '../shared/schema.js';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import cron from 'node-cron';

// Security monitoring configuration
let securityMonitoringConfig = {
  enabled: process.env.SECURITY_MONITORING_ENABLED === 'true',
  schedule: process.env.SECURITY_MONITORING_SCHEDULE || '*/15 * * * *', // Every 15 minutes by default
  alertThresholds: {
    failedLogins: process.env.ALERT_THRESHOLD_FAILED_LOGINS ? 
      parseInt(process.env.ALERT_THRESHOLD_FAILED_LOGINS, 10) : 5,
    apiKeyCreation: process.env.ALERT_THRESHOLD_API_KEY_CREATION ? 
      parseInt(process.env.ALERT_THRESHOLD_API_KEY_CREATION, 10) : 3,
    permissionDenied: process.env.ALERT_THRESHOLD_PERMISSION_DENIED ? 
      parseInt(process.env.ALERT_THRESHOLD_PERMISSION_DENIED, 10) : 10,
    encryptionFailures: process.env.ALERT_THRESHOLD_ENCRYPTION_FAILURES ? 
      parseInt(process.env.ALERT_THRESHOLD_ENCRYPTION_FAILURES, 10) : 3,
  },
  timeWindowMinutes: process.env.SECURITY_MONITORING_WINDOW_MINUTES ? 
    parseInt(process.env.SECURITY_MONITORING_WINDOW_MINUTES, 10) : 60, // 1 hour by default
};

// Scheduled job reference
let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Initialize the security monitoring service
 * 
 * @param options - Configuration options
 * @returns true if initialization was successful
 */
export async function initializeSecurityMonitoring(options?: {
  enabled?: boolean;
  schedule?: string;
  alertThresholds?: {
    failedLogins?: number;
    apiKeyCreation?: number;
    permissionDenied?: number;
    encryptionFailures?: number;
  };
  timeWindowMinutes?: number;
}): Promise<boolean> {
  try {
    // Update configuration with provided options
    if (options) {
      securityMonitoringConfig = {
        ...securityMonitoringConfig,
        ...options,
        alertThresholds: {
          ...securityMonitoringConfig.alertThresholds,
          ...options.alertThresholds,
        },
      };
    }

    // Check if security monitoring is enabled
    if (!securityMonitoringConfig.enabled) {
      info('Security monitoring is disabled');
      return true;
    }

    // Validate cron schedule
    if (!cron.validate(securityMonitoringConfig.schedule)) {
      error(`Invalid cron schedule: ${securityMonitoringConfig.schedule}`);
      return false;
    }

    // Schedule security monitoring job
    scheduledJob = cron.schedule(securityMonitoringConfig.schedule, async () => {
      try {
        await checkSecurityEvents();
      } catch (error) {
        const errorMessage = isError(error) ? error.message : String(error);
        error({
          event: 'security_monitoring_error',
          error: errorMessage,
        }, `Scheduled security monitoring failed: ${errorMessage}`);
      }
    });

    // Log initialization
    info({
      event: 'security_monitoring_initialized',
      enabled: securityMonitoringConfig.enabled,
      schedule: securityMonitoringConfig.schedule,
      timeWindowMinutes: securityMonitoringConfig.timeWindowMinutes,
    }, 'Security monitoring service initialized');

    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'security_monitoring_initialization_error',
      error: errorMessage,
    }, `Failed to initialize security monitoring service: ${errorMessage}`);

    return false;
  }
}

/**
 * Check security events for potential issues
 */
async function checkSecurityEvents(): Promise<void> {
  try {
    debug('Running security event check');

    // Calculate the time window
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - securityMonitoringConfig.timeWindowMinutes);

    // Check for failed login attempts
    await checkFailedLogins(timeWindow);

    // Check for excessive API key creation
    await checkApiKeyCreation(timeWindow);

    // Check for permission denied events
    await checkPermissionDenied(timeWindow);

    // Check for encryption failures
    await checkEncryptionFailures(timeWindow);

    debug('Security event check completed');
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'security_event_check_error',
      error: errorMessage,
    }, `Failed to check security events: ${errorMessage}`);
  }
}

/**
 * Check for failed login attempts
 * 
 * @param timeWindow - Time window to check
 */
async function checkFailedLogins(timeWindow: Date): Promise<void> {
  try {
    // Count failed login attempts by IP address
    const failedLogins = await db
      .select({
        ipAddress: securityAuditLogs.ipAddress,
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'login_failed'),
          gte(securityAuditLogs.timestamp, timeWindow)
        )
      )
      .groupBy(securityAuditLogs.ipAddress)
      .having(count(), '>=', securityMonitoringConfig.alertThresholds.failedLogins);

    // Alert if any IP address exceeds the threshold
    if (failedLogins.length > 0) {
      for (const ip of failedLogins) {
        warn({
          event: 'security_alert_failed_logins',
          ipAddress: ip.ipAddress,
          count: ip.count,
          threshold: securityMonitoringConfig.alertThresholds.failedLogins,
          timeWindowMinutes: securityMonitoringConfig.timeWindowMinutes,
        }, `Security Alert: Excessive failed login attempts from IP ${ip.ipAddress}`);

        // In a real implementation, you would send an alert to administrators
        // For example, via email, Slack, or a monitoring system
      }
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'failed_logins_check_error',
      error: errorMessage,
    }, `Failed to check for failed logins: ${errorMessage}`);
  }
}

/**
 * Check for excessive API key creation
 * 
 * @param timeWindow - Time window to check
 */
async function checkApiKeyCreation(timeWindow: Date): Promise<void> {
  try {
    // Count API key creation events by user
    const apiKeyCreation = await db
      .select({
        userId: securityAuditLogs.userId,
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'api_key_created'),
          gte(securityAuditLogs.timestamp, timeWindow)
        )
      )
      .groupBy(securityAuditLogs.userId)
      .having(count(), '>=', securityMonitoringConfig.alertThresholds.apiKeyCreation);

    // Alert if any user exceeds the threshold
    if (apiKeyCreation.length > 0) {
      for (const user of apiKeyCreation) {
        warn({
          event: 'security_alert_api_key_creation',
          userId: user.userId,
          count: user.count,
          threshold: securityMonitoringConfig.alertThresholds.apiKeyCreation,
          timeWindowMinutes: securityMonitoringConfig.timeWindowMinutes,
        }, `Security Alert: Excessive API key creation by user ${user.userId}`);

        // In a real implementation, you would send an alert to administrators
      }
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'api_key_creation_check_error',
      error: errorMessage,
    }, `Failed to check for API key creation: ${errorMessage}`);
  }
}

/**
 * Check for permission denied events
 * 
 * @param timeWindow - Time window to check
 */
async function checkPermissionDenied(timeWindow: Date): Promise<void> {
  try {
    // Count permission denied events by user
    const permissionDenied = await db
      .select({
        userId: securityAuditLogs.userId,
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'permission_denied'),
          gte(securityAuditLogs.timestamp, timeWindow)
        )
      )
      .groupBy(securityAuditLogs.userId)
      .having(count(), '>=', securityMonitoringConfig.alertThresholds.permissionDenied);

    // Alert if any user exceeds the threshold
    if (permissionDenied.length > 0) {
      for (const user of permissionDenied) {
        warn({
          event: 'security_alert_permission_denied',
          userId: user.userId,
          count: user.count,
          threshold: securityMonitoringConfig.alertThresholds.permissionDenied,
          timeWindowMinutes: securityMonitoringConfig.timeWindowMinutes,
        }, `Security Alert: Excessive permission denied events for user ${user.userId}`);

        // In a real implementation, you would send an alert to administrators
      }
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'permission_denied_check_error',
      error: errorMessage,
    }, `Failed to check for permission denied events: ${errorMessage}`);
  }
}

/**
 * Check for encryption failures
 * 
 * @param timeWindow - Time window to check
 */
async function checkEncryptionFailures(timeWindow: Date): Promise<void> {
  try {
    // Count encryption failure events
    const encryptionFailures = await db
      .select({
        count: count(),
      })
      .from(securityAuditLogs)
      .where(
        and(
          eq(securityAuditLogs.eventType, 'encryption_failed'),
          gte(securityAuditLogs.timestamp, timeWindow)
        )
      );

    // Alert if the count exceeds the threshold
    if (encryptionFailures.length > 0 && encryptionFailures[0].count >= securityMonitoringConfig.alertThresholds.encryptionFailures) {
      warn({
        event: 'security_alert_encryption_failures',
        count: encryptionFailures[0].count,
        threshold: securityMonitoringConfig.alertThresholds.encryptionFailures,
        timeWindowMinutes: securityMonitoringConfig.timeWindowMinutes,
      }, `Security Alert: Excessive encryption failures detected`);

      // In a real implementation, you would send an alert to administrators
    }
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'encryption_failures_check_error',
      error: errorMessage,
    }, `Failed to check for encryption failures: ${errorMessage}`);
  }
}

/**
 * Stop the security monitoring service
 */
export function stopSecurityMonitoring(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    info('Security monitoring service stopped');
  }
}

// Export the service
export default {
  initializeSecurityMonitoring,
  stopSecurityMonitoring,
};
