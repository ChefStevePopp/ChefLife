import { useMemo } from 'react';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import type { AllergenType } from '@/features/allergens/types';
import { extractFromMasterIngredient, getRecipeAllergenBooleans } from '@/features/allergens/utils';
import type { AutoDetectedAllergens, AllergenSource, ManualAllergenOverrides, AllergenDeclaration, AllergenWithContext } from './types';

interface UseAllergenCascadeProps {
  ingredients: Array<{
    id: string;
    ingredient_type: 'raw' | 'prepared';
    master_ingredient_id?: string;
    prepared_recipe_id?: string;
    ingredient_name?: string;
    common_name?: string;
  }>;
  manualOverrides?: ManualAllergenOverrides;
}

interface UseAllergenCascadeResult {
  // Raw auto-detected data with sources
  autoDetected: AutoDetectedAllergens;
  
  // Final computed declaration
  declaration: AllergenDeclaration;
  
  // All allergens with full context (for UI)
  allergensWithContext: AllergenWithContext[];
  
  // Loading state
  isLoading: boolean;
}

/**
 * Hook to compute allergen cascade from ingredients
 * Handles both raw ingredients (from MIL) and prepared ingredients (from sub-recipes)
 */
export function useAllergenCascade({ 
  ingredients, 
  manualOverrides 
}: UseAllergenCascadeProps): UseAllergenCascadeResult {
  const { ingredients: masterIngredients, isLoading: milLoading } = useMasterIngredientsStore();
  const { recipes, isLoading: recipesLoading } = useRecipeStore();
  
  const isLoading = milLoading || recipesLoading;
  
  // Compute auto-detected allergens from ingredients
  const autoDetected = useMemo<AutoDetectedAllergens>(() => {
    const contains = new Map<AllergenType, AllergenSource[]>();
    const mayContain = new Map<AllergenType, AllergenSource[]>();
    
    for (const ingredient of ingredients) {
      if (ingredient.ingredient_type === 'raw' && ingredient.master_ingredient_id) {
        // Raw ingredient - look up in MIL
        const mi = masterIngredients.find(m => m.id === ingredient.master_ingredient_id);
        if (mi) {
          const extracted = extractFromMasterIngredient(mi);
          
          // Add contains
          for (const allergen of extracted.contains) {
            const source: AllergenSource = {
              ingredientId: ingredient.id,
              ingredientName: mi.product || mi.common_name || ingredient.ingredient_name || 'Unknown',
              ingredientType: 'raw',
              tier: 'contains'
            };
            
            if (!contains.has(allergen)) {
              contains.set(allergen, []);
            }
            contains.get(allergen)!.push(source);
          }
          
          // Add may contain
          for (const allergen of extracted.mayContain) {
            const source: AllergenSource = {
              ingredientId: ingredient.id,
              ingredientName: mi.product || mi.common_name || ingredient.ingredient_name || 'Unknown',
              ingredientType: 'raw',
              tier: 'mayContain'
            };
            
            if (!mayContain.has(allergen)) {
              mayContain.set(allergen, []);
            }
            mayContain.get(allergen)!.push(source);
          }
        }
      } else if (ingredient.ingredient_type === 'prepared' && ingredient.prepared_recipe_id) {
        // Prepared ingredient - read from boolean columns (Phase 3)
        const recipe = recipes.find(r => r.id === ingredient.prepared_recipe_id);
        if (recipe) {
          const subAllergens = getRecipeAllergenBooleans(recipe);
          
          // Contains from sub-recipe
          for (const allergen of subAllergens.contains) {
            const source: AllergenSource = {
              ingredientId: ingredient.id,
              ingredientName: recipe.name || ingredient.ingredient_name || 'Unknown Recipe',
              ingredientType: 'prepared',
              tier: 'contains'
            };
            
            if (!contains.has(allergen)) {
              contains.set(allergen, []);
            }
            contains.get(allergen)!.push(source);
          }
          
          // May contain from sub-recipe
          for (const allergen of subAllergens.mayContain) {
            const source: AllergenSource = {
              ingredientId: ingredient.id,
              ingredientName: recipe.name || ingredient.ingredient_name || 'Unknown Recipe',
              ingredientType: 'prepared',
              tier: 'mayContain'
            };
            
            if (!mayContain.has(allergen)) {
              mayContain.set(allergen, []);
            }
            mayContain.get(allergen)!.push(source);
          }
        }
      }
    }
    
    return { contains, mayContain };
  }, [ingredients, masterIngredients, recipes]);
  
  // Compute final declaration
  const declaration = useMemo<AllergenDeclaration>(() => {
    const containsSet = new Set<AllergenType>();
    const mayContainSet = new Set<AllergenType>();
    
    // Start with auto-detected
    for (const allergen of autoDetected.contains.keys()) {
      containsSet.add(allergen);
    }
    for (const allergen of autoDetected.mayContain.keys()) {
      // Only add to mayContain if not in contains
      if (!containsSet.has(allergen)) {
        mayContainSet.add(allergen);
      }
    }
    
    // Apply manual overrides
    if (manualOverrides) {
      // Add manual contains
      for (const allergen of manualOverrides.manualContains || []) {
        containsSet.add(allergen);
        mayContainSet.delete(allergen);
      }
      
      // Add manual may contain (only if not in contains)
      for (const allergen of manualOverrides.manualMayContain || []) {
        if (!containsSet.has(allergen)) {
          mayContainSet.add(allergen);
        }
      }
      
      // Apply promotions (may contain → contains)
      for (const allergen of manualOverrides.promotedToContains || []) {
        containsSet.add(allergen);
        mayContainSet.delete(allergen);
      }
    }
    
    return {
      contains: Array.from(containsSet).sort(),
      mayContain: Array.from(mayContainSet).sort(),
      crossContactNotes: manualOverrides?.crossContactNotes || []
    };
  }, [autoDetected, manualOverrides]);
  
  // Build allergens with full context for UI
  const allergensWithContext = useMemo<AllergenWithContext[]>(() => {
    const result: AllergenWithContext[] = [];
    const seen = new Set<string>();
    
    // Auto-detected contains
    for (const [allergen, sources] of autoDetected.contains.entries()) {
      const key = `${allergen}-contains`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          type: allergen,
          tier: 'contains',
          source: 'auto',
          sources
        });
      }
    }
    
    // Auto-detected may contain (if not already in contains)
    for (const [allergen, sources] of autoDetected.mayContain.entries()) {
      if (!autoDetected.contains.has(allergen)) {
        // Check if promoted
        const isPromoted = manualOverrides?.promotedToContains?.includes(allergen);
        const key = `${allergen}-${isPromoted ? 'contains' : 'mayContain'}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            type: allergen,
            tier: isPromoted ? 'contains' : 'mayContain',
            source: isPromoted ? 'promoted' : 'auto',
            sources
          });
        }
      }
    }
    
    // Manual contains
    for (const allergen of manualOverrides?.manualContains || []) {
      const key = `${allergen}-contains`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          type: allergen,
          tier: 'contains',
          source: 'manual',
          note: manualOverrides?.manualNotes?.[allergen]
        });
      }
    }
    
    // Manual may contain
    for (const allergen of manualOverrides?.manualMayContain || []) {
      const key = `${allergen}-mayContain`;
      if (!seen.has(key) && !autoDetected.contains.has(allergen)) {
        seen.add(key);
        result.push({
          type: allergen,
          tier: 'mayContain',
          source: 'manual',
          note: manualOverrides?.manualNotes?.[allergen]
        });
      }
    }
    
    return result;
  }, [autoDetected, manualOverrides]);
  
  return {
    autoDetected,
    declaration,
    allergensWithContext,
    isLoading
  };
}
