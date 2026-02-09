# Session 80 Handoff — Allergen Boolean Migration Phase 1 + Phase 2 + Phase 3

**Date:** February 8, 2026  
**Session:** 80  
**Focus:** Allergen Boolean Migration — database columns + dual-write + read migration  
**Status:** Phase 1 ✅ + Phase 2 ✅ + Phase 3 ✅ — all reads from booleans, only Phase 4 (JSONB drop) remains

---

## What Was Completed

### Phase 1: Database (Add Columns + Backfill)

**Migration:** `supabase/migrations/20260207_add_recipe_allergen_boolean_columns.sql`

- Added 76 columns to `recipes` table:
  - 63 standard allergen booleans (21 allergens × 3 tiers: contains, may_contain, environment)
  - 12 custom allergen columns (3 slots × name + 3 tiers)
  - 1 timestamp: `allergen_declared_at`
- Backfilled from existing `"allergenInfo"` JSONB using dynamic PL/pgSQL loop
- `allergen_declared_at` set to `updated_at` for recipes with allergen data (17 of 37 recipes)
- Created 24 indexes:
  - 21 partial indexes on `_contains` columns (one per allergen)
  - 1 composite "Big 9" priority allergen index
  - 1 freshness index on `allergen_declared_at`
  - 1 existing GIN index on `"allergenInfo"` (was already there)

**Verification:** `20260207_verify_recipe_allergen_booleans.sql`
- 0 mismatches between JSONB and boolean columns
- Aggregate counts confirmed: garlic=12, egg=5, citrus=3, milk=1, gluten=1
- All indexes confirmed via `pg_indexes`

### Phase 2: Shared Utility + Dual-Write

**New file:** `src/features/allergens/utils/allergenUtils.ts`
- `extractFromMasterIngredient()` — canonical implementation (was duplicated in 3 files)
- `getRecipeAllergenBooleans()` — read booleans from recipe record into typed arrays
- `allergenArraysToBooleans()` — convert arrays to flat boolean column object for Supabase writes
- `ALLERGEN_KEYS` — re-exported from `ALLERGEN_LIST`

**Updated files:**

| File | Change |
|---|---|
| `allergenUtils.ts` | **NEW** — shared utility with 3 exported functions |
| `utils/index.ts` | Added `allergenUtils` export |
| `recipe.ts` (types) | Added 76 optional fields for boolean columns + `allergen_declared_at` |
| `useAllergenAutoSync.ts` | Imports shared util, writes BOTH JSONB + booleans + timestamp |
| `useAllergenCascade.ts` | Imports shared `extractFromMasterIngredient`, removed local copy |
| `useRecipeChangeDetection.ts` | Imports shared `extractFromMasterIngredient` + `ALLERGEN_KEYS`, removed local copies |

**Dual-write behavior:** Every time `useAllergenAutoSync` fires (on ingredient change, any tab), it now writes:
1. `allergenInfo` JSONB (legacy, backward compat)
2. `allergen_X_contains`, `allergen_X_may_contain` booleans (new truth)
3. `allergen_declared_at` = current timestamp

### Phase 3: Read from Booleans

**Audit result:** Most consumers were already on booleans from earlier sessions. Only two JSONB reads remained:

| File | Change |
|---|---|
| `RecipeDetailPage/index.tsx` | `allergensDirty` prop switched from `allergenInfo?.contains/mayContain` to `getRecipeAllergenBooleans()` |
| `useAllergenAutoSync.ts` | Comparison fingerprint switched from `recipe.allergenInfo` to `getRecipeAllergenBooleans()` for contains/mayContain |

**What still reads `allergenInfo` (correct — no boolean equivalent):**
- `crossContactRisk` text notes in: `useAllergenAutoSync`, `useRecipeChangeDetection`, `Allergens.tsx`, `Overview.tsx`
- Type definitions (`recipe.ts`, `types.ts`)
- Initialization for new recipes (`createNewRecipe`, `recipeStore.ts`)
- Tab dirty detection (`useTabChanges.ts`) — works fine during dual-write

