/**
 * =============================================================================
 * INGREDIENTS INPUT - Main Component
 * =============================================================================
 * L5/L6 Design - Mode switcher: Table (desktop), Tablet (touch), Guided (training)
 * 
 * Modes:
 * - Table: Desktop efficiency, all ingredients visible
 * - Tablet: Full-screen speed entry, one at a time
 * - Guided: Full-screen with education (future)
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutList,
  Tablet,
  GraduationCap,
  UtensilsCrossed,
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { supabase } from "@/lib/supabase";
import { TableView } from "./TableView";
import { TabletMode } from "./TabletMode";
import { createNewIngredient } from "./types";
import type { IngredientsViewMode, PreparedItemOption } from "./types";
import type { Recipe, RecipeIngredient } from "../../../types/recipe";

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
interface IngredientsInputProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const IngredientsInput: React.FC<IngredientsInputProps> = ({
  recipe,
  onChange,
}) => {
  const { showDiagnostics } = useDiagnostics();
  
  // View mode state
  const [viewMode, setViewMode] = useState<IngredientsViewMode>('table');
  const [isTabletModeOpen, setIsTabletModeOpen] = useState(false);
  const [isGuidedMode, setIsGuidedMode] = useState(false);

  // Data stores
  const { 
    ingredients: masterIngredients, 
    fetchIngredients: fetchMasterIngredients,
    isLoading: isLoadingMaster,
    error: masterError,
  } = useMasterIngredientsStore();

  const { settings: operationsSettings, fetchSettings: fetchOperationsSettings } = useOperationsStore();
  const vendors = operationsSettings?.vendors || [];

  // Prepared items (sub-recipes)
  const [preparedItems, setPreparedItems] = useState<PreparedItemOption[]>([]);
  const [isLoadingPrepared, setIsLoadingPrepared] = useState(true);
  const [preparedError, setPreparedError] = useState<string | null>(null);

  // Fetch prepared items
  const fetchPreparedItems = async () => {
    try {
      setIsLoadingPrepared(true);
      setPreparedError(null);

      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, type, unit_type, cost_per_unit")
        .eq("type", "prepared");

      if (error) throw error;
      setPreparedItems(data || []);
    } catch (error) {
      console.error("Error fetching prepared items:", error);
      setPreparedError("Failed to load prepared items");
    } finally {
      setIsLoadingPrepared(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchMasterIngredients();
    fetchPreparedItems();
    if (!operationsSettings) {
      fetchOperationsSettings();
    }
  }, [fetchMasterIngredients, operationsSettings, fetchOperationsSettings]);

  // Handle ingredients change
  const handleIngredientsChange = useCallback((ingredients: RecipeIngredient[]) => {
    // Recalculate allergens from all ingredients
    const allAllergens = new Set<string>();
    ingredients.forEach((ing) => {
      if (!ing.is_sandbox && (ing.type === 'raw' || ing.ingredient_type === 'raw')) {
        const mi = masterIngredients.find((m) => m.id === ing.name);
        if (mi?.allergens?.length) {
          mi.allergens.forEach((allergen: string) => allAllergens.add(allergen));
        }
      }
    });

    onChange({
      ingredients,
      allergenInfo: {
        ...recipe.allergenInfo,
        contains: Array.from(allAllergens),
      },
    });
  }, [masterIngredients, onChange, recipe.allergenInfo]);

  // Open tablet mode (speed)
  const openTabletMode = () => {
    setIsGuidedMode(false);
    setIsTabletModeOpen(true);
  };

  // Open guided mode (educational)
  const openGuidedMode = () => {
    setIsGuidedMode(true);
    setIsTabletModeOpen(true);
  };

  // Close tablet/guided mode
  const closeTabletMode = () => {
    setIsTabletModeOpen(false);
    setIsGuidedMode(false);
  };

  // Stats
  const stats = useMemo(() => {
    const totalCost = recipe.ingredients?.reduce((sum, ing) => {
      const qty = parseFloat(String(ing.quantity)) || 0;
      const cost = ing.is_sandbox 
        ? (ing.sandbox_estimated_cost || 0)
        : (ing.cost || ing.cost_per_unit || 0);
      return sum + (qty * cost);
    }, 0) || 0;

    const sandboxCount = recipe.ingredients?.filter(i => i.is_sandbox).length || 0;
    const itemCount = recipe.ingredients?.length || 0;

    return { totalCost, sandboxCount, itemCount };
  }, [recipe.ingredients]);

  const isLoading = isLoadingMaster || isLoadingPrepared;
  const error = masterError || preparedError;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading ingredients...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-3 bg-rose-500/10 text-rose-400 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">Error Loading Ingredients</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Diagnostics */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/IngredientsInput/index.tsx
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Ingredients</h3>
            <p className="text-sm text-gray-500">
              {stats.itemCount} item{stats.itemCount !== 1 ? 's' : ''}
              {stats.sandboxCount > 0 && (
                <span className="text-amber-400 ml-2">
                  ({stats.sandboxCount} sandbox)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher - spaced badges */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${viewMode === 'table' 
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" 
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700"}`}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={openTabletMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
              title="Tablet Mode"
            >
              <Tablet className="w-4 h-4" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={openGuidedMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
              title="Guided Mode - With tips and help"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Guided</span>
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => {
              const newIng = createNewIngredient() as RecipeIngredient;
              handleIngredientsChange([...(recipe.ingredients || []), newIng]);
            }}
            className="btn-ghost-blue text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </button>
        </div>
      </div>

      {/* Main Content */}
      <TableView
        ingredients={recipe.ingredients || []}
        onChange={handleIngredientsChange}
        rawIngredients={masterIngredients}
        preparedItems={preparedItems}
        vendors={vendors}
      />

      {/* Tablet/Guided Mode Overlay */}
      {isTabletModeOpen && (
        <TabletMode
          ingredients={recipe.ingredients || []}
          onChange={handleIngredientsChange}
          onClose={closeTabletMode}
          rawIngredients={masterIngredients}
          preparedItems={preparedItems}
          vendors={vendors}
          showEducation={isGuidedMode}
        />
      )}

      {/* Total Cost Summary (if items exist) */}
      {stats.itemCount > 0 && (
        <div className={`p-4 rounded-xl flex items-center justify-between
          ${stats.sandboxCount > 0 
            ? "bg-amber-500/10 border border-amber-500/20" 
            : "bg-emerald-500/10 border border-emerald-500/20"}`}
        >
          <div className="flex items-center gap-2">
            {stats.sandboxCount > 0 && (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className={`font-medium ${stats.sandboxCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              Total Recipe Cost
              {stats.sandboxCount > 0 && (
                <span className="text-xs ml-2 opacity-70">
                  (includes {stats.sandboxCount} estimated)
                </span>
              )}
            </span>
          </div>
          <span className={`text-2xl font-semibold ${stats.sandboxCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            ${stats.totalCost.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};

export default IngredientsInput;
