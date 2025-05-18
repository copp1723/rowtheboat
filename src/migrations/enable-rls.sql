-- Enable Row Level Security on all user-specific tables

-- Create function to get current authenticated user ID
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN nullif(current_setting('app.is_admin', true), '')::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Enable RLS on credential_vault table
ALTER TABLE credential_vault ENABLE ROW LEVEL SECURITY;

-- Create policies for credential_vault table
CREATE POLICY credential_vault_select_policy
  ON credential_vault
  FOR SELECT
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY credential_vault_insert_policy
  ON credential_vault
  FOR INSERT
  WITH CHECK (user_id = current_user_id() OR is_admin());

CREATE POLICY credential_vault_update_policy
  ON credential_vault
  FOR UPDATE
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY credential_vault_delete_policy
  ON credential_vault
  FOR DELETE
  USING (user_id = current_user_id() OR is_admin());

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies for agents table
CREATE POLICY agents_select_policy
  ON agents
  FOR SELECT
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY agents_insert_policy
  ON agents
  FOR INSERT
  WITH CHECK (user_id = current_user_id() OR is_admin());

CREATE POLICY agents_update_policy
  ON agents
  FOR UPDATE
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY agents_delete_policy
  ON agents
  FOR DELETE
  USING (user_id = current_user_id() OR is_admin());

-- Enable RLS on audit_log table
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_log table
CREATE POLICY audit_log_select_policy
  ON audit_log
  FOR SELECT
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY audit_log_insert_policy
  ON audit_log
  FOR INSERT
  WITH CHECK (user_id = current_user_id() OR is_admin());

CREATE POLICY audit_log_update_policy
  ON audit_log
  FOR UPDATE
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY audit_log_delete_policy
  ON audit_log
  FOR DELETE
  USING (user_id = current_user_id() OR is_admin());

-- Enable RLS on insight_logs table
ALTER TABLE insight_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for insight_logs table
CREATE POLICY insight_logs_select_policy
  ON insight_logs
  FOR SELECT
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY insight_logs_insert_policy
  ON insight_logs
  FOR INSERT
  WITH CHECK (user_id = current_user_id() OR is_admin());

CREATE POLICY insight_logs_update_policy
  ON insight_logs
  FOR UPDATE
  USING (user_id = current_user_id() OR is_admin());

CREATE POLICY insight_logs_delete_policy
  ON insight_logs
  FOR DELETE
  USING (user_id = current_user_id() OR is_admin());

-- Add more tables as needed
-- For each table with user data, follow the pattern above
