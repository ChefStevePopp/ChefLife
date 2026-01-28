/**
 * =============================================================================
 * METHOD TAB - L6 Premium Focus View
 * =============================================================================
 * 
 * Two viewing modes:
 * 
 * 1. LIST VIEW (default)
 *    - All steps visible in a scrollable list
 *    - Compact but readable
 *    - Good for quick reference and overview
 * 
 * 2. FOCUS VIEW (full-screen immersive)
 *    - One step at a time, large typography
 *    - Designed for active cooking with wet/floury hands
 *    - Progress bar, step counter, navigation
 *    - Rich text + callout blocks rendered beautifully
 *    - Optional timer for timed steps
 *    - Swipe or tap to navigate
 * 
 * Tablet-first design for kitchen iPads.
 * =============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Book, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  Thermometer,
  RotateCcw as FifoIcon,
  ShieldAlert,
  Clock,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Utensils,
  Circle,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getActiveInstructionBlocks, type InstructionBlockTemplate } from "@/features/recipes/hooks/useRecipeConfig";
import type { Recipe, RecipeStep } from "../../../types/recipe";

// ============================================================================
// TYPES
// ============================================================================

interface MethodProps {
  recipe: Recipe;
}

interface ParsedContent {
  type: 'text' | 'callout' | 'list' | 'heading' | 'task-list';
  content: string;
  calloutType?: string;
  level?: number;
  items?: string[];
  checked?: boolean[];
}

// ============================================================================
// ICON MAP for Callouts
// ============================================================================

const CALLOUT_ICONS: Record<string, React.ElementType> = {
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  Info,
  RotateCcw: FifoIcon,
  Thermometer,
  ShieldAlert,
  Clock,
  Flame,
  Snowflake,
  CheckCircle,
  Eye,
  Utensils,
};

// ============================================================================
// CALLOUT COLOR CONFIG
// ============================================================================

const CALLOUT_COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  emerald: { bg: 'bg-emerald-950/60', border: 'border-l-emerald-500', icon: 'text-emerald-400', text: 'text-emerald-100' },
  amber: { bg: 'bg-amber-950/60', border: 'border-l-amber-500', icon: 'text-amber-400', text: 'text-amber-100' },
  rose: { bg: 'bg-rose-950/60', border: 'border-l-rose-500', icon: 'text-rose-400', text: 'text-rose-100' },
  blue: { bg: 'bg-blue-950/60', border: 'border-l-blue-500', icon: 'text-blue-400', text: 'text-blue-100' },
  cyan: { bg: 'bg-cyan-950/60', border: 'border-l-cyan-500', icon: 'text-cyan-400', text: 'text-cyan-100' },
  orange: { bg: 'bg-orange-950/60', border: 'border-l-orange-500', icon: 'text-orange-400', text: 'text-orange-100' },
  purple: { bg: 'bg-purple-950/60', border: 'border-l-purple-500', icon: 'text-purple-400', text: 'text-purple-100' },
  lime: { bg: 'bg-lime-950/60', border: 'border-l-lime-500', icon: 'text-lime-400', text: 'text-lime-100' },
  pink: { bg: 'bg-pink-950/60', border: 'border-l-pink-500', icon: 'text-pink-400', text: 'text-pink-100' },
  teal: { bg: 'bg-teal-950/60', border: 'border-l-teal-500', icon: 'text-teal-400', text: 'text-teal-100' },
  primary: { bg: 'bg-primary-950/60', border: 'border-l-primary-500', icon: 'text-primary-400', text: 'text-primary-100' },
};

// ============================================================================
// HTML PARSER - Converts rich text HTML to renderable components
// ============================================================================

const RichTextRenderer: React.FC<{ 
  html: string; 
  blocks: InstructionBlockTemplate[];
  size?: 'normal' | 'large';
}> = ({ html, blocks, size = 'normal' }) => {
  if (!html || html === '<p></p>') {
    return <span className="text-gray-500 italic">No instructions</span>;
  }

  // Parse HTML and render with proper styling
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const renderNode = (node: Node, key: number): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map((child, i) => renderNode(child, i));

    // Size classes
    const textSize = size === 'large' ? 'text-xl lg:text-2xl' : 'text-base';
    const headingSize = size === 'large' ? 'text-2xl lg:text-3xl' : 'text-lg';
    const subheadingSize = size === 'large' ? 'text-xl lg:text-2xl' : 'text-base';

    switch (tagName) {
      case 'p':
        return <p key={key} className={`${textSize} text-gray-200 leading-relaxed mb-4 last:mb-0`}>{children}</p>;
      
      case 'h2':
        return <h2 key={key} className={`${headingSize} font-semibold text-white mt-6 mb-3 pb-2 border-b border-amber-500/30`}>{children}</h2>;
      
      case 'h3':
        return <h3 key={key} className={`${subheadingSize} font-medium text-white mt-4 mb-2`}>{children}</h3>;
      
      case 'strong':
      case 'b':
        return <strong key={key} className="font-semibold text-white">{children}</strong>;
      
      case 'em':
      case 'i':
        return <em key={key} className="italic text-gray-300">{children}</em>;
      
      case 'u':
        return <u key={key} className="underline decoration-amber-500 decoration-2 underline-offset-2">{children}</u>;
      
      case 's':
      case 'strike':
        return <s key={key} className="line-through text-gray-500">{children}</s>;
      
      case 'mark':
        return <mark key={key} className="bg-amber-500/30 text-amber-100 px-1 rounded">{children}</mark>;
      
      case 'ul':
        return (
          <ul key={key} className={`${textSize} list-none space-y-2 my-4 ml-1`}>
            {children}
          </ul>
        );
      
      case 'ol':
        return (
          <ol key={key} className={`${textSize} list-none space-y-2 my-4 ml-1 counter-reset-item`}>
            {children}
          </ol>
        );
      
      case 'li':
        // Check if it's inside a task list
        const isTask = element.hasAttribute('data-type') && element.getAttribute('data-type') === 'taskItem';
        const isChecked = element.hasAttribute('data-checked') && element.getAttribute('data-checked') === 'true';
        
        if (isTask) {
          return (
            <li key={key} className={`flex items-start gap-3 ${isChecked ? 'opacity-60' : ''}`}>
              <span className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                isChecked 
                  ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400' 
                  : 'border-gray-600'
              }`}>
                {isChecked && <Check className="w-3 h-3" />}
              </span>
              <span className={isChecked ? 'line-through text-gray-500' : 'text-gray-200'}>{children}</span>
            </li>
          );
        }
        
        // Check parent for list type
        const parentTag = element.parentElement?.tagName.toLowerCase();
        if (parentTag === 'ol') {
          return (
            <li key={key} className="flex items-start gap-3 text-gray-200">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-sm font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {key + 1}
              </span>
              <span>{children}</span>
            </li>
          );
        }
        
        return (
          <li key={key} className="flex items-start gap-3 text-gray-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2.5" />
            <span>{children}</span>
          </li>
        );
      
      case 'blockquote':
        return (
          <blockquote key={key} className="border-l-4 border-gray-600 pl-4 my-4 text-gray-400 italic">
            {children}
          </blockquote>
        );
      
      case 'hr':
        return <hr key={key} className="border-gray-700 my-6" />;
      
      case 'div':
        // Check for callout blocks
        if (element.hasAttribute('data-callout')) {
          const calloutType = element.getAttribute('data-callout-type') || 'info';
          const blockConfig = blocks.find(b => b.type === calloutType);
          const colorConfig = CALLOUT_COLORS[blockConfig?.color || 'blue'] || CALLOUT_COLORS.blue;
          const IconComponent = CALLOUT_ICONS[blockConfig?.icon || 'Info'] || Info;
          const label = blockConfig?.label || calloutType;

          return (
            <div 
              key={key} 
              className={`rounded-xl border-l-4 p-4 my-4 ${colorConfig.bg} ${colorConfig.border}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorConfig.icon}`}
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${colorConfig.icon}`}>
                  {label}
                </span>
              </div>
              <div className={`${size === 'large' ? 'text-lg' : 'text-sm'} ${colorConfig.text} leading-relaxed`}>
                {children}
              </div>
            </div>
          );
        }
        return <div key={key}>{children}</div>;
      
      default:
        return <span key={key}>{children}</span>;
    }
  };

  const bodyChildren = Array.from(doc.body.childNodes);
  return <div className="rich-text-content">{bodyChildren.map((node, i) => renderNode(node, i))}</div>;
};

// ============================================================================
// TIMER COMPONENT
// ============================================================================

const StepTimer: React.FC<{ 
  initialSeconds: number;
  onComplete?: () => void;
}> = ({ initialSeconds, onComplete }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            onComplete?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, seconds, onComplete]);

  const reset = () => {
    setSeconds(initialSeconds);
    setIsRunning(false);
    setIsComplete(false);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl ${
      isComplete ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-800/60 border border-gray-700/50'
    }`}>
      {/* Progress Ring */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
            className={isComplete ? "text-emerald-500" : "text-amber-500"}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Timer className={`w-6 h-6 ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>
      </div>

      {/* Time Display */}
      <div className="flex-1">
        <div className={`text-3xl font-mono font-bold ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
          {formatTime(seconds)}
        </div>
        <div className="text-sm text-gray-400">
          {isComplete ? 'Timer complete!' : isRunning ? 'Running...' : 'Ready'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isComplete && (
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRunning 
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        )}
        <button
          onClick={reset}
          className="w-12 h-12 rounded-full bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// FOCUS VIEW - Full Screen Immersive Mode
// ============================================================================

interface FocusViewProps {
  steps: RecipeStep[];
  recipeName: string;
  blocks: InstructionBlockTemplate[];
  onClose: () => void;
}

const FocusView: React.FC<FocusViewProps> = ({ steps, recipeName, blocks, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // ========================================
  // FULLSCREEN API
  // ========================================
  
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          // Safari
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          // IE11
          await (containerRef.current as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, []);

  // Auto-enter fullscreen on mount
  useEffect(() => {
    // Small delay to ensure the component is mounted (helps with some browsers)
    const timeout = setTimeout(() => {
      enterFullscreen();
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [enterFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    let wasFullscreen = false;
    
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      // Only close if we WERE in fullscreen and now we're not
      // This prevents closing when fullscreen fails to enter initially
      if (wasFullscreen && !isNowFullscreen) {
        onClose();
      }
      
      wasFullscreen = isNowFullscreen;
      setIsFullscreen(isNowFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [onClose]);

  const handleClose = useCallback(async () => {
    await exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  const goNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const toggleComplete = useCallback(() => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(currentStep)) {
        next.delete(currentStep);
      } else {
        next.add(currentStep);
      }
      return next;
    });
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        // Let the fullscreen API handle Esc - it will trigger handleClose via the event listener
        // But if not in fullscreen, close directly
        if (!document.fullscreenElement) {
          handleClose();
        }
      } else if (e.key === 'Enter') {
        toggleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, handleClose, toggleComplete]);

  const isComplete = completedSteps.has(currentStep);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              title="Exit Focus Mode (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{recipeName}</h1>
              <p className="text-sm text-gray-400">Focus Mode</p>
            </div>
          </div>
          
          {/* Step Counter & Fullscreen Toggle */}
          <div className="flex items-center gap-4">
            {/* Step dots */}
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentStep 
                      ? 'bg-amber-500 scale-125' 
                      : completedSteps.has(i)
                        ? 'bg-emerald-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-medium text-white">
              {currentStep + 1} <span className="text-gray-500">/ {steps.length}</span>
            </span>
            
            {/* Fullscreen toggle */}
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                title="Enter Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
          {/* Stage Badge */}
          {step.stage && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {step.stage}
            </div>
          )}

          {/* Step Number - Large */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center text-2xl lg:text-3xl font-bold transition-all ${
              isComplete 
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50' 
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isComplete ? <Check className="w-8 h-8 lg:w-10 lg:h-10" /> : currentStep + 1}
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-semibold text-white">
                Step {currentStep + 1}
              </h2>
              {isComplete && (
                <span className="text-emerald-400 text-sm font-medium">Completed</span>
              )}
            </div>
          </div>

          {/* Instruction Content */}
          <div className={`mb-8 ${isComplete ? 'opacity-60' : ''}`}>
            <RichTextRenderer html={step.instruction} blocks={blocks} size="large" />
          </div>

          {/* Notes */}
          {step.notes && (
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">Notes</span>
              </div>
              <p className="text-gray-300">{step.notes}</p>
            </div>
          )}

          {/* Timer (if step has time_in_minutes) */}
          {step.time_in_minutes && step.time_in_minutes > 0 && (
            <div className="mb-8">
              <StepTimer initialSeconds={step.time_in_minutes * 60} />
            </div>
          )}

          {/* Mark Complete Button */}
          <button
            onClick={toggleComplete}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-all ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {isComplete ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Completed - Tap to Undo
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Circle className="w-5 h-5" />
                Mark Step Complete
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all ${
              currentStep === 0
                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          
          <button
            onClick={goNext}
            disabled={currentStep === steps.length - 1}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all ${
              currentStep === steps.length - 1
                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Keyboard hint */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">→</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Enter</kbd>
            Complete
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Esc</kbd>
            Exit
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LIST VIEW - Step List (Default)
// ============================================================================

interface StepCardProps {
  step: RecipeStep;
  index: number;
  blocks: InstructionBlockTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, blocks, isExpanded, onToggle }) => {
  return (
    <div 
      className={`bg-gray-800/50 rounded-xl border transition-all ${
        isExpanded ? 'border-amber-500/30' : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-4 text-left"
      >
        {/* Step Number */}
        <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold">
          {index + 1}
        </div>
        
        {/* Preview */}
        <div className="flex-1 min-w-0">
          {step.stage && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium mb-1">
              {step.stage}
            </span>
          )}
          <div className={`text-white ${isExpanded ? '' : 'line-clamp-2'}`}>
            {isExpanded ? (
              <RichTextRenderer html={step.instruction} blocks={blocks} />
            ) : (
              // Strip HTML for preview
              <p className="text-gray-300">
                {step.instruction.replace(/<[^>]*>/g, '').substring(0, 150)}
                {step.instruction.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <ChevronRight className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isExpanded && step.notes && (
        <div className="px-4 pb-4 pt-0 ml-14">
          <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/30">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">Notes</span>
            </div>
            <p className="text-sm text-gray-400">{step.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Method: React.FC<MethodProps> = ({ recipe }) => {
  const { showDiagnostics } = useDiagnostics();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Load instruction blocks from config
  const blocks = useMemo(() => getActiveInstructionBlocks(), []);

  const hasSteps = recipe.steps && recipe.steps.length > 0;

  return (
    <>
      <div className="space-y-6">
        {/* L5 Diagnostic Path */}
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono">
            src/features/recipes/components/RecipeViewer/components/Method.tsx
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Book className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Method</h2>
              <p className="text-sm text-gray-400">
                {hasSteps ? `${recipe.steps.length} steps` : 'No steps yet'}
              </p>
            </div>
          </div>

          {/* Focus Mode Button */}
          {hasSteps && (
            <button
              onClick={() => setIsFocusMode(true)}
              className="btn-primary"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Focus Mode
            </button>
          )}
        </div>

        {/* Step List */}
        {hasSteps ? (
          <div className="space-y-3">
            {recipe.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                blocks={blocks}
                isExpanded={expandedStep === index}
                onToggle={() => setExpandedStep(expandedStep === index ? null : index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700/50">
            <Book className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No steps have been added to this recipe.</p>
          </div>
        )}
      </div>

      {/* Focus Mode Overlay */}
      {isFocusMode && hasSteps && (
        <FocusView
          steps={recipe.steps}
          recipeName={recipe.name}
          blocks={blocks}
          onClose={() => setIsFocusMode(false)}
        />
      )}
    </>
  );
};

export default Method;
