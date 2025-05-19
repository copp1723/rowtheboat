import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Express } from 'express';
import { Server } from 'http';
import { createTestServer, closeTestServer } from '../utils/testUtils';

describe('Application Startup Integration Tests', () => {
  let app: Express;
  let server: Server;
  
  // Spy on initialization functions
  const loggerSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  
  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    server = testServer.server;
  });

  afterAll(async () => {
    await closeTestServer(server);
    vi.restoreAllMocks();
  });

  it('should initialize the application successfully', () => {
    expect(app).toBeDefined();
    expect(server).toBeDefined();
  });

  it('should log startup information', () => {
    // Check that startup logs were called
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should have registered essential routes', async () => {
    // Check that the app has the essential routes registered
    const routes = app._router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    // Check for health route
    const healthRoute = routes.find((r: any) => r.path === '/health');
    expect(healthRoute).toBeDefined();
    expect(healthRoute.methods).toContain('get');
  });

  it('should have registered middleware', () => {
    // Check that essential middleware is registered
    const middleware = app._router.stack
      .filter((layer: any) => !layer.route && layer.name)
      .map((layer: any) => layer.name);

    // Express middleware
    expect(middleware).toContain('json');
    expect(middleware).toContain('expressInit');
  });
});
