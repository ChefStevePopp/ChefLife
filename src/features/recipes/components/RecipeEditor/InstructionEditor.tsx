import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react";
import { supabase } from "@/config/supabase";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { arrayMove } from "@dnd-kit/sortable";
import type { Recipe, RecipeStep, RecipeStage } from "../../types/recipe";
import { mediaService } from "@/lib/media-service";
import toast from "react-hot-toast";
import SortableStep from "./SortableStep";
import StageList from "./StageList";

/**
 * =============================================================================
 * INSTRUCTION EDITOR - L5 Carousel Pattern
 * =============================================================================
 * 
 * DESIGN PHILOSOPHY:
 * - One step at a time = focused editing
 * - Horizontal carousel navigation (no vertical scroll)
 * - Big touch targets for iPad (44px minimum)
 * - Amber color scheme (Method tab identity)
 * 
 * STAGE INTEGRATION:
 * - Stages = production phases (Day 1, Day 2, etc.)
 * - Stages can be flagged as Prep List Tasks
 * - When building prep lists, entire stages drag as units
 * - Individual steps inherit prep list status from their stage
 * =============================================================================
 */

interface InstructionEditorProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const InstructionEditor: React.FC<InstructionEditorProps> = ({
  recipe,
  onChange,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  const totalSteps = recipe.steps?.length || 0;
  const currentStep = recipe.steps?.[currentStepIndex];

  // Keep index in bounds when steps change
  useEffect(() => {
    if (currentStepIndex >= totalSteps && totalSteps > 0) {
      setCurrentStepIndex(totalSteps - 1);
    }
  }, [totalSteps, currentStepIndex]);

  // ============================================================================
  // STEP CRUD OPERATIONS
  // ============================================================================
  
  const handleStepChange = (index: number, updates: Partial<RecipeStep>) => {
    const updatedSteps = [...(recipe.steps || [])];
    updatedSteps[index] = { ...updatedSteps[index], ...updates };
    onChange({ steps: updatedSteps });
  };

  const addStep = (stageId?: string) => {
    const newStep: RecipeStep = {
      id: `step-${Date.now()}`,
      instruction: "",
      notes: "",
      warning_level: "low",
      time_in_minutes: null,
      temperature: {
        value: null,
        unit: "F",
      },
      is_quality_control_point: false,
      is_critical_control_point: false,
      is_prep_list_task: false,
      stage: "",
      custom_stage_label: null,
      custom_step_label: null,
      delay: {
        value: null,
        unit: "minutes",
      },
      media: [],
      stage_id: stageId,
    };

    const newSteps = [...(recipe.steps || []), newStep];
    onChange({ steps: newSteps });
    
    // Navigate to the new step
    setCurrentStepIndex(newSteps.length - 1);
  };

  const removeStep = async (index: number) => {
    const step = recipe.steps[index];

    // Delete all media associated with the step
    if (step.media?.length) {
      try {
        await Promise.all(
          step.media
            .filter((media) => media.type !== "external-video")
            .map((media) => mediaService.deleteStepMedia(media.url)),
        );
      } catch (error) {
        console.error("Error deleting step media:", error);
        toast.error("Some media files could not be deleted");
      }
    }

    const updatedSteps = (recipe.steps || []).filter((_, i) => i !== index);
    onChange({ steps: updatedSteps });
    
    // Adjust current index if needed
    if (currentStepIndex >= updatedSteps.length && updatedSteps.length > 0) {
      setCurrentStepIndex(updatedSteps.length - 1);
    }
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const saveAndNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // On last step - add new step
      addStep(currentStep?.stage_id);
    }
  };

  const saveCurrentStep = () => {
    // Changes are already persisted via onChange - just show confirmation
    toast.success(`Step ${currentStepIndex + 1} saved`);
  };

  // ============================================================================
  // REORDERING
  // ============================================================================

  const moveStepUp = () => {
    if (currentStepIndex > 0) {
      const newSteps = arrayMove(recipe.steps || [], currentStepIndex, currentStepIndex - 1);
      onChange({ steps: newSteps });
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const moveStepDown = () => {
    if (currentStepIndex < totalSteps - 1) {
      const newSteps = arrayMove(recipe.steps || [], currentStepIndex, currentStepIndex + 1);
      onChange({ steps: newSteps });
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // ============================================================================
  // STAGE TIME CALCULATION
  // ============================================================================

  const calculateStageTotalTimes = useCallback(() => {
    if (!recipe.stages?.length || !recipe.steps?.length) return {};

    const stageTotalTimes: Record<string, number> = {};
    
    recipe.stages.forEach((stage) => {
      stageTotalTimes[stage.id] = 0;
    });

    recipe.steps.forEach((step) => {
      if (step.stage_id && step.time_in_minutes) {
        const stepTime = typeof step.time_in_minutes === "number"
          ? step.time_in_minutes
          : parseInt(step.time_in_minutes as any, 10) || 0;
        stageTotalTimes[step.stage_id] = (stageTotalTimes[step.stage_id] || 0) + stepTime;
      }
    });

    return stageTotalTimes;
  }, [recipe.steps, recipe.stages]);

  // Update stage total times when steps change
  useEffect(() => {
    const stageTotalTimes = calculateStageTotalTimes();
    
    let hasChanges = false;
    const updatedStages = (recipe.stages || []).map((stage) => {
      if (stageTotalTimes[stage.id] !== stage.total_time) {
        hasChanges = true;
        return { ...stage, total_time: stageTotalTimes[stage.id] || 0 };
      }
      return stage;
    });

    if (hasChanges) {
      onChange({ stages: updatedStages });

      // Persist to database
      if (recipe.id) {
        updatedStages.forEach(async (stage) => {
          if (stage.id) {
            try {
              await supabase
                .from("recipe_stages")
                .update({ total_time: stage.total_time || 0 })
                .eq("id", stage.id);
            } catch (error) {
              console.error("Failed to update stage total time:", error);
            }
          }
        });
      }
    }
  }, [recipe.steps, recipe.stages, calculateStageTotalTimes, recipe.id]);

  // ============================================================================
  // STEP OVERVIEW DATA
  // ============================================================================

  const getStepsByStage = () => {
    const stepsWithoutStage = (recipe.steps || []).filter((step) => !step.stage_id);
    const stepsByStage: Record<string, RecipeStep[]> = {};

    (recipe.stages || []).forEach((stage) => {
      stepsByStage[stage.id] = [];
    });

    (recipe.steps || []).forEach((step) => {
      if (step.stage_id && stepsByStage[step.stage_id]) {
        stepsByStage[step.stage_id].push(step);
      }
    });

    return { stepsWithoutStage, stepsByStage };
  };

  const { stepsWithoutStage, stepsByStage } = getStepsByStage();

  // Get current step's stage name for display
  const getCurrentStageName = () => {
    if (!currentStep?.stage_id) return null;
    const stage = recipe.stages?.find((s) => s.id === currentStep.stage_id);
    return stage?.name || null;
  };

  return (
    <div className="space-y-6">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/recipes/components/RecipeEditor/InstructionEditor.tsx
        </div>
      )}

      {/* Stage Management Section */}
      <StageList recipe={recipe} onChange={onChange} />

      {/* ================================================================
       * CAROUSEL HEADER - Step counter, navigation, actions
       * Amber color scheme (Method tab identity)
       * ================================================================ */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800/70 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Recipe Instructions</h2>
              <p className="text-sm text-gray-400">
                {totalSteps > 0 
                  ? `Step ${currentStepIndex + 1} of ${totalSteps}${getCurrentStageName() ? ` • ${getCurrentStageName()}` : ''}`
                  : 'Add steps to build your recipe'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => addStep()} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </button>
          </div>
        </div>

        {/* ================================================================
         * CAROUSEL NAVIGATION - Big touch targets
         * ================================================================ */}
        {totalSteps > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800/40 border-b border-gray-700/30">
            {/* Left Nav */}
            <button
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              <ChevronLeft className="w-5 h-5 text-gray-300" />
              <span className="text-sm text-gray-300 hidden sm:inline">Previous</span>
            </button>

            {/* Center - Reorder + Step dots + Reorder */}
            <div className="flex items-center gap-3">
              {/* Move Earlier pill */}
              {totalSteps > 1 && (
                <button
                  onClick={moveStepUp}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-300 hidden sm:inline">
                    {currentStepIndex > 0 ? `Move back to Step ${currentStepIndex}` : 'First'}
                  </span>
                </button>
              )}

              {/* Step indicator dots (show up to 10) */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(totalSteps, 10) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStepIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentStepIndex
                        ? 'bg-amber-400 scale-125'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    title={`Go to step ${i + 1}`}
                  />
                ))}
                {totalSteps > 10 && (
                  <span className="text-xs text-gray-500 ml-1">+{totalSteps - 10}</span>
                )}
              </div>

              {/* Move Later pill */}
              {totalSteps > 1 && (
                <button
                  onClick={moveStepDown}
                  disabled={currentStepIndex >= totalSteps - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <span className="text-gray-300 hidden sm:inline">
                    {currentStepIndex < totalSteps - 1 ? `Move to Step ${currentStepIndex + 2}` : 'Last'}
                  </span>
                  <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Right Nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToNextStep}
                disabled={currentStepIndex >= totalSteps - 1}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                <span className="text-sm text-gray-300 hidden sm:inline">Next</span>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
              <button
                onClick={saveCurrentStep}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 transition-colors min-h-[44px]"
                title="Save and stay on this step"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Save</span>
              </button>
              <button
                onClick={saveAndNext}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors min-h-[44px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">
                  {currentStepIndex >= totalSteps - 1 ? 'Save & Add' : 'Save & Next'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
         * STEP EDITOR CARD - Single step view
         * ================================================================ */}
        <div className="p-4">
          {currentStep ? (
            <SortableStep
              key={currentStep.id}
              step={currentStep}
              index={currentStepIndex}
              onUpdate={handleStepChange}
              onDelete={removeStep}
              recipeId={recipe.id}
              stages={recipe.stages || []}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-amber-400/50" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Steps Yet</h3>
              <p className="text-gray-400 mb-6">
                Add your first step to start building this recipe's instructions.
              </p>
              <button onClick={() => addStep()} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add First Step
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
       * STEP OVERVIEW - Collapsible grid of all steps
       * ================================================================ */}
      {totalSteps > 0 && (
        <div className={`expandable-info-section ${isOverviewExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
            className="expandable-info-header w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-white">Step Overview</h3>
                  <p className="text-xs text-gray-500">
                    {totalSteps} steps across {recipe.stages?.length || 0} stages
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isOverviewExpanded ? 'rotate-90' : ''}`} />
            </div>
          </button>

          <div className="expandable-info-content p-4 space-y-4">
              {/* Unstaged Steps */}
              {stepsWithoutStage.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Unstaged ({stepsWithoutStage.length})
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {stepsWithoutStage.map((step) => {
                      const stepIndex = recipe.steps?.findIndex((s) => s.id === step.id) || 0;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setCurrentStepIndex(stepIndex)}
                          className={`p-3 rounded-lg text-left transition-colors ${
                            stepIndex === currentStepIndex
                              ? 'bg-amber-500/20 border border-amber-500/30'
                              : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                          }`}
                        >
                          <div className="text-xs font-medium text-white mb-1">
                            {step.custom_step_label || `Step ${stepIndex + 1}`}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {step.instruction || 'No instruction yet'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staged Steps */}
              {(recipe.stages || []).map((stage) => (
                <div key={stage.id}>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                    <span>{stage.name}</span>
                    {stage.is_prep_list_task && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] normal-case">
                        Prep
                      </span>
                    )}
                    {stage.total_time > 0 && (
                      <span className="text-gray-600">• {stage.total_time} min</span>
                    )}
                  </div>
                  
                  {(stepsByStage[stage.id] || []).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(stepsByStage[stage.id] || []).map((step) => {
                        const stepIndex = recipe.steps?.findIndex((s) => s.id === step.id) || 0;
                        return (
                          <button
                            key={step.id}
                            onClick={() => setCurrentStepIndex(stepIndex)}
                            className={`p-3 rounded-lg text-left transition-colors ${
                              stepIndex === currentStepIndex
                                ? 'bg-amber-500/20 border border-amber-500/30'
                                : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-white">
                                {step.custom_step_label || `Step ${stepIndex + 1}`}
                              </span>
                              {step.is_critical_control_point && (
                                <span className="w-2 h-2 rounded-full bg-rose-400" title="CCP" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {step.instruction || 'No instruction yet'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 italic py-2">
                      No steps in this stage
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
