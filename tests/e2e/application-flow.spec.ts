import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { createTestServer, closeTestServer, generateTestToken } from '../integration/utils/testUtils';
import { createTestUser, cleanupTestUser } from '../integration/utils/testFixtures';

describe('End-to-End Application Flow Tests', () => {
  let app: Express;
  let server: Server;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    const testServer = await createTestServer();
    app = testServer.app;
    server = testServer.server;

    // Create a test user
    testUser = await createTestUser();
    authToken = await generateTestToken(testUser.id);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestUser(testUser.id);
    await closeTestServer(server);
  });

  it('should verify system health before proceeding', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.overallStatus).toBe('ok');
  });

  it('should authenticate with valid credentials', async () => {
    // This test simulates a login flow
    // In a real test, you would use actual credentials
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123', // Mock password
      });

    // Since we're mocking, we'll just check the token is present
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should access protected resources with valid token', async () => {
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', testUser.id);
  });

  it('should reject access to protected resources without valid token', async () => {
    const response = await request(app)
      .get('/api/user/profile');

    expect(response.status).toBe(401);
  });

  it('should handle data creation, retrieval, update, and deletion', async () => {
    // Create a test resource
    const resourceId = uuidv4();
    const createResponse = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        id: resourceId,
        name: 'Test Resource',
        description: 'This is a test resource',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toHaveProperty('id', resourceId);

    // Retrieve the created resource
    const getResponse = await request(app)
      .get(`/api/resources/${resourceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toHaveProperty('id', resourceId);
    expect(getResponse.body).toHaveProperty('name', 'Test Resource');

    // Update the resource
    const updateResponse = await request(app)
      .put(`/api/resources/${resourceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Resource',
        description: 'This resource has been updated',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toHaveProperty('name', 'Updated Resource');

    // Delete the resource
    const deleteResponse = await request(app)
      .delete(`/api/resources/${resourceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteResponse.status).toBe(204);

    // Verify the resource is deleted
    const verifyResponse = await request(app)
      .get(`/api/resources/${resourceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(verifyResponse.status).toBe(404);
  });
});
