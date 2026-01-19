import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  LineChart,
  History,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  TrendingDown,
  Calendar,
  Truck,
  Eye,
  Flame,
  Info,
  ChevronUp,
  ChevronDown,
  Bell,
  Target,
  Zap,
} from "lucide-react";
import { useVendorPriceChangesStore } from "@/stores/vendorPriceChangesStore";
import { useVendorCodesStore } from "@/stores/vendorCodesStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { ExcelDataGrid } from "@/shared/components/ExcelDataGrid";
import { priceHistoryColumns } from "./PriceHistory/columns.tsx";
import { PriceChangeCell } from "./PriceHistory/PriceChangeCell";

/**
 * =============================================================================
 * PRICE HISTORY - L5 BUILD PHASES
 * =============================================================================
 * 
 * Phase 1: Foundation                                               ✅ COMPLETE
 * - [x] Route integration (tab in VendorInvoiceManager)
 * - [x] Loading states
 * - [x] Error handling
 * - [x] Data fetching from vendorPriceChangesStore
 * 
 * Phase 2: Card Design                                              ✅ COMPLETE
 * - [x] L5 Sub-header with expandable info
 * - [x] Actionable stat cards (Total, Biggest Jump, Best Savings, Most Active, Price Alerts)
 * - [x] Color-coded borders on hover
 * - [x] Icon boxes with semantic colors
 * 
 * Phase 3: Search & Filter                                          ✅ COMPLETE
 * - [x] Filter by increases/decreases
 * - [x] Filter by vendor
 * - [x] Filter by price alerts (tracked items)
 * - [x] Days selector (7/14/30/45/60/90)
 * - [x] Sort shortcuts (created date, invoice date, vendor group)
 * 
 * Phase 4: Pagination                                               ✅ COMPLETE
 * - [x] ExcelDataGrid handles pagination
 * - [x] Virtual scrolling for large datasets
 * 
 * Phase 5: Core Feature                                             ✅ COMPLETE
 * - [x] Price change tracking from invoice imports
 * - [x] Vendor logo display
 * - [x] Change percent calculations
 * - [x] Link to MIL ingredient settings (alert_price_change)
 * 
 * Phase 6: Polish                                                   🔄 IN PROGRESS
 * - [x] Filter state feedback banner
 * - [x] Refresh button
 * - [ ] Keyboard shortcuts (Esc to clear filter)
 * - [ ] Sparkline charts in stat cards
 * - [ ] Export to CSV
 * - [ ] Date range picker (custom range)
 * 
 * FUTURE ENHANCEMENTS:
 * - [ ] Sparkline trend charts in expanded dropdown
 * - [ ] Quarterly/annual trend analysis
 * - [ ] Price prediction based on historical patterns
 * - [ ] Vendor comparison view
 * - [ ] Integration with NEXUS dashboard widget
 * =============================================================================
 */

