import React from "react";
import { Scale } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * BASE YIELD SECTION
 * =============================================================================
 * Sets the standard batch size for this recipe.
 * This is the base that Guided Mode scaling calculates from.
 * =============================================================================
 */

interface BaseYieldSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const BaseYieldSection: React.FC<BaseYieldSectionProps> = ({
  recipe,
  onChange,
}) => {
  return (
    <ExpandableSection
      icon={Scale}
      iconColor="text-amber-400"
      iconBg="bg-amber-500/20"
      title="Base Recipe Yield"
      subtitle="Standard batch output"
      helpText="The standard batch size. User-side scaling (½×, 2×, etc.) calculates from this base."
      defaultExpanded={true}
    >
      <GuidanceTip color="amber">
        <strong>What is Base Yield?</strong> This is what one standard batch produces. 
        For example, "24 portions" or "4 liters". When kitchen staff use Guided Mode, 
        the scale selector (½×, 2×, 3×) multiplies ingredients from this base amount.
      </GuidanceTip>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Yield Amount
          </label>
          <input
            type="number"
            value={recipe.yield_amount || ""}
            onChange={(e) =>
              onChange({
                yield_amount: parseFloat(e.target.value) || null,
              })
            }
            className="input w-full"
            min="0"
            step="0.1"
            placeholder="e.g., 24"
          />
        </div>
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Yield Unit
          </label>
          <input
            type="text"
            value={recipe.yield_unit || ""}
            onChange={(e) =>
              onChange({
                yield_unit: e.target.value,
              })
            }
            className="input w-full"
            placeholder="e.g., portions, liters, loaves"
          />
        </div>
      </div>

      {/* Visual confirmation of what 1× means */}
      {recipe.yield_amount && recipe.yield_unit && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-fluid-sm text-amber-300">
            <span className="font-medium">1× batch</span> = {recipe.yield_amount} {recipe.yield_unit}
          </p>
          <p className="text-fluid-xs text-gray-400 mt-1">
            2× = {(recipe.yield_amount * 2).toFixed(1)} {recipe.yield_unit} • 
            ½× = {(recipe.yield_amount * 0.5).toFixed(1)} {recipe.yield_unit}
          </p>
        </div>
      )}
    </ExpandableSection>
  );
};

export default BaseYieldSection;
