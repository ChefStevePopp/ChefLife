import { type AllergenType } from "@/features/allergens/types";

// =============================================================================
// ALLERGEN MANAGER TYPES
// =============================================================================

export type AllergenEnvironmentalState = "contains" | "may_contain" | "none";

export type AllergenSectionId = "custom_icons" | "station_allergens" | "portal_config";

export interface StationAllergenData {
  environmentalAllergens: Record<AllergenType, AllergenEnvironmentalState>;
  notes?: string;
}

export interface AllergenSection {
  id: AllergenSectionId;
  icon: React.ElementType;
  color: string;
  label: string;
  subtitle: string;
  comingSoon: boolean;
}
