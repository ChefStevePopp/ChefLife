/**
 * Method Tab - Utility Functions
 */

import type { RecipeStep, RecipeStage } from '@/features/recipes/types/recipe';
import type { StepsByStage } from './types';

/**
 * Extract a title from step instruction text
 */
export function extractStepTitle(instruction: string, customLabel?: string | null): string {
  if (customLabel) return customLabel;
  
  const plainText = instruction.replace(/<[^>]*>/g, '').trim();
  const colonIndex = plainText.indexOf(':');
  const periodIndex = plainText.indexOf('.');
  const newlineIndex = plainText.indexOf('\n');
  
  let breakPoint = 80;
  if (colonIndex > 0 && colonIndex < 60) breakPoint = Math.min(breakPoint, colonIndex);
  if (periodIndex > 0 && periodIndex < 80) breakPoint = Math.min(breakPoint, periodIndex);
  if (newlineIndex > 0 && newlineIndex < 80) breakPoint = Math.min(breakPoint, newlineIndex);
  
  const title = plainText.substring(0, breakPoint).trim();
  if (breakPoint < plainText.length && !title.endsWith(':') && !title.endsWith('.')) {
    return title + '...';
  }
  return title;
}

/**
 * Format minutes into human-readable duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format delay object into human-readable string
 */
export function formatDelay(delay: { value: number; unit: string }): string {
  const { value, unit } = delay;
  if (unit === 'minutes') return `${value} min`;
  if (unit === 'hours') return `${value} hr${value !== 1 ? 's' : ''}`;
  if (unit === 'days') return `${value} day${value !== 1 ? 's' : ''}`;
  return `${value} ${unit}`;
}

/**
 * Calculate total time for all steps including delays
 */
export function calculateTotalTime(steps: RecipeStep[]): number {
  return steps.reduce((total, step) => {
    let stepTime = step.time_in_minutes || 0;
    if (step.delay?.value) {
      const delayMins = step.delay.unit === 'hours' 
        ? step.delay.value * 60 
        : step.delay.unit === 'days' 
          ? step.delay.value * 60 * 24 
          : step.delay.value;
      stepTime += delayMins;
    }
    return total + stepTime;
  }, 0);
}

/**
 * Group steps by their stage
 */
export function groupStepsByStage(steps: RecipeStep[], stages: RecipeStage[] = []): StepsByStage[] {
  const groups: StepsByStage[] = [];
  
  // Steps without a stage
  const unstagedSteps = steps
    .map((step, index) => ({ step, originalIndex: index }))
    .filter(item => !item.step.stage_id);
  
  if (unstagedSteps.length > 0) {
    groups.push({ stage: null, steps: unstagedSteps });
  }
  
  // Steps with stages
  stages.forEach(stage => {
    const stageSteps = steps
      .map((step, index) => ({ step, originalIndex: index }))
      .filter(item => item.step.stage_id === stage.id);
    
    if (stageSteps.length > 0) {
      groups.push({ stage, steps: stageSteps });
    }
  });
  
  return groups;
}

/**
 * Format seconds into MM:SS display
 */
export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
