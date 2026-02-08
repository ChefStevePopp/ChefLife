# HANDOFF: Allergen Declaration Save Fix

## Date: 2026-02-06
## Status: IN PROGRESS - needs testing after restart

---

## THE PROBLEM

AllergenControl's "Accept & Save Declaration" button fails with:
```
Could not find the 'allergens' column of 'recipes' in the schema cache
```

**Root cause:** TypeScript Recipe type has `allergens` field that doesn't exist in database. Database only has `"allergenInfo"` (JSONB column, case-sensitive with quotes).

---

## DATABASE SCHEMA (recipes table)

```sql
"allergenInfo" jsonb null default '[]'::jsonb
```

**NO `allergens` column exists.** The boolean allergen fields are on `master_ingredients`, not `recipes`.

---

## FILES MODIFIED (need verification)

### 1. `src/features/recipes/stores/recipeStore.ts`
- Added `"allergens"` to `viewOnlyFields` filter array in `updateRecipe()`
- This strips the non-existent field before sending to Supabase

### 2. `src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx`
- Changed `handleSave()` to only send `allergenInfo` (not both `allergens` and `allergenInfo`)
- Uses `useRecipeStore().updateRecipe()` directly for immediate persistence

### 3. `src/features/recipes/components/RecipeDetailPage/index.tsx`
- Changed `createNewRecipe()` to use `allergenInfo` instead of `allergens`

### 4. `src/features/recipes/components/RecipeEditor/index.tsx` (LEGACY MODAL - may not be used)
- Changed `createNewRecipe()` to use `allergenInfo` instead of `allergens`
- Re-added `useRecipeStore` import that was accidentally removed

---

## WHAT NEEDS TO BE DONE NEXT SESSION

1. **Restart dev server** - HMR failed, changes may not be loaded

2. **Verify the fix works:**
   - Open a recipe with ingredients that have allergens
   - Go to Allergens tab
   - Rose bar should appear: "X allergens detected — declaration required"
   - Click "Accept & Save Declaration"
   - Should see toast "Allergen declaration saved"
   - Should persist to database

3. **Check for other `allergens` references:**
   ```bash
   grep -r "allergens:" --include="*.ts" --include="*.tsx" src/features/recipes
   ```
   The TypeScript type still has `allergens?` field - that's OK (for backwards compat), just don't send it to database.

4. **Verify RecipeDetailPage flow still works:**
   - The page has its own floating action bar with "Save Changes"
   - AllergenControl has its own floating action bar with "Save Declaration"  
   - These should work independently (allergen saves immediately, recipe saves when user clicks main save)

---

## KEY INSIGHT

- `allergens` = TypeScript-only field (for backwards compat in UI)
- `allergenInfo` = Actual database JSONB column
- `recipeStore.updateRecipe()` now filters out `allergens` before API call

---

## FILES TO CHECK

- `src/features/recipes/types/recipe.ts` - Has both `allergens?` and `allergenInfo?` (that's OK)
- `src/features/recipes/stores/recipeStore.ts` - Line ~197 should have `"allergens"` in filter
- `src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx` - `handleSave()` only sends `allergenInfo`

---

## CONTEXT FROM SESSION

This was part of implementing the two-stage legal checkpoint for allergen declarations:
1. **Stage 1 (Rose bar):** First-time declaration - operator must accept liability
2. **Stage 2 (Amber bar):** Changes detected - operator must review and save

The "Natasha's Promise" principle: ChefLife shows the truth (auto-detects), operator owns the declaration (accepts liability).
