/**
 * Default Configuration Values
 * 
 * Provides default values for configuration options
 * These values are used when environment variables are not set
 */
import { Environment, LogLevel } from './schema';

// Default environment
export const DEFAULT_ENV: Environment = 'development';

// Default log level by environment
export const DEFAULT_LOG_LEVELS: Record<Environment, LogLevel> = {
  development: 'debug',
  test: 'error',
  production: 'info',
};

// Default database configuration
export const DEFAULT_DATABASE = {
  poolSize: 10,
  connectionTimeout: 30000,
  ssl: false,
};

// Default server configuration
export const DEFAULT_SERVER = {
  port: 5000,
  host: '0.0.0.0',
  corsOrigins: ['*'],
  trustProxy: false,
  sessionDuration: 86400000, // 24 hours in milliseconds
};

// Default application configuration
export const DEFAULT_APP = {
  downloadDir: './downloads',
  resultsDir: './results',
  logDir: './logs',
  healthCheckInterval: 15, // minutes
};

// Default security configuration
export const DEFAULT_SECURITY = {
  securityAuditLevel: 'info' as LogLevel,
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

// Default email configuration
export const DEFAULT_EMAIL = {
  port: 587,
  secure: true,
  fromName: 'AgentFlow',
};

// Default OTP email configuration
export const DEFAULT_OTP_EMAIL = {
  port: 993,
  secure: true,
  pattern: 'OTP is: (\\d{6})',
  subject: 'Your OTP Code',
};

// Default Redis configuration
export const DEFAULT_REDIS = {
  host: 'localhost',
  port: 6379,
  db: 0,
  tls: false,
};

// Known default values that should not be used in production
export const INSECURE_DEFAULT_VALUES = {
  // Encryption keys
  ENCRYPTION_KEY: [
    'default-dev-key-should-change-in-production',
    'default-dev-key-do-not-use-in-production-environment',
    'temporary-encryption-key',
  ],
  
  // API keys
  SENDGRID_API_KEY: [
    'SG.your-sendgrid-api-key',
    'test-sendgrid-api-key',
  ],
  OPENAI_API_KEY: [
    'sk-your-openai-api-key',
    'test-openai-api-key',
    'sk_test_',
  ],
  EKO_API_KEY: [
    'eko-your-api-key',
    'test-eko-api-key',
  ],
  
  // Database credentials
  DATABASE_URL: [
    'postgresql://user:password@localhost:5432/dbname',
    'postgresql://test:test@localhost:5432/test',
  ],
  
  // Email credentials
  OTP_EMAIL_USER: [
    'your_email_username',
    'test@example.com',
  ],
  OTP_EMAIL_PASS: [
    'your_email_password',
    'test-password',
  ],
  
  // JWT and session secrets
  JWT_SECRET: [
    'your-jwt-secret-key-should-be-long-and-secure',
    'development-jwt-secret-key',
  ],
  SESSION_SECRET: [
    'your-session-secret-key-should-be-long-and-secure',
    'development-session-secret-key',
  ],
};

// Required environment variables by environment
export const REQUIRED_VARS = {
  production: [
    'NODE_ENV',
    'ENCRYPTION_KEY',
    'DATABASE_URL',
  ],
  development: [
    'DATABASE_URL',
  ],
  test: [
    'DATABASE_URL',
  ],
};
