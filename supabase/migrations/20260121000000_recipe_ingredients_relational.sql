-- =====================================================================
-- RECIPE INGREDIENTS RELATIONAL MIGRATION - COMBINED (CLEAN)
-- =====================================================================
-- Copy this entire file into Supabase SQL Editor and run it.
-- Includes cleanup of any previous partial runs.
-- =====================================================================

-- =====================================================================
-- CLEANUP: Drop any existing objects from previous attempts
-- =====================================================================
DO $cleanup_view$
BEGIN
  DROP VIEW IF EXISTS v_ingredient_usage;
EXCEPTION WHEN OTHERS THEN NULL;
END $cleanup_view$;

DO $cleanup_trigger1$
BEGIN
  DROP TRIGGER IF EXISTS trigger_cascade_ingredient_price ON master_ingredients;
EXCEPTION WHEN OTHERS THEN NULL;
END $cleanup_trigger1$;

DO $cleanup_trigger2$
BEGIN
  DROP TRIGGER IF EXISTS trigger_cascade_prepared_recipe_price ON recipes;
EXCEPTION WHEN OTHERS THEN NULL;
END $cleanup_trigger2$;

DO $cleanup_table$
BEGIN
  DROP TABLE IF EXISTS recipe_ingredients CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $cleanup_table$;

DROP FUNCTION IF EXISTS update_recipe_ingredients_updated_at();
DROP FUNCTION IF EXISTS cascade_ingredient_price_to_recipes();
DROP FUNCTION IF EXISTS cascade_prepared_recipe_price();

-- =====================================================================
-- PART 1: CREATE TABLE AND TRIGGERS
-- =====================================================================

-- Create the relational recipe_ingredients table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_type TEXT NOT NULL CHECK (ingredient_type IN ('raw', 'prepared')),
  master_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE RESTRICT,
  prepared_recipe_id UUID REFERENCES recipes(id) ON DELETE RESTRICT,
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  cost_per_unit DECIMAL NOT NULL DEFAULT 0,
  common_measure TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT ingredient_type_check CHECK (
    (ingredient_type = 'raw' AND master_ingredient_id IS NOT NULL AND prepared_recipe_id IS NULL) OR
    (ingredient_type = 'prepared' AND prepared_recipe_id IS NOT NULL AND master_ingredient_id IS NULL)
  )
);

-- Add comments
COMMENT ON TABLE recipe_ingredients IS 'Relational junction table linking recipes to their ingredients (raw or prepared)';
COMMENT ON COLUMN recipe_ingredients.ingredient_type IS 'Type of ingredient: raw (from master_ingredients) or prepared (from other recipes)';
COMMENT ON COLUMN recipe_ingredients.cost_per_unit IS 'Denormalized cost, auto-updated by cascade trigger when source price changes';

-- Create indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_master_id ON recipe_ingredients(master_ingredient_id) WHERE master_ingredient_id IS NOT NULL;
CREATE INDEX idx_recipe_ingredients_prepared_id ON recipe_ingredients(prepared_recipe_id) WHERE prepared_recipe_id IS NOT NULL;
CREATE INDEX idx_recipe_ingredients_type ON recipe_ingredients(ingredient_type);

-- Enable RLS
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- View policy
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

-- Manage policy
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

-- Updated_at trigger
CREATE FUNCTION update_recipe_ingredients_updated_at()
RETURNS TRIGGER AS $func1$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func1$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recipe_ingredients_updated_at
BEFORE UPDATE ON recipe_ingredients
FOR EACH ROW
EXECUTE FUNCTION update_recipe_ingredients_updated_at();

-- =====================================================================
-- PART 2: CASCADE TRIGGERS
-- =====================================================================

-- Price cascade trigger for raw ingredients
CREATE FUNCTION cascade_ingredient_price_to_recipes()
RETURNS TRIGGER AS $func2$
BEGIN
  IF OLD.cost_per_recipe_unit IS NOT DISTINCT FROM NEW.cost_per_recipe_unit THEN
    RETURN NEW;
  END IF;

  UPDATE recipe_ingredients
  SET 
    cost_per_unit = COALESCE(NEW.cost_per_recipe_unit, 0),
    updated_at = now()
  WHERE master_ingredient_id = NEW.id;
  
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
$func2$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_ingredient_price
AFTER UPDATE OF cost_per_recipe_unit ON master_ingredients
FOR EACH ROW 
EXECUTE FUNCTION cascade_ingredient_price_to_recipes();

-- Price cascade trigger for prepared items
CREATE FUNCTION cascade_prepared_recipe_price()
RETURNS TRIGGER AS $func3$
BEGIN
  IF OLD.total_cost IS NOT DISTINCT FROM NEW.total_cost THEN
    RETURN NEW;
  END IF;
  
  IF NEW.type != 'prepared' THEN
    RETURN NEW;
  END IF;

  UPDATE recipe_ingredients
  SET 
    cost_per_unit = COALESCE(NEW.total_cost, 0),
    updated_at = now()
  WHERE prepared_recipe_id = NEW.id;
  
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
$func3$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_prepared_recipe_price
AFTER UPDATE OF total_cost ON recipes
FOR EACH ROW 
EXECUTE FUNCTION cascade_prepared_recipe_price();

