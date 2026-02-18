import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Shield, RotateCcw, Printer, Info, ChevronUp, ChevronDown, Link2, FileCheck, AlertTriangle, Heart } from 'lucide-react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { AutoDetectedPanel } from './AutoDetectedPanel';
import { ManualOverrides } from './ManualOverrides';
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
  /** Called when operator clicks "Confirm Declaration" — triggers review gate + save */
  onConfirmDeclaration?: () => void;
  /** Whether allergenInfo differs from the last-saved baseline (passed from parent) */
  allergensDirty?: boolean;
  /** Whether the allergen review gate is active (ingredients/allergens changed, review required before save) */
  needsReview?: boolean;
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
 * =============================================================================
 * ALLERGEN CONTROL — L5 Professional
 * =============================================================================
 * Two-column layout with legal boundary:
 *   LEFT:  Your Data — Ingredient-sourced allergens, manual overrides, cross-contact
 *   |      ChefLife mirrors YOUR data. We don't detect — we reflect.
 *   RIGHT: The Declaration — Read-only legal bond between operator and customer
 *   |      UUID identity only. No names. No doxxing. Cryptographic traceability.
 * 
 * PATTERN: Same as every other recipe tab.
 *   - Receives recipe + onChange from parent RecipeDetailPage
 *   - Calls onChange({ allergenInfo }) to push changes to parent formData
 *   - Parent's useTabChanges detects dirty state, lights up tab dot
 *   - Parent's floating action bar handles Save for ALL tabs uniformly
 *   - NO self-save, NO competing action bar
 *
 * FUTURE: When auth identity bridge is built, the parent's save flow will
 * capture declaration metadata (who, when, from where) as a legal receipt
 * in a dedicated recipe_allergen_declarations table.
 * =============================================================================
 */
