import React from "react";
import { Calendar } from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { HistoryDataPoint } from "../types";

/**
 * =============================================================================
 * PRICE RECORD LIST
 * =============================================================================
 * Scrollable list of price history records with change indicators.
 * =============================================================================
 */

interface PriceRecordListProps {
  history: HistoryDataPoint[];
}

export const PriceRecordList: React.FC<PriceRecordListProps> = ({ history }) => {
  const { showDiagnostics } = useDiagnostics();
  // Reverse to show most recent first
  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-2">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          .../PriceHistory/components/PriceRecordList.tsx
        </div>
      )}
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Price Records ({history.length})
      </h4>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {reversedHistory.map((point, index) => {
          const prevPoint = history[history.length - index - 2];
          const change =
            prevPoint && prevPoint.price > 0
              ? ((point.price - prevPoint.price) / prevPoint.price) * 100
              : 0;

          return (
            <div
              key={`${point.date}-${index}`}
              className={`flex items-center justify-between p-2.5 rounded-lg ${
                point.hasChange
                  ? "bg-gray-900/50"
                  : "bg-gray-900/25 border border-dashed border-gray-700/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar
                  className={`w-3.5 h-3.5 ${
                    point.hasChange ? "text-gray-500" : "text-gray-600"
                  }`}
                />
                <span
                  className={`text-xs ${
                    point.hasChange ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {new Date(point.date).toLocaleDateString()}
                </span>
                {!point.hasChange && (
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-600">
                    no change
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {prevPoint && point.hasChange && (
                  <span className="text-xs text-gray-500">
                    ${prevPoint.price.toFixed(2)} →
                  </span>
                )}
                <span
                  className={`text-sm font-medium tabular-nums ${
                    point.hasChange ? "text-white" : "text-gray-500"
                  }`}
                >
                  ${point.price.toFixed(2)}
                </span>
                {point.hasChange && change !== 0 && (
                  <span
                    className={`text-xs font-medium ${
                      change > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
