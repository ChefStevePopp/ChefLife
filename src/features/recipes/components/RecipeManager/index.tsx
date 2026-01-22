import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipeStore } from "../../stores/recipeStore";
import { useRecipeNavigationStore } from "@/stores/recipeNavigationStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { Plus, Search, Package, ChefHat, Utensils, Filter, X } from "lucide-react";
import { LoadingLogo } from "@/components/LoadingLogo";
import { useAuth } from "@/hooks/useAuth";
import { RecipeCard } from "../RecipeCard";
import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * RECIPE MANAGER - L5 Design System
 * =============================================================================
 * The Library view for recipes. Now uses RecipeCard components and navigates
 * to RecipeDetailPage instead of opening a modal.
 * =============================================================================
 */

export const RecipeManager: React.FC = () => {
  const navigate = useNavigate();
  const { recipes, isLoading, error, fetchRecipes } = useRecipeStore();
  const { setNavigationContext } = useRecipeNavigationStore();
  const { majorGroups, fetchMajorGroups } = useFoodRelationshipsStore();
  const { organization } = useAuth();
  const { showDiagnostics } = useDiagnostics();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Fetch data on mount
  useEffect(() => {
    if (organization?.id) {
      fetchRecipes();
      fetchMajorGroups();
    }
  }, [fetchRecipes, fetchMajorGroups, organization?.id]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = selectedType === "all" || recipe.type === selectedType;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" || recipe.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [recipes, searchTerm, selectedType, selectedStatus]);

  // Count recipes by type
  const counts = useMemo(() => ({
    all: recipes.length,
    prepared: recipes.filter((r) => r.type === "prepared").length,
    final: recipes.filter((r) => r.type === "final").length,
    receiving: recipes.filter((r) => r.type === "receiving").length,
  }), [recipes]);

  // Navigate to recipe detail page
  const handleViewRecipe = (recipe: Recipe) => {
    // Set navigation context for prev/next to work
    const filteredIds = filteredRecipes.map((r) => r.id);
    const filterDesc =
      selectedType === "all"
        ? `${filteredRecipes.length} recipes`
        : `${filteredRecipes.length} ${selectedType} items`;
    setNavigationContext(filteredIds, filterDesc, "/admin/recipes");

    // Navigate to detail page
    navigate(`/admin/recipes/${recipe.id}`);
  };

  // Navigate to create new recipe
  const handleCreateRecipe = () => {
    // Pass initial type if one is selected
    const params = new URLSearchParams();
    if (selectedType !== "all") {
      params.set("type", selectedType);
    }
    const queryString = params.toString();
    navigate(`/admin/recipes/new${queryString ? `?${queryString}` : ""}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters =
    searchTerm || selectedType !== "all" || selectedStatus !== "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingLogo message="Loading recipes..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 text-rose-400 rounded-lg">
        <h2 className="text-lg font-medium">Error Loading Recipes</h2>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeManager/index.tsx
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Recipe Manager</h1>
          <p className="text-gray-400">
            Create and manage your kitchen's recipes
          </p>
        </div>
        <button onClick={handleCreateRecipe} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Recipe
        </button>
      </div>

      {/* Recipe Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedType("all")}
          className={`tab primary ${selectedType === "all" ? "active" : ""}`}
        >
          <Package className="w-5 h-5 mr-2" />
          All Recipes
          <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">
            {counts.all}
          </span>
        </button>
        <button
          onClick={() => setSelectedType("prepared")}
          className={`tab blue ${selectedType === "prepared" ? "active" : ""}`}
        >
          <ChefHat className="w-5 h-5 mr-2" />
          Prepared Items
          <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">
            {counts.prepared}
          </span>
        </button>
        <button
          onClick={() => setSelectedType("final")}
          className={`tab green ${selectedType === "final" ? "active" : ""}`}
        >
          <Utensils className="w-5 h-5 mr-2" />
          Final Dishes
          <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">
            {counts.final}
          </span>
        </button>
        <button
          onClick={() => setSelectedType("receiving")}
          className={`tab amber ${selectedType === "receiving" ? "active" : ""}`}
        >
          <Package className="w-5 h-5 mr-2 text-amber-400" />
          Receiving Items
          <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">
            {counts.receiving}
          </span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 flex-wrap">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500/50 outline-none"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-primary-500/50 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Filter className="w-4 h-4" />
          <span>
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </span>
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onViewRecipe={() => handleViewRecipe(recipe)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            {hasActiveFilters ? "No recipes match your filters" : "No recipes yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Click \"New Recipe\" to create your first recipe"}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost">
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
