/**
 * Environment Variable Validator
 *
 * Validates required environment variables and prevents startup with default
 * or missing secrets in production environments.
 */
import { logger } from '../shared/logger.js';
import { logSecurityEvent } from './encryption.js';
// Default values that should not be used in production
const DEFAULT_VALUES = {
  // Encryption keys
  ENCRYPTION_KEY: [
    'default-dev-key-should-change-in-production',
    'default-dev-key-do-not-use-in-production-environment',
  ],
  // API keys
  SENDGRID_API_KEY: ['SG.your-sendgrid-api-key', 'test-sendgrid-api-key'],
  OPENAI_API_KEY: ['sk-your-openai-api-key', 'test-openai-api-key'],
  EKO_API_KEY: ['eko-your-api-key', 'test-eko-api-key'],
  // Database credentials
  DATABASE_URL: [
    'postgresql://user:password@localhost:5432/dbname',
    'postgresql://test:test@localhost:5432/test',
  ],
  // Email credentials
  OTP_EMAIL_USER: ['your_email_username', 'test@example.com'],
  OTP_EMAIL_PASS: ['your_email_password', 'test-password'],
  // CRM credentials
  VIN_SOLUTIONS_USERNAME: ['your_vinsolutions_username'],
  VIN_SOLUTIONS_PASSWORD: ['your_vinsolutions_password'],
  VAUTO_USERNAME: ['your_vauto_username'],
  VAUTO_PASSWORD: ['your_vauto_password'],
};
// Required environment variables by environment
const REQUIRED_VARS = {
  production: [
    'NODE_ENV',
    'ENCRYPTION_KEY',
    'DATABASE_URL',
    'SENDGRID_API_KEY',
    'OTP_EMAIL_USER',
    'OTP_EMAIL_PASS',
  ],
  development: ['DATABASE_URL'],
  test: ['DATABASE_URL'],
};
// Optional but recommended environment variables
const RECOMMENDED_VARS = {
  production: ['OPENAI_API_KEY', 'EKO_API_KEY'],
  development: ['ENCRYPTION_KEY', 'SENDGRID_API_KEY', 'OTP_EMAIL_USER', 'OTP_EMAIL_PASS'],
  test: [],
};
/**
 * Check if an environment variable has a default/insecure value
 *
 * @param key - Environment variable name
 * @param value - Environment variable value
 * @returns true if the value is a known default value
 */
function isDefaultValue(key: string, value: string): boolean {
  if (!value) return false;
  const defaults = DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES];
  if (!defaults) return false;
  return defaults.includes(value);
}
/**
 * Validate environment variables
 *
 * @param env - Environment object (defaults to process.env)
 * @param nodeEnv - Environment name (production, development, test)
 * @returns Validation result with missing and default variables
 */
export function validateEnv(
  env = process.env,
  nodeEnv = env.NODE_ENV || 'development'
): {
  valid: boolean;
  missing: string[];
  usingDefaults: string[];
  recommendations: string[];
} {
  const environment =
    nodeEnv === 'production' ? 'production' : nodeEnv === 'test' ? 'test' : 'development';
  const requiredVars = REQUIRED_VARS[environment as keyof typeof REQUIRED_VARS] || [];
  const recommendedVars = RECOMMENDED_VARS[environment as keyof typeof RECOMMENDED_VARS] || [];
  const missing: string[] = [];
  const usingDefaults: string[] = [];
  const recommendations: string[] = [];
  // Check required variables
  for (const key of requiredVars) {
    const value = env[key];
    if (!value) {
      missing.push(key);
    } else if (isDefaultValue(key, value)) {
      usingDefaults.push(key);
    }
  }
  // Check recommended variables
  for (const key of recommendedVars) {
    const value = env[key];
    if (!value) {
      recommendations.push(key);
    }
  }
  // In production, using defaults is treated as missing
  const valid =
    environment === 'production'
      ? missing.length === 0 && usingDefaults.length === 0
      : missing.length === 0;
  return {
    valid,
    missing,
    usingDefaults,
    recommendations,
  };
}
/**
 * Validate environment variables and exit if invalid in production
 *
 * @param env - Environment object (defaults to process.env)
 * @returns true if validation passed
 */
export function validateEnvOrExit(env = process.env): boolean {
  const nodeEnv = env.NODE_ENV || 'development';
  const result = validateEnv(env, nodeEnv);
  // Log validation results
  if (!result.valid) {
    if (result.missing.length > 0) {
      logger.error(`Missing required environment variables: ${result.missing.join(', ')}`);
    }
    if (result.usingDefaults.length > 0) {
      logger.error(`Using default values for: ${result.usingDefaults.join(', ')}`);
    }
    // Log security event
    logSecurityEvent(
      'env_validation_failed',
      undefined,
      {
        environment: nodeEnv,
        missing: result.missing,
        usingDefaults: result.usingDefaults,
      },
      'critical'
    ).catch((err) => {
      logger.error('Failed to log security event:', err);
    });
    // Exit in production
    if (nodeEnv === 'production') {
      logger.error('Exiting due to missing or default environment variables in production');
      process.exit(1);
    }
  }
  // Log recommendations
  if (result.recommendations.length > 0) {
    logger.warn(`Recommended environment variables not set: ${result.recommendations.join(', ')}`);
  }
  return result.valid;
}
/**
 * Get a validated environment variable
 *
 * @param key - Environment variable name
 * @param required - Whether the variable is required
 * @param defaultValue - Default value if not required and not set
 * @returns The environment variable value or default
 */
export function getValidatedEnv(
  key: string,
  required = false,
  defaultValue?: string
): string | undefined {
  const value = process.env[key];
  // Check if value exists
  if (!value) {
    if (required) {
      logger.error(`Required environment variable ${key} is not set`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    return defaultValue;
  }
  // Check if value is a default
  if (isDefaultValue(key, value)) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(`Environment variable ${key} is using a default value in production`);
      process.exit(1);
    } else {
      logger.warn(`Environment variable ${key} is using a default value`);
    }
  }
  return value;
}
// Export default values for testing
export { DEFAULT_VALUES, REQUIRED_VARS, RECOMMENDED_VARS };
