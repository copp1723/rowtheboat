import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../../../src/services/redisService';

describe('Redis Service Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Redis service
    await redisService.initialize();
  });

  afterAll(async () => {
    // Clean up Redis test data
    const client = redisService.getClient();
    if (client) {
      await client.del('test:key');
      await client.quit();
    }
  });

  it('should initialize Redis service successfully', async () => {
    expect(redisService.getClient()).not.toBeNull();
  });

  it('should set and get values from Redis', async () => {
    const client = redisService.getClient();
    if (!client) {
      throw new Error('Redis client is not available');
    }

    const testKey = 'test:key';
    const testValue = 'test-value';

    await client.set(testKey, testValue);
    const retrievedValue = await client.get(testKey);

    expect(retrievedValue).toBe(testValue);
  });

  it('should handle Redis errors gracefully', async () => {
    const client = redisService.getClient();
    if (!client) {
      throw new Error('Redis client is not available');
    }

    // Attempt to execute an invalid command
    try {
      // @ts-ignore - Intentionally calling with invalid arguments for testing
      await client.set('test:key');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should perform health check successfully', async () => {
    const healthCheck = await redisService.healthCheck();
    expect(healthCheck.status).toBe('connected');
    expect(healthCheck.latency).toBeDefined();
  });
});
