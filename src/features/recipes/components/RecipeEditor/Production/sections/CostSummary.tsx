import React from "react";
import { DollarSign } from "lucide-react";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * COST SUMMARY - Read-only cost totals from Basic Info
 * =============================================================================
 * Displays the recipe cost calculations from the ingredients tab.
 * This is a brief carryover - detailed breakdown is in Basic Info.
 * 
 * Key fields from Recipe:
 * - total_cost: Sum of all ingredient costs (not always stored)
 * - recipe_unit_ratio: Number of recipe units this batch produces (e.g., "1063")
 * - unit_type: Recipe unit type (e.g., "OZ-FLUID")
 * - cost_per_unit: Calculated cost per recipe unit
 * =============================================================================
 */

interface CostSummaryProps {
  recipe: Recipe;
}

export const CostSummary: React.FC<CostSummaryProps> = ({ recipe }) => {
  // Calculate total from ingredients if total_cost isn't stored
  const calculatedTotal = recipe.ingredients?.reduce((sum, ingredient) => {
    const quantity = typeof ingredient.quantity === 'number' 
      ? ingredient.quantity 
      : parseFloat(ingredient.quantity) || 0;
    const cost = ingredient.cost_per_unit || ingredient.cost || 0;
    return sum + (quantity * cost);
  }, 0) || 0;

  const totalCost = recipe.total_cost || calculatedTotal;
  
  // Recipe unit fields
  const recipeUnits = parseFloat(recipe.recipe_unit_ratio) || 0;
  const recipeUnitType = recipe.unit_type || "—";
  
  // Calculate cost per unit (or use stored value)
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

  // Format small currency (for per-unit costs)
  const formatSmallCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const hasData = totalCost > 0 || recipeUnits > 0;

  return (
    <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-400/80" />
        </div>
        <div>
          <h3 className="text-fluid-sm font-medium text-white">Recipe Cost Summary</h3>
          <p className="text-fluid-xs text-gray-500">From ingredient calculations</p>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Total Recipe Cost */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
            <p className="text-fluid-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost</p>
            <p className="text-fluid-lg font-semibold text-emerald-400">{formatCurrency(totalCost)}</p>
          </div>

          {/* Recipe Units */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
            <p className="text-fluid-xs text-gray-500 uppercase tracking-wide mb-1">Recipe Units</p>
            <p className="text-fluid-lg font-semibold text-white">
              {recipeUnits > 0 ? recipeUnits.toLocaleString() : "—"}{" "}
              <span className="text-fluid-sm text-gray-400">{recipeUnitType}</span>
            </p>
          </div>

          {/* Cost Per Unit */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
            <p className="text-fluid-xs text-gray-500 uppercase tracking-wide mb-1">Cost / Unit</p>
            <p className="text-fluid-lg font-semibold text-amber-400">
              {recipeUnits > 0 ? (
                <>
                  {formatSmallCurrency(costPerUnit)}
                  <span className="text-fluid-xs text-gray-500">/{recipeUnitType.toLowerCase()}</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p className="text-fluid-sm">No cost data available</p>
          <p className="text-fluid-xs mt-1">Add ingredients in the Recipe Info tab to calculate costs</p>
        </div>
      )}
    </div>
  );
};

export default CostSummary;
