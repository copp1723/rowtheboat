/**
 * Configuration Module
 * 
 * Provides a centralized, type-safe configuration system with validation
 * using Zod schemas and support for different environments.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '../shared/logger.js';
import { 
  ConfigSchema, 
  DatabaseConfigSchema, 
  EmailConfigSchema, 
  OtpEmailConfigSchema,
  SecurityConfigSchema,
  ServerConfigSchema,
  AppConfigSchema,
  ApiKeysConfigSchema,
  RedisConfigSchema,
  CrmCredentialsSchema,
  Environment,
  Config
} from './schema.js';
import { 
  DEFAULT_ENV, 
  DEFAULT_LOG_LEVELS,
  DEFAULT_DATABASE,
  DEFAULT_SERVER,
  DEFAULT_APP,
  DEFAULT_SECURITY,
  DEFAULT_EMAIL,
  DEFAULT_OTP_EMAIL,
  DEFAULT_REDIS,
  REQUIRED_VARS
} from './defaults.js';
import { initializeSecrets, isDefaultValue } from './secrets.js';

// Load environment variables from .env file
dotenv.config();

// Determine the current environment
const env = (process.env.NODE_ENV || DEFAULT_ENV) as Environment;

/**
 * Load and validate configuration
 * 
 * @returns Validated configuration object
 */
function loadConfig(): Config {
  try {
    // Database configuration
    const database = loadDatabaseConfig();
    
    // Email configuration
    const email = loadEmailConfig();
    
    // OTP Email configuration
    const otpEmail = loadOtpEmailConfig();
    
    // Security configuration
    const security = loadSecurityConfig();
    
    // Server configuration
    const server = loadServerConfig();
    
    // Application configuration
    const app = loadAppConfig();
    
    // API Keys configuration
    const apiKeys = loadApiKeysConfig();
    
    // Redis configuration
    const redis = loadRedisConfig();
    
    // CRM credentials
    const crmCredentials = loadCrmCredentialsConfig();
    
    // Combine all configurations
    const config = ConfigSchema.parse({
      env,
      database,
      email,
      otpEmail,
      security,
      server,
      app,
      apiKeys,
      redis,
      crmCredentials
    });
    
    // Initialize secrets with the encryption key
    if (security.encryptionKey) {
      initializeSecrets(security.encryptionKey);
    }
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed:', {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      logger.error('Failed to load configuration:', error);
    }
    
    // In production, exit the process if configuration is invalid
    if (env === 'production') {
      logger.error('Exiting due to invalid configuration in production environment');
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Load database configuration from environment variables
 */
function loadDatabaseConfig() {
  return DatabaseConfigSchema.parse({
    url: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true',
    poolSize: process.env.PG_POOL_SIZE ? parseInt(process.env.PG_POOL_SIZE, 10) : DEFAULT_DATABASE.poolSize,
    connectionTimeout: process.env.PG_CONNECTION_TIMEOUT ? 
      parseInt(process.env.PG_CONNECTION_TIMEOUT, 10) : DEFAULT_DATABASE.connectionTimeout,
  });
}

/**
 * Load email configuration from environment variables
 */
function loadEmailConfig() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (env === 'production') {
      logger.warn('Email configuration is incomplete. Email functionality may not work correctly.');
    }
    return undefined;
  }
  
  return EmailConfigSchema.parse({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : DEFAULT_EMAIL.port,
    secure: process.env.EMAIL_TLS !== 'false',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    fromName: process.env.EMAIL_FROM_NAME || DEFAULT_EMAIL.fromName,
    fromEmail: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
  });
}

/**
 * Load OTP email configuration from environment variables
 */
function loadOtpEmailConfig() {
  if (!process.env.OTP_EMAIL_USER || !process.env.OTP_EMAIL_PASS) {
    if (env === 'production') {
      logger.warn('OTP email configuration is incomplete. OTP functionality may not work correctly.');
    }
    return undefined;
  }
  
  return OtpEmailConfigSchema.parse({
    host: process.env.OTP_EMAIL_HOST || process.env.EMAIL_HOST,
    port: process.env.OTP_EMAIL_PORT ? 
      parseInt(process.env.OTP_EMAIL_PORT, 10) : 
      (process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : DEFAULT_OTP_EMAIL.port),
    secure: process.env.OTP_EMAIL_TLS !== 'false',
    user: process.env.OTP_EMAIL_USER,
    password: process.env.OTP_EMAIL_PASS,
    pattern: process.env.OTP_PATTERN || DEFAULT_OTP_EMAIL.pattern,
    subject: process.env.OTP_SUBJECT || DEFAULT_OTP_EMAIL.subject,
  });
}

