import { create } from "zustand";

// =============================================================================
// RECIPE NAVIGATION STORE
// =============================================================================
// Lightweight store to maintain navigation context when moving between
// the recipe list and detail pages. Preserves filtered order so users
// can navigate through their filtered set without going back to the list.
// =============================================================================

interface RecipeNavigationStore {
  // The ordered list of recipe IDs from the current filtered view
  recipeIds: string[];
  
  // Current position in the list (for display "3 of 47")
  currentIndex: number;
  
  // Filter description for context (e.g., "Mise en Place" or "12 filtered items")
  filterDescription: string;
  
  // Return path for contextual back button
  // e.g., "/admin/recipes" or "/admin/recipes?tab=final"
  returnTo: string;
  
  // Actions
  setNavigationContext: (ids: string[], filterDescription?: string, returnTo?: string) => void;
  setCurrentIndex: (index: number) => void;
  clearNavigationContext: () => void;
  
  // Navigation helpers
  getPrevId: () => string | null;
  getNextId: () => string | null;
  getPosition: () => { current: number; total: number } | null;
}

// Default return path
const DEFAULT_RETURN_PATH = "/admin/recipes";

export const useRecipeNavigationStore = create<RecipeNavigationStore>(
  (set, get) => ({
    recipeIds: [],
    currentIndex: -1,
    filterDescription: "",
    returnTo: DEFAULT_RETURN_PATH,

    setNavigationContext: (ids, filterDescription = "", returnTo = DEFAULT_RETURN_PATH) => {
      set({
        recipeIds: ids,
        filterDescription,
        returnTo,
        currentIndex: -1,
      });
    },

    setCurrentIndex: (index) => {
      set({ currentIndex: index });
    },

    clearNavigationContext: () => {
      set({
        recipeIds: [],
        currentIndex: -1,
        filterDescription: "",
        returnTo: DEFAULT_RETURN_PATH,
      });
    },

    getPrevId: () => {
      const { recipeIds, currentIndex } = get();
      if (recipeIds.length === 0 || currentIndex <= 0) return null;
      return recipeIds[currentIndex - 1];
    },

    getNextId: () => {
      const { recipeIds, currentIndex } = get();
      if (recipeIds.length === 0 || currentIndex >= recipeIds.length - 1) return null;
      return recipeIds[currentIndex + 1];
    },

    getPosition: () => {
      const { recipeIds, currentIndex } = get();
      if (recipeIds.length === 0 || currentIndex < 0) return null;
      return {
        current: currentIndex + 1,
        total: recipeIds.length,
      };
    },
  })
);
