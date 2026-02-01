import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Shield, RotateCcw, Save, X, Printer, Info, ChevronUp, ChevronDown, Link2, FileCheck, AlertTriangle, Heart } from 'lucide-react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { AutoDetectedPanel } from './AutoDetectedPanel';
import { DeclarationPanel } from './DeclarationPanel';
import { CrossContactNotes } from './CrossContactNotes';
import { ShareButton } from './ShareButton';
import { useAllergenCascade } from './useAllergenCascade';
import type { AllergenType } from '@/features/allergens/types';
import type { ManualAllergenOverrides } from './types';
import type { Recipe } from '../../../types/recipe';

interface AllergenControlProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

// Default empty overrides
const DEFAULT_OVERRIDES: ManualAllergenOverrides = {
  manualContains: [],
  manualMayContain: [],
  promotedToContains: [],
  manualNotes: {},
  crossContactNotes: []
};

/**
 * Parse existing allergenInfo into manual overrides
 * This handles migration from old format to new format
 */
function parseExistingAllergenInfo(
  allergenInfo: Recipe['allergenInfo'],
  autoDetected: ReturnType<typeof useAllergenCascade>['autoDetected']
): ManualAllergenOverrides {
  if (!allergenInfo) return DEFAULT_OVERRIDES;
  
  const overrides: ManualAllergenOverrides = {
    manualContains: [],
    manualMayContain: [],
    promotedToContains: [],
    manualNotes: {},
    crossContactNotes: allergenInfo.crossContactRisk || []
  };
  
  // Any allergen in contains that's not auto-detected is manual
  for (const allergen of allergenInfo.contains || []) {
    const key = allergen as AllergenType;
    if (!autoDetected.contains.has(key)) {
      // Check if it was promoted from may contain
      if (autoDetected.mayContain.has(key)) {
        overrides.promotedToContains.push(key);
      } else {
        overrides.manualContains.push(key);
      }
    }
  }
  
  // Any allergen in mayContain that's not auto-detected is manual
  for (const allergen of allergenInfo.mayContain || []) {
    const key = allergen as AllergenType;
    if (!autoDetected.mayContain.has(key) && !autoDetected.contains.has(key)) {
      overrides.manualMayContain.push(key);
    }
  }
  
  return overrides;
}

/**
 * AllergenControl - Two-panel allergen management with auto-cascade and manual overrides
 * 
 * L5 Audit: Full traceability of allergen sources, safety locks on auto-detected
 * L6 UX: Zero-friction auto-cascade, only intervene for exceptions
 */
