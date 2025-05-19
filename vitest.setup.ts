import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise from .env
dotenv.config({ path: '.env.test' });

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise during tests

// Mock global Date
const originalDate = global.Date;
vi.spyOn(global, 'Date').mockImplementation((arg) => {
  return arg ? new originalDate(arg) : new originalDate('2023-01-01T00:00:00Z');
});

// Clean up after all tests
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
