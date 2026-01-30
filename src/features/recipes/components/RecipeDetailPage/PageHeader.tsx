import React, { useState, useMemo } from "react";
import {
  ChefHat,
  Utensils,
  FolderTree,
  FileEdit,
  CheckCircle,
  Archive,
  Eye,
  Camera,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  HelpCircle,
  Book,
  ImageOff,
  DollarSign,
  Scale,
  Beaker,
} from "lucide-react";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getLucideIcon } from "@/utils/iconMapping";
import { differenceInWeeks, differenceInDays } from "date-fns";
import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * PAGE HEADER - Recipe Detail (L5)
 * =============================================================================
 * Hero banner style matching RecipeCardL5:
 * - Full-width image with gradient overlay
 * - Type badge top-left, status badge top-right
 * - Title + subtitle + station overlaid at bottom
 * - Stats row below hero: Cost, Yield, Recipe Units
 * - Expandable Recipe Details section for editing
 * =============================================================================
 */

interface PageHeaderProps {
  recipe: Recipe | Omit<Recipe, "id">;
  isNew: boolean;
  hasUnsavedChanges: boolean;
  onBack: () => void;
  onChange: (updates: Partial<Recipe>) => void;
  onNavigateToTab?: (tabId: string) => void;
  backLabel: string;
}

// ---------------------------------------------------------------------------
// COMPLETION STATUS
// ---------------------------------------------------------------------------
const REQUIRED_FIELDS = [
  { key: "name", label: "Recipe name" },
  { key: "type", label: "Recipe type" },
  { key: "major_group", label: "Major group" },
  { key: "yield_amount", label: "Yield amount", check: (r: Recipe) => r.yield_amount > 0 },
  { key: "yield_unit", label: "Yield unit" },
  { key: "ingredients", label: "At least one ingredient", check: (r: Recipe) => (r.ingredients?.length || 0) > 0 },
  { key: "steps", label: "At least one step", check: (r: Recipe) => (r.steps?.length || 0) > 0 },
] as const;

const getCompletionStatus = (data: Recipe | Omit<Recipe, "id">) => {
  const filledFields = REQUIRED_FIELDS.filter(({ key, check }) => {
    if (check) return check(data as Recipe);
    const value = data[key as keyof typeof data];
    return value !== null && value !== undefined && value !== "" && value !== 0;
  });

  const percentage = Math.round((filledFields.length / REQUIRED_FIELDS.length) * 100);
  const missingFields = REQUIRED_FIELDS.filter(({ key, check }) => {
    if (check) return !check(data as Recipe);
    const value = data[key as keyof typeof data];
    return value === null || value === undefined || value === "" || value === 0;
  });

  if (percentage === 100) {
    return {
      label: "Complete",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      percentage,
      missingFields: [],
    };
  } else if (percentage >= 50) {
    return {
      label: "In Progress",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      percentage,
      missingFields,
    };
  } else {
    return {
      label: "Draft",
      color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      percentage,
      missingFields,
    };
  }
};

// ---------------------------------------------------------------------------
// REVIEW STATUS (Freshness Indicator)
// ---------------------------------------------------------------------------
const getReviewStatus = (updatedAt: string | undefined) => {
  if (!updatedAt) return null;

  const weeksElapsed = differenceInWeeks(new Date(), new Date(updatedAt));
  const daysElapsed = differenceInDays(new Date(), new Date(updatedAt));

  const filledBubbles = Math.min(Math.floor(weeksElapsed / 2), 4);

  let status: "fresh" | "ok" | "stale" | "overdue";
  let color: string;
  let label: string;

  if (weeksElapsed < 2) {
    status = "fresh";
    color = "text-emerald-400";
    label = daysElapsed === 0 ? "Today" : `${daysElapsed}d`;
  } else if (weeksElapsed < 4) {
    status = "ok";
    color = "text-emerald-400";
    label = `${weeksElapsed}w`;
  } else if (weeksElapsed < 6) {
    status = "stale";
    color = "text-amber-400";
    label = `${weeksElapsed}w`;
  } else {
    status = "overdue";
    color = "text-rose-400";
    label = `${weeksElapsed}w`;
  }

  return { filledBubbles, status, color, label, weeksElapsed };
};

