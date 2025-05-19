/**
 * Standardized Drizzle ORM Import Patterns
 *
 * This file provides standardized imports for Drizzle ORM to ensure consistency
 * across the codebase and prevent import path issues.
 */

// Import from the root drizzle-orm package
import { sql, and, eq, isNull, desc, gte, lte } from 'drizzle-orm';
export { sql, and, eq, isNull, desc, gte, lte };
export type { SQL } from 'drizzle-orm';

// Database types and functions
import { drizzle } from 'drizzle-orm/postgres-js';
export { drizzle };
export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Table definitions
export { pgTable, varchar, text, timestamp, jsonb, uuid, boolean, serial, integer, bigint, uniqueIndex, decimal, index } from 'drizzle-orm/pg-core';

// Type utilities - defined here to avoid import issues
import { type PgTable } from 'drizzle-orm/pg-core';

export type InferSelectModel<TTable extends PgTable> = {
  [K in keyof TTable['_']['columns']]?: unknown;
};

export type InferInsertModel<TTable extends PgTable> = {
  [K in keyof TTable['_']['columns']]?: unknown;
};

// Re-export schema for convenience
export * from '../shared/schema.js';
