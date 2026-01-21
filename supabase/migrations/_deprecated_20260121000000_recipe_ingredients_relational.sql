-- =====================================================================
-- Recipe Ingredients Relational Migration
-- =====================================================================
-- Purpose: Migrate from JSONB ingredients to relational table with FK constraints
-- "An accounting app masquerading as restaurant software"
-- When brisket price changes, 1000 recipes update automatically. Zero support tickets.
-- =====================================================================

-- =====================================================================
-- STEP 1: Create the relational recipe_ingredients table
-- =====================================================================

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_type TEXT NOT NULL CHECK (ingredient_type IN ('raw', 'prepared')),
  
  -- For raw ingredients (from master_ingredients)
  master_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE RESTRICT,
  
  -- For prepared items (recursive reference to recipes)
  prepared_recipe_id UUID REFERENCES recipes(id) ON DELETE RESTRICT,
  
  -- Quantity and unit
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  
  -- Cost tracking (denormalized for performance, auto-updated by trigger)
  cost_per_unit DECIMAL NOT NULL DEFAULT 0,
  
  -- Human-friendly measure (e.g., "2 cups", "1 bunch")
  common_measure TEXT,
  
  -- Notes specific to this usage
  notes TEXT,
  
  -- Ordering within recipe
  sort_order INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure exactly one type is set based on ingredient_type
  CONSTRAINT ingredient_type_check CHECK (
    (ingredient_type = 'raw' AND master_ingredient_id IS NOT NULL AND prepared_recipe_id IS NULL) OR
    (ingredient_type = 'prepared' AND prepared_recipe_id IS NOT NULL AND master_ingredient_id IS NULL)
  )
);

-- Add comments for documentation
COMMENT ON TABLE recipe_ingredients IS 'Relational junction table linking recipes to their ingredients (raw or prepared)';
COMMENT ON COLUMN recipe_ingredients.ingredient_type IS 'Type of ingredient: raw (from master_ingredients) or prepared (from other recipes)';
COMMENT ON COLUMN recipe_ingredients.cost_per_unit IS 'Denormalized cost, auto-updated by cascade trigger when source price changes';
COMMENT ON COLUMN recipe_ingredients.common_measure IS 'Human-friendly measure like "2 cups" or "1 bunch"';

-- =====================================================================
-- STEP 2: Create indexes for fast lookups
-- =====================================================================

-- Fast recipe ingredient lookups
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

-- Fast "which recipes use this ingredient?" queries
CREATE INDEX idx_recipe_ingredients_master_id ON recipe_ingredients(master_ingredient_id) WHERE master_ingredient_id IS NOT NULL;

-- Fast "which recipes use this prepared item?" queries
CREATE INDEX idx_recipe_ingredients_prepared_id ON recipe_ingredients(prepared_recipe_id) WHERE prepared_recipe_id IS NOT NULL;

-- Composite index for organization-scoped queries (via recipe join)
CREATE INDEX idx_recipe_ingredients_type ON recipe_ingredients(ingredient_type);

-- =====================================================================
-- STEP 3: Enable RLS and create policies
-- =====================================================================

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- View policy: Can see ingredients if can see the recipe
CREATE POLICY "View recipe ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
      AND (
        EXISTS (
          SELECT 1 FROM organization_roles
          WHERE organization_id = r.organization_id
          AND user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND raw_user_meta_data->>'role' = 'dev'
        )
      )
    )
  );

-- Manage policy: Can manage ingredients if can manage the recipe
CREATE POLICY "Manage recipe ingredients"
  ON recipe_ingredients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
      AND (
        EXISTS (
          SELECT 1 FROM organization_roles
          WHERE organization_id = r.organization_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
        )
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND raw_user_meta_data->>'role' = 'dev'
        )
      )
    )
  );

-- =====================================================================
-- STEP 4: Create updated_at trigger
-- =====================================================================

CREATE OR REPLACE FUNCTION update_recipe_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipe_ingredients_updated_at
BEFORE UPDATE ON recipe_ingredients
FOR EACH ROW
EXECUTE FUNCTION update_recipe_ingredients_updated_at();

