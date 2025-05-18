/**
 * Migration Runner
 * 
 * This script runs database migrations in sequence
 */
import { db } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import migrations
import addApiKeySecurityFields from './add-api-key-security-fields.js';

// List of migrations to run in order
const migrations = [
  addApiKeySecurityFields,
];

/**
 * Create migrations table if it doesn't exist
 */
async function ensureMigrationsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error(`Failed to create migrations table: ${errorMessage}`);
    throw error;
  }
}

/**
 * Check if a migration has been applied
 * 
 * @param name - Migration name
 * @returns true if the migration has been applied
 */
async function isMigrationApplied(name: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM migrations WHERE name = ${name}
    `);
    return result.length > 0;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error(`Failed to check migration status: ${errorMessage}`);
    throw error;
  }
}

/**
 * Record a migration as applied
 * 
 * @param name - Migration name
 */
async function recordMigration(name: string): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO migrations (name) VALUES (${name})
    `);
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error(`Failed to record migration: ${errorMessage}`);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Run each migration if not already applied
    for (const migration of migrations) {
      const { name, migrate } = migration;
      
      // Check if migration has already been applied
      const applied = await isMigrationApplied(name);
      if (applied) {
        logger.info(`Migration already applied: ${name}`);
        continue;
      }
      
      // Run the migration
      logger.info(`Applying migration: ${name}`);
      const success = await migrate();
      
      if (success) {
        // Record the migration as applied
        await recordMigration(name);
        logger.info(`Migration applied successfully: ${name}`);
      } else {
        logger.error(`Migration failed: ${name}`);
        throw new Error(`Migration failed: ${name}`);
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error(`Migration process failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error(`Migration failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the migrations if this file is executed directly
if (require.main === module) {
  main();
}

// Export for testing and programmatic use
export {
  runMigrations,
  ensureMigrationsTable,
  isMigrationApplied,
  recordMigration,
};
