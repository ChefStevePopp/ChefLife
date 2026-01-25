import React, { useState, useEffect, useMemo } from "react";
import { 
  Scale,
  ChevronDown,
  AlertTriangle,
  Info,
  ChevronUp,
  Settings,
  Check,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Recipe } from "../../../types/recipe";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useRecipeConfig } from "@/features/recipes/hooks/useRecipeConfig";
import IngredientFlipCard from "../../IngredientFlipCard";

/**
 * =============================================================================
 * INGREDIENTS TAB - Line Cook View (L5 Flip Card Pattern)
 * =============================================================================
 * 
 * PRIMARY USER: Line cooks on iPad LANDSCAPE in folio keyboard
 * 
 * DESIGN STANDARD: Must match Recipe Library card quality exactly.
 * - Same 9:16 aspect ratio
 * - Same muted colors  
 * - Same grid breakpoints
 * 
 * UX PHILOSOPHY: "Checkmark on flip = forced information absorption"
 * 
 * Line cooks can't speedrun through checkboxes. They MUST:
 * 1. See the ingredient (front: image, quantity, name, allergens)
 * 2. Tap/hover to flip
 * 3. Read Chef's Notes (back: storage, prep state, lead time, safety)
 * 4. THEN check it off
 * 
 * The act of checking confirms: "I read this, I understand, I'm ready."
 * 
 * TODO: Wire Chef's Notes to real data (recipe_ingredients.chef_notes JSONB)
 * =============================================================================
 */

interface IngredientsProps {
  recipe: Recipe;
}

// Scale options for batch cooking
const SCALE_OPTIONS = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
  { value: 4, label: "4×" },
];

export const Ingredients: React.FC<IngredientsProps> = ({ recipe }) => {
  const { showDiagnostics } = useDiagnostics();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  const [showScaleDropdown, setShowScaleDropdown] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Pull from organization config
  const { config } = useRecipeConfig();
  const sourcingInstructions = config.sourcingInstructions;
  
  const { ingredients: masterIngredients, fetchIngredients } =
    useMasterIngredientsStore();

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // Get full ingredient info from master list
  const getIngredientInfo = (id: string) => {
    return masterIngredients.find((i) => i.id === id);
  };

  // Toggle ingredient checked state (mise en place)
  const toggleChecked = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reset all checks
  const resetChecks = () => {
    setCheckedItems(new Set());
  };

  // Scale the common measure (e.g., "2 cups" × 2 = "4 cups")
  const scaleCommonMeasure = (measure: string | undefined) => {
    if (!measure) return null;
    if (scale === 1) return measure;
    
    // Parse leading number from string like "2 cups", "1.5 kg", "250 ml"
    const match = measure.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return measure; // Can't parse, return as-is
    
    const [, numStr, rest] = match;
    const num = parseFloat(numStr) * scale;
    
    // Smart formatting: whole numbers stay whole, decimals get 1-2 places
    const formatted = num % 1 === 0 
      ? num.toString() 
      : num < 10 
        ? num.toFixed(2).replace(/\.?0+$/, '')
        : num.toFixed(1).replace(/\.?0+$/, '');
    
    return `${formatted} ${rest}`.trim();
  };

  // Progress calculation
  const totalItems = recipe.ingredients?.length || 0;
  const checkedCount = checkedItems.size;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
  const isComplete = totalItems > 0 && checkedCount === totalItems;

  // Memoize ingredient data with master info
  const ingredientsWithMaster = useMemo(() => {
    return (recipe.ingredients || []).map(ingredient => ({
      ingredient,
      masterInfo: getIngredientInfo(ingredient.master_ingredient_id || ingredient.name),
      allergens: ingredient.allergens || [],
    }));
  }, [recipe.ingredients, masterIngredients]);

  return (
    <div className="space-y-4">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-4">
          src/features/recipes/components/RecipeViewer/components/Ingredients.tsx
        </div>
      )}

      {/* ================================================================
       * SUBHEADER: Sourcing Instructions (Configurable per organization)
       * Uses L5 expandable-info-section pattern with green tab identity
       * Only renders if enabled in Recipe Settings
       * ================================================================ */}
      {sourcingInstructions?.enabled && (
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box green">
              <Scale />
            </div>
            <div>
              <h3 className="subheader-title">Ingredient Sourcing</h3>
              <p className="subheader-subtitle">Gather everything before you begin</p>
            </div>
          </div>
          <div className="subheader-right">
            <span className="subheader-pill">
              <span className="subheader-pill-value">{recipe.ingredients?.length || 0}</span>
              <span className="subheader-pill-label">items</span>
            </span>
          </div>
        </div>

        {/* Expandable Info Section - Sourcing philosophy */}
        <div className={`subheader-info expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">{sourcingInstructions.title}</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400 whitespace-pre-line">
                {sourcingInstructions.body}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                <p className="text-xs text-gray-500">
                  {sourcingInstructions.footer}
                </p>
                {showDiagnostics && (
                  <Link 
                    to="/admin/modules/recipes#sourcing"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Customize</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ================================================================
       * TOOLBAR: Scale Selector + Progress + Reset
       * Compact, functional, green tab identity
       * ================================================================ */}
      <div className="flex items-center justify-between gap-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
        {/* Scale Selector */}
        <div className="relative">
          <button
            onClick={() => setShowScaleDropdown(!showScaleDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">
              {scale === 1 ? "1× Batch" : `${scale}× Batch`}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showScaleDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showScaleDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[120px]">
              {SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setScale(opt.value);
                    setShowScaleDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    scale === opt.value ? 'text-emerald-400 font-medium' : 'text-gray-300'
                  }`}
                >
                  {opt.label} Batch
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mise en Place Progress */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Mise en Place</div>
              <div className="text-sm font-medium text-white">
                {checkedCount} / {totalItems}
              </div>
            </div>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-emerald-500/70'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Reset Button */}
          {checkedCount > 0 && (
            <button
              onClick={resetChecks}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Reset all checks"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================
       * INGREDIENT GRID - Flip Cards (matches Recipe Library layout)
       * Same breakpoints as RecipeViewer for visual consistency
       * ================================================================ */}
      {recipe.ingredients && recipe.ingredients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1920px]:grid-cols-4 gap-6">
          {ingredientsWithMaster.map(({ ingredient, masterInfo, allergens }) => {
            const isChecked = checkedItems.has(ingredient.id);
            const scaledMeasure = scaleCommonMeasure(ingredient.common_measure || ingredient.commonMeasure);
            
            // Build allergens array from master or ingredient
            const ingredientAllergens = allergens.length > 0 
              ? allergens 
              : masterInfo 
                ? Object.entries(masterInfo)
                    .filter(([key, value]) => key.startsWith('allergen_') && !key.includes('may_contain') && !key.includes('custom') && !key.includes('notes') && value === true)
                    .map(([key]) => key.replace('allergen_', ''))
                : [];
            
            return (
              <IngredientFlipCard
                key={ingredient.id}
                ingredient={{
                  ...ingredient,
                  allergens: ingredientAllergens,
                }}
                masterInfo={masterInfo}
                scaledMeasure={scaledMeasure}
                isChecked={isChecked}
                onToggleCheck={() => toggleChecked(ingredient.id)}
              />
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="card p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No ingredients have been added to this recipe.</p>
        </div>
      )}

      {/* All Done Message */}
      {isComplete && (
        <div className="card p-4 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <Check className="w-5 h-5" />
            <span className="font-medium">Mise en place complete! Ready to cook.</span>
          </div>
        </div>
      )}
    </div>
  );
};
