-- =============================================================================
-- MIGRATION: Add "May Contain" allergen columns
-- =============================================================================
-- Purpose: Enable tri-state allergen tracking at ingredient level
--   - Contains:     Ingredient IS the allergen (existing columns)
--   - May Contain:  Supplier cross-contamination warning (NEW columns)
--   - Environment:  Kitchen cross-contact (handled at RECIPE level, not here)
--
-- This supports the liability chain:
--   Ingredient → Recipe → Menu
--   Each level can inherit and ADD warnings, never remove them.
-- =============================================================================

-- Add may_contain columns for all 21 standard allergens
ALTER TABLE master_ingredients
  ADD COLUMN IF NOT EXISTS allergen_peanut_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_crustacean_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_treenut_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_shellfish_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sesame_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_soy_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_fish_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_wheat_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_milk_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sulphite_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_egg_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_gluten_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mustard_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_celery_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_garlic_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_onion_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_nitrite_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mushroom_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_hot_pepper_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_citrus_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_pork_may_contain BOOLEAN DEFAULT FALSE;

-- Custom allergens also get may_contain variants
ALTER TABLE master_ingredients
  ADD COLUMN IF NOT EXISTS allergen_custom1_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom2_may_contain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom3_may_contain BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- COMMENTS for documentation
-- =============================================================================
COMMENT ON COLUMN master_ingredients.allergen_peanut IS 'Contains peanut allergen';
COMMENT ON COLUMN master_ingredients.allergen_peanut_may_contain IS 'Supplier warns: may contain peanut (cross-contamination)';

COMMENT ON COLUMN master_ingredients.allergen_milk IS 'Contains milk/dairy allergen';
COMMENT ON COLUMN master_ingredients.allergen_milk_may_contain IS 'Supplier warns: may contain milk (cross-contamination)';

-- Add similar comments for other allergens as needed

-- =============================================================================
-- NOTE ON ENVIRONMENT ALLERGENS
-- =============================================================================
-- Environment/kitchen cross-contact risks are NOT stored at ingredient level.
-- They are managed at Recipe level where operational context exists.
-- This keeps ingredients as "raw data" and recipes as "operational data".
-- =============================================================================