-- =====================================================================
-- PART 3: ADD total_cost COLUMN IF MISSING
-- =====================================================================

DO $add_column$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE recipes ADD COLUMN total_cost DECIMAL DEFAULT 0;
    COMMENT ON COLUMN recipes.total_cost IS 'Total ingredient cost, auto-calculated from recipe_ingredients';
  END IF;
END $add_column$;

-- =====================================================================
-- PART 4: CREATE HELPER VIEW
-- =====================================================================

CREATE VIEW v_ingredient_usage AS
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
-- PART 5: MIGRATE EXISTING JSONB DATA
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
  COALESCE(ing.value->>'type', 'raw')::text as ingredient_type,
  CASE 
    WHEN COALESCE(ing.value->>'type', 'raw') = 'raw' 
    THEN (ing.value->>'name')::uuid 
    ELSE NULL 
  END as master_ingredient_id,
  CASE 
    WHEN ing.value->>'type' = 'prepared' 
    THEN (ing.value->>'name')::uuid 
    ELSE NULL 
  END as prepared_recipe_id,
  -- Extract numeric portion from quantity (handles "1 oz", "2.5", "3", etc.)
  COALESCE(
    NULLIF(
      regexp_replace(ing.value->>'quantity', '[^0-9.]', '', 'g'),
      ''
    )::decimal,
    0
  ) as quantity,
  COALESCE(ing.value->>'unit', '') as unit,
  COALESCE((ing.value->>'cost')::decimal, 0) as cost_per_unit,
  ing.value->>'commonMeasure' as common_measure,
  ing.value->>'notes' as notes,
  (ing.ordinality - 1)::int as sort_order
FROM recipes r
CROSS JOIN LATERAL jsonb_array_elements(r.ingredients) WITH ORDINALITY AS ing(value, ordinality)
-- Join to validate raw ingredients exist
LEFT JOIN master_ingredients mi ON 
  COALESCE(ing.value->>'type', 'raw') = 'raw' 
  AND mi.id = (ing.value->>'name')::uuid
-- Join to validate prepared recipes exist  
LEFT JOIN recipes prep ON 
  ing.value->>'type' = 'prepared' 
  AND prep.id = (ing.value->>'name')::uuid
WHERE r.ingredients IS NOT NULL 
  AND jsonb_typeof(r.ingredients) = 'array'
  AND jsonb_array_length(r.ingredients) > 0
  AND NULLIF(ing.value->>'name', '') IS NOT NULL
  -- Only include if the FK reference is valid
  AND (
    (COALESCE(ing.value->>'type', 'raw') = 'raw' AND mi.id IS NOT NULL)
    OR
    (ing.value->>'type' = 'prepared' AND prep.id IS NOT NULL)
  )
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PART 6: REFRESH COSTS FROM CURRENT PRICES
-- =====================================================================

-- Update raw ingredient costs
UPDATE recipe_ingredients ri
SET cost_per_unit = COALESCE(mi.cost_per_recipe_unit, 0)
FROM master_ingredients mi
WHERE ri.master_ingredient_id = mi.id
  AND ri.ingredient_type = 'raw';

-- Update prepared recipe costs
UPDATE recipe_ingredients ri
SET cost_per_unit = COALESCE(prep.total_cost, 0)
FROM recipes prep
WHERE ri.prepared_recipe_id = prep.id
  AND ri.ingredient_type = 'prepared';

-- Recalculate all recipe total_costs
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
-- PART 7: VALIDATION REPORT
-- =====================================================================

DO $validation$
DECLARE
  jsonb_count INTEGER;
  relational_count INTEGER;
  orphan_raw_count INTEGER;
  orphan_prepared_count INTEGER;
BEGIN
  -- Count JSONB ingredients
  SELECT COALESCE(SUM(jsonb_array_length(ingredients)), 0) INTO jsonb_count
  FROM recipes
  WHERE ingredients IS NOT NULL 
    AND jsonb_typeof(ingredients) = 'array';
  
  -- Count relational ingredients
  SELECT COUNT(*) INTO relational_count FROM recipe_ingredients;
  
  -- Check orphans
  SELECT COUNT(*) INTO orphan_raw_count
  FROM recipe_ingredients ri
  LEFT JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
  WHERE ri.ingredient_type = 'raw' AND mi.id IS NULL;
  
  SELECT COUNT(*) INTO orphan_prepared_count
  FROM recipe_ingredients ri
  LEFT JOIN recipes r ON r.id = ri.prepared_recipe_id
  WHERE ri.ingredient_type = 'prepared' AND r.id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'JSONB ingredient rows: %', jsonb_count;
  RAISE NOTICE 'Relational ingredient rows: %', relational_count;
  RAISE NOTICE 'Orphaned raw references: %', orphan_raw_count;
  RAISE NOTICE 'Orphaned prepared references: %', orphan_prepared_count;
  RAISE NOTICE '========================================';
  
  IF orphan_raw_count > 0 OR orphan_prepared_count > 0 THEN
    RAISE WARNING 'Found orphaned references - check data integrity';
  ELSE
    RAISE NOTICE 'All references valid!';
  END IF;
END $validation$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- The JSONB 'ingredients' column is preserved for backward compatibility.
-- After frontend is updated, you can drop it with:
--   ALTER TABLE recipes DROP COLUMN ingredients;
-- =====================================================================
