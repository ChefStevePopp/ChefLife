/**
 * =============================================================================
 * TABLET MODE - Full-Screen Speed Ingredient Entry
 * =============================================================================
 * L5/L6 Design - One ingredient at a time, big touch targets, fast flow
 * "I know what I'm doing, get out of my way"
 * =============================================================================
 */

import React, { useState, useCallback, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  Package,
  AlertTriangle,
} from "lucide-react";
import { IngredientCard } from "./IngredientCard";
import { createNewIngredient } from "./types";
import type { TabletModeProps } from "./types";
import type { RecipeIngredient } from "../../../types/recipe";

export const TabletMode: React.FC<TabletModeProps> = ({
  ingredients,
  onChange,
  onClose,
  rawIngredients,
  preparedItems,
  vendors,
  showEducation = false,
}) => {
  // Current ingredient index
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start at first empty ingredient, or first ingredient if all filled
    const emptyIndex = ingredients.findIndex(ing => !ing.name && !ing.sandbox_description);
    if (emptyIndex >= 0) return emptyIndex;
    // All filled - start at first ingredient (not past the end)
    return 0;
  });

  // Local working copy of ingredients
  const [localIngredients, setLocalIngredients] = useState<RecipeIngredient[]>(
    () => ingredients.length > 0 ? [...ingredients] : [createNewIngredient() as RecipeIngredient]
  );

  // Sync back to parent on changes
  useEffect(() => {
    onChange(localIngredients);
  }, [localIngredients, onChange]);

  const currentIngredient = localIngredients[currentIndex];
  const totalIngredients = localIngredients.length;
  const hasMultiple = totalIngredients > 1;

  // Count sandbox items for badge
  const sandboxCount = localIngredients.filter(i => i.is_sandbox).length;

  // Navigation
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalIngredients - 1;

  const goToPrev = () => {
    if (canGoPrev) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (canGoNext) setCurrentIndex(currentIndex + 1);
  };

  // Update current ingredient
  const handleUpdate = useCallback((field: string, value: any) => {
    setLocalIngredients(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        [field]: value,
      };
      return updated;
    });
  }, [currentIndex]);

  // Select ingredient from search
  const handleSelectIngredient = useCallback((id: string, type: 'raw' | 'prepared') => {
    // Find the source data
    const raw = rawIngredients.find(r => r.id === id);
    const prep = preparedItems.find(p => p.id === id);

    setLocalIngredients(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        name: id,
        type: type,
        ingredient_type: type,
        unit: type === 'raw' 
          ? (raw?.recipe_unit_type || '') 
          : (prep?.unit_type || ''),
        cost: type === 'raw'
          ? (raw?.cost_per_recipe_unit || 0)
          : (prep?.cost_per_unit || 0),
        cost_per_unit: type === 'raw'
          ? (raw?.cost_per_recipe_unit || 0)
          : (prep?.cost_per_unit || 0),
        is_sandbox: false,
        // Clear sandbox fields
        sandbox_vendor: undefined,
        sandbox_vendor_code: undefined,
        sandbox_description: undefined,
        sandbox_estimated_cost: undefined,
      };
      return updated;
    });
  }, [currentIndex, rawIngredients, preparedItems]);

  // Toggle sandbox mode
  const handleToggleSandbox = useCallback(() => {
    setLocalIngredients(prev => {
      const updated = [...prev];
      const current = updated[currentIndex];
      const newIsSandbox = !current.is_sandbox;
      
      updated[currentIndex] = {
        ...current,
        is_sandbox: newIsSandbox,
        // Clear regular fields when switching to sandbox
        ...(newIsSandbox ? {
          name: '',
          cost: 0,
          cost_per_unit: 0,
        } : {
          // Clear sandbox fields when switching off (force MIL search)
          sandbox_vendor: undefined,
          sandbox_vendor_code: undefined,
          sandbox_description: undefined,
          sandbox_estimated_cost: undefined,
        }),
      };
      return updated;
    });
  }, [currentIndex]);

  // Remove current ingredient
  const handleRemove = useCallback(() => {
    if (totalIngredients <= 1) {
      // Reset to empty instead of removing last one
      setLocalIngredients([createNewIngredient() as RecipeIngredient]);
      setCurrentIndex(0);
    } else {
      setLocalIngredients(prev => prev.filter((_, i) => i !== currentIndex));
      // Adjust index if we removed the last item
      if (currentIndex >= totalIngredients - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    }
  }, [currentIndex, totalIngredients]);

  // Add new ingredient and navigate to it
  const handleAddAnother = () => {
    const newIngredient = createNewIngredient() as RecipeIngredient;
    setLocalIngredients(prev => [...prev, newIngredient]);
    setCurrentIndex(localIngredients.length);
  };

  // Check if current ingredient is complete enough
  const isCurrentComplete = currentIngredient && (
    (currentIngredient.is_sandbox && currentIngredient.sandbox_description) ||
    (!currentIngredient.is_sandbox && currentIngredient.name)
  ) && (parseFloat(String(currentIngredient.quantity)) || 0) > 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrev) goToPrev();
      if (e.key === 'ArrowRight' && canGoNext) goToNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoPrev, canGoNext, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {showEducation ? 'Add Ingredients — Guided' : 'Add Ingredients'}
            </h2>
            <p className="text-sm text-gray-400">
              {showEducation ? 'Step-by-step with tips • ' : ''}
              {totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''}
              {sandboxCount > 0 && (
                <span className="ml-2 text-amber-400">
                  ({sandboxCount} sandbox)
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="btn-primary flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Done
        </button>
      </div>

      {/* Progress dots */}
      {hasMultiple && (
        <div className="flex items-center justify-center gap-2 py-3 bg-gray-800/50">
          {localIngredients.map((ing, idx) => (
            <button
              key={ing.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all
                ${idx === currentIndex 
                  ? ing.is_sandbox 
                    ? "bg-amber-400 scale-125" 
                    : "bg-primary-400 scale-125"
                  : ing.is_sandbox
                    ? "bg-amber-500/30 hover:bg-amber-500/50"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              title={`Ingredient ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto">
          {currentIngredient && (
            <IngredientCard
              ingredient={currentIngredient}
              index={currentIndex}
              total={totalIngredients}
              onUpdate={handleUpdate}
              onSelectIngredient={handleSelectIngredient}
              onToggleSandbox={handleToggleSandbox}
              onRemove={handleRemove}
              rawIngredients={rawIngredients}
              preparedItems={preparedItems}
              vendors={vendors}
              showEducation={showEducation}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 bg-gray-800 border-t border-gray-700">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Prev */}
          <button
            onClick={goToPrev}
            disabled={!canGoPrev}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors
              ${canGoPrev 
                ? "bg-gray-700 text-white hover:bg-gray-600" 
                : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          {/* Add Another */}
          <button
            onClick={handleAddAnother}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Another
          </button>

          {/* Next */}
          <button
            onClick={goToNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors
              ${canGoNext 
                ? "bg-gray-700 text-white hover:bg-gray-600" 
                : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Swipe hint for touch */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-xs text-gray-600 pointer-events-none">
        ← Swipe or use arrows to navigate →
      </div>
    </div>
  );
};

export default TabletMode;
