# Database Migrations

This document describes the database migration system used in the application, including how to run migrations, troubleshoot common issues, and understand the migration logs.

## Overview

The migration system ensures that database schema changes are applied consistently across all environments. Migrations are automatically run during application startup, ensuring that the database schema is always up-to-date.

## How Migrations Work

1. Migrations are defined as JavaScript/TypeScript modules in the `src/migrations` directory
2. Each migration has a unique ID, name, description, and timestamp
3. Migrations are applied in order based on their timestamp
4. The system tracks which migrations have been applied in the `migrations` table
5. Only pending migrations are applied during startup
6. Detailed logs are emitted during the migration process for monitoring and troubleshooting

## Migration Process

### Automatic Migration

Migrations run automatically during application startup in the following sequence:

1. **Initialization**: The migration system initializes and registers all available migrations
2. **Pending Migrations**: The system identifies which migrations have not yet been applied
3. **Migration Execution**: Each pending migration is executed in timestamp order
4. **RLS Policies**: After all migrations are applied, Row Level Security (RLS) policies are applied
5. **Completion**: The system logs the results of the migration process

### Manual Migration

You can also run migrations manually using the provided npm scripts:

## Creating a New Migration

To create a new migration:

1. Create a new file in the `src/migrations` directory with a descriptive name
2. Export a migration object with the following structure:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '../shared/db.js';

export default async function migrate(): Promise<boolean> {
  try {
    // Your migration SQL or code here
    await db.execute(sql`
      ALTER TABLE your_table
      ADD COLUMN new_column TEXT;
    `);

    return true; // Return true if migration was successful
  } catch (error) {
    console.error('Migration failed:', error);
    return false; // Return false if migration failed
  }
}
```

3. Register the migration in `src/migrations/migrationRunner.ts`:

```typescript
const migrations: Migration[] = [
  // ... existing migrations
  {
    id: 'your-migration-id',
    name: 'Your Migration Name',
    description: 'Description of what this migration does',
    timestamp: Date.now(), // Use a timestamp to order migrations
    migrate: yourMigrationFunction,
  },
];
```

## Migration Best Practices

1. **Make migrations idempotent**: Migrations should be safe to run multiple times without causing errors
2. **Use transactions**: Wrap complex migrations in transactions to ensure atomicity
3. **Include rollback logic**: When possible, provide a rollback function to undo the migration
4. **Test migrations**: Test migrations in development before deploying to production
5. **Keep migrations small**: Small, focused migrations are easier to understand and less likely to fail

## Manual Migration Execution

While migrations run automatically during application startup, you can also run them manually:

```bash
# Run all pending migrations
npm run migrate

# Run a specific migration
npm run migrate -- --migration=your-migration-id

# Check migration status
npm run migrate:status
```

## Migration Logs

The migration system emits detailed logs during the migration process. These logs include:

### Initialization Logs

```
[2023-06-15T12:34:56.789Z] [INFO] 🔄 Database migration process started
[2023-06-15T12:34:56.790Z] [INFO] ⚙️ Initializing migration system
[2023-06-15T12:34:56.850Z] [INFO] ✅ Migration system initialized in 60ms with 5 registered migrations
```

### Migration Execution Logs

```
[2023-06-15T12:34:56.851Z] [INFO] ⏳ Running pending migrations...
[2023-06-15T12:34:56.900Z] [INFO] ✅ Migration Add User Preferences: APPLIED (45ms)
[2023-06-15T12:34:56.950Z] [INFO] ✅ Migration Add API Key Security Fields: APPLIED (50ms)
[2023-06-15T12:34:56.951Z] [INFO] 📊 Migration results: 2 applied, 0 skipped, 0 failed
```

### RLS Migration Logs

```
[2023-06-15T12:34:56.952Z] [INFO] 🔒 Running Row Level Security (RLS) migration
[2023-06-15T12:34:56.953Z] [INFO] 📄 Found RLS migration SQL file
[2023-06-15T12:34:56.954Z] [INFO] 📝 Executing 8 RLS SQL statements
[2023-06-15T12:34:57.100Z] [INFO] ✅ RLS migration completed in 148ms (8 succeeded, 0 failed)
```

### Completion Logs

```
[2023-06-15T12:34:57.101Z] [INFO] ✅ Database migration completed successfully in 312ms
```

### Error Logs

```
[2023-06-15T12:34:56.900Z] [ERROR] ❌ Error executing SQL statement 3/8
[2023-06-15T12:34:56.901Z] [ERROR] ❌ Migration process completed with errors: 1 applied, 1 failed
[2023-06-15T12:34:56.902Z] [ERROR] ❌ Failed migration: Add User Preferences
```

## Troubleshooting

### Migration Failures

If a migration fails during application startup:

1. Check the application logs for error messages (look for `db_migration_failed` events)
2. Examine the specific migration that failed (look for `db_migration_failed` events)
3. Fix the issue that caused the migration to fail
4. Restart the application to retry the migration

Common migration failures include:

| Error | Possible Cause | Solution |
|-------|----------------|----------|
| `relation already exists` | Table already created | Make migration idempotent with `IF NOT EXISTS` |
| `column already exists` | Column already added | Make migration idempotent with `IF NOT EXISTS` |
| `permission denied` | Insufficient database privileges | Grant necessary permissions to database user |
| `syntax error` | SQL syntax error in migration | Fix the SQL syntax in the migration file |
| `timeout` | Long-running migration | Optimize the migration or increase timeout |

### Manual Recovery

If you need to manually mark a migration as applied or unapplied:

```sql
-- Mark a migration as applied
INSERT INTO migrations (id, name, description, applied_at, duration, status)
VALUES ('your-migration-id', 'Your Migration Name', 'Description', NOW(), 0, 'applied');

-- Mark a migration as failed
UPDATE migrations
SET status = 'failed'
WHERE id = 'your-migration-id';

-- Reset a failed migration to be re-run
DELETE FROM migrations WHERE id = 'your-migration-id';
```

### Database Backup

Always back up your database before running migrations in production:

```bash
# PostgreSQL backup
pg_dump -U username -d database_name > backup.sql

# Compressed backup
pg_dump -U username -d database_name | gzip > backup.sql.gz

# Restore from backup
psql -U username -d database_name < backup.sql
```

## Environment Variables

The following environment variables affect the migration process:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/app` |
| `DATABASE_SSL` | Whether to use SSL for database connection | `false` |
| `DATABASE_SCHEMA` | Database schema to use | `public` |
| `MIGRATION_AUTO_RUN` | Whether to run migrations automatically on startup | `true` |
| `MIGRATION_TIMEOUT` | Timeout for each migration in milliseconds | `30000` |

## Row Level Security (RLS)

The application includes a special migration for setting up Row Level Security (RLS) policies. This migration is run after all regular migrations and configures security policies for multi-tenant data access.

### RLS Policies

RLS policies ensure that users can only access data that belongs to them or their organization. The policies are applied to all tables that contain user-specific data.

### Customizing RLS Policies

To customize RLS policies, edit the `src/migrations/enable-rls.sql` file. This file contains SQL statements that:

1. Enable RLS on specific tables
2. Create RLS policies that filter rows based on user ID or organization ID
3. Grant appropriate permissions to roles

Example RLS policy:

```sql
-- Enable RLS on the table
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to see only their own data
CREATE POLICY user_data_isolation ON user_data
  USING (user_id = current_setting('app.current_user_id')::uuid);
```
