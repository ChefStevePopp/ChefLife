/**
 * =============================================================================
 * useAllergenAutoSync — Editor-Level Allergen Cascade
 * =============================================================================
 * 
 * WHY THIS EXISTS:
 * AllergenControl only mounts on the Allergens tab. When an ingredient is
 * removed on the Ingredients tab, the allergen cascade wasn't running —
 * allergenInfo went stale, the save captured phantom allergens, and the
 * version detection never fired a MAJOR bump for a life-safety change.
 * 
 * This hook runs at the RecipeEditor level, regardless of active tab.
 * It watches recipe.ingredients and recomputes allergenInfo on every change.
 * Manual overrides are read from recipe.allergenManualOverrides (persisted),
 * not local component state.
 * 
 * AllergenControl still owns the full UI — add/remove manual overrides,
 * promotions, cross-contact notes. But the CASCADE runs here, always.
 * 
 * DUAL-WRITE (Phase 2): This hook now writes BOTH the legacy allergenInfo
 * JSONB AND the new boolean columns. This ensures both storage formats
 * stay in sync during the migration period. See:
 * docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md
 * 
 * LIFE-SAFETY: If someone dies, we need to know that the allergen declaration
 * was current at the moment of save — not stale from a tab that wasn't mounted.
 * =============================================================================
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import type { AllergenType } from '@/features/allergens/types';
import type { Recipe } from '../../types/recipe';
import { extractFromMasterIngredient, allergenArraysToBooleans, getRecipeAllergenBooleans } from '@/features/allergens/utils';

interface UseAllergenAutoSyncProps {
  recipe: Recipe | Omit<Recipe, 'id'> | null;
  onChange: (updates: Partial<Recipe>) => void;
}

/**
 * Auto-sync allergenInfo from ingredients + persisted manual overrides.
 * Runs at RecipeEditor level — always mounted, always current.
 *
 * DUAL-WRITE: Writes both allergenInfo JSONB and boolean columns.
 */
