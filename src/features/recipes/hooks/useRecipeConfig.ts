import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// RECIPE CONFIG HOOK
// =============================================================================
// Centralized configuration for Recipe Manager module settings.
// Currently uses localStorage, designed to migrate to organization.modules.recipes.config
// when we implement org-level module settings.
// =============================================================================

const STORAGE_KEY = 'cheflife_recipe_config';

// =============================================================================
// INSTRUCTION BLOCK TEMPLATE TYPE
// =============================================================================

export interface InstructionBlockTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

// ChefLife sensible defaults - system blocks + useful custom ones
const DEFAULT_INSTRUCTION_BLOCKS: InstructionBlockTemplate[] = [
  {
    id: "tip",
    type: "tip",
    label: "Pro Tip",
    description: "Best practices, shortcuts, chef knowledge",
    icon: "Lightbulb",
    color: "emerald",
    isSystem: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "caution",
    type: "caution",
    label: "Caution",
    description: "Warnings, things to watch for",
    icon: "AlertTriangle",
    color: "amber",
    isSystem: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "critical",
    type: "critical",
    label: "Critical",
    description: "Safety critical, must-do items",
    icon: "AlertOctagon",
    color: "rose",
    isSystem: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "info",
    type: "info",
    label: "Info",
    description: "Additional context, FYI notes",
    icon: "Info",
    color: "blue",
    isSystem: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "fifo",
    type: "fifo",
    label: "FIFO Reminder",
    description: "First In, First Out stock rotation",
    icon: "RotateCcw",
    color: "cyan",
    isSystem: false,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "temperature",
    type: "temperature",
    label: "Temperature",
    description: "Temperature-specific notes and targets",
    icon: "Thermometer",
    color: "orange",
    isSystem: false,
    isActive: true,
    sortOrder: 5,
  },
];

// =============================================================================
// RECIPE CONFIG INTERFACE
// =============================================================================

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
  
  // Instruction Blocks (rich text editor callout blocks)
  instructionBlocks: InstructionBlockTemplate[];
  
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
  instructionBlocks: DEFAULT_INSTRUCTION_BLOCKS,
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
      return { 
        ...DEFAULT_CONFIG, 
        ...parsed,
        // Ensure instruction blocks have all defaults if not present
        instructionBlocks: parsed.instructionBlocks || DEFAULT_INSTRUCTION_BLOCKS,
      };
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

/**
 * Get active instruction blocks only (for editor toolbar)
 */
export function getActiveInstructionBlocks(): InstructionBlockTemplate[] {
  const config = loadConfig();
  return config.instructionBlocks
    .filter(b => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export default useRecipeConfig;
