import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { createTestServer, closeTestServer } from '../utils/testUtils';
import { createTestHealthCheckData } from '../utils/testFixtures';

describe('Health API Integration Tests', () => {
  let app: Express;
  let server: Server;
  const healthData = createTestHealthCheckData();

  // Mock health service
  vi.mock('../../../src/services/healthService', () => ({
    getHealthSummary: vi.fn().mockResolvedValue({
      overallStatus: 'ok',
      services: {
        database: 'ok',
        redis: 'ok',
        email: 'warning',
      },
      lastUpdated: new Date(),
    }),
    getLatestHealthChecks: vi.fn().mockResolvedValue(healthData),
  }));

  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    server = testServer.server;
  });

  afterAll(async () => {
    await closeTestServer(server);
    vi.restoreAllMocks();
  });

  it('should return 200 and health status from /health endpoint', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('overallStatus', 'ok');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('checks');
    expect(Array.isArray(response.body.checks)).toBe(true);
  });

  it('should return detailed health information from /api/health/summary endpoint', async () => {
    const response = await request(app).get('/api/health/summary');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('overallStatus', 'ok');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database', 'ok');
    expect(response.body.services).toHaveProperty('redis', 'ok');
    expect(response.body.services).toHaveProperty('email', 'warning');
  });

  it('should handle errors gracefully', async () => {
    // Mock an error in the health service
    const { getHealthSummary } = await import('../../../src/services/healthService');
    vi.mocked(getHealthSummary).mockRejectedValueOnce(new Error('Test error'));

    const response = await request(app).get('/api/health/summary');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
