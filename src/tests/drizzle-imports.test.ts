/**
 * Drizzle ORM Import Pattern Tests
 *
 * This file tests the standardized import patterns for Drizzle ORM
 * to ensure they work correctly across the codebase.
 */

import { describe, test, expect } from 'vitest';

// Import from our standardized import file
import {
  // Runtime helpers
  sql,
  and,
  eq,
  isNull,

  // Type utilities
  type InferSelectModel,
  type InferInsertModel,

  // Database types
  type PostgresJsDatabase,

  // Table definitions
  pgTable,
  varchar,

  // Schema exports
  users,
  credentials,
  taskLogs,
  jobs,
  workflows,
  schedules,
  emailQueue,
  healthChecks,
  healthLogs,
  dealerCredentials,
  apiKeys,
  securityAuditLogs,
  userCredentials,
  circuitBreakerState,
  imapFilters
} from '../utils/drizzleImports.js';

describe('Drizzle ORM Import Patterns', () => {
  test('Runtime helpers should be properly imported', () => {
    // Test runtime helpers
    const testSql = sql`SELECT * FROM users WHERE id = ${123}`;
    const testAnd = and(eq(users.id, '123'), isNull(users.email));

    expect(sql).toBeDefined();
    expect(and).toBeDefined();
    expect(eq).toBeDefined();
    expect(isNull).toBeDefined();
    expect(testSql).toBeDefined();
    expect(testAnd).toBeDefined();
  });

  test('Table definitions should be properly imported', () => {
    // Test table definitions
    const testTable = pgTable('test_table', {
      // Use the same column types as the users table
      id: varchar('id').primaryKey().notNull(),
      name: varchar('name')
    });

    expect(pgTable).toBeDefined();
    expect(varchar).toBeDefined();
    expect(testTable).toBeDefined();
    // Access the table name using Symbol
    expect(testTable[Symbol.for('drizzle:Name')]).toBe('test_table');
  });

  test('Schema exports should be available', () => {
    expect(users).toBeDefined();
    expect(credentials).toBeDefined();
    expect(taskLogs).toBeDefined();
    expect(jobs).toBeDefined();
    expect(workflows).toBeDefined();
    expect(schedules).toBeDefined();
    expect(emailQueue).toBeDefined();
    expect(healthChecks).toBeDefined();
    expect(healthLogs).toBeDefined();
    expect(dealerCredentials).toBeDefined();
    expect(apiKeys).toBeDefined();
    expect(securityAuditLogs).toBeDefined();
    expect(userCredentials).toBeDefined();
    expect(circuitBreakerState).toBeDefined();
    expect(imapFilters).toBeDefined();
  });
});
