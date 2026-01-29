/**
 * =============================================================================
 * METHOD TAB - L5/L6 Premium Multi-Mode Recipe Viewer
 * =============================================================================
 *
 * THREE VIEWING MODES (unified switcher):
 *
 * 1. COMPACT MODE (default)
 *    - Dense accordion cards for daily kitchen ops
 *    - Quick reference, minimal scrolling
 *    - Functional, get-it-done aesthetic
 *
 * 2. GUIDED MODE (magazine style)
 *    - HORIZONTAL SIDE-SCROLLING like a cookbook
 *    - Starts INLINE in content area
 *    - Optional fullscreen with F key or button
 *    - L5 SUBTLE GREY PALETTE - images are the star
 *
 * 3. FOCUS MODE (fullscreen)
 *    - One step at a time, immersive
 *    - IMMEDIATELY enters fullscreen on click
 *    - Timer + navigation in bottom action bar
 *    - Designed for wet/floury hands during cooking
 *
 * L5 COLOR PHILOSOPHY:
 * - Food photos are the HERO - UI gets out of the way
 * - Subtle grey palette: neutral-950, neutral-900, neutral-800
 * - Brand amber ONLY for navigation accents
 * - Elegant restraint over visual noise
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Book, Timer, ListOrdered, ShieldAlert } from 'lucide-react';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { getActiveInstructionBlocks } from '@/features/recipes/hooks/useRecipeConfig';
import type { Recipe } from '@/features/recipes/types/recipe';

// Sub-components
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { CompactView } from './CompactView';
import { GuidedView } from './GuidedView';
import { FocusView } from './FocusView';

// Shared utilities
import { formatDuration, calculateTotalTime, type ViewMode } from './shared';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MethodProps {
  recipe: Recipe;
}

export const Method: React.FC<MethodProps> = ({ recipe }) => {
  const { showDiagnostics } = useDiagnostics();
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [guidedFullscreen, setGuidedFullscreen] = useState(false);
  const guidedContainerRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => getActiveInstructionBlocks(), []);
  const hasSteps = recipe.steps && recipe.steps.length > 0;

  const totalTime = useMemo(() => (hasSteps ? calculateTotalTime(recipe.steps) : 0), [recipe.steps, hasSteps]);
  const controlPointCount = useMemo(() => {
    if (!hasSteps) return 0;
    return recipe.steps.filter(s => s.is_critical_control_point || s.is_quality_control_point).length;
  }, [recipe.steps, hasSteps]);

  // Guided fullscreen handlers
  const enterGuidedFullscreen = useCallback(async () => {
    try {
      if (guidedContainerRef.current?.requestFullscreen) {
        await guidedContainerRef.current.requestFullscreen();
        setGuidedFullscreen(true);
      } else if ((guidedContainerRef.current as any)?.webkitRequestFullscreen) {
        await (guidedContainerRef.current as any).webkitRequestFullscreen();
        setGuidedFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  }, []);

  const exitGuidedFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      setGuidedFullscreen(false);
    } catch (err) {}
  }, []);

  const toggleGuidedFullscreen = useCallback(() => {
    if (guidedFullscreen) {
      exitGuidedFullscreen();
    } else {
      enterGuidedFullscreen();
    }
  }, [guidedFullscreen, enterGuidedFullscreen, exitGuidedFullscreen]);

  // Handle fullscreen change events for guided mode
  useEffect(() => {
    const handleChange = () => {
      const isNow = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setGuidedFullscreen(isNow);
    };
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  // Close guided mode
  const closeGuidedMode = useCallback(async () => {
    await exitGuidedFullscreen();
    setViewMode('compact');
  }, [exitGuidedFullscreen]);

  return (
    <>
      <div>
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono mb-4">
            src/features/recipes/components/RecipeViewer/components/Method/index.tsx
          </div>
        )}

        {/* Subheader */}
        <div className="subheader mb-6">
          <div className="subheader-row">
            <div className="subheader-left">
              <div className="subheader-icon-box amber">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <h3 className="subheader-title">Method</h3>
                <p className="subheader-subtitle">
                  {hasSteps ? `${recipe.steps.length} step${recipe.steps.length !== 1 ? 's' : ''} to complete` : 'No steps defined'}
                </p>
              </div>
            </div>

            <div className="subheader-right flex-wrap">
              {hasSteps && (
                <>
                  {totalTime > 0 && (
                    <span className="subheader-pill hidden lg:flex">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="subheader-pill-value">{formatDuration(totalTime)}</span>
                    </span>
                  )}

                  {controlPointCount > 0 && (
                    <span className="subheader-pill hidden lg:flex">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span className="subheader-pill-value text-rose-400">{controlPointCount}</span>
                      <span className="subheader-pill-label">CCP</span>
                    </span>
                  )}

                  <div className="subheader-divider hidden lg:block" />

                  <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* COMPACT MODE */}
        {viewMode === 'compact' && hasSteps && <CompactView recipe={recipe} blocks={blocks} />}

        {/* GUIDED MODE - Inline */}
        {viewMode === 'guided' && hasSteps && !guidedFullscreen && (
          <div ref={guidedContainerRef}>
            <GuidedView
              recipe={recipe}
              blocks={blocks}
              isFullscreen={false}
              onToggleFullscreen={toggleGuidedFullscreen}
              onClose={closeGuidedMode}
            />
          </div>
        )}

        {/* Empty State */}
        {!hasSteps && (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700/50">
            <Book className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No steps have been added to this recipe.</p>
          </div>
        )}
      </div>

      {/* GUIDED MODE - Fullscreen Portal */}
      {viewMode === 'guided' && hasSteps && guidedFullscreen && (
        <div ref={guidedContainerRef} className="fixed inset-0 z-50">
          <GuidedView
            recipe={recipe}
            blocks={blocks}
            isFullscreen={true}
            onToggleFullscreen={toggleGuidedFullscreen}
            onClose={closeGuidedMode}
          />
        </div>
      )}

      {/* FOCUS MODE - Always Fullscreen */}
      {viewMode === 'focus' && hasSteps && (
        <FocusView steps={recipe.steps} recipeName={recipe.name} blocks={blocks} onClose={() => setViewMode('compact')} />
      )}
    </>
  );
};

export default Method;
