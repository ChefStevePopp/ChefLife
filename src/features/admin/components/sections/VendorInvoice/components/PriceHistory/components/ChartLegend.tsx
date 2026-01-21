import React from "react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * CHART LEGEND
 * =============================================================================
 * Legend explaining dot styles (price changed vs stable).
 * =============================================================================
 */

export const ChartLegend: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="flex items-center gap-4 text-2xs text-gray-500 flex-wrap">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="w-full text-xs font-mono">
          .../PriceHistory/components/ChartLegend.tsx
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-primary-400 border border-primary-700" />
        <span>Price changed</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full border border-dashed border-gray-500" />
        <span>Recorded (no change)</span>
      </div>
    </div>
  );
};
