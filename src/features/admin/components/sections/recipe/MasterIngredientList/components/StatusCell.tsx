import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";

// =============================================================================
// STATUS CELL - Ingredient Setup Completeness
// =============================================================================
// Shows whether an ingredient has all required fields for recipe costing:
// - Complete (emerald): Ready for recipe costing
// - Incomplete (rose): Missing required fields
// =============================================================================

type IngredientStatus = "complete" | "incomplete";

interface StatusCellProps {
  ingredient: MasterIngredient & { _status?: IngredientStatus };
}

// Compute status if not pre-computed
function computeStatus(ingredient: MasterIngredient): IngredientStatus {
  if (!ingredient.recipe_unit_type || ingredient.recipe_unit_type === "") {
    return "incomplete";
  }
  if (!ingredient.recipe_unit_per_purchase_unit || ingredient.recipe_unit_per_purchase_unit === 0) {
    return "incomplete";
  }
  if (!ingredient.major_group || !ingredient.category) {
    return "incomplete";
  }
  if (!ingredient.cost_per_recipe_unit || ingredient.cost_per_recipe_unit === 0) {
    return "incomplete";
  }
  return "complete";
}

export const StatusCell: React.FC<StatusCellProps> = ({ ingredient }) => {
  // Use pre-computed status from MIL if available, otherwise compute
  const status = ingredient._status || computeStatus(ingredient);

  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
        <CheckCircle className="w-3 h-3" />
        Complete
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400">
      <AlertTriangle className="w-3 h-3" />
      Incomplete
    </span>
  );
};

export default StatusCell;
