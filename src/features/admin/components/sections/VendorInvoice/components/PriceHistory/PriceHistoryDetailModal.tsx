import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Truck,
  Layers,
  Calendar,
  AlertTriangle,
  Sparkles,
  Database,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { ImageWithFallback } from "@/shared/components/ImageWithFallback";
import type { PriceChange } from "@/stores/vendorPriceChangesStore";

// =============================================================================
// PRICE HISTORY DETAIL MODAL - L5/L6 Design
// =============================================================================
// Shows 180-day price history with:
// 1. This item's trend line (primary, thick)
// 2. Same product from other vendors (dashed lines)
// 3. Sub-category average (dotted, faint reference)
// 4. Actionable insights
// 5. All data points visualized (price changes emphasized, stable prices subtle)
//
// Data Sources:
// - vendor_price_history_all: ALL records (for this item's full history)
// - vendor_price_history_enriched: Only price CHANGES (for comparisons/category)
// =============================================================================

interface PriceHistoryDetailModalProps {
  priceChange: PriceChange;
  onClose: () => void;
}

interface HistoryDataPoint {
  date: number; // timestamp
  dateStr: string;
  price: number;
  previousPrice: number | null; // For detecting actual changes
  vendor: string;
  ingredientId: string;
  hasChange: boolean; // True if price differs from previous record
}

interface VendorLine {
  id: string;
  vendor: string;
  product: string;
  color: string;
  dataKey: string;
  isSelected: boolean;
}

// Color palette for comparison lines
const VENDOR_COLORS = [
  "#2dd4bf", // teal (primary - selected item)
  "#f59e0b", // amber
  "#a78bfa", // purple
  "#fb7185", // rose
  "#38bdf8", // sky
  "#4ade80", // green
  "#f472b6", // pink
  "#facc15", // yellow
];

const CATEGORY_COLOR = "#6b7280"; // gray for category average

// Custom dot component that shows price changes prominently, stable prices subtly
const CustomDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  
  if (!cx || !cy || dataKey !== "selected") return null;
  
  const hasChange = payload?.hasChange;
  
  if (hasChange) {
    // Price changed - prominent solid dot
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#2dd4bf"
        stroke="#134e4a"
        strokeWidth={1}
      />
    );
  } else {
    // Same price as before - subtle ring marker
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="transparent"
        stroke="#4b5563"
        strokeWidth={1.5}
        strokeDasharray="2 1"
      />
    );
  }
};

