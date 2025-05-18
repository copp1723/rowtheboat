# PostgreSQL Row-Level Security (RLS)

This document describes the Row-Level Security (RLS) implementation in the AgentFlow application.

## Overview

Row-Level Security (RLS) is a PostgreSQL feature that allows us to restrict which rows a user can see or modify in a table. This is essential for multi-tenant applications where users should only have access to their own data.

In our implementation, RLS policies are applied to all user-specific tables to ensure that users can only access their own data.

## How It Works

1. The `dbContextMiddleware.ts` sets the current user ID in the PostgreSQL session for each request.
2. The `current_user_id()` function in PostgreSQL retrieves this user ID.
3. RLS policies use this function to filter rows based on the user ID.

## RLS Policies

We have implemented the following RLS policies:

### For All User-Specific Tables

- **SELECT Policy**: Users can only select rows where:
  - `user_id = current_user_id()` (own data)
  - OR `user_in_team(user_id, current_user_id())` (team member's data)
  - OR `is_admin()` (admin access)

- **INSERT Policy**: Users can only insert rows where:
  - `user_id = current_user_id()` (own data)
  - OR `is_admin()` (admin access)

- **UPDATE Policy**: Users can only update rows where:
  - `user_id = current_user_id()` (own data)
  - OR `user_in_team(user_id, current_user_id())` (team member's data)
  - OR `is_admin()` (admin access)

- **DELETE Policy**: Users can only delete rows where:
  - `user_id = current_user_id()` (own data)
  - OR `is_admin()` (admin access)

### Team-Specific Tables

For team-related tables (`teams` and `team_memberships`), we have specialized policies:

- **Teams Table**:
  - Users can SELECT teams they created or are members of
  - Users can INSERT new teams (they become the creator)
  - Users can UPDATE teams they created or are admins of
  - Users can DELETE teams they created

- **Team Memberships Table**:
  - Users can SELECT memberships for teams they belong to
  - Users can INSERT new memberships for teams they administer
  - Users can UPDATE memberships for teams they administer
  - Users can DELETE memberships for teams they administer or their own membership

## Tables with RLS Enabled

The following tables have RLS enabled:

- `credentials` - User credentials for various platforms
- `workflows` - User workflows and their execution state
- `task_logs` - Logs of user tasks and their results
- `dealer_credentials` - Dealer-specific credentials
- `user_credentials` - Enhanced user credentials with better encryption
- `security_audit_logs` - Security-related audit logs
- `schedules` - Scheduled workflow executions
- `insight_logs` - Logs of AI insight generation
- `agents` - User-specific agents
- `audit_log` - General audit logs
- `credential_vault` - Secure credential storage
- `teams` - User teams
- `team_memberships` - Team membership information

## Implementation Details

### Database Context Middleware

The `dbContextMiddleware.ts` middleware sets the current user ID in the PostgreSQL session:

```typescript
export async function setDbContext(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get user ID from request
    const userId = req.user?.claims?.sub;

    if (userId) {
      // Set the user ID in the PostgreSQL session
      await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    } else {
      // Clear the user ID in the PostgreSQL session if no user is authenticated
      await db.execute(sql`SELECT set_config('app.current_user_id', '', false)`);
    }

    next();
  } catch (error) {
    logger.error('Error setting database context', error);
    next();
  }
}
```

### PostgreSQL Functions

#### Current User ID Function

The `current_user_id()` function retrieves the user ID from the PostgreSQL session:

```sql
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS VARCHAR AS $$
DECLARE
  user_id_text TEXT;
BEGIN
  user_id_text := nullif(current_setting('app.current_user_id', true), '');
  IF user_id_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN user_id_text::VARCHAR;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Admin Check Function

The `is_admin()` function checks if the current user is an admin:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN nullif(current_setting('app.is_admin', true), '')::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Team Membership Function

The `user_in_team()` function checks if the current user is in the same team as the target user:

```sql
CREATE OR REPLACE FUNCTION user_in_team(target_user VARCHAR, current_user VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  cached_result TEXT;
BEGIN
  -- Try to get from cache first
  BEGIN
    cached_result := current_setting('app.user_in_team.' || target_user || '.' || current_user, true);
    IF cached_result IS NOT NULL THEN
      RETURN cached_result::BOOLEAN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Cache miss, continue with query
  END;

  -- Check if users share any team
  IF EXISTS (
    SELECT 1 FROM team_memberships tm1
    JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = target_user AND tm2.user_id = current_user
  ) THEN
    -- Cache the result for this session
    PERFORM set_config('app.user_in_team.' || target_user || '.' || current_user, 'true', false);
    RETURN true;
  ELSE
    -- Cache the result for this session
    PERFORM set_config('app.user_in_team.' || target_user || '.' || current_user, 'false', false);
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Team Admin Check Function

The `is_team_admin()` function checks if the current user is an admin of the specified team:

```sql
CREATE OR REPLACE FUNCTION is_team_admin(team_id UUID, user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  cached_result TEXT;
BEGIN
  -- Try to get from cache first
  BEGIN
    cached_result := current_setting('app.is_team_admin.' || team_id || '.' || user_id, true);
    IF cached_result IS NOT NULL THEN
      RETURN cached_result::BOOLEAN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Cache miss, continue with query
  END;

  -- Check if user is team admin or owner
  IF EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = $1 AND user_id = $2 AND role IN ('admin', 'owner')
  ) THEN
    -- Cache the result for this session
    PERFORM set_config('app.is_team_admin.' || team_id || '.' || user_id, 'true', false);
    RETURN true;
  ELSE
    -- Cache the result for this session
    PERFORM set_config('app.is_team_admin.' || team_id || '.' || user_id, 'false', false);
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### RLS Policy Examples

#### User-Specific Table Example

Here's an example of the RLS policies for the `credentials` table with team sharing:

```sql
-- Enable RLS on credentials table
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for credentials table
CREATE POLICY credentials_select_policy
  ON credentials
  FOR SELECT
  USING (
    user_id = current_user_id() OR
    user_in_team(user_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY credentials_insert_policy
  ON credentials
  FOR INSERT
  WITH CHECK (
    user_id = current_user_id() OR
    is_admin()
  );

CREATE POLICY credentials_update_policy
  ON credentials
  FOR UPDATE
  USING (
    user_id = current_user_id() OR
    user_in_team(user_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY credentials_delete_policy
  ON credentials
  FOR DELETE
  USING (
    user_id = current_user_id() OR
    is_admin()
  );
```

#### Team Table Example

Here's an example of the RLS policies for the `teams` table:

```sql
-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policies for teams table
CREATE POLICY teams_select_policy
  ON teams
  FOR SELECT
  USING (
    created_by = current_user_id() OR
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = teams.id AND user_id = current_user_id()
    ) OR
    is_admin()
  );

CREATE POLICY teams_insert_policy
  ON teams
  FOR INSERT
  WITH CHECK (
    created_by = current_user_id() OR
    is_admin()
  );

CREATE POLICY teams_update_policy
  ON teams
  FOR UPDATE
  USING (
    created_by = current_user_id() OR
    is_team_admin(id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY teams_delete_policy
  ON teams
  FOR DELETE
  USING (
    created_by = current_user_id() OR
    is_admin()
  );
```

## Testing RLS Policies

### Manual Testing

You can test the RLS policies using the `scripts/test-rls-policies.js` script:

```bash
npm run test:rls
```

This script creates test data for two users and verifies that each user can only see their own data.

### CI/CD Testing

We've also created a CI/CD test script that can be run in your continuous integration pipeline to prevent regressions:

```bash
npm run test:rls:ci
```

This script:
1. Creates test data for multiple users
2. Tests that each user can only see their own data
3. Tests that admin users can see all data
4. Tests that unauthenticated requests can't see any data
5. Measures query performance with `EXPLAIN ANALYZE`
6. Cleans up all test data

The CI test script is designed to fail if any of the RLS policies are not working correctly, ensuring that security is maintained as the codebase evolves.

### Adding to Your CI Pipeline

To add RLS testing to your CI pipeline, add the following to your CI configuration:

```yaml
# GitHub Actions example
jobs:
  test-rls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:rls:ci
```

This ensures that RLS policies are tested on every pull request and prevents accidental security regressions.

## Updating RLS Policies

When adding new tables that contain user-specific data, you should:

1. Add RLS policies for the new table in `src/migrations/apply-rls-to-all-tables.sql`.
2. Run the migration using `node src/scripts/run-rls-migrations.js`.
3. Update the CI test script (`scripts/ci-test-rls.js`) to include the new table:
   - Add the table to the `TABLES_TO_TEST` array
   - Add a case for the table in the `createTestData` function

### Adding a New Table with RLS

Here's a step-by-step guide for adding a new table with RLS:

1. Create your new table in a migration script.
2. Ensure the table has a `user_id` column (or equivalent) for RLS policies.
3. Add the following to `src/migrations/apply-rls-to-all-tables.sql`:

```sql
-- Apply RLS to your_new_table
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY your_new_table_select_policy
  ON your_new_table
  FOR SELECT
  USING (
    user_id = current_user_id() OR
    user_in_team(user_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY your_new_table_insert_policy
  ON your_new_table
  FOR INSERT
  WITH CHECK (
    user_id = current_user_id() OR
    is_admin()
  );

CREATE POLICY your_new_table_update_policy
  ON your_new_table
  FOR UPDATE
  USING (
    user_id = current_user_id() OR
    user_in_team(user_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY your_new_table_delete_policy
  ON your_new_table
  FOR DELETE
  USING (
    user_id = current_user_id() OR
    is_admin()
  );
```

4. Run the migration:

```bash
node src/scripts/run-rls-migrations.js
```

5. Update the CI test script to include the new table:

```javascript
// Add to TABLES_TO_TEST array
const TABLES_TO_TEST = [
  // ... existing tables
  'your_new_table'
];

// Add to createTestData function
case 'your_new_table':
  await db.execute(sql`
    INSERT INTO your_new_table (id, user_id, /* other required fields */)
    VALUES (
      gen_random_uuid(),
      ${userId},
      /* other values */
    )
    ON CONFLICT DO NOTHING;
  `);
  break;
```

6. Run the CI test to verify the RLS policies are working:

```bash
node scripts/ci-test-rls.js
```

## Performance Considerations

RLS adds a small overhead to queries, but the impact is minimal for most applications. We've implemented several optimizations to minimize this overhead:

1. **Session Caching**: The `is_admin()` and `user_in_team()` functions cache their results in session variables to avoid repeated database lookups.
2. **Indexes**: All tables with RLS have indexes on the `user_id` column to speed up filtering.
3. **Query Optimization**: The RLS policies are designed to be as efficient as possible, using short-circuit evaluation to avoid unnecessary checks.

If you notice performance issues, consider:

1. **Monitoring Query Performance**: Use the `EXPLAIN ANALYZE` command to identify slow queries affected by RLS. Our CI test script includes performance testing to catch regressions.
2. **Materialized Views**: For complex reports or analytics, consider using materialized views that are refreshed periodically and have their own RLS policies.
3. **Application-Level Caching**: Implement caching for frequently accessed data, especially for read-heavy operations.
4. **Denormalization**: In some cases, denormalizing data can improve performance by reducing the need for joins across tables with different RLS policies.

### Performance Baseline

We've established a performance baseline for common queries with RLS enabled. The CI test script includes performance testing with `EXPLAIN ANALYZE` to ensure that RLS doesn't introduce significant overhead.

Here's an example of the expected query plan for a simple SELECT with RLS:

```
Seq Scan on credentials  (cost=0.00..25.88 rows=5 width=1024) (actual time=0.019..0.021 rows=3 loops=1)
  Filter: ((user_id = 'test-user-a'::text) OR (pg_catalog.current_setting('app.is_admin'::text, true) = 'true'::text))
Planning Time: 0.068 ms
Execution Time: 0.042 ms
```

If you see significantly higher execution times or different query plans, it may indicate a performance issue that needs to be addressed.

## Security Considerations

RLS is a powerful security feature, but it's not a silver bullet. We've implemented several additional security measures:

1. **Audit Logging**: All unauthorized access attempts are logged to the `rls_audit_logs` table, including:
   - The type of operation attempted (SELECT, INSERT, UPDATE, DELETE)
   - The table being accessed
   - The user ID making the attempt
   - The user ID or team ID they attempted to access
   - The full query
   - Client information and IP address
   - Timestamp

2. **Admin Override Control**: Admin users can bypass RLS, but this is tightly controlled:
   - The `is_admin()` function checks both session variables and the database
   - Admin status is set by the middleware based on JWT claims
   - All admin actions are still logged for accountability

3. **Team Sharing**: Team-based access is implemented securely:
   - The `user_in_team()` function verifies team membership
   - Results are cached in session variables for performance
   - Team membership checks are applied consistently across all tables

You should still follow these additional security best practices:

1. Validate user input to prevent SQL injection.
2. Use parameterized queries to prevent SQL injection.
3. Implement proper authentication and authorization.
4. Regularly audit your database access patterns.
5. Monitor for suspicious activity.
6. Regularly review the `rls_audit_logs` table for unauthorized access attempts.
7. Implement alerts for suspicious patterns in the audit logs.

### Audit Logging

The `rls_audit_logs` table stores all unauthorized access attempts. You can query this table to monitor for suspicious activity:

```sql
-- Get recent unauthorized access attempts
SELECT * FROM rls_audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Get unauthorized access attempts by user
SELECT * FROM rls_audit_logs
WHERE user_id = 'user-id'
ORDER BY created_at DESC;

-- Get unauthorized access attempts by table
SELECT * FROM rls_audit_logs
WHERE table_name = 'credentials'
ORDER BY created_at DESC;
```

Consider implementing automated alerts for suspicious patterns, such as:
- Multiple unauthorized access attempts from the same IP address
- Attempts to access sensitive tables
- Unusual patterns of access attempts

## Troubleshooting

If you encounter issues with RLS:

1. Check that the `dbContextMiddleware.ts` is correctly setting the user ID.
2. Verify that the `current_user_id()` function is returning the correct value.
3. Check that the RLS policies are correctly defined.
4. Run the test script to verify that the policies are working correctly.
5. Check the database logs for any errors related to RLS.

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
