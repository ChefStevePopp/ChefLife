-- Migration: Fix Price Cascade Trigger
-- Date: 2026-01-31
-- Issue: Trigger was set to fire on UPDATE OF cost_per_recipe_unit, but that column
--        is modified by a BEFORE trigger, not the original UPDATE statement.
--        PostgreSQL's UPDATE OF clause only detects columns in the original statement.
-- Fix: Fire trigger on the columns VIM actually updates (current_price, etc.)

-- ============================================================================
-- STEP 1: Drop the broken trigger
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_cascade_ingredient_price ON master_ingredients;

-- ============================================================================
-- STEP 2: Recreate trigger to fire on the RIGHT columns
-- These are the columns that:
--   a) VIM updates directly (current_price)
--   b) Affect cost_per_recipe_unit calculation (recipe_unit_per_purchase_unit, yield_percent)
-- ============================================================================
CREATE TRIGGER trigger_cascade_ingredient_price
AFTER UPDATE OF current_price, recipe_unit_per_purchase_unit, yield_percent
ON master_ingredients
FOR EACH ROW
EXECUTE FUNCTION cascade_ingredient_price_to_recipes();

-- ============================================================================
-- STEP 3: Clean up orphaned function (references non-existent columns)
-- cascade_ingredient_cost_to_recipes tries to update unit_cost and total_cost
-- but recipe_ingredients only has cost_per_unit
-- ============================================================================
DROP FUNCTION IF EXISTS cascade_ingredient_cost_to_recipes();

-- ============================================================================
-- STEP 4: Verify the working function is correct (no changes needed, just documenting)
-- cascade_ingredient_price_to_recipes() correctly:
--   - Updates recipe_ingredients.cost_per_unit
--   - Recalculates recipes.total_cost
--   - Returns NEW
-- ============================================================================

-- ============================================================================
-- STEP 5: One-time backfill - sync all recipe_ingredients to current MIL prices
-- This catches any recipes that drifted while the trigger was broken
-- ============================================================================
UPDATE recipe_ingredients ri
SET 
  cost_per_unit = COALESCE(mi.cost_per_recipe_unit, 0),
  updated_at = NOW()
FROM master_ingredients mi
WHERE ri.master_ingredient_id = mi.id
  AND ri.cost_per_unit IS DISTINCT FROM mi.cost_per_recipe_unit;

-- Also recalculate recipe totals for any affected recipes
UPDATE recipes r
SET 
  total_cost = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
  ),
  updated_at = NOW()
WHERE r.id IN (
  SELECT DISTINCT recipe_id 
  FROM recipe_ingredients 
  WHERE updated_at > NOW() - INTERVAL '1 minute'
);

-- ============================================================================
-- VERIFICATION QUERY (run manually to confirm)
-- This should return 0 rows if everything synced correctly:
-- ============================================================================
-- SELECT 
--   ri.id,
--   r.name as recipe_name,
--   mi.product as ingredient,
--   ri.cost_per_unit as recipe_cost,
--   mi.cost_per_recipe_unit as mil_cost,
--   ri.cost_per_unit - mi.cost_per_recipe_unit as drift
-- FROM recipe_ingredients ri
-- JOIN master_ingredients mi ON ri.master_ingredient_id = mi.id
-- JOIN recipes r ON ri.recipe_id = r.id
-- WHERE ri.cost_per_unit IS DISTINCT FROM mi.cost_per_recipe_unit;
