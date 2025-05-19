/**
 * Migration Runner
 *
 * This module provides functionality to run database migrations during application startup.
 * It integrates with the MigrationService to ensure all migrations are applied in the correct order.
 */
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';
import { migrationService, Migration } from '../services/migrationService';
import { db } from '../shared/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for migrations
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import migrations
import addApiKeySecurityFields from './add-api-key-security-fields';

// List of migrations to register
const migrations: Migration[] = [
  {
    id: 'add-api-key-security-fields',
    name: 'Add API Key Security Fields',
    description: 'Adds security-related fields to the API keys table',
    timestamp: 1699999999999,
    migrate: addApiKeySecurityFields,
  },
  // Add more migrations here
];

/**
 * Initialize the migration system
 * This should be called during application startup
 */
export async function initializeMigrations(): Promise<void> {
  const startTime = Date.now();

  try {
    info({
      event: 'db_migration_system_initializing',
      timestamp: new Date().toISOString(),
    }, '⚙️ Initializing migration system');

    // Initialize the migration service
    await migrationService.initialize();

    // Register all migrations
    migrationService.registerMigrations(migrations);

    const totalDuration = Date.now() - startTime;

    info({
      event: 'db_migration_system_initialized',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      migrationCount: migrations.length,
      migrations: migrations.map(m => ({
        id: m.id,
        name: m.name,
        timestamp: m.timestamp,
      })),
    }, `✅ Migration system initialized in ${totalDuration}ms with ${migrations.length} registered migrations`);
  } catch (err) {
    const totalDuration = Date.now() - startTime;

    error({
      event: 'db_migration_system_initialization_error',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      error: isError(err) ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, '❌ Failed to initialize migration system');

    throw err;
  }
}

/**
 * Run all pending migrations
 * This can be called during application startup to ensure all migrations are applied
 * @returns Results of all migrations
 */
export async function runPendingMigrations(): Promise<MigrationResult[]> {
  const startTime = Date.now();

  try {
    info({
      event: 'db_pending_migrations_started',
      timestamp: new Date().toISOString(),
    }, '🔄 Running pending migrations...');

    // Run migrations
    const results = await migrationService.runMigrations();

    // Log detailed results
    for (const result of results) {
      const logMethod = result.status === 'applied' ? info :
                        result.status === 'skipped' ? debug : error;

      const emoji = result.status === 'applied' ? '✅' :
                    result.status === 'skipped' ? '⏭️' : '❌';

      logMethod({
        event: `db_migration_${result.status}`,
        timestamp: new Date().toISOString(),
        migrationId: result.id,
        migrationName: result.name,
        durationMs: result.duration,
        error: result.error,
      }, `${emoji} Migration ${result.name}: ${result.status.toUpperCase()}${result.duration ? ` (${result.duration}ms)` : ''}`);
    }

    // Log results
    const appliedCount = results.filter((r) => r.status === 'applied').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    if (failedCount > 0) {
      error({
        event: 'db_migrations_failed',
        timestamp: new Date().toISOString(),
        failedCount: failedCount,
        appliedCount: appliedCount,
        skippedCount: skippedCount,
        failedMigrations: results
          .filter((r) => r.status === 'failed')
          .map(m => ({
            id: m.id,
            name: m.name,
            error: m.error
          })),
      }, `❌ Migration process completed with errors: ${appliedCount} applied, ${failedCount} failed`);

      // In production, we might want to exit the process
      if (process.env.NODE_ENV === 'production') {
        error({
          event: 'db_migrations_exit',
          timestamp: new Date().toISOString(),
          reason: 'migration_failure',
          environment: 'production',
        }, '🛑 Exiting due to migration failures in production environment');
        process.exit(1);
      }
    } else if (appliedCount > 0) {
      const totalDuration = Date.now() - startTime;

      info({
        event: 'db_migrations_applied',
        timestamp: new Date().toISOString(),
        count: appliedCount,
        durationMs: totalDuration,
      }, `✅ Successfully applied ${appliedCount} migrations in ${totalDuration}ms`);
    } else {
      info({
        event: 'db_migrations_none_pending',
        timestamp: new Date().toISOString(),
      }, '✅ No migrations to apply');
    }

    return results;
  } catch (err) {
    const totalDuration = Date.now() - startTime;

    error({
      event: 'db_migrations_error',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      error: isError(err) ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, '❌ Failed to run migrations');

    throw err;
  }
}

/**
 * Run RLS migration
 * This applies Row Level Security policies to the database
 */
export async function runRlsMigration(): Promise<void> {
  const startTime = Date.now();

  try {
    info({
      event: 'db_rls_migration_started',
      timestamp: new Date().toISOString(),
    }, '🔒 Starting Row Level Security (RLS) migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'enable-rls.sql');

    // Check if the file exists
    if (!fs.existsSync(sqlPath)) {
      warn({
        event: 'db_rls_migration_file_missing',
        timestamp: new Date().toISOString(),
        path: sqlPath,
      }, '⚠️ RLS migration SQL file not found, skipping');
      return;
    }

    info({
      event: 'db_rls_migration_file_found',
      timestamp: new Date().toISOString(),
      path: sqlPath,
    }, '📄 Found RLS migration SQL file');

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL into statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    info({
      event: 'db_rls_migration_statements',
      timestamp: new Date().toISOString(),
      statementCount: statements.length,
    }, `📝 Executing ${statements.length} RLS SQL statements`);

    // Execute each statement
    let successCount = 0;
    let failureCount = 0;

    for (const [index, statement] of statements.entries()) {
      const statementStartTime = Date.now();

      try {
        await db.execute(sql.raw(`${statement};`));

        const statementDuration = Date.now() - statementStartTime;
        successCount++;

        debug({
          event: 'db_rls_statement_executed',
          timestamp: new Date().toISOString(),
          statementIndex: index,
          durationMs: statementDuration,
          statementPreview: statement.substring(0, 50) + (statement.length > 50 ? '...' : ''),
        }, `✅ Executed SQL statement ${index + 1}/${statements.length} (${statementDuration}ms)`);
      } catch (err) {
        const statementDuration = Date.now() - statementStartTime;
        failureCount++;

        error({
          event: 'db_rls_statement_error',
          timestamp: new Date().toISOString(),
          statementIndex: index,
          durationMs: statementDuration,
          error: isError(err) ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          statementPreview: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
        }, `❌ Error executing SQL statement ${index + 1}/${statements.length}`);

        // Continue with the next statement
        continue;
      }
    }

    const totalDuration = Date.now() - startTime;

    info({
      event: 'db_rls_migration_completed',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      successCount,
      failureCount,
      totalStatements: statements.length,
    }, `✅ RLS migration completed in ${totalDuration}ms (${successCount} succeeded, ${failureCount} failed)`);
  } catch (err) {
    const totalDuration = Date.now() - startTime;

    error({
      event: 'db_rls_migration_error',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      error: isError(err) ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, '❌ Error running RLS migration');

    throw err;
  }
}

/**
 * Main migration function
 * This runs all migrations and RLS policies
 */
export async function migrateDatabase(): Promise<void> {
  const startTime = Date.now();

  info({
    event: 'db_migration_started',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  }, '🔄 Database migration process started');

  try {
    // Initialize migrations
    info({
      event: 'db_migration_initializing',
      timestamp: new Date().toISOString(),
    }, '⚙️ Initializing migration system');

    await initializeMigrations();

    // Run pending migrations
    info({
      event: 'db_migration_running_pending',
      timestamp: new Date().toISOString(),
    }, '⏳ Running pending migrations');

    const migrationResults = await runPendingMigrations();

    // Log migration results
    const appliedCount = migrationResults.filter(r => r.status === 'applied').length;
    const skippedCount = migrationResults.filter(r => r.status === 'skipped').length;
    const failedCount = migrationResults.filter(r => r.status === 'failed').length;

    info({
      event: 'db_migration_results',
      timestamp: new Date().toISOString(),
      applied: appliedCount,
      skipped: skippedCount,
      failed: failedCount,
      migrations: migrationResults.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        duration: r.duration,
      })),
    }, `📊 Migration results: ${appliedCount} applied, ${skippedCount} skipped, ${failedCount} failed`);

    // Run RLS migration
    info({
      event: 'db_migration_running_rls',
      timestamp: new Date().toISOString(),
    }, '🔒 Running Row Level Security (RLS) migration');

    await runRlsMigration();

    const totalDuration = Date.now() - startTime;

    info({
      event: 'db_migration_completed',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      success: true,
    }, `✅ Database migration completed successfully in ${totalDuration}ms`);
  } catch (err) {
    const totalDuration = Date.now() - startTime;

    error({
      event: 'db_migration_failed',
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      error: isError(err) ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      environment: process.env.NODE_ENV || 'development',
    }, '❌ Database migration failed');

    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      error({
        event: 'db_migration_exit',
        timestamp: new Date().toISOString(),
        reason: 'migration_failure',
        environment: 'production',
      }, '🛑 Exiting due to migration failures in production environment');
      process.exit(1);
    }

    throw err;
  }
}

// If this file is executed directly, run the migrations
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      info('Migration process completed');
      process.exit(0);
    })
    .catch((err) => {
      error('Migration process failed', {
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      process.exit(1);
    });
}
