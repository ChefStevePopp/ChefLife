/**
 * =============================================================================
 * allergenUtils — Shared Allergen Extraction & Boolean Helpers
 * =============================================================================
 *
 * SINGLE SOURCE OF TRUTH for allergen extraction from master ingredients.
 * Previously duplicated in three files (useAllergenCascade, useAllergenAutoSync,
 * useRecipeChangeDetection). Now consolidated here.
 *
 * Also provides helpers for reading/writing recipe allergen boolean columns,
 * used during the JSONB → boolean migration (Phase 2: dual-write).
 *
 * See: docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md
 * =============================================================================
 */

import type { AllergenType } from '@/features/allergens/types';
import { ALLERGEN_LIST } from '@/features/allergens/types';

// Re-export for consumers that were importing ALLERGEN_KEYS locally
export const ALLERGEN_KEYS: AllergenType[] = ALLERGEN_LIST;

// ============================================================================
// MIL EXTRACTION — Read allergens from master_ingredients boolean columns
// ============================================================================

/**
 * Extract allergens from a master ingredient record.
 * Reads both "contains" (allergen_x) and "may contain" (allergen_x_may_contain) fields.
 *
 * This is the CANONICAL implementation. All hooks should import this
 * rather than maintaining local copies.
 */
export function extractFromMasterIngredient(mi: any): {
  contains: AllergenType[];
  mayContain: AllergenType[];
} {
  const contains: AllergenType[] = [];
  const mayContain: AllergenType[] = [];
  if (!mi) return { contains, mayContain };

  for (const key of ALLERGEN_KEYS) {
    // Check "contains" field (e.g., allergen_peanut)
    const cv = mi[`allergen_${key}`];
    if (cv === true || cv === 'true' || cv === 1) {
      contains.push(key);
    }

    // Check "may contain" field (e.g., allergen_peanut_may_contain)
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

// ============================================================================
// RECIPE BOOLEAN HELPERS — Read/write allergen boolean columns on recipes
// ============================================================================

/**
 * Read allergen boolean columns from a recipe record into typed arrays.
 * Used by RecipeCardL5, DeclarationPanel, and change detection.
 */
export function getRecipeAllergenBooleans(recipe: any): {
  contains: AllergenType[];
  mayContain: AllergenType[];
  environment: AllergenType[];
} {
  const contains: AllergenType[] = [];
  const mayContain: AllergenType[] = [];
  const environment: AllergenType[] = [];

  for (const key of ALLERGEN_KEYS) {
    if (recipe[`allergen_${key}_contains`] === true) contains.push(key);
    if (recipe[`allergen_${key}_may_contain`] === true) mayContain.push(key);
    if (recipe[`allergen_${key}_environment`] === true) environment.push(key);
  }

  return { contains, mayContain, environment };
}

/**
 * Convert allergen arrays to boolean column object for writing to Supabase.
 * Used by useAllergenAutoSync during dual-write phase.
 *
 * Returns a flat object like:
 *   { allergen_peanut_contains: true, allergen_peanut_may_contain: false, ... }
 */
export function allergenArraysToBooleans(
  contains: string[],
  mayContain: string[],
  environment?: string[]
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  const containsSet = new Set(contains.map(s => s.toLowerCase()));
  const mayContainSet = new Set(mayContain.map(s => s.toLowerCase()));
  const environmentSet = new Set((environment || []).map(s => s.toLowerCase()));

  for (const key of ALLERGEN_KEYS) {
    result[`allergen_${key}_contains`] = containsSet.has(key);
    result[`allergen_${key}_may_contain`] = mayContainSet.has(key);
    result[`allergen_${key}_environment`] = environmentSet.has(key);
  }

  return result;
}
