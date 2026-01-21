import React, { useState } from "react";
import { X, TrendingUp, AlertTriangle } from "lucide-react";
import { ImageWithFallback } from "@/shared/components/ImageWithFallback";
import { useDiagnostics } from "@/hooks/useDiagnostics";

// Local imports
import { usePriceHistoryData, usePriceHistoryStats, useChartData } from "./hooks";
import {
  StatsGrid,
  PeriodSelector,
  CompareToggles,
  ChartLegend,
  PriceHistoryChart,
  InsightsPanel,
  PriceRecordList,
} from "./components";
import { DEFAULT_LOOKBACK_DAYS } from "./config";
import type { PriceChange } from "./types";

/**
 * =============================================================================
 * PRICE HISTORY DETAIL MODAL - L5/L6 Design (Modularized)
 * =============================================================================
 * Shows 180-day price history with:
 * 1. This item's trend line (primary, thick)
 * 2. Same product from other vendors (dashed lines)
 * 3. Sub-category average (dotted, faint reference)
 * 4. Actionable insights
 * 5. All data points visualized (price changes emphasized, stable prices subtle)
 *
 * Structure:
 * - hooks/usePriceHistoryData.ts   → Data fetching
 * - hooks/usePriceHistoryStats.ts  → Stats calculations
 * - hooks/useChartData.ts          → Chart data preparation
 * - components/*                   → UI components
 * - config.ts                      → Colors, constants
 * - types.ts                       → TypeScript interfaces
 * =============================================================================
 */

interface PriceHistoryDetailModalProps {
  priceChange: PriceChange;
  onClose: () => void;
}

export const PriceHistoryDetailModal: React.FC<PriceHistoryDetailModalProps> = ({
  priceChange,
  onClose,
}) => {
  const { showDiagnostics } = useDiagnostics();

  // Lookback period state
  const [lookbackDays, setLookbackDays] = useState(DEFAULT_LOOKBACK_DAYS);

  // Toggle states for comparison lines
  const [showVendorComparison, setShowVendorComparison] = useState(true);
  const [showCategoryTrend, setShowCategoryTrend] = useState(false);

  // Fetch all data
  const {
    selectedHistory,
    vendorComparisons,
    categoryAverage,
    itemMetadata,
    isLoading,
    error,
  } = usePriceHistoryData({ priceChange, lookbackDays });

  // Calculate stats
  const { stats, vendorLines } = usePriceHistoryStats({
    selectedHistory,
    vendorComparisons,
    categoryAverage,
    productName: priceChange.product_name,
  });

  // Prepare chart data
  const { chartData, yDomain } = useChartData({
    selectedHistory,
    vendorComparisons,
    categoryAverage,
    showVendorComparison,
    showCategoryTrend,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* L5 Diagnostic Path */}
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono px-4 pt-2">
            src/features/admin/components/sections/VendorInvoice/components/PriceHistory/PriceHistoryDetailModal.tsx
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            {priceChange.vendor_logo_url ? (
              <ImageWithFallback
                src={priceChange.vendor_logo_url}
                alt={priceChange.vendor_id}
                size="md"
                shape="rounded"
                className="w-10 h-10"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-medium text-white truncate">
                {priceChange.product_name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{priceChange.vendor_id}</span>
                <span>•</span>
                <span className="font-mono">{priceChange.item_code}</span>
                {itemMetadata?.subCategoryName && (
                  <>
                    <span>•</span>
                    <span>{itemMetadata.subCategoryName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-rose-400/50 mx-auto mb-2" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          ) : selectedHistory.length === 0 ? (
            <div className="space-y-4">
              {/* Lookback Period Selector - always visible */}
              <PeriodSelector
                lookbackDays={lookbackDays}
                onChangeLookback={setLookbackDays}
              />

              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No price history in this period</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try a longer lookback period or check that invoices have been imported
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Row */}
              {stats && <StatsGrid stats={stats} lookbackDays={lookbackDays} />}

              {/* Lookback Period Selector */}
              <PeriodSelector
                lookbackDays={lookbackDays}
                onChangeLookback={setLookbackDays}
              />

              {/* Chart Controls */}
              <CompareToggles
                vendorCount={vendorComparisons.size}
                categoryCount={categoryAverage.length}
                showVendorComparison={showVendorComparison}
                showCategoryTrend={showCategoryTrend}
                onToggleVendor={() => setShowVendorComparison(!showVendorComparison)}
                onToggleCategory={() => setShowCategoryTrend(!showCategoryTrend)}
              />

              {/* Chart Legend for dot styles */}
              <ChartLegend />

              {/* Chart */}
              <PriceHistoryChart
                chartData={chartData}
                yDomain={yDomain}
                stats={stats}
                vendorId={priceChange.vendor_id}
                vendorLines={vendorLines}
                showVendorComparison={showVendorComparison}
                showCategoryTrend={showCategoryTrend}
              />

              {/* Insights */}
              {stats && (
                <InsightsPanel
                  stats={stats}
                  itemMetadata={itemMetadata}
                  lookbackDays={lookbackDays}
                />
              )}

              {/* Price Change History List */}
              <PriceRecordList history={selectedHistory} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            {lookbackDays >= 365
              ? `${Math.round(lookbackDays / 365)} year`
              : `${lookbackDays} day`}{" "}
            lookback • {stats?.actualChanges || 0} price change
            {stats?.actualChanges !== 1 ? "s" : ""} across {selectedHistory.length} record
            {selectedHistory.length !== 1 ? "s" : ""}
            {vendorComparisons.size > 0 &&
              ` • ${vendorComparisons.size} vendor comparison${
                vendorComparisons.size !== 1 ? "s" : ""
              }`}
          </p>
        </div>
      </div>
    </div>
  );
};
