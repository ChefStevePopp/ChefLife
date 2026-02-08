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
 * LIFE-SAFETY: If someone dies, we need to know that the allergen declaration
 * was current at the moment of save — not stale from a tab that wasn't mounted.
 * =============================================================================
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import type { AllergenType } from '@/features/allergens/types';
import type { Recipe } from '../../types/recipe';

// All allergen keys — must match useAllergenCascade.ts
const ALLERGEN_KEYS: AllergenType[] = [
  'peanut', 'crustacean', 'treenut', 'shellfish', 'sesame',
  'soy', 'fish', 'wheat', 'milk', 'sulphite', 'egg',
  'gluten', 'mustard', 'celery', 'garlic', 'onion',
  'nitrite', 'mushroom', 'hot_pepper', 'citrus', 'pork'
];

/**
 * Extract allergens from a master ingredient record.
 * Duplicated from useAllergenCascade to avoid circular dependency.
 * Both read the same MIL fields — keep in sync.
 */
function extractFromMasterIngredient(mi: any): { contains: AllergenType[]; mayContain: AllergenType[] } {
  const contains: AllergenType[] = [];
  const mayContain: AllergenType[] = [];
  if (!mi) return { contains, mayContain };

  for (const key of ALLERGEN_KEYS) {
    const cv = mi[`allergen_${key}`];
    if (cv === true || cv === 'true' || cv === 1) {
      contains.push(key);
    }
    const mcv = mi[`allergen_${key}_may_contain`];
    if ((mcv === true || mcv === 'true' || mcv === 1) && !contains.includes(key)) {
      mayContain.push(key);
    }
  }

  // Custom allergens
  for (let i = 1; i <= 3; i++) {
    const active = mi[`allergen_custom${i}_active`];
    const name = mi[`allergen_custom${i}_name`];
    const mc = mi[`allergen_custom${i}_may_contain`];
    if ((active === true || active === 'true' || active === 1) && name) {
      const customKey = name.toLowerCase() as AllergenType;
      if (mc === true || mc === 'true' || mc === 1) {
        mayContain.push(customKey);
      } else {
        contains.push(customKey);
      }
    }
  }

  return { contains, mayContain };
}

interface UseAllergenAutoSyncProps {
  recipe: Recipe | Omit<Recipe, 'id'> | null;
  onChange: (updates: Partial<Recipe>) => void;
}

/**
 * Auto-sync allergenInfo from ingredients + persisted manual overrides.
 * Runs at RecipeEditor level — always mounted, always current.
 */
export function useAllergenAutoSync({ recipe, onChange }: UseAllergenAutoSyncProps) {
  const { ingredients: masterIngredients } = useMasterIngredientsStore();
  const { recipes: allRecipes } = useRecipeStore();

  // Fingerprint ingredients list for change detection
  const ingredientFingerprint = useMemo(() => {
    if (!recipe) return '';
    return (recipe.ingredients || [])
      .map(ing => `${ing.id}:${ing.master_ingredient_id || ''}:${ing.prepared_recipe_id || ''}`)
      .sort()
      .join('|');
  }, [recipe?.ingredients]);

  // Compute auto-detected allergens from current ingredients
  const autoContains = useMemo(() => {
    const result = new Set<string>();
    if (!recipe) return result;
    for (const ing of recipe.ingredients || []) {
      const ingType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';

      if (ingType === 'raw' && ing.master_ingredient_id) {
        const mi = masterIngredients.find(m => m.id === ing.master_ingredient_id);
        if (mi) {
          for (const a of extractFromMasterIngredient(mi).contains) result.add(a);
        }
      } else if (ingType === 'prepared' && ing.prepared_recipe_id) {
        const sub = allRecipes.find(r => r.id === ing.prepared_recipe_id);
        if (sub?.allergenInfo?.contains) {
          for (const a of sub.allergenInfo.contains) result.add(a);
        }
      }
    }
    return result;
  }, [ingredientFingerprint, masterIngredients, allRecipes]);

  const autoMayContain = useMemo(() => {
    const result = new Set<string>();
    if (!recipe) return result;
    for (const ing of recipe.ingredients || []) {
      const ingType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';

      if (ingType === 'raw' && ing.master_ingredient_id) {
        const mi = masterIngredients.find(m => m.id === ing.master_ingredient_id);
        if (mi) {
          for (const a of extractFromMasterIngredient(mi).mayContain) {
            if (!autoContains.has(a)) result.add(a);
          }
        }
      } else if (ingType === 'prepared' && ing.prepared_recipe_id) {
        const sub = allRecipes.find(r => r.id === ing.prepared_recipe_id);
        if (sub?.allergenInfo?.mayContain) {
          for (const a of sub.allergenInfo.mayContain) {
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

  // Sync to recipe.allergenInfo when declaration changes
  // Use ref to avoid stale closure on onChange
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Previous declaration fingerprint to avoid unnecessary updates
  const prevFingerprintRef = useRef<string>('');

  useEffect(() => {
    const newFingerprint = `${finalContains.join(',')}|${finalMayContain.join(',')}|${(manual.crossContactNotes || []).join(',')}`;
    
    if (newFingerprint === prevFingerprintRef.current || !recipe) return;
    prevFingerprintRef.current = newFingerprint;

    const current = recipe.allergenInfo;
    const currentFingerprint = `${(current?.contains || []).slice().sort().join(',')}|${(current?.mayContain || []).slice().sort().join(',')}|${(current?.crossContactRisk || []).join(',')}`;

    if (newFingerprint !== currentFingerprint) {
      onChangeRef.current({
        allergenInfo: {
          contains: finalContains,
          mayContain: finalMayContain,
          crossContactRisk: manual.crossContactNotes || [],
        },
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