export function useAllergenAutoSync({ recipe, onChange }: UseAllergenAutoSyncProps) {
  const { ingredients: masterIngredients } = useMasterIngredientsStore();
  const { recipes: allRecipes } = useRecipeStore();

  // Fingerprint ingredients list for change detection
  // Uses name fallback for legacy ingredients that lack master_ingredient_id
  const ingredientFingerprint = useMemo(() => {
    if (!recipe) return '';
    return (recipe.ingredients || [])
      .map(ing => {
        const miId = ing.master_ingredient_id || ((!ing.ingredient_type || ing.ingredient_type === 'raw' || ing.type === 'raw') ? ing.name : '');
        const prId = ing.prepared_recipe_id || ((ing.ingredient_type === 'prepared' || ing.type === 'prepared') ? ing.name : '');
        return `${ing.id}:${miId || ''}:${prId || ''}`;
      })
      .sort()
      .join('|');
  }, [recipe?.ingredients]);

  // ---------------------------------------------------------------------------
  // INGREDIENT ID RESOLUTION
  // Ingredients JSONB uses 'name' to hold the MIL/recipe UUID (legacy schema).
  // Some newer records may also have master_ingredient_id / prepared_recipe_id.
  // We resolve with fallback: explicit field → legacy 'name' field.
  // ---------------------------------------------------------------------------
  const resolveRawId = (ing: any): string | undefined => {
    const ingType = ing.ingredient_type || (ing.type as string) || 'raw';
    if (ingType !== 'raw') return undefined;
    return ing.master_ingredient_id || ing.name || undefined;
  };

  const resolvePreparedId = (ing: any): string | undefined => {
    const ingType = ing.ingredient_type || (ing.type as string) || 'raw';
    if (ingType !== 'prepared') return undefined;
    return ing.prepared_recipe_id || ing.name || undefined;
  };

  // Compute auto-detected allergens from current ingredients
  const autoContains = useMemo(() => {
    const result = new Set<string>();
    if (!recipe) return result;
    for (const ing of recipe.ingredients || []) {
      const rawId = resolveRawId(ing);
      const prepId = resolvePreparedId(ing);

      if (rawId) {
        const mi = masterIngredients.find(m => m.id === rawId);
        if (mi) {
          for (const a of extractFromMasterIngredient(mi).contains) result.add(a);
        }
      } else if (prepId) {
        const sub = allRecipes.find(r => r.id === prepId);
        if (sub) {
          for (const a of getRecipeAllergenBooleans(sub).contains) result.add(a);
        }
      }
    }
    return result;
  }, [ingredientFingerprint, masterIngredients, allRecipes]);

  const autoMayContain = useMemo(() => {
    const result = new Set<string>();
    if (!recipe) return result;
    for (const ing of recipe.ingredients || []) {
      const rawId = resolveRawId(ing);
      const prepId = resolvePreparedId(ing);

      if (rawId) {
        const mi = masterIngredients.find(m => m.id === rawId);
        if (mi) {
          for (const a of extractFromMasterIngredient(mi).mayContain) {
            if (!autoContains.has(a)) result.add(a);
          }
        }
      } else if (prepId) {
        const sub = allRecipes.find(r => r.id === prepId);
        if (sub) {
          for (const a of getRecipeAllergenBooleans(sub).mayContain) {
            if (!autoContains.has(a)) result.add(a);
          }
        }
      }
    }
    return result;
  }, [ingredientFingerprint, masterIngredients, allRecipes, autoContains]);

  // Read persisted manual overrides (or empty defaults)
  const manual = recipe?.allergenManualOverrides || {
    manualContains: [],
    manualMayContain: [],
    promotedToContains: [],
    manualNotes: {},
    crossContactNotes: [],
  };

  // Compute final declaration: auto + manual
  const finalContains = useMemo(() => {
    const result = new Set<string>(autoContains);
    for (const a of manual.manualContains) result.add(a);
    for (const a of manual.promotedToContains) {
      if (autoMayContain.has(a)) result.add(a); // Only promote if still in mayContain
    }
    return Array.from(result).sort();
  }, [autoContains, autoMayContain, manual.manualContains, manual.promotedToContains]);

  const finalMayContain = useMemo(() => {
    const containsSet = new Set(finalContains);
    const result = new Set<string>();
    for (const a of autoMayContain) {
      if (!containsSet.has(a)) result.add(a);
    }
    for (const a of manual.manualMayContain) {
      if (!containsSet.has(a)) result.add(a);
    }
    return Array.from(result).sort();
  }, [autoMayContain, finalContains, manual.manualMayContain]);

  // Sync to recipe.allergenInfo AND boolean columns when declaration changes
  // Use ref to avoid stale closure on onChange
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Previous declaration fingerprint to avoid unnecessary updates
  const prevFingerprintRef = useRef<string>('');

  useEffect(() => {
    const newFingerprint = `${finalContains.join(',')}|${finalMayContain.join(',')}|${(manual.crossContactNotes || []).join(',')}`;
    
    if (newFingerprint === prevFingerprintRef.current || !recipe) return;
    prevFingerprintRef.current = newFingerprint;

    // Phase 3: Read contains/mayContain from boolean columns (source of truth)
    // CrossContactRisk stays in allergenInfo (text notes, no boolean equivalent)
    const currentBools = getRecipeAllergenBooleans(recipe);
    const currentFingerprint = `${[...currentBools.contains].sort().join(',')}|${[...currentBools.mayContain].sort().join(',')}|${(recipe.allergenInfo?.crossContactRisk || []).join(',')}`;

    if (newFingerprint !== currentFingerprint) {
      // Build boolean columns from the computed arrays
      const booleanColumns = allergenArraysToBooleans(
        finalContains,
        finalMayContain,
        // Environment tier: preserve existing values (manual-only, not computed)
        // During dual-write, environment booleans are not yet populated
      );

      onChangeRef.current({
        // Legacy JSONB (keep for backward compat during migration)
        allergenInfo: {
          contains: finalContains,
          mayContain: finalMayContain,
          crossContactRisk: manual.crossContactNotes || [],
        },
        // New boolean columns (Phase 2 dual-write)
        ...booleanColumns,
        // NOTE: allergen_declared_at is NOT set here. That timestamp is
        // exclusively owned by the "Confirm Declaration & Save" flow in
        // RecipeDetailPage. Auto-sync computes what the declaration SHOULD
        // be — but only the operator's explicit confirmation makes it official.
      });
    }
  }, [finalContains, finalMayContain, manual.crossContactNotes]);

  // Also clean orphaned promotions — if a promoted allergen is no longer in 
  // autoMayContain (ingredient removed), remove the promotion
  useEffect(() => {
    const validPromotions = manual.promotedToContains.filter(a => autoMayContain.has(a));
    if (validPromotions.length !== manual.promotedToContains.length) {
      onChangeRef.current({
        allergenManualOverrides: {
          ...manual,
          promotedToContains: validPromotions,
        },
      });
    }
  }, [autoMayContain, manual.promotedToContains]);
}
