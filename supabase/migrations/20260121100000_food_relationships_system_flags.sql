-- ============================================================================
-- Food Relationships System Flags Migration
-- ============================================================================
-- Purpose: Add is_system and is_recipe_type flags to food_category_groups
-- This enables:
--   1. System groups that can be archived but not deleted
--   2. Recipe type groups that drive Recipe Manager tabs dynamically
--   3. Future: Setup wizard seeding, enterprise taxonomy
-- ============================================================================

-- Add new columns to food_category_groups
ALTER TABLE food_category_groups
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recipe_type BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN food_category_groups.is_system IS 'System groups cannot be deleted (can be archived). Seeded during org setup.';
COMMENT ON COLUMN food_category_groups.is_recipe_type IS 'Recipe type groups appear as tabs in Recipe Manager. Examples: MIS EN PLACE, FINAL GOODS, RECEIVING';

-- ============================================================================
-- Update existing Major Groups with system flags
-- This sets the correct flags for any existing groups that match system names
-- ============================================================================

-- Mark standard ingredient groups as system (not recipe types)
UPDATE food_category_groups
SET 
  is_system = true,
  is_recipe_type = false
WHERE UPPER(name) IN ('FOOD', 'ALCOHOL', 'CONSUMABLES', 'BEVERAGES')
  AND is_system IS NOT true;

-- Mark recipe-type groups as both system and recipe type
UPDATE food_category_groups
SET 
  is_system = true,
  is_recipe_type = true
WHERE UPPER(name) IN ('MIS EN PLACE', 'MISE EN PLACE', 'FINAL GOODS', 'FINAL PLATES', 'RECEIVING')
  AND is_system IS NOT true;

-- Mark RETAIL as recipe type but NOT system (user can delete)
UPDATE food_category_groups
SET 
  is_system = false,
  is_recipe_type = true
WHERE UPPER(name) IN ('RETAIL')
  AND is_recipe_type IS NOT true;

-- ============================================================================
-- Create index for recipe type lookups (used by Recipe Manager)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_food_category_groups_recipe_type 
  ON food_category_groups(organization_id, is_recipe_type) 
  WHERE is_recipe_type = true AND archived = false;

-- ============================================================================
-- Create constraint to prevent deletion of system groups
-- Note: This uses a trigger since CHECK constraints can't reference the row
-- ============================================================================

-- Create function to prevent system group deletion
CREATE OR REPLACE FUNCTION prevent_system_group_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system group "%". Archive it instead.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to make idempotent)
DROP TRIGGER IF EXISTS prevent_system_group_deletion_trigger ON food_category_groups;

CREATE TRIGGER prevent_system_group_deletion_trigger
  BEFORE DELETE ON food_category_groups
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_group_deletion();

-- ============================================================================
-- Verify migration
-- ============================================================================
DO $$
DECLARE
  system_count INTEGER;
  recipe_type_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO system_count FROM food_category_groups WHERE is_system = true;
  SELECT COUNT(*) INTO recipe_type_count FROM food_category_groups WHERE is_recipe_type = true;
  
  RAISE NOTICE 'Migration complete: % system groups, % recipe type groups', system_count, recipe_type_count;
END $$;
