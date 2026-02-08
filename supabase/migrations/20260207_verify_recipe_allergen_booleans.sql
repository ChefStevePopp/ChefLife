-- =============================================================================
-- VERIFICATION: Allergen Boolean Migration Phase 1
-- =============================================================================
-- Run this AFTER the migration to verify columns were added and backfill worked.
-- This is READ-ONLY — safe to run at any time.
-- =============================================================================

-- 1. Verify columns exist (should return 76 rows)
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipes'
  AND column_name LIKE 'allergen_%'
ORDER BY column_name;

-- 2. Compare boolean columns vs JSONB for each recipe
-- Shows any mismatches between the backfilled booleans and the source JSONB
SELECT
  id,
  name,
  -- JSONB source
  "allergenInfo"->'contains' AS jsonb_contains,
  "allergenInfo"->'mayContain' AS jsonb_may_contain,
  -- Boolean columns (just a few key ones for spot-checking)
  allergen_peanut_contains,
  allergen_milk_contains,
  allergen_egg_contains,
  allergen_gluten_contains,
  allergen_garlic_contains,
  allergen_citrus_contains,
  allergen_declared_at
FROM recipes
WHERE "allergenInfo" IS NOT NULL
  AND "allergenInfo" != 'null'::jsonb
ORDER BY name;

-- 3. Count recipes with any CONTAINS boolean set to TRUE
SELECT
  COUNT(*) AS total_recipes,
  COUNT(*) FILTER (WHERE allergen_peanut_contains) AS peanut,
  COUNT(*) FILTER (WHERE allergen_milk_contains) AS milk,
  COUNT(*) FILTER (WHERE allergen_egg_contains) AS egg,
  COUNT(*) FILTER (WHERE allergen_gluten_contains) AS gluten,
  COUNT(*) FILTER (WHERE allergen_wheat_contains) AS wheat,
  COUNT(*) FILTER (WHERE allergen_garlic_contains) AS garlic,
  COUNT(*) FILTER (WHERE allergen_citrus_contains) AS citrus,
  COUNT(*) FILTER (WHERE allergen_onion_contains) AS onion,
  COUNT(*) FILTER (WHERE allergen_pork_contains) AS pork,
  COUNT(*) FILTER (WHERE allergen_declared_at IS NOT NULL) AS has_declared_at
FROM recipes;

-- 4. Mismatch check — find any recipe where JSONB says "contains peanut" 
--    but boolean says FALSE (or vice versa)
SELECT id, name,
  "allergenInfo"->'contains' ? 'peanut' AS jsonb_says_peanut,
  allergen_peanut_contains AS bool_says_peanut
FROM recipes
WHERE "allergenInfo" IS NOT NULL
  AND "allergenInfo" != 'null'::jsonb
  AND (
    ("allergenInfo"->'contains' ? 'peanut') != allergen_peanut_contains
    OR ("allergenInfo"->'contains' ? 'garlic') != allergen_garlic_contains
    OR ("allergenInfo"->'contains' ? 'milk') != allergen_milk_contains
  );
-- Expected: 0 rows (no mismatches)

-- 5. Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recipes'
  AND indexname LIKE 'idx_recipes_allergen%'
ORDER BY indexname;
