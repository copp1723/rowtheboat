/**
 * Database Connection Module
 *
 * This module provides a centralized database connection using Drizzle ORM with Postgres.
 * It handles connection configuration, error handling, and connection pooling.
 *
 * Features:
 * - Environment-based configuration
 * - Connection pooling with timeout settings
 * - Secure credential handling
 * - Graceful error handling
 * - Support for multiple deployment environments
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js/driver';
import postgres, { Sql } from 'postgres';
import dotenv from 'dotenv';
import { debug, info, warn, error } from './logger';
import { isError } from '../utils/errorUtils.js';
import * as schema from './schema';
import * as reportSchema from './report-schema';

// Load environment variables
dotenv.config();

/**
 * Database connection configuration interface
 */
interface DbConfig {
  /** Connection string or individual connection parameters */
  connectionString?: string;
  /** Host name */
  host?: string;
  /** Port number */
  port?: number | string;
  /** Database user */
  user?: string;
  /** User password */
  password?: string;
  /** Database name */
  database?: string;
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized: boolean };
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Idle timeout in milliseconds */
  idleTimeout?: number;
  /** Maximum connection lifetime in milliseconds */
  maxLifetime?: number;
  /** Application name for identification */
  applicationName?: string;
}

/**
 * Default database configuration
 */
const DEFAULT_CONFIG: DbConfig = {
  ssl: { rejectUnauthorized: false },
  connectionTimeout: 30000, // 30s connect timeout
  idleTimeout: 30000, // 30s idle timeout
  maxLifetime: 60 * 60000, // 60 min connection lifetime
  applicationName: 'ai-agent-backend',
};

/**
 * Get database configuration from environment variables
 *
 * @returns Database configuration object
 * @throws Error if no database connection information is available
 */
function getDatabaseConfig(): DbConfig {
  const config: DbConfig = { ...DEFAULT_CONFIG };

  // First try to use the DATABASE_URL environment variable
  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
    info('Using DATABASE_URL for database connection');
    return config;
  }

  // Then try to use individual PostgreSQL environment variables
  if (
    process.env.PGHOST &&
    process.env.PGPORT &&
    process.env.PGUSER &&
    process.env.PGPASSWORD &&
    process.env.PGDATABASE
  ) {
    config.host = process.env.PGHOST;
    config.port = parseInt(process.env.PGPORT, 10);
    config.user = process.env.PGUSER;
    config.password = process.env.PGPASSWORD;
    config.database = process.env.PGDATABASE;

    // Build connection string
    config.connectionString = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    info('Using PostgreSQL environment variables for database connection');
    return config;
  }

  // If we get here, we don't have enough information to connect
  throw new Error(
    'No database connection information available. Please set either DATABASE_URL or all of PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE environment variables.'
  );
}

/**
 * Create a database client with the given configuration
 *
 * @param config - Database configuration
 * @returns Postgres client
 */
function createDatabaseClient(config: DbConfig): Sql<{}> {
  if (!config.connectionString) {
    throw new Error('Connection string is required');
  }

  // Log connection attempt (masking password)
  const maskedConnectionString = config.connectionString.replace(/:[^:]+@/, ':***@');
  info(`Connecting to database: ${maskedConnectionString}`);

  // Create postgres client with connection options
  return postgres(config.connectionString, {
    ssl: config.ssl,
    timeout: config.connectionTimeout,
    idle_timeout: config.idleTimeout,
    max_lifetime: config.maxLifetime,
    connection: {
      application_name: config.applicationName,
    },
    onnotice: (notice) => {
      debug('PostgreSQL notice', {
        event: 'postgres_notice',
        message: notice.message,
        severity: notice.severity,
      });
    },
    debug: process.env.NODE_ENV === 'development',
  });
}

// Get database configuration
const dbConfig = getDatabaseConfig();

// Create postgres client
const client = createDatabaseClient(dbConfig);

// Combine all schemas
const combinedSchema = {
  ...schema,
  ...reportSchema
};

// Create and export the Drizzle DB instance
export const db = drizzle(client, {
  schema: combinedSchema
});

/**
 * Close the database connection
 * This should be called when the application is shutting down
 */
export async function closeDatabase(): Promise<void> {
  try {
    info('Closing database connection');
    await client.end();
    info('Database connection closed');
  } catch (err) {
    error('Database connection close error', {
      event: 'database_close_error',
      error: isError(err) ? err.message : String(err),
      stack: isError(err) ? err.stack : undefined,
    });
  }
}

// Handle process termination to close database connections
process.on('SIGINT', async () => {
  info('SIGINT received, closing database connection');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  info('SIGTERM received, closing database connection');
  await closeDatabase();
  process.exit(0);
});