-- =====================================================================
-- STEP 5: Create price cascade trigger
-- =====================================================================
-- When master_ingredient.cost_per_recipe_unit changes:
-- 1. Update all recipe_ingredients.cost_per_unit that reference it
-- 2. Recalculate total_cost for affected recipes

CREATE OR REPLACE FUNCTION cascade_ingredient_price_to_recipes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if price actually changed
  IF OLD.cost_per_recipe_unit IS NOT DISTINCT FROM NEW.cost_per_recipe_unit THEN
    RETURN NEW;
  END IF;

  -- Update cost_per_unit in all linked recipe_ingredients
  UPDATE recipe_ingredients
  SET 
    cost_per_unit = COALESCE(NEW.cost_per_recipe_unit, 0),
    updated_at = now()
  WHERE master_ingredient_id = NEW.id;
  
  -- Recalculate total_cost for all affected recipes
  UPDATE recipes r
  SET 
    total_cost = (
      SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = r.id
    ),
    updated_at = now()
  WHERE r.id IN (
    SELECT DISTINCT recipe_id 
    FROM recipe_ingredients 
    WHERE master_ingredient_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_cascade_ingredient_price ON master_ingredients;

-- Create the cascade trigger
CREATE TRIGGER trigger_cascade_ingredient_price
AFTER UPDATE OF cost_per_recipe_unit ON master_ingredients
FOR EACH ROW 
EXECUTE FUNCTION cascade_ingredient_price_to_recipes();

-- =====================================================================
-- STEP 6: Create cascade trigger for prepared items
-- =====================================================================
-- When a prepared recipe's cost changes, update recipes that use it

CREATE OR REPLACE FUNCTION cascade_prepared_recipe_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if total_cost actually changed
  IF OLD.total_cost IS NOT DISTINCT FROM NEW.total_cost THEN
    RETURN NEW;
  END IF;
  
  -- Only apply to prepared recipes
  IF NEW.type != 'prepared' THEN
    RETURN NEW;
  END IF;

  -- Update cost_per_unit in all recipe_ingredients that reference this prepared item
  UPDATE recipe_ingredients
  SET 
    cost_per_unit = COALESCE(NEW.total_cost, 0),
    updated_at = now()
  WHERE prepared_recipe_id = NEW.id;
  
  -- Recalculate total_cost for all affected parent recipes
  UPDATE recipes r
  SET 
    total_cost = (
      SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
      FROM recipe_ingredients ri
      WHERE ri.recipe_id = r.id
    ),
    updated_at = now()
  WHERE r.id IN (
    SELECT DISTINCT recipe_id 
    FROM recipe_ingredients 
    WHERE prepared_recipe_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trigger_cascade_prepared_recipe_price ON recipes;

-- Create the cascade trigger for prepared recipes
CREATE TRIGGER trigger_cascade_prepared_recipe_price
AFTER UPDATE OF total_cost ON recipes
FOR EACH ROW 
EXECUTE FUNCTION cascade_prepared_recipe_price();

-- =====================================================================
-- STEP 7: Add total_cost column to recipes if not exists
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE recipes ADD COLUMN total_cost DECIMAL DEFAULT 0;
    COMMENT ON COLUMN recipes.total_cost IS 'Total ingredient cost, auto-calculated from recipe_ingredients';
  END IF;
END $$;

-- =====================================================================
-- STEP 8: Create helper view for "recipes using ingredient X"
-- =====================================================================

CREATE OR REPLACE VIEW v_ingredient_usage AS
SELECT 
  ri.master_ingredient_id,
  mi.product as ingredient_name,
  ri.recipe_id,
  r.name as recipe_name,
  r.type as recipe_type,
  ri.quantity,
  ri.unit,
  ri.cost_per_unit,
  (ri.quantity * ri.cost_per_unit) as line_total,
  r.organization_id
FROM recipe_ingredients ri
JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
JOIN recipes r ON r.id = ri.recipe_id
WHERE ri.ingredient_type = 'raw';

COMMENT ON VIEW v_ingredient_usage IS 'Shows which recipes use each master ingredient - for VIM "Recipes using this" feature';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Next step: Run the data migration to move JSONB → relational
-- See: 20260121000001_migrate_recipe_ingredients_data.sql
-- =====================================================================
