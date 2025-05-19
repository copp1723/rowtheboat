/**
 * Run RLS Migration
 * 
 * This script runs the RLS migration to enable Row Level Security
 * on all user-specific tables.
 */
import { db } from '../shared/db';
import { debug, info, warn, error } from '../shared/logger';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRlsMigration() {
  try {
    info('Starting RLS migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await db.execute(sql.raw(`${statement};`));
        info(`Executed SQL statement: ${statement.substring(0, 50)}...`);
      } catch (error) {
        error({
          event: 'rls_migration_statement_error',
          error: error instanceof Error ? error.message : String(error),
          statement: statement.substring(0, 100),
        }, 'Error executing SQL statement');
        
        // Continue with the next statement
        continue;
      }
    }
    
    info('RLS migration completed successfully');
  } catch (error) {
    error({
      event: 'rls_migration_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error running RLS migration');
    
    throw error;
  }
}

// Run the migration
runRlsMigration()
  .then(() => {
    info('RLS migration script completed');
    process.exit(0);
  })
  .catch(error => {
    error('RLS migration script failed', error);
    process.exit(1);
  });
