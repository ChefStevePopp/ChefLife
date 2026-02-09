export interface Recipe {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: "prepared" | "final" | "receiving";
  status: "draft" | "review" | "approved" | "archived";
  station?: string;
  prep_time: number;
  cook_time: number;
  rest_time?: number;
  total_time?: number;
  yield_amount: number;
  yield_unit: string;
  recipe_unit_ratio?: string;
  unit_type?: string;
  cost_per_unit?: number;
  labor_cost_per_hour?: number;
  total_cost?: number;
  target_cost_percent?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  stages?: RecipeStage[];
  equipment?: EquipmentItem[];
  allergens?: {
    contains: string[];
    mayContain?: string[];
    crossContactRisk?: string[];
  };
  // View field - allergen info from joined query
  allergenInfo?: {
    contains: string[];
    mayContain?: string[];
    crossContactRisk?: string[];
  };
  // Persisted manual allergen overrides — survives tab switches & save/reload
  // Separates "operator explicitly added" from "auto-detected from ingredients"
  allergenManualOverrides?: {
    manualContains: string[];       // Operator-added CONTAINS (cross-contact, shared equipment, etc.)
    manualMayContain: string[];     // Operator-added MAY CONTAIN
    promotedToContains: string[];   // Upgraded from mayContain → contains
    manualNotes: Record<string, string>; // Per-allergen notes
    crossContactNotes: string[];    // General cross-contact notes
  };
  quality_standards?: QualityStandards;
  media?: RecipeMedia[];
  training?: RecipeTraining;
  storage?: RecipeStorage;
  production_notes?: string;
  primary_station?: string;
  secondary_station?: string;
  version?: string;
  versions?: any[];
  label_requirements?: LabelRequirements;
  use_label_printer?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  modified_by?: string;
  approved_by?: string;
  approved_at?: string;
  last_reviewed_at?: string;
  last_reviewed_by?: string;
  // =========================================
  // Allergen boolean columns (Phase 2 dual-write)
  // Mirrors MIL pattern: allergen_{type}_{tier}
  // See: ROADMAP-Allergen-Boolean-Migration.md
  // =========================================
  allergen_peanut_contains?: boolean;
  allergen_peanut_may_contain?: boolean;
  allergen_peanut_environment?: boolean;
  allergen_crustacean_contains?: boolean;
  allergen_crustacean_may_contain?: boolean;
  allergen_crustacean_environment?: boolean;
  allergen_treenut_contains?: boolean;
  allergen_treenut_may_contain?: boolean;
  allergen_treenut_environment?: boolean;
  allergen_shellfish_contains?: boolean;
  allergen_shellfish_may_contain?: boolean;
  allergen_shellfish_environment?: boolean;
  allergen_sesame_contains?: boolean;
  allergen_sesame_may_contain?: boolean;
  allergen_sesame_environment?: boolean;
  allergen_soy_contains?: boolean;
  allergen_soy_may_contain?: boolean;
  allergen_soy_environment?: boolean;
  allergen_fish_contains?: boolean;
  allergen_fish_may_contain?: boolean;
  allergen_fish_environment?: boolean;
  allergen_wheat_contains?: boolean;
  allergen_wheat_may_contain?: boolean;
  allergen_wheat_environment?: boolean;
  allergen_milk_contains?: boolean;
  allergen_milk_may_contain?: boolean;
  allergen_milk_environment?: boolean;
  allergen_sulphite_contains?: boolean;
  allergen_sulphite_may_contain?: boolean;
  allergen_sulphite_environment?: boolean;
  allergen_egg_contains?: boolean;
  allergen_egg_may_contain?: boolean;
  allergen_egg_environment?: boolean;
  allergen_gluten_contains?: boolean;
  allergen_gluten_may_contain?: boolean;
  allergen_gluten_environment?: boolean;
  allergen_mustard_contains?: boolean;
  allergen_mustard_may_contain?: boolean;
  allergen_mustard_environment?: boolean;
  allergen_celery_contains?: boolean;
  allergen_celery_may_contain?: boolean;
  allergen_celery_environment?: boolean;
  allergen_garlic_contains?: boolean;
  allergen_garlic_may_contain?: boolean;
  allergen_garlic_environment?: boolean;
  allergen_onion_contains?: boolean;
  allergen_onion_may_contain?: boolean;
  allergen_onion_environment?: boolean;
  allergen_nitrite_contains?: boolean;
  allergen_nitrite_may_contain?: boolean;
  allergen_nitrite_environment?: boolean;
  allergen_mushroom_contains?: boolean;
  allergen_mushroom_may_contain?: boolean;
  allergen_mushroom_environment?: boolean;
  allergen_hot_pepper_contains?: boolean;
  allergen_hot_pepper_may_contain?: boolean;
  allergen_hot_pepper_environment?: boolean;
  allergen_citrus_contains?: boolean;
  allergen_citrus_may_contain?: boolean;
  allergen_citrus_environment?: boolean;
  allergen_pork_contains?: boolean;
  allergen_pork_may_contain?: boolean;
  allergen_pork_environment?: boolean;
  // Custom allergens (3 slots)
  allergen_custom1_name?: string;
  allergen_custom1_contains?: boolean;
  allergen_custom1_may_contain?: boolean;
  allergen_custom1_environment?: boolean;
  allergen_custom2_name?: string;
  allergen_custom2_contains?: boolean;
  allergen_custom2_may_contain?: boolean;
  allergen_custom2_environment?: boolean;
  allergen_custom3_name?: string;
  allergen_custom3_contains?: boolean;
  allergen_custom3_may_contain?: boolean;
  allergen_custom3_environment?: boolean;
  // Freshness timestamp
  allergen_declared_at?: string;

  // View-only fields
  station_name?: string;
  major_group_name?: string;
  category_name?: string;
  sub_category_name?: string;
  created_by_name?: string;
  modified_by_name?: string;
  // Image URL (legacy field)
  image_url?: string;
  major_group?: string | null;
  category?: string | null;
  sub_category?: string | null;
}

