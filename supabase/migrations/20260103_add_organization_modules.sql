-- ============================================================================
-- ORGANIZATION MODULES & INTEGRATIONS
-- ============================================================================
-- Adds modular feature system with security protocol-based permissions
-- 
-- Each module follows this structure:
-- {
--   "module_id": {
--     "enabled": boolean,
--     "compliance_acknowledged": boolean (for legally sensitive features),
--     "enabled_at": timestamp,
--     "enabled_by": uuid,
--     "permissions": {
--       "view": 0-5,      -- Who can see module exists
--       "enable": 0-5,    -- Who can toggle on/off
--       "configure": 0-5, -- Who can change settings
--       "use": 0-5        -- Who can use features
--     },
--     "config": {}        -- Module-specific settings
--   }
-- }
--
-- Security Levels (lower = more access):
--   0 = Omega (System/Dev)
--   1 = Alpha (Owner)
--   2 = Bravo (Manager)
--   3 = Charlie (Assistant Manager)
--   4 = Delta (Supervisor)
--   5 = Echo (Team Member)
-- ============================================================================

-- Add modules column to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT jsonb_build_object(
  'attendance', jsonb_build_object(
    'enabled', false,
    'compliance_acknowledged', false,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,      -- Everyone can see it exists
      'enable', 1,    -- Only Owner can enable/disable
      'configure', 2, -- Manager+ can configure
      'use', 4        -- Supervisor+ can use
    ),
    'config', null
  ),
  'scheduling', jsonb_build_object(
    'enabled', true,  -- On by default
    'compliance_acknowledged', null,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,
      'enable', 1,
      'configure', 2,
      'use', 3
    ),
    'config', null
  ),
  'inventory', jsonb_build_object(
    'enabled', false,
    'compliance_acknowledged', null,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,
      'enable', 1,
      'configure', 2,
      'use', 3
    ),
    'config', null
  ),
  'recipes', jsonb_build_object(
    'enabled', true,  -- On by default
    'compliance_acknowledged', null,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,
      'enable', 1,
      'configure', 3,
      'use', 4
    ),
    'config', null
  ),
  'haccp', jsonb_build_object(
    'enabled', false,
    'compliance_acknowledged', null,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,
      'enable', 1,
      'configure', 2,
      'use', 5
    ),
    'config', null
  ),
  'tasks', jsonb_build_object(
    'enabled', true,  -- On by default
    'compliance_acknowledged', null,
    'enabled_at', null,
    'enabled_by', null,
    'permissions', jsonb_build_object(
      'view', 5,
      'enable', 1,
      'configure', 3,
      'use', 5
    ),
    'config', null
  )
);

-- Add integrations column to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT jsonb_build_object(
  '7shifts', jsonb_build_object(
    'enabled', false,
    'connected', false,
    'connected_at', null,
    'connected_by', null,
    'config', null
  ),
  'square', jsonb_build_object(
    'enabled', false,
    'connected', false,
    'connected_at', null,
    'connected_by', null,
    'config', null
  ),
  'toast', jsonb_build_object(
    'enabled', false,
    'connected', false,
    'connected_at', null,
    'connected_by', null,
    'config', null
  ),
  'quickbooks', jsonb_build_object(
    'enabled', false,
    'connected', false,
    'connected_at', null,
    'connected_by', null,
    'config', null
  )
);

-- Add module_overrides to locations (for multi-unit flexibility)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS module_overrides JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.organizations.modules IS 
'Feature modules with security protocol-based permissions. Each module has enabled state, permissions (view/enable/configure/use as security levels 0-5), and module-specific config.';

COMMENT ON COLUMN public.organizations.integrations IS 
'External service integrations (7shifts, POS systems, accounting). Each integration tracks enabled, connected status, and connection config.';

COMMENT ON COLUMN public.locations.module_overrides IS 
'Location-specific module overrides for multi-unit organizations. Allows disabling modules or changing config per location.';

-- ============================================================================
-- UPDATE EXISTING ORGANIZATIONS
-- ============================================================================
-- Ensure Memphis Fire has the new columns populated

UPDATE public.organizations
SET 
  modules = COALESCE(modules, '{}'::jsonb) || jsonb_build_object(
    'attendance', jsonb_build_object(
      'enabled', false,
      'compliance_acknowledged', false,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 2,
        'use', 4
      ),
      'config', null
    ),
    'scheduling', jsonb_build_object(
      'enabled', true,
      'compliance_acknowledged', null,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 2,
        'use', 3
      ),
      'config', null
    ),
    'inventory', jsonb_build_object(
      'enabled', false,
      'compliance_acknowledged', null,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 2,
        'use', 3
      ),
      'config', null
    ),
    'recipes', jsonb_build_object(
      'enabled', true,
      'compliance_acknowledged', null,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 3,
        'use', 4
      ),
      'config', null
    ),
    'haccp', jsonb_build_object(
      'enabled', false,
      'compliance_acknowledged', null,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 2,
        'use', 5
      ),
      'config', null
    ),
    'tasks', jsonb_build_object(
      'enabled', true,
      'compliance_acknowledged', null,
      'enabled_at', null,
      'enabled_by', null,
      'permissions', jsonb_build_object(
        'view', 5,
        'enable', 1,
        'configure', 3,
        'use', 5
      ),
      'config', null
    )
  ),
  integrations = COALESCE(integrations, '{}'::jsonb) || jsonb_build_object(
    '7shifts', jsonb_build_object(
      'enabled', false,
      'connected', false,
      'connected_at', null,
      'connected_by', null,
      'config', null
    ),
    'square', jsonb_build_object(
      'enabled', false,
      'connected', false,
      'connected_at', null,
      'connected_by', null,
      'config', null
    ),
    'toast', jsonb_build_object(
      'enabled', false,
      'connected', false,
      'connected_at', null,
      'connected_by', null,
      'config', null
    ),
    'quickbooks', jsonb_build_object(
      'enabled', false,
      'connected', false,
      'connected_at', null,
      'connected_by', null,
      'config', null
    )
  )
WHERE modules IS NULL OR NOT modules ? 'attendance';
