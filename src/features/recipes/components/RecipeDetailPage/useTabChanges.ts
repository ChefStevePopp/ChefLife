import { useMemo } from "react";
import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * TAB CHANGE DETECTION HOOK
 * =============================================================================
 * Maps recipe fields to their respective tabs and detects which tabs have
 * unsaved changes. Powers the change indicators on tabs and action bar.
 * =============================================================================
 */

// Field-to-tab mapping
const TAB_FIELDS: Record<string, (keyof Recipe)[]> = {
  recipe: [
    "name",
    "description",
    "type",
    "major_group",
    "category",
    "sub_category",
    "station",
    "ingredients",
    "yield_amount",
    "yield_unit",
    "recipe_unit_ratio",
    "unit_type",
    "cost_per_unit",
    "labor_cost_per_hour",
    "total_cost",
    "target_cost_percent",
  ],
  instructions: ["steps", "stages"],
  production: [
    "prep_time",
    "cook_time",
    "rest_time",
    "total_time",
    "production_notes",
    "primary_station",
    "secondary_station",
  ],
  labels: ["label_requirements", "use_label_printer"],
  storage: ["storage"],
  stations: ["equipment"],
  quality: ["quality_standards"],
  allergens: ["allergenInfo"],
  media: ["media", "image_url"],
  training: ["training"],
  versions: ["version", "versions"],
};

// Tab labels for display
export const TAB_LABELS: Record<string, string> = {
  recipe: "Recipe Info",
  instructions: "Instructions",
  production: "Production",
  labels: "Labels",
  storage: "Storage",
  stations: "Stations",
  quality: "Quality",
  allergens: "Allergens",
  media: "Media",
  training: "Training",
  versions: "Versions",
};

/**
 * Deep comparison of two values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }
  
  return false;
}

/**
 * Hook to detect which tabs have unsaved changes
 */
export function useTabChanges(
  formData: Recipe | Omit<Recipe, "id"> | null,
  originalData: Recipe | null
): {
  changedTabs: string[];
  hasChanges: boolean;
  getChangeSummary: () => string;
} {
  const changedTabs = useMemo(() => {
    if (!formData || !originalData) return [];

    const changed: string[] = [];

    for (const [tabId, fields] of Object.entries(TAB_FIELDS)) {
      const hasTabChanges = fields.some((field) => {
        const currentValue = formData[field];
        const originalValue = originalData[field];
        return !deepEqual(currentValue, originalValue);
      });

      if (hasTabChanges) {
        changed.push(tabId);
      }
    }

    return changed;
  }, [formData, originalData]);

  const hasChanges = changedTabs.length > 0;

  const getChangeSummary = (): string => {
    if (changedTabs.length === 0) return "";
    if (changedTabs.length === 1) return TAB_LABELS[changedTabs[0]];
    if (changedTabs.length === 2) {
      return `${TAB_LABELS[changedTabs[0]]} & ${TAB_LABELS[changedTabs[1]]}`;
    }
    return `${TAB_LABELS[changedTabs[0]]} + ${changedTabs.length - 1} more`;
  };

  return {
    changedTabs,
    hasChanges,
    getChangeSummary,
  };
}
