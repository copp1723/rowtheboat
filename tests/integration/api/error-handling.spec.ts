import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { createTestServer, closeTestServer } from '../utils/testUtils';

describe('Error Handling Integration Tests', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    server = testServer.server;

    // Add a test route that throws an error
    app.get('/test/error', () => {
      throw new Error('Test error');
    });

    // Add a test route that returns a 404
    app.get('/test/not-found', (_req, res) => {
      res.status(404).json({ error: 'Resource not found' });
    });

    // Add a test route that simulates a database error
    app.get('/test/db-error', (_req, _res) => {
      const error = new Error('Database connection failed');
      (error as any).code = 'ECONNREFUSED';
      throw error;
    });

    // Add a test route that simulates a validation error
    app.get('/test/validation-error', (_req, _res) => {
      const error = new Error('Validation failed');
      (error as any).name = 'ValidationError';
      (error as any).details = [{ message: 'Field is required' }];
      throw error;
    });
  });

  afterAll(async () => {
    await closeTestServer(server);
  });

  it('should handle general errors with a 500 status code', async () => {
    const response = await request(app).get('/test/error');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Internal Server Error');
  });

  it('should handle 404 errors correctly', async () => {
    const response = await request(app).get('/test/not-found');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Resource not found');
  });

  it('should handle database connection errors appropriately', async () => {
    const response = await request(app).get('/test/db-error');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Database');
  });

  it('should handle validation errors with a 400 status code', async () => {
    const response = await request(app).get('/test/validation-error');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('details');
  });

  it('should handle non-existent routes with a 404', async () => {
    const response = await request(app).get('/this/route/does/not/exist');

    expect(response.status).toBe(404);
  });
});
