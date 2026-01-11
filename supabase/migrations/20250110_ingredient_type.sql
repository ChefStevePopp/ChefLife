-- ============================================================================
-- INGREDIENT TYPE & SOURCE RECIPE - Distinguish Purchased vs Prep
-- ============================================================================
-- Adds explicit type flag to master_ingredients for filtering/reporting
-- Links prep ingredients to their source recipe for cost sync
-- ============================================================================

-- Add ingredient_type column
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS ingredient_type TEXT DEFAULT 'purchased' 
CHECK (ingredient_type IN ('purchased', 'prep'));

-- Add source_recipe_id for prep items
ALTER TABLE master_ingredients
ADD COLUMN IF NOT EXISTS source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Index for fast filtering by type
CREATE INDEX IF NOT EXISTS idx_master_ingredients_type 
ON master_ingredients(organization_id, ingredient_type);

-- Index for recipe lookups
CREATE INDEX IF NOT EXISTS idx_master_ingredients_source_recipe 
ON master_ingredients(source_recipe_id) 
WHERE source_recipe_id IS NOT NULL;

-- ============================================================================
-- BACKFILL: Identify existing prep items
-- ============================================================================
-- Items without item_code (or with '-') are likely prep items
-- This is a best-guess migration - user can correct if needed

UPDATE master_ingredients 
SET ingredient_type = 'prep' 
WHERE (item_code IS NULL OR item_code = '' OR item_code = '-')
AND ingredient_type = 'purchased';

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN master_ingredients.ingredient_type IS 
'Type of ingredient: purchased (from vendor) or prep (made in-house from recipe)';

COMMENT ON COLUMN master_ingredients.source_recipe_id IS 
'For prep ingredients: links to the recipe that produces this ingredient. Cost syncs from recipe.';
