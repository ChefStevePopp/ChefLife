-- =====================================================================
-- CASCADE TRIGGER TEST SCRIPT
-- =====================================================================
-- Run this AFTER applying the migration to verify cascade behavior.
-- This creates test data, triggers a price change, and validates results.
-- =====================================================================

-- Step 1: Check current state
SELECT 'BEFORE TEST - Recipe Ingredients Count' as check_type, COUNT(*) as count FROM recipe_ingredients;
SELECT 'BEFORE TEST - Recipes with total_cost' as check_type, COUNT(*) as count FROM recipes WHERE total_cost > 0;

-- Step 2: Find a master ingredient that's used in recipes
-- (So we can test the cascade)
SELECT 
  mi.id as ingredient_id,
  mi.product as ingredient_name,
  mi.cost_per_recipe_unit as current_cost,
  COUNT(ri.id) as used_in_recipes
FROM master_ingredients mi
JOIN recipe_ingredients ri ON ri.master_ingredient_id = mi.id
GROUP BY mi.id, mi.product, mi.cost_per_recipe_unit
ORDER BY COUNT(ri.id) DESC
LIMIT 5;

-- Step 3: Pick one ingredient and show affected recipes BEFORE price change
-- Replace {INGREDIENT_ID} with an actual ID from step 2
/*
SELECT 
  r.name as recipe_name,
  ri.quantity,
  ri.cost_per_unit,
  (ri.quantity * ri.cost_per_unit) as line_total,
  r.total_cost as recipe_total
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
WHERE ri.master_ingredient_id = '{INGREDIENT_ID}';
*/

-- =====================================================================
-- MANUAL CASCADE TEST
-- =====================================================================
-- Uncomment and run these steps one at a time to test cascade:
--
-- 1. Note the current price:
--    SELECT id, product, cost_per_recipe_unit FROM master_ingredients WHERE id = '{INGREDIENT_ID}';
--
-- 2. Update the price (add $1 for testing):
--    UPDATE master_ingredients 
--    SET cost_per_recipe_unit = cost_per_recipe_unit + 1 
--    WHERE id = '{INGREDIENT_ID}';
--
-- 3. Verify recipe_ingredients updated:
--    SELECT ri.cost_per_unit, r.name 
--    FROM recipe_ingredients ri 
--    JOIN recipes r ON r.id = ri.recipe_id
--    WHERE ri.master_ingredient_id = '{INGREDIENT_ID}';
--
-- 4. Verify recipes.total_cost updated:
--    SELECT r.name, r.total_cost
--    FROM recipes r
--    WHERE r.id IN (
--      SELECT recipe_id FROM recipe_ingredients 
--      WHERE master_ingredient_id = '{INGREDIENT_ID}'
--    );
--
-- 5. Revert the test price change:
--    UPDATE master_ingredients 
--    SET cost_per_recipe_unit = cost_per_recipe_unit - 1 
--    WHERE id = '{INGREDIENT_ID}';
-- =====================================================================

-- Step 4: Verify the view works for "Recipes using this ingredient"
SELECT 
  ingredient_name,
  recipe_name,
  recipe_type,
  quantity,
  unit,
  cost_per_unit,
  line_total
FROM v_ingredient_usage
LIMIT 10;

-- Step 5: Check for any orphaned references (should be 0)
SELECT 'Orphaned raw ingredients' as check_type, COUNT(*) as count
FROM recipe_ingredients ri
LEFT JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
WHERE ri.ingredient_type = 'raw' AND mi.id IS NULL;

SELECT 'Orphaned prepared ingredients' as check_type, COUNT(*) as count
FROM recipe_ingredients ri
LEFT JOIN recipes r ON r.id = ri.prepared_recipe_id
WHERE ri.ingredient_type = 'prepared' AND r.id IS NULL;

-- Step 6: Verify total_cost calculations match
SELECT 
  r.name,
  r.total_cost as stored_total,
  COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) as calculated_total,
  CASE 
    WHEN r.total_cost = COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) THEN '✓ Match'
    ELSE '✗ MISMATCH'
  END as status
FROM recipes r
LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
GROUP BY r.id, r.name, r.total_cost
HAVING r.total_cost != COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
   OR (r.total_cost > 0 AND COUNT(ri.id) = 0);

-- If the above returns no rows, all totals are correct!
SELECT 'SUCCESS: All recipe totals match calculated values!' as result
WHERE NOT EXISTS (
  SELECT 1
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  GROUP BY r.id, r.name, r.total_cost
  HAVING r.total_cost != COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
);
