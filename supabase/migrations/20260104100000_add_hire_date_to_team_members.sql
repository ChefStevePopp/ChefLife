-- Add hire_date to organization_team_members
-- This enables tenure tracking for vacation entitlement, probationary periods, etc.

ALTER TABLE organization_team_members
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Add a comment for documentation
COMMENT ON COLUMN organization_team_members.hire_date IS 'Employee hire/start date for tenure tracking, vacation entitlement, and probationary period calculation';