// ---------------------------------------------------------------------------
// STATUS CONFIG
// ---------------------------------------------------------------------------
const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        icon: CheckCircle,
        label: "Approved",
      };
    case "draft":
      return {
        bg: "bg-amber-500/20",
        border: "border-amber-500/30",
        text: "text-amber-400",
        icon: FileEdit,
        label: "Draft",
      };
    case "review":
      return {
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        text: "text-blue-400",
        icon: Eye,
        label: "In Review",
      };
    case "archived":
      return {
        bg: "bg-gray-500/20",
        border: "border-gray-500/30",
        text: "text-gray-400",
        icon: Archive,
        label: "Archived",
      };
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export const PageHeader: React.FC<PageHeaderProps> = ({
  recipe,
  isNew,
  hasUnsavedChanges,
  onBack,
  onChange,
  onNavigateToTab,
  backLabel,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(isNew);
  const [imageError, setImageError] = useState(false);

  // Get major group info from Food Relationships
  const { majorGroups, categories, subCategories, fetchFoodRelationships, getRecipeTypeGroups } = useFoodRelationshipsStore();
  const recipeTypeGroups = getRecipeTypeGroups();

  // Fetch on mount if needed
  React.useEffect(() => {
    if (majorGroups.length === 0) {
      fetchFoodRelationships();
    }
  }, [majorGroups.length, fetchFoodRelationships]);

  const majorGroup = useMemo(() => {
    if (!recipe.major_group) return null;
    return majorGroups.find((g) => g.id === recipe.major_group);
  }, [recipe.major_group, majorGroups]);

  const category = useMemo(() => {
    if (!recipe.category) return null;
    return categories.find((c) => c.id === recipe.category);
  }, [recipe.category, categories]);

  // Dynamic icon based on major group or recipe type
  const GroupIcon = useMemo(() => {
    if (majorGroup?.icon) {
      return getLucideIcon(majorGroup.icon);
    }
    if (recipe.type === "prepared") return ChefHat;
    if (recipe.type === "final") return Utensils;
    return FolderTree;
  }, [majorGroup?.icon, recipe.type]);

  // Primary image from media array
  const primaryImage = useMemo(() => {
    if (imageError) return null;
    const primaryMedia = recipe.media?.find((m) => m.is_primary && m.type === "image");
    return primaryMedia?.url || null;
  }, [recipe.media, imageError]);

  // Status calculations
  const completionStatus = getCompletionStatus(recipe);
  const reviewStatus = !isNew && "updated_at" in recipe ? getReviewStatus(recipe.updated_at) : null;
  const statusConfig = recipe.status ? getStatusConfig(recipe.status) : null;
  const StatusIcon = statusConfig?.icon;

  // Categories filtered by selected major group (recipe type)
  const filteredCategories = useMemo(() => {
    if (!recipe.major_group) return [];
    return categories.filter((c) => c.group_id === recipe.major_group && !c.archived);
  }, [recipe.major_group, categories]);

  // Sub-categories filtered by selected category
  const filteredSubCategories = useMemo(() => {
    if (!recipe.category) return [];
    return subCategories.filter((s) => s.category_id === recipe.category && !s.archived);
  }, [recipe.category, subCategories]);

  // Recipe type display name - use major_group name if it's a recipe type group
  const recipeTypeDisplay = useMemo(() => {
    // First check if major_group matches a recipe type group
    if (recipe.major_group) {
      const typeGroup = recipeTypeGroups.find(g => g.id === recipe.major_group);
      if (typeGroup) return typeGroup.name;
    }
    // Fallback to legacy type field
    if (recipe.type === "prepared") return "Prep Item";
    if (recipe.type === "final") return "Final Plate";
    if (recipe.type === "component") return "Component";
    return "Recipe";
  }, [recipe.major_group, recipe.type, recipeTypeGroups]);

  // Major group display name (for badge)
  const majorGroupName = majorGroup?.name || recipeTypeDisplay;

  // Subtitle line: Type • Category • Station
  const subtitleParts = [
    recipeTypeDisplay,
    category?.name,
    recipe.station,
  ].filter(Boolean);
  const subtitleLine = subtitleParts.join(" • ");

  // ---------------------------------------------------------------------------
  // COST CALCULATIONS (for stats row)
  // ---------------------------------------------------------------------------
  const calculatedTotal = useMemo(() => {
    return recipe.ingredients?.reduce((sum, ingredient) => {
      const quantity = typeof ingredient.quantity === 'number' 
        ? ingredient.quantity 
        : parseFloat(ingredient.quantity as string) || 0;
      const cost = ingredient.cost_per_unit || ingredient.cost || 0;
      return sum + (quantity * cost);
    }, 0) || 0;
  }, [recipe.ingredients]);

  const totalCost = recipe.total_cost || calculatedTotal;
  const recipeUnits = parseFloat(recipe.recipe_unit_ratio || "0") || 0;
  const recipeUnitType = recipe.unit_type || "";
  const costPerUnit = recipe.cost_per_unit || (recipeUnits > 0 ? totalCost / recipeUnits : 0);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="bg-[#1a1f2b] rounded-xl shadow-lg mb-6 overflow-hidden">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono p-2 pb-0">
          src/features/recipes/components/RecipeDetailPage/PageHeader.tsx
        </div>
      )}

      {/* ===================================================================
       * HERO BANNER - Responsive height based on screen size
       * =================================================================== */}
      <button
        onClick={() => onNavigateToTab?.("media")}
        className="relative w-full h-32 sm:h-36 md:h-40 lg:h-48 xl:h-56 2xl:h-64 overflow-hidden group cursor-pointer"
        title={primaryImage ? "Edit in Media tab" : "Add recipe photo"}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-gray-900/30 z-10" />

        {/* Background Image or Placeholder */}
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={recipe.name || "Recipe"}
            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-gray-500 transition-colors">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">Click to add photo</span>
            </div>
          </div>
        )}

        {/* Hover overlay with camera icon */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
          <div className="px-4 py-2 rounded-lg bg-black/60 flex items-center gap-2">
            <Camera className="w-5 h-5 text-white" />
            <span className="text-sm text-white font-medium">
              {primaryImage ? "Change Photo" : "Add Photo"}
            </span>
          </div>
        </div>

        {/* Top Left: Recipe Type Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30">
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gray-900/90 border border-gray-700 flex items-center gap-1.5 sm:gap-2">
            <GroupIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-gray-300">{majorGroupName}</span>
          </div>
        </div>

        {/* Top Right: Status Badge */}
        {statusConfig && StatusIcon && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center`}
              title={`Status: ${statusConfig.label}`}
            >
              <StatusIcon className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${statusConfig.text}`} />
            </div>
          </div>
        )}

        {/* Center: Title + Subtitle (vertically and horizontally centered) */}
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center px-4">
            <h1 className="font-display text-fluid-2xl sm:text-fluid-3xl lg:text-fluid-4xl font-bold text-white group-hover:text-primary-300 transition-colors drop-shadow-lg">
              {recipe.name || (isNew ? "New Recipe" : "Untitled Recipe")}
            </h1>
            {subtitleLine && (
              <p className="font-body text-fluid-sm sm:text-fluid-base text-gray-300/90 mt-1 drop-shadow-md">
                {subtitleLine}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Left: Stats Badges - Cost, R/U Cost, Recipe Units */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 lg:bottom-5 lg:left-5 xl:bottom-6 xl:left-6 flex items-center gap-1.5 sm:gap-2 z-30">
          {/* Total Cost */}
          {totalCost > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-900/80 text-gray-300 border border-gray-700 text-xs font-medium backdrop-blur-sm">
              <DollarSign className="w-3 h-3 text-gray-500" />
              <span>{formatCurrency(totalCost)}</span>
            </div>
          )}

          {/* R/U Cost - hidden on mobile */}
          {costPerUnit > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-900/80 text-gray-300 border border-gray-700 text-xs font-medium backdrop-blur-sm">
              <span className="text-gray-500 text-[10px] font-medium">R/U</span>
              <span>{formatCurrency(costPerUnit)}</span>
            </div>
          )}

          {/* Recipe Units - hidden on mobile/tablet */}
          {recipeUnits > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-900/80 text-gray-300 border border-gray-700 text-xs font-medium backdrop-blur-sm">
              <Beaker className="w-3 h-3 text-gray-500" />
              <span>{recipeUnits.toLocaleString()} {recipeUnitType}</span>
            </div>
          )}
        </div>

        {/* Bottom Right: Status Badges - Completion, Version, Freshness */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 lg:bottom-5 lg:right-5 xl:bottom-6 xl:right-6 flex items-center gap-1.5 sm:gap-2 z-30">
            {/* Completion - always visible */}
            <div className="group/tooltip relative">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${completionStatus.color}`}
              >
                {completionStatus.percentage === 100 ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <span>{completionStatus.percentage}%</span>
                )}
              </div>

              {/* Tooltip */}
              {completionStatus.missingFields.length > 0 && (
                <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-40 min-w-[180px] border border-gray-700">
                  <div className="text-xs font-medium text-gray-400 mb-2">Missing:</div>
                  <ul className="space-y-1">
                    {completionStatus.missingFields.map(({ label }) => (
                      <li key={label} className="text-xs text-gray-300 flex items-center gap-2">
                        <Circle className="w-1.5 h-1.5 text-amber-400" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Version - hidden on mobile */}
            {recipe.version && (
              <div className="hidden sm:flex px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium backdrop-blur-sm">
                v{recipe.version}
              </div>
            )}

            {/* Freshness - hidden on mobile/tablet */}
            {reviewStatus && (
              <div className="hidden lg:flex group/tooltip relative items-center gap-1.5 px-2 py-1 rounded-full bg-gray-900/80 border border-gray-700 backdrop-blur-sm">
                <Clock className="w-3 h-3 text-gray-500" />
                <div className="flex items-center gap-0.5">
                  {[...Array(4)].map((_, index) => {
                    let bubbleColor = "text-gray-700";
                    if (index < reviewStatus.filledBubbles) {
                      if (reviewStatus.filledBubbles <= 1) bubbleColor = "text-emerald-400";
                      else if (reviewStatus.filledBubbles === 2) bubbleColor = "text-amber-400";
                      else bubbleColor = "text-rose-400";
                    }
                    return (
                      <Circle
                        key={index}
                        className={`w-2 h-2 ${bubbleColor} ${index < reviewStatus.filledBubbles ? "fill-current" : ""}`}
                      />
                    );
                  })}
                </div>
                <span className={`text-xs ${reviewStatus.color}`}>{reviewStatus.label}</span>

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-40 whitespace-nowrap border border-gray-700">
                  <div className="text-xs text-gray-300">
                    {reviewStatus.status === "fresh" && "Recently updated"}
                    {reviewStatus.status === "ok" && "Updated within the last month"}
                    {reviewStatus.status === "stale" && "Consider reviewing this recipe"}
                    {reviewStatus.status === "overdue" && "Needs review"}
                  </div>
                </div>
              </div>
            )}

            {/* Unsaved - compact on mobile */}
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 backdrop-blur-sm">
                <Circle className="w-1.5 h-1.5 fill-current" />
                <span className="hidden sm:inline">Unsaved</span>
              </span>
            )}
        </div>
      </button>

      {/* ===================================================================
       * EXPANDABLE: Recipe Details (Editing form)
       * =================================================================== */}
      <div className="border-t border-gray-700/50">
        <button
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Book className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-300">Recipe Details</h2>
              <span className="text-xs text-gray-500">Name, type, yield, station, description</span>
            </div>
          </div>
          <div className="group relative" onClick={(e) => e.stopPropagation()}>
            <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 border border-gray-700">
              <p className="text-xs text-gray-300 leading-relaxed">
                Core identity and configuration for this recipe. Expand to edit name, type, yield, and other details.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDetailsExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {isDetailsExpanded && (
          <div className="border-t border-gray-700/50">
            <div className="px-4 py-4 bg-gray-800/30 space-y-4">
              {/* Row 1: Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Recipe Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={recipe.name || ""}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="e.g., Memphis Dry Rub Ribs"
                  className="input w-full"
                />
              </div>

              {/* Row 2: Recipe Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Recipe Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={recipe.major_group || ""}
                    onChange={(e) => {
                      const selectedGroup = recipeTypeGroups.find(g => g.id === e.target.value);
                      // Map to legacy type for backward compatibility
                      let legacyType: Recipe["type"] = "prepared";
                      if (selectedGroup) {
                        const name = selectedGroup.name.toUpperCase();
                        if (name.includes("FINAL")) legacyType = "final";
                        else if (name.includes("COMPONENT")) legacyType = "component";
                      }
                      onChange({
                        major_group: e.target.value || undefined,
                        type: legacyType,
                        category: undefined,
                        sub_category: undefined,
                      });
                    }}
                    className="input w-full"
                  >
                    <option value="">Select type...</option>
                    {recipeTypeGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={recipe.category || ""}
                    onChange={(e) => onChange({ 
                      category: e.target.value || undefined,
                      sub_category: undefined,
                    })}
                    className="input w-full"
                    disabled={!recipe.major_group}
                  >
                    <option value="">
                      {recipe.major_group ? "Select category..." : "Select type first"}
                    </option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Sub Category & Station */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Sub Category
                  </label>
                  <select
                    value={recipe.sub_category || ""}
                    onChange={(e) => onChange({ sub_category: e.target.value || undefined })}
                    className="input w-full"
                    disabled={!recipe.category}
                  >
                    <option value="">
                      {recipe.category ? "Select sub-category..." : "Select category first"}
                    </option>
                    {filteredSubCategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Station
                  </label>
                  <input
                    type="text"
                    value={recipe.station || ""}
                    onChange={(e) => onChange({ station: e.target.value })}
                    placeholder="e.g., Grill, Prep, Sauté"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Row 4: Yield Amount & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Yield Amount <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={recipe.yield_amount || ""}
                    onChange={(e) =>
                      onChange({ yield_amount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="e.g., 12"
                    min="0"
                    step="0.25"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Yield Unit <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipe.yield_unit || ""}
                    onChange={(e) => onChange({ yield_unit: e.target.value })}
                    placeholder="e.g., portions, oz, each"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Row 5: Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={recipe.description || ""}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder="Brief description of this recipe, its purpose, or special notes..."
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
