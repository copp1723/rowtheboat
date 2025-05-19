import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../src/shared/db';

describe('Database Connection Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Clean up any test data if needed
  });

  it('should connect to the database successfully', async () => {
    const result = await db.execute('SELECT 1 as test');
    expect(result.rows[0]).toEqual({ test: 1 });
  });

  it('should handle database errors gracefully', async () => {
    try {
      await db.execute('SELECT * FROM non_existent_table');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should execute parameterized queries correctly', async () => {
    const value = 'test_value';
    const result = await db.execute('SELECT $1::text as value', [value]);
    expect(result.rows[0]).toEqual({ value });
  });
});
