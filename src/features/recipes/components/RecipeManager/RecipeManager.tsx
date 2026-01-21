import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  UtensilsCrossed,
  Plus,
  Search,
  Upload,
  Package,
  Info,
  ChevronUp,
  X,
} from "lucide-react";
import { useRecipeStore } from "@/features/recipes/stores/recipeStore";
import RecipeCard from "../RecipeCard";
import { RecipeEditorModal } from "../RecipeEditor";
import { RecipeImportModal } from "../RecipeImportModal";
import type { Recipe } from "../../types/recipe";
import { useSupabase } from "@/context/SupabaseContext";
import { useDebounce } from "@/shared/hooks/useDebounce";
import toast from "react-hot-toast";

// ============================================================================
// LOADING SKELETON
// ============================================================================
const RecipeCardSkeleton: React.FC = () => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-700/50 rounded w-1/2" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 bg-gray-700/50 rounded w-full" />
      <div className="h-3 bg-gray-700/50 rounded w-2/3" />
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-6 bg-gray-700/30 rounded-full w-16" />
      <div className="h-6 bg-gray-700/30 rounded-full w-20" />
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-700" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-700/50 rounded w-64" />
        </div>
      </div>
    </div>

    {/* Tabs Skeleton */}
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-gray-800 rounded-lg w-32 animate-pulse" />
      ))}
    </div>

    {/* Search Skeleton */}
    <div className="h-11 bg-gray-800 rounded-lg animate-pulse" />

    {/* Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================================================
// CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 12;

const TABS = [
  {
    id: "prepared" as const,
    label: "Mis en Place",
    icon: UtensilsCrossed,
    color: "primary",
  },
  {
    id: "final" as const,
    label: "Final Plates",
    icon: ChefHat,
    color: "green",
  },
  {
    id: "receiving" as const,
    label: "Receiving Items",
    icon: Package,
    color: "amber",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];
type SortOption = "name" | "updated" | "cost" | "prep_time";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated", label: "Recently Updated" },
  { value: "name", label: "Name A-Z" },
  { value: "cost", label: "Highest Cost" },
  { value: "prep_time", label: "Prep Time" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const RecipeManager: React.FC = () => {
  const diagnosticPath =
    "src/features/recipes/components/RecipeManager/RecipeManager.tsx";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<TabId>("prepared");
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Phase 2-4: Search, Filter, Sort, Pagination
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounced search (300ms)
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { recipes, fetchRecipes, filterRecipes } = useRecipeStore();
  const { supabase } = useSupabase();

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  
  // Fetch organization ID on mount
  useEffect(() => {
    const getOrgId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.organizationId) {
          setOrganizationId(user.user_metadata.organizationId);
        }
      } catch (error) {
        console.error("Failed to fetch organization ID:", error);
        toast.error("Failed to fetch organization ID");
      } finally {
        setIsLoading(false);
      }
    };
    getOrgId();
  }, [supabase]);

  // Fetch recipes on mount
  useEffect(() => {
    fetchRecipes().catch((error) => {
      console.error("Error fetching recipes:", error);
      toast.error("Failed to load recipes");
    });
  }, [fetchRecipes]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab, statusFilter, stationFilter, sortBy]);

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------
  
  // Get unique stations for filter dropdown
  const uniqueStations = useMemo(() => {
    const stations = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) stations.add(r.station);
      if (r.primary_station) stations.add(r.primary_station);
    });
    return Array.from(stations).sort();
  }, [recipes]);

  // Filter, sort, and paginate recipes
  const { displayedRecipes, totalFiltered, totalPages } = useMemo(() => {
    // Start with tab filter
    let filtered = filterRecipes(activeTab, debouncedSearch);

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Apply station filter
    if (stationFilter !== "all") {
      filtered = filtered.filter(
        (r) => r.station === stationFilter || r.primary_station === stationFilter
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "updated":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
        case "cost":
          return (b.total_cost || 0) - (a.total_cost || 0);
        case "prep_time":
          return (b.prep_time || 0) - (a.prep_time || 0);
        default:
          return 0;
      }
    });

    const totalFiltered = sorted.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedRecipes = sorted.slice(start, start + ITEMS_PER_PAGE);

    return { displayedRecipes, totalFiltered, totalPages };
  }, [
    filterRecipes,
    activeTab,
    debouncedSearch,
    statusFilter,
    stationFilter,
    sortBy,
    currentPage,
  ]);

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm || statusFilter !== "all" || stationFilter !== "all";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  
  const handleNewRecipe = () => {
    setModalMode("create");
    const newRecipe: Partial<Recipe> = {
      type: activeTab,
      name: "",
      description: "",
      station: "",
      storage_area: "",
      container: "",
      container_type: "",
      shelf_life: "",
      prep_time: 0,
      cook_time: 0,
      rest_time: 0,
      recipe_unit_ratio: "1",
      unit_type: "portion",
      yield_amount: 1,
      yield_unit: "portion",
      ingredients: [],
      steps: [],
      media: [],
      allergens: {
        contains: [],
        mayContain: [],
        crossContactRisk: [],
      },
      quality_standards: {
        appearance_description: "",
        texture_points: [],
        taste_points: [],
        aroma_points: [],
        temperature: {
          value: 0,
          unit: "F",
          tolerance: 0,
        },
      },
      training: {
        required_skill_level: "beginner",
        certification_required: false,
        common_errors: [],
        key_techniques: [],
        safety_protocols: [],
        quality_standards: [],
      },
      cost_per_unit: 0,
      labor_cost_per_hour: 30,
      total_cost: 0,
      target_cost_percent: 25,
      version: "1.0",
      versions: [],
      organization_id: organizationId,
    };
    setEditingRecipe(newRecipe as Recipe);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStationFilter("all");
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Diagnostic Text */}
      <div className="text-xs text-gray-500 font-mono">{diagnosticPath}</div>

      {/* ================================================================== */}
      {/* L5 HEADER                                                          */}
      {/* ================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Recipe Manager
                </h1>
                <p className="text-gray-400 text-sm">
                  Build your kitchen's knowledge base
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="btn-ghost text-sm"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Import
              </button>
              <button onClick={handleNewRecipe} className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                New Recipe
              </button>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div
            className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}
          >
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Recipe Manager
                </span>
              </div>
              <ChevronUp
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isInfoExpanded ? "" : "rotate-180"
                }`}
              />
            </button>
            {isInfoExpanded && (
              <div className="expandable-info-content">
                <div className="p-4 pt-2 space-y-3 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">Mis en Place:</strong>{" "}
                    Prep items, sauces, stocks, and components that become
                    building blocks for final dishes.
                  </p>
                  <p>
                    <strong className="text-gray-300">Final Plates:</strong>{" "}
                    Complete dishes served to guests, assembled from your prep
                    items and raw ingredients.
                  </p>
                  <p>
                    <strong className="text-gray-300">Receiving Items:</strong>{" "}
                    Quality standards and handling procedures for incoming
                    ingredients — ensuring consistency from delivery to plate.
                  </p>
                  <p className="text-gray-500 text-xs pt-2 border-t border-gray-700/50">
                    💡 Tip: Link prep items to final plates to automatically
                    calculate costs and allergens.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TAB NAVIGATION                                                     */}
      {/* ================================================================== */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* SEARCH & FILTERS                                                   */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>

        {/* Station Filter */}
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="input w-full sm:w-40"
        >
          <option value="all">All Stations</option>
          {uniqueStations.map((station) => (
            <option key={station} value={station}>
              {station}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input w-full sm:w-44"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Status Bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Showing{" "}
          <span className="text-white font-medium">
            {displayedRecipes.length}
          </span>{" "}
          of <span className="text-white font-medium">{totalFiltered}</span>{" "}
          recipes
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* ================================================================== */}
      {/* RECIPE GRID                                                        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedRecipes.length > 0 ? (
          displayedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => {
                setModalMode("edit");
                setEditingRecipe(recipe);
              }}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              {activeTab === "prepared" ? (
                <UtensilsCrossed className="w-8 h-8 text-gray-600" />
              ) : activeTab === "final" ? (
                <ChefHat className="w-8 h-8 text-gray-600" />
              ) : (
                <Package className="w-8 h-8 text-gray-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No Recipes Found
            </h3>
            <p className="text-gray-400 max-w-md">
              {hasActiveFilters
                ? "No recipes match your current filters. Try adjusting your search or filters."
                : `Get started by adding your first ${
                    activeTab === "prepared"
                      ? "prep item"
                      : activeTab === "final"
                        ? "final plate"
                        : "receiving item"
                  }.`}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="btn-ghost mt-6"
              >
                <X className="w-4 h-4 mr-1.5" />
                Clear Filters
              </button>
            ) : (
              <button onClick={handleNewRecipe} className="btn-primary mt-6">
                <Plus className="w-4 h-4 mr-1.5" />
                Create New Recipe
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* PAGINATION                                                         */}
      {/* ================================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page{" "}
            <span className="text-white font-medium">{currentPage}</span> of{" "}
            <span className="text-white font-medium">{totalPages}</span>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALS                                                             */}
      {/* ================================================================== */}
      {editingRecipe && (
        <RecipeEditorModal
          isOpen={true}
          onClose={() => setEditingRecipe(null)}
          recipe={editingRecipe}
          mode={modalMode}
          organizationId={organizationId}
        />
      )}

      <RecipeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default RecipeManager;
