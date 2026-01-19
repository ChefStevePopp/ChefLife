import React from "react";
import { BarChart3, TrendingUp, Bell, ClipboardList, Check } from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { ExpandableSection, L5Select, Field, SelectOption } from "@/shared/components/L5";

/**
 * =============================================================================
 * REPORTING SECTION
 * =============================================================================
 * Section 5: TRACK IT
 * Vitals tier, inventory schedules, alert toggles.
 * =============================================================================
 */

interface ReportingSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
}

export const ReportingSection: React.FC<ReportingSectionProps> = ({
  formData,
  onChange,
}) => {
  const vitalsTierOptions: SelectOption[] = [
    { value: "critical", label: "Critical - Always visible in BOH Vitals" },
    { value: "elevated", label: "Elevated - Highlighted when trending" },
    { value: "standard", label: "Standard - Normal tracking" },
  ];

  const inventoryScheduleOptions = [
    { key: "daily", label: "Daily Count", desc: "Proteins, high-value items" },
    { key: "weekly", label: "Weekly Count", desc: "Standard full inventory" },
    { key: "monthly", label: "Monthly Count", desc: "Stable dry goods" },
    { key: "spot", label: "Spot Check Only", desc: "Random audits" },
  ];

  const toggleInventorySchedule = (key: string) => {
    const current = formData.inventory_schedule || [];
    const updated = current.includes(key)
      ? current.filter((s) => s !== key)
      : [...current, key];
    onChange({ inventory_schedule: updated });
  };

  return (
    <ExpandableSection
      icon={BarChart3}
      iconColor="text-lime-400"
      iconBg="bg-lime-500/20"
      title="Reporting & Tracking"
      subtitle="Dashboard visibility and inventory schedules"
      helpText="Control which inventories this item appears in and whether it's highlighted on the admin dashboard."
      defaultExpanded={false}
    >
      <div className="space-y-4">
        <Field
          label="Vitals Tier"
          hint="Critical items appear in BOH Vitals for continuous operational monitoring"
        >
          <L5Select
            value={formData.vitals_tier || "standard"}
            onChange={(v) =>
              onChange({ vitals_tier: v as MasterIngredient["vitals_tier"] })
            }
            options={vitalsTierOptions}
            placeholder="Select tier..."
          />
        </Field>

        {/* Inventory Schedule Checkboxes */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Include in Inventory Counts
          </label>
          <div className="grid grid-cols-2 gap-2">
            {inventoryScheduleOptions.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleInventorySchedule(key)}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                  (formData.inventory_schedule || []).includes(key)
                    ? "bg-gray-700/30 border-gray-500/50 text-white"
                    : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    (formData.inventory_schedule || []).includes(key)
                      ? "bg-gray-500 border-gray-500"
                      : "border-gray-600"
                  }`}
                >
                  {(formData.inventory_schedule || []).includes(key) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Alert Options */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Alerts & Dashboard
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Show in Price Ticker */}
            <button
              type="button"
              onClick={() =>
                onChange({ show_in_price_ticker: !formData.show_in_price_ticker })
              }
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                formData.show_in_price_ticker
                  ? "bg-gray-700/30 border-gray-500/50 text-white"
                  : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.show_in_price_ticker
                    ? "bg-gray-500 border-gray-500"
                    : "border-gray-600"
                }`}
              >
                {formData.show_in_price_ticker && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Show in Price Ticker</span>
              </div>
            </button>

            {/* Price Change Alerts */}
            <button
              type="button"
              onClick={() =>
                onChange({ alert_price_change: !formData.alert_price_change })
              }
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                formData.alert_price_change
                  ? "bg-gray-700/30 border-gray-500/50 text-white"
                  : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.alert_price_change
                    ? "bg-gray-500 border-gray-500"
                    : "border-gray-600"
                }`}
              >
                {formData.alert_price_change && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm">Price Change Alerts</span>
              </div>
            </button>

            {/* Low Stock Alerts */}
            <button
              type="button"
              onClick={() =>
                onChange({ alert_low_stock: !formData.alert_low_stock })
              }
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                formData.alert_low_stock
                  ? "bg-gray-700/30 border-gray-500/50 text-white"
                  : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  formData.alert_low_stock
                    ? "bg-gray-500 border-gray-500"
                    : "border-gray-600"
                }`}
              >
                {formData.alert_low_stock && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span className="text-sm">Low Stock Alerts</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default ReportingSection;
