import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import type { PriceHistoryStats, ItemMetadata } from "../types";

/**
 * =============================================================================
 * INSIGHTS PANEL
 * =============================================================================
 * Displays actionable insights based on price history analysis.
 * =============================================================================
 */

interface InsightsPanelProps {
  stats: PriceHistoryStats;
  itemMetadata: ItemMetadata | null;
  lookbackDays: number;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  stats,
  itemMetadata,
  lookbackDays,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const periodLabel = lookbackDays >= 365
    ? `${Math.round(lookbackDays / 365)} year${Math.round(lookbackDays / 365) > 1 ? "s" : ""}`
    : `${lookbackDays} days`;

  return (
    <div className="space-y-2">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          .../PriceHistory/components/InsightsPanel.tsx
        </div>
      )}
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Insights
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* vs Category */}
        {stats.vsCategoryAvg !== null && (
          <div className="p-3 bg-gray-900/30 rounded-lg border border-gray-700/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">
                {stats.vsCategoryAvg > 0 ? (
                  <>
                    <span className="text-rose-400 font-medium">
                      {stats.vsCategoryAvg.toFixed(1)}% above
                    </span>{" "}
                    category average
                  </>
                ) : stats.vsCategoryAvg < 0 ? (
                  <>
                    <span className="text-emerald-400 font-medium">
                      {Math.abs(stats.vsCategoryAvg).toFixed(1)}% below
                    </span>{" "}
                    category average
                  </>
                ) : (
                  "At category average"
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Based on {itemMetadata?.subCategoryName || "sub-category"} prices
              </p>
            </div>
          </div>
        )}

        {/* Cheapest vendor */}
        {stats.cheapestVendor && stats.cheapestVendor.savings > 0 && (
          <div className="p-3 bg-gray-900/30 rounded-lg border border-emerald-500/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">
                <span className="text-emerald-400 font-medium">
                  {stats.cheapestVendor.vendor}
                </span>{" "}
                has this for{" "}
                <span className="text-emerald-400 font-medium">
                  ${stats.cheapestVendor.price.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Save {stats.cheapestVendor.savings.toFixed(1)}% by switching
              </p>
            </div>
          </div>
        )}

        {/* Volatility warning */}
        {stats.volatility > 20 && (
          <div className="p-3 bg-gray-900/30 rounded-lg border border-amber-500/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">
                <span className="text-amber-400 font-medium">High volatility</span> — price
                swings of {stats.volatility.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Consider menu price buffer or alternative vendors
              </p>
            </div>
          </div>
        )}

        {/* Trend direction */}
        {Math.abs(stats.totalChange) > 5 && (
          <div
            className={`p-3 bg-gray-900/30 rounded-lg border flex items-start gap-3 ${
              stats.totalChange > 0 ? "border-rose-500/20" : "border-emerald-500/20"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                stats.totalChange > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"
              }`}
            >
              {stats.totalChange > 0 ? (
                <TrendingUp className="w-4 h-4 text-rose-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-300">
                {stats.totalChange > 0 ? (
                  <>
                    Price{" "}
                    <span className="text-rose-400 font-medium">
                      up {stats.totalChange.toFixed(1)}%
                    </span>{" "}
                    over {periodLabel}
                  </>
                ) : (
                  <>
                    Price{" "}
                    <span className="text-emerald-400 font-medium">
                      down {Math.abs(stats.totalChange).toFixed(1)}%
                    </span>{" "}
                    over {periodLabel}
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                From ${stats.firstPrice.toFixed(2)} to ${stats.lastPrice.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
