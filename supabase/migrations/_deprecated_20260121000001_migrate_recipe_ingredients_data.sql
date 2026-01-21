-- =====================================================================
-- Recipe Ingredients Data Migration
-- =====================================================================
-- Purpose: Extract existing JSONB ingredients into relational recipe_ingredients table
-- Run AFTER: 20260121000000_recipe_ingredients_relational.sql
-- =====================================================================

-- =====================================================================
-- STEP 1: Migrate existing JSONB ingredients to relational rows
-- =====================================================================

INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_type,
  master_ingredient_id,
  prepared_recipe_id,
  quantity,
  unit,
  cost_per_unit,
  common_measure,
  notes,
  sort_order
)
SELECT 
  r.id as recipe_id,
  -- Determine ingredient type (default to 'raw' if not specified)
  COALESCE(ing->>'type', 'raw')::text as ingredient_type,
  -- For raw ingredients, the 'name' field actually stores master_ingredient_id
  CASE 
    WHEN COALESCE(ing->>'type', 'raw') = 'raw' 
    THEN (ing->>'name')::uuid 
    ELSE NULL 
  END as master_ingredient_id,
  -- For prepared items, the 'name' field stores recipe_id
  CASE 
    WHEN ing->>'type' = 'prepared' 
    THEN (ing->>'name')::uuid 
    ELSE NULL 
  END as prepared_recipe_id,
  -- Parse quantity (was stored as string, convert to decimal)
  COALESCE(NULLIF(ing->>'quantity', '')::decimal, 0) as quantity,
  -- Unit string
  COALESCE(ing->>'unit', '') as unit,
  -- Cost per unit
  COALESCE((ing->>'cost')::decimal, 0) as cost_per_unit,
  -- Common measure (human-friendly like "2 cups")
  ing->>'commonMeasure' as common_measure,
  -- Notes
  ing->>'notes' as notes,
  -- Preserve ordering using array position
  (ordinality - 1)::int as sort_order
FROM recipes r
CROSS JOIN LATERAL jsonb_array_elements(r.ingredients) WITH ORDINALITY AS ing(value, ordinality)
WHERE r.ingredients IS NOT NULL 
  AND jsonb_typeof(r.ingredients) = 'array'
  AND jsonb_array_length(r.ingredients) > 0
  -- Skip rows where 'name' field is empty (incomplete ingredient entries)
  AND NULLIF(ing->>'name', '') IS NOT NULL
-- Avoid duplicates on re-run
ON CONFLICT DO NOTHING;

-- =====================================================================
-- STEP 2: Validate migration counts
-- =====================================================================

DO $$
DECLARE
  jsonb_count INTEGER;
  relational_count INTEGER;
  recipe_with_ingredients INTEGER;
  relational_recipe_count INTEGER;
BEGIN
  -- Count total ingredients in JSONB
  SELECT COALESCE(SUM(jsonb_array_length(ingredients)), 0) INTO jsonb_count
  FROM recipes
  WHERE ingredients IS NOT NULL 
    AND jsonb_typeof(ingredients) = 'array';
  
  -- Count relational ingredients
  SELECT COUNT(*) INTO relational_count FROM recipe_ingredients;
  
  -- Count recipes with JSONB ingredients
  SELECT COUNT(*) INTO recipe_with_ingredients
  FROM recipes
  WHERE ingredients IS NOT NULL 
    AND jsonb_typeof(ingredients) = 'array'
    AND jsonb_array_length(ingredients) > 0;
  
  -- Count distinct recipes in relational table
  SELECT COUNT(DISTINCT recipe_id) INTO relational_recipe_count FROM recipe_ingredients;
  
  RAISE NOTICE '=== Migration Validation ===';
  RAISE NOTICE 'JSONB ingredient rows: %', jsonb_count;
  RAISE NOTICE 'Relational ingredient rows: %', relational_count;
  RAISE NOTICE 'Recipes with JSONB ingredients: %', recipe_with_ingredients;
  RAISE NOTICE 'Recipes in relational table: %', relational_recipe_count;
  
  -- Warn if counts don't match (some may have been skipped due to empty names)
  IF jsonb_count != relational_count THEN
    RAISE NOTICE 'Note: Count mismatch may be due to empty/invalid ingredient entries in JSONB being skipped';
  END IF;
END $$;

-- =====================================================================
-- STEP 3: Update recipe total_cost from relational data
-- =====================================================================

UPDATE recipes r
SET total_cost = (
  SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
  FROM recipe_ingredients ri
  WHERE ri.recipe_id = r.id
)
WHERE EXISTS (
  SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
);

-- =====================================================================
-- STEP 4: Find and log any orphaned references
-- =====================================================================

DO $$
DECLARE
  orphan_raw_count INTEGER;
  orphan_prepared_count INTEGER;
BEGIN
  -- Check for raw ingredients referencing non-existent master_ingredients
  SELECT COUNT(*) INTO orphan_raw_count
  FROM recipe_ingredients ri
  LEFT JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
  WHERE ri.ingredient_type = 'raw' AND mi.id IS NULL;
  
  -- Check for prepared ingredients referencing non-existent recipes
  SELECT COUNT(*) INTO orphan_prepared_count
  FROM recipe_ingredients ri
  LEFT JOIN recipes r ON r.id = ri.prepared_recipe_id
  WHERE ri.ingredient_type = 'prepared' AND r.id IS NULL;
  
  IF orphan_raw_count > 0 THEN
    RAISE WARNING 'Found % raw ingredients with missing master_ingredient references', orphan_raw_count;
  END IF;
  
  IF orphan_prepared_count > 0 THEN
    RAISE WARNING 'Found % prepared ingredients with missing recipe references', orphan_prepared_count;
  END IF;
  
  IF orphan_raw_count = 0 AND orphan_prepared_count = 0 THEN
    RAISE NOTICE 'All ingredient references are valid!';
  END IF;
END $$;

-- =====================================================================
-- STEP 5: Refresh cost_per_unit from current master_ingredient prices
-- =====================================================================
-- This ensures we have the latest prices, not stale JSONB snapshots

UPDATE recipe_ingredients ri
SET cost_per_unit = COALESCE(mi.cost_per_recipe_unit, 0)
FROM master_ingredients mi
WHERE ri.master_ingredient_id = mi.id
  AND ri.ingredient_type = 'raw';

-- Also update from prepared recipes
UPDATE recipe_ingredients ri
SET cost_per_unit = COALESCE(prep.total_cost, 0)
FROM recipes prep
WHERE ri.prepared_recipe_id = prep.id
  AND ri.ingredient_type = 'prepared';

-- Recalculate all recipe total_costs with fresh prices
UPDATE recipes r
SET total_cost = (
  SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
  FROM recipe_ingredients ri
  WHERE ri.recipe_id = r.id
)
WHERE EXISTS (
  SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
);

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- The JSONB 'ingredients' column is NOT dropped yet.
-- It will be kept for backward compatibility until frontend is updated.
-- After frontend migration is complete, run:
--   ALTER TABLE recipes DROP COLUMN ingredients;
-- =====================================================================