/**
 * RecipeIngredient - Relational model (from recipe_ingredients table)
 * 
 * This is the NEW relational structure. During migration, both old JSONB
 * and new relational fields are supported.
 * 
 * Triangle model: master_ingredient → recipe_ingredient → recipe costing
 * Cascade: When master_ingredient price changes, cost_per_unit auto-updates
 */
export interface RecipeIngredient {
  // Core identity
  id: string;
  recipe_id?: string;
  
  // Type discriminator
  ingredient_type: 'raw' | 'prepared';
  
  // Reference to source (exactly one will be set based on ingredient_type)
  master_ingredient_id?: string;   // For 'raw' ingredients
  prepared_recipe_id?: string;     // For 'prepared' sub-recipes
  
  // Quantity and measurement
  quantity: number;                // Now a number, not string
  unit: string;
  common_measure?: string;         // Human-friendly (e.g., "2 cups")
  
  // Cost tracking (denormalized, auto-updated by cascade trigger)
  cost_per_unit: number;           // Current cost per unit from source
  
  // Metadata
  notes?: string;
  sort_order?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // =========================================
  // Joined fields (read-only, from queries)
  // =========================================
  ingredient_name?: string;        // From master_ingredients.product or recipes.name
  common_name?: string;            // From master_ingredients.common_name (e.g., "Brisket")
  allergens?: string[];            // From master_ingredients.allergens
  recipe_unit_type?: string;       // From master_ingredients.recipe_unit_type
  
  // =========================================
  // SANDBOX MODE - For speculative ingredients
  // not yet verified via invoice/MIL
  // =========================================
  is_sandbox?: boolean;            // Toggle: true = sandbox item
  sandbox_vendor?: string;         // Prospective vendor (e.g., "GFS")
  sandbox_vendor_code?: string;    // Vendor catalog code
  sandbox_description?: string;    // User-entered description
  sandbox_estimated_cost?: number; // Manual cost estimate (flagged as unverified)
  
