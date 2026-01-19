export interface MasterIngredient {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  item_code: string | null;
  major_group: string | null;
  category: string | null;
  sub_category: string | null;
  product: string;
  vendor: string;
  case_size: string;
  units_per_case: number;
  recipe_unit_type: string;
  yield_percent: number;
  cost_per_recipe_unit: number;
  current_price: number;
  recipe_unit_per_purchase_unit: number;
  unit_of_measure: string;
  image_url: string | null;
  storage_area: string;
  archived?: boolean;
  
  // ---------------------------------------------------------------------------
  // INGREDIENT TYPE - Purchased vs Prep
  // ---------------------------------------------------------------------------
  ingredient_type: 'purchased' | 'prep';
  source_recipe_id?: string | null;  // For prep: links to source recipe
  
  // ---------------------------------------------------------------------------
  // COMMON NAME - Kitchen/User Language
  // Links Code Groups (same vendor) and Umbrella Groups (all vendors)
  // Example: Vendor says "Pork Back Ribs 32-38oz", common_name is "Back Ribs"
  // ---------------------------------------------------------------------------
  common_name?: string | null;
  
  // ---------------------------------------------------------------------------
  // INVENTORY UNITS
  // How we count this ingredient during inventory taking
  // ---------------------------------------------------------------------------
  inventory_unit_type?: string;        // WHAT unit we count in (LB, EACH, CASE, %)
  // units_per_case already exists     // HOW MANY inventory units per purchase
  inventory_unit_cost?: number;        // Auto-calculated: price ÷ units_per_case
  
  // ---------------------------------------------------------------------------
  // REPORTING & TRACKING
  // ---------------------------------------------------------------------------
  // Ticker & Alerts (NEXUS notifications)
  show_in_price_ticker?: boolean;      // Display in Price Watch Ticker
  alert_price_change?: boolean;        // NEXUS notification on price changes
  alert_low_stock?: boolean;           // NEXUS notification on low inventory
  
  // BOH Vitals (operational criticality)
  vitals_tier?: 'critical' | 'elevated' | 'standard';  // How critical to monitor
  
  // Inventory Management
  inventory_schedule?: string[];       // ['daily', 'weekly', 'monthly', 'spot']
  par_level?: number;                  // Target stock (in inventory units)
  reorder_point?: number;              // Alert threshold (in inventory units)
  
  // ---------------------------------------------------------------------------
  // ALLERGENS - Contains (definite)
  // "This ingredient IS the allergen"
  // ---------------------------------------------------------------------------
  allergen_peanut: boolean;
  allergen_crustacean: boolean;
  allergen_treenut: boolean;
  allergen_shellfish: boolean;
  allergen_sesame: boolean;
  allergen_soy: boolean;
  allergen_fish: boolean;
  allergen_wheat: boolean;
  allergen_milk: boolean;
  allergen_sulphite: boolean;
  allergen_egg: boolean;
  allergen_gluten: boolean;
  allergen_mustard: boolean;
  allergen_celery: boolean;
  allergen_garlic: boolean;
  allergen_onion: boolean;
  allergen_nitrite: boolean;
  allergen_mushroom: boolean;
  allergen_hot_pepper: boolean;
  allergen_citrus: boolean;
  allergen_pork: boolean;
  
  // ---------------------------------------------------------------------------
  // ALLERGENS - May Contain (supplier cross-contamination)
  // "Supplier says: processed in facility that also handles..."
  // ---------------------------------------------------------------------------
  allergen_peanut_may_contain?: boolean;
  allergen_crustacean_may_contain?: boolean;
  allergen_treenut_may_contain?: boolean;
  allergen_shellfish_may_contain?: boolean;
  allergen_sesame_may_contain?: boolean;
  allergen_soy_may_contain?: boolean;
  allergen_fish_may_contain?: boolean;
  allergen_wheat_may_contain?: boolean;
  allergen_milk_may_contain?: boolean;
  allergen_sulphite_may_contain?: boolean;
  allergen_egg_may_contain?: boolean;
  allergen_gluten_may_contain?: boolean;
  allergen_mustard_may_contain?: boolean;
  allergen_celery_may_contain?: boolean;
  allergen_garlic_may_contain?: boolean;
  allergen_onion_may_contain?: boolean;
  allergen_nitrite_may_contain?: boolean;
  allergen_mushroom_may_contain?: boolean;
  allergen_hot_pepper_may_contain?: boolean;
  allergen_citrus_may_contain?: boolean;
  allergen_pork_may_contain?: boolean;
  
  // ---------------------------------------------------------------------------
  // CUSTOM ALLERGENS
  // User-defined allergens for specific dietary needs
  // ---------------------------------------------------------------------------
  allergen_custom1_name: string | null;
  allergen_custom1_active: boolean;
  allergen_custom1_may_contain?: boolean;
  allergen_custom2_name: string | null;
  allergen_custom2_active: boolean;
  allergen_custom2_may_contain?: boolean;
  allergen_custom3_name: string | null;
  allergen_custom3_active: boolean;
  allergen_custom3_may_contain?: boolean;
  
  // Allergen notes (free text)
  allergen_notes: string | null;
  
  // ---------------------------------------------------------------------------
  // RESOLVED NAMES (from food_relationships join)
  // ---------------------------------------------------------------------------
  major_group_name?: string;
  category_name?: string;
  sub_category_name?: string;
}

export interface MasterIngredientFormData
  extends Omit<
    MasterIngredient,
    | "id"
    | "created_at"
    | "updated_at"
    | "organization_id"
    | "major_group_name"
    | "category_name"
    | "sub_category_name"
  > {}

// ---------------------------------------------------------------------------
// ALLERGEN STATE TYPE
// ---------------------------------------------------------------------------
// For UI components to work with tri-state allergens
export type AllergenState = "none" | "contains" | "may_contain";

// Helper to derive state from two booleans
export const getAllergenState = (
  contains: boolean,
  mayContain: boolean
): AllergenState => {
  if (contains) return "contains";
  if (mayContain) return "may_contain";
  return "none";
};

// Helper to convert state back to booleans
export const setAllergenState = (
  state: AllergenState
): { contains: boolean; mayContain: boolean } => {
  switch (state) {
    case "contains":
      return { contains: true, mayContain: false };
    case "may_contain":
      return { contains: false, mayContain: true };
    default:
      return { contains: false, mayContain: false };
  }
};
