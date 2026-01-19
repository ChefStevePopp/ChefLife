import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Check,
  Inbox,
} from "lucide-react";
import { useVendorPriceChangesStore } from "@/stores/vendorPriceChangesStore";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * PRICE WATCH TICKER (INLINE VERSION)
 * ============================================================================
 * Embedded inside the Nexus header card - no outer card wrapper
 * Shows scrolling price changes with expandable critical alerts
 * 
 * Features:
 * - Scrolling ticker with recent price changes
 * - Badge shows unacknowledged critical alerts
 * - Expandable view with acknowledge + pagination
 * - "Show acknowledged" toggle (inbox zero approach)
 * ============================================================================
 */

const ITEMS_PER_PAGE = 5;
const STORAGE_KEY = "acknowledged_price_alerts";

export function PriceWatchTickerInline() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Acknowledged alerts state - persisted to localStorage
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist acknowledged alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...acknowledgedAlerts]));
    } catch (e) {
      console.warn("Failed to save acknowledged alerts:", e);
    }
  }, [acknowledgedAlerts]);

  const { priceChanges, fetchPriceChanges } = useVendorPriceChangesStore();

  useEffect(() => {
    fetchPriceChanges(30);
  }, [fetchPriceChanges]);

  // Filter to non-zero changes
  const allChanges = priceChanges.filter((c) => c.change_percent !== 0);

  // Critical items: alert_price_change enabled
  const criticalItems = allChanges.filter((c) => c.alert_price_change);

  // Split critical items into acknowledged and unacknowledged
  const { unacknowledgedCritical, acknowledgedCritical } = useMemo(() => {
    const unacked = criticalItems.filter((c) => !acknowledgedAlerts.has(c.id));
    const acked = criticalItems.filter((c) => acknowledgedAlerts.has(c.id));
    return {
      unacknowledgedCritical: unacked,
      acknowledgedCritical: acked,
    };
  }, [criticalItems, acknowledgedAlerts]);

  // Sort by absolute change descending
  const sortedUnacknowledged = useMemo(() => 
    [...unacknowledgedCritical].sort(
      (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)
    ), [unacknowledgedCritical]
  );

  const sortedAcknowledged = useMemo(() => 
    [...acknowledgedCritical].sort(
      (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)
    ), [acknowledgedCritical]
  );

  // Items to display based on toggle
  const displayItems = showAcknowledged 
    ? [...sortedUnacknowledged, ...sortedAcknowledged]
    : sortedUnacknowledged;

  // Pagination
  const totalPages = Math.ceil(displayItems.length / ITEMS_PER_PAGE);
  const paginatedItems = displayItems.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [showAcknowledged]);

  // For ticker: show all changes, sorted by recency
  const tickerItems = [...allChanges]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  // Mobile: Cycle through items
  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const interval = setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % tickerItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tickerItems.length]);

  const handleAcknowledge = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setAcknowledgedAlerts((prev) => new Set([...prev, itemId]));
  };

  const handleViewItem = (ingredientId: string) => {
    navigate(`/admin/data/vendor-invoices?tab=history&ingredient=${ingredientId}`);
  };

  const handleViewAll = () => {
    navigate("/admin/data/vendor-invoices?tab=history");
  };

  const truncateName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + "...";
  };

  if (allChanges.length === 0) {
    return null;
  }

  const currentMobileItem = tickerItems[mobileIndex];

  // Badge count = unacknowledged critical items
  const badgeCount = unacknowledgedCritical.length;

  return (
    <div className="border-t border-gray-700/50 -mx-4 -mb-4">
      {/* Ticker Row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left: Label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Price Watch
          </span>
          {badgeCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-rose-500/20 text-rose-400 rounded">
              {badgeCount}
            </span>
          )}
        </div>

        {/* Ticker Content - Desktop */}
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
                <span className="text-gray-300">
                  {truncateName(item.product_name)}
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

        {/* Mobile/Tablet: Cycling single item */}
        <div className="lg:hidden flex-1 overflow-hidden">
          {currentMobileItem && (
            <div className="flex items-center gap-2 text-sm">
              {currentMobileItem.vendor_logo_url ? (
                <img
                  src={currentMobileItem.vendor_logo_url}
                  alt={currentMobileItem.vendor_id}
                  className="w-4 h-4 rounded object-contain bg-white/10 flex-shrink-0"
                />
              ) : (
                <span className="w-4 h-4 rounded bg-gray-700 flex items-center justify-center text-[8px] text-gray-400 font-bold flex-shrink-0">
                  {currentMobileItem.vendor_id?.charAt(0) || "?"}
                </span>
              )}
              <span className="text-gray-300 truncate">
                {truncateName(currentMobileItem.product_name, 20)}
              </span>
              {currentMobileItem.change_percent > 0 ? (
                <span className="flex items-center text-rose-400 flex-shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-medium">+{currentMobileItem.change_percent.toFixed(0)}%</span>
                </span>
              ) : (
                <span className="flex items-center text-emerald-400 flex-shrink-0">
                  <TrendingDown className="w-3 h-3" />
                  <span className="font-medium">{currentMobileItem.change_percent.toFixed(0)}%</span>
                </span>
              )}
              <span className="text-xs text-gray-500 flex-shrink-0">
                {mobileIndex + 1}/{tickerItems.length}
              </span>
            </div>
          )}
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

      {/* Expanded Content - Critical Items with Acknowledge */}
      {expanded && (
        <div className="border-t border-gray-700/50 bg-gray-900/30">
          {criticalItems.length > 0 ? (
            <>
              {/* Header with show acknowledged toggle */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                    Tracked Alerts
                  </span>
                  <span className="text-xs text-gray-500">
                    ({unacknowledgedCritical.length} active)
                  </span>
                </div>
                
                {/* Show acknowledged toggle */}
                {acknowledgedCritical.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAcknowledged(!showAcknowledged);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded border ${
                      showAcknowledged 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'border-gray-600'
                    } flex items-center justify-center`}>
                      {showAcknowledged && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <span>Show acknowledged ({acknowledgedCritical.length})</span>
                  </button>
                )}
              </div>

              {/* Items List or Inbox Zero State */}
              {displayItems.length > 0 ? (
                <>
                  <div className="px-4 pb-2 space-y-2">
                    {paginatedItems.map((item) => {
                      const isAcknowledged = acknowledgedAlerts.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            isAcknowledged
                              ? "bg-gray-800/30 border border-gray-700/30 opacity-60"
                              : item.change_percent > 0
                              ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                          }`}
                          onClick={() => handleViewItem(item.ingredient_id || "")}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.vendor_logo_url ? (
                              <img
                                src={item.vendor_logo_url}
                                alt={item.vendor_id}
                                className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 flex-shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isAcknowledged
                                    ? "bg-gray-700/50"
                                    : item.change_percent > 0 
                                    ? "bg-rose-500/20" 
                                    : "bg-emerald-500/20"
                                }`}
                              >
                                {item.change_percent > 0 ? (
                                  <TrendingUp className={`w-4 h-4 ${isAcknowledged ? "text-gray-500" : "text-rose-400"}`} />
                                ) : (
                                  <TrendingDown className={`w-4 h-4 ${isAcknowledged ? "text-gray-500" : "text-emerald-400"}`} />
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${isAcknowledged ? "text-gray-400" : "text-white"}`}>
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.vendor_id} • {new Date(item.invoice_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-lg font-bold tabular-nums ${
                                isAcknowledged
                                  ? "text-gray-500"
                                  : item.change_percent > 0 
                                  ? "text-rose-400" 
                                  : "text-emerald-400"
                              }`}
                            >
                              {item.change_percent > 0 ? "+" : ""}
                              {item.change_percent.toFixed(1)}%
                            </span>
                            
                            {/* Acknowledge button or checkmark */}
                            {!isAcknowledged ? (
                              <button
                                onClick={(e) => handleAcknowledge(e, item.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-700/50 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                                title="Acknowledge"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            ) : (
                              <div className="w-7 h-7 rounded flex items-center justify-center bg-gray-700/30">
                                <Check className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                            )}
                            
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 px-4 pb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={currentPage === 0}
                        className="w-7 h-7 rounded bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-500 tabular-nums min-w-[60px] text-center">
                        {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
                        }}
                        disabled={currentPage === totalPages - 1}
                        className="w-7 h-7 rounded bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Inbox Zero State */
                <div className="px-4 pb-4">
                  <div className="text-center py-6 bg-gray-800/20 rounded-lg border border-gray-700/30">
                    <Inbox className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">All caught up!</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {acknowledgedCritical.length} acknowledged alert{acknowledgedCritical.length !== 1 ? 's' : ''} hidden
                    </p>
                  </div>
                </div>
              )}

              {/* View All Button */}
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
  );
}
