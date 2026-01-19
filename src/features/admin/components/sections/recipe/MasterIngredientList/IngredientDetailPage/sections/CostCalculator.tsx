import React from "react";
import { Calculator, Sparkles } from "lucide-react";
import { useGuidedMode } from "@/shared/components/L5";

/**
 * =============================================================================
 * COST CALCULATOR SECTION
 * =============================================================================
 * The payoff - shows the calculated cost per recipe unit.
 * Visual equation: Price ÷ Units × Yield Factor = Cost
 * =============================================================================
 */

interface CostCalculatorProps {
  price: number;
  recipeUnits: number;
  yieldPercent: number;
  unitType: string;
  productName: string;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  price,
  recipeUnits,
  yieldPercent,
  unitType,
}) => {
  const { isGuided } = useGuidedMode();
  
  const baseUnitCost = recipeUnits > 0 ? price / recipeUnits : 0;
  const adjustedCost = yieldPercent > 0 ? baseUnitCost / (yieldPercent / 100) : baseUnitCost;
  const finalCost = Math.round(adjustedCost * 10000) / 10000;
  const isCalculable = price > 0 && recipeUnits > 0;
  const hasYieldAdjustment = yieldPercent !== 100;

  // Example calculation for guided mode
  const exampleQty = unitType?.toLowerCase().includes("oz")
    ? 4
    : unitType?.toLowerCase().includes("lb")
    ? 1
    : unitType?.toLowerCase().includes("each")
    ? 2
    : 1;
  const exampleCost = finalCost * exampleQty;

  return (
    <div
      className={`bg-[#1a1f2b] rounded-lg shadow-lg overflow-hidden ${
        isCalculable ? "ring-1 ring-purple-500/30" : ""
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isCalculable ? "bg-purple-500/20" : "bg-gray-800/50"
          }`}
        >
          <Calculator
            className={`w-4 h-4 ${
              isCalculable ? "text-purple-400" : "text-gray-500"
            }`}
          />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-300">
            Cost per Recipe Unit
          </h2>
          <span className="text-xs text-gray-500">
            Calculated from purchase data
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {isCalculable ? (
          <>
            {/* Visual Equation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-4">
              <div className="text-center min-w-[50px]">
                <div className="text-lg sm:text-xl font-bold text-white">
                  ${price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">Price</div>
              </div>
              <div className="text-lg text-gray-600">÷</div>
              <div className="text-center min-w-[50px]">
                <div className="text-lg sm:text-xl font-bold text-white">
                  {recipeUnits}
                </div>
                <div className="text-xs text-gray-500">Units</div>
              </div>
              {hasYieldAdjustment && (
                <>
                  <div className="text-lg text-gray-600">×</div>
                  <div className="text-center min-w-[50px]">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">
                      {(100 / yieldPercent).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Yield</div>
                  </div>
                </>
              )}
              <div className="text-lg text-gray-600">=</div>
              <div className="text-center px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <div className="text-xl sm:text-2xl font-bold text-purple-400">
                  ${finalCost.toFixed(4)}
                </div>
                <div className="text-xs text-purple-400/70">
                  per {unitType || "unit"}
                </div>
              </div>
            </div>

            {/* Example (Guided mode only) */}
            {isGuided && (
              <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-800/30 rounded-lg text-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-gray-400">
                  Recipe calls for{" "}
                  <span className="text-white">
                    {exampleQty} {unitType}
                  </span>
                  ? That's{" "}
                  <span className="text-purple-400">
                    ${exampleCost.toFixed(2)}
                  </span>
                </span>
              </div>
            )}

            {hasYieldAdjustment && (
              <div className="mt-2 text-center text-xs text-gray-500">
                * Adjusted for {yieldPercent}% usable yield
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gray-800/50 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm">Awaiting purchase data</p>
            <p className="text-xs text-gray-500 mt-1">
              Complete the fields above to calculate
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostCalculator;
