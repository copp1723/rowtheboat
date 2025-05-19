/**
 * Configuration Module Type Declarations
 * 
 * This file provides TypeScript type declarations for the configuration module.
 */
import {
  Config,
  DatabaseConfig,
  EmailConfig,
  OtpEmailConfig,
  SecurityConfig,
  ServerConfig,
  AppConfig,
  ApiKeysConfig,
  RedisConfig,
  CrmCredentialsConfig,
  Environment
} from './schema';

/**
 * Load and validate configuration
 * 
 * @returns Validated configuration object
 */
export function loadConfig(): Config;

/**
 * Validate required environment variables
 * 
 * @returns Validation result with missing variables
 */
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] };

/**
 * Configuration object
 */
declare const config: Config;

// Export the configuration
export default config;

// Export individual configuration sections
export const database: DatabaseConfig;
export const email: EmailConfig | undefined;
export const otpEmail: OtpEmailConfig | undefined;
export const security: SecurityConfig;
export const server: ServerConfig;
export const app: AppConfig;
export const apiKeys: ApiKeysConfig;
export const redis: RedisConfig | undefined;
export const crmCredentials: CrmCredentialsConfig;
