import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  UtensilsCrossed,
  Plus,
  Search,
  Info,
  ChevronUp,
  X,
  FolderTree,
  Lightbulb,
  FileEdit,
  Eye,
  CheckCircle,
  Archive,
} from "lucide-react";
import { useRecipeStore } from "@/features/recipes/stores/recipeStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { getLucideIcon } from "@/utils/iconMapping";
import RecipeCard from "../RecipeCard";
import { RecipeEditorModal } from "../RecipeEditor";
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

// Tab colors follow L5 Design System progression from index.css
// Order: primary (blue) → green → amber → rose → purple → lime → red → cyan
const TAB_COLORS = ["primary", "green", "amber", "rose", "purple", "lime", "red", "cyan"];

// Legacy type mapping for backward compatibility
// Maps group names to the old recipe.type field values
const LEGACY_TYPE_MAP: Record<string, string> = {
  "MISE EN PLACE": "prepared",
  "FINAL GOODS": "final",
  "FINAL PLATES": "final",
  "RECEIVING": "receiving",
};

/**
 * Get the legacy type value from a group name (for backward compatibility)
 */
function getLegacyType(groupName: string): string | null {
  const normalized = groupName.toUpperCase();
  return LEGACY_TYPE_MAP[normalized] || null;
}

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
  const [activeTabId, setActiveTabId] = useState<string | null>(null); // Group ID
  const [searchTerm, setSearchTerm] = useState("");
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

  const { recipes, fetchRecipes } = useRecipeStore();
  const { supabase } = useSupabase();
  
  // Food Relationships for dynamic tabs
  const { getRecipeTypeGroups, fetchFoodRelationships } = useFoodRelationshipsStore();
  const recipeTypeGroups = getRecipeTypeGroups();
  
  // Build dynamic tabs from recipe type groups
  const dynamicTabs = useMemo(() => {
    return recipeTypeGroups.map((group, index) => ({
      id: group.id,
      label: group.name,
      icon: getLucideIcon(group.icon),
      color: TAB_COLORS[index % TAB_COLORS.length],
      legacyType: getLegacyType(group.name), // For backward compatibility
    }));
  }, [recipeTypeGroups]);

  // Get the active tab object
  const activeTab = useMemo(() => {
    return dynamicTabs.find(tab => tab.id === activeTabId) || dynamicTabs[0] || null;
  }, [dynamicTabs, activeTabId]);

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

  // Fetch recipes and food relationships on mount
  useEffect(() => {
    Promise.all([
      fetchRecipes(),
      fetchFoodRelationships(),
    ]).catch((error) => {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    });
  }, [fetchRecipes, fetchFoodRelationships]);

  // Set initial active tab when dynamic tabs load
  useEffect(() => {
    if (dynamicTabs.length > 0 && !activeTabId) {
      setActiveTabId(dynamicTabs[0].id);
    }
  }, [dynamicTabs, activeTabId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTabId, statusFilter, stationFilter, sortBy]);

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
    // If no active tab, return empty
    if (!activeTab) {
      return { displayedRecipes: [], totalFiltered: 0, totalPages: 0 };
    }

    // Filter recipes by tab (major_group ID or legacy type)
    let filtered = recipes.filter((recipe) => {
      // Primary: Match by major_group ID
      if (recipe.major_group === activeTab.id) {
        return true;
      }
      
      // Fallback: Match by legacy type field for backward compatibility
      if (activeTab.legacyType && recipe.type === activeTab.legacyType) {
        return true;
      }
      
      return false;
    });

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((recipe) =>
        recipe.name?.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.station?.toLowerCase().includes(searchLower) ||
        recipe.station_name?.toLowerCase().includes(searchLower) ||
        recipe.sub_category_name?.toLowerCase().includes(searchLower) ||
        recipe.category_name?.toLowerCase().includes(searchLower)
      );
    }

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
    recipes,
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
    if (!activeTab) return;
    
    setModalMode("create");
    const newRecipe: Partial<Recipe> = {
      type: (activeTab.legacyType || "prepared") as Recipe["type"], // Legacy field
      major_group: activeTab.id, // Modern field - links to food_category_groups
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

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
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
          {/* Top row: Icon/Title + Stats + Actions */}
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

            {/* Stats Pills + Actions */}
            <div className="flex items-center gap-2">
              {/* Recipe Type Pills - L5 subheader-pill pattern, scales to 8 */}
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                {dynamicTabs.map((tab) => {
                  const count = recipes.filter((r) => 
                    r.major_group === tab.id || 
                    (tab.legacyType && r.type === tab.legacyType)
                  ).length;
                  const TabIcon = tab.icon;
                  // Color map for pill variants
                  const colorMap: Record<string, string> = {
                    primary: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
                    green: 'bg-green-500/20 text-green-400 border-green-500/30',
                    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                    lime: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
                    red: 'bg-red-500/20 text-red-400 border-red-500/30',
                    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                  };
                  const colorClasses = colorMap[tab.color] || colorMap.primary;
                  return (
                    <div 
                      key={tab.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${colorClasses}`}
                      title={tab.label}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="hidden sm:block h-8 w-px bg-gray-700/50 mx-1" />

              {/* Action Button */}
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
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-4">
                <p className="text-sm text-gray-400">
                  Your central repository for standardized recipes. Each recipe type serves a specific 
                  purpose in your kitchen workflow — from prep components to guest-facing plates.
                </p>
                
                {/* Feature cards - L5 pattern */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="subheader-feature-card">
                    <ChefHat className="w-4 h-4 text-primary-400/80" />
                    <div>
                      <span className="subheader-feature-title text-white">Mise en Place</span>
                      <p className="subheader-feature-desc">Prep items, sauces, stocks — building blocks for final dishes</p>
                    </div>
                  </div>
                  <div className="subheader-feature-card">
                    <UtensilsCrossed className="w-4 h-4 text-green-400/80" />
                    <div>
                      <span className="subheader-feature-title text-white">Final Goods</span>
                      <p className="subheader-feature-desc">Complete dishes served to guests, assembled from prep items</p>
                    </div>
                  </div>
                  <div className="subheader-feature-card">
                    <Plus className="w-4 h-4 text-amber-400/80" />
                    <div>
                      <span className="subheader-feature-title text-white">Your Categories</span>
                      <p className="subheader-feature-desc">Add custom recipe types in Food Relationships — they appear as tabs here</p>
                    </div>
                  </div>
                </div>

                {/* Pro tip + Status Legend */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                    </span>
                    <span>Tip: Link prep items to final plates to automatically calculate costs and allergens across your menu.</span>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <FileEdit className="w-3 h-3 text-amber-400" />
                      </span>
                      Draft
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-gray-400" />
                      </span>
                      Review
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      </span>
                      Approved
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <Archive className="w-3 h-3 text-gray-400" />
                      </span>
                      Archived
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TAB NAVIGATION                                                     */}
      {/* ================================================================== */}
      <div className="flex gap-2 flex-wrap">
        {dynamicTabs.length > 0 ? (
          dynamicTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab?.id === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`tab ${tab.color} ${isActive ? "active" : ""}`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })
        ) : (
          <div className="text-sm text-gray-500 py-2">
            No recipe types configured. Enable recipe types in Food Relationships.
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* SEARCH & FILTERS - L5 Micro-header Pattern                          */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recipes</span>
            
            {/* Search */}
            <div className="flex items-center gap-2 ml-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-sm bg-gray-900/50 pl-9 w-72"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="subheader-right">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-sm bg-gray-900/50"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="input-sm bg-gray-900/50"
            >
              <option value="all">All Stations</option>
              {uniqueStations.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-sm bg-gray-900/50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn-ghost btn-sm"
              >
                <X className="w-4 h-4 mr-1.5" />
                Clear
              </button>
            )}
          </div>
        </div>
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
              {activeTab ? (
                (() => {
                  const TabIcon = activeTab.icon;
                  return <TabIcon className="w-8 h-8 text-gray-600" />;
                })()
              ) : (
                <FolderTree className="w-8 h-8 text-gray-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No Recipes Found
            </h3>
            <p className="text-gray-400 max-w-md">
              {hasActiveFilters
                ? "No recipes match your current filters. Try adjusting your search or filters."
                : `Get started by adding your first ${activeTab?.label || "recipe"}.`}
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
    </div>
  );
};

export default RecipeManager;
