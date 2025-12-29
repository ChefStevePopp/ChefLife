-- Migration: Add is_active column to organization_team_members
-- Purpose: Support active/deactivated team member status (like 7shifts)

-- Add the column (defaults to true for existing members)
ALTER TABLE public.organization_team_members 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_org_team_members_is_active 
ON public.organization_team_members USING btree (is_active) 
TABLESPACE pg_default;

-- Add comment for documentation
COMMENT ON COLUMN public.organization_team_members.is_active IS 
'Indicates if team member is currently active (true) or deactivated (false). Deactivated members are hidden from active lists but preserved for historical data.';
