import React from "react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { LOOKBACK_OPTIONS } from "../config";

/**
 * =============================================================================
 * PERIOD SELECTOR
 * =============================================================================
 * Lookback period selector (30d, 60d, 90d, 180d, 1yr, 2yr).
 * =============================================================================
 */

interface PeriodSelectorProps {
  lookbackDays: number;
  onChangeLookback: (days: number) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  lookbackDays,
  onChangeLookback,
}) => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="w-full text-xs text-gray-500 font-mono">
          .../PriceHistory/components/PeriodSelector.tsx
        </div>
      )}
      <span className="text-xs text-gray-500">Period:</span>
      <div className="flex gap-1">
        {LOOKBACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangeLookback(opt.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              lookbackDays === opt.value
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : "bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
