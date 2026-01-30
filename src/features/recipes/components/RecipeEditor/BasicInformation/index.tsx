import React, { useState, useMemo } from "react";
import {
  Carrot,
  DollarSign,
  TrendingUp,
  Scale,
  Info,
  ChevronUp,
  ChevronDown,
  Target,
  Lightbulb,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { IngredientsInput } from "./IngredientsInput";
import { CostingSummary } from "./CostingSummary";
import type { Recipe } from "@/stores/recipeStore";
import type { OperationsSettings } from "@/types/operations";

/**
 * =============================================================================
 * INGREDIENTS TAB - L5 Design
 * =============================================================================
 * The financial heart of every recipe. Ingredients drive food cost, which
 * drives profitability. This tab focuses entirely on:
 * - What goes IN (ingredients)
 * - What it COSTS (costing breakdown)
 * 
 * Recipe identity (name, type, category) is now handled in PageHeader.
 * =============================================================================
 */

interface BasicInformationProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
  settings: OperationsSettings;
}

export const BasicInformation: React.FC<BasicInformationProps> = ({
  recipe,
  onChange,
  settings,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [showInfo, setShowInfo] = useState(false);

  // Calculate ingredient stats
  const stats = useMemo(() => {
    const ingredients = recipe.ingredients || [];
    const count = ingredients.length;
    
    // Calculate total cost from ingredients
    const totalCost = ingredients.reduce((sum, ing) => {
      const qty = typeof ing.quantity === 'number' 
        ? ing.quantity 
        : parseFloat(ing.quantity as string) || 0;
      const cost = ing.cost_per_unit || ing.cost || 0;
      return sum + (qty * cost);
    }, 0);

    // Cost per unit (if recipe units defined)
    const recipeUnits = parseFloat(recipe.recipe_unit_ratio || "0") || 0;
    const costPerUnit = recipeUnits > 0 ? totalCost / recipeUnits : 0;

    // Find highest cost ingredient
    const sortedByCost = [...ingredients].sort((a, b) => {
      const aCost = (a.quantity || 0) * (a.cost_per_unit || a.cost || 0);
      const bCost = (b.quantity || 0) * (b.cost_per_unit || b.cost || 0);
      return bCost - aCost;
    });
    const topCostItem = sortedByCost[0];

    return {
      count,
      totalCost,
      costPerUnit,
      topCostItem,
      recipeUnits,
      unitType: recipe.unit_type || 'units',
    };
  }, [recipe.ingredients, recipe.recipe_unit_ratio, recipe.unit_type]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6 relative">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/BasicInformation/index.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* L5 SUB-HEADER                                                       */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <Carrot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="subheader-title">Ingredients</h3>
              <p className="subheader-subtitle">Build your recipe, control your costs</p>
            </div>
          </div>

          {/* Right: Stats Pills */}
          <div className="subheader-right">
            <span className="subheader-pill">
              <span className="subheader-pill-value">{stats.count}</span>
              <span className="subheader-pill-label">Items</span>
            </span>
            <span className="subheader-pill">
              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
              <span className="subheader-pill-value">
                {stats.totalCost > 0 ? formatCurrency(stats.totalCost) : "—"}
              </span>
              <span className="subheader-pill-label">Total</span>
            </span>
            {stats.costPerUnit > 0 && (
              <span className="subheader-pill">
                <span className="text-gray-500 text-[10px] font-medium">R/U</span>
                <span className="subheader-pill-value">
                  {formatCurrency(stats.costPerUnit)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`subheader-info expandable-info-section ${showInfo ? 'expanded' : ''}`}>
          <button
            className="expandable-info-header w-full justify-between"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-white">Why Ingredients Matter</span>
            </div>
            {showInfo ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              {/* Core message - speaking peer to peer */}
              <p className="text-sm text-gray-300 leading-relaxed">
                Every ingredient you add here flows through your entire operation. Get this right, 
                and your food costs stay predictable. Your prep sheets stay accurate. Your menu 
                pricing stays profitable. This is where the numbers start.
              </p>

              {/* Feature cards - practical business value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="subheader-feature-card">
                  <Target className="w-4 h-4 text-emerald-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Real Costs</span>
                    <p className="subheader-feature-desc">
                      Ingredient prices update automatically when you import vendor invoices
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <TrendingUp className="w-4 h-4 text-amber-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Price Changes</span>
                    <p className="subheader-feature-desc">
                      When vendors raise prices, you'll see the impact here before it hits your P&L
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <PieChart className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Cost Breakdown</span>
                    <p className="subheader-feature-desc">
                      See which ingredients drive your cost — focus your attention where it matters
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <Scale className="w-4 h-4 text-purple-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Recipe Units</span>
                    <p className="subheader-feature-desc">
                      Define how you measure this recipe — portions, weight, volume — your call
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro tip */}
              <div className="flex items-start gap-3 pt-2 border-t border-gray-700/50">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-amber-400 font-medium">From the kitchen:</span>{" "}
                  The most successful operators we work with review their top 10 highest-cost 
                  ingredients monthly. A 5% increase on your #1 ingredient hits harder than 
                  a 20% jump on something you barely use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* INGREDIENTS INPUT                                                   */}
      {/* ================================================================== */}
      <div className="card p-6 relative z-30">
        <IngredientsInput recipe={recipe} onChange={onChange} />
      </div>

      {/* ================================================================== */}
      {/* COSTING SUMMARY                                                     */}
      {/* ================================================================== */}
      <div className="card p-6 relative z-20">
        <CostingSummary
          recipe={recipe}
          onChange={onChange}
          settings={settings}
        />
      </div>
    </div>
  );
};

export default BasicInformation;
