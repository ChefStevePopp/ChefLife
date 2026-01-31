/**
 * =============================================================================
 * INGREDIENT CARD - Full-Screen Ingredient Display/Edit
 * =============================================================================
 * L5 Design - Shared card component for TabletMode and GuidedMode
 * Big touch targets, clear visual hierarchy, sandbox-aware
 * =============================================================================
 */

import React, { useMemo } from "react";
import { 
  Package, 
  ChefHat, 
  Scale, 
  DollarSign, 
  AlertTriangle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
} from "lucide-react";
import { IngredientSearch } from "./IngredientSearch";
import { SandboxFields } from "./SandboxFields";
import type { RecipeIngredient } from "../../../types/recipe";
import type { MasterIngredientOption, PreparedItemOption } from "./types";

interface IngredientCardProps {
  ingredient: RecipeIngredient;
  index: number;
  total: number;
  onUpdate: (field: string, value: any) => void;
  onSelectIngredient: (id: string, type: 'raw' | 'prepared') => void;
  onToggleSandbox: () => void;
  onRemove: () => void;
  rawIngredients: MasterIngredientOption[];
  preparedItems: PreparedItemOption[];
  vendors: string[];
  showEducation?: boolean; // For GuidedMode
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  index,
  total,
  onUpdate,
  onSelectIngredient,
  onToggleSandbox,
  onRemove,
  rawIngredients,
  preparedItems,
  vendors,
  showEducation = false,
}) => {
  const isSandbox = ingredient.is_sandbox || false;
  
  // Check if ingredient is linked to real MIL/prepared item
  const isLinkedToMIL = !!(ingredient.name || ingredient.master_ingredient_id || ingredient.prepared_recipe_id);
  const canToggleSandbox = !isLinkedToMIL; // Only allow toggle if NOT linked
  
  // Get display info for selected ingredient
  const selectedInfo = useMemo(() => {
    if (isSandbox) {
      return {
        name: ingredient.sandbox_description || "New Sandbox Item",
        subtext: ingredient.sandbox_vendor 
          ? `${ingredient.sandbox_vendor} #${ingredient.sandbox_vendor_code || '—'}`
          : "No vendor specified",
        unit: ingredient.unit || "—",
        cost: ingredient.sandbox_estimated_cost || 0,
        isVerified: false,
      };
    }
    
    // Check raw ingredients
    const raw = rawIngredients.find(r => r.id === ingredient.name);
    if (raw) {
      return {
        name: raw.product,
        subtext: raw.common_name ? `aka ${raw.common_name}` : undefined,
        unit: raw.recipe_unit_type || ingredient.unit || "—",
        cost: raw.cost_per_recipe_unit || ingredient.cost || 0,
        isVerified: true,
        type: 'raw' as const,
      };
    }
    
    // Check prepared items
    const prep = preparedItems.find(p => p.id === ingredient.name);
    if (prep) {
      return {
        name: prep.name,
        subtext: "Prepared Item",
        unit: prep.unit_type || ingredient.unit || "—",
        cost: prep.cost_per_unit || ingredient.cost || 0,
        isVerified: true,
        type: 'prepared' as const,
      };
    }
    
    return {
      name: "",
      subtext: undefined,
      unit: "—",
      cost: 0,
      isVerified: false,
    };
  }, [ingredient, rawIngredients, preparedItems, isSandbox]);

  const totalCost = (parseFloat(String(ingredient.quantity)) || 0) * selectedInfo.cost;
  const hasIngredient = !!selectedInfo.name;

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all
      ${isSandbox 
        ? "bg-amber-500/5 border-amber-500/30" 
        : "bg-gray-800/50 border-gray-700/50"}`}
    >
      {/* Header Bar */}
      <div className={`px-4 py-3 flex items-center justify-between
        ${isSandbox ? "bg-amber-500/10" : "bg-gray-800/80"}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">
            Ingredient {index + 1} of {total}
          </span>
          {isSandbox && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
              Sandbox
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Verified Badge (when linked to MIL) OR Sandbox Toggle (when not linked) */}
          {isLinkedToMIL ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Verified</span>
            </div>
          ) : (
            <button
              onClick={onToggleSandbox}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                ${isSandbox 
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"}`}
              title={isSandbox ? "Turn off sandbox mode" : "Create as sandbox ingredient"}
            >
              {isSandbox ? (
                <><ToggleRight className="w-4 h-4" /> Sandbox</>
              ) : (
                <><ToggleLeft className="w-4 h-4" /> Sandbox</>
              )}
            </button>
          )}
          {/* Delete */}
          <button
            onClick={onRemove}
            className="p-2 rounded-full bg-gray-700/50 text-gray-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Remove ingredient"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-5">
        {/* Ingredient Selection or Sandbox Fields */}
        {isSandbox ? (
          <div>
            {showEducation && (
              <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                <strong>Sandbox Mode:</strong> Enter the ingredient details manually. 
                When your next invoice arrives, you can verify this item against your Master Ingredient List.
              </div>
            )}
            <SandboxFields
              vendor={ingredient.sandbox_vendor || ""}
              vendorCode={ingredient.sandbox_vendor_code || ""}
              description={ingredient.sandbox_description || ""}
              estimatedCost={ingredient.sandbox_estimated_cost || 0}
              unit={ingredient.unit || ""}
              onChange={(field, value) => onUpdate(field, value)}
              vendors={vendors}
            />
          </div>
        ) : (
          <div>
            {showEducation && (
              <div className="mb-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg text-sm text-primary-200">
                <strong>Finding Ingredients:</strong> Search by name or vendor code. 
                Can't find it? Toggle <em>Sandbox</em> to add it temporarily.
              </div>
            )}
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Search Ingredient
            </label>
            <IngredientSearch
              value={ingredient.name || ""}
              onChange={onSelectIngredient}
              onSandboxCreate={onToggleSandbox}
              rawIngredients={rawIngredients}
              preparedItems={preparedItems}
              autoFocus={!hasIngredient}
            />
            {/* Selected ingredient display */}
            {hasIngredient && (
              <div className="mt-3 p-3 bg-gray-900/50 rounded-lg flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${selectedInfo.type === 'prepared' ? "bg-blue-500/20" : "bg-primary-500/20"}`}
                >
                  {selectedInfo.type === 'prepared' 
                    ? <ChefHat className="w-5 h-5 text-blue-400" />
                    : <Package className="w-5 h-5 text-primary-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{selectedInfo.name}</div>
                  {selectedInfo.subtext && (
                    <div className="text-xs text-gray-500">{selectedInfo.subtext}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-emerald-400">
                    ${selectedInfo.cost.toFixed(2)}/{selectedInfo.unit}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantity + Common Measure Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Scale className="w-4 h-4 inline mr-1.5" />
              Quantity
              <span className="text-gray-600 ml-1">({selectedInfo.unit})</span>
            </label>
            <input
              type="number"
              value={ingredient.quantity || ""}
              onChange={(e) => onUpdate("quantity", e.target.value)}
              placeholder="0"
              min="0"
              step="0.25"
              className="input w-full bg-gray-800/50 text-2xl font-mono text-center py-4"
            />
            {showEducation && (
              <p className="text-xs text-gray-500 mt-1">
                How many {selectedInfo.unit} does this recipe need?
              </p>
            )}
          </div>

          {/* Common Measure */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Common Measure
              <span className="text-gray-600 ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={ingredient.commonMeasure || ingredient.common_measure || ""}
              onChange={(e) => onUpdate("commonMeasure", e.target.value)}
              placeholder="e.g., 2 cups"
              className="input w-full bg-gray-800/50 text-lg py-4"
            />
            {showEducation && (
              <p className="text-xs text-gray-500 mt-1">
                Kitchen-friendly measurement for prep sheets
              </p>
            )}
          </div>
        </div>

        {/* Cost Summary */}
        <div className={`p-4 rounded-xl flex items-center justify-between
          ${isSandbox 
            ? "bg-amber-500/10 border border-amber-500/20" 
            : "bg-emerald-500/10 border border-emerald-500/20"}`}
        >
          <div className="flex items-center gap-2">
            {isSandbox && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            <DollarSign className={`w-5 h-5 ${isSandbox ? "text-amber-400" : "text-emerald-400"}`} />
            <span className={`font-medium ${isSandbox ? "text-amber-400" : "text-emerald-400"}`}>
              Line Total
              {isSandbox && <span className="text-xs ml-1 opacity-60">(estimated)</span>}
            </span>
          </div>
          <span className={`text-2xl font-semibold ${isSandbox ? "text-amber-400" : "text-emerald-400"}`}>
            ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IngredientCard;
