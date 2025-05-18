-- Enable Row Level Security on credentials table
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own credentials
CREATE POLICY credentials_select_policy
  ON credentials
  FOR SELECT
  USING (user_id = current_user_id());

-- Create policy to allow users to insert only their own credentials
CREATE POLICY credentials_insert_policy
  ON credentials
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

-- Create policy to allow users to update only their own credentials
CREATE POLICY credentials_update_policy
  ON credentials
  FOR UPDATE
  USING (user_id = current_user_id());

-- Create policy to allow users to delete only their own credentials
CREATE POLICY credentials_delete_policy
  ON credentials
  FOR DELETE
  USING (user_id = current_user_id());

-- Create function to get current authenticated user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster credential lookups
CREATE INDEX IF NOT EXISTS idx_credentials_active ON credentials(active);

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE credentials TO authenticated;
GRANT USAGE ON SEQUENCE credentials_id_seq TO authenticated;