import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// RECIPE CONFIG HOOK
// =============================================================================
// Centralized configuration for Recipe Manager module settings.
// Currently uses localStorage, designed to migrate to organization.modules.recipes.config
// when we implement org-level module settings.
// =============================================================================

const STORAGE_KEY = 'cheflife_recipe_config';

export interface RecipeConfig {
  // Badge Display Settings
  updatedBadgeDays: number;      // Days to show "UPDATED" badge (default: 14)
  newBadgeDays: number;          // Days to show "NEW" badge (default: 30)
  
  // Sourcing Instructions (displayed on Ingredients tab)
  sourcingInstructions: {
    enabled: boolean;              // Show/hide the sourcing section
    title: string;                 // Expandable header title
    body: string;                  // Main instruction text
    footer: string;                // Footer note
  };
  
  // Future settings (documented for architecture)
  // defaultStation: string | null;
  // defaultStatus: 'draft' | 'approved';
  // costingMethod: 'ingredients' | 'with_labor' | 'with_overhead';
  // versionControlEnabled: boolean;
}

const DEFAULT_CONFIG: RecipeConfig = {
  updatedBadgeDays: 14,
  newBadgeDays: 30,
  sourcingInstructions: {
    enabled: true,
    title: "Source First, Then Start",
    body: `Gather and verify all ingredients before you begin any prep work. A complete mise en place prevents waste, saves time, and lets you focus on the craft of cooking.

If something is missing or looks off, flag it now \u2014 not halfway through the recipe.`,
    footer: "Your kitchen may have specific sourcing procedures.",
  },
};

/**
 * Load config from localStorage
 */
function loadConfig(): RecipeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load recipe config:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save config to localStorage
 */
function saveConfig(config: RecipeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save recipe config:', e);
  }
}

/**
 * Hook for reading and updating recipe configuration
 */
export function useRecipeConfig() {
  const [config, setConfig] = useState<RecipeConfig>(loadConfig);

  // Reload on mount (in case another tab changed it)
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // Update a single config value
  const updateConfig = useCallback((updates: Partial<RecipeConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...updates };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetConfig = useCallback(() => {
    saveConfig(DEFAULT_CONFIG);
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    DEFAULT_CONFIG,
  };
}

/**
 * Standalone function to get config (for use outside React components)
 * Used by RecipeCard which may be rendered many times
 */
export function getRecipeConfig(): RecipeConfig {
  return loadConfig();
}

export default useRecipeConfig;
