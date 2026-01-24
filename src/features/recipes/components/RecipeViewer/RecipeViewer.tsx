import React, { useState, useEffect, useMemo } from "react";
import {
  ChefHat,
  Search,
  Clock,
  X,
  Loader2,
  Eye,
  EyeOff,
  Info,
  ChevronUp,
  Book,
  Printer,
  Sparkles,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
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
 * RECIPE VIEWER - User-Side Recipe Library (L5)
 * =============================================================================
 * Mobile-first design with L5 desktop layout:
 * - L5 Header with stats
 * - Top tabs for recipe type filtering (from Food Relationships)
 * - Stories-style row for recently viewed
 * - Search bar with filters
 * - Card grid with pagination
 * 
 * Routes: /kitchen/recipes
 * =============================================================================
 */

// ============================================================================
// LOADING SKELETON - 9:16 Portrait Cards
// ============================================================================
const RecipeCardSkeleton: React.FC = () => (
  <div className="aspect-[9/16] bg-gray-800/50 rounded-xl border border-gray-700/50 animate-pulse overflow-hidden">
    {/* Image area */}
    <div className="h-2/3 bg-gray-700/50" />
    {/* Content area */}
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-700/50 rounded w-3/4" />
      <div className="h-3 bg-gray-700/50 rounded w-1/2" />
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-700" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-700/50 rounded w-64" />
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 bg-gray-800 rounded-lg w-16 animate-pulse" />
      ))}
    </div>
    <div className="h-11 bg-gray-800 rounded-lg animate-pulse" />
    
    {/* Grid skeleton: Mobile (1 col), Mobile Landscape (2 col), Desktop (4-5 col) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:hidden lg:grid">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Carousel skeleton: Tablet Portrait only */}
    <div className="hidden md:flex lg:hidden gap-4 overflow-x-auto pb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-shrink-0 w-[45%]">
          <RecipeCardSkeleton />
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 10; // 5 columns × 2 rows for flip card grid on 4K
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

// Saved preferences interface
interface ViewerPrefs {
  activeTabId?: string | null;
  searchTerm?: string;
  stationFilter?: string;
  sortBy?: SortOption;
  showAllStatuses?: boolean;
}

// Load preferences from localStorage
function loadPrefs(): ViewerPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // localStorage not available or parse error
  }
  return {};
}

