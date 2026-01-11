-- =============================================================================
-- MIGRATION: Recipe Item Codes
-- =============================================================================
-- Date: January 11, 2026
-- Purpose: Add item_code to recipes table for unified identification
-- 
-- Format: {TYPE_PREFIX}-{FRIENDLY_ID}
--   P-abc123xy = Prepared (prep item, links to MIL)
--   F-def456zw = Final (menu item, links to POS)
--   B-ghi789ab = Batch (production tracking)
--
-- This creates bidirectional linking:
--   recipe.item_code <-> master_ingredient.item_code (for prep items)
--   recipe.item_code <-> pos_item.item_code (for final items, future)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Add item_code column to recipes
-- -----------------------------------------------------------------------------
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS item_code VARCHAR(20);

-- -----------------------------------------------------------------------------
-- STEP 2: Create function to generate short ID from UUID
-- -----------------------------------------------------------------------------
-- Uses first 8 chars of UUID (without dashes) - simple and readable
-- Combined with type prefix gives us unique, meaningful codes
CREATE OR REPLACE FUNCTION generate_recipe_item_code(recipe_id UUID, recipe_type VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
  prefix CHAR(1);
  short_id VARCHAR(8);
BEGIN
  -- Get prefix from recipe type (first letter, uppercase)
  prefix := UPPER(LEFT(COALESCE(recipe_type, 'prepared'), 1));
  
  -- Get first 8 chars of UUID (without dashes)
  short_id := LEFT(REPLACE(recipe_id::TEXT, '-', ''), 8);
  
  -- Return prefixed code
  RETURN prefix || '-' || short_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- STEP 3: Backfill existing recipes
-- -----------------------------------------------------------------------------
UPDATE recipes
SET item_code = generate_recipe_item_code(id, type)
WHERE item_code IS NULL;

-- -----------------------------------------------------------------------------
-- STEP 4: Add unique constraint and index (after backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE recipes
DROP CONSTRAINT IF EXISTS recipes_item_code_unique;

ALTER TABLE recipes
ADD CONSTRAINT recipes_item_code_unique UNIQUE (item_code);

CREATE INDEX IF NOT EXISTS idx_recipes_item_code ON recipes(item_code);

-- -----------------------------------------------------------------------------
-- STEP 5: Create trigger to auto-generate item_code on insert
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_recipe_item_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if not provided
  IF NEW.item_code IS NULL THEN
    NEW.item_code := generate_recipe_item_code(NEW.id, NEW.type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_recipe_item_code ON recipes;

CREATE TRIGGER trigger_set_recipe_item_code
  BEFORE INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION set_recipe_item_code();

-- -----------------------------------------------------------------------------
-- STEP 6: Update trigger to handle type changes
-- -----------------------------------------------------------------------------
-- If recipe type changes, regenerate the item_code prefix
CREATE OR REPLACE FUNCTION update_recipe_item_code_on_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If type changed, regenerate item_code with new prefix
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    NEW.item_code := generate_recipe_item_code(NEW.id, NEW.type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recipe_item_code ON recipes;

CREATE TRIGGER trigger_update_recipe_item_code
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_item_code_on_type_change();

-- -----------------------------------------------------------------------------
-- STEP 7: Add comment for documentation
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN recipes.item_code IS 'Unique identifier for cross-system linking. Format: {TYPE}-{SHORT_UUID}. P=Prepared, F=Final, B=Batch. Auto-generated on insert.';

-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  missing_count INT;
  sample_codes TEXT;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM recipes WHERE item_code IS NULL;
  IF missing_count > 0 THEN
    RAISE WARNING 'Migration incomplete: % recipes still missing item_code', missing_count;
  ELSE
    -- Show sample codes
    SELECT STRING_AGG(item_code, ', ') INTO sample_codes 
    FROM (SELECT item_code FROM recipes LIMIT 5) t;
    RAISE NOTICE 'Migration complete. Sample codes: %', sample_codes;
  END IF;
END $$;
