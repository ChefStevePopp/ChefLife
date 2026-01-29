/**
 * GuidedView - Horizontal side-scrolling cookbook mode
 * 
 * FLOW:
 * Cover → Ingredient Checkout (flip cards) → Step 1 → Step 2 → ... → Complete
 * 
 * INGREDIENT CHECKOUT:
 * - Same IngredientFlipCard components from Ingredients tab
 * - Max 6 columns, centered, responsive grid
 * - Scale selector for batch cooking
 * - Configurable sourcing instructions (from Module Editor)
 * - Progress tracking with enforcement:
 *   - Omega/Bravo (hasAdminAccess): Soft warning, can proceed
 *   - Everyone else: Hard block, must complete all
 * 
 * AUDIT TRAIL:
 * - Timed for user performance and efficiency auditing
 * - No skip option - solid audit trail, no grey areas
 * 
 * L5 DESIGN ALIGNMENT:
 * - Uses gray-* palette (not neutral-*) for warmth
 * - Containers use slate-800/60 backdrop-blur pattern
 * - Borders use gray-700/40 or gray-700/50
 * - Close button always on right (standard UI convention)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Timer,
  Thermometer,
  Info,
  Hourglass,
  ListOrdered,
  BookOpen,
  CheckCircle,
  ChefHat,
  Scale,
  AlertTriangle,
  ShoppingBasket,
} from 'lucide-react';
import type { Recipe } from '@/features/recipes/types/recipe';
import { useRecipeConfig, type InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import { useMasterIngredientsStore } from '@/stores/masterIngredientsStore';
import { useAuth } from '@/hooks/useAuth';
import IngredientFlipCard from '@/features/recipes/components/IngredientFlipCard';
import {
  extractStepTitle,
  formatDuration,
  formatDelay,
  calculateTotalTime,
  RichTextRenderer,
  ControlPointBadges,
} from './shared';

// Scale options for batch cooking
const SCALE_OPTIONS = [
  { value: 0.5, label: '½×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
  { value: 4, label: '4×' },
];

interface GuidedViewProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
  /** Initial page from URL params (0=cover, 1=ingredients, 2+=steps) */
  initialPage?: number | null;
  onClose: () => void;
}

// ============================================================================
// GUIDED CONTENT - The actual scrolling book UI
// ============================================================================

interface GuidedContentProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
  isFullscreen: boolean;
  initialPage?: number | null;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

