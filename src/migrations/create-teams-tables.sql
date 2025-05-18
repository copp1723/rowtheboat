-- Migration: Create teams and team_memberships tables
-- This migration creates the necessary tables and functions for team-based access control

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on teams
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Create team_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

-- Create indexes on team_memberships
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_role ON team_memberships(role);

-- Create function to check if a user is in the same team as another user
CREATE OR REPLACE FUNCTION user_in_team(target_user UUID, app_user UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cached_result TEXT;
BEGIN
  -- Try to get from cache first
  BEGIN
    cached_result := current_setting('app.user_in_team.' || target_user || '.' || app_user, true);
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
    WHERE tm1.user_id = target_user AND tm2.user_id = app_user
  ) THEN
    -- Cache the result for this session
    PERFORM set_config('app.user_in_team.' || target_user || '.' || app_user, 'true', false);
    RETURN true;
  ELSE
    -- Cache the result for this session
    PERFORM set_config('app.user_in_team.' || target_user || '.' || app_user, 'false', false);
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if a user is a team admin
CREATE OR REPLACE FUNCTION is_team_admin(team_id UUID, user_id UUID)
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

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policies for teams table
CREATE POLICY teams_select_policy
  ON teams
  FOR SELECT
  USING (created_by = current_user_id() OR EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = teams.id AND user_id = current_user_id()
  ) OR is_admin());

CREATE POLICY teams_insert_policy
  ON teams
  FOR INSERT
  WITH CHECK (created_by = current_user_id() OR is_admin());

CREATE POLICY teams_update_policy
  ON teams
  FOR UPDATE
  USING (created_by = current_user_id() OR is_team_admin(id, current_user_id()) OR is_admin());

CREATE POLICY teams_delete_policy
  ON teams
  FOR DELETE
  USING (created_by = current_user_id() OR is_admin());

-- Enable RLS on team_memberships table
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for team_memberships table
CREATE POLICY team_memberships_select_policy
  ON team_memberships
  FOR SELECT
  USING (user_id = current_user_id() OR EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.team_id = team_memberships.team_id AND tm.user_id = current_user_id()
  ) OR is_admin());

CREATE POLICY team_memberships_insert_policy
  ON team_memberships
  FOR INSERT
  WITH CHECK (
    user_id = current_user_id() OR
    is_team_admin(team_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY team_memberships_update_policy
  ON team_memberships
  FOR UPDATE
  USING (
    user_id = current_user_id() OR
    is_team_admin(team_id, current_user_id()) OR
    is_admin()
  );

CREATE POLICY team_memberships_delete_policy
  ON team_memberships
  FOR DELETE
  USING (
    user_id = current_user_id() OR
    is_team_admin(team_id, current_user_id()) OR
    is_admin()
  );