export const AllergenControl: React.FC<AllergenControlProps> = ({
  recipe,
  onChange,
  onConfirmDeclaration,
  allergensDirty,
  needsReview
}) => {
  const { showDiagnostics } = useDiagnostics();
  const { fetchIngredients } = useMasterIngredientsStore();
  const { fetchRecipes } = useRecipeStore();
  
  // Fetch data on mount (needed for cascade to resolve prepared ingredients)
  useEffect(() => {
    fetchIngredients();
    fetchRecipes();
  }, [fetchIngredients, fetchRecipes]);
  
  // Transform recipe ingredients to the format needed by the cascade hook
  const ingredients = useMemo(() => {
    return (recipe.ingredients || []).map(ing => {
      const ingredientType = ing.ingredient_type || (ing.type as 'raw' | 'prepared') || 'raw';
      return {
        id: ing.id,
        ingredient_type: ingredientType,
        master_ingredient_id: ing.master_ingredient_id || (ingredientType === 'raw' ? ing.name : undefined),
        prepared_recipe_id: ing.prepared_recipe_id || (ingredientType === 'prepared' ? ing.name : undefined),
        ingredient_name: ing.ingredient_name || ing.common_name,
        common_name: ing.common_name
      };
    });
  }, [recipe.ingredients]);
  
  // =========================================================================
  // MANUAL OVERRIDES — Read from persisted recipe field, not local state
  // useAllergenAutoSync (at RecipeEditor level) handles cascade + allergenInfo sync.
  // AllergenControl owns the UI for managing overrides.
  // =========================================================================
  const manualOverrides: ManualAllergenOverrides = useMemo(() => {
    const stored = recipe.allergenManualOverrides;
    if (!stored) return DEFAULT_OVERRIDES;
    return {
      manualContains: stored.manualContains || [],
      manualMayContain: stored.manualMayContain || [],
      promotedToContains: stored.promotedToContains || [],
      manualNotes: stored.manualNotes || {},
      crossContactNotes: stored.crossContactNotes || [],
    };
  }, [recipe.allergenManualOverrides]);

  // Helper: persist override changes via parent onChange
  const updateOverrides = useCallback((updater: (prev: ManualAllergenOverrides) => ManualAllergenOverrides) => {
    const updated = updater(manualOverrides);
    onChange({ allergenManualOverrides: updated });
  }, [manualOverrides, onChange]);
  
  // Expandable info section
  const [showInfo, setShowInfo] = useState(false);
  
  // Cascade for UI display (autoDetected sources, allergensWithContext badges)
  // allergenInfo SYNC is handled by useAllergenAutoSync at RecipeEditor level — not here.
  const { autoDetected, declaration, allergensWithContext, isLoading } = useAllergenCascade({
    ingredients,
    manualOverrides
  });
  
  // =========================================================================
  // DIRTY STATE — for Declaration Panel display
  // Parent (RecipeDetailPage) compares allergenInfo against originalData
  // (the DB baseline). This is the single source of truth for "pending".
  // =========================================================================
  const hasUnsavedChanges = allergensDirty ?? false;
  
  // =========================================================================
  // MANUAL OVERRIDE HANDLERS
  // =========================================================================
  const handleAddManual = useCallback((allergen: AllergenType, tier: 'contains' | 'mayContain', note?: string) => {
    updateOverrides(prev => ({
      ...prev,
      manualContains: tier === 'contains' 
        ? [...prev.manualContains.filter(a => a !== allergen), allergen]
        : prev.manualContains.filter(a => a !== allergen),
      manualMayContain: tier === 'mayContain'
        ? [...prev.manualMayContain.filter(a => a !== allergen), allergen]
        : prev.manualMayContain.filter(a => a !== allergen),
      manualNotes: note ? { ...prev.manualNotes, [allergen]: note } : prev.manualNotes
    }));
  }, [updateOverrides]);
  
  const handleRemoveManual = useCallback((allergen: AllergenType) => {
    updateOverrides(prev => ({
      ...prev,
      manualContains: prev.manualContains.filter(a => a !== allergen),
      manualMayContain: prev.manualMayContain.filter(a => a !== allergen),
      manualNotes: Object.fromEntries(
        Object.entries(prev.manualNotes).filter(([key]) => key !== allergen)
      )
    }));
  }, [updateOverrides]);
  
  const handlePromote = useCallback((allergen: AllergenType) => {
    updateOverrides(prev => ({
      ...prev,
      promotedToContains: [...prev.promotedToContains.filter(a => a !== allergen), allergen]
    }));
  }, [updateOverrides]);
  
  const handleUnpromote = useCallback((allergen: AllergenType) => {
    updateOverrides(prev => ({
      ...prev,
      promotedToContains: prev.promotedToContains.filter(a => a !== allergen)
    }));
  }, [updateOverrides]);
  
  const handleUpdateNote = useCallback((allergen: AllergenType, note: string) => {
    updateOverrides(prev => ({
      ...prev,
      manualNotes: note 
        ? { ...prev.manualNotes, [allergen]: note }
        : Object.fromEntries(Object.entries(prev.manualNotes).filter(([key]) => key !== allergen))
    }));
  }, [updateOverrides]);
  
  const handleNotesChange = useCallback((notes: string[]) => {
    updateOverrides(prev => ({
      ...prev,
      crossContactNotes: notes
    }));
  }, [updateOverrides]);
  
  const handleResetToAuto = useCallback(() => {
    onChange({ allergenManualOverrides: DEFAULT_OVERRIDES });
  }, [onChange]);
  
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const hasManualOverrides = manualOverrides.manualContains.length > 0 
    || manualOverrides.manualMayContain.length > 0 
    || manualOverrides.promotedToContains.length > 0;
  
  return (
    <div className="space-y-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* REVIEW REQUIRED BANNER — Persistent CTA when save gate is active    */}
      {/* This replaces the ephemeral toast. User sees exactly why they're     */}
      {/* here and has one clear action to take.                               */}
      {/* ================================================================== */}
      {needsReview && onConfirmDeclaration && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rose-200">
              Allergen review required before saving
            </p>
            <p className="text-xs text-rose-300/70 mt-0.5">
              Ingredients have changed since the last declaration. Review the allergen profile below, then confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirmDeclaration}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-rose-500/20 hover:bg-rose-500/30
                       border border-rose-500/40 hover:border-rose-500/60
                       text-sm font-semibold text-rose-300
                       transition-all duration-200 flex-shrink-0"
          >
            <FileCheck className="w-4 h-4" />
            Confirm & Save
          </button>
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
            
            {hasManualOverrides && (
              <button
                onClick={handleResetToAuto}
                className="btn-ghost px-2"
                title="Reset to Auto-Detected Only"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
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
              <p className="text-sm text-gray-300 leading-relaxed">
                In 2016, Natasha Ednan-Laperouse died from an allergic reaction to sesame 
                in a sandwich that wasn't labeled. Her death led to Natasha's Law in the UK, 
                requiring full allergen labeling. This system honors her memory by ensuring 
                the allergen chain never breaks — from the invoice to the plate.
              </p>

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
                      Ingredient-sourced allergens can't be removed — only added to
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
      
      {/* ================================================================== */}
      {/* TWO-COLUMN LAYOUT                                                   */}
      {/* LEFT: Workbench (discover, override, annotate)                      */}
      {/* RIGHT: Declaration (read-only legal document)                       */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0">
        
        {/* LEFT: Your Data — The Workbench */}
        <div className="space-y-4 pr-6">
          <AutoDetectedPanel 
            autoDetected={autoDetected}
            isLoading={isLoading}
          />
          
          <ManualOverrides
            manualOverrides={manualOverrides}
            allergensWithContext={allergensWithContext}
            onAddManual={handleAddManual}
            onRemoveManual={handleRemoveManual}
            onPromote={handlePromote}
            onUnpromote={handleUnpromote}
            onUpdateNote={handleUpdateNote}
          />
          
          <CrossContactNotes
            notes={manualOverrides.crossContactNotes}
            onChange={handleNotesChange}
          />
        </div>
        
        {/* LEGAL BOUNDARY — The vertical wall */}
        <div className="hidden lg:flex flex-col items-center py-4">
          <div className="flex-1 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
          <div className="my-3 px-2 py-1.5 rounded bg-gray-800 border border-gray-700">
            <Shield className="w-3.5 h-3.5 text-rose-400/60" />
          </div>
          <div className="flex-1 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
        </div>
        
        {/* RIGHT: The Legal Declaration — Faces the Customer */}
        <div className="pl-6 lg:pl-6">
          <DeclarationPanel
            declaration={declaration}
            allergensWithContext={allergensWithContext}
            recipe={recipe}
            hasUnsavedChanges={hasUnsavedChanges}
            onConfirmDeclaration={onConfirmDeclaration}
          />
        </div>
      </div>
    </div>
  );
};

export default AllergenControl;