export const PriceHistoryDetailModal: React.FC<PriceHistoryDetailModalProps> = ({
  priceChange,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // History data
  const [selectedHistory, setSelectedHistory] = useState<HistoryDataPoint[]>([]);
  const [vendorComparisons, setVendorComparisons] = useState<Map<string, HistoryDataPoint[]>>(new Map());
  const [categoryAverage, setCategoryAverage] = useState<HistoryDataPoint[]>([]);
  
  // Metadata about the item
  const [itemMetadata, setItemMetadata] = useState<{
    commonName: string | null;
    subCategory: string | null;
    subCategoryName: string | null;
    umbrellaId: string | null;
    umbrellaName: string | null;
  } | null>(null);
  
  // Toggle states for comparison lines
  const [showVendorComparison, setShowVendorComparison] = useState(true);
  const [showCategoryTrend, setShowCategoryTrend] = useState(false);
  
  // Lookback period selector
  const [lookbackDays, setLookbackDays] = useState(180);
  const LOOKBACK_OPTIONS = [
    { value: 30, label: "30d" },
    { value: 60, label: "60d" },
    { value: 90, label: "90d" },
    { value: 180, label: "180d" },
    { value: 365, label: "1yr" },
    { value: 730, label: "2yr" },
  ];

  // Fetch all the data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ingredientId = priceChange.ingredient_id;
        if (!ingredientId) {
          throw new Error("No ingredient ID available");
        }

        // Calculate date range based on lookback selection
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - lookbackDays);

        // 1. Fetch the selected item's metadata
        const { data: ingredientData, error: ingredientError } = await supabase
          .from("master_ingredients")
          .select(`
            id,
            common_name,
            sub_category,
            umbrella_ingredient_id,
            food_sub_categories!inner (
              id,
              name
            )
          `)
          .eq("id", ingredientId)
          .single();

        if (ingredientError) {
          console.warn("Could not fetch ingredient metadata:", ingredientError);
        } else if (ingredientData) {
          setItemMetadata({
            commonName: ingredientData.common_name,
            subCategory: ingredientData.sub_category,
            subCategoryName: (ingredientData.food_sub_categories as any)?.name || null,
            umbrellaId: ingredientData.umbrella_ingredient_id,
            umbrellaName: null, // Could fetch if needed
          });
        }

        // 2. Fetch this item's FULL price history (180 days)
        // Uses vendor_price_history_all view which includes ALL records, not just changes
        const { data: historyData, error: historyError } = await supabase
          .from("vendor_price_history_all")
          .select("*")
          .eq("master_ingredient_id", ingredientId)
          .gte("effective_date", startDate.toISOString().split("T")[0])
          .order("effective_date", { ascending: true });

        if (historyError) throw historyError;

        // Transform data - is_price_change flag comes from the view
        const selectedPoints: HistoryDataPoint[] = (historyData || []).map((row, index) => {
          const currentPrice = row.new_price || 0;
          const previousPrice = row.old_price || null;
          
          // Use the view's is_price_change flag, with first record always being a "change"
          const hasChange = index === 0 ? true : (row.is_price_change === true);
          
          return {
            date: new Date(row.effective_date).getTime(),
            dateStr: new Date(row.effective_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            price: currentPrice,
            previousPrice,
            vendor: row.vendor_id,
            ingredientId: row.master_ingredient_id,
            hasChange,
          };
        });
        setSelectedHistory(selectedPoints);

        // 3. If we have a common_name, fetch other vendors with same product
        // Still uses enriched view (only changes) for cleaner comparison lines
        if (ingredientData?.common_name) {
          const { data: siblingData, error: siblingError } = await supabase
            .from("master_ingredients")
            .select("id, vendor, product")
            .eq("common_name", ingredientData.common_name)
            .neq("id", ingredientId);

          if (!siblingError && siblingData && siblingData.length > 0) {
            const siblingIds = siblingData.map((s) => s.id);
            
            // Fetch price history for siblings (use enriched - only changes for cleaner lines)
            const { data: siblingHistory, error: sibHistError } = await supabase
              .from("vendor_price_history_enriched")
              .select("*")
              .in("master_ingredient_id", siblingIds)
              .gte("effective_date", startDate.toISOString().split("T")[0])
              .order("effective_date", { ascending: true });

            if (!sibHistError && siblingHistory) {
              // Group by ingredient
              const grouped = new Map<string, HistoryDataPoint[]>();
              siblingHistory.forEach((row) => {
                const id = row.master_ingredient_id;
                if (!grouped.has(id)) {
                  grouped.set(id, []);
                }
                grouped.get(id)!.push({
                  date: new Date(row.effective_date).getTime(),
                  dateStr: new Date(row.effective_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  price: row.new_price || 0,
                  previousPrice: row.old_price || null,
                  vendor: row.vendor_id,
                  ingredientId: id,
                  hasChange: true, // All records from enriched view are changes
                });
              });
              setVendorComparisons(grouped);
            }
          }
        }

        // 4. If we have a sub_category, calculate category average
        // Still uses enriched view for category averages
        if (ingredientData?.sub_category) {
          const { data: categoryData, error: categoryError } = await supabase
            .from("vendor_price_history_enriched")
            .select(`
              effective_date,
              new_price,
              master_ingredients!inner (
                sub_category
              )
            `)
            .eq("master_ingredients.sub_category", ingredientData.sub_category)
            .gte("effective_date", startDate.toISOString().split("T")[0])
            .order("effective_date", { ascending: true });

          if (!categoryError && categoryData && categoryData.length > 0) {
            // Group by date and calculate average
            const dateGroups = new Map<string, number[]>();
            categoryData.forEach((row) => {
              const dateKey = row.effective_date;
              if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, []);
              }
              if (row.new_price) {
                dateGroups.get(dateKey)!.push(row.new_price);
              }
            });

            const avgPoints: HistoryDataPoint[] = [];
            dateGroups.forEach((prices, dateKey) => {
              if (prices.length > 0) {
                const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                avgPoints.push({
                  date: new Date(dateKey).getTime(),
                  dateStr: new Date(dateKey).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  price: avg,
                  previousPrice: null,
                  vendor: "Category Avg",
                  ingredientId: "category",
                  hasChange: false,
                });
              }
            });
            setCategoryAverage(avgPoints.sort((a, b) => a.date - b.date));
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch price history details:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [priceChange, lookbackDays]);

  // Calculate stats
  const stats = useMemo(() => {
    if (selectedHistory.length === 0) return null;

    const prices = selectedHistory.map((p) => p.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const totalChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    const volatility = prices.length > 1 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;
    
    // Count actual price changes vs stable records
    const actualChanges = selectedHistory.filter(p => p.hasChange).length;

    // Compare to category average
    let vsCategoryAvg: number | null = null;
    if (categoryAverage.length > 0) {
      const categoryPrices = categoryAverage.map((p) => p.price);
      const categoryAvgPrice = categoryPrices.reduce((a, b) => a + b, 0) / categoryPrices.length;
      vsCategoryAvg = categoryAvgPrice > 0 ? ((avgPrice - categoryAvgPrice) / categoryAvgPrice) * 100 : null;
    }

    // Find cheapest vendor
    let cheapestVendor: { vendor: string; price: number; savings: number } | null = null;
    vendorComparisons.forEach((points) => {
      if (points.length > 0) {
        const latestPrice = points[points.length - 1].price;
        if (!cheapestVendor || latestPrice < cheapestVendor.price) {
          cheapestVendor = {
            vendor: points[0].vendor,
            price: latestPrice,
            savings: lastPrice > 0 ? ((lastPrice - latestPrice) / lastPrice) * 100 : 0,
          };
        }
      }
    });

    return {
      firstPrice,
      lastPrice,
      minPrice,
      maxPrice,
      avgPrice,
      totalChange,
      volatility,
      recordCount: selectedHistory.length,
      actualChanges,
      vsCategoryAvg,
      cheapestVendor,
    };
  }, [selectedHistory, categoryAverage, vendorComparisons]);

  // Prepare chart data - merge all series into unified timeline
  // Include hasChange flag for custom dot rendering
  const chartData = useMemo(() => {
    const allPoints = new Map<number, Record<string, any>>();

    // Add selected item's data with change tracking
    selectedHistory.forEach((point) => {
      if (!allPoints.has(point.date)) {
        allPoints.set(point.date, { date: point.date });
      }
      allPoints.get(point.date)!["selected"] = point.price;
      allPoints.get(point.date)!["hasChange"] = point.hasChange;
    });

    // Add vendor comparisons
    if (showVendorComparison) {
      vendorComparisons.forEach((points, id) => {
        points.forEach((point) => {
          if (!allPoints.has(point.date)) {
            allPoints.set(point.date, { date: point.date });
          }
          allPoints.get(point.date)![`vendor_${id}`] = point.price;
        });
      });
    }

    // Add category average
    if (showCategoryTrend) {
      categoryAverage.forEach((point) => {
        if (!allPoints.has(point.date)) {
          allPoints.set(point.date, { date: point.date });
        }
        allPoints.get(point.date)!["category"] = point.price;
      });
    }

    return Array.from(allPoints.values()).sort((a, b) => a.date - b.date);
  }, [selectedHistory, vendorComparisons, categoryAverage, showVendorComparison, showCategoryTrend]);

  // Build vendor lines config
  const vendorLines: VendorLine[] = useMemo(() => {
    const lines: VendorLine[] = [];
    let colorIndex = 1; // Start at 1, 0 is reserved for selected item

    vendorComparisons.forEach((points, id) => {
      if (points.length > 0) {
        lines.push({
          id,
          vendor: points[0].vendor,
          product: priceChange.product_name,
          color: VENDOR_COLORS[colorIndex % VENDOR_COLORS.length],
          dataKey: `vendor_${id}`,
          isSelected: false,
        });
        colorIndex++;
      }
    });

    return lines;
  }, [vendorComparisons, priceChange.product_name]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const allPrices: number[] = [];
    
    selectedHistory.forEach((p) => allPrices.push(p.price));
    if (showVendorComparison) {
      vendorComparisons.forEach((points) => {
        points.forEach((p) => allPrices.push(p.price));
      });
    }
    if (showCategoryTrend) {
      categoryAverage.forEach((p) => allPrices.push(p.price));
    }

    if (allPrices.length === 0) return [0, 100];

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.15 || 1;

    return [Math.max(0, min - padding), max + padding];
  }, [selectedHistory, vendorComparisons, categoryAverage, showVendorComparison, showCategoryTrend]);

  // Custom tooltip with change indicator
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const date = new Date(label).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    
    const hasChange = payload[0]?.payload?.hasChange;

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-gray-400">{date}</p>
          {hasChange === false && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-500">
              no change
            </span>
          )}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300">{entry.name}</span>
            </div>
            <span className="font-medium text-white">${entry.value?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Period:</span>
                <div className="flex gap-1">
                  {LOOKBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLookbackDays(opt.value)}
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
              {/* Stats Row - Updated to show records vs changes */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <p className="text-2xs text-gray-500 uppercase">{lookbackDays >= 365 ? `${Math.round(lookbackDays / 365)}yr` : `${lookbackDays}d`} Change</p>
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
                  {/* Records vs Changes stat */}
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
              )}

              {/* Lookback Period Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Period:</span>
                <div className="flex gap-1">
                  {LOOKBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLookbackDays(opt.value)}
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

              {/* Chart Controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Compare:</span>
                {vendorComparisons.size > 0 && (
                  <button
                    onClick={() => setShowVendorComparison(!showVendorComparison)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      showVendorComparison
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    <Truck className="w-3 h-3 inline mr-1" />
                    Other Vendors ({vendorComparisons.size})
                  </button>
                )}
                {categoryAverage.length > 0 && (
                  <button
                    onClick={() => setShowCategoryTrend(!showCategoryTrend)}
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

              {/* Chart Legend for dot styles */}
              <div className="flex items-center gap-4 text-2xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-400 border border-primary-700" />
                  <span>Price changed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full border border-dashed border-gray-500" />
                  <span>Recorded (no change)</span>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(timestamp) => {
                        const d = new Date(timestamp);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      iconType="line"
                    />

                    {/* Average reference line */}
                    {stats && (
                      <ReferenceLine
                        y={stats.avgPrice}
                        stroke="#2dd4bf"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        label={{
                          value: `$${stats.avgPrice.toFixed(2)} avg`,
                          fill: "#2dd4bf",
                          fontSize: 10,
                          position: "right",
                        }}
                      />
                    )}

                    {/* Selected item line - uses custom dot for change visualization */}
                    <Line
                      type="monotone"
                      dataKey="selected"
                      name={priceChange.vendor_id}
                      stroke={VENDOR_COLORS[0]}
                      strokeWidth={2.5}
                      dot={<CustomDot />}
                      activeDot={{ fill: "#5eead4", strokeWidth: 0, r: 7 }}
                      connectNulls
                    />

                    {/* Vendor comparison lines - dashed */}
                    {showVendorComparison &&
                      vendorLines.map((line) => (
                        <Line
                          key={line.id}
                          type="monotone"
                          dataKey={line.dataKey}
                          name={line.vendor}
                          stroke={line.color}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={{ fill: line.color, strokeWidth: 0, r: 4 }}
                          connectNulls
                        />
                      ))}

                    {/* Category average - dotted, faint */}
                    {showCategoryTrend && (
                      <Line
                        type="monotone"
                        dataKey="category"
                        name="Category Avg"
                        stroke={CATEGORY_COLOR}
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                        opacity={0.6}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Insights */}
              {stats && (
                <div className="space-y-2">
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
                                over {lookbackDays >= 365 ? `${Math.round(lookbackDays / 365)} year${Math.round(lookbackDays / 365) > 1 ? 's' : ''}` : `${lookbackDays} days`}
                              </>
                            ) : (
                              <>
                                Price{" "}
                                <span className="text-emerald-400 font-medium">
                                  down {Math.abs(stats.totalChange).toFixed(1)}%
                                </span>{" "}
                                over {lookbackDays >= 365 ? `${Math.round(lookbackDays / 365)} year${Math.round(lookbackDays / 365) > 1 ? 's' : ''}` : `${lookbackDays} days`}
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
              )}

              {/* Price Change History List - shows change indicator */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Price Records ({selectedHistory.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {[...selectedHistory].reverse().map((point, index) => {
                    const prevPoint = selectedHistory[selectedHistory.length - index - 2];
                    const change = prevPoint && prevPoint.price > 0
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
                          <Calendar className={`w-3.5 h-3.5 ${point.hasChange ? "text-gray-500" : "text-gray-600"}`} />
                          <span className={`text-xs ${point.hasChange ? "text-gray-400" : "text-gray-500"}`}>
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
                          <span className={`text-sm font-medium tabular-nums ${
                            point.hasChange ? "text-white" : "text-gray-500"
                          }`}>
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            {lookbackDays >= 365 ? `${Math.round(lookbackDays / 365)} year` : `${lookbackDays} day`} lookback • {stats?.actualChanges || 0} price change{stats?.actualChanges !== 1 ? "s" : ""} across {selectedHistory.length} record{selectedHistory.length !== 1 ? "s" : ""}
            {vendorComparisons.size > 0 && ` • ${vendorComparisons.size} vendor comparison${vendorComparisons.size !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
};
