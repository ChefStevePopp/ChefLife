import { useMemo } from 'react';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import type { AllergenType } from '@/features/allergens/types';
import type { Recipe, RecipeIngredient } from '../../types/recipe';

// ============================================================================
// CHANGE DETECTION HOOK — Layer 3 of 7-Layer Allergen Integration
// ============================================================================
// Compares current recipe state against the last saved version.
// Returns structured change data with per-change tier suggestions
// and a safety floor that the operator CANNOT downgrade below.
//
// Critical principle: If someone dies, this data needs to prove
// we detected the change, told the operator, and enforced the right
// communication tier. Every line here is audit trail.
// ============================================================================

export type BumpTier = 'patch' | 'minor' | 'major';

export interface DetectedChange {
  id: string;
  category: 'allergen-contains' | 'allergen-maycontain' | 'allergen-crosscontact' | 'ingredient-added' | 'ingredient-removed' | 'ingredient-swapped' | 'yield' | 'method' | 'notes';
  description: string;
  suggestedTier: BumpTier;
  isSafetyFloor: boolean; // true = operator cannot downgrade below this tier
  reason: string;
}

export interface ChangeDetectionResult {
  changes: DetectedChange[];
  hasChanges: boolean;
  suggestedTier: BumpTier;
  tierReason: string;
  hasSafetyFloor: boolean;
  minimumTier: BumpTier;
}

// Tier ranking for MAX comparisons
const TIER_RANK: Record<BumpTier, number> = { patch: 0, minor: 1, major: 2 };
const RANK_TO_TIER: BumpTier[] = ['patch', 'minor', 'major'];

function maxTier(a: BumpTier, b: BumpTier): BumpTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

// ============================================================================
// ARRAY DIFFING — Set operations for allergen/ingredient comparison
// ============================================================================

function arrayDiff(current: string[], previous: string[]): { added: string[]; removed: string[] } {
  const currentSet = new Set(current.map(s => s.toLowerCase().trim()));
  const previousSet = new Set(previous.map(s => s.toLowerCase().trim()));

  const added = [...currentSet].filter(item => !previousSet.has(item));
  const removed = [...previousSet].filter(item => !currentSet.has(item));

  return { added, removed };
}

