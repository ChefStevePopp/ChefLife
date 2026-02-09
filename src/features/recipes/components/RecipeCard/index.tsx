import React, { useMemo, useState } from "react";
import {
  ChefHat,
  Clock,
  Warehouse,
  AlertTriangle,
  Info,
  BookKey,
  BookUser,
  Archive,
  CircleUser,
  FileEdit,
  CheckCircle,
  ImageOff,
  RefreshCw,
  Utensils,
  ChevronDown,
  FolderTree,
  CircleDollarSign,
  Eye,
} from "lucide-react";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { getLucideIcon } from "@/utils/iconMapping";
import { getRecipeConfig } from "@/features/recipes/hooks/useRecipeConfig";
import type { Recipe } from "../../types/recipe";
import { getRecipeAllergenBooleans } from '@/features/allergens/utils';

/**
 * RecipeCard - L5 Design System Compliant
 * 
 * Design decisions:
 * - Section headers use icon-badge pattern (rounded-lg bg-slate-700/50)
 * - All section icons → slate (subtle blue undertone, content-focused)
 * - Allergens → primary (safety callout - the ONE colored element)
 * - Status badge → L5 round badge pattern (w-8 h-8 rounded-full)
 * - Card → rounded-2xl
 * - Empty states: muted italic for missing values, em-dash for optional fields
 */

interface RecipeCardProps {
  recipe: Recipe;
  onViewRecipe: () => void;
  laborRate?: number;
  className?: string;
}

