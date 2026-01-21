import React from "react";
import { Truck, Layers } from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * COMPARE TOGGLES
 * =============================================================================
 * Toggle buttons for vendor comparison and category trend lines.
 * =============================================================================
 */

interface CompareTogglesProps {
  vendorCount: number;
  categoryCount: number;
  showVendorComparison: boolean;
  showCategoryTrend: boolean;
  onToggleVendor: () => void;
  onToggleCategory: () => void;
}

export const CompareToggles: React.FC<CompareTogglesProps> = ({
  vendorCount,
  categoryCount,
  showVendorComparison,
  showCategoryTrend,
  onToggleVendor,
  onToggleCategory,
}) => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="w-full text-xs text-gray-500 font-mono">
          .../PriceHistory/components/CompareToggles.tsx
        </div>
      )}
      <span className="text-xs text-gray-500">Compare:</span>
      {vendorCount > 0 && (
        <button
          onClick={onToggleVendor}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showVendorComparison
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500"
          }`}
        >
          <Truck className="w-3 h-3 inline mr-1" />
          Other Vendors ({vendorCount})
        </button>
      )}
      {categoryCount > 0 && (
        <button
          onClick={onToggleCategory}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showCategoryTrend
              ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
              : "bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500"
          }`}
        >
          <Layers className="w-3 h-3 inline mr-1" />
          Category Avg
        </button>
      )}
    </div>
  );
};
