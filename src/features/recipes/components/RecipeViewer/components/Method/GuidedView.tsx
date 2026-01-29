/**
 * GuidedView - Horizontal side-scrolling cookbook mode
 * 
 * Magazine-style presentation:
 * - Starts INLINE in content area
 * - Optional fullscreen with F key or button
 * - L5 subtle grey palette - images are the star
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Timer,
  Thermometer,
  Info,
  Hourglass,
  ListOrdered,
  BookOpen,
  CheckCircle,
  ChefHat,
} from 'lucide-react';
import type { Recipe } from '@/features/recipes/types/recipe';
import type { InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import {
  extractStepTitle,
  formatDuration,
  formatDelay,
  calculateTotalTime,
  RichTextRenderer,
  ControlPointBadges,
} from './shared';

interface GuidedViewProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const GuidedView: React.FC<GuidedViewProps> = ({
  recipe,
  blocks,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const steps = recipe.steps || [];
  const totalPages = steps.length + 2; // Cover + steps + completion

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

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pageWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const newPage = Math.round(scrollLeft / pageWidth);
    setCurrentPage(newPage);
  }, []);

  const goToPage = useCallback((page: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pageWidth = container.clientWidth;
    container.scrollTo({ left: page * pageWidth, behavior: 'smooth' });
  }, []);

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

  const containerHeight = isFullscreen ? 'h-screen' : 'h-[600px] sm:h-[700px]';

  return (
    <div className={`${containerHeight} bg-neutral-950 flex flex-col rounded-xl overflow-hidden border border-neutral-800/50`}>
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800/50 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {isFullscreen && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700/80 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-sm font-medium text-neutral-200 truncate max-w-[150px] sm:max-w-[300px]">
                {recipe.name}
              </h1>
              <p className="text-xs text-neutral-600">Guided Mode</p>
            </div>
          </div>

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
                      : 'bg-neutral-700 w-1.5 hover:bg-neutral-600'
                  }`}
                />
              ))}
            </div>

            {/* Page Counter */}
            <span className="text-sm text-neutral-500">
              {currentPage === 0 ? 'Cover' : currentPage === totalPages - 1 ? 'End' : `${currentPage}`}
              <span className="text-neutral-700 mx-1">/</span>
              <span className="text-neutral-600">{steps.length}</span>
            </span>

            {/* Nav Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  currentPage === 0
                    ? 'text-neutral-800 cursor-not-allowed'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage === totalPages - 1}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  currentPage === totalPages - 1
                    ? 'text-neutral-800 cursor-not-allowed'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-all"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
          {/* TITLE PAGE */}
          <div
            className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center relative overflow-hidden"
            style={{ width: `${100 / totalPages}%` }}
          >
            {heroImage && (
              <>
                <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/70 to-neutral-950/50" />
              </>
            )}

            <div className="relative z-10 max-w-xl mx-auto px-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-neutral-800/50 border border-neutral-700/50 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <BookOpen className="w-7 h-7 text-amber-500/80" />
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-neutral-100 mb-4 leading-tight tracking-tight">
                {recipe.name}
              </h1>

              {recipe.description && (
                <p className="text-sm sm:text-base text-neutral-400 mb-6 leading-relaxed font-light">
                  {recipe.description}
                </p>
              )}

              <div className="flex items-center justify-center gap-6 text-neutral-500">
                {totalTime > 0 && (
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-500/60" />
                    <span className="text-sm font-light">{formatDuration(totalTime)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-amber-500/60" />
                  <span className="text-sm font-light">{steps.length} steps</span>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-2 text-neutral-700">
                <span className="text-xs font-light">swipe or use arrows</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* STEP PAGES */}
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
                      stepImage ? '' : 'hidden lg:flex lg:items-center lg:justify-center bg-neutral-900/30'
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
                          className={`absolute inset-0 bg-gradient-to-${index % 2 === 0 ? 'r' : 'l'} from-transparent via-transparent to-neutral-950/80 hidden lg:block`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent lg:hidden" />
                      </>
                    ) : (
                      <div className="text-center text-neutral-800">
                        <ChefHat className="w-10 h-10 mx-auto" />
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10 overflow-y-auto bg-neutral-950">
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
                              : 'bg-neutral-800/50 border border-neutral-700/50'
                          }`}
                        >
                          <span className={`text-lg sm:text-xl font-light ${hasControlPoints ? 'text-rose-400/80' : 'text-amber-500/80'}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="pt-1 flex-1">
                          <h2 className="text-base sm:text-lg lg:text-xl font-medium text-neutral-100 leading-tight tracking-tight">
                            {title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {step.time_in_minutes && step.time_in_minutes > 0 && (
                              <span className="flex items-center gap-1 text-neutral-600">
                                <Timer className="w-3 h-3" />
                                <span className="text-xs font-light">{step.time_in_minutes} min</span>
                              </span>
                            )}
                            {step.temperature?.value && (
                              <span className="flex items-center gap-1 text-neutral-600">
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
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                          <Hourglass className="w-3.5 h-3.5 text-neutral-600" />
                          <span className="text-sm text-neutral-500 font-light">Wait {formatDelay(step.delay)}</span>
                        </div>
                      )}

                      {step.notes && (
                        <div className="mt-4 p-2.5 rounded-lg bg-neutral-900/30 border border-neutral-800/30">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Info className="w-3 h-3 text-neutral-700" />
                            <span className="text-[10px] font-medium text-neutral-700 uppercase tracking-wider">Note</span>
                          </div>
                          <p className="text-sm text-neutral-500 font-light italic">{step.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* COMPLETION PAGE */}
          <div
            className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center bg-neutral-950"
            style={{ width: `${100 / totalPages}%` }}
          >
            <div className="text-center px-8 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-neutral-900/50 border border-neutral-800/50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-500/60" />
              </div>

              <h2 className="text-xl sm:text-2xl font-light text-neutral-200 mb-3 tracking-tight">Recipe Complete</h2>

              <p className="text-sm text-neutral-600 mb-8 font-light">{recipe.name}</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(0)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-all border border-neutral-800/50 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="font-light">Restart</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/20 transition-all border border-amber-500/20 text-sm"
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
      <div className="flex-shrink-0 md:hidden bg-neutral-900/80 border-t border-neutral-800/50 py-2 px-4">
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`h-1 rounded-full transition-all ${
                i === currentPage ? 'bg-amber-500/80 w-4' : 'bg-neutral-800 w-1 hover:bg-neutral-700'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default GuidedView;
