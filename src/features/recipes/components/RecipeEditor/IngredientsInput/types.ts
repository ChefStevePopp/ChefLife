/**
 * =============================================================================
 * INGREDIENTS INPUT - Local Types
 * =============================================================================
 * Types specific to the IngredientsInput component family
 * =============================================================================
 */

import type { RecipeIngredient } from "../../../types/recipe";

/**
 * View mode for ingredients input
 */
export type IngredientsViewMode = 'table' | 'tablet' | 'guided';

/**
 * Master ingredient from MIL store (simplified for this context)
 */
export interface MasterIngredientOption {
  id: string;
  product: string;
  common_name?: string;
  recipe_unit_type?: string;
  cost_per_recipe_unit?: number;
  allergens?: string[];
  vendor_codes?: {
    current?: {
      code: string;
      vendor: string;
    };
  };
}

/**
 * Prepared recipe option (sub-recipe that can be used as ingredient)
 */
export interface PreparedItemOption {
  id: string;
  name: string;
  type: string;
  unit_type?: string;
  cost_per_unit?: number;
}

/**
 * Combined search result item
 */
export interface IngredientSearchResult {
  id: string;
  type: 'raw' | 'prepared';
  name: string;
  common_name?: string;
  unit: string;
  cost: number;
  vendor_code?: string;
  vendor?: string;
  allergens?: string[];
}

/**
 * Props for ingredient row/card components
 */
export interface IngredientRowProps {
  ingredient: RecipeIngredient;
  index: number;
  isActive?: boolean;
  onUpdate: (index: number, field: string, value: any, type?: 'raw' | 'prepared') => void;
  onRemove: (index: number) => void;
  onAddAfter?: (index: number) => void;
  onSelect?: (index: number) => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  showDragHandle?: boolean;
}

/**
 * Props for the search component
 */
export interface IngredientSearchProps {
  value: string;
  onChange: (id: string, type: 'raw' | 'prepared') => void;
  onSandboxCreate?: () => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Props for sandbox fields
 */
export interface SandboxFieldsProps {
  vendor: string;
  vendorCode: string;
  description: string;
  estimatedCost: number;
  unit: string;
  onChange: (field: string, value: string | number) => void;
  vendors: string[];
  compact?: boolean;
}

/**
 * Props for TabletMode
 */
export interface TabletModeProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  onClose: () => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  vendors: string[];
  showEducation?: boolean; // When true, shows tips and guidance (Guided Mode)
}

/**
 * Props for GuidedMode (future)
 */
export interface GuidedModeProps extends TabletModeProps {
  showTips?: boolean;
}

/**
 * New ingredient template
 */
export const createNewIngredient = (isSandbox = false): Partial<RecipeIngredient> => ({
  id: `ing-${Date.now()}`,
  ingredient_type: 'raw',
  quantity: 0,
  unit: '',
  cost_per_unit: 0,
  common_measure: '',
  is_sandbox: isSandbox,
  // Legacy fields for backward compatibility
  type: 'raw',
  name: '',
  cost: 0,
  commonMeasure: '',
});

/**
 * Sandbox ingredient template
 */
export const createSandboxIngredient = (): Partial<RecipeIngredient> => ({
  ...createNewIngredient(true),
  sandbox_vendor: '',
  sandbox_vendor_code: '',
  sandbox_description: '',
  sandbox_estimated_cost: 0,
});
