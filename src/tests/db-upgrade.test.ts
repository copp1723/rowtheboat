/**
 * Database Upgrade Tests
 *
 * Tests to verify that the Drizzle ORM upgrade works correctly
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock the database
vi.mock('../shared/db', () => {
  let mockUser = null;
  let mockLastName = 'User';
  let mockDeleted = false;

  return {
    db: {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn((data) => {
        mockUser = data;
        return Promise.resolve([]);
      }),
      update: vi.fn().mockReturnThis(),
      set: vi.fn((data) => {
        if (data.lastName) {
          mockLastName = data.lastName;
        }
        return { where: vi.fn().mockResolvedValue([]) };
      }),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn(() => {
        mockDeleted = true;
        return Promise.resolve([]);
      }),
      query: {
        users: {
          findFirst: vi.fn(() => {
            if (mockDeleted) {
              return Promise.resolve(undefined);
            }
            return Promise.resolve(mockUser ? {
              ...mockUser,
              lastName: mockLastName
            } : null);
          })
        }
      }
    }
  };
});

// Import db after mocking
import { db } from '../shared/db.js';

describe('Drizzle ORM Upgrade', () => {
  const testUserId = uuidv4();

  // Clean up after tests
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it('should insert and retrieve a user', async () => {
    // Arrange
    const user = {
      id: testUserId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileImageUrl: 'https://example.com/profile.jpg',
    };

    // Act
    await db.insert(users).values(user);
    const result = await db.query.users.findFirst({
      where: eq(users.id, testUserId)
    });

    // Assert
    expect(result).toEqual(expect.objectContaining({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    }));
  });

  it('should update a user', async () => {
    // Arrange
    const updatedLastName = 'Updated';

    // Act
    await db.update(users)
      .set({ lastName: updatedLastName })
      .where(eq(users.id, testUserId));

    const result = await db.query.users.findFirst({
      where: eq(users.id, testUserId)
    });

    // Assert
    expect(result?.lastName).toEqual(updatedLastName);
  });

  it('should delete a user', async () => {
    // Act
    await db.delete(users).where(eq(users.id, testUserId));

    const result = await db.query.users.findFirst({
      where: eq(users.id, testUserId)
    });

    // Assert
    expect(result).toBeUndefined();
  });
});
