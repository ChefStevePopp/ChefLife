import React, { useState } from "react";
import { DollarSign, Lock, Pencil } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import {
  ExpandableSection,
  L5Select,
  L5Input,
  Field,
  GuidanceTip,
  SelectOption,
} from "@/shared/components/L5";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useGuidedMode } from "@/shared/components/L5";
import { useAuth } from "@/hooks/useAuth";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";

/**
 * =============================================================================
 * PURCHASE INFORMATION SECTION
 * =============================================================================
 * Section 1: BUY IT
 * Invoice details and pricing - case description, price, unit of measure.
 * Includes protected price field with system override capability.
 * =============================================================================
 */

interface PurchaseInfoSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
  purchaseUnitOptions: SelectOption[];
  isNew: boolean;
  onPriceOverrideChange?: (enabled: boolean, priceAtOverride: number | null) => void;
}

export const PurchaseInfoSection: React.FC<PurchaseInfoSectionProps> = ({
  formData,
  onChange,
  purchaseUnitOptions,
  isNew,
  onPriceOverrideChange,
}) => {
  const { isGuided } = useGuidedMode();
  const { organization, user } = useAuth();
  
  // Price override state
  const [isPriceOverrideEnabled, setIsPriceOverrideEnabled] = useState(false);

  const handleEnablePriceOverride = () => {
    setIsPriceOverrideEnabled(true);
    onPriceOverrideChange?.(true, formData.current_price);
    toast("System override enabled - changes bypass invoice audit trail", {
      icon: "⚠️",
    });

    // Fire NEXUS event
    if (organization?.id && user?.id) {
      nexus({
        organization_id: organization.id,
        user_id: user.id,
        activity_type: "system_override_initiated",
        details: {
          ingredient_id: formData.id,
          ingredient_name: formData.product,
          current_price: formData.current_price,
        },
      });
    }
  };

  return (
    <ExpandableSection
      icon={DollarSign}
      iconColor="text-green-400"
      iconBg="bg-green-500/20"
      title="Purchase Information"
      subtitle="Invoice details and pricing"
      helpText="Enter the purchase details exactly as they appear on your vendor invoice."
    >
      <GuidanceTip color="green">
        Look at your vendor invoice for this item. What's the description, price,
        and how is it sold?
      </GuidanceTip>

      <div className="space-y-4">
        <Field
          label="Case/Package Description"
          hint='Copy this from your invoice, e.g., "1 × 5KG", "Case of 24"'
        >
          <L5Input
            value={formData.case_size}
            onChange={(v) => onChange({ case_size: v })}
            placeholder='e.g., "1 × 5KG", "Case of 24"'
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Purchase Price
            </label>

            {/* Guided mode warning about system override */}
            {isGuided && !isNew && (
              <div className="flex items-start gap-2 p-2 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                <p className="text-xs text-amber-200/80">
                  <span className="font-medium text-amber-300">
                    Protected Field:
                  </span>{" "}
                  Prices should come from invoice imports to maintain audit trail.
                  The lock allows emergency overrides, but changes are logged and
                  require admin acknowledgement.
                </p>
              </div>
            )}

            {/* Price input with lock button inside */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                $
              </span>
              <input
                type="number"
                value={formData.current_price || ""}
                onChange={(e) =>
                  onChange({ current_price: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                min={0}
                step={0.01}
                readOnly={!isNew && !isPriceOverrideEnabled}
                className={`input w-full pl-8 pr-10 ${
                  !isNew && !isPriceOverrideEnabled
                    ? "bg-gray-800/30 cursor-not-allowed text-gray-400"
                    : ""
                }`}
              />
              {/* Two-stage unlock button - ALWAYS show for existing ingredients */}
              {!isNew && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {!isPriceOverrideEnabled ? (
                    <TwoStageButton
                      onConfirm={handleEnablePriceOverride}
                      icon={Lock}
                      confirmIcon={Pencil}
                      confirmText="Edit?"
                      variant="warning"
                      timeout={3000}
                      size="xs"
                    />
                  ) : (
                    <Pencil className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              )}
            </div>

            {isGuided && (
              <p className="text-xs text-gray-500 mt-1.5">
                The price you pay for one purchase unit
              </p>
            )}
          </div>

          <Field
            label="Unit of Measure"
            hint="How the vendor sells it (Case, kg, lb, Box, etc.)"
          >
            <L5Select
              value={formData.unit_of_measure}
              onChange={(v) => onChange({ unit_of_measure: v })}
              options={purchaseUnitOptions}
              placeholder="Select unit..."
            />
          </Field>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default PurchaseInfoSection;
