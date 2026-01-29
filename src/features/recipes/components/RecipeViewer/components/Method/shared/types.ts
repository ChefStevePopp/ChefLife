/**
 * Method Tab - Shared Types
 */

import type { Recipe, RecipeStep, RecipeStage } from '@/features/recipes/types/recipe';
import type { InstructionBlockTemplate } from '@/features/recipes/hooks/useRecipeConfig';

export type ViewMode = 'compact' | 'guided' | 'focus';

export interface StepsByStage {
  stage: RecipeStage | null;
  steps: Array<{ step: RecipeStep; originalIndex: number }>;
}

export interface MethodProps {
  recipe: Recipe;
}

export interface ViewModeProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
}

export interface FocusViewProps {
  steps: RecipeStep[];
  recipeName: string;
  blocks: InstructionBlockTemplate[];
  onClose: () => void;
}

export interface GuidedViewProps {
  recipe: Recipe;
  blocks: InstructionBlockTemplate[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export interface CompactStepCardProps {
  step: RecipeStep;
  index: number;
  blocks: InstructionBlockTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
}

export interface StageHeaderProps {
  stage: RecipeStage;
  stepCount: number;
}

export interface ViewModeSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}
