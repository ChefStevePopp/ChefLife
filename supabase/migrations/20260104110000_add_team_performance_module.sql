-- Add team_performance module to organizations
-- This module handles attendance tracking, point systems, tiers, and coaching

-- Update existing organizations to include team_performance module
UPDATE public.organizations
SET modules = COALESCE(modules, '{}'::jsonb) || jsonb_build_object(
  'team_performance', jsonb_build_object(
    'enabled', false,
    'compliance_acknowledged', false,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,      -- Everyone can see it exists
      'enable', 1,    -- Only Owner can enable/disable
      'configure', 2, -- Manager+ can configure
      'use', 3        -- Assistant Manager+ can use
    ),
    'config', null
  )
)
WHERE NOT (modules ? 'team_performance');

-- Comment
COMMENT ON COLUMN public.organizations.modules IS 
'Feature modules with security protocol-based permissions. Includes team_performance for attendance tracking, point systems, tier management, and progressive coaching.';
