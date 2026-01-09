-- ============================================================================
-- MIGRATION: Inventory Units & Reporting Fields
-- Date: 2026-01-09
-- Purpose: Complete the ingredient record with inventory tracking and 
--          reporting/dashboard visibility options
-- ============================================================================

-- ============================================================================
-- PART 1: INVENTORY UNIT FIELDS
-- ============================================================================
-- The inventory_unit_type tells us WHAT unit we count in (LB, EACH, CASE, etc.)
-- The existing units_per_case tells us HOW MANY of those units per purchase
-- The existing inventory_unit_cost is auto-calculated by trigger

ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS inventory_unit_type TEXT;

COMMENT ON COLUMN master_ingredients.inventory_unit_type IS 
  'The unit used for inventory counting (LB, EACH, CASE, %, etc.)';

COMMENT ON COLUMN master_ingredients.units_per_case IS 
  'Number of inventory units per purchase unit - feeds inventory_unit_cost calculation';

COMMENT ON COLUMN master_ingredients.inventory_unit_cost IS 
  'Auto-calculated: current_price / units_per_case - cost per inventory unit';

-- ============================================================================
-- PART 2: REPORTING & TRACKING FIELDS
-- ============================================================================

-- Priority level for dashboard visibility and attention
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'standard';

COMMENT ON COLUMN master_ingredients.priority_level IS 
  'Priority for tracking: critical, high, standard, low';

-- Which inventory counts should this item appear in?
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS inventory_schedule TEXT[] DEFAULT '{}';

COMMENT ON COLUMN master_ingredients.inventory_schedule IS 
  'Array of inventory schedules this item belongs to: daily, weekly, monthly, spot';

-- Dashboard visibility
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS show_on_dashboard BOOLEAN DEFAULT false;

COMMENT ON COLUMN master_ingredients.show_on_dashboard IS 
  'Pin this ingredient to the admin dashboard for visibility';

-- Alert preferences
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS alert_price_change BOOLEAN DEFAULT false;

ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS alert_low_stock BOOLEAN DEFAULT false;

COMMENT ON COLUMN master_ingredients.alert_price_change IS 
  'Send alert when price changes significantly';

COMMENT ON COLUMN master_ingredients.alert_low_stock IS 
  'Send alert when stock falls below reorder_point';

-- Par levels for inventory management
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS par_level NUMERIC(10,2);

ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(10,2);

COMMENT ON COLUMN master_ingredients.par_level IS 
  'Target inventory level (in inventory units)';

COMMENT ON COLUMN master_ingredients.reorder_point IS 
  'Alert threshold - reorder when stock falls below this (in inventory units)';


-- ============================================================================
-- PART 3: ENHANCED COST CALCULATION TRIGGERS
-- ============================================================================
-- Ensure cost_per_recipe_unit is ALSO auto-calculated when price changes
-- (inventory_unit_cost trigger already exists)

CREATE OR REPLACE FUNCTION calculate_recipe_unit_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cost_per_recipe_unit with yield adjustment
  -- Formula: (price / recipe_units) / (yield / 100)
  IF NEW.recipe_unit_per_purchase_unit > 0 AND NEW.yield_percent > 0 THEN
    NEW.cost_per_recipe_unit := ROUND(
      (NEW.current_price / NEW.recipe_unit_per_purchase_unit) / (NEW.yield_percent / 100),
      4
    );
  ELSE
    NEW.cost_per_recipe_unit := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists and recreate to ensure it's current
DROP TRIGGER IF EXISTS calculate_recipe_unit_cost_trigger ON master_ingredients;

CREATE TRIGGER calculate_recipe_unit_cost_trigger
BEFORE INSERT OR UPDATE OF current_price, recipe_unit_per_purchase_unit, yield_percent
ON master_ingredients
FOR EACH ROW
EXECUTE FUNCTION calculate_recipe_unit_cost();

COMMENT ON FUNCTION calculate_recipe_unit_cost() IS 
  'Auto-calculates cost_per_recipe_unit when price, units, or yield changes';


-- ============================================================================
-- PART 4: CASCADE TO RECIPE INGREDIENTS (Cost ripple effect)
-- ============================================================================
-- When an ingredient's cost changes, update all recipe_ingredients using it

CREATE OR REPLACE FUNCTION cascade_ingredient_cost_to_recipes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cascade if cost_per_recipe_unit actually changed
  IF OLD.cost_per_recipe_unit IS DISTINCT FROM NEW.cost_per_recipe_unit THEN
    -- Update all recipe_ingredients that use this master_ingredient
    UPDATE recipe_ingredients
    SET 
      unit_cost = NEW.cost_per_recipe_unit,
      total_cost = quantity * NEW.cost_per_recipe_unit,
      updated_at = NOW()
    WHERE master_ingredient_id = NEW.id;
    
    -- Note: recipe totals should be recalculated by their own triggers
    -- or via a view/computed column
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if recipe_ingredients table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
    DROP TRIGGER IF EXISTS cascade_ingredient_cost_trigger ON master_ingredients;
    
    CREATE TRIGGER cascade_ingredient_cost_trigger
    AFTER UPDATE OF cost_per_recipe_unit
    ON master_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION cascade_ingredient_cost_to_recipes();
  END IF;
END $$;

COMMENT ON FUNCTION cascade_ingredient_cost_to_recipes() IS 
  'Cascades ingredient cost changes to all recipes using that ingredient';


-- ============================================================================
-- PART 5: INDEXES FOR REPORTING QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_master_ingredients_priority 
ON master_ingredients(priority_level) 
WHERE priority_level IN ('critical', 'high');

CREATE INDEX IF NOT EXISTS idx_master_ingredients_dashboard 
ON master_ingredients(show_on_dashboard) 
WHERE show_on_dashboard = true;

CREATE INDEX IF NOT EXISTS idx_master_ingredients_inventory_schedule 
ON master_ingredients USING GIN(inventory_schedule);


-- ============================================================================
-- VERIFICATION QUERY (run manually to confirm)
-- ============================================================================
-- SELECT 
--   column_name, 
--   data_type, 
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'master_ingredients' 
--   AND column_name IN (
--     'inventory_unit_type', 
--     'priority_level', 
--     'inventory_schedule',
--     'show_on_dashboard',
--     'alert_price_change',
--     'alert_low_stock',
--     'par_level',
--     'reorder_point'
--   )
-- ORDER BY column_name;
