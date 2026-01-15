import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useVendorPriceChangesStore } from "@/stores/vendorPriceChangesStore";
import { useNavigate } from "react-router-dom";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * ============================================================================
 * PRICE WATCH TICKER
 * ============================================================================
 * Dashboard widget showing scrolling price changes with expandable alerts
 * 
 * L5 BUILD PHASES:
 * ────────────────────────────────────────────────────────────────────────────
 * [x] Phase 1: Foundation - Component structure, store connection, routing
 * [x] Phase 2: Card Design - Ticker row, expanded section, vendor logos
 * [x] Phase 3: Search & Filter - Critical items filter, click-to-navigate
 * [ ] Phase 4: Pagination - Handle large datasets (virtual scroll?)
 * [x] Phase 5: Core Feature - Scrolling animation, responsive breakpoints
 * [ ] Phase 6: Polish - Sparkline trends, priority badges, keyboard nav
 * 
 * FUTURE ENHANCEMENTS:
 * - Sparkline charts showing trend over quarter/annum
 * - Priority level badges (Critical/High/Standard)
 * - Keyboard navigation (arrow keys to scroll through items)
 * - Click-to-pause with item highlight
 * ============================================================================
 */

export function PriceWatchTicker() {
  const navigate = useNavigate();
  const { showDiagnostics } = useDiagnostics();
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const { priceChanges, fetchPriceChanges } = useVendorPriceChangesStore();

  useEffect(() => {
    fetchPriceChanges(30); // Last 30 days
  }, [fetchPriceChanges]);

  // Filter to non-zero changes
  const allChanges = priceChanges.filter((c) => c.change_percent !== 0);

  // Critical items: alert_price_change enabled (any change)
  const criticalItems = allChanges.filter(
    (c) => c.alert_price_change
  );

  // Sort critical by absolute change descending
  const sortedCritical = [...criticalItems].sort(
    (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)
  );

  // For ticker: show all changes, sorted by recency
  const tickerItems = [...allChanges]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20); // Cap at 20 for ticker

  const handleViewItem = (ingredientId: string) => {
    navigate(`/admin/data/vendor-invoices?tab=history&ingredient=${ingredientId}`);
  };

  const handleViewAll = () => {
    navigate("/admin/data/vendor-invoices?tab=history");
  };

  if (allChanges.length === 0) {
    return null; // Don't show if no price changes
  }

  return (
    <>
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/PriceWatchTicker.tsx
        </div>
      )}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
      {/* Ticker Row - Always Visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left: Label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Price Watch
          </span>
          {criticalItems.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-rose-500/20 text-rose-400 rounded">
              {criticalItems.length}
            </span>
          )}
        </div>

        {/* Ticker Content - Hidden on mobile/tablet, visible on desktop */}
        <div
          className="hidden lg:block flex-1 overflow-hidden relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            ref={tickerRef}
            className={`flex items-center gap-4 whitespace-nowrap ${
              isPaused ? "" : "animate-ticker"
            }`}
          >
            {tickerItems.map((item, idx) => (
              <span
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-1.5 text-sm"
              >
                {/* Vendor Logo */}
                {item.vendor_logo_url ? (
                  <img
                    src={item.vendor_logo_url}
                    alt={item.vendor_id}
                    className="w-4 h-4 rounded object-contain bg-white/10"
                  />
                ) : (
                  <span className="w-4 h-4 rounded bg-gray-700 flex items-center justify-center text-[8px] text-gray-400 font-bold">
                    {item.vendor_id?.charAt(0) || "?"}
                  </span>
                )}
                <span className="text-gray-300 truncate max-w-[120px]">
                  {item.product_name}
                </span>
                {item.change_percent > 0 ? (
                  <span className="flex items-center text-rose-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium">+{item.change_percent.toFixed(0)}%</span>
                  </span>
                ) : (
                  <span className="flex items-center text-emerald-400">
                    <TrendingDown className="w-3 h-3" />
                    <span className="font-medium">{item.change_percent.toFixed(0)}%</span>
                  </span>
                )}
                <span className="text-gray-600 mx-2">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: Show summary instead of ticker */}
        <div className="lg:hidden flex-1 text-sm text-gray-400">
          <span className="text-rose-400">{allChanges.filter(c => c.change_percent > 0).length} up</span>
          <span className="mx-2">·</span>
          <span className="text-emerald-400">{allChanges.filter(c => c.change_percent < 0).length} down</span>
          <span className="mx-2">·</span>
          <span>last 30 days</span>
        </div>

        {/* Expand Toggle */}
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content - Critical Items */}
      {expanded && (
        <div className="border-t border-slate-700/50 bg-slate-900/30">
          {sortedCritical.length > 0 ? (
            <>
              <div className="p-4 space-y-2">
                {sortedCritical.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      item.change_percent > 0
                        ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                    }`}
                    onClick={() => handleViewItem(item.ingredient_id || "")}
                  >
                    <div className="flex items-center gap-3">
                      {/* Vendor Logo */}
                      {item.vendor_logo_url ? (
                        <img
                          src={item.vendor_logo_url}
                          alt={item.vendor_id}
                          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.change_percent > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"
                          }`}
                        >
                          {item.change_percent > 0 ? (
                            <TrendingUp className="w-4 h-4 text-rose-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.vendor_id} • {new Date(item.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold ${
                          item.change_percent > 0 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {item.change_percent > 0 ? "+" : ""}
                        {item.change_percent.toFixed(1)}%
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={handleViewAll}
                  className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                >
                  View All Price History →
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No tracked price changes</p>
              <p className="text-xs text-gray-500 mt-1">
                Enable "Price Change Alerts" on MIL ingredients to track them here
              </p>
              <button
                onClick={handleViewAll}
                className="mt-3 text-sm text-primary-400 hover:text-primary-300"
              >
                View All Price History →
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
