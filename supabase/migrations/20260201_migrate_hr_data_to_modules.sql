-- Migrate existing HR data from settings to modules column
-- This preserves any policies that were stored in the old settings.hr structure

UPDATE organizations
SET modules = jsonb_set(
  COALESCE(modules, '{}'::jsonb),
  '{hr}',
  COALESCE(settings->'hr', '{}'::jsonb)
)
WHERE settings ? 'hr'
  AND settings->'hr' IS NOT NULL
  AND (modules IS NULL OR NOT modules ? 'hr');

-- Comment for documentation
COMMENT ON COLUMN organizations.modules IS 'Module-specific configuration data (HR, VIM, Operations, etc.). Migrated from settings.hr on 2026-02-01';
