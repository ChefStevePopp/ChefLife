import React from "react";
import { Package } from "lucide-react";
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
 * INVENTORY UNITS SECTION
 * =============================================================================
 * Section 2: STORE IT
 * How you count this ingredient on the shelf.
 * Inventory unit type, units per case, par levels, reorder points.
 * =============================================================================
 */

interface InventoryUnitsSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
  unitOfMeasureOptions: SelectOption[];
}

export const InventoryUnitsSection: React.FC<InventoryUnitsSectionProps> = ({
  formData,
  onChange,
  unitOfMeasureOptions,
}) => {
  // Add percentage option for visual estimation
  const inventoryUnitOptions: SelectOption[] = [
    ...unitOfMeasureOptions,
    { value: "PERCENT", label: "% (Percentage remaining)", group: "Estimation" },
  ];

  return (
    <ExpandableSection
      icon={Package}
      iconColor="text-amber-400"
      iconBg="bg-amber-500/20"
      title="Inventory Units"
      subtitle="How you count this on the shelf"
      helpText="Define how this ingredient is counted during inventory taking. This is separate from recipe units - you might use OZ in recipes but count by the LB on the shelf."
      defaultExpanded={false}
    >
      <GuidanceTip color="blue">
        When you do inventory, what unit do you count this item in? Cases? Pounds?
        Individual units?
      </GuidanceTip>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Inventory Unit Type"
            hint="The unit you count in during inventory (LB, EACH, CASE, %)"
          >
            <L5Select
              value={formData.inventory_unit_type || ""}
              onChange={(v) => onChange({ inventory_unit_type: v })}
              options={inventoryUnitOptions}
              placeholder="Select unit..."
            />
          </Field>

          <Field
            label="Inventory Units per Purchase"
            hint={`How many ${formData.inventory_unit_type || "inventory units"} in one ${formData.case_size || "purchase unit"}?`}
          >
            <L5Input
              type="number"
              value={formData.units_per_case || ""}
              onChange={(v) => onChange({ units_per_case: parseFloat(v) || 0 })}
              placeholder="Enter conversion..."
              min={0}
              step={0.01}
            />
          </Field>
        </div>

        {/* Inventory Cost Calculator - Read-only result */}
        {formData.current_price > 0 && formData.units_per_case > 0 && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-4">
            <div className="text-center min-w-[50px]">
              <div className="text-lg sm:text-xl font-bold text-white">
                ${formData.current_price.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">Price</div>
            </div>
            <div className="text-lg text-gray-600">÷</div>
            <div className="text-center min-w-[50px]">
              <div className="text-lg sm:text-xl font-bold text-white">
                {formData.units_per_case}
              </div>
              <div className="text-xs text-gray-500">Units</div>
            </div>
            <div className="text-lg text-gray-600">=</div>
            <div className="text-center px-3 py-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <div className="text-xl sm:text-2xl font-bold text-amber-400">
                ${(formData.current_price / formData.units_per_case).toFixed(4)}
              </div>
              <div className="text-xs text-amber-400/70">
                per {formData.inventory_unit_type || "unit"}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Par Level"
            hint={`Target stock (in ${formData.inventory_unit_type || "inventory units"})`}
          >
            <L5Input
              type="number"
              value={formData.par_level || ""}
              onChange={(v) => onChange({ par_level: parseFloat(v) || undefined })}
              placeholder="Target stock level"
              min={0}
              step={1}
            />
          </Field>

          <Field label="Reorder Point" hint="Alert when stock falls below this">
            <L5Input
              type="number"
              value={formData.reorder_point || ""}
              onChange={(v) =>
                onChange({ reorder_point: parseFloat(v) || undefined })
              }
              placeholder="Reorder threshold"
              min={0}
              step={1}
            />
          </Field>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default InventoryUnitsSection;