// Save preferences to localStorage
function savePrefs(prefs: ViewerPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    // localStorage not available
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const RecipeViewer: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { securityLevel } = useAuth();
  const navigate = useNavigate();
  
  // ---------------------------------------------------------------------------
  // PERMISSIONS
  // ---------------------------------------------------------------------------
  // Omega, Alpha, Bravo, Charlie can toggle to see all statuses
  // Delta, Echo only see approved recipes
  const canViewAllStatuses = securityLevel <= SECURITY_LEVELS.CHARLIE;
  
  // ---------------------------------------------------------------------------
  // LOAD SAVED PREFERENCES
  // ---------------------------------------------------------------------------
  const savedPrefs = useMemo(() => loadPrefs(), []);
  
  // ---------------------------------------------------------------------------
  // STATE (initialized from localStorage)
  // ---------------------------------------------------------------------------
  const [activeTabId, setActiveTabId] = useState<string | null>(savedPrefs.activeTabId ?? null);
  const [searchTerm, setSearchTerm] = useState(savedPrefs.searchTerm ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(savedPrefs.showAllStatuses ?? false);
  
  // Filters & Pagination
  const [stationFilter, setStationFilter] = useState<string>(savedPrefs.stationFilter ?? "all");
  const [sortBy, setSortBy] = useState<SortOption>(savedPrefs.sortBy ?? "name");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // ---------------------------------------------------------------------------
  // STORES
  // ---------------------------------------------------------------------------
  const { recipes, fetchRecipes } = useRecipeStore();
  const { getRecipeTypeGroups, fetchFoodRelationships } = useFoodRelationshipsStore();
  const recipeTypeGroups = getRecipeTypeGroups();

  // Build dynamic tabs
  const dynamicTabs = useMemo(() => {
    return recipeTypeGroups.map((group, index) => ({
      id: group.id,
      label: group.name,
      icon: getLucideIcon(group.icon),
      color: TAB_COLORS[index % TAB_COLORS.length],
      legacyType: getLegacyType(group.name),
    }));
  }, [recipeTypeGroups]);

  const activeTab = useMemo(() => {
    return dynamicTabs.find(tab => tab.id === activeTabId) || dynamicTabs[0] || null;
  }, [dynamicTabs, activeTabId]);

  // ---------------------------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchRecipes(),
          fetchFoodRelationships(),
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load recipes");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchRecipes, fetchFoodRelationships]);

  // Set initial tab (only if not loaded from prefs)
  useEffect(() => {
    if (dynamicTabs.length > 0 && !activeTabId) {
      setActiveTabId(dynamicTabs[0].id);
    }
  }, [dynamicTabs, activeTabId]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    // Don't save during initial load
    if (isLoading) return;
    
    savePrefs({
      activeTabId,
      searchTerm: debouncedSearch, // Use debounced to avoid saving every keystroke
      stationFilter,
      sortBy,
      showAllStatuses,
    });
  }, [activeTabId, debouncedSearch, stationFilter, sortBy, showAllStatuses, isLoading]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTabId, stationFilter, sortBy, showAllStatuses]);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------
  
  // Unique stations
  const uniqueStations = useMemo(() => {
    const stations = new Set<string>();
    recipes.forEach((r) => {
      if (r.station) stations.add(r.station);
      if (r.primary_station) stations.add(r.primary_station);
    });
    return Array.from(stations).sort();
  }, [recipes]);

  // Filter, sort, paginate
  const { displayedRecipes, totalFiltered, totalPages } = useMemo(() => {
    if (!activeTab) {
      return { displayedRecipes: [], totalFiltered: 0, totalPages: 0 };
    }

    // Filter by tab
    let filtered = recipes.filter((recipe) => {
      if (recipe.major_group === activeTab.id) return true;
      if (activeTab.legacyType && recipe.type === activeTab.legacyType) return true;
      return false;
    });

    // Status filter based on permissions
    filtered = filtered.filter((recipe) => {
      if (canViewAllStatuses && showAllStatuses) {
        return recipe.status !== "archived";
      }
      return recipe.status === "approved";
    });

    // Search
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((recipe) =>
        recipe.name?.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.station?.toLowerCase().includes(searchLower)
      );
    }

    // Station filter
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
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        case "station":
          return (a.station || "").localeCompare(b.station || "");
        default:
          return 0;
      }
    });

    const totalFiltered = sorted.length;
    const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedRecipes = sorted.slice(start, start + ITEMS_PER_PAGE);

    return { displayedRecipes, totalFiltered, totalPages };
  }, [recipes, activeTab, debouncedSearch, stationFilter, sortBy, currentPage, canViewAllStatuses, showAllStatuses]);

  // Recently viewed recipes (from localStorage) or random if no history
  const { recentRecipes, hasViewHistory } = useMemo(() => {
    let viewedIds: string[] = [];
    
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_KEY);
      if (stored) {
        viewedIds = JSON.parse(stored);
      }
    } catch (e) {
      // localStorage not available or parse error
    }
    
    const approvedRecipes = recipes.filter((r) => r.status === "approved");
    
    if (viewedIds.length > 0) {
      // Return recipes in view history order
      const viewed = viewedIds
        .map((id) => approvedRecipes.find((r) => r.id === id))
        .filter(Boolean) as Recipe[];
      
      if (viewed.length > 0) {
        return { recentRecipes: viewed.slice(0, 8), hasViewHistory: true };
      }
    }
    
    // No history - return random selection
    const shuffled = [...approvedRecipes].sort(() => Math.random() - 0.5);
    return { recentRecipes: shuffled.slice(0, 8), hasViewHistory: false };
  }, [recipes]);

  // Counts per tab (approved only for display)
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

  const hasActiveFilters = searchTerm || stationFilter !== "all";

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleRecipeClick = (recipeId: string) => {
    // Save to view history
    try {
      const stored = localStorage.getItem(VIEW_HISTORY_KEY);
      let viewedIds: string[] = stored ? JSON.parse(stored) : [];
      
      // Remove if already exists (to move to front)
      viewedIds = viewedIds.filter((id) => id !== recipeId);
      // Add to front
      viewedIds.unshift(recipeId);
      // Keep only last 20
      viewedIds = viewedIds.slice(0, 20);
      
      localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(viewedIds));
    } catch (e) {
      // localStorage not available
    }
    
    navigate(`/kitchen/recipes/${recipeId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStationFilter("all");
    // Note: Sort and Tab are intentionally preserved when clearing filters
  };

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    setCurrentPage(1);
  };

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeViewer/RecipeViewer.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* L5 HEADER                                                          */}
      {/* ================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Stats + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Book className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Recipe Library
                </h1>
                <p className="text-gray-400 text-sm">
                  Find and view your kitchen recipes
                </p>
              </div>
            </div>

            {/* Stats Pills (clickable filters) + Status Toggle */}
            <div className="flex items-center gap-2">
              {/* Filter Label */}
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider hidden sm:inline">
                Filter
              </span>
              
              {/* Recipe Type Pills - Clickable Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {dynamicTabs.map((tab) => {
                  const count = tabCounts[tab.id] || 0;
                  const TabIcon = tab.icon;
                  const isActive = activeTab?.id === tab.id;
                  
                  // Active state uses the tab's color, inactive is muted
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
                  const colors = colorMap[tab.color] || colorMap.primary;
                  const colorClasses = isActive ? colors.active : colors.inactive;
                  
                  return (
                    <button 
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${colorClasses}`}
                      title={tab.label}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{count}</span>
                      <span className="sm:hidden">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              {canViewAllStatuses && (
                <div className="hidden sm:block h-8 w-px bg-gray-700/50 mx-1" />
              )}

              {/* Status Toggle - Only for Omega/Alpha/Bravo/Charlie */}
              {canViewAllStatuses && (
                <button
                  onClick={() => setShowAllStatuses(!showAllStatuses)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showAllStatuses
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50"
                  }`}
                  title={showAllStatuses ? "Showing all statuses" : "Showing approved only"}
                >
                  {showAllStatuses ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">All Statuses</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Approved Only</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Recipe Library
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
                  Browse and access your kitchen's standardized recipes. Use the tabs to filter by recipe type,
                  or search to find specific recipes quickly.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="subheader-feature-card">
                    <Search className="w-4 h-4 text-primary-400/80" />
                    <div>
                      <span className="subheader-feature-title text-white">Quick Search</span>
                      <p className="subheader-feature-desc">Find recipes by name, description, or station</p>
                    </div>
                  </div>
                  <div className="subheader-feature-card">
                    <Printer className="w-4 h-4 text-green-400/80" />
                    <div>
                      <span className="subheader-feature-title text-white">Print Ready</span>
                      <p className="subheader-feature-desc">Open any recipe and print for the line</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEARCH & FILTERS                                                   */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              {activeTab?.label || "Recipes"}
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
              <button onClick={handleClearFilters} className="btn-ghost btn-sm">
                <X className="w-4 h-4 mr-1.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* RECENTLY VIEWED / DISCOVER - Portrait Cards                        */}
      {/* ================================================================== */}
      {!searchTerm && recentRecipes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {hasViewHistory ? (
              <>
                <Clock className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-medium text-gray-400">Recently Viewed</h2>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-medium text-gray-400">Discover Recipes</h2>
              </>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handleRecipeClick(recipe.id)}
                className="flex-shrink-0 group relative focus:outline-none"
              >
                {/* 9:16 Portrait Card */}
                <div className="w-28 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden bg-gray-800 border border-gray-700/50 transition-all group-hover:border-primary-500/50 group-focus:ring-2 group-focus:ring-primary-500/50 group-focus:ring-offset-2 group-focus:ring-offset-gray-900">
                  {/* Image */}
                  <div className="absolute inset-0">
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
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                  
                  {/* Content at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-xs font-medium text-white line-clamp-2 leading-tight">
                      {recipe.name}
                    </p>
                    {recipe.station_name && (
                      <p className="text-[10px] text-gray-400 mt-1 truncate">
                        {recipe.station_name}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RECIPE GRID or EMPTY STATE                                         */}
      {/* ================================================================== */}
      {recipes.length === 0 ? (
        // Full empty state - no recipes exist at all
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-primary-500/10 flex items-center justify-center mb-6">
            <Book className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Welcome to Recipe Library
          </h3>
          <p className="text-gray-400 max-w-md mb-6">
            This is where your team will find standardized recipes. Once recipes are created and approved, they'll appear here for easy access.
          </p>
          {canViewAllStatuses && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Get started by creating recipes in Recipe Manager
              </p>
              <button
                onClick={() => navigate('/admin/recipes')}
                className="btn-primary"
              >
                <ChefHat className="w-4 h-4 mr-2" />
                Go to Recipe Manager
              </button>
            </div>
          )}
          {!canViewAllStatuses && (
            <p className="text-sm text-gray-500">
              Check back soon — your kitchen manager is building the recipe collection.
            </p>
          )}
        </div>
      ) : displayedRecipes.length > 0 ? (
        <>
          {/* Grid Layout: Mobile Portrait (1 col), Mobile Landscape (2 col), Desktop (4-5 col) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:hidden lg:grid">
            {displayedRecipes.map((recipe) => (
              <RecipeFlipCard
                key={recipe.id}
                recipe={recipe}
                onViewRecipe={() => handleRecipeClick(recipe.id)}
              />
            ))}
          </div>

          {/* Carousel Layout: Tablet Portrait only (md breakpoint) */}
          <div className="hidden md:block lg:hidden">
            <div 
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin"
              style={{ scrollPaddingLeft: '1rem' }}
            >
              {displayedRecipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className="flex-shrink-0 w-[45%] snap-start"
                >
                  <RecipeFlipCard
                    recipe={recipe}
                    onViewRecipe={() => handleRecipeClick(recipe.id)}
                  />
                </div>
              ))}
            </div>
            {/* Scroll hint */}
            <div className="flex justify-center mt-2">
              <span className="text-xs text-gray-500">← Swipe to browse →</span>
            </div>
          </div>
        </>
      ) : (
        // Filtered empty state - recipes exist but none match current filters
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
            {activeTab ? (
              (() => {
                const TabIcon = activeTab.icon;
                return <TabIcon className="w-8 h-8 text-gray-600" />;
              })()
            ) : (
              <Book className="w-8 h-8 text-gray-600" />
            )}
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No Recipes Found
          </h3>
          <p className="text-gray-400 max-w-md">
            {hasActiveFilters
              ? "No recipes match your current filters. Try adjusting your search."
              : `No approved recipes available in ${activeTab?.label || "this category"}.`}
          </p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-ghost mt-6">
              <X className="w-4 h-4 mr-1.5" />
              Clear Filters
            </button>
          )}
        </div>
      )}

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
    </div>
  );
};