const LABOR_RATE_PER_HOUR = 20;

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onViewRecipe,
  laborRate = LABOR_RATE_PER_HOUR,
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get major group info from Food Relationships for consistent icon/name
  const majorGroups = useFoodRelationshipsStore((state) => state.majorGroups);
  const majorGroup = useMemo(() => {
    if (!recipe.major_group) return null;
    return majorGroups.find((g) => g.id === recipe.major_group);
  }, [recipe.major_group, majorGroups]);
  
  // Dynamic icon from Food Relationships, with fallback
  const GroupIcon = useMemo(() => {
    if (majorGroup?.icon) {
      return getLucideIcon(majorGroup.icon);
    }
    if (recipe.type === "prepared") return ChefHat;
    if (recipe.type === "final") return Utensils;
    return FolderTree;
  }, [majorGroup?.icon, recipe.type]);

  // Get badge duration settings from config
  const recipeConfig = useMemo(() => getRecipeConfig(), []);

  // Calculate if the recipe is new (within configured window)
  const isNew = useMemo(() => {
    if (!recipe.created_at) return false;
    const createdDate = new Date(recipe.created_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recipeConfig.newBadgeDays);
    return createdDate > cutoffDate;
  }, [recipe.created_at, recipeConfig.newBadgeDays]);

  // Calculate if the recipe was recently updated (within configured window)
  const isUpdated = useMemo(() => {
    if (isNew || !recipe.updated_at) return false;
    if (recipe.versions && recipe.versions.length > 1) return true;
    const modifiedDate = new Date(recipe.updated_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recipeConfig.updatedBadgeDays);
    return modifiedDate > cutoffDate;
  }, [isNew, recipe.updated_at, recipe.versions, recipeConfig.updatedBadgeDays]);

  // Find the primary image in the media array
  const primaryMedia = useMemo(
    () => recipe.media?.find((m) => m.is_primary),
    [recipe.media],
  );

  // The image src to display
  const imageSrc = useMemo(() => {
    if (imageError) return null;
    if (primaryMedia?.type === "image" && primaryMedia?.url) {
      return primaryMedia.url;
    }
    if (recipe.image_url) {
      return recipe.image_url;
    }
    return "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=2000&q=80";
  }, [primaryMedia, recipe.image_url, imageError]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalTime = recipe.prep_time + recipe.cook_time;
  const laborCost = (totalTime / 60) * laborRate;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest("[data-no-collapse]")) {
      setIsExpanded(!isExpanded);
    }
  };

  // L5 Status Badge Config
  const getStatusBadge = () => {
    switch (recipe.status) {
      case "approved":
        return {
          bg: "bg-green-500/20",
          icon: CheckCircle,
          iconColor: "text-green-400",
          label: "Approved"
        };
      case "draft":
        return {
          bg: "bg-amber-500/20",
          icon: FileEdit,
          iconColor: "text-amber-400",
          label: "Draft"
        };
      case "review":
        return {
          bg: "bg-gray-500/20",
          icon: Eye,
          iconColor: "text-gray-400",
          label: "Review"
        };
      case "archived":
        return {
          bg: "bg-gray-500/20",
          icon: Archive,
          iconColor: "text-gray-400",
          label: "Archived"
        };
      default:
        return {
          bg: "bg-gray-500/20",
          icon: Info,
          iconColor: "text-gray-400",
          label: "Unknown"
        };
    }
  };

  const statusConfig = recipe.status ? getStatusBadge() : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <div
      onClick={handleCardClick}
      className={`w-full text-left bg-gray-800/50 rounded-2xl transition-all duration-300 
                 shadow-lg relative group overflow-hidden border border-gray-700/50 ${className} cursor-pointer
                 ${isExpanded ? "z-40" : ""}`}
      aria-label={`Recipe card for ${recipe.name}`}
      role="button"
      tabIndex={0}
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden rounded-t-2xl group">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/85 via-gray-900/50 to-transparent z-10" />
        {!imageError && imageSrc ? (
          <img
            src={imageSrc}
            alt={recipe.name}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <ImageOff className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Recipe Type Badge - Icon and name from Food Relationships */}
        <div className="absolute top-4 left-4 z-20">
          <div className="px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 flex items-center gap-2">
            <GroupIcon className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-medium text-gray-300">
              {majorGroup?.name 
                || recipe.major_group_name 
                || (recipe.type === "prepared" ? "Prep Item" 
                  : recipe.type === "final" ? "Final Plate" 
                  : "Receiving Item")}
            </span>
          </div>
        </div>

        {/* NEW Badge - L5 style */}
        {isNew && (
          <div className="absolute top-14 left-4 z-20">
            <div className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">NEW</span>
            </div>
          </div>
        )}

        {/* UPDATED Badge - L5 style */}
        {isUpdated && (
          <div className="absolute top-14 left-4 z-20">
            <div className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">UPDATED</span>
            </div>
          </div>
        )}

        {/* Recipe Status Badge - L5 Round Badge Pattern */}
        {statusConfig && StatusIcon && (
          <div className="absolute top-4 right-4 z-20">
            <div
              className={`w-8 h-8 rounded-full ${statusConfig.bg} flex items-center justify-center`}
              title={`Status: ${statusConfig.label}`}
            >
              <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
            </div>
          </div>
        )}

        {/* Title & Shelf Life */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <h3 className="text-xl font-bold text-white group-hover:text-amber-500 transition-colors">
            {recipe.name}
          </h3>
          {recipe.storage?.shelf_life_duration && (
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-300">
                {recipe.storage.shelf_life_duration} {recipe.storage.shelf_life_unit || "days"}
              </span>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <div className="absolute bottom-2 right-4 z-20">
          <div
            className={`p-1 rounded-full bg-gray-800/80 border border-gray-700 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Content Section - Only visible when expanded */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="p-4 space-y-2">
          {/* Classification - Split into two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Duty Station */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                </span>
                DUTY STATION
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${recipe.station_name ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                  {recipe.station_name || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Recipe Class */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <BookUser className="w-3.5 h-3.5 text-slate-400" />
                </span>
                RECIPE CLASS
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${recipe.sub_category_name ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                  {recipe.sub_category_name || "Uncategorized"}
                </span>
              </div>
            </div>
          </div>

          {/* Storage Info - Split into two columns */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Storage Area */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                </span>
                STORAGE AREA
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${recipe.storage?.primary_area ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                  {recipe.storage?.primary_area || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Storage Container */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                </span>
                STORAGE CONTAINER
              </div>
              <div className="flex items-center gap-2 mt-2">
                {recipe.storage?.container ? (
                  <span className="text-sm text-gray-300">
                    {recipe.storage.container}
                    {recipe.storage.container_type && ` (${recipe.storage.container_type})`}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Recipe Units & Cost - Split into two columns */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Recipe Units */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <BookKey className="w-3.5 h-3.5 text-slate-400" />
                </span>
                RECIPE UNITS
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-300">
                  {recipe.recipe_unit_ratio || "1"}{" "}
                  <span className="text-xs text-gray-400">by</span>{" "}
                  {recipe.unit_type || "unit"}
                </span>
              </div>
            </div>

            {/* Cost */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <CircleDollarSign className="w-3.5 h-3.5 text-slate-400" />
                </span>
                COST PER RU
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-300">
                  {formatCurrency(recipe.cost_per_unit || 0)}
                  <span className="text-xs text-gray-400"> per </span>
                  {recipe.unit_type || "unit"}
                </span>
              </div>
            </div>
          </div>

          {/* Time & Labor - Split into two columns */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Prep Time */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </span>
                PREP TIME
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${totalTime > 0 ? 'text-gray-200' : 'text-gray-500'}`}>
                  {totalTime > 0 ? `${totalTime} mins` : "—"}
                </span>
              </div>
            </div>

            {/* Labor Cost */}
            <div>
              <div className="text-xs font-display font-bold border-t border-gray-700/50 pt-3 text-gray-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <CircleUser className="w-3.5 h-3.5 text-slate-400" />
                </span>
                LABOUR COST
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm ${totalTime > 0 ? 'text-gray-200' : 'text-gray-500'}`}>
                  {totalTime > 0 ? formatCurrency(laborCost) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Allergens - PRIMARY (safety callout - the ONE colored element) */}
          <div className="pt-3 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-primary-400/80" />
              </span>
              <span className="text-xs font-bold font-display text-gray-500">
                DECLARED ALLERGENS
              </span>
            </div>
            {getRecipeAllergenBooleans(recipe).contains.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {getRecipeAllergenBooleans(recipe).contains.map((allergen) => {
                  const allergenKey = allergen.startsWith("allergen_")
                    ? allergen.substring(9)
                    : allergen;
                  const formattedLabel = allergenKey
                    .replace(/_/g, " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                  return (
                    <div
                      key={allergen}
                      className="inline-flex items-center mr-2 mb-1"
                    >
                      <span className="text-xs text-slate-400 px-2 py-1 bg-slate-500/10 rounded-lg border border-slate-500/30">
                        {formattedLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-sm text-gray-500 italic">None Declared</span>
            )}
          </div>
        </div>

        {/* View Recipe Button */}
        <div className="p-4 pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewRecipe();
            }}
            className="w-full flex justify-center px-4 py-2 bg-gray-700/70 hover:bg-primary-800/80 text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium items-center gap-2 relative z-40"
          >
            <Info className="w-4 h-4" />
            View Full Recipe
          </button>
        </div>
      </div>

      {/* Hover/Focus border effect */}
      <div className="absolute inset-0 rounded-2xl border-2 border-primary-500/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
    </div>
  );
};

export default RecipeCard;
