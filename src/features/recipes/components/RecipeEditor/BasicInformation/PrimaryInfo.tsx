import React, { useEffect, useState, useMemo } from "react";
import { Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { Recipe } from "../../../types/recipe";
import type { OperationsSettings } from "@/types/operations";

interface PrimaryInfoProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
  settings: OperationsSettings;
}

export const PrimaryInfo: React.FC<PrimaryInfoProps> = ({
  recipe,
  onChange,
  settings,
}) => {
  // Use Food Relationships store for consistent data
  const { showDiagnostics } = useDiagnostics();
  const {
    majorGroups: allMajorGroups,
    categories: allCategories,
    subCategories: allSubCategories,
    fetchFoodRelationships,
  } = useFoodRelationshipsStore();

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (allMajorGroups.length === 0) {
      fetchFoodRelationships();
    }
  }, [allMajorGroups.length, fetchFoodRelationships]);

  // Recipe Type options - major groups where is_recipe_type = true
  const recipeTypeGroups = useMemo(() => {
    return allMajorGroups
      .filter((g) => g.is_recipe_type && !g.archived)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [allMajorGroups]);

  // Categories filtered by selected major group
  const categories = useMemo(() => {
    if (!recipe.major_group) return [];
    return allCategories.filter(
      (c) => c.group_id === recipe.major_group && !c.archived
    );
  }, [allCategories, recipe.major_group]);

  // Sub-categories filtered by selected category
  const subCategories = useMemo(() => {
    if (!recipe.category) return [];
    return allSubCategories.filter(
      (s) => s.category_id === recipe.category && !s.archived
    );
  }, [allSubCategories, recipe.category]);

  // Handle major group (recipe type) change - resets dependent fields
  const handleMajorGroupChange = (groupId: string) => {
    onChange({
      major_group: groupId || null,
      category: null,
      sub_category: null,
    });
  };

  // Handle category change - resets sub-category
  const handleCategoryChange = (categoryId: string) => {
    onChange({
      category: categoryId || null,
      sub_category: null,
    });
  };

  return (
    <div className="space-y-4">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/BasicInformation/PrimaryInfo.tsx
        </div>
      )}
      {/* ... Header section remains the same ... */}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Recipe Name
          </label>
          <input
            type="text"
            value={recipe.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="input w-full bg-gray-800/50"
            placeholder="Enter recipe name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Recipe Type
          </label>
          <select
            value={recipe.major_group || ""}
            onChange={(e) => handleMajorGroupChange(e.target.value)}
            className="input w-full bg-gray-800/50"
            required
          >
            <option value="">Select Recipe Type</option>
            {recipeTypeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classification Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Category
          </label>
          <select
            value={recipe.category || ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="input w-full bg-gray-800/50"
            disabled={!recipe.major_group}
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Sub Category
          </label>
          <select
            value={recipe.sub_category || ""}
            onChange={(e) => onChange({ sub_category: e.target.value || null })}
            className="input w-full bg-gray-800/50"
            disabled={!recipe.category}
          >
            <option value="">Select Sub-Category</option>
            {subCategories.map((subCategory) => (
              <option key={subCategory.id} value={subCategory.id}>
                {subCategory.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Station
          </label>
          <select
            value={recipe.station || ""}
            onChange={(e) => onChange({ station: e.target.value })}
            className="input w-full bg-gray-800/50"
          >
            <option value="">Select Station</option>
            {settings.kitchen_stations?.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </div>
        <div>
          {/* Placeholder for future field or leave empty */}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Description
        </label>
        <textarea
          value={recipe.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          className="input w-full h-24 bg-gray-800/50"
          placeholder="Enter a detailed description of the recipe..."
          required
        />
      </div>
    </div>
  );
};
