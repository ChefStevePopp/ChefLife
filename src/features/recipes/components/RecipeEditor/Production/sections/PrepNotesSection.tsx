import React from "react";
import { FileText, AlertCircle } from "lucide-react";
import { ExpandableSection, GuidanceTip } from "@/shared/components/L5";
import type { Recipe } from "../../../../types/recipe";

/**
 * =============================================================================
 * PREP NOTES SECTION
 * =============================================================================
 * Working temperature notes and time management during preparation.
 * Separate from storage temps - these are for active mise en place.
 * =============================================================================
 */

interface PrepNotesSectionProps {
  recipe: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

export const PrepNotesSection: React.FC<PrepNotesSectionProps> = ({
  recipe,
  onChange,
}) => {
  return (
    <ExpandableSection
      icon={FileText}
      iconColor="text-purple-400"
      iconBg="bg-purple-500/20"
      title="Preparation Notes"
      subtitle="Working temps & time management"
      helpText="Temperature and timing guidelines during active preparation, separate from storage requirements."
      defaultExpanded={false}
    >
      <GuidanceTip color="amber">
        <strong>Prep temps ≠ Storage temps.</strong> These notes cover temperature 
        requirements during active mise en place — like keeping butter at 18°C for 
        lamination, or ensuring proteins stay below 4°C during portioning. This is 
        about the danger zone during work, not final storage.
      </GuidanceTip>

      {/* Food Safety Notice */}
      <div className="bg-amber-500/10 rounded-lg p-4 mb-4 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-fluid-sm text-amber-400 font-medium mb-2">
              Food Safety Reminder
            </h4>
            <p className="text-fluid-sm text-gray-300 mb-2">
              The danger zone (4°C-60°C / 40°F-140°F) requires strict monitoring during prep. 
              Follow your local health department regulations for:
            </p>
            <ul className="text-fluid-sm text-gray-400 list-disc pl-4 space-y-1">
              <li>Maximum cumulative time in the danger zone</li>
              <li>Required internal cooking temperatures</li>
              <li>Temperature monitoring during preparation</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Working Temperature Notes */}
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Working Temperature Requirements
          </label>
          <textarea
            value={recipe.prep_temp_notes || ""}
            onChange={(e) =>
              onChange({
                prep_temp_notes: e.target.value,
              })
            }
            className="input w-full"
            rows={5}
            placeholder="e.g., 'Maintain butter at 18°C/65°F for lamination', 'Keep protein below 4°C/40°F during portioning'"
          />
          <p className="text-fluid-xs text-gray-500 mt-1.5">
            Specific temperatures required during active preparation.
          </p>
        </div>

        {/* Time Management Notes */}
        <div>
          <label className="block text-fluid-sm font-medium text-gray-400 mb-1.5">
            Time Management Notes
          </label>
          <textarea
            value={recipe.prep_time_notes || ""}
            onChange={(e) =>
              onChange({
                prep_time_notes: e.target.value,
              })
            }
            className="input w-full"
            rows={5}
            placeholder="e.g., 'Return unused portions to refrigeration within 30 minutes', 'Complete forming within 15 minutes of removal from cooler'"
          />
          <p className="text-fluid-xs text-gray-500 mt-1.5">
            Maximum time ingredients can remain at working temperature.
          </p>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default PrepNotesSection;
