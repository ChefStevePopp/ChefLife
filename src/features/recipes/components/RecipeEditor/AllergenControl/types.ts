import type { AllergenType } from '@/features/allergens/types';

/**
 * Source of an allergen detection
 */
export interface AllergenSource {
  ingredientId: string;
  ingredientName: string;
  ingredientType: 'raw' | 'prepared';
  tier: 'contains' | 'mayContain';
}

/**
 * Auto-detected allergens from recipe ingredients
 * This is computed, never stored
 */
export interface AutoDetectedAllergens {
  contains: Map<AllergenType, AllergenSource[]>;
  mayContain: Map<AllergenType, AllergenSource[]>;
}

/**
 * Manual allergen additions/overrides
 * This is what gets stored in the recipe
 */
export interface ManualAllergenOverrides {
  // User-added allergens (cross-contact, shared equipment, etc.)
  manualContains: AllergenType[];
  manualMayContain: AllergenType[];
  
  // Promotions: allergens moved from May Contain → Contains
  promotedToContains: AllergenType[];
  
  // Notes per manual allergen (optional)
  manualNotes: Record<string, string>;
  
  // General cross-contact notes
  crossContactNotes: string[];
}

/**
 * Final declaration (computed from auto + manual)
 * This is what customers see
 */
export interface AllergenDeclaration {
  contains: AllergenType[];
  mayContain: AllergenType[];
  crossContactNotes: string[];
}

/**
 * Individual allergen with full context
 */
export interface AllergenWithContext {
  type: AllergenType;
  tier: 'contains' | 'mayContain';
  source: 'auto' | 'manual' | 'promoted';
  sources?: AllergenSource[]; // Which ingredients contributed this
  note?: string; // Manual note if applicable
}

/**
 * Props for the main AllergenControl component
 */
export interface AllergenControlProps {
  recipeId: string;
  recipeName: string;
  recipeType: 'prepared' | 'final' | 'receiving';
  
  // Current allergen info from recipe
  allergenInfo?: {
    contains: string[];
    mayContain?: string[];
    crossContactRisk?: string[];
  };
  
  // Manual overrides stored on recipe
  manualOverrides?: ManualAllergenOverrides;
  
  // Callback when declaration changes
  onChange: (updates: {
    allergenInfo: {
      contains: string[];
      mayContain: string[];
      crossContactRisk: string[];
    };
    manualOverrides: ManualAllergenOverrides;
  }) => void;
  
  // Callback for save
  onSave: () => Promise<void>;
  
  // Recipe ingredients for auto-detection
  ingredients: Array<{
    id: string;
    ingredient_type: 'raw' | 'prepared';
    master_ingredient_id?: string;
    prepared_recipe_id?: string;
    ingredient_name?: string;
    common_name?: string;
  }>;
}

/**
 * Dirty state tracking
 */
export interface AllergenDirtyState {
  isDirty: boolean;
  changeCount: number;
  changes: Array<{
    type: 'add' | 'remove' | 'promote' | 'note';
    allergen?: AllergenType;
    description: string;
  }>;
}
