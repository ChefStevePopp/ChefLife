import React, { useMemo } from "react";
import {
  ChefHat,
  Utensils,
  FolderTree,
  FileEdit,
  CheckCircle,
  Archive,
  Eye,
  Info,
} from "lucide-react";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getLucideIcon } from "@/utils/iconMapping";
import type { Recipe } from "../../types/recipe";

/**
 * PageHeader - L5 Design System
 * Recipe detail page header with title, status badge, and version indicator.
 */

interface PageHeaderProps {
  recipe: Recipe | Omit<Recipe, "id">;
  isNew: boolean;
  hasUnsavedChanges: boolean;
  onBack: () => void;
  onChange: (updates: Partial<Recipe>) => void;
  backLabel: string;
}

// Status badge configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        bg: "bg-green-500/20",
        border: "border-green-500/50",
        text: "text-green-400",
        icon: CheckCircle,
        label: "Approved",
      };
    case "draft":
      return {
        bg: "bg-amber-500/20",
        border: "border-amber-500/50",
        text: "text-amber-400",
        icon: FileEdit,
        label: "Draft",
      };
    case "review":
      return {
        bg: "bg-blue-500/20",
        border: "border-blue-500/50",
        text: "text-blue-400",
        icon: Eye,
        label: "In Review",
      };
    case "archived":
      return {
        bg: "bg-gray-500/20",
        border: "border-gray-500/50",
        text: "text-gray-400",
        icon: Archive,
        label: "Archived",
      };
    default:
      return {
        bg: "bg-gray-500/20",
        border: "border-gray-500/50",
        text: "text-gray-400",
        icon: Info,
        label: "Unknown",
      };
  }
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  recipe,
  isNew,
  hasUnsavedChanges,
  onBack,
  onChange,
  backLabel,
}) => {
  const { showDiagnostics } = useDiagnostics();

  // Get major group info from Food Relationships
  const majorGroups = useFoodRelationshipsStore((state) => state.majorGroups);
  const majorGroup = useMemo(() => {
    if (!recipe.major_group) return null;
    return majorGroups.find((g) => g.id === recipe.major_group);
  }, [recipe.major_group, majorGroups]);

  // Dynamic icon
  const GroupIcon = useMemo(() => {
    if (majorGroup?.icon) {
      return getLucideIcon(majorGroup.icon);
    }
    if (recipe.type === "prepared") return ChefHat;
    if (recipe.type === "final") return Utensils;
    return FolderTree;
  }, [majorGroup?.icon, recipe.type]);

  const statusConfig = recipe.status ? getStatusConfig(recipe.status) : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <div className="bg-[#1a1f2b] rounded-2xl p-6 mb-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          src/features/recipes/components/RecipeDetailPage/PageHeader.tsx
        </div>
      )}
      <div className="flex items-start gap-4">
        {/* Recipe Type Icon */}
        <div className="w-14 h-14 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <GroupIcon className="w-7 h-7 text-primary-400" />
        </div>

        {/* Recipe Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Name Input (Editable) */}
            <input
              type="text"
              value={recipe.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={isNew ? "New Recipe Name" : "Recipe Name"}
              className="text-2xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full max-w-md placeholder:text-gray-500"
            />
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Recipe Type Badge */}
            <div className="px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700 flex items-center gap-2">
              <GroupIcon className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-xs font-medium text-gray-300">
                {majorGroup?.name ||
                  (recipe.type === "prepared"
                    ? "Prep Item"
                    : recipe.type === "final"
                    ? "Final Plate"
                    : "Receiving Item")}
              </span>
            </div>

            {/* Status Badge */}
            {statusConfig && StatusIcon && (
              <div
                className={`px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} flex items-center gap-2 text-xs font-medium`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </div>
            )}

            {/* Version Badge */}
            {recipe.version && (
              <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/50 flex items-center gap-2 text-xs font-medium">
                v{recipe.version}
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="mt-4">
            <textarea
              value={recipe.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Add a description..."
              rows={2}
              className="w-full text-sm text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700/50 px-3 py-2 focus:outline-none focus:border-primary-500/50 resize-none placeholder:text-gray-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
