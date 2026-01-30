import React from "react";
import { CalendarDays } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * SHELF LIFE SECTION
 * =============================================================================
 * Duration, thawing requirements, and expiration guidelines.
 * Critical for food safety and inventory management.
 * =============================================================================
 */

interface ShelfLifeSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const ShelfLifeSection: React.FC<ShelfLifeSectionProps> = ({
  recipe,
  onChange,
}) => {
  return (
    <ExpandableSection
      icon={CalendarDays}
      iconColor="text-amber-400"
      iconBg="bg-amber-500/20"
      title="Shelf Life"
      subtitle="Storage duration & expiration"
      helpText="Set how long this item is safe to use. These guidelines appear on labels and drive expiration alerts."
      defaultExpanded={true}
    >
      <GuidanceTip color="amber">
        <strong>Shelf life drives labeling.</strong> The duration you set here determines 
        use-by dates on prep labels. Be conservative — it's better to re-make than to 
        serve questionable product. Check your local health codes for maximum hold times.
      </GuidanceTip>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Duration
              </label>
              <input
                type="number"
                value={recipe.storage?.shelf_life_duration || ""}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      shelf_life_duration: parseInt(e.target.value) || null,
                    },
                  })
                }
                className="input w-full"
                min="0"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Unit
              </label>
              <select
                value={recipe.storage?.shelf_life_unit || "days"}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      shelf_life_unit: e.target.value,
                    },
                  })
                }
                className="input w-full"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          {/* Shelf life display */}
          {recipe.storage?.shelf_life_duration && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-fluid-sm text-amber-300">
                <span className="font-medium">Use within:</span>{" "}
                {recipe.storage.shelf_life_duration} {recipe.storage?.shelf_life_unit || "days"}
              </p>
            </div>
          )}

          {/* Thawing */}
          <div>
            <label className="flex items-center gap-2 text-fluid-sm font-medium text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.storage?.thawing_required || false}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      thawing_required: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500/50"
              />
              Requires Thawing Before Use
            </label>
            {recipe.storage?.thawing_required && (
              <textarea
                value={recipe.storage?.thawing_instructions || ""}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      thawing_instructions: e.target.value,
                    },
                  })
                }
                className="input w-full mt-2"
                placeholder="e.g., Thaw overnight in refrigerator. Do not thaw at room temperature."
                rows={2}
              />
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Expiration Guidelines
          </label>
          <textarea
            value={recipe.storage?.expiration_guidelines || ""}
            onChange={(e) =>
              onChange({
                storage: {
                  ...recipe.storage,
                  expiration_guidelines: e.target.value,
                },
              })
            }
            className="input w-full"
            rows={6}
            placeholder="How to determine if this item has expired beyond the date. Signs of spoilage, quality degradation markers, etc."
          />
          <p className="text-fluid-xs text-gray-500 mt-1.5">
            Describe visual, smell, or texture cues that indicate the product should be discarded.
          </p>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default ShelfLifeSection;
