/**
 * Migration Service
 * 
 * This service manages database migrations, ensuring they are applied in the correct order
 * during application startup. It provides a robust system for tracking migration status
 * and handling migration failures.
 */
import { db } from '../shared/db';
import { sql } from 'drizzle-orm';
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for migrations
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'migrations');

// Migration interface
export interface Migration {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  migrate: () => Promise<boolean>;
  rollback?: () => Promise<boolean>;
}

// Migration status
export type MigrationStatus = 'pending' | 'applied' | 'failed';

// Migration result
export interface MigrationResult {
  id: string;
  name: string;
  status: MigrationStatus;
  appliedAt?: Date;
  duration?: number;
  error?: string;
}

// Migration options
export interface MigrationOptions {
  autoMigrate?: boolean;
  migrationTableName?: string;
  migrationDir?: string;
}

// Default migration options
const defaultOptions: MigrationOptions = {
  autoMigrate: true,
  migrationTableName: 'migrations',
  migrationDir: migrationsDir,
};

// Migration service class
export class MigrationService {
  private options: Required<MigrationOptions>;
  private migrations: Migration[] = [];
  private initialized = false;

  constructor(options: MigrationOptions = {}) {
    this.options = { ...defaultOptions, ...options } as Required<MigrationOptions>;
  }

  /**
   * Initialize the migration service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      info('Initializing migration service');
      await this.ensureMigrationsTable();
      this.initialized = true;
      info('Migration service initialized');
    } catch (err) {
      error('Failed to initialize migration service', {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Register a migration
   * @param migration Migration to register
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    debug(`Registered migration: ${migration.name}`);
  }

  /**
   * Register multiple migrations
   * @param migrations Migrations to register
   */
  registerMigrations(migrations: Migration[]): void {
    for (const migration of migrations) {
      this.registerMigration(migration);
    }
  }

  /**
   * Ensure the migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(this.options.migrationTableName)} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
          duration INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'applied'
        )
      `);
      debug(`Ensured migrations table exists: ${this.options.migrationTableName}`);
    } catch (err) {
      error('Failed to create migrations table', {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Check if a migration has been applied
   * @param id Migration ID
   * @returns Whether the migration has been applied
   */
  async isMigrationApplied(id: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM ${sql.identifier(this.options.migrationTableName)} 
        WHERE id = ${id} AND status = 'applied'
      `);
      return result.length > 0;
    } catch (err) {
      error(`Failed to check migration status for ${id}`, {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Record a migration as applied
   * @param migration Migration that was applied
   * @param duration Duration in milliseconds
   */
  private async recordMigration(
    migration: Migration,
    duration: number,
    status: MigrationStatus = 'applied',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO ${sql.identifier(this.options.migrationTableName)} 
        (id, name, description, applied_at, duration, status)
        VALUES (
          ${migration.id},
          ${migration.name},
          ${migration.description},
          NOW(),
          ${duration},
          ${status}
        )
        ON CONFLICT (id) 
        DO UPDATE SET
          applied_at = NOW(),
          duration = ${duration},
          status = ${status}
      `);
      debug(`Recorded migration ${migration.name} as ${status}`);
    } catch (err) {
      error(`Failed to record migration ${migration.name}`, {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      // Don't throw here, as we don't want to fail the entire migration process
      // if we can't record a single migration
    }
  }

  /**
   * Get all applied migrations
   * @returns List of applied migrations
   */
  async getAppliedMigrations(): Promise<{ id: string; name: string; appliedAt: Date }[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, name, applied_at as "appliedAt"
        FROM ${sql.identifier(this.options.migrationTableName)}
        WHERE status = 'applied'
        ORDER BY applied_at ASC
      `);
      return result as { id: string; name: string; appliedAt: Date }[];
    } catch (err) {
      error('Failed to get applied migrations', {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Get all pending migrations
   * @returns List of pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedIds = new Set(appliedMigrations.map((m) => m.id));
      
      // Sort migrations by timestamp
      const sortedMigrations = [...this.migrations].sort((a, b) => a.timestamp - b.timestamp);
      
      return sortedMigrations.filter((migration) => !appliedIds.has(migration.id));
    } catch (err) {
      error('Failed to get pending migrations', {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Run all pending migrations
   * @returns Results of all migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: MigrationResult[] = [];
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      info('No pending migrations to apply');
      return results;
    }

    info(`Running ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      const startTime = Date.now();
      let status: MigrationStatus = 'pending';
      let errorMessage: string | undefined;

      try {
        info(`Applying migration: ${migration.name}`);
        const success = await migration.migrate();
        
        if (success) {
          status = 'applied';
          info(`Migration applied successfully: ${migration.name}`);
        } else {
          status = 'failed';
          errorMessage = 'Migration returned false';
          error(`Migration failed: ${migration.name}`);
        }
      } catch (err) {
        status = 'failed';
        errorMessage = isError(err) ? err.message : String(err);
        error(`Migration failed with error: ${migration.name}`, {
          error: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }

      const duration = Date.now() - startTime;
      
      // Record the migration result
      if (status === 'applied') {
        await this.recordMigration(migration, duration);
      } else {
        await this.recordMigration(migration, duration, status, errorMessage);
      }

      results.push({
        id: migration.id,
        name: migration.name,
        status,
        appliedAt: new Date(),
        duration,
        error: errorMessage,
      });

      // If a migration fails, stop the process
      if (status === 'failed') {
        error(`Migration process stopped due to failure in ${migration.name}`);
        break;
      }
    }

    const appliedCount = results.filter((r) => r.status === 'applied').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    info(`Migration process completed: ${appliedCount} applied, ${failedCount} failed`);
    return results;
  }
}

// Create and export a singleton instance
export const migrationService = new MigrationService();
