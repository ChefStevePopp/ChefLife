import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Search,
  Clock,
  X,
  Eye,
  EyeOff,
  ChevronUp,
  Book,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecipeStore } from "@/stores/recipeStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";
import { getLucideIcon } from "@/utils/iconMapping";
import { useDebounce } from "@/shared/hooks/useDebounce";
import RecipeFlipCard from "../RecipeFlipCard";
import type { Recipe } from "../../types/recipe";
import toast from "react-hot-toast";

/**
 * =============================================================================
 * RECIPE VIEWER - User-Side Recipe Library (L5 Pattern)
 * =============================================================================
 * 
 * L5 STRUCTURE (matches admin pages):
 * 1. L5 Header (icon, title, subtitle, filter pills, status toggle)
 * 2. Expandable Info Section → Discover/Recently Viewed Carousel
 * 3. Subheader (type label, count, search, filters)
 * 4. Recipe Card Grid
 * 
 * MULTI-SELECT: Recipe type filters allow any/all combinations
 * 
 * Routes: /kitchen/recipes
 * =============================================================================
 */

// ============================================================================
// LOADING SKELETON
// ============================================================================
const RecipeCardSkeleton: React.FC = () => (
  <div className="aspect-[9/16] bg-gray-800/50 rounded-xl border border-gray-700/50 animate-pulse overflow-hidden">
    <div className="h-2/3 bg-gray-700/50" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-700/50 rounded w-3/4" />
      <div className="h-3 bg-gray-700/50 rounded w-1/2" />
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="bg-[#1a1f2b] rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-700" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-700/50 rounded w-64" />
        </div>
      </div>
    </div>
    <div className="h-12 bg-gray-800/50 rounded-lg animate-pulse" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-[1920px]:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================================================
// CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 10;
const STORAGE_KEY = 'cheflife_recipe_viewer_prefs';
const VIEW_HISTORY_KEY = 'cheflife_recipe_view_history';

const TAB_COLORS = ["primary", "green", "amber", "rose", "purple", "lime", "red", "cyan"];

const LEGACY_TYPE_MAP: Record<string, string> = {
  "MISE EN PLACE": "prepared",
  "FINAL GOODS": "final",
  "FINAL PLATES": "final",
  "RECEIVING": "receiving",
};

function getLegacyType(groupName: string): string | null {
  const normalized = groupName.toUpperCase();
  return LEGACY_TYPE_MAP[normalized] || null;
}

type SortOption = "name" | "updated" | "station";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name A-Z" },
  { value: "updated", label: "Recently Updated" },
  { value: "station", label: "Station" },
];

interface ViewerPrefs {
  activeTabIds?: string[];
  searchTerm?: string;
  stationFilter?: string;
  sortBy?: SortOption;
  showAllStatuses?: boolean;
}

function loadPrefs(): ViewerPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return {};
}

