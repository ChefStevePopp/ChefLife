/**
 * FocusView - Full screen immersive cooking mode
 * 
 * Designed for wet/floury hands during cooking:
 * - IMMEDIATELY enters fullscreen on activation
 * - One step at a time, large text
 * - Timer + navigation in bottom action bar
 * - Escape key exits cleanly back to Compact mode
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Timer,
  Thermometer,
  Info,
  Hourglass,
  Play,
  Pause,
  RotateCcw,
  Check,
  Circle,
} from 'lucide-react';
import type { RecipeStep } from '@/features/recipes/types/recipe';
import type { InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import {
  extractStepTitle,
  formatDelay,
  formatTimerDisplay,
  RichTextRenderer,
  ControlPointBadges,
  MediaGallery,
} from './shared';

interface FocusViewProps {
  steps: RecipeStep[];
  recipeName: string;
  blocks: InstructionBlockTemplate[];
  onClose: () => void;
}

export const FocusView: React.FC<FocusViewProps> = ({ steps, recipeName, blocks, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // Hide UI during close
  const containerRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false); // Prevent double-close

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerComplete, setTimerComplete] = useState(false);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const title = extractStepTitle(step.instruction, step.custom_step_label);
  const stepHasTimer = step.time_in_minutes && step.time_in_minutes > 0;
  const isComplete = completedSteps.has(currentStep);
  const hasMedia = step.media && step.media.length > 0;
  const hasControlPoints =
    step.is_critical_control_point ||
    step.is_quality_control_point ||
    (step.warning_level && step.warning_level !== 'low');

  // Reset timer when step changes
  useEffect(() => {
    if (stepHasTimer) {
      setTimerSeconds(step.time_in_minutes! * 60);
      setTimerRunning(false);
      setTimerComplete(false);
    }
  }, [currentStep, step.time_in_minutes, stepHasTimer]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false);
          setTimerComplete(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const resetTimer = () => {
    if (stepHasTimer) {
      setTimerSeconds(step.time_in_minutes! * 60);
      setTimerRunning(false);
      setTimerComplete(false);
    }
  };

  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  }, []);

  // Single clean close handler - prevents double-close
  const handleClose = useCallback(async () => {
    if (isClosingRef.current) return; // Already closing
    isClosingRef.current = true;
    setIsClosing(true); // Hide UI immediately

    // Exit fullscreen if still active
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      }
    } catch (err) {}

    // Call onClose immediately - UI is already hidden
    onClose();
  }, [onClose]);

  // Auto-enter fullscreen immediately
  useEffect(() => {
    const timeout = setTimeout(() => enterFullscreen(), 50);
    return () => clearTimeout(timeout);
  }, [enterFullscreen]);

  // Track fullscreen changes - close when user exits fullscreen via browser (Escape)
  useEffect(() => {
    const handleChange = () => {
      const isNow = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isNow);

      // If we exited fullscreen and we're not already closing, trigger close
      if (!isNow && !isClosingRef.current) {
        handleClose();
      }
    };

    // Small delay to let initial fullscreen enter complete before listening
    const timeout = setTimeout(() => {
      document.addEventListener('fullscreenchange', handleChange);
      document.addEventListener('webkitfullscreenchange', handleChange);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [handleClose]);

  // Don't render anything while closing - prevents the flash of inline UI
  if (isClosing) {
    return null;
  }

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const toggleComplete = () => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(currentStep) ? next.delete(currentStep) : next.add(currentStep);
      return next;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter') {
        toggleComplete();
      } else if (e.key === ' ' && stepHasTimer) {
        e.preventDefault();
        setTimerRunning(r => !r);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, steps.length, stepHasTimer, handleClose]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-white truncate">{recipeName}</h1>
              <p className="text-xs text-gray-500">Focus Mode</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentStep
                      ? 'bg-amber-500 scale-125'
                      : completedSteps.has(i)
                      ? 'bg-emerald-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-white">
              {currentStep + 1}
              <span className="text-gray-500">/{steps.length}</span>
            </span>
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {hasControlPoints && (
            <div className="mb-4">
              <ControlPointBadges step={step} />
            </div>
          )}

          <div className="flex items-start gap-3 sm:gap-4 mb-6">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0 ${
                isComplete ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isComplete ? <Check className="w-6 h-6 sm:w-7 sm:h-7" /> : currentStep + 1}
            </div>
            <div className="pt-1 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white leading-tight">{title}</h2>
              {isComplete && <span className="text-emerald-400 text-sm font-medium">Completed</span>}

              <div className="flex flex-wrap gap-2 mt-2">
                {step.temperature?.value && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-orange-400 font-medium">
                      {step.temperature.value}°{step.temperature.unit}
                    </span>
                  </div>
                )}
                {stepHasTimer && !timerRunning && !timerComplete && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700/50">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{step.time_in_minutes} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`${isComplete ? 'opacity-60' : ''}`}>
            <RichTextRenderer html={step.instruction} blocks={blocks} size="large" />
          </div>

          {step.delay?.value && step.delay.value > 0 && (
            <div className="mt-6 flex items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Hourglass className="w-5 h-5 text-purple-400" />
              <span className="text-base text-purple-300">Wait {formatDelay(step.delay)} before next step</span>
            </div>
          )}

          {step.notes && (
            <div className="mt-6 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">Notes</span>
              </div>
              <p className="text-gray-300">{step.notes}</p>
            </div>
          )}

          {hasMedia && (
            <div className="mt-6">
              <MediaGallery media={step.media!} size="large" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className={`w-12 sm:w-auto sm:px-4 h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                currentStep === 0 ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
              {stepHasTimer ? (
                <>
                  <div
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border ${
                      timerComplete
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : timerRunning
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : 'bg-gray-800 border-gray-700 text-white'
                    }`}
                  >
                    <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-mono text-lg sm:text-xl font-bold">{formatTimerDisplay(timerSeconds)}</span>
                  </div>

                  <button
                    onClick={() => setTimerRunning(r => !r)}
                    disabled={timerComplete}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                      timerComplete
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : timerRunning
                        ? 'bg-amber-500/30 text-amber-400 hover:bg-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    }`}
                  >
                    {timerComplete ? (
                      <Check className="w-5 h-5" />
                    ) : timerRunning ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={resetTimer}
                    className="w-10 h-10 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleComplete}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all ${
                    isComplete
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  <span className="hidden sm:inline">{isComplete ? 'Done' : 'Mark Done'}</span>
                </button>
              )}
            </div>

            <button
              onClick={goNext}
              disabled={currentStep === steps.length - 1}
              className={`w-12 sm:w-auto sm:px-4 h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                currentStep === steps.length - 1
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden sm:flex mt-3 items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">←</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">→</kbd>
              Navigate
            </span>
            {stepHasTimer && (
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Space</kbd>
                Timer
              </span>
            )}
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Enter</kbd>
              Done
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Esc</kbd>
              Exit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusView;
