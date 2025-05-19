import { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { Redis } from 'ioredis';
import { db } from '../../../src/shared/db';
import { redisService } from '../../../src/services/redisService';

/**
 * Test utilities for integration tests
 */

/**
 * Create a test server instance
 * @returns Promise resolving to the Express app and HTTP server
 */
export async function createTestServer(): Promise<{
  app: Express;
  server: Server;
}> {
  // Dynamic import to avoid loading the server during test setup
  const { default: startServer } = await import('../../../src/api/server');
  const { app, server } = await startServer();
  return { app, server };
}

/**
 * Close a test server instance
 * @param server HTTP server to close
 */
export async function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get a Redis client for testing
 * @returns Redis client
 */
export function getRedisClient(): Redis | null {
  return redisService.getClient();
}

/**
 * Clean up test data from the database
 * @param tableName Table to clean
 * @param condition SQL condition for deletion
 */
export async function cleanupTestData(
  tableName: string,
  condition: string
): Promise<void> {
  await db.execute(`DELETE FROM ${tableName} WHERE ${condition}`);
}

/**
 * Make an authenticated request to the API
 * @param app Express app
 * @param method HTTP method
 * @param url URL to request
 * @param token Authentication token
 * @param data Request body data
 * @returns SuperTest response
 */
export async function authenticatedRequest(
  app: Express,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  token: string,
  data?: Record<string, unknown>
): Promise<request.Response> {
  const req = request(app)[method](url).set('Authorization', `Bearer ${token}`);
  
  if (data && (method === 'post' || method === 'put')) {
    return req.send(data);
  }
  
  return req;
}

/**
 * Generate a test authentication token
 * @param userId User ID to include in the token
 * @returns JWT token
 */
export async function generateTestToken(userId: string): Promise<string> {
  const { generateToken } = await import('../../../src/utils/auth');
  return generateToken({ id: userId, role: 'user' });
}