  // =========================================
  // DEPRECATED: Legacy JSONB fields
  // Remove after migration complete
  // =========================================
  /** @deprecated Use master_ingredient_id or prepared_recipe_id instead */
  name?: string;
  /** @deprecated Use cost_per_unit instead */
  cost?: number;
  /** @deprecated Use common_measure instead */
  commonMeasure?: string;
  /** @deprecated Use ingredient_type instead */
  type?: 'raw' | 'prepared';
}

/**
 * Helper type for creating new ingredients (omits read-only fields)
 */
export type RecipeIngredientCreate = Omit<
  RecipeIngredient,
  'id' | 'created_at' | 'updated_at' | 'ingredient_name' | 'allergens' | 'recipe_unit_type'
>;

/**
 * Helper type for updating ingredients
 */
export type RecipeIngredientUpdate = Partial<RecipeIngredientCreate> & { id: string };

export interface EquipmentItem {
  id: string;
  name: string;
}

export interface RecipeStep {
  id: string;
  instruction: string;
  notes?: string;
  warning_level?: "low" | "medium" | "high";
  time_in_minutes?: number;
  temperature?: {
    value: number;
    unit: "F" | "C";
  };
  is_quality_control_point?: boolean;
  is_critical_control_point?: boolean;
  media?: RecipeMedia[];
  stage?: string;
  custom_stage_label?: string | null;
  is_prep_list_task?: boolean;
  custom_step_label?: string | null;
  delay?: {
    value: number;
    unit: "minutes" | "hours" | "days";
  };
  stage_id?: string;
}

export interface RecipeMedia {
  id: string;
  type: "image" | "video" | "external-video";
  url: string;
  provider?: "youtube" | "vimeo";
  title?: string;
  description?: string;
  step_id?: string;
  is_primary?: boolean;
  tags?: string[];
  timestamp?: number;
  sort_order?: number;
}

export interface RecipeStage {
  id: string;
  name: string;
  is_prep_list_task: boolean;
  sort_order: number;
  color?: string;
  description?: string;
  total_time?: number; // Total time in minutes for all steps in this stage
}

export interface QualityStandards {
  appearance_description?: string;
  appearance_image_urls?: string[];
  texture_points?: string[];
  taste_points?: string[];
  aroma_points?: string[];
  plating_instructions?: string;
  plating_image_urls?: string[];
  temperature?: {
    value: number;
    unit: "F" | "C";
    tolerance?: number;
  };
}

export interface RecipeTraining {
  requiredSkillLevel?: "beginner" | "intermediate" | "advanced" | "expert";
  certificationRequired?: string[];
  keyTechniques?: string[];
  commonErrors?: string[];
  safetyProtocols?: string[];
  qualityStandards?: string[];
  notes?: string;
}

export interface RecipeStorage {
  primary_area?: string;
  secondary_area?: string;
  container?: string;
  container_type?: string;
  shelf_life_duration?: number;
  shelf_life_unit?: "hours" | "days" | "weeks" | "months";
  storage_temp?: number;
  storage_temp_unit?: "F" | "C";
  temp_tolerance?: number;
  temp_tolerance_unit?: "F" | "C";
  thawing_required?: boolean;
  thawing_instructions?: string;
  expiration_guidelines?: string;
  temperature_notes?: string;
  notes?: string;
  primary_image_url?: string;
  secondary_image_url?: string;
  is_critical_control_point?: boolean;
}

export interface RecipeVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  changes: string[];
  revertedFrom?: string;
  approved?: {
    by: string;
    at: string;
    notes?: string;
  };
}

export interface LabelRequirements {
  required_fields: string[];
  custom_fields?: string[];
  description?: string;
  example_photo_url?: string | null;
  example_photo_description?: string | null;
  use_label_printer?: boolean;
}

export interface RecipeEquipment {
  id: string;
  name: string;
}

/**
 * RecipeInput - For creating new recipes (id is optional/generated)
 */
export type RecipeInput = Omit<Recipe, 'id'> & { id?: string };