const GuidedContent: React.FC<GuidedContentProps> = ({
  recipe,
  blocks,
  isFullscreen,
  initialPage,
  onToggleFullscreen,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(initialPage ?? 0);
  const hasInitialPageApplied = useRef(false);
  
  // Ingredient checkout state
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  const [showScaleDropdown, setShowScaleDropdown] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Get master ingredients for flip cards
  const { ingredients: masterIngredients, fetchIngredients } = useMasterIngredientsStore();
  const { hasAdminAccess } = useAuth();
  
  // Get configurable sourcing instructions from Module Editor
  const { config } = useRecipeConfig();
  const sourcingInstructions = config.sourcingInstructions;
  
  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const steps = recipe.steps || [];
  const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
  
  // Pages: Cover + (Ingredients if any) + Steps + Complete
  const totalPages = steps.length + 2 + (hasIngredients ? 1 : 0);
  const ingredientPageIndex = hasIngredients ? 1 : -1;
  const firstStepIndex = hasIngredients ? 2 : 1;

  // Scroll to initial page on mount (for URL deep linking)
  useEffect(() => {
    if (initialPage && initialPage > 0 && !hasInitialPageApplied.current && scrollContainerRef.current) {
      hasInitialPageApplied.current = true;
      // Small delay to ensure container is rendered with correct dimensions
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const pageWidth = container.clientWidth;
          const targetPage = Math.min(initialPage, totalPages - 1);
          container.scrollTo({ left: targetPage * pageWidth, behavior: 'auto' });
          setCurrentPage(targetPage);
        }
      });
    }
  }, [initialPage, totalPages]);

  const heroImage = useMemo(() => {
    const recipePrimary = recipe.media?.find(m => m.is_primary && m.type === 'image');
    if (recipePrimary) return recipePrimary.url;
    for (const step of steps) {
      const stepImage = step.media?.find(m => m.type === 'image');
      if (stepImage) return stepImage.url;
    }
    return null;
  }, [recipe.media, steps]);

  const totalTime = calculateTotalTime(steps);

  // Ingredient helpers
  const getIngredientInfo = (id: string) => {
    return masterIngredients.find((i) => i.id === id);
  };

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

  const scaleCommonMeasure = (measure: string | undefined) => {
    if (!measure) return null;
    if (scale === 1) return measure;
    
    const match = measure.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return measure;
    
    const [, numStr, rest] = match;
    const num = parseFloat(numStr) * scale;
    
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
  const isCheckoutComplete = totalItems > 0 && checkedCount === totalItems;

  // Memoize ingredient data with master info
  const ingredientsWithMaster = useMemo(() => {
    return (recipe.ingredients || []).map(ingredient => ({
      ingredient,
      masterInfo: getIngredientInfo(ingredient.master_ingredient_id || ingredient.name),
      allergens: ingredient.allergens || [],
    }));
  }, [recipe.ingredients, masterIngredients]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pageWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const newPage = Math.round(scrollLeft / pageWidth);
    setCurrentPage(newPage);
    setShowIncompleteWarning(false); // Hide warning when scrolling
  }, []);

  const goToPage = useCallback((page: number) => {
    // Check if trying to leave ingredient page without completing
    if (hasIngredients && currentPage === ingredientPageIndex && page > ingredientPageIndex) {
      if (!isCheckoutComplete) {
        if (hasAdminAccess) {
          // Soft warning for Omega/Bravo - show warning but allow proceed
          setShowIncompleteWarning(true);
          // Still allow navigation after showing warning
          if (!showIncompleteWarning) {
            return; // First attempt shows warning, second attempt proceeds
          }
        } else {
          // Hard block for everyone else
          setShowIncompleteWarning(true);
          return;
        }
      }
    }
    
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pageWidth = container.clientWidth;
    container.scrollTo({ left: page * pageWidth, behavior: 'smooth' });
    setShowIncompleteWarning(false);
  }, [currentPage, ingredientPageIndex, hasIngredients, isCheckoutComplete, hasAdminAccess, showIncompleteWarning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToPage(Math.min(currentPage + 1, totalPages - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPage(Math.max(currentPage - 1, 0));
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          onToggleFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, goToPage, onClose, isFullscreen, onToggleFullscreen]);

  // Get display label for current page
  const getPageLabel = () => {
    if (currentPage === 0) return 'Cover';
    if (hasIngredients && currentPage === ingredientPageIndex) return 'Mise en Place';
    if (currentPage === totalPages - 1) return 'End';
    const stepNum = currentPage - firstStepIndex + 1;
    return `Step ${stepNum}`;
  };

  // Container height depends on fullscreen state
  const containerHeight = isFullscreen ? 'h-screen' : 'h-[600px] sm:h-[700px]';

  return (
    <div className={`${containerHeight} w-full bg-gray-900 flex flex-col ${isFullscreen ? '' : 'rounded-xl border border-gray-700/50'} overflow-hidden`}>
      {/* Top Navigation Bar - L5 subheader pattern */}
      <div className="flex-shrink-0 bg-slate-800/60 backdrop-blur-sm border-b border-gray-700/40 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Recipe name */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-medium text-white truncate max-w-[150px] sm:max-w-[300px]">
                {recipe.name}
              </h1>
              <p className="text-xs text-gray-500">Guided Mode</p>
            </div>
          </div>

          {/* Right: All controls (standard UI convention) */}
          <div className="flex items-center gap-3">
            {/* Page Dots */}
            <div className="hidden md:flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentPage
                      ? 'bg-amber-500 w-5'
                      : i === ingredientPageIndex && !isCheckoutComplete
                        ? 'bg-emerald-500/50 w-1.5 hover:bg-emerald-500'
                        : 'bg-gray-600 w-1.5 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Page Counter */}
            <span className="text-sm text-gray-400">
              {getPageLabel()}
              <span className="text-gray-600 mx-1">/</span>
              <span className="text-gray-500">{steps.length} steps</span>
            </span>

            {/* Nav Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  currentPage === 0
                    ? 'text-gray-700 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage === totalPages - 1}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  currentPage === totalPages - 1
                    ? 'text-gray-700 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-all"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* Close button - always on right (standard UI convention) */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-all"
              title="Exit Guided mode (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex h-full" style={{ width: `${totalPages * 100}%` }}>
          
          {/* ================================================================
           * PAGE 0: COVER
           * Stats order: Ingredients → Steps → Time
           * ================================================================ */}
          <div
            className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center relative overflow-hidden"
            style={{ width: `${100 / totalPages}%` }}
          >
            {heroImage && (
              <>
                <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/70 to-gray-900/50" />
              </>
            )}

            <div className="relative z-10 max-w-xl mx-auto px-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <BookOpen className="w-7 h-7 text-amber-400/80" />
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-white mb-4 leading-tight tracking-tight">
                {recipe.name}
              </h1>

              {recipe.description && (
                <p className="text-sm sm:text-base text-gray-400 mb-6 leading-relaxed font-light">
                  {recipe.description}
                </p>
              )}

              {/* Stats: Ingredients → Steps → Time */}
              <div className="flex items-center justify-center gap-6 text-gray-400">
                {hasIngredients && (
                  <div className="flex items-center gap-2">
                    <ShoppingBasket className="w-4 h-4 text-emerald-400/60" />
                    <span className="text-sm font-light">{totalItems} ingredients</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-amber-400/60" />
                  <span className="text-sm font-light">{steps.length} steps</span>
                </div>
                {totalTime > 0 && (
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400/60" />
                    <span className="text-sm font-light">{formatDuration(totalTime)}</span>
                  </div>
                )}
              </div>

              <div className="mt-10 flex items-center justify-center gap-2 text-gray-600">
                <span className="text-xs font-light">swipe or use arrows</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* ================================================================
           * PAGE 1: INGREDIENT CHECKOUT (Mise en Place)
           * L5 subheader pattern for header area
           * ================================================================ */}
          {hasIngredients && (
            <div
              className="w-full h-full flex-shrink-0 snap-start snap-always flex flex-col overflow-hidden bg-gray-900"
              style={{ width: `${100 / totalPages}%` }}
            >
              {/* Header - L5 subheader pattern */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700/40 bg-slate-800/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <ShoppingBasket className="w-5 h-5 text-emerald-400/80" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-white">Mise en Place</h2>
                      <p className="text-xs text-gray-500">Gather all ingredients before you begin</p>
                    </div>
                  </div>
                  
                  {/* Scale Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowScaleDropdown(!showScaleDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors border border-gray-600/50"
                    >
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-white">
                        {scale === 1 ? '1× Batch' : `${scale}× Batch`}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showScaleDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showScaleDropdown && (
                      <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[120px]">
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
                </div>

                {/* Expandable Sourcing Instructions (from Module Editor) */}
                {sourcingInstructions?.enabled && (
                  <div className={`mt-3 rounded-lg border transition-all ${isInfoExpanded ? 'bg-gray-800/50 border-emerald-500/30' : 'bg-gray-800/30 border-gray-700/50'}`}>
                    <button
                      onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                      className="w-full flex items-center justify-between px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-200">{sourcingInstructions.title}</span>
                      </div>
                      <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
                    </button>
                    {isInfoExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-gray-700/50">
                        <p className="text-sm text-gray-400 whitespace-pre-line mt-2">
                          {sourcingInstructions.body}
                        </p>
                        {sourcingInstructions.footer && (
                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700/30">
                            {sourcingInstructions.footer}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-gray-300">{checkedCount} / {totalItems}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${isCheckoutComplete ? 'bg-emerald-500' : 'bg-emerald-500/70'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  {isCheckoutComplete && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Ready!</span>
                    </div>
                  )}
                </div>

                {/* Incomplete Warning */}
                {showIncompleteWarning && !isCheckoutComplete && (
                  <div className={`mt-3 flex items-center gap-2 p-3 rounded-lg border ${
                    hasAdminAccess 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${hasAdminAccess ? 'text-amber-400' : 'text-rose-400'}`} />
                    <span className={`text-sm ${hasAdminAccess ? 'text-amber-300' : 'text-rose-300'}`}>
                      {hasAdminAccess 
                        ? `${totalItems - checkedCount} items unchecked. Tap again to proceed anyway.`
                        : `Please check all ${totalItems - checkedCount} remaining items before proceeding.`
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Ingredient Grid - Max 6 columns, centered, responsive */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-[1400px] mx-auto">
                  <div 
                    className="grid gap-4"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
                  >
                  {ingredientsWithMaster.map(({ ingredient, masterInfo, allergens }) => {
                    const isChecked = checkedItems.has(ingredient.id);
                    const scaledMeasure = scaleCommonMeasure(ingredient.common_measure || ingredient.commonMeasure);
                    
                    const ingredientAllergens = allergens.length > 0 
                      ? allergens 
                      : masterInfo 
                        ? Object.entries(masterInfo)
                            .filter(([key, value]) => key.startsWith('allergen_') && !key.includes('may_contain') && !key.includes('custom') && !key.includes('notes') && value === true)
                            .map(([key]) => key.replace('allergen_', ''))
                        : [];
                    
                    return (
                      <div key={ingredient.id} className="aspect-[9/16]">
                        <IngredientFlipCard
                          ingredient={{
                            ...ingredient,
                            allergens: ingredientAllergens,
                          }}
                          masterInfo={masterInfo}
                          scaledMeasure={scaledMeasure}
                          isChecked={isChecked}
                          onToggleCheck={() => toggleChecked(ingredient.id)}
                        />
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* Bottom: Proceed Button */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700/40 bg-slate-800/60">
                <button
                  onClick={() => goToPage(firstStepIndex)}
                  disabled={!isCheckoutComplete && !hasAdminAccess}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    isCheckoutComplete
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : hasAdminAccess
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isCheckoutComplete ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Start Cooking</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <span>{totalItems - checkedCount} items remaining</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
           * STEP PAGES
           * ================================================================ */}
          {steps.map((step, index) => {
            const title = extractStepTitle(step.instruction, step.custom_step_label);
            const hasControlPoints =
              step.is_critical_control_point ||
              step.is_quality_control_point ||
              (step.warning_level && step.warning_level !== 'low');
            const stepImage = step.media?.find(m => m.type === 'image');

            return (
              <div
                key={step.id}
                className="w-full h-full flex-shrink-0 snap-start snap-always flex items-stretch overflow-hidden"
                style={{ width: `${100 / totalPages}%` }}
              >
                <div className={`flex flex-col lg:flex-row w-full h-full ${index % 2 === 0 ? '' : 'lg:flex-row-reverse'}`}>
                  {/* Image Column */}
                  <div
                    className={`lg:w-1/2 h-2/5 lg:h-full flex-shrink-0 relative ${
                      stepImage ? '' : 'hidden lg:flex lg:items-center lg:justify-center bg-gray-800/30'
                    }`}
                  >
                    {stepImage ? (
                      <>
                        <img
                          src={stepImage.url}
                          alt={stepImage.title || `Step ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-${index % 2 === 0 ? 'r' : 'l'} from-transparent via-transparent to-gray-900/80 hidden lg:block`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent lg:hidden" />
                      </>
                    ) : (
                      <div className="text-center text-gray-700">
                        <ChefHat className="w-10 h-10 mx-auto" />
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10 overflow-y-auto bg-gray-900">
                    <div className="max-w-md w-full">
                      {hasControlPoints && (
                        <div className="mb-3">
                          <ControlPointBadges step={step} size="normal" subtle />
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            hasControlPoints
                              ? 'bg-rose-500/10 border border-rose-500/20'
                              : 'bg-gray-800/50 border border-gray-700/50'
                          }`}
                        >
                          <span className={`text-lg sm:text-xl font-light ${hasControlPoints ? 'text-rose-400/80' : 'text-amber-400/80'}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="pt-1 flex-1">
                          <h2 className="text-base sm:text-lg lg:text-xl font-medium text-white leading-tight tracking-tight">
                            {title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {step.time_in_minutes && step.time_in_minutes > 0 && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Timer className="w-3 h-3" />
                                <span className="text-xs font-light">{step.time_in_minutes} min</span>
                              </span>
                            )}
                            {step.temperature?.value && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Thermometer className="w-3 h-3" />
                                <span className="text-xs font-light">
                                  {step.temperature.value}°{step.temperature.unit}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <RichTextRenderer html={step.instruction} blocks={blocks} size="guided" subtle />

                      {step.delay?.value && step.delay.value > 0 && (
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                          <Hourglass className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-sm text-gray-400 font-light">Wait {formatDelay(step.delay)}</span>
                        </div>
                      )}

                      {step.notes && (
                        <div className="mt-4 p-2.5 rounded-lg bg-gray-800/30 border border-gray-700/30">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Info className="w-3 h-3 text-gray-600" />
                            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">Note</span>
                          </div>
                          <p className="text-sm text-gray-400 font-light italic">{step.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ================================================================
           * COMPLETION PAGE
           * ================================================================ */}
          <div
            className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center bg-gray-900"
            style={{ width: `${100 / totalPages}%` }}
          >
            <div className="text-center px-8 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400/80" />
              </div>

              <h2 className="text-xl sm:text-2xl font-light text-white mb-3 tracking-tight">Recipe Complete</h2>

              <p className="text-sm text-gray-500 mb-8 font-light">{recipe.name}</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(0)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-all border border-gray-700/50 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="font-light">Restart</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/20 transition-all border border-amber-500/20 text-sm"
                >
                  <X className="w-4 h-4" />
                  <span className="font-light">Exit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Page Indicator (Mobile) */}
      <div className="flex-shrink-0 md:hidden bg-slate-800/60 border-t border-gray-700/40 py-2 px-4">
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`h-1 rounded-full transition-all ${
                i === currentPage 
                  ? 'bg-amber-500/80 w-4' 
                  : i === ingredientPageIndex && !isCheckoutComplete
                    ? 'bg-emerald-500/50 w-1'
                    : 'bg-gray-700 w-1 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

// ============================================================================
// MAIN GUIDED VIEW - Manages fullscreen state and portal rendering
// ============================================================================

export const GuidedView: React.FC<GuidedViewProps> = ({
  recipe,
  blocks,
  initialPage,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // When fullscreen, render via portal to escape parent containers
  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-900">
        <GuidedContent
          recipe={recipe}
          blocks={blocks}
          isFullscreen={true}
          initialPage={initialPage}
          onToggleFullscreen={toggleFullscreen}
          onClose={onClose}
        />
      </div>,
      document.body
    );
  }

  // Inline mode - render normally
  return (
    <GuidedContent
      recipe={recipe}
      blocks={blocks}
      isFullscreen={false}
      initialPage={initialPage}
      onToggleFullscreen={toggleFullscreen}
      onClose={onClose}
    />
  );
};

export default GuidedView;
