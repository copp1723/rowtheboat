/**
 * Security Initializer
 * 
 * Initializes all security-related services
 */
import { debug, info, warn, error } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { initializeKmsService } from './awsKmsService';
import { initializeKmsEncryption } from './kmsEncryptionService';
import { initializeKeyRotation } from './keyRotationService';
import { initializeSecurityMonitoring } from './securityMonitoringService';
import { runMigrations } from '../migrations/run-migrations.js';

/**
 * Initialize all security services
 * 
 * @param options - Configuration options
 * @returns true if initialization was successful
 */
export async function initializeSecurity(options?: {
  kms?: {
    enabled?: boolean;
    region?: string;
    keyId?: string;
    keyAlias?: string;
  };
  keyRotation?: {
    enabled?: boolean;
    schedule?: string;
    autoRotationDays?: number;
  };
  securityMonitoring?: {
    enabled?: boolean;
    schedule?: string;
    alertThresholds?: {
      failedLogins?: number;
      apiKeyCreation?: number;
      permissionDenied?: number;
      encryptionFailures?: number;
    };
  };
  runMigrations?: boolean;
}): Promise<boolean> {
  try {
    info('Initializing security services');

    // Run database migrations if requested
    if (options?.runMigrations) {
      info('Running database migrations');
      try {
        await runMigrations();
        info('Database migrations completed successfully');
      } catch (error) {
        const errorMessage = isError(error) ? error.message : String(error);
        error({
          event: 'migrations_error',
          error: errorMessage,
        }, `Failed to run database migrations: ${errorMessage}`);
        // Continue with initialization even if migrations fail
      }
    }

    // Initialize KMS service
    const kmsInitialized = await initializeKmsService({
      enabled: options?.kms?.enabled !== undefined 
        ? options.kms.enabled 
        : process.env.USE_AWS_KMS === 'true',
      region: options?.kms?.region || process.env.AWS_REGION,
      keyId: options?.kms?.keyId || process.env.AWS_KMS_KEY_ID,
      keyAlias: options?.kms?.keyAlias || process.env.AWS_KMS_KEY_ALIAS,
    });

    if (!kmsInitialized) {
      warn('KMS service initialization failed, using fallback encryption');
    }

    // Initialize KMS encryption
    const kmsEncryptionInitialized = await initializeKmsEncryption({
      enabled: options?.kms?.enabled !== undefined 
        ? options.kms.enabled 
        : process.env.USE_AWS_KMS === 'true',
      keyId: options?.kms?.keyId || process.env.AWS_KMS_KEY_ID,
      keyAlias: options?.kms?.keyAlias || process.env.AWS_KMS_KEY_ALIAS,
    });

    if (!kmsEncryptionInitialized) {
      warn('KMS encryption initialization failed, using fallback encryption');
    }

    // Initialize key rotation
    const keyRotationInitialized = await initializeKeyRotation({
      enabled: options?.keyRotation?.enabled !== undefined 
        ? options.keyRotation.enabled 
        : process.env.KEY_ROTATION_ENABLED === 'true',
      schedule: options?.keyRotation?.schedule || process.env.KEY_ROTATION_SCHEDULE,
      autoRotationDays: options?.keyRotation?.autoRotationDays || (
        process.env.KEY_ROTATION_DAYS 
          ? parseInt(process.env.KEY_ROTATION_DAYS, 10) 
          : undefined
      ),
    });

    if (!keyRotationInitialized) {
      warn('Key rotation initialization failed');
    }

    // Initialize security monitoring
    const securityMonitoringInitialized = await initializeSecurityMonitoring({
      enabled: options?.securityMonitoring?.enabled !== undefined 
        ? options.securityMonitoring.enabled 
        : process.env.SECURITY_MONITORING_ENABLED === 'true',
      schedule: options?.securityMonitoring?.schedule || process.env.SECURITY_MONITORING_SCHEDULE,
      alertThresholds: options?.securityMonitoring?.alertThresholds,
    });

    if (!securityMonitoringInitialized) {
      warn('Security monitoring initialization failed');
    }

    info('Security services initialization completed');
    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    error({
      event: 'security_initialization_error',
      error: errorMessage,
    }, `Failed to initialize security services: ${errorMessage}`);
    return false;
  }
}

// Export the initializer
export default {
  initializeSecurity,
};
