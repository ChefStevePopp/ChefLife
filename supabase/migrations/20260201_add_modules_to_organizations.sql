-- Add modules column to organizations table
-- This column stores module-specific configuration (HR, VIM, etc.)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '{}'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN organizations.modules IS 'Module-specific configuration data (HR, VIM, Operations, etc.)';
