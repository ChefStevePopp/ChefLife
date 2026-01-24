import React, { useState, useMemo } from "react";
import {
  ChefHat,
  Clock,
  AlertTriangle,
  Utensils,
  FolderTree,
  RefreshCw,
  Sparkles,
  Eye,
  CheckCircle,
  FileEdit,
  Archive,
  Warehouse,
  BookUser,
  Info,
} from "lucide-react";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { getLucideIcon } from "@/utils/iconMapping";
import { getRecipeConfig } from "@/features/recipes/hooks/useRecipeConfig";
import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * RECIPE FLIP CARD - Premium 9:16 Portrait Card with 3D Flip
 * =============================================================================
 * 
 * PREMIUM ANIMATION STANDARDS (from L5-BUILD-STRATEGY.md):
 * - 500ms flip duration (quick but premium)
 * - Ease-out cubic for natural deceleration
 * - Subtle shadow shift during flip (3D depth)
 * - Hover trigger (desktop) / Tap toggle (mobile)
 * 
 * Philosophy: "So smooth you're genuinely not sure if it changed"
 * 
 * FRONT: Image, type badge, name, station, NEW/UPDATED badges
 * BACK: Station, Class, Storage, Shelf Life, Allergens (styled like admin RecipeCard)
 * =============================================================================
 */

interface RecipeFlipCardProps {
  recipe: Recipe;
  onViewRecipe: () => void;
  className?: string;
}

