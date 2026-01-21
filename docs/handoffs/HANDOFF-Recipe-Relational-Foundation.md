# Recipe Manager — Relational Foundation Handoff

> **Created:** January 21, 2026  
> **Purpose:** Migrate from JSONB ingredients to relational tables with cascade triggers  
> **Mantra:** "An accounting app masquerading as restaurant software"

---

## Why This Matters

At 1000 restaurants:
- JSONB = 50,000 stale recipe costs when brisket price changes = support nightmare
- Relational + Triggers = automatic cascade, zero tickets, correct by default

---

## Current State

| Component | Status | Location |
|-----------|--------|----------|
| Recipe Library UI | ✅ Working | `src/features/recipes/components/RecipeManager/RecipeManager.tsx` |
| Recipe Editor | ✅ Working | `src/features/recipes/components/RecipeEditor/` |
| Ingredients Input | ✅ Links to master_ingredients | `.../BasicInformation/IngredientsInput.tsx` |
| Data Storage | ❌ JSONB | `recipes.ingredients` column stores JSON array |
| Price Cascade | ❌ None | Costs are snapshots, go stale |
| "Recipes using X" | ❌ Hard | No FK = full table scan of JSON |

---

## Target State

### Schema

```sql
-- recipe_ingredients (relational, indexed, FK-constrained)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_type TEXT NOT NULL CHECK (ingredient_type IN ('raw', 'prepared')),
  master_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE RESTRICT,
  prepared_recipe_id UUID REFERENCES recipes(id) ON DELETE RESTRICT,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL DEFAULT 0,
  common_measure TEXT,  -- "2 cups" human-friendly
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one type is set
  CONSTRAINT ingredient_type_check CHECK (
    (ingredient_type = 'raw' AND master_ingredient_id IS NOT NULL AND prepared_recipe_id IS NULL) OR
    (ingredient_type = 'prepared' AND prepared_recipe_id IS NOT NULL AND master_ingredient_id IS NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_master ON recipe_ingredients(master_ingredient_id);
CREATE INDEX idx_recipe_ingredients_prepared ON recipe_ingredients(prepared_recipe_id);
```

### Cascade Trigger

```sql
-- When master_ingredient price changes → update all linked recipe_ingredients
CREATE OR REPLACE FUNCTION cascade_ingredient_price_to_recipes()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cost_per_unit in recipe_ingredients
  UPDATE recipe_ingredients
  SET 
    cost_per_unit = NEW.cost_per_recipe_unit,
    updated_at = now()
  WHERE master_ingredient_id = NEW.id;
  
  -- Recalculate total_cost for affected recipes
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

CREATE TRIGGER trigger_cascade_ingredient_price
AFTER UPDATE OF cost_per_recipe_unit ON master_ingredients
FOR EACH ROW 
WHEN (OLD.cost_per_recipe_unit IS DISTINCT FROM NEW.cost_per_recipe_unit)
EXECUTE FUNCTION cascade_ingredient_price_to_recipes();
```

### Migration Script

```sql
-- Extract JSONB ingredients → relational rows
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
  COALESCE((ing->>'type'), 'raw') as ingredient_type,
  CASE WHEN (ing->>'type') = 'raw' THEN (ing->>'name')::uuid ELSE NULL END as master_ingredient_id,
  CASE WHEN (ing->>'type') = 'prepared' THEN (ing->>'name')::uuid ELSE NULL END as prepared_recipe_id,
  COALESCE((ing->>'quantity')::decimal, 0) as quantity,
  COALESCE(ing->>'unit', '') as unit,
  COALESCE((ing->>'cost')::decimal, 0) as cost_per_unit,
  ing->>'commonMeasure' as common_measure,
  ing->>'notes' as notes,
  (row_number() OVER (PARTITION BY r.id ORDER BY ordinality))::int - 1 as sort_order
FROM recipes r
CROSS JOIN LATERAL jsonb_array_elements(r.ingredients) WITH ORDINALITY AS ing(value, ordinality)
WHERE r.ingredients IS NOT NULL 
  AND jsonb_array_length(r.ingredients) > 0;
```

---

## Route-Based Architecture

**Current:** Modal-based editing  
**Target:** Route-based (like IngredientDetailPage)

| Route | Purpose | Auth |
|-------|---------|------|
| `/admin/recipes` | Library view (tabs: Mis en Place, Final Plates, Receiving) | Required |
| `/admin/recipes/:id` | Edit page | Required |
| `/admin/recipes/:id/view` | Read-only view | Required |
| `/admin/recipes/new` | Create page | Required |
| `/r/:friendlyId` | Public recipe view (future) | Optional |

**Use Case:** QR code on prep label → line cook scans → sees recipe instantly

---

## Files to Modify

| File | Change |
|------|--------|
| `src/features/recipes/stores/recipeStore.ts` | Load from `recipe_ingredients` table, not JSONB |
| `src/features/recipes/components/RecipeEditor/BasicInformation/IngredientsInput.tsx` | Save to relational table |
| `src/features/recipes/api/recipeApi.ts` | Update queries to use JOINs |
| `src/features/recipes/types/recipe.ts` | Update `RecipeIngredient` interface |
| New: `supabase/migrations/YYYYMMDD_recipe_ingredients_relational.sql` | Schema + trigger + migration |

---

## Type Updates

```typescript
// Current (broken)
export interface RecipeIngredient {
  id: string;
  name: string;        // ← Stores master_ingredient_id but named wrong
  quantity: string;    // ← String, should be number
  unit: string;
  notes?: string;
  cost: number;
  commonMeasure?: string;
}

// Target (correct)
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_type: 'raw' | 'prepared';
  master_ingredient_id?: string;
  prepared_recipe_id?: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  common_measure?: string;
  notes?: string;
  sort_order: number;
  // Joined fields (read-only)
  ingredient_name?: string;  // From master_ingredients.product or recipes.name
  allergens?: string[];      // From master_ingredients.allergens
}
```

---

## Build Sequence

1. **Schema** — Create `recipe_ingredients` table with constraints
2. **Migration** — Extract JSONB → relational rows
3. **Trigger** — Price cascade automation
4. **Types** — Update TypeScript interfaces
5. **Store** — Refactor to query relational data
6. **API** — Update save/load to use new table
7. **Routes** — Add `/admin/recipes/:id` pattern
8. **Cleanup** — Remove JSONB column after verification

---

## Validation Queries

```sql
-- Count recipes with ingredients
SELECT COUNT(*) FROM recipes WHERE jsonb_array_length(ingredients) > 0;

-- After migration, should match
SELECT COUNT(DISTINCT recipe_id) FROM recipe_ingredients;

-- Find orphaned ingredient references
SELECT ri.* FROM recipe_ingredients ri
LEFT JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
WHERE ri.ingredient_type = 'raw' AND mi.id IS NULL;

-- Test cascade: check recipe costs update
SELECT r.name, r.total_cost, SUM(ri.quantity * ri.cost_per_unit) as calculated
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
GROUP BY r.id, r.name, r.total_cost
HAVING r.total_cost != SUM(ri.quantity * ri.cost_per_unit);
```

---

## Success Criteria

- [ ] `recipe_ingredients` table created with FK constraints
- [ ] All existing JSONB ingredients migrated to relational rows
- [ ] Zero orphaned references
- [ ] Cascade trigger fires on price change
- [ ] Recipe `total_cost` auto-updates within 1 second of price change
- [ ] "Recipes using this ingredient" query < 50ms
- [ ] UI unchanged — IngredientsInput still works
- [ ] Route `/admin/recipes/:id` works for edit

---

*"Correct by default. Always. Automatically."*
