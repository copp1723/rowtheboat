/**
 * Migration: Add API Key Security Fields
 * 
 * This migration adds security-related fields to the api_keys table:
 * - authTag: Authentication tag for GCM mode
 * - keyVersion: Version of the encryption key used
 * - permissions: RBAC permissions for this key
 * - role: Role for this key
 * - rotatedAt: When this key was last rotated
 * - rotationStatus: Status of key rotation
 * - previousKeyId: Reference to previous version of this key
 */
import { sql } from 'drizzle-orm';
import { db } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';

/**
 * Run the migration
 */
export async function migrate(): Promise<boolean> {
  try {
    logger.info('Starting migration: Add API Key Security Fields');

    // Check if the columns already exist
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'api_keys' AND column_name = 'key_version'
    `);

    // If the column already exists, skip the migration
    if (checkResult.length > 0) {
      logger.info('Migration already applied, skipping');
      return true;
    }

    // Add new columns to the api_keys table
    await db.execute(sql`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS auth_tag TEXT,
      ADD COLUMN IF NOT EXISTS key_version VARCHAR(20) DEFAULT 'v1',
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rotation_status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS previous_key_id UUID REFERENCES api_keys(id)
    `);

    // Create indexes for the new columns
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_api_keys_role ON api_keys(role);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_version ON api_keys(key_version);
      CREATE INDEX IF NOT EXISTS idx_api_keys_rotation_status ON api_keys(rotation_status);
    `);

    logger.info('Migration completed successfully: Add API Key Security Fields');
    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'migration_error',
      migration: 'add_api_key_security_fields',
      error: errorMessage,
    }, `Migration failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Rollback the migration
 */
export async function rollback(): Promise<boolean> {
  try {
    logger.info('Starting rollback: Add API Key Security Fields');

    // Drop the indexes
    await db.execute(sql`
      DROP INDEX IF EXISTS idx_api_keys_role;
      DROP INDEX IF EXISTS idx_api_keys_key_version;
      DROP INDEX IF EXISTS idx_api_keys_rotation_status;
    `);

    // Remove the columns
    await db.execute(sql`
      ALTER TABLE api_keys
      DROP COLUMN IF EXISTS auth_tag,
      DROP COLUMN IF EXISTS key_version,
      DROP COLUMN IF EXISTS permissions,
      DROP COLUMN IF EXISTS role,
      DROP COLUMN IF EXISTS rotated_at,
      DROP COLUMN IF EXISTS rotation_status,
      DROP COLUMN IF EXISTS previous_key_id
    `);

    logger.info('Rollback completed successfully: Add API Key Security Fields');
    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'migration_rollback_error',
      migration: 'add_api_key_security_fields',
      error: errorMessage,
    }, `Migration rollback failed: ${errorMessage}`);
    return false;
  }
}

// Export the migration
export default {
  name: 'add-api-key-security-fields',
  migrate,
  rollback,
};
