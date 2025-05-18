-- Migration: Apply RLS to all user-specific tables
-- This migration applies Row Level Security to all tables with user-specific data

-- Create or replace the current_user_id function with the same return type
-- We don't need to change this function since it's already being used by other policies
-- Just make sure it works with UUID values
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
DECLARE
  user_id_text TEXT;
BEGIN
  user_id_text := nullif(current_setting('app.current_user_id', true), '');
  IF user_id_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN user_id_text::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create or replace the is_admin function
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN nullif(current_setting('app.is_admin', true), '')::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create RLS audit logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS rls_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  user_id UUID,
  attempted_user_id UUID,
  query TEXT,
  client_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on rls_audit_logs
CREATE INDEX IF NOT EXISTS idx_rls_audit_logs_event_type ON rls_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_rls_audit_logs_table_name ON rls_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_rls_audit_logs_user_id ON rls_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rls_audit_logs_created_at ON rls_audit_logs(created_at);

-- Create function to log RLS access attempts
CREATE OR REPLACE FUNCTION log_rls_access_attempt(
  event_type VARCHAR,
  table_name VARCHAR,
  attempted_user_id UUID
) RETURNS VOID AS $$
DECLARE
  client_ip TEXT;
  query_text TEXT;
BEGIN
  -- Get client IP from session variable
  BEGIN
    client_ip := nullif(current_setting('app.client_ip', true), '');
  EXCEPTION
    WHEN OTHERS THEN
      client_ip := 'unknown';
  END;

  -- Get current query
  BEGIN
    query_text := current_query();
  EXCEPTION
    WHEN OTHERS THEN
      query_text := 'unknown';
  END;

  -- Insert log entry
  INSERT INTO rls_audit_logs (
    event_type,
    table_name,
    user_id,
    attempted_user_id,
    query,
    ip_address,
    client_info
  ) VALUES (
    event_type,
    table_name,
    current_user_id(),
    attempted_user_id,
    query_text,
    client_ip,
    current_setting('app.client_info', true)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure logging never causes the main operation to fail
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply RLS to task_logs table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_logs') THEN
    EXECUTE 'ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY task_logs_select_policy
      ON task_logs
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY task_logs_insert_policy
      ON task_logs
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY task_logs_update_policy
      ON task_logs
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY task_logs_delete_policy
      ON task_logs
      FOR DELETE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to workflows table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflows') THEN
    EXECUTE 'ALTER TABLE workflows ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY workflows_select_policy
      ON workflows
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY workflows_insert_policy
      ON workflows
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY workflows_update_policy
      ON workflows
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY workflows_delete_policy
      ON workflows
      FOR DELETE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to dealer_credentials table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dealer_credentials') THEN
    EXECUTE 'ALTER TABLE dealer_credentials ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY dealer_credentials_select_policy
      ON dealer_credentials
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY dealer_credentials_insert_policy
      ON dealer_credentials
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY dealer_credentials_update_policy
      ON dealer_credentials
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY dealer_credentials_delete_policy
      ON dealer_credentials
      FOR DELETE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to user_credentials table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_credentials') THEN
    EXECUTE 'ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY user_credentials_select_policy
      ON user_credentials
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY user_credentials_insert_policy
      ON user_credentials
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY user_credentials_update_policy
      ON user_credentials
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY user_credentials_delete_policy
      ON user_credentials
      FOR DELETE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to security_audit_logs table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_audit_logs') THEN
    EXECUTE 'ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY security_audit_logs_select_policy
      ON security_audit_logs
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY security_audit_logs_insert_policy
      ON security_audit_logs
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY security_audit_logs_update_policy
      ON security_audit_logs
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY security_audit_logs_delete_policy
      ON security_audit_logs
      FOR DELETE
      USING (
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to schedules table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedules') THEN
    EXECUTE 'ALTER TABLE schedules ENABLE ROW LEVEL SECURITY';

    EXECUTE 'CREATE POLICY schedules_select_policy
      ON schedules
      FOR SELECT
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY schedules_insert_policy
      ON schedules
      FOR INSERT
      WITH CHECK (
        user_id = current_user_id() OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY schedules_update_policy
      ON schedules
      FOR UPDATE
      USING (
        user_id = current_user_id() OR
        user_in_team(user_id, current_user_id()) OR
        is_admin()
      )';

    EXECUTE 'CREATE POLICY schedules_delete_policy
      ON schedules
      FOR DELETE
      USING (
        user_id = current_user_id() OR
        is_admin()
      )';
  END IF;
END
$$;

-- Apply RLS to credentials table if it exists and doesn't already have RLS
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credentials') THEN
    -- Check if RLS is already enabled
    IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_policies WHERE tablename = 'credentials'
    ) THEN
      EXECUTE 'ALTER TABLE credentials ENABLE ROW LEVEL SECURITY';

      EXECUTE 'CREATE POLICY credentials_select_policy
        ON credentials
        FOR SELECT
        USING (
          user_id = current_user_id() OR
          user_in_team(user_id, current_user_id()) OR
          is_admin()
        )';

      EXECUTE 'CREATE POLICY credentials_insert_policy
        ON credentials
        FOR INSERT
        WITH CHECK (
          user_id = current_user_id() OR
          is_admin()
        )';

      EXECUTE 'CREATE POLICY credentials_update_policy
        ON credentials
        FOR UPDATE
        USING (
          user_id = current_user_id() OR
          user_in_team(user_id, current_user_id()) OR
          is_admin()
        )';

      EXECUTE 'CREATE POLICY credentials_delete_policy
        ON credentials
        FOR DELETE
        USING (
          user_id = current_user_id() OR
          is_admin()
        )';
    END IF;
  END IF;
END
$$;
