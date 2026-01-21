# Recipe Manager — Relational Foundation Handoff

> **Created:** January 21, 2026  
> **Updated:** January 21, 2026 — Database migration COMPLETE ✓
> **Purpose:** Migrate from JSONB ingredients to relational tables with cascade triggers  
> **Mantra:** "An accounting app masquerading as restaurant software"

---

## Why This Matters

At 1000 restaurants:
- JSONB = 50,000 stale recipe costs when brisket price changes = support nightmare
- Relational + Triggers = automatic cascade, zero tickets, correct by default

---

## Build Progress

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1. Schema | Create `recipe_ingredients` table | ✅ DONE | FK constraints, indexes, RLS |
| 2. Migration | Extract JSONB → relational rows | ✅ DONE | Orphaned refs filtered |
| 3. Trigger | Price cascade automation | ✅ DONE | Raw + Prepared triggers |
| 4. Types | Update TypeScript interfaces | ✅ DONE | `recipe.ts` updated |
| 5. API | CRUD operations for relational data | ✅ DONE | `recipeIngredientsApi.ts` |
| 6. Store | Refactor to query relational data | ⏳ Next | `recipeStore.ts` |
| 7. UI | Update IngredientsInput component | ⏳ Pending | Keep JSONB sync during transition |
| 8. Routes | Add `/admin/recipes/:id` pattern | ⏳ Pending | Route-based editing |
| 9. Cleanup | Remove JSONB column | ⏳ Pending | After full verification |

---

## Database Objects Created

### Table: `recipe_ingredients`
```sql
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY,
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
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes
- `idx_recipe_ingredients_recipe_id` — Fast recipe lookups
- `idx_recipe_ingredients_master_id` — "Recipes using this ingredient"
- `idx_recipe_ingredients_prepared_id` — "Recipes using this sub-recipe"
- `idx_recipe_ingredients_type` — Filter by raw/prepared

### Triggers
- `trigger_cascade_ingredient_price` on `master_ingredients` — When raw ingredient price changes
- `trigger_cascade_prepared_recipe_price` on `recipes` — When prepared item cost changes
- `trigger_recipe_ingredients_updated_at` — Auto-update timestamps

### View: `v_ingredient_usage`
For VIM "Recipes using this ingredient" feature:
```sql
SELECT master_ingredient_id, ingredient_name, recipe_id, recipe_name, 
       recipe_type, quantity, unit, cost_per_unit, line_total, organization_id
FROM v_ingredient_usage
WHERE master_ingredient_id = '{uuid}';
```

### RLS Policies
- `View recipe ingredients` — SELECT if user can view the recipe
- `Manage recipe ingredients` — ALL if user is owner/admin or dev

---

## Cascade Test Results (Verified ✓)

| Recipe | BEFORE cost | AFTER cost (+$1) | BEFORE total | AFTER total |
|--------|-------------|------------------|--------------|-------------|
| House Mayonnaise | -0.8375 | 0.1625 | 49.62 | 52.62 |
| Roasted Garlic & Dijon | -0.8375 | 0.1625 | 35.53 | 38.53 |
| Caramelized Onions | -0.8375 | 0.1625 | 37.19 | 45.19 |

**Result:** Price change propagated automatically through triggers. ✓

---

## Files

### Migration (Applied)
```
supabase/migrations/20260121000000_recipe_ingredients_relational.sql
```

### Test Scripts
```
supabase/tests/test_cascade_triggers.sql
```

### TypeScript
```
src/features/recipes/types/recipe.ts          # Updated RecipeIngredient interface
src/features/recipes/api/recipeIngredientsApi.ts  # New CRUD API module
```

### Deprecated (Had bugs, never ran)
```
supabase/migrations/_deprecated_20260121000000_recipe_ingredients_relational.sql
supabase/migrations/_deprecated_20260121000001_migrate_recipe_ingredients_data.sql
```

---

## Current State

### What Works
- **Cascade triggers** — Price changes flow automatically to recipe costs
- **v_ingredient_usage view** — Query "which recipes use ingredient X"
- **Relational data** — FK constraints prevent orphaned references
- **JSONB preserved** — `recipes.ingredients` still exists for current UI

### What's Dual-State (Transition Period)
- `recipes.ingredients` (JSONB) — Used by current frontend
- `recipe_ingredients` (relational) — Used by triggers, ready for frontend

### Data Note
Some `master_ingredients.cost_per_recipe_unit` values are negative (e.g., Salt at -0.8375) due to yield percentage import issue (0.0068 instead of 0.68). The cascade works correctly — fix the source data and costs will auto-correct.

---

## Next Session: Frontend Integration

### Store Changes (`recipeStore.ts`)
1. Add `fetchRecipeWithIngredients(id)` that queries relational table
2. Update `updateRecipe()` to save to both JSONB and relational (transition)
3. Eventually: Remove JSONB writes

### UI Changes (`IngredientsInput.tsx`)
1. Read from relational data (via API module)
2. Write to relational table (via API module)
3. Sync to JSONB during transition for backward compatibility

### Route Changes
1. Add `/admin/recipes/:id` for route-based editing
2. Match pattern used by `IngredientDetailPage`

---

## Validation Queries

```sql
-- Count migrated ingredients
SELECT COUNT(*) FROM recipe_ingredients;

-- Check for orphans (should be 0)
SELECT COUNT(*) FROM recipe_ingredients ri
LEFT JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
WHERE ri.ingredient_type = 'raw' AND mi.id IS NULL;

-- Verify cascade on price change
UPDATE master_ingredients SET cost_per_recipe_unit = cost_per_recipe_unit + 0.01 
WHERE id = 'YOUR-UUID';
-- Then check recipe_ingredients.cost_per_unit and recipes.total_cost updated

-- Recipes using an ingredient
SELECT * FROM v_ingredient_usage WHERE master_ingredient_id = 'YOUR-UUID';
```

---

*"Correct by default. Always. Automatically."*
