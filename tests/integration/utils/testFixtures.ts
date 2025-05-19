import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../src/shared/db';

/**
 * Test fixtures for integration tests
 */

/**
 * Create a test user in the database
 * @returns Test user data
 */
export async function createTestUser() {
  const userId = uuidv4();
  const userData = {
    id: userId,
    email: `test-${userId}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.execute(
    `INSERT INTO users (id, email, first_name, last_name, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userData.id,
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.createdAt,
      userData.updatedAt,
    ]
  );

  return userData;
}

/**
 * Clean up test user from the database
 * @param userId User ID to clean up
 */
export async function cleanupTestUser(userId: string) {
  await db.execute('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Create test health check data
 * @returns Test health check data
 */
export function createTestHealthCheckData() {
  return [
    {
      name: 'database',
      status: 'ok',
      message: 'Database connection is healthy',
      responseTime: 5,
      lastChecked: new Date(),
      details: { connectionPool: 5 },
    },
    {
      name: 'redis',
      status: 'ok',
      message: 'Redis connection is healthy',
      responseTime: 3,
      lastChecked: new Date(),
      details: { usedMemory: '1.2MB' },
    },
    {
      name: 'email',
      status: 'warning',
      message: 'Email service is experiencing delays',
      responseTime: 150,
      lastChecked: new Date(),
      details: { queueSize: 10 },
    },
  ];
}
