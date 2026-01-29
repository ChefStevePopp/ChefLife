/**
 * CompactView - Dense accordion cards for daily kitchen ops
 */

import React, { useState } from 'react';
import { 
  ChevronDown, 
  Timer, 
  Thermometer, 
  Image as ImageIcon,
  Info,
  Hourglass 
} from 'lucide-react';
import type { Recipe, RecipeStep, RecipeStage } from '@/features/recipes/types/recipe';
import type { InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';
import { 
  extractStepTitle, 
  formatDuration, 
  formatDelay,
  groupStepsByStage,
  MediaGallery,
  RichTextRenderer,
  ControlPointBadges,
  type StepsByStage
} from './shared';

// ============================================================================
// COMPACT STEP CARD
// ============================================================================

interface CompactStepCardProps {
  step: RecipeStep;
  index: number;
  blocks: InstructionBlockTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
}

const CompactStepCard: React.FC<CompactStepCardProps> = ({ 
  step, 
  index, 
  blocks, 
  isExpanded, 
  onToggle 
}) => {
  const title = extractStepTitle(step.instruction, step.custom_step_label);
  const hasControlPoints = step.is_critical_control_point || step.is_quality_control_point || (step.warning_level && step.warning_level !== 'low');
  const hasMedia = step.media && step.media.length > 0;
  const mediaCount = step.media?.length || 0;
  
  return (
    <div className={`rounded-xl overflow-hidden border transition-all duration-300 ${
      hasControlPoints 
        ? `border-rose-500/30 ${isExpanded ? 'bg-gray-800/50' : 'bg-gray-800/30'}` 
        : isExpanded 
          ? 'border-gray-700 bg-gray-800/50' 
          : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
    }`}>
      {/* Header Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/20 transition-colors text-left"
      >
        {/* Step Number */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasControlPoints 
            ? 'bg-rose-500/20 text-rose-400' 
            : 'bg-gray-800 text-gray-400'
        }`}>
          <span className="text-sm font-semibold">{index + 1}</span>
        </div>
        
        {/* Title & Badges */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-200 truncate">{title}</h3>
          {hasControlPoints && (
            <div className="mt-1 hidden sm:block">
              <ControlPointBadges step={step} size="small" />
            </div>
          )}
        </div>
        
        {/* Meta Pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {step.temperature?.value && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 text-orange-400">
              <Thermometer className="w-3 h-3" />
              <span className="text-xs font-medium">{step.temperature.value}°</span>
            </div>
          )}
          
          {step.time_in_minutes && step.time_in_minutes > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-gray-400">
              <Timer className="w-3 h-3" />
              <span className="text-xs">{step.time_in_minutes}m</span>
            </div>
          )}
          
          {hasMedia && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-gray-500">
              <ImageIcon className="w-3 h-3" />
              <span className="text-xs">{mediaCount}</span>
            </div>
          )}
          
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Content Area - Gold Standard: border-t separator + subtle bg for density */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-4 border-t border-gray-700/50 bg-gray-950/40">
          {/* Mobile Control Points */}
          {hasControlPoints && (
            <div className="mb-3 sm:hidden">
              <ControlPointBadges step={step} />
            </div>
          )}
          
          {/* Mobile Meta */}
          <div className="flex flex-wrap gap-2 mb-3 sm:hidden">
            {step.temperature?.value && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-400 font-medium">
                  {step.temperature.value}°{step.temperature.unit}
                </span>
              </div>
            )}
            {step.time_in_minutes && step.time_in_minutes > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-300">{step.time_in_minutes} min</span>
              </div>
            )}
          </div>
          
          {/* Instruction */}
          <RichTextRenderer html={step.instruction} blocks={blocks} />
          
          {/* Delay */}
          {step.delay?.value && step.delay.value > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Hourglass className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">
                Wait {formatDelay(step.delay)} before next step
              </span>
            </div>
          )}
          
          {/* Notes */}
          {step.notes && (
            <div className="mt-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</span>
              </div>
              <p className="text-sm text-gray-400">{step.notes}</p>
            </div>
          )}
          
          {/* Media */}
          {hasMedia && <MediaGallery media={step.media!} />}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STAGE HEADER
// ============================================================================

interface StageHeaderProps {
  stage: RecipeStage;
  stepCount: number;
}

const StageHeader: React.FC<StageHeaderProps> = ({ stage, stepCount }) => (
  <div className="flex items-center gap-3 py-3">
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-purple-500/60" />
      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
        {stage.name}
      </h4>
    </div>
    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
      {stage.total_time && stage.total_time > 0 && (
        <>
          <span>•</span>
          <span>{formatDuration(stage.total_time)}</span>
        </>
      )}
      {stage.is_prep_list_task && (
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
          PREP
        </span>
      )}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPACT VIEW
// ============================================================================

interface CompactViewProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
}

export const CompactView: React.FC<CompactViewProps> = ({ recipe, blocks }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  
  const stepGroups = groupStepsByStage(recipe.steps || [], recipe.stages || []);
  
  return (
    <div className="space-y-6">
      {stepGroups.map((group) => (
        <div key={group.stage?.id || 'unstaged'}>
          {group.stage && (
            <StageHeader stage={group.stage} stepCount={group.steps.length} />
          )}
          
          <div className="space-y-2">
            {group.steps.map(({ step, originalIndex }) => (
              <CompactStepCard
                key={step.id}
                step={step}
                index={originalIndex}
                blocks={blocks}
                isExpanded={expandedStep === originalIndex}
                onToggle={() => setExpandedStep(expandedStep === originalIndex ? null : originalIndex)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompactView;
