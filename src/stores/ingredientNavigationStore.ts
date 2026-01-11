import { create } from "zustand";

// =============================================================================
// INGREDIENT NAVIGATION STORE
// =============================================================================
// Lightweight store to maintain navigation context when moving between
// the ingredient list and detail pages. Preserves filtered order so users
// can navigate through their filtered set without going back to the list.
//
// Also preserves ExcelDataGrid filter state so filters persist when returning
// from the ingredient detail page.
// =============================================================================

// Re-export GridFilterState from ExcelDataGrid for convenience
// Note: We define our own copy here to avoid circular dependency
export interface GridFilterState {
  filters: Record<string, any>;
  activeFilters: string[];
  globalFilter: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
}

interface IngredientNavigationStore {
  // The ordered list of ingredient IDs from the current filtered view
  ingredientIds: string[];
  
  // Current position in the list (for display "3 of 47")
  currentIndex: number;
  
  // Filter description for context (e.g., "Dairy" or "85 filtered items")
  filterDescription: string;
  
  // Return path for contextual back button
  // e.g., "/admin/data/ingredients" or "/admin/data/vendor-invoices?tab=triage"
  returnTo: string;
  
  // Grid filter state - preserved across navigation
  gridFilterState: GridFilterState | null;
  
  // Allergens tab filter state - separate from main ingredients grid
  allergensGridFilterState: GridFilterState | null;
  
  // Actions
  setNavigationContext: (ids: string[], filterDescription?: string, returnTo?: string) => void;
  setCurrentIndex: (index: number) => void;
  clearNavigationContext: () => void;
  
  // Grid filter state actions
  setGridFilterState: (state: GridFilterState) => void;
  clearGridFilterState: () => void;
  
  // Allergens grid filter state actions
  setAllergensGridFilterState: (state: GridFilterState) => void;
  clearAllergensGridFilterState: () => void;
  
  // Navigation helpers
  getPrevId: () => string | null;
  getNextId: () => string | null;
  getPosition: () => { current: number; total: number } | null;
}

// Default return path
const DEFAULT_RETURN_PATH = "/admin/data/ingredients";

export const useIngredientNavigationStore = create<IngredientNavigationStore>(
  (set, get) => ({
    ingredientIds: [],
    currentIndex: -1,
    filterDescription: "",
    returnTo: DEFAULT_RETURN_PATH,
    gridFilterState: null,
    allergensGridFilterState: null,

    setNavigationContext: (ids, filterDescription = "", returnTo = DEFAULT_RETURN_PATH) => {
      set({
        ingredientIds: ids,
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
        ingredientIds: [],
        currentIndex: -1,
        filterDescription: "",
        returnTo: DEFAULT_RETURN_PATH,
        // Note: We intentionally do NOT clear gridFilterState here
        // so it persists even after navigation context is cleared
      });
    },

    setGridFilterState: (state) => {
      set({ gridFilterState: state });
    },

    clearGridFilterState: () => {
      set({ gridFilterState: null });
    },

    setAllergensGridFilterState: (state) => {
      set({ allergensGridFilterState: state });
    },

    clearAllergensGridFilterState: () => {
      set({ allergensGridFilterState: null });
    },

    getPrevId: () => {
      const { ingredientIds, currentIndex } = get();
      if (ingredientIds.length === 0 || currentIndex <= 0) return null;
      return ingredientIds[currentIndex - 1];
    },

    getNextId: () => {
      const { ingredientIds, currentIndex } = get();
      if (ingredientIds.length === 0 || currentIndex >= ingredientIds.length - 1) return null;
      return ingredientIds[currentIndex + 1];
    },

    getPosition: () => {
      const { ingredientIds, currentIndex } = get();
      if (ingredientIds.length === 0 || currentIndex < 0) return null;
      return {
        current: currentIndex + 1,
        total: ingredientIds.length,
      };
    },
  })
);
