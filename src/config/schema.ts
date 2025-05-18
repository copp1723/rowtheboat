/**
 * Configuration Schema
 * 
 * Defines Zod schemas for validating configuration values
 */
import { z } from 'zod';

// Environment enum
export const EnvironmentSchema = z.enum(['development', 'test', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

// Log level enum
export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'debug', 'trace']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

// Database configuration schema
export const DatabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  ssl: z.boolean().default(false),
  poolSize: z.coerce.number().min(1).default(10),
  connectionTimeout: z.coerce.number().min(1000).default(30000),
}).refine(
  (data) => data.url || (data.host && data.user && data.database),
  {
    message: "Either 'url' or 'host', 'user', and 'database' must be provided",
    path: ['url'],
  }
);
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Email configuration schema
export const EmailConfigSchema = z.object({
  host: z.string(),
  port: z.coerce.number().default(587),
  secure: z.boolean().default(true),
  user: z.string().email(),
  password: z.string(),
  fromName: z.string().default('AgentFlow'),
  fromEmail: z.string().email().optional(),
  sendgridApiKey: z.string().optional(),
});
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// OTP Email configuration schema
export const OtpEmailConfigSchema = z.object({
  host: z.string(),
  port: z.coerce.number().default(993),
  secure: z.boolean().default(true),
  user: z.string().email(),
  password: z.string(),
  pattern: z.string().default('OTP is: (\\d{6})'),
  subject: z.string().default('Your OTP Code'),
});
export type OtpEmailConfig = z.infer<typeof OtpEmailConfigSchema>;

// Security configuration schema
export const SecurityConfigSchema = z.object({
  encryptionKey: z.string().min(32),
  jwtSecret: z.string().min(32).optional(),
  sessionSecret: z.string().min(32).optional(),
  securityAuditLevel: LogLevelSchema.default('info'),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.coerce.number().default(60000), // 1 minute
    maxRequests: z.coerce.number().default(100), // 100 requests per minute
  }).default({}),
});
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// Server configuration schema
export const ServerConfigSchema = z.object({
  port: z.coerce.number().default(5000),
  host: z.string().default('0.0.0.0'),
  corsOrigins: z.array(z.string()).default(['*']),
  trustProxy: z.boolean().default(false),
  sessionDuration: z.coerce.number().default(86400000), // 24 hours in milliseconds
});
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Application configuration schema
export const AppConfigSchema = z.object({
  downloadDir: z.string().default('./downloads'),
  resultsDir: z.string().default('./results'),
  logLevel: LogLevelSchema.default('info'),
  logDir: z.string().default('./logs'),
  healthCheckInterval: z.coerce.number().default(15), // minutes
  adminEmails: z.array(z.string().email()).default([]),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

// API Keys configuration schema
export const ApiKeysConfigSchema = z.object({
  openai: z.string().optional(),
  eko: z.string().optional(),
  sendgrid: z.string().optional(),
});
export type ApiKeysConfig = z.infer<typeof ApiKeysConfigSchema>;

// Redis configuration schema
export const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().default(0),
  tls: z.boolean().default(false),
});
export type RedisConfig = z.infer<typeof RedisConfigSchema>;

// CRM credentials schema
export const CrmCredentialsSchema = z.object({
  vinSolutions: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  vauto: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
});
export 
// Complete configuration schema
export const ConfigSchema = z.object({
  env: EnvironmentSchema.default('development'),
  database: DatabaseConfigSchema,
  email: EmailConfigSchema.optional(),
  otpEmail: OtpEmailConfigSchema.optional(),
  security: SecurityConfigSchema,
  server: ServerConfigSchema.default({}),
  app: AppConfigSchema.default({}),
  apiKeys: ApiKeysConfigSchema.default({}),
  redis: RedisConfigSchema.optional(),
  crmCredentials: CrmCredentialsSchema.default({}),
});
export type Config = z.infer<typeof ConfigSchema>;