/**
 * Load security configuration from environment variables
 */
function loadSecurityConfig() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  // Check if encryption key is a default value in production
  if (env === 'production' && encryptionKey && isDefaultValue('ENCRYPTION_KEY', encryptionKey)) {
    logger.error('Using a default encryption key in production. This is a security risk.');
    throw new Error('Default encryption key detected in production environment');
  }
  
  return SecurityConfigSchema.parse({
    encryptionKey: encryptionKey || '',
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    securityAuditLevel: (process.env.SECURITY_AUDIT_LEVEL || DEFAULT_SECURITY.securityAuditLevel) as any,
    rateLimiting: {
      enabled: process.env.RATE_LIMITING !== 'false',
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? 
        parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : DEFAULT_SECURITY.rateLimiting.windowMs,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? 
        parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : DEFAULT_SECURITY.rateLimiting.maxRequests,
    },
  });
}

/**
 * Load server configuration from environment variables
 */
function loadServerConfig() {
  return ServerConfigSchema.parse({
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_SERVER.port,
    host: process.env.HOST || DEFAULT_SERVER.host,
    corsOrigins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : DEFAULT_SERVER.corsOrigins,
    trustProxy: process.env.TRUST_PROXY === 'true',
    sessionDuration: process.env.SESSION_DURATION ? 
      parseInt(process.env.SESSION_DURATION, 10) : DEFAULT_SERVER.sessionDuration,
  });
}

/**
 * Load application configuration from environment variables
 */
function loadAppConfig() {
  return AppConfigSchema.parse({
    downloadDir: process.env.DOWNLOAD_DIR || DEFAULT_APP.downloadDir,
    resultsDir: process.env.RESULTS_DIR || DEFAULT_APP.resultsDir,
    logLevel: (process.env.LOG_LEVEL || DEFAULT_LOG_LEVELS[env]) as any,
    logDir: process.env.LOG_DIR || DEFAULT_APP.logDir,
    healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL ? 
      parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) : DEFAULT_APP.healthCheckInterval,
    adminEmails: process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : [],
  });
}

/**
 * Load API keys configuration from environment variables
 */
function loadApiKeysConfig() {
  return ApiKeysConfigSchema.parse({
    openai: process.env.OPENAI_API_KEY,
    eko: process.env.EKO_API_KEY,
    sendgrid: process.env.SENDGRID_API_KEY,
  });
}

/**
 * Load Redis configuration from environment variables
 */
function loadRedisConfig() {
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    return undefined;
  }
  
  // Parse Redis URL if provided
  let host = DEFAULT_REDIS.host;
  let port = DEFAULT_REDIS.port;
  let password = undefined;
  let tls = DEFAULT_REDIS.tls;
  
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      host = url.hostname;
      port = parseInt(url.port || '6379', 10);
      password = url.password;
      tls = url.protocol === 'rediss:';
    } catch (error) {
      logger.warn('Failed to parse REDIS_URL, using individual settings instead');
    }
  }
  
  return RedisConfigSchema.parse({
    host: process.env.REDIS_HOST || host,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : port,
    password: process.env.REDIS_PASSWORD || password,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : DEFAULT_REDIS.db,
    tls: process.env.REDIS_TLS === 'true' || tls,
  });
}

/**
 * Load CRM credentials from environment variables
 */
function loadCrmCredentialsConfig() {
  return CrmCredentialsSchema.parse({
    vinSolutions: {
      username: process.env.VIN_SOLUTIONS_USERNAME,
      password: process.env.VIN_SOLUTIONS_PASSWORD,
    },
    vauto: {
      username: process.env.VAUTO_USERNAME,
      password: process.env.VAUTO_PASSWORD,
    },
  });
}

/**
 * Validate required environment variables
 * 
 * @returns Validation result with missing variables
 */
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const requiredVars = REQUIRED_VARS[env as keyof typeof REQUIRED_VARS] || [];
  const missing = requiredVars.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// Load and validate configuration
const config = loadConfig();

// Export the configuration
export default config;

// Export individual configuration sections for convenience
export const database = config.database;
export const email = config.email;
export const otpEmail = config.otpEmail;
export const security = config.security;
export const server = config.server;
export const app = config.app;
export const apiKeys = config.apiKeys;
export const redis = config.redis;
export const crmCredentials = config.crmCredentials;
