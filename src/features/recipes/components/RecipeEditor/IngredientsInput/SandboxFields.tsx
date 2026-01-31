/**
 * =============================================================================
 * SANDBOX FIELDS - Vendor/Code/Description Entry
 * =============================================================================
 * L5 Design - Fields for speculative ingredients not yet in MIL
 * =============================================================================
 */

import React from "react";
import { Truck, Hash, FileText, DollarSign, Scale } from "lucide-react";
import type { SandboxFieldsProps } from "./types";

export const SandboxFields: React.FC<SandboxFieldsProps> = ({
  vendor,
  vendorCode,
  description,
  estimatedCost,
  unit,
  onChange,
  vendors,
  compact = false,
}) => {
  if (compact) {
    // Compact display for table rows
    return (
      <div className="flex flex-col gap-1.5">
        {/* Description as main display */}
        <input
          type="text"
          value={description}
          onChange={(e) => onChange("sandbox_description", e.target.value)}
          placeholder="Ingredient description..."
          className="input w-full bg-amber-500/10 border-amber-500/30 text-amber-100 placeholder-amber-300/40"
        />
        {/* Vendor + Code subline */}
        <div className="flex items-center gap-2">
          <select
            value={vendor}
            onChange={(e) => onChange("sandbox_vendor", e.target.value)}
            className="input flex-1 bg-gray-800/50 text-sm py-1.5"
          >
            <option value="">Vendor...</option>
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <input
            type="text"
            value={vendorCode}
            onChange={(e) => onChange("sandbox_vendor_code", e.target.value)}
            placeholder="Code"
            className="input w-24 bg-gray-800/50 text-sm py-1.5"
          />
        </div>
      </div>
    );
  }

  // Full layout for tablet/guided mode
  return (
    <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Sandbox Ingredient
        <span className="text-amber-400/60 font-normal">— Not yet verified</span>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          <FileText className="w-4 h-4 inline mr-1.5" />
          Description <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => onChange("sandbox_description", e.target.value)}
          placeholder="e.g., Smoked Paprika 2kg"
          className="input w-full bg-gray-800/50 border-amber-500/30 focus:border-amber-400 text-lg py-3"
          autoFocus
        />
      </div>

      {/* Vendor + Code Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <Truck className="w-4 h-4 inline mr-1.5" />
            Vendor
          </label>
          <select
            value={vendor}
            onChange={(e) => onChange("sandbox_vendor", e.target.value)}
            className="input w-full bg-gray-800/50 py-3"
          >
            <option value="">Select vendor...</option>
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <Hash className="w-4 h-4 inline mr-1.5" />
            Vendor Code
          </label>
          <input
            type="text"
            value={vendorCode}
            onChange={(e) => onChange("sandbox_vendor_code", e.target.value)}
            placeholder="e.g., 123456"
            className="input w-full bg-gray-800/50 py-3"
          />
        </div>
      </div>

      {/* Unit + Estimated Cost Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <Scale className="w-4 h-4 inline mr-1.5" />
            Unit Type
          </label>
          <input
            type="text"
            value={unit}
            onChange={(e) => onChange("unit", e.target.value)}
            placeholder="e.g., OZ-WEIGHT, EACH"
            className="input w-full bg-gray-800/50 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            <DollarSign className="w-4 h-4 inline mr-1.5" />
            Estimated Cost/Unit
            <span className="text-amber-400/60 text-xs ml-1">(unverified)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={estimatedCost || ""}
              onChange={(e) => onChange("sandbox_estimated_cost", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input w-full bg-gray-800/50 py-3 pl-7"
            />
          </div>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-amber-400/60 flex items-start gap-2">
        <span className="text-amber-400 mt-0.5">💡</span>
        This ingredient will be flagged until matched with a real MIL item via invoice import.
      </p>
    </div>
  );
};

export default SandboxFields;
