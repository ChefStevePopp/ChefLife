import React from "react";
import { Clock } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * TIME SECTION
 * =============================================================================
 * Prep, cook, and rest time breakdown.
 * Total is auto-calculated.
 * =============================================================================
 */

interface TimeSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const TimeSection: React.FC<TimeSectionProps> = ({
  recipe,
  onChange,
}) => {
  const handleTimeChange = (
    field: "prep_time" | "cook_time" | "rest_time",
    value: number
  ) => {
    const newValue = isNaN(value) ? 0 : value;
    onChange({
      [field]: newValue,
      total_time:
        (field === "prep_time" ? newValue : recipe.prep_time || 0) +
        (field === "cook_time" ? newValue : recipe.cook_time || 0) +
        (field === "rest_time" ? newValue : recipe.rest_time || 0),
    });
  };

  const totalTime = recipe.total_time || 0;

  // Format time for display
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <ExpandableSection
      icon={Clock}
      iconColor="text-primary-400"
      iconBg="bg-primary-500/20"
      title="Time Requirements"
      subtitle="Production timing"
      helpText="Break down the total time needed for production scheduling and batch planning."
      defaultExpanded={true}
    >
      <GuidanceTip>
        <strong>Timing matters for scheduling.</strong> Prep time is active hands-on work. 
        Cook time includes any heating/baking. Rest time covers proofing, chilling, 
        or setting periods. These help with production planning and labor scheduling.
      </GuidanceTip>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Prep Time
          </label>
          <div className="relative">
            <input
              type="number"
              value={recipe.prep_time || ""}
              onChange={(e) => handleTimeChange("prep_time", parseInt(e.target.value))}
              className="input w-full pr-12"
              min="0"
              step="1"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fluid-xs text-gray-500">min</span>
          </div>
        </div>
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Cook Time
          </label>
          <div className="relative">
            <input
              type="number"
              value={recipe.cook_time || ""}
              onChange={(e) => handleTimeChange("cook_time", parseInt(e.target.value))}
              className="input w-full pr-12"
              min="0"
              step="1"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fluid-xs text-gray-500">min</span>
          </div>
        </div>
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Rest Time
          </label>
          <div className="relative">
            <input
              type="number"
              value={recipe.rest_time || ""}
              onChange={(e) => handleTimeChange("rest_time", parseInt(e.target.value))}
              className="input w-full pr-12"
              min="0"
              step="1"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fluid-xs text-gray-500">min</span>
          </div>
        </div>
      </div>

      {/* Total Time Display */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex justify-between items-center">
          <span className="text-fluid-sm text-gray-400">Total Time</span>
          <span className="text-fluid-xl font-medium text-white">
            {formatTime(totalTime)}
          </span>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default TimeSection;