// Format allergen name for display (peanut → Peanut, treenut → Tree Nut)
function formatAllergenName(key: string): string {
  const map: Record<string, string> = {
    peanut: 'Peanut', crustacean: 'Crustacean', treenut: 'Tree Nut',
    shellfish: 'Shellfish', sesame: 'Sesame', soy: 'Soy', fish: 'Fish',
    wheat: 'Wheat', milk: 'Milk', sulphite: 'Sulphite', egg: 'Egg',
    gluten: 'Gluten', mustard: 'Mustard', celery: 'Celery', garlic: 'Garlic',
    onion: 'Onion', nitrite: 'Nitrite', mushroom: 'Mushroom',
    hot_pepper: 'Hot Pepper', citrus: 'Citrus', pork: 'Pork',
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// ============================================================================
// INGREDIENT COMPARISON
// ============================================================================

interface IngredientDiff {
  added: RecipeIngredient[];
  removed: RecipeIngredient[];
}

function diffIngredients(
  current: RecipeIngredient[],
  previous: RecipeIngredient[]
): IngredientDiff {
  const currentIds = new Set(current.map(i => i.id));
  const previousIds = new Set(previous.map(i => i.id));

  const added = current.filter(i => !previousIds.has(i.id));
  const removed = previous.filter(i => !currentIds.has(i.id));

  return { added, removed };
}

// ============================================================================
// ALLERGEN EXTRACTION FROM BOOLEAN FIELDS
// ============================================================================
// The master_ingredients.allergens TEXT[] column is a dead field — never
// populated. Allergens are stored as individual booleans (allergen_peanut,
// allergen_wheat, etc.). This extraction logic mirrors useAllergenAutoSync
// and useAllergenCascade. All three should stay in sync.
//
// TODO: Consolidate into shared utility when boolean columns land on recipes.
// ============================================================================

const ALLERGEN_KEYS: AllergenType[] = [
  'peanut', 'crustacean', 'treenut', 'shellfish', 'sesame',
  'soy', 'fish', 'wheat', 'milk', 'sulphite', 'egg',
  'gluten', 'mustard', 'celery', 'garlic', 'onion',
  'nitrite', 'mushroom', 'hot_pepper', 'citrus', 'pork'
];

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

// ============================================================================
// INGREDIENT-LEVEL ALLERGEN ANALYSIS
// ============================================================================
// Uses boolean-field extraction from master_ingredients — the same source of
// truth as the allergen cascade. The joined allergens[] field on
// RecipeIngredient is dead (always empty). This function resolves allergens
// independently so change detection works even when the Allergens tab
// hasn't been visited.
//
// Also resolves prepared sub-recipe allergens from the recipe store.
// ============================================================================

function collectIngredientAllergens(
  ingredients: RecipeIngredient[],
  masterIngredients: any[],
  allRecipes: any[]
): Set<string> {
  const allergens = new Set<string>();
  for (const ing of ingredients) {
    const ingType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';

    if (ingType === 'raw' && ing.master_ingredient_id) {
      const mi = masterIngredients.find(m => m.id === ing.master_ingredient_id);
      if (mi) {
        const extracted = extractFromMasterIngredient(mi);
        for (const a of extracted.contains) allergens.add(a);
        for (const a of extracted.mayContain) allergens.add(a);
      }
    } else if (ingType === 'prepared' && ing.prepared_recipe_id) {
      const sub = allRecipes.find(r => r.id === ing.prepared_recipe_id);
      if (sub?.allergenInfo) {
        for (const a of sub.allergenInfo.contains || []) allergens.add(a.toLowerCase());
        for (const a of sub.allergenInfo.mayContain || []) allergens.add(a.toLowerCase());
      }
    }
  }
  return allergens;
}

/**
 * Get allergens for a single ingredient via MIL boolean lookup.
 * Used for per-ingredient attribution in the added-ingredient detection.
 */
function getIngredientAllergens(
  ing: RecipeIngredient,
  masterIngredients: any[],
  allRecipes: any[]
): string[] {
  const ingType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';

  if (ingType === 'raw' && ing.master_ingredient_id) {
    const mi = masterIngredients.find(m => m.id === ing.master_ingredient_id);
    if (mi) {
      const extracted = extractFromMasterIngredient(mi);
      return [...extracted.contains]; // Only CONTAINS for safety floor check
    }
  } else if (ingType === 'prepared' && ing.prepared_recipe_id) {
    const sub = allRecipes.find(r => r.id === ing.prepared_recipe_id);
    if (sub?.allergenInfo?.contains) {
      return [...sub.allergenInfo.contains];
    }
  }
  return [];
}

// Get display name for an ingredient
function ingredientDisplayName(ing: RecipeIngredient): string {
  return ing.ingredient_name || ing.common_name || ing.name || 'Unknown Ingredient';
}

// ============================================================================
// STEP COMPARISON — Deep text compare on instruction content
// ============================================================================

function stepsChanged(
  currentSteps: Recipe['steps'],
  previousSteps: Recipe['steps']
): boolean {
  const current = currentSteps || [];
  const previous = previousSteps || [];

  if (current.length !== previous.length) return true;

  // Compare instruction text — the substance of the method
  for (let i = 0; i < current.length; i++) {
    if (current[i].instruction !== previous[i].instruction) return true;
    // Temperature changes are method changes
    if (JSON.stringify(current[i].temperature) !== JSON.stringify(previous[i].temperature)) return true;
    // Time changes affect execution
    if (current[i].time_in_minutes !== previous[i].time_in_minutes) return true;
  }

  return false;
}

// ============================================================================
// THE HOOK
// ============================================================================

export function useRecipeChangeDetection(
  currentRecipe: Recipe | Omit<Recipe, 'id'>,
  lastSavedRecipe: Recipe | Omit<Recipe, 'id'> | null
): ChangeDetectionResult {
  const { ingredients: masterIngredients } = useMasterIngredientsStore();
  const { recipes: allRecipes } = useRecipeStore();

  return useMemo(() => {
    // No saved version to compare against = no changes detected
    // This covers new recipe creation — no panel until first save
    if (!lastSavedRecipe) {
      return {
        changes: [],
        hasChanges: false,
        suggestedTier: 'patch' as BumpTier,
        tierReason: '',
        hasSafetyFloor: false,
        minimumTier: 'patch' as BumpTier,
      };
    }

    const changes: DetectedChange[] = [];
    let changeCounter = 0;
    const nextId = () => `change-${++changeCounter}`;

    // ------------------------------------------------------------------
    // 1. ALLERGEN — CONTAINS (MAJOR floor — life safety)
    // ------------------------------------------------------------------
    const currentContains = currentRecipe.allergenInfo?.contains || currentRecipe.allergens?.contains || [];
    const previousContains = lastSavedRecipe.allergenInfo?.contains || lastSavedRecipe.allergens?.contains || [];
    const containsDiff = arrayDiff(currentContains, previousContains);

    for (const allergen of containsDiff.added) {
      changes.push({
        id: nextId(),
        category: 'allergen-contains',
        description: `New CONTAINS allergen: ${formatAllergenName(allergen)}`,
        suggestedTier: 'major',
        isSafetyFloor: true,
        reason: 'New CONTAINS allergen — customer safety, mandatory meeting required',
      });
    }

    for (const allergen of containsDiff.removed) {
      changes.push({
        id: nextId(),
        category: 'allergen-contains',
        description: `CONTAINS allergen removed: ${formatAllergenName(allergen)}`,
        suggestedTier: 'major',
        isSafetyFloor: true,
        reason: 'Allergen removed — false confidence kills too',
      });
    }

    // ------------------------------------------------------------------
    // 2. ALLERGEN — MAY CONTAIN (MINOR)
    // ------------------------------------------------------------------
    const currentMayContain = currentRecipe.allergenInfo?.mayContain || currentRecipe.allergens?.mayContain || [];
    const previousMayContain = lastSavedRecipe.allergenInfo?.mayContain || lastSavedRecipe.allergens?.mayContain || [];
    const mayContainDiff = arrayDiff(currentMayContain, previousMayContain);

    for (const allergen of mayContainDiff.added) {
      changes.push({
        id: nextId(),
        category: 'allergen-maycontain',
        description: `New MAY CONTAIN: ${formatAllergenName(allergen)}`,
        suggestedTier: 'minor',
        isSafetyFloor: false,
        reason: 'New potential exposure — team needs awareness',
      });
    }

    for (const allergen of mayContainDiff.removed) {
      changes.push({
        id: nextId(),
        category: 'allergen-maycontain',
        description: `MAY CONTAIN removed: ${formatAllergenName(allergen)}`,
        suggestedTier: 'minor',
        isSafetyFloor: false,
        reason: 'Exposure risk removed — team should review',
      });
    }

    // ------------------------------------------------------------------
    // 3. ALLERGEN — CROSS CONTACT (PATCH)
    // ------------------------------------------------------------------
    const currentCrossContact = currentRecipe.allergenInfo?.crossContactRisk || currentRecipe.allergens?.crossContactRisk || [];
    const previousCrossContact = lastSavedRecipe.allergenInfo?.crossContactRisk || lastSavedRecipe.allergens?.crossContactRisk || [];
    const crossContactDiff = arrayDiff(currentCrossContact, previousCrossContact);

    if (crossContactDiff.added.length > 0 || crossContactDiff.removed.length > 0) {
      changes.push({
        id: nextId(),
        category: 'allergen-crosscontact',
        description: `Cross-contact notes updated (${crossContactDiff.added.length} added, ${crossContactDiff.removed.length} removed)`,
        suggestedTier: 'patch',
        isSafetyFloor: false,
        reason: 'Cross-contact documentation change — trust management',
      });
    }

    // ------------------------------------------------------------------
    // 4. INGREDIENTS — Added / Removed
    // ------------------------------------------------------------------
    const currentIngredients = currentRecipe.ingredients || [];
    const previousIngredients = lastSavedRecipe.ingredients || [];
    const ingredientDiff = diffIngredients(currentIngredients, previousIngredients);

    for (const ing of ingredientDiff.added) {
      // Resolve allergens via MIL boolean lookup — not the dead joined field
      const ingAllergens = getIngredientAllergens(ing, masterIngredients, allRecipes);
      const hasNewAllergen = ingAllergens.some(a =>
        !previousContains.map(s => s.toLowerCase()).includes(a.toLowerCase())
      );

      if (hasNewAllergen && ingAllergens.length > 0) {
        changes.push({
          id: nextId(),
          category: 'ingredient-added',
          description: `Added "${ingredientDisplayName(ing)}" (CONTAINS: ${ingAllergens.map(formatAllergenName).join(', ')})`,
          suggestedTier: 'major',
          isSafetyFloor: true,
          reason: 'New ingredient introduces CONTAINS allergen — mandatory meeting',
        });
      } else {
        changes.push({
          id: nextId(),
          category: 'ingredient-added',
          description: `Added "${ingredientDisplayName(ing)}"`,
          suggestedTier: 'minor',
          isSafetyFloor: false,
          reason: 'New ingredient — team should review',
        });
      }
    }

    for (const ing of ingredientDiff.removed) {
      changes.push({
        id: nextId(),
        category: 'ingredient-removed',
        description: `Removed "${ingredientDisplayName(ing)}"`,
        suggestedTier: 'minor',
        isSafetyFloor: false,
        reason: 'Ingredient removed — team should review',
      });
    }

    // ------------------------------------------------------------------
    // 4b. INGREDIENT-LEVEL ALLERGEN ANALYSIS (independent of allergenInfo)
    // ------------------------------------------------------------------
    // This catches allergen changes from ingredient additions/removals
    // even when the AllergenControl tab hasn't been visited (and thus
    // allergenInfo hasn't been recalculated by the cascade).
    // Without this, removing an ingredient that carries allergens and
    // going straight to Versions would show no allergen-related change.
    // ------------------------------------------------------------------
    const currentIngAllergens = collectIngredientAllergens(currentIngredients, masterIngredients, allRecipes);
    const previousIngAllergens = collectIngredientAllergens(previousIngredients, masterIngredients, allRecipes);

    // Allergens that were sourced by previous ingredients but no longer by current
    for (const allergen of previousIngAllergens) {
      if (!currentIngAllergens.has(allergen)) {
        // Check if this was already caught by the allergenInfo diff above
        const alreadyCaught = changes.some(
          c => c.category === 'allergen-contains' &&
               c.description.toLowerCase().includes(allergen)
        );
        if (!alreadyCaught) {
          changes.push({
            id: nextId(),
            category: 'allergen-contains',
            description: `Ingredient-sourced allergen lost: ${formatAllergenName(allergen)}`,
            suggestedTier: 'major',
            isSafetyFloor: true,
            reason: 'Ingredient removed that was the source of a CONTAINS allergen — mandatory meeting',
          });
        }
      }
    }

    // Allergens introduced by new ingredients that weren't in previous set
    for (const allergen of currentIngAllergens) {
      if (!previousIngAllergens.has(allergen)) {
        const alreadyCaught = changes.some(
          c => c.category === 'allergen-contains' &&
               c.description.toLowerCase().includes(allergen)
        );
        if (!alreadyCaught) {
          changes.push({
            id: nextId(),
            category: 'allergen-contains',
            description: `New ingredient-sourced allergen: ${formatAllergenName(allergen)}`,
            suggestedTier: 'major',
            isSafetyFloor: true,
            reason: 'New ingredient introduces a CONTAINS allergen — mandatory meeting',
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 5. YIELD — Amount or unit changed
    // ------------------------------------------------------------------
    if (
      currentRecipe.yield_amount !== lastSavedRecipe.yield_amount ||
      currentRecipe.yield_unit !== lastSavedRecipe.yield_unit
    ) {
      const prevYield = `${lastSavedRecipe.yield_amount} ${lastSavedRecipe.yield_unit || ''}`.trim();
      const currYield = `${currentRecipe.yield_amount} ${currentRecipe.yield_unit || ''}`.trim();
      changes.push({
        id: nextId(),
        category: 'yield',
        description: `Yield changed: ${prevYield} → ${currYield}`,
        suggestedTier: 'minor',
        isSafetyFloor: false,
        reason: 'Yield change affects portioning — team should review',
      });
    }

    // ------------------------------------------------------------------
    // 6. METHOD — Steps changed
    // ------------------------------------------------------------------
    if (stepsChanged(currentRecipe.steps, lastSavedRecipe.steps)) {
      const currentLen = (currentRecipe.steps || []).length;
      const previousLen = (lastSavedRecipe.steps || []).length;
      const stepDelta = currentLen - previousLen;
      const desc = stepDelta > 0
        ? `Method steps changed (+${stepDelta} steps)`
        : stepDelta < 0
          ? `Method steps changed (${stepDelta} steps)`
          : 'Method steps modified';
      changes.push({
        id: nextId(),
        category: 'method',
        description: desc,
        suggestedTier: 'minor',
        isSafetyFloor: false,
        reason: 'Method change affects technique — team should review',
      });
    }

    // ------------------------------------------------------------------
    // 7. NOTES / DESCRIPTION — Formatting, documentation
    // ------------------------------------------------------------------
    const descChanged = (currentRecipe.description || '') !== (lastSavedRecipe.description || '');
    const notesChanged = (currentRecipe.production_notes || '') !== (lastSavedRecipe.production_notes || '');

    if (descChanged || notesChanged) {
      const parts: string[] = [];
      if (descChanged) parts.push('description');
      if (notesChanged) parts.push('production notes');
      changes.push({
        id: nextId(),
        category: 'notes',
        description: `Updated ${parts.join(' and ')}`,
        suggestedTier: 'patch',
        isSafetyFloor: false,
        reason: 'Documentation change — trust management, silent update',
      });
    }

    // ------------------------------------------------------------------
    // AGGREGATE — Take highest tier, compute safety floor
    // ------------------------------------------------------------------
    let suggestedTier: BumpTier = 'patch';
    let minimumTier: BumpTier = 'patch';
    let tierReason = '';
    let hasSafetyFloor = false;

    for (const change of changes) {
      suggestedTier = maxTier(suggestedTier, change.suggestedTier);

      if (change.isSafetyFloor) {
        minimumTier = maxTier(minimumTier, change.suggestedTier);
        hasSafetyFloor = true;
      }
    }

    // Build the reason string from the highest-tier change
    if (changes.length > 0) {
      const highestChange = changes.find(c => c.suggestedTier === suggestedTier);
      tierReason = highestChange?.reason || '';
    }

    return {
      changes,
      hasChanges: changes.length > 0,
      suggestedTier,
      tierReason,
      hasSafetyFloor,
      minimumTier,
    };
  }, [currentRecipe, lastSavedRecipe, masterIngredients, allRecipes]);
}