**Dead code identified (not imported anywhere):**
- `actions.ts` — old camelCase action functions
- `recipeRelations.ts` — old relation transformer
- `recipeApi.ts` — old API layer
- `recipeTransformers.ts` — old data transformer

---

## What Was NOT Changed

- `recipeStore.ts` — no changes needed. Uses `select("*")` so booleans flow through automatically. Strip list only removes view-only fields, not allergen booleans.
- `recipes_with_categories` view — not updated yet. The view explicitly lists columns from the `recipes` table. The new boolean columns are not in the view, but they ARE on the base table, and most code reads from the table directly. View update is optional cleanup for Phase 4.
- Environment tier — all `_environment` columns default to FALSE. No UI to set them yet. That comes with Allergen Manager / station integration.

---

## Architecture Decision: Auth Identity Bridge

**Decision:** Complete boolean migration FIRST, then auth identity bridge.

**Reasoning:** Phases 2-4 don't introduce any new user-identity columns. `modified_by` already captures who saved. Declaration pinning ("Steve Popp confirmed these allergens at 2:30 PM") needs real `auth.users` IDs but is a post-Phase 4 feature. No rework needed.

---

## Verification Steps for Next Session

Before starting Phase 3, verify dual-write is working:

1. Open any recipe in the editor
2. Add or remove an ingredient
3. Save the recipe
4. Run this SQL to confirm booleans and JSONB agree:

```sql
SELECT 
  name,
  "allergenInfo"->'contains' AS jsonb_contains,
  allergen_garlic_contains AS bool_garlic,
  allergen_milk_contains AS bool_milk,
  allergen_egg_contains AS bool_egg,
  allergen_declared_at
FROM recipes
WHERE "allergenInfo" IS NOT NULL
  AND "allergenInfo" != 'null'::jsonb
ORDER BY allergen_declared_at DESC NULLS LAST
LIMIT 5;
```

Recipes saved after this session should have a fresh `allergen_declared_at` timestamp (today or later). Recipes not re-saved will still show the backfilled `updated_at` value.

---

## Next: Phase 4 — Drop JSONB (1 session, after 2+ weeks validation)

After 2+ weeks of production use with dual-write:

1. **Remove dual-write** from `useAllergenAutoSync` — stop writing `allergenInfo` JSONB
2. **Add `crossContactNotes` column** to recipes table (text[] or JSONB) — crossContactRisk text notes currently have no boolean equivalent
3. **Update `useTabChanges`** — change allergens tab tracking from `allergenInfo` to boolean columns
4. **Drop `allergenInfo` column** from recipes table
5. **Clean up dead code** — `actions.ts`, `recipeRelations.ts`, `recipeApi.ts`, `recipeTransformers.ts`
6. **Update `recipes_with_categories` view** if it needs boolean columns explicitly
7. **Remove `allergenInfo` from type definitions** — `recipe.ts`, `types.ts`
8. **Drop GIN index** on `"allergenInfo"` JSONB column

**Do NOT rush Phase 4.** The dual-write validates that booleans work correctly in production. Waiting gives time to catch edge cases.

---

## Files Changed This Session

```
NEW:
  src/features/allergens/utils/allergenUtils.ts
  supabase/migrations/20260207_add_recipe_allergen_boolean_columns.sql
  supabase/migrations/20260207_verify_recipe_allergen_booleans.sql

MODIFIED:
  src/features/allergens/utils/index.ts
  src/features/recipes/types/recipe.ts
  src/features/recipes/components/RecipeEditor/useAllergenAutoSync.ts
  src/features/recipes/components/RecipeEditor/AllergenControl/useAllergenCascade.ts
  src/features/recipes/components/RecipeEditor/useRecipeChangeDetection.ts
  docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md
```

---

*"76 columns, zero mismatches, one shared utility where there used to be three copies. The boolean migration is halfway done and the cascade never blinked."*
