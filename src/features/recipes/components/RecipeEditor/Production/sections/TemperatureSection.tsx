import React from "react";
import { ThermometerSun, AlertTriangle } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * TEMPERATURE SECTION
 * =============================================================================
 * Storage temperature requirements, tolerance ranges, and CCP flag.
 * Critical for food safety compliance.
 * =============================================================================
 */

interface TemperatureSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const TemperatureSection: React.FC<TemperatureSectionProps> = ({
  recipe,
  onChange,
}) => {
  const isCCP = recipe.storage?.is_critical_control_point || false;

  return (
    <ExpandableSection
      icon={ThermometerSun}
      iconColor="text-rose-400"
      iconBg="bg-rose-500/20"
      title="Temperature Controls"
      subtitle="Storage temperature & CCP"
      helpText="Set temperature requirements for safe storage. Critical Control Points require documented monitoring."
      defaultExpanded={true}
    >
      <GuidanceTip color="rose">
        <strong>Temperature is food safety.</strong> The danger zone (4°C-60°C / 40°F-140°F) 
        is where bacteria thrive. Set the correct storage temp and tolerance. If this is a 
        Critical Control Point, temperature logs become mandatory documentation.
      </GuidanceTip>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Temperature Settings */}
        <div className="space-y-4">
          {/* Storage Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Storage Temperature
              </label>
              <input
                type="number"
                value={recipe.storage?.storage_temp || ""}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      storage_temp: parseInt(e.target.value) || null,
                    },
                  })
                }
                className="input w-full"
                placeholder="e.g., 38"
              />
            </div>
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Unit
              </label>
              <select
                value={recipe.storage?.storage_temp_unit || "F"}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      storage_temp_unit: e.target.value,
                    },
                  })
                }
                className="input w-full"
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
            </div>
          </div>

          {/* Tolerance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Tolerance (±)
              </label>
              <input
                type="number"
                value={recipe.storage?.temp_tolerance || ""}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      temp_tolerance: parseInt(e.target.value) || null,
                    },
                  })
                }
                className="input w-full"
                min="0"
                placeholder="e.g., 2"
              />
            </div>
            <div>
              <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
                Unit
              </label>
              <select
                value={recipe.storage?.temp_tolerance_unit || "F"}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      temp_tolerance_unit: e.target.value,
                    },
                  })
                }
                className="input w-full"
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
            </div>
          </div>

          {/* Temperature Range Display */}
          {recipe.storage?.storage_temp && (
            <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
              <p className="text-fluid-sm text-gray-300">
                <span className="font-medium">Safe range:</span>{" "}
                {recipe.storage.temp_tolerance 
                  ? `${recipe.storage.storage_temp - recipe.storage.temp_tolerance}° – ${recipe.storage.storage_temp + recipe.storage.temp_tolerance}°${recipe.storage.storage_temp_unit || "F"}`
                  : `${recipe.storage.storage_temp}°${recipe.storage.storage_temp_unit || "F"}`
                }
              </p>
            </div>
          )}
        </div>

        {/* Right Column - CCP & Notes */}
        <div className="space-y-4">
          {/* Critical Control Point */}
          <div>
            <label className="flex items-center gap-2 text-fluid-sm font-medium text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isCCP}
                onChange={(e) =>
                  onChange({
                    storage: {
                      ...recipe.storage,
                      is_critical_control_point: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-rose-500 focus:ring-rose-500/50"
              />
              Critical Control Point (CCP)
            </label>
            
            {isCCP && (
              <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-fluid-sm text-rose-300 font-medium">
                    Temperature Logging Required
                  </p>
                  <p className="text-fluid-xs text-gray-400 mt-1">
                    This item requires documented temperature checks per your HACCP plan. 
                    Staff must log temps at specified intervals.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Temperature Notes */}
          <div>
            <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
              Temperature Notes
            </label>
            <textarea
              value={recipe.storage?.temperature_notes || ""}
              onChange={(e) =>
                onChange({
                  storage: {
                    ...recipe.storage,
                    temperature_notes: e.target.value,
                  },
                })
              }
              className="input w-full"
              rows={4}
              placeholder="Additional temperature control notes, monitoring frequency, corrective actions if out of range..."
            />
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default TemperatureSection;