function savePrefs(prefs: ViewerPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const RecipeViewer: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { securityLevel } = useAuth();
  const navigate = useNavigate();
  
  const canViewAllStatuses = securityLevel <= SECURITY_LEVELS.CHARLIE;
  const savedPrefs = useMemo(() => loadPrefs(), []);
  
  // State - Multi-select for recipe types
  const [activeTabIds, setActiveTabIds] = useState<string[]>(savedPrefs.activeTabIds ?? []);
  const [searchTerm, setSearchTerm] = useState(savedPrefs.searchTerm ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscoverExpanded, setIsDiscoverExpanded] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(savedPrefs.showAllStatuses ?? false);
  const [stationFilter, setStationFilter] = useState<string>(savedPrefs.stationFilter ?? "all");
  const [sortBy, setSortBy] = useState<SortOption>(savedPrefs.sortBy ?? "name");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Stores
  const { recipes, fetchRecipes } = useRecipeStore();
  const { getRecipeTypeGroups, fetchFoodRelationships } = useFoodRelationshipsStore();
  const recipeTypeGroups = getRecipeTypeGroups();

  // Dynamic tabs
  const dynamicTabs = useMemo(() => {
    return recipeTypeGroups.map((group, index) => ({
      id: group.id,
      label: group.name,
      icon: getLucideIcon(group.icon),
      color: TAB_COLORS[index % TAB_COLORS.length],
      legacyType: getLegacyType(group.name),
    }));
  }, [recipeTypeGroups]);

  // Data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchRecipes(), fetchFoodRelationships()]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load recipes");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchRecipes, fetchFoodRelationships]);

  // Initialize with all tabs selected if none saved
  useEffect(() => {
    if (dynamicTabs.length > 0 && activeTabIds.length === 0) {
      setActiveTabIds(dynamicTabs.map(t => t.id));
    }
  }, [dynamicTabs, activeTabIds.length]);

  useEffect(() => {
    if (isLoading) return;
    savePrefs({ activeTabIds, searchTerm: debouncedSearch, stationFilter, sortBy, showAllStatuses });
  }, [activeTabIds, debouncedSearch, stationFilter, sortBy, showAllStatuses, isLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTabIds, stationFilter, sortBy, showAllStatuses]);

  // Derived data
  const uniqueStations = useMemo(() => {
    const stations = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) stations.add(r.station);
      if (r.primary_station) stations.add(r.primary_station);
    });
    return Array.from(stations).sort();
  }, [recipes]);

  const { displayedRecipes, totalFiltered, totalPages } = useMemo(() => {
    const activeTabs = dynamicTabs.filter(tab => activeTabIds.includes(tab.id));
    
    if (activeTabs.length === 0) {
      return { displayedRecipes: [], totalFiltered: 0, totalPages: 0 };
    }

    let filtered = recipes.filter((recipe) => {
      return activeTabs.some(tab => {
        if (recipe.major_group === tab.id) return true;
        if (tab.legacyType && recipe.type === tab.legacyType) return true;
        return false;
      });
    });

    filtered = filtered.filter((recipe) => {
      if (canViewAllStatuses && showAllStatuses) return recipe.status !== "archived";
      return recipe.status === "approved";
    });

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((recipe) =>
        recipe.name?.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.station?.toLowerCase().includes(searchLower)
      );
    }

    if (stationFilter !== "all") {
      filtered = filtered.filter((r) => r.station === stationFilter || r.primary_station === stationFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name": return (a.name || "").localeCompare(b.name || "");
        case "updated": return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        case "station": return (a.station || "").localeCompare(b.station || "");
        default: return 0;
      }
    });

    const totalFiltered = sorted.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedRecipes = sorted.slice(start, start + ITEMS_PER_PAGE);

    return { displayedRecipes, totalFiltered, totalPages };
  }, [recipes, dynamicTabs, activeTabIds, debouncedSearch, stationFilter, sortBy, currentPage, canViewAllStatuses, showAllStatuses]);

  const { recentRecipes, hasViewHistory } = useMemo(() => {
    let viewedIds: string[] = [];
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_KEY);
      if (stored) viewedIds = JSON.parse(stored);
    } catch (e) {}
    
    const approvedRecipes = recipes.filter((r) => r.status === "approved");
    
    if (viewedIds.length > 0) {
      const viewed = viewedIds.map((id) => approvedRecipes.find((r) => r.id === id)).filter(Boolean) as Recipe[];
      if (viewed.length > 0) return { recentRecipes: viewed.slice(0, 12), hasViewHistory: true };
    }
    
    const shuffled = [...approvedRecipes].sort(() => Math.random() - 0.5);
    return { recentRecipes: shuffled.slice(0, 12), hasViewHistory: false };
  }, [recipes]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recipes.forEach((r) => {
      if (r.status === "approved") {
        dynamicTabs.forEach((tab) => {
          if (r.major_group === tab.id || (tab.legacyType && r.type === tab.legacyType)) {
            counts[tab.id] = (counts[tab.id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [recipes, dynamicTabs]);

  const hasActiveFilters = searchTerm || stationFilter !== "all" || activeTabIds.length < dynamicTabs.length;

  // Handlers
  const handleRecipeClick = (recipeId: string) => {
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_KEY);
      let viewedIds: string[] = stored ? JSON.parse(stored) : [];
      viewedIds = viewedIds.filter((id) => id !== recipeId);
      viewedIds.unshift(recipeId);
      viewedIds = viewedIds.slice(0, 20);
      localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(viewedIds));
    } catch (e) {}
    navigate(`/kitchen/recipes/${recipeId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStationFilter("all");
    setActiveTabIds(dynamicTabs.map(t => t.id));
  };

  const handleTabToggle = (tabId: string) => {
    setActiveTabIds(prev => {
      if (prev.includes(tabId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
    setCurrentPage(1);
  };

  const handleSelectAllTabs = () => {
    setActiveTabIds(dynamicTabs.map(t => t.id));
    setCurrentPage(1);
  };

  // Color map for tabs
  const colorMap: Record<string, { active: string; inactive: string }> = {
    primary: {
      active: 'bg-primary-500/20 text-primary-400 border-primary-500/50 ring-2 ring-primary-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    green: {
      active: 'bg-green-500/20 text-green-400 border-green-500/50 ring-2 ring-green-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    amber: {
      active: 'bg-amber-500/20 text-amber-400 border-amber-500/50 ring-2 ring-amber-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    rose: {
      active: 'bg-rose-500/20 text-rose-400 border-rose-500/50 ring-2 ring-rose-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    purple: {
      active: 'bg-purple-500/20 text-purple-400 border-purple-500/50 ring-2 ring-purple-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    lime: {
      active: 'bg-lime-500/20 text-lime-400 border-lime-500/50 ring-2 ring-lime-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    red: {
      active: 'bg-red-500/20 text-red-400 border-red-500/50 ring-2 ring-red-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
    cyan: {
      active: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 ring-2 ring-cyan-500/30',
      inactive: 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300',
    },
  };

  // Active types label
  const activeTypesLabel = useMemo(() => {
    if (activeTabIds.length === dynamicTabs.length) return "All Types";
    if (activeTabIds.length === 0) return "None Selected";
    const activeLabels = dynamicTabs
      .filter(t => activeTabIds.includes(t.id))
      .map(t => t.label);
    if (activeLabels.length <= 2) return activeLabels.join(" & ");
    return `${activeLabels.length} Types`;
  }, [activeTabIds, dynamicTabs]);

  if (isLoading) return <LoadingSkeleton />;

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="space-y-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeViewer/RecipeViewer.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* L5 HEADER - Standard Admin Pattern                                 */}
      {/* ================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Filter Pills + Status Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Book className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Recipe Library</h1>
                <p className="text-gray-400 text-sm">Find and view your kitchen recipes</p>
              </div>
            </div>

            {/* Filter Pills + Status Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider hidden sm:inline">
                Filter
              </span>
              
              {/* All button */}
              <button
                onClick={handleSelectAllTabs}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  activeTabIds.length === dynamicTabs.length
                    ? 'bg-gray-600/30 text-gray-300 border-gray-500/50'
                    : 'bg-gray-800/50 text-gray-500 border-gray-700/50 hover:bg-gray-700/50'
                }`}
              >
                All
              </button>
              
              {/* Type Pills - Multi-select */}
              {dynamicTabs.map((tab) => {
                const count = tabCounts[tab.id] || 0;
                const TabIcon = tab.icon;
                const isActive = activeTabIds.includes(tab.id);
                const colors = colorMap[tab.color] || colorMap.primary;
                const colorClasses = isActive ? colors.active : colors.inactive;
                
                return (
                  <button 
                    key={tab.id}
                    onClick={() => handleTabToggle(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${colorClasses}`}
                    title={`${tab.label} (click to toggle)`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{count}</span>
                    <span className="sm:hidden">{count}</span>
                  </button>
                );
              })}

              {/* Divider + Status Toggle */}
              {canViewAllStatuses && (
                <>
                  <div className="hidden sm:block h-8 w-px bg-gray-700/50 mx-1" />
                  <button
                    onClick={() => setShowAllStatuses(!showAllStatuses)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showAllStatuses
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50"
                    }`}
                    title={showAllStatuses ? "Showing all statuses" : "Showing approved only"}
                  >
                    {showAllStatuses ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="hidden sm:inline">{showAllStatuses ? "All Statuses" : "Approved Only"}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* EXPANDABLE INFO SECTION - Discover/Recently Viewed Carousel    */}
          {/* ============================================================== */}
          {recentRecipes.length > 0 && (
            <div className={`expandable-info-section ${isDiscoverExpanded ? "expanded" : ""}`}>
              <button
                onClick={() => setIsDiscoverExpanded(!isDiscoverExpanded)}
                className="expandable-info-header w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  {hasViewHistory ? (
                    <>
                      <Clock className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-300">Recently Viewed</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-300">Discover Recipes</span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">— Quick navigation</span>
                </div>
                <ChevronUp
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isDiscoverExpanded ? "" : "rotate-180"
                  }`}
                />
              </button>
              <div className="expandable-info-content">
                <div className="p-4 pt-2">
                  {/* Carousel */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                    {recentRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleRecipeClick(recipe.id)}
                        className="flex-shrink-0 w-24 sm:w-28 aspect-[9/16] rounded-xl overflow-hidden bg-gray-800 border border-gray-700/50 hover:border-primary-500/50 relative group snap-start transition-all"
                      >
                        {recipe.media?.find((m) => m.is_primary)?.url ? (
                          <img
                            src={recipe.media.find((m) => m.is_primary)?.url}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                            <ChefHat className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-xs font-medium text-white line-clamp-2 leading-tight">
                            {recipe.name}
                          </p>
                          {recipe.station_name && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                              {recipe.station_name}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Swipe hint on mobile */}
                  <div className="flex justify-center mt-2 sm:hidden">
                    <span className="text-[10px] text-gray-500">← Swipe to browse →</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUBHEADER - Search & Filters                                       */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              {activeTypesLabel}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              ({totalFiltered} recipe{totalFiltered !== 1 ? "s" : ""})
            </span>
            
            {/* Search */}
            <div className="flex items-center gap-2 ml-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-sm bg-gray-900/50 pl-9 w-48 sm:w-64 lg:w-72"
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
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="input-sm bg-gray-900/50"
            >
              <option value="all">All Stations</option>
              {uniqueStations.map((station) => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-sm bg-gray-900/50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="btn-ghost btn-sm">
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
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-primary-500/10 flex items-center justify-center mb-6">
            <Book className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome to Recipe Library</h3>
          <p className="text-gray-400 max-w-md mb-6">
            This is where your team will find standardized recipes. Once recipes are created and approved, they'll appear here.
          </p>
          {canViewAllStatuses && (
            <button onClick={() => navigate('/admin/recipes')} className="btn-primary">
              <ChefHat className="w-4 h-4 mr-2" /> Go to Recipe Manager
            </button>
          )}
        </div>
      ) : displayedRecipes.length > 0 ? (
        <>
          {/* Grid: 1 col mobile, 2 col landscape, 4 col desktop, 5 col 1920+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-[1920px]:grid-cols-5 gap-4 md:hidden lg:grid">
            {displayedRecipes.map((recipe) => (
              <RecipeFlipCard
                key={recipe.id}
                recipe={recipe}
                onViewRecipe={() => handleRecipeClick(recipe.id)}
              />
            ))}
          </div>

          {/* Carousel: Tablet Portrait (md only) */}
          <div className="hidden md:block lg:hidden">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
              {displayedRecipes.map((recipe) => (
                <div key={recipe.id} className="flex-shrink-0 w-[45%] snap-start">
                  <RecipeFlipCard recipe={recipe} onViewRecipe={() => handleRecipeClick(recipe.id)} />
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-2">
              <span className="text-xs text-gray-500">← Swipe to browse →</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
            <Book className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Recipes Found</h3>
          <p className="text-gray-400 max-w-md">
            {hasActiveFilters ? "No recipes match your filters. Try adjusting your selection." : "No approved recipes available."}
          </p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-ghost mt-4">
              <X className="w-4 h-4 mr-1" /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
