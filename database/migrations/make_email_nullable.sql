-- Migration: Make email nullable in organization_team_members
-- Reason: Some employees (like family members or temps) may not have email addresses
-- They can still be identified by punch_id

-- Remove NOT NULL constraint from email
ALTER TABLE public.organization_team_members 
ALTER COLUMN email DROP NOT NULL;

-- Update the unique constraint to handle nulls properly
-- Drop old constraint
ALTER TABLE public.organization_team_members 
DROP CONSTRAINT IF EXISTS team_members_organization_id_email_key;

-- Add new constraint that only enforces uniqueness for non-null emails
CREATE UNIQUE INDEX team_members_organization_id_email_key 
ON public.organization_team_members (organization_id, email) 
WHERE email IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.organization_team_members.email IS 
'Email address (optional). Some team members may only have punch_id for identification.';
