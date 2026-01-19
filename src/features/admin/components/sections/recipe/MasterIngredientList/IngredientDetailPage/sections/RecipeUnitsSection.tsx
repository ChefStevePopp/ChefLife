import React from "react";
import { Scale } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import {
  ExpandableSection,
  L5Select,
  L5Input,
  Field,
  GuidanceTip,
  SelectOption,
} from "@/shared/components/L5";

/**
 * =============================================================================
 * RECIPE UNITS SECTION
 * =============================================================================
 * Section 3: USE IT
 * Conversion from purchase units to recipe units, yield percentage.
 * =============================================================================
 */

interface RecipeUnitsSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
  recipeUnitOptions: SelectOption[];
}

export const RecipeUnitsSection: React.FC<RecipeUnitsSectionProps> = ({
  formData,
  onChange,
  recipeUnitOptions,
}) => {
  return (
    <ExpandableSection
      icon={Scale}
      iconColor="text-rose-400"
      iconBg="bg-rose-500/20"
      title="Recipe Units"
      subtitle="Conversion and yield"
      helpText="Define how this ingredient is measured in your recipes and the conversion from purchase units."
    >
      <GuidanceTip color="amber">
        <span className="font-medium">ChefLife's Secret Weapon:</span> We distill
        every ingredient down to just three recipe units —{" "}
        <span className="text-white">OZ</span>,{" "}
        <span className="text-white">FL.OZ</span>, or{" "}
        <span className="text-white">EACH</span>. No cups, tablespoons, or pounds
        in recipes. This makes costing dead simple — every recipe speaks the same
        language.
      </GuidanceTip>

      <div className="space-y-4">
        <Field
          label="Recipe Unit Type"
          hint="The unit you'll use in recipes (OZ, EACH, etc.)"
        >
          <L5Select
            value={formData.recipe_unit_type}
            onChange={(v) => onChange({ recipe_unit_type: v })}
            options={recipeUnitOptions}
            placeholder="Select unit..."
          />
        </Field>

        <Field
          label="Recipe Units per Purchase Unit"
          hint={`How many ${formData.recipe_unit_type || "recipe units"} in one ${formData.case_size || "purchase unit"}?`}
        >
          <L5Input
            type="number"
            value={formData.recipe_unit_per_purchase_unit || ""}
            onChange={(v) =>
              onChange({ recipe_unit_per_purchase_unit: parseFloat(v) || 0 })
            }
            placeholder="Enter conversion..."
            min={0}
            step={0.01}
          />
        </Field>

        <Field
          label="Yield Percentage"
          hint="After prep (trimming, etc.), what % is usable? 100% = no waste"
        >
          <L5Input
            type="number"
            value={formData.yield_percent}
            onChange={(v) => onChange({ yield_percent: parseFloat(v) || 100 })}
            placeholder="100"
            suffix="%"
            min={1}
            max={100}
            step={1}
          />
        </Field>
      </div>
    </ExpandableSection>
  );
};

export default RecipeUnitsSection;