export const PriceHistory = () => {
  const { showDiagnostics } = useDiagnostics();
  const [daysToShow, setDaysToShow] = useState(45);
  const {
    priceChanges,
    isLoading: priceChangesLoading,
    error: priceChangesError,
    fetchPriceChanges,
    setFilter,
  } = useVendorPriceChangesStore();
  const {
    priceTrends,
    isLoading: trendsLoading,
    error: trendsError,
    fetchPriceTrends,
  } = useVendorCodesStore();

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3); // Default to last 3 months
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    },
  );

  const isLoading = priceChangesLoading || trendsLoading;
  const error = priceChangesError || trendsError;

  const [activeFilter, setActiveFilter] = useState<{
    filterType?: "increase" | "decrease" | "vendor" | "pricealerts";
    ingredientId?: string;
    vendorId?: string;
  }>({});

  // Sort mode for the shortcuts
  const [sortMode, setSortMode] = useState<"created" | "invoice" | "vendor">("created");

  // Expandable info state
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    fetchPriceChanges(daysToShow, activeFilter, sortMode);
    fetchPriceTrends();
  }, [fetchPriceChanges, fetchPriceTrends, daysToShow, activeFilter, sortMode]);

  // Calculate ACTIONABLE price statistics from live data
  const priceStats = React.useMemo(() => {
    // Filter out items with no change
    const validChanges = priceChanges.filter((t) => t.change_percent !== 0);
    const increases = validChanges.filter((t) => t.change_percent > 0);
    const decreases = validChanges.filter((t) => t.change_percent < 0);

    // 1. Total changes
    const totalChanges = validChanges.length;

    // 2. Top Increase - item with highest increase
    const topIncrease = increases.length > 0
      ? increases.reduce((max, item) => 
          item.change_percent > max.change_percent ? item : max
        )
      : null;

    // 3. Top Decrease - item with biggest decrease (most negative)
    const topDecrease = decreases.length > 0
      ? decreases.reduce((min, item) => 
          item.change_percent < min.change_percent ? item : min
        )
      : null;

    // 4. Hottest Vendor - vendor with most price increases
    const vendorIncreases: Record<string, { count: number; decreases: number }> = {};
    validChanges.forEach((item) => {
      if (!vendorIncreases[item.vendor_id]) {
        vendorIncreases[item.vendor_id] = { count: 0, decreases: 0 };
      }
      if (item.change_percent > 0) {
        vendorIncreases[item.vendor_id].count++;
      } else {
        vendorIncreases[item.vendor_id].decreases++;
      }
    });
    const hottestVendor = Object.entries(vendorIncreases)
      .sort((a, b) => b[1].count - a[1].count)[0] || null;

    // 5. Price Alerts - items with alert_price_change enabled that have changed
    // No threshold - if you're tracking it and it changed, you want to know
    const priceAlertItems = validChanges.filter(
      (item) => item.alert_price_change
    );

    return {
      totalChanges,
      topIncrease,
      topDecrease,
      hottestVendor: hottestVendor ? {
        vendorId: hottestVendor[0],
        increases: hottestVendor[1].count,
        decreases: hottestVendor[1].decreases,
      } : null,
      priceAlertCount: priceAlertItems.length,
      priceAlertItems,
    };
  }, [priceChanges]);

  // Filter and sort price changes based on active filter and sort mode
  const filteredPriceChanges = React.useMemo(() => {
    // First filter out items with no change
    let filtered = priceChanges.filter((change) => change.change_percent !== 0);

    // Apply active filters
    if (activeFilter.filterType === "increase") {
      filtered = filtered.filter((change) => change.change_percent > 0);
      // Sort by change_percent in descending order for increases
      filtered = [...filtered].sort(
        (a, b) => b.change_percent - a.change_percent,
      );
    } else if (activeFilter.filterType === "decrease") {
      filtered = filtered.filter((change) => change.change_percent < 0);
      // Sort by absolute change_percent in descending order for decreases
      filtered = [...filtered].sort(
        (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent),
      );
    } else if (activeFilter.filterType === "vendor" && activeFilter.vendorId) {
      filtered = filtered.filter(
        (change) => change.vendor_id === activeFilter.vendorId,
      );
      // Sort by change_percent descending to show biggest increases first
      filtered = [...filtered].sort(
        (a, b) => b.change_percent - a.change_percent,
      );
    } else if (activeFilter.filterType === "pricealerts") {
      // Show only items with alert_price_change enabled
      filtered = filtered.filter(
        (change) => change.alert_price_change,
      );
      // Sort by absolute change descending
      filtered = [...filtered].sort(
        (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent),
      );
    } else if (activeFilter.ingredientId) {
      filtered = filtered.filter(
        (change) => change.ingredient_id === activeFilter.ingredientId,
      );
      // Sort by date for ingredient-specific view
      filtered = [...filtered].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      // Apply sort mode when no filter is active
      switch (sortMode) {
        case "created":
          filtered = [...filtered].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          break;
        case "invoice":
          filtered = [...filtered].sort(
            (a, b) =>
              new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime(),
          );
          break;
        case "vendor":
          // Group by vendor - sort by vendor name, then by created_at within each vendor
          filtered = [...filtered].sort((a, b) => {
            const vendorCompare = (a.vendor_id || "").localeCompare(b.vendor_id || "");
            if (vendorCompare !== 0) return vendorCompare;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          break;
      }
    }

    return filtered;
  }, [priceChanges, activeFilter, sortMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading price history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-rose-500/10 text-rose-400 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">Error Loading Price History</p>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/VendorInvoice/components/PriceHistory.tsx
        </div>
      )}

      {/* L5 Sub-Header */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <LineChart className="w-7 h-7" />
            </div>
            <div>
              <h3 className="subheader-title">Price History</h3>
              <p className="subheader-subtitle">Track and analyze vendor price changes</p>
            </div>
          </div>
          <div className="subheader-right">
            <button
              onClick={() => {
                setActiveFilter({});
                fetchPriceChanges(daysToShow, {}, sortMode);
                fetchPriceTrends();
              }}
              className="btn-ghost"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Expandable Info */}
        <div className={`subheader-info expandable-info-section ${showInfo ? 'expanded' : ''}`}>
          <button
            className="expandable-info-header w-full justify-between"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-white">About Price History</span>
            </div>
            {showInfo ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="subheader-feature-card">
                  <Zap className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Auto-Tracked</span>
                    <p className="subheader-feature-desc">Every invoice import logs price changes automatically</p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <Bell className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Price Alerts</span>
                    <p className="subheader-feature-desc">Track specific ingredients by enabling alerts in MIL</p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <Target className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Vendor Insights</span>
                    <p className="subheader-feature-desc">See which vendors are raising prices most frequently</p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <TrendingUp className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Cost Impact</span>
                    <p className="subheader-feature-desc">Changes ripple through to recipe costs automatically</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ACTIONABLE Price Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Changes */}
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-primary-500/50 transition-colors cursor-pointer"
          onClick={() => {
            setActiveFilter({});
            fetchPriceChanges(daysToShow, {}, sortMode);
          }}
          title="View all price changes"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Changes</p>
              <p className="text-2xl font-bold text-primary-400">{priceStats.totalChanges}</p>
            </div>
          </div>
        </div>

        {/* Top Increase - shows actual item */}
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-rose-500/50 transition-colors cursor-pointer"
          onClick={() => {
            if (priceStats.topIncrease) {
              setActiveFilter({ filterType: "increase" });
            }
          }}
          title={priceStats.topIncrease ? `View ${priceStats.topIncrease.product_name}` : "No increases"}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Biggest Jump</p>
              {priceStats.topIncrease ? (
                <>
                  <p className="text-lg font-bold text-rose-400">
                    +{priceStats.topIncrease.change_percent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 truncate" title={priceStats.topIncrease.product_name}>
                    {priceStats.topIncrease.product_name}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-600">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Decrease - shows actual item */}
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/50 transition-colors cursor-pointer"
          onClick={() => {
            if (priceStats.topDecrease) {
              setActiveFilter({ filterType: "decrease" });
            }
          }}
          title={priceStats.topDecrease ? `View ${priceStats.topDecrease.product_name}` : "No decreases"}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Best Savings</p>
              {priceStats.topDecrease ? (
                <>
                  <p className="text-lg font-bold text-emerald-400">
                    {priceStats.topDecrease.change_percent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 truncate" title={priceStats.topDecrease.product_name}>
                    {priceStats.topDecrease.product_name}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-600">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Hottest Vendor */}
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-amber-500/50 transition-colors cursor-pointer"
          onClick={() => {
            if (priceStats.hottestVendor) {
              setActiveFilter({ filterType: "vendor", vendorId: priceStats.hottestVendor.vendorId });
            }
          }}
          title={priceStats.hottestVendor ? `View ${priceStats.hottestVendor.vendorId} changes` : "No vendor data"}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Most Active</p>
              {priceStats.hottestVendor ? (
                <>
                  <p className="text-lg font-bold text-amber-400 truncate">
                    {priceStats.hottestVendor.vendorId}
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="text-rose-400">{priceStats.hottestVendor.increases} up</span>
                    <span className="text-gray-600 mx-1">·</span>
                    <span className="text-emerald-400">{priceStats.hottestVendor.decreases} down</span>
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-600">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Price Alerts - Tracked Items */}
        <div
          className="card p-4 bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50 transition-colors cursor-pointer"
          onClick={() => {
            if (priceStats.priceAlertCount > 0) {
              setActiveFilter({ filterType: "pricealerts" });
            }
          }}
          title="Items with Price Alerts enabled that have changed"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Price Alerts</p>
              <p className={`text-2xl font-bold ${
                priceStats.priceAlertCount > 0 ? "text-purple-400" : "text-gray-600"
              }`}>
                {priceStats.priceAlertCount}
              </p>
              <p className="text-xs text-gray-500">tracked items</p>
            </div>
          </div>
        </div>
      </div>
      {/* Recent Price Changes - L5 Sub-Header */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Price Changes</span>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-500">Show last</span>
              <select
                value={daysToShow}
                onChange={(e) => {
                  const newDays = Number(e.target.value);
                  setDaysToShow(newDays);
                  fetchPriceChanges(newDays, activeFilter, sortMode);
                }}
                className="input input-sm bg-gray-900/50"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="45">45 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            {/* Sort shortcuts */}
            <div className="flex items-center gap-2 ml-2 border-l border-gray-700 pl-3">
              <button
                onClick={() => setSortMode("created")}
                className={`p-1.5 rounded-md border transition-colors ${
                  sortMode === "created"
                    ? "bg-primary-500/20 text-primary-400 border-primary-500/50"
                    : "text-gray-500 border-gray-600 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
                title="Sort by Created Date"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSortMode("invoice")}
                className={`p-1.5 rounded-md border transition-colors ${
                  sortMode === "invoice"
                    ? "bg-primary-500/20 text-primary-400 border-primary-500/50"
                    : "text-gray-500 border-gray-600 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
                title="Sort by Invoice Date"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSortMode("vendor")}
                className={`p-1.5 rounded-md border transition-colors ${
                  sortMode === "vendor"
                    ? "bg-primary-500/20 text-primary-400 border-primary-500/50"
                    : "text-gray-500 border-gray-600 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
                title="Group by Vendor"
              >
                <Truck className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="subheader-right">
            <button
              onClick={() => (window.location.hash = "#analytics")}
              className="btn-ghost btn-sm"
            >
              <History className="w-4 h-4 mr-2" />
              View All History
            </button>
          </div>
        </div>
      </div>

      {/* Excel Data Grid */}
      <div id="price-changes">
        {Object.keys(activeFilter).length > 0 && (
          <div className="mb-4 p-2 bg-blue-500/10 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm text-blue-400">
                {activeFilter.filterType === "increase" &&
                  "Showing price increases only"}
                {activeFilter.filterType === "decrease" &&
                  "Showing price decreases only"}
                {activeFilter.filterType === "vendor" && activeFilter.vendorId &&
                  `Showing changes from ${activeFilter.vendorId}`}
                {activeFilter.filterType === "pricealerts" &&
                  "Showing items with Price Alerts enabled"}
                {activeFilter.ingredientId &&
                  "Showing specific ingredient details"}
              </div>
            </div>
            <button
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              onClick={() => {
                setActiveFilter({});
                fetchPriceChanges(daysToShow, {}, sortMode);
              }}
            >
              <RefreshCw className="w-3 h-3" /> Clear filter
            </button>
          </div>
        )}
        <ExcelDataGrid
          columns={priceHistoryColumns}
          data={filteredPriceChanges}
          onRefresh={() => fetchPriceChanges(daysToShow, activeFilter, sortMode)}
        />
      </div>
    </div>
  );
};
