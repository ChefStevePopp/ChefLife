/**
 * Recipe Ingredients API
 * 
 * Handles CRUD operations for the relational recipe_ingredients table.
 * This replaces the JSONB-based ingredient storage with proper FK constraints
 * and automatic price cascade triggers.
 * 
 * "An accounting app masquerading as restaurant software"
 */

import { supabase } from '@/lib/supabase';
import type { RecipeIngredient, RecipeIngredientCreate, RecipeIngredientUpdate } from '../types/recipe';

// ============================================================================
// Types
// ============================================================================

interface FetchIngredientsResult {
  data: RecipeIngredient[] | null;
  error: Error | null;
}

interface SaveIngredientsResult {
  data: RecipeIngredient[] | null;
  error: Error | null;
}

interface IngredientUsageResult {
  recipe_id: string;
  recipe_name: string;
  recipe_type: 'prepared' | 'final';
  quantity: number;
  unit: string;
  cost_per_unit: number;
  line_total: number;
}

// ============================================================================
// Fetch Ingredients
// ============================================================================

/**
 * Fetch all ingredients for a recipe with joined master_ingredient data
 */
export async function fetchRecipeIngredients(recipeId: string): Promise<FetchIngredientsResult> {
  try {
    // Query recipe_ingredients with joins to get names and allergens
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        recipe_id,
        ingredient_type,
        master_ingredient_id,
        prepared_recipe_id,
        quantity,
        unit,
        cost_per_unit,
        common_measure,
        notes,
        sort_order,
        created_at,
        updated_at,
        master_ingredients:master_ingredient_id (
          id,
          product,
          recipe_unit_type,
          allergens,
          cost_per_recipe_unit
        ),
        prepared_recipe:prepared_recipe_id (
          id,
          name,
          unit_type,
          total_cost
        )
      `)
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Transform to flat structure with joined fields
    const ingredients: RecipeIngredient[] = (data || []).map((row: any) => ({
      id: row.id,
      recipe_id: row.recipe_id,
      ingredient_type: row.ingredient_type,
      master_ingredient_id: row.master_ingredient_id,
      prepared_recipe_id: row.prepared_recipe_id,
      quantity: row.quantity,
      unit: row.unit,
      cost_per_unit: row.cost_per_unit,
      common_measure: row.common_measure,
      notes: row.notes,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Joined fields
      ingredient_name: row.ingredient_type === 'raw' 
        ? row.master_ingredients?.product 
        : row.prepared_recipe?.name,
      allergens: row.master_ingredients?.allergens || [],
      recipe_unit_type: row.ingredient_type === 'raw'
        ? row.master_ingredients?.recipe_unit_type
        : row.prepared_recipe?.unit_type,
      // Legacy compatibility fields
      name: row.master_ingredient_id || row.prepared_recipe_id,
      cost: row.cost_per_unit,
      commonMeasure: row.common_measure,
      type: row.ingredient_type,
    }));

    return { data: ingredients, error: null };
  } catch (error) {
    console.error('Error fetching recipe ingredients:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Save Ingredients
// ============================================================================

/**
 * Save ingredients for a recipe (replaces all existing)
 * Uses upsert for efficiency and handles ordering
 */
export async function saveRecipeIngredients(
  recipeId: string, 
  ingredients: RecipeIngredientCreate[]
): Promise<SaveIngredientsResult> {
  try {
    // Start a transaction-like operation
    // First, get existing ingredient IDs to determine what to delete
    const { data: existing, error: fetchError } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('recipe_id', recipeId);

    if (fetchError) throw fetchError;

    const existingIds = new Set((existing || []).map(e => e.id));
    const newIds = new Set(ingredients.filter(i => i.id).map(i => i.id));
    
    // Find IDs to delete (exist in DB but not in new list)
    const idsToDelete = [...existingIds].filter(id => !newIds.has(id));

    // Delete removed ingredients
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;
    }

    // Prepare ingredients for upsert
    const ingredientsToSave = ingredients.map((ing, index) => ({
      id: ing.id || undefined, // Let DB generate if new
      recipe_id: recipeId,
      ingredient_type: ing.ingredient_type,
      master_ingredient_id: ing.ingredient_type === 'raw' ? ing.master_ingredient_id : null,
      prepared_recipe_id: ing.ingredient_type === 'prepared' ? ing.prepared_recipe_id : null,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      common_measure: ing.common_measure || null,
      notes: ing.notes || null,
      sort_order: index,
    }));

    // Upsert ingredients
    const { data: saved, error: upsertError } = await supabase
      .from('recipe_ingredients')
      .upsert(ingredientsToSave, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (upsertError) throw upsertError;

    // Fetch fresh data with joins to return
    return fetchRecipeIngredients(recipeId);
  } catch (error) {
    console.error('Error saving recipe ingredients:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Add Single Ingredient
// ============================================================================

/**
 * Add a single ingredient to a recipe
 */
export async function addRecipeIngredient(
  recipeId: string,
  ingredient: Omit<RecipeIngredientCreate, 'recipe_id'>
): Promise<{ data: RecipeIngredient | null; error: Error | null }> {
  try {
    // Get current max sort_order
    const { data: existing, error: countError } = await supabase
      .from('recipe_ingredients')
      .select('sort_order')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (countError) throw countError;

    const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id: recipeId,
        ingredient_type: ingredient.ingredient_type,
        master_ingredient_id: ingredient.ingredient_type === 'raw' ? ingredient.master_ingredient_id : null,
        prepared_recipe_id: ingredient.ingredient_type === 'prepared' ? ingredient.prepared_recipe_id : null,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        common_measure: ingredient.common_measure || null,
        notes: ingredient.notes || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    return { data: data as RecipeIngredient, error: null };
  } catch (error) {
    console.error('Error adding recipe ingredient:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Update Single Ingredient
// ============================================================================

/**
 * Update a single ingredient
 */
export async function updateRecipeIngredient(
  ingredientId: string,
  updates: Partial<RecipeIngredientCreate>
): Promise<{ data: RecipeIngredient | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .update({
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.cost_per_unit !== undefined && { cost_per_unit: updates.cost_per_unit }),
        ...(updates.common_measure !== undefined && { common_measure: updates.common_measure }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.sort_order !== undefined && { sort_order: updates.sort_order }),
      })
      .eq('id', ingredientId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as RecipeIngredient, error: null };
  } catch (error) {
    console.error('Error updating recipe ingredient:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Delete Single Ingredient
// ============================================================================

/**
 * Delete a single ingredient
 */
export async function deleteRecipeIngredient(
  ingredientId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', ingredientId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting recipe ingredient:', error);
    return { error: error as Error };
  }
}

// ============================================================================
// Reorder Ingredients
// ============================================================================

/**
 * Reorder ingredients within a recipe
 */
export async function reorderRecipeIngredients(
  recipeId: string,
  orderedIds: string[]
): Promise<{ error: Error | null }> {
  try {
    // Update sort_order for each ingredient
    const updates = orderedIds.map((id, index) => 
      supabase
        .from('recipe_ingredients')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('recipe_id', recipeId)
    );

    await Promise.all(updates);

    return { error: null };
  } catch (error) {
    console.error('Error reordering recipe ingredients:', error);
    return { error: error as Error };
  }
}

// ============================================================================
// Get Recipes Using Ingredient
// ============================================================================

/**
 * Find all recipes that use a specific master ingredient
 * Used for VIM "Recipes using this ingredient" feature
 */
export async function getRecipesUsingIngredient(
  masterIngredientId: string
): Promise<{ data: IngredientUsageResult[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('v_ingredient_usage')
      .select('*')
      .eq('master_ingredient_id', masterIngredientId);

    if (error) throw error;

    return { data: data as IngredientUsageResult[], error: null };
  } catch (error) {
    console.error('Error fetching recipes using ingredient:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// Calculate Recipe Total Cost
// ============================================================================

/**
 * Calculate total cost for a recipe from its ingredients
 * Note: This is normally handled by the cascade trigger, but can be called manually
 */
export async function calculateRecipeTotalCost(
  recipeId: string
): Promise<{ totalCost: number; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('quantity, cost_per_unit')
      .eq('recipe_id', recipeId);

    if (error) throw error;

    const totalCost = (data || []).reduce(
      (sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 
      0
    );

    return { totalCost, error: null };
  } catch (error) {
    console.error('Error calculating recipe total cost:', error);
    return { totalCost: 0, error: error as Error };
  }
}

// ============================================================================
// Migration Helper: Convert JSONB to Relational
// ============================================================================

/**
 * Convert a recipe's JSONB ingredients to relational format
 * Used during the migration period when editing legacy recipes
 */
export async function migrateRecipeIngredientsToRelational(
  recipeId: string,
  jsonbIngredients: any[]
): Promise<SaveIngredientsResult> {
  try {
    // Transform JSONB format to relational format
    const relationalIngredients: RecipeIngredientCreate[] = jsonbIngredients.map((ing, index) => ({
      recipe_id: recipeId,
      ingredient_type: (ing.type || 'raw') as 'raw' | 'prepared',
      master_ingredient_id: ing.type === 'raw' || !ing.type ? ing.name : undefined,
      prepared_recipe_id: ing.type === 'prepared' ? ing.name : undefined,
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit || '',
      cost_per_unit: ing.cost || 0,
      common_measure: ing.commonMeasure || ing.common_measure,
      notes: ing.notes,
      sort_order: index,
    }));

    // Save to relational table
    return saveRecipeIngredients(recipeId, relationalIngredients);
  } catch (error) {
    console.error('Error migrating recipe ingredients:', error);
    return { data: null, error: error as Error };
  }
}
