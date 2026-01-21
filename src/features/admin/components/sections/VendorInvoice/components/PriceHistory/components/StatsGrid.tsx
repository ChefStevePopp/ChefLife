import React from "react";
import { Database } from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { PriceHistoryStats } from "../types";

/**
 * =============================================================================
 * STATS GRID
 * =============================================================================
 * Displays the 5 stat boxes at the top of the price history modal.
 * =============================================================================
 */

interface StatsGridProps {
  stats: PriceHistoryStats;
  lookbackDays: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, lookbackDays }) => {
  const { showDiagnostics } = useDiagnostics();
  const periodLabel = lookbackDays >= 365 
    ? `${Math.round(lookbackDays / 365)}yr` 
    : `${lookbackDays}d`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="col-span-full text-xs text-gray-500 font-mono">
          .../PriceHistory/components/StatsGrid.tsx
        </div>
      )}
      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
        <p className="text-2xs text-gray-500 uppercase">{periodLabel} Change</p>
        <p
          className={`text-lg font-semibold tabular-nums ${
            stats.totalChange > 0
              ? "text-rose-400"
              : stats.totalChange < 0
              ? "text-emerald-400"
              : "text-gray-400"
          }`}
        >
          {stats.totalChange > 0 ? "+" : ""}
          {stats.totalChange.toFixed(1)}%
        </p>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
        <p className="text-2xs text-gray-500 uppercase">Current</p>
        <p className="text-lg font-semibold text-white tabular-nums">
          ${stats.lastPrice.toFixed(2)}
        </p>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
        <p className="text-2xs text-gray-500 uppercase">Avg</p>
        <p className="text-lg font-medium text-gray-300 tabular-nums">
          ${stats.avgPrice.toFixed(2)}
        </p>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 text-center">
        <p className="text-2xs text-gray-500 uppercase">Volatility</p>
        <p className="text-lg font-medium text-amber-400/70 tabular-nums">
          {stats.volatility.toFixed(1)}%
        </p>
      </div>
      <div className="bg-gray-900/50 rounded-lg p-3 text-center" title="Price changes / Total records">
        <p className="text-2xs text-gray-500 uppercase">Records</p>
        <div className="flex items-center justify-center gap-1">
          <Database className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-lg font-medium text-gray-400 tabular-nums">
            <span className="text-primary-400">{stats.actualChanges}</span>
            <span className="text-gray-600 mx-0.5">/</span>
            <span>{stats.recordCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