export const AllergenControl: React.FC<AllergenControlProps> = ({
  recipe,
  onChange
}) => {
  const { showDiagnostics } = useDiagnostics();
  const { fetchIngredients } = useMasterIngredientsStore();
  const { fetchRecipes } = useRecipeStore();
  
  // Fetch data on mount
  useEffect(() => {
    fetchIngredients();
    fetchRecipes();
  }, [fetchIngredients, fetchRecipes]);
  
  // Transform recipe ingredients to the format needed by the cascade hook
  const ingredients = useMemo(() => {
    return (recipe.ingredients || []).map(ing => {
      // Compute ingredient type first so we can use it for fallback logic
      const ingredientType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';
      
      return {
        id: ing.id,
        ingredient_type: ingredientType,
        // For raw ingredients, fall back to ing.name which contains the master_ingredient_id
        master_ingredient_id: ing.master_ingredient_id || (ingredientType === 'raw' ? ing.name : undefined),
        // For prepared ingredients, fall back to ing.name which contains the recipe_id
        prepared_recipe_id: ing.prepared_recipe_id || (ingredientType === 'prepared' ? ing.name : undefined),
        ingredient_name: ing.ingredient_name || ing.common_name,
        common_name: ing.common_name
      };
    });
  }, [recipe.ingredients]);
  
  // Initial cascade computation (without manual overrides) to parse existing data
  const initialCascade = useAllergenCascade({ ingredients, manualOverrides: undefined });
  
  // Parse existing allergenInfo to get initial manual overrides
  const [manualOverrides, setManualOverrides] = useState<ManualAllergenOverrides>(() => {
    return parseExistingAllergenInfo(recipe.allergenInfo, initialCascade.autoDetected);
  });
  
  // Track saved state for dirty detection
  const [savedOverrides, setSavedOverrides] = useState<ManualAllergenOverrides>(manualOverrides);
  
  // Expandable info section
  const [showInfo, setShowInfo] = useState(false);
  
  // Full cascade with manual overrides
  const { autoDetected, declaration, allergensWithContext, isLoading } = useAllergenCascade({
    ingredients,
    manualOverrides
  });
  
  // Compute dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(manualOverrides) !== JSON.stringify(savedOverrides);
  }, [manualOverrides, savedOverrides]);
  
  // Count changes
  const changeCount = useMemo(() => {
    let count = 0;
    count += Math.abs(manualOverrides.manualContains.length - savedOverrides.manualContains.length);
    count += Math.abs(manualOverrides.manualMayContain.length - savedOverrides.manualMayContain.length);
    count += Math.abs(manualOverrides.promotedToContains.length - savedOverrides.promotedToContains.length);
    count += Math.abs(manualOverrides.crossContactNotes.length - savedOverrides.crossContactNotes.length);
    return count || (isDirty ? 1 : 0);
  }, [manualOverrides, savedOverrides, isDirty]);
  
  // Action handlers
  const handleAddManual = useCallback((allergen: AllergenType, tier: 'contains' | 'mayContain', note?: string) => {
    setManualOverrides(prev => ({
      ...prev,
      manualContains: tier === 'contains' 
        ? [...prev.manualContains.filter(a => a !== allergen), allergen]
        : prev.manualContains.filter(a => a !== allergen),
      manualMayContain: tier === 'mayContain'
        ? [...prev.manualMayContain.filter(a => a !== allergen), allergen]
        : prev.manualMayContain.filter(a => a !== allergen),
      manualNotes: note ? { ...prev.manualNotes, [allergen]: note } : prev.manualNotes
    }));
  }, []);
  
  const handleRemoveManual = useCallback((allergen: AllergenType) => {
    setManualOverrides(prev => ({
      ...prev,
      manualContains: prev.manualContains.filter(a => a !== allergen),
      manualMayContain: prev.manualMayContain.filter(a => a !== allergen),
      manualNotes: Object.fromEntries(
        Object.entries(prev.manualNotes).filter(([key]) => key !== allergen)
      )
    }));
  }, []);
  
  const handlePromote = useCallback((allergen: AllergenType) => {
    setManualOverrides(prev => ({
      ...prev,
      promotedToContains: [...prev.promotedToContains.filter(a => a !== allergen), allergen]
    }));
  }, []);
  
  const handleUnpromote = useCallback((allergen: AllergenType) => {
    setManualOverrides(prev => ({
      ...prev,
      promotedToContains: prev.promotedToContains.filter(a => a !== allergen)
    }));
  }, []);
  
  const handleUpdateNote = useCallback((allergen: AllergenType, note: string) => {
    setManualOverrides(prev => ({
      ...prev,
      manualNotes: note 
        ? { ...prev.manualNotes, [allergen]: note }
        : Object.fromEntries(Object.entries(prev.manualNotes).filter(([key]) => key !== allergen))
    }));
  }, []);
  
  const handleNotesChange = useCallback((notes: string[]) => {
    setManualOverrides(prev => ({
      ...prev,
      crossContactNotes: notes
    }));
  }, []);
  
  const handleSave = useCallback(() => {
    // Update the recipe with the new allergen declaration
    onChange({
      allergenInfo: {
        contains: declaration.contains,
        mayContain: declaration.mayContain,
        crossContactRisk: declaration.crossContactNotes
      }
    });
    
    // Update saved state
    setSavedOverrides(manualOverrides);
  }, [onChange, declaration, manualOverrides]);
  
  const handleDiscard = useCallback(() => {
    setManualOverrides(savedOverrides);
  }, [savedOverrides]);
  
  const handleResetToAuto = useCallback(() => {
    setManualOverrides(DEFAULT_OVERRIDES);
  }, []);
  
  const handlePrint = useCallback(() => {
    window.print();
  }, []);
  
  return (
    <div className="space-y-6 pb-20">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx
        </div>
      )}
      
      {/* ================================================================== */}
      {/* L5 SUB-HEADER                                                       */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box rose">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h3 className="subheader-title">Allergen Control</h3>
              <p className="subheader-subtitle">Natasha's Promise — Purchase → Plate traceability</p>
            </div>
          </div>

          {/* Right: Stats Pills + Actions */}
          <div className="subheader-right">
            <span className={`subheader-pill ${declaration.contains.length > 0 ? 'rose' : ''}`}>
              <span className="subheader-pill-value">{declaration.contains.length}</span>
              <span className="subheader-pill-label">Contains</span>
            </span>
            <span className={`subheader-pill ${declaration.mayContain.length > 0 ? 'amber' : ''}`}>
              <span className="subheader-pill-value">{declaration.mayContain.length}</span>
              <span className="subheader-pill-label">May Contain</span>
            </span>
            
            <div className="subheader-divider" />
            
            <button
              onClick={handlePrint}
              className="btn-ghost px-2"
              title="Print Declaration"
            >
              <Printer className="w-4 h-4" />
            </button>
            <ShareButton recipeId={recipe.id} recipeName={recipe.name} />
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`subheader-info expandable-info-section ${showInfo ? 'expanded' : ''}`}>
          <button
            className="expandable-info-header w-full justify-between"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-medium text-white">Why This Matters</span>
            </div>
            {showInfo ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              {/* Core message */}
              <p className="text-sm text-gray-300 leading-relaxed">
                In 2016, Natasha Ednan-Laperouse died from an allergic reaction to sesame 
                in a sandwich that wasn't labeled. Her death led to Natasha's Law in the UK, 
                requiring full allergen labeling. This system honors her memory by ensuring 
                the allergen chain never breaks — from the invoice to the plate.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="subheader-feature-card">
                  <Link2 className="w-4 h-4 text-rose-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Auto-Cascade</span>
                    <p className="subheader-feature-desc">
                      Allergens flow automatically from ingredients — nothing to remember
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <FileCheck className="w-4 h-4 text-emerald-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Audit Trail</span>
                    <p className="subheader-feature-desc">
                      Click any allergen to see exactly which ingredients contributed it
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <AlertTriangle className="w-4 h-4 text-amber-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Safety Locks</span>
                    <p className="subheader-feature-desc">
                      Auto-detected allergens can't be removed — only added to
                    </p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <Heart className="w-4 h-4 text-purple-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Customer Trust</span>
                    <p className="subheader-feature-desc">
                      Share declarations via QR code — transparency builds loyalty
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro tip */}
              <div className="flex items-start gap-3 pt-2 border-t border-gray-700/50">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-rose-400 font-medium">The chain:</span>{" "}
                  Vendor Abstract / Label → Master Ingredient → Recipe → Final Plate → Customer. 
                  When you capture allergen data from product specs or labels, it flows all the way through. 
                  That's Natasha's Promise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Auto-Detected */}
        <AutoDetectedPanel 
          autoDetected={autoDetected}
          isLoading={isLoading}
        />
        
        {/* Right: Declaration */}
        <DeclarationPanel
          allergensWithContext={allergensWithContext}
          autoDetected={autoDetected}
          manualOverrides={manualOverrides}
          onAddManual={handleAddManual}
          onRemoveManual={handleRemoveManual}
          onPromote={handlePromote}
          onUnpromote={handleUnpromote}
          onUpdateNote={handleUpdateNote}
        />
      </div>
      
      {/* Cross-Contact Notes */}
      <CrossContactNotes
        notes={manualOverrides.crossContactNotes}
        onChange={handleNotesChange}
      />
      
      {/* L5 Floating Action Bar */}
      {isDirty && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-amber-400 text-sm font-medium">
                ⚠️ {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
              </span>
              
              <button
                onClick={handleResetToAuto}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Auto
              </button>
              
              <div className="h-6 w-px bg-gray-700" />
              
              <button
                onClick={handleDiscard}
                className="btn-ghost px-3 py-1.5"
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Discard</span>
              </button>
              
              <button
                onClick={handleSave}
                className="btn-primary px-4 py-1.5"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm">Save Declaration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllergenControl;