export const RecipeFlipCard: React.FC<RecipeFlipCardProps> = ({
  recipe,
  onViewRecipe,
  className = "",
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get major group info from Food Relationships
  const majorGroups = useFoodRelationshipsStore((state) => state.majorGroups);
  const majorGroup = useMemo(() => {
    if (!recipe.major_group) return null;
    return majorGroups.find((g) => g.id === recipe.major_group);
  }, [recipe.major_group, majorGroups]);

  // Dynamic icon from Food Relationships
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

  // Calculate NEW badge
  const isNew = useMemo(() => {
    if (!recipe.created_at) return false;
    const createdDate = new Date(recipe.created_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recipeConfig.newBadgeDays);
    return createdDate > cutoffDate;
  }, [recipe.created_at, recipeConfig.newBadgeDays]);

  // Calculate UPDATED badge
  const isUpdated = useMemo(() => {
    if (isNew || !recipe.updated_at) return false;
    const modifiedDate = new Date(recipe.updated_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recipeConfig.updatedBadgeDays);
    return modifiedDate > cutoffDate;
  }, [isNew, recipe.updated_at, recipeConfig.updatedBadgeDays]);

  // Primary image
  const imageSrc = useMemo(() => {
    if (imageError) return null;
    const primaryMedia = recipe.media?.find((m) => m.is_primary);
    if (primaryMedia?.type === "image" && primaryMedia?.url) {
      return primaryMedia.url;
    }
    if (recipe.image_url) {
      return recipe.image_url;
    }
    return null;
  }, [recipe.media, recipe.image_url, imageError]);

  // Type label
  const typeLabel = useMemo(() => {
    return (
      majorGroup?.name ||
      recipe.major_group_name ||
      (recipe.type === "prepared" ? "Prep Item" : recipe.type === "final" ? "Final Plate" : "Item")
    );
  }, [majorGroup?.name, recipe.major_group_name, recipe.type]);

  // ALL allergens - food safety, no truncation!
  const allergenList = useMemo(() => {
    const allergens = recipe.allergenInfo?.contains || [];
    if (allergens.length === 0) return null;
    return allergens.map((a) => {
      const key = a.startsWith("allergen_") ? a.substring(9) : a;
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
    });
  }, [recipe.allergenInfo]);

  // Status config
  const statusConfig = useMemo(() => {
    switch (recipe.status) {
      case "approved":
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Approved" };
      case "draft":
        return { icon: FileEdit, color: "text-amber-400", bg: "bg-amber-500/20", label: "Draft" };
      case "review":
        return { icon: Eye, color: "text-gray-400", bg: "bg-gray-500/20", label: "Review" };
      case "archived":
        return { icon: Archive, color: "text-gray-400", bg: "bg-gray-500/20", label: "Archived" };
      default:
        return null;
    }
  }, [recipe.status]);

  // Handle flip - tap on mobile, hover managed via CSS on desktop
  const handleTap = () => {
    setIsFlipped(!isFlipped);
  };

  // Handle view recipe - stop propagation so flip doesn't trigger
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewRecipe();
  };

  const StatusIcon = statusConfig?.icon;

  return (
    <div
      className={`group perspective-1000 ${className}`}
      style={{ perspective: "1000px" }}
    >
      {/* Card Container - 9:16 aspect ratio */}
      <div
        onClick={handleTap}
        className={`
          relative w-full aspect-[9/16] cursor-pointer
          transition-transform duration-500 ease-out
          transform-style-preserve-3d
          ${isFlipped ? "[transform:rotateY(180deg)]" : ""}
          group-hover:[transform:rotateY(180deg)]
        `}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 500ms cubic-bezier(0.33, 1, 0.68, 1)",
        }}
      >
        {/* ================================================================ */}
        {/* FRONT FACE                                                       */}
        {/* ================================================================ */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={recipe.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <ChefHat className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />

          {/* Type Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <div className="px-2.5 py-1 rounded-full bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 flex items-center gap-1.5">
              <GroupIcon className="w-3 h-3 text-primary-400" />
              <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wide">
                {typeLabel}
              </span>
            </div>
          </div>

          {/* NEW / UPDATED Badge - Top Right */}
          {(isNew || isUpdated) && (
            <div className="absolute top-3 right-3">
              {isNew ? (
                <div className="px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-semibold text-green-400">NEW</span>
                </div>
              ) : (
                <div className="px-2 py-1 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-semibold text-purple-400">UPDATED</span>
                </div>
              )}
            </div>
          )}

          {/* Content - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
              {recipe.name}
            </h3>
            {recipe.station_name && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                {recipe.station_name}
              </p>
            )}
          </div>

          {/* Flip hint - subtle */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-[10px] text-gray-500">
              Tap for details
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BACK FACE - Styled like Admin RecipeCard                         */}
        {/* ================================================================ */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl bg-gray-800/50"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Content */}
          <div className="h-full flex flex-col p-3 overflow-y-auto scrollbar-thin">
            {/* Header with Status Badge */}
            <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-700/50">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                  {recipe.name}
                </h3>
              </div>
              {/* Status Badge - L5 Round */}
              {statusConfig && StatusIcon && (
                <div
                  className={`w-7 h-7 rounded-full ${statusConfig.bg} flex items-center justify-center flex-shrink-0 ml-2`}
                  title={statusConfig.label}
                >
                  <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                </div>
              )}
            </div>

            {/* Two-Column Grid - L5 Pattern */}
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Duty Station */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                      <ChefHat className="w-3 h-3 text-slate-400" />
                    </span>
                    STATION
                  </div>
                  <span className={`text-xs ${recipe.station_name ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                    {recipe.station_name || "Unassigned"}
                  </span>
                </div>

                {/* Recipe Class */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                      <BookUser className="w-3 h-3 text-slate-400" />
                    </span>
                    CLASS
                  </div>
                  <span className={`text-xs ${recipe.sub_category_name ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                    {recipe.sub_category_name || "Uncategorized"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Storage Area */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                      <Warehouse className="w-3 h-3 text-slate-400" />
                    </span>
                    STORAGE
                  </div>
                  <span className={`text-xs ${recipe.storage?.primary_area ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                    {recipe.storage?.primary_area || "Unassigned"}
                  </span>
                </div>

                {/* Shelf Life */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-md bg-slate-700/50 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-slate-400" />
                    </span>
                    SHELF LIFE
                  </div>
                  <span className={`text-xs ${recipe.storage?.shelf_life_duration ? 'text-gray-300' : 'text-gray-500'}`}>
                    {recipe.storage?.shelf_life_duration 
                      ? `${recipe.storage.shelf_life_duration} ${recipe.storage.shelf_life_unit || "days"}`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Allergens - THE HERO for FOH Quick View */}
              <div className="pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-md bg-primary-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-primary-400" />
                  </span>
                  <span className="text-[10px] font-bold text-primary-400/80">
                    ALLERGENS
                  </span>
                </div>
                {allergenList ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergenList.map((allergen) => (
                      <span
                        key={allergen}
                        className="text-xs font-semibold text-primary-300 px-2 py-1 bg-primary-500/20 rounded-lg border border-primary-500/40"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">None Declared</span>
                  </div>
                )}
              </div>
            </div>

            {/* View Recipe Button - L5 Style */}
            <button
              onClick={handleViewClick}
              className="mt-3 w-full flex justify-center py-2 px-3 bg-gray-700/70 hover:bg-primary-800/80 text-gray-300 hover:text-white rounded-lg transition-colors text-xs font-medium items-center gap-2"
            >
              <Info className="w-3.5 h-3.5" />
              View Full Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeFlipCard;
