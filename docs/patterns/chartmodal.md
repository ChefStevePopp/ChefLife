# Chart Modal Pattern

**Purpose:** Display time-series data with comparison layers and actionable insights in a modal dialog.

**Gold Standard:** `src/features/admin/components/sections/VendorInvoice/components/PriceHistory/PriceHistoryDetailModal.tsx`

**Also See:** 
- `PriceHistoryModalById.tsx` - Wrapper that accepts just an ingredient ID
- `UmbrellaItemCard.tsx` - PriceHistoryModal, AggregatePurchaseHistoryModal

---

## Data Sources

### The Three-Table Architecture

```
vendor_price_history (raw table)
        │
        ├──► vendor_price_history_all (view)
        │    - ALL records including stable prices
        │    - Use for: Full history charting
        │
        └──► vendor_price_history_enriched (view)  
             - Only records where price CHANGED
             - Includes: vendor_logo_url, alert flags
             - Use for: Alerts, ticker, comparisons
```

### When to Use Each

| Source | Use Case | Why |
|--------|----------|-----|
| `vendor_price_history_all` | **Charting the selected item's full history** | Shows every invoice record, including when price stayed the same. Provides complete timeline. |
| `vendor_price_history_enriched` | **Getting latest price change, vendor comparisons, category averages** | Only price changes = cleaner comparison lines, accurate change_percent. Has logo URLs and reporting flags. |
| `master_ingredients` | **Fallback only** | For ingredients with no price history yet (new or legacy). |

### Reporting & Tracking Columns

These columns live in `master_ingredients` and are exposed through the views:

| Column | Purpose | Where It Shows |
|--------|---------|----------------|
| `show_in_price_ticker` | Display toggle | Price Watch Ticker (visible or not) |
| `alert_price_change` | Notification trigger | NEXUS broadcasts → Activity Log |
| `alert_low_stock` | Notification trigger | NEXUS broadcasts → Activity Log |
| `vitals_tier` | Operational criticality | BOH Vitals cards ('standard', 'elevated', 'critical') |

### Data Flow in PriceHistoryDetailModal

```typescript
// 1. Selected item's FULL history (for the chart)
const { data: historyData } = await supabase
  .from("vendor_price_history_all")  // ◄── ALL records
  .select("*")
  .eq("master_ingredient_id", ingredientId)
  .gte("effective_date", startDate)
  .order("effective_date", { ascending: true });

// 2. Sibling vendors (same common_name) - only CHANGES for cleaner lines
const { data: siblingHistory } = await supabase
  .from("vendor_price_history_enriched")  // ◄── Only changes
  .select("*")
  .in("master_ingredient_id", siblingIds)
  .gte("effective_date", startDate);

// 3. Category average - only CHANGES
const { data: categoryData } = await supabase
  .from("vendor_price_history_enriched")  // ◄── Only changes
  .select("effective_date, new_price, master_ingredients!inner(sub_category)")
  .eq("master_ingredients.sub_category", subCategoryId);
```

### Data Flow in PriceHistoryModalById (Wrapper)

```typescript
// Try enriched view first for accurate latest price change
const { data: latestPriceChange } = await supabase
  .from("vendor_price_history_enriched")  // ◄── Has logo, change_percent
  .select("*")
  .eq("master_ingredient_id", ingredientId)
  .order("effective_date", { ascending: false })
  .limit(1)
  .single();

// Fallback to master_ingredients if no history exists
if (!latestPriceChange) {
  const { data: ingredient } = await supabase
    .from("master_ingredients")
    .select("*")
    .eq("id", ingredientId)
    .single();
}
```

### View Definitions (Reference)

**vendor_price_history_all:**
- Joins `vendor_price_history` with `master_ingredients` and `vendors`
- Includes `is_price_change` flag (true if price differs from previous)
- Returns ALL records

**vendor_price_history_enriched:**
- Same joins as above
- Filters to only rows where price changed
- Includes `vendor_logo_url`, `alert_price_change`, `show_in_price_ticker`, `vitals_tier`
- Pre-calculates `change_percent`

---

## When to Use

- Drill-down from a list row to see historical trends
- Compare a single item against peers, categories, or benchmarks
- Surface actionable insights ("Flanagan has this cheaper")
- Any 30-180 day time-series visualization

---

## Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo/Icon] Product Name                                       [X]    │
│  Vendor • Item Code • Category                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ +12.8%   │ │ $32.15   │ │ $29.80   │ │ 15.2%    │                   │
│  │ 180d Chg │ │ Current  │ │ Avg      │ │ Volatility│                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│                                                                         │
│  Compare: [Other Vendors (3)] [Category Avg]                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    📈 RECHARTS LINE CHART                         │ │
│  │                                                                   │ │
│  │   ━━━ This Item (primary, thick, teal)                           │ │
│  │   --- Vendor 2 (dashed, amber)                                   │ │
│  │   --- Vendor 3 (dashed, purple)                                  │ │
│  │   ··· Category avg (dotted, gray, faint)                         │ │
│  │   ─ ─ Average reference line                                      │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  INSIGHTS                                                               │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ [Layers] 8.2% above category   │ │ [Sparkles] Flanagan has    │   │
│  │ Based on sub-category prices   │ │ this for $29.80 (7% less)  │   │
│  └─────────────────────────────────┘ └─────────────────────────────┘   │
│                                                                         │
│  PRICE CHANGES (12)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📅 Jan 15, 2026    $30.50 → $32.15    +5.4%                     │   │
│  │ 📅 Dec 28, 2025    $29.80 → $30.50    +2.3%                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│  180 day lookback • 12 data points • 3 vendor comparisons              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Modal Shell

```tsx
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
      {/* Logo + Title */}
      <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-700/50 ...">
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Content - scrollable */}
    <div className="p-4 overflow-y-auto max-h-[70vh]">
      {/* Stats, Chart, Insights, List */}
    </div>

    {/* Footer */}
    <div className="p-3 border-t border-gray-700 bg-gray-800/50">
      <p className="text-xs text-gray-500 text-center">...</p>
    </div>
  </div>
</div>
```

### 2. Stats Row

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
    <p className="text-2xs text-gray-500 uppercase">180d Change</p>
    <p className={`text-lg font-semibold tabular-nums ${
      change > 0 ? "text-rose-400" : change < 0 ? "text-emerald-400" : "text-gray-400"
    }`}>
      {change > 0 ? "+" : ""}{change.toFixed(1)}%
    </p>
  </div>
  {/* Current, Avg, Volatility cards */}
</div>
```

### 3. Recharts Line Chart

```tsx
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, CartesianGrid,
} from "recharts";

// Color palette
const VENDOR_COLORS = [
  "#2dd4bf", // teal (primary)
  "#f59e0b", // amber
  "#a78bfa", // purple
  "#fb7185", // rose
  "#38bdf8", // sky
  "#4ade80", // green
  "#f472b6", // pink
  "#facc15", // yellow
];
const CATEGORY_COLOR = "#6b7280"; // gray

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
      tickFormatter={(ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} iconType="line" />

    {/* Average reference line */}
    <ReferenceLine
      y={avgPrice}
      stroke="#2dd4bf"
      strokeDasharray="5 5"
      strokeWidth={1}
      label={{ value: `$${avgPrice.toFixed(2)} avg`, fill: "#2dd4bf", fontSize: 10, position: "right" }}
    />

    {/* Primary line - thick, solid */}
    <Line
      type="monotone"
      dataKey="selected"
      name={vendorName}
      stroke={VENDOR_COLORS[0]}
      strokeWidth={3}
      dot={{ fill: VENDOR_COLORS[0], strokeWidth: 0, r: 4 }}
      activeDot={{ fill: "#5eead4", strokeWidth: 0, r: 6 }}
      connectNulls
    />

    {/* Comparison lines - dashed */}
    {vendorLines.map((line) => (
      <Line
        key={line.id}
        type="monotone"
        dataKey={line.dataKey}
        name={line.vendor}
        stroke={line.color}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
        connectNulls
      />
    ))}

    {/* Category average - dotted, faint */}
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
  </LineChart>
</ResponsiveContainer>
```

### 4. Custom Tooltip

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const date = new Date(label).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-2">{date}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300">{entry.name}</span>
          </div>
          <span className="font-medium text-white">${entry.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};
```

### 5. Toggle Buttons for Comparison Layers

```tsx
<div className="flex items-center gap-3">
  <span className="text-xs text-gray-500">Compare:</span>
  
  <button
    onClick={() => setShowVendorComparison(!showVendorComparison)}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      showVendorComparison
        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        : "bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-gray-500"
    }`}
  >
    <Truck className="w-3 h-3 inline mr-1" />
    Other Vendors ({count})
  </button>

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
</div>
```

### 6. Insight Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  {/* vs Category */}
  {vsCategoryAvg !== null && (
    <div className="p-3 bg-gray-900/30 rounded-lg border border-gray-700/30 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
        <Layers className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-sm text-gray-300">
          <span className={vsCategoryAvg > 0 ? "text-rose-400" : "text-emerald-400"}>
            {Math.abs(vsCategoryAvg).toFixed(1)}% {vsCategoryAvg > 0 ? "above" : "below"}
          </span> category average
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Based on sub-category prices</p>
      </div>
    </div>
  )}

  {/* Cheapest vendor */}
  {cheapestVendor && cheapestVendor.savings > 0 && (
    <div className="p-3 bg-gray-900/30 rounded-lg border border-emerald-500/20 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm text-gray-300">
          <span className="text-emerald-400 font-medium">{cheapestVendor.vendor}</span> has this for{" "}
          <span className="text-emerald-400 font-medium">${cheapestVendor.price.toFixed(2)}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Save {cheapestVendor.savings.toFixed(1)}% by switching
        </p>
      </div>
    </div>
  )}

  {/* Volatility warning */}
  {volatility > 20 && (
    <div className="p-3 bg-gray-900/30 rounded-lg border border-amber-500/20 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <p className="text-sm text-gray-300">
          <span className="text-amber-400 font-medium">High volatility</span> — price swings of {volatility.toFixed(0)}%
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Consider menu price buffer or alternative vendors</p>
      </div>
    </div>
  )}

  {/* Trend direction */}
  {Math.abs(totalChange) > 5 && (
    <div className={`p-3 bg-gray-900/30 rounded-lg border flex items-start gap-3 ${
      totalChange > 0 ? "border-rose-500/20" : "border-emerald-500/20"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        totalChange > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"
      }`}>
        {totalChange > 0 ? (
          <TrendingUp className="w-4 h-4 text-rose-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      <div>
        <p className="text-sm text-gray-300">
          Price <span className={totalChange > 0 ? "text-rose-400" : "text-emerald-400"}>
            {totalChange > 0 ? "up" : "down"} {Math.abs(totalChange).toFixed(1)}%
          </span> over 180 days
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          From ${firstPrice.toFixed(2)} to ${lastPrice.toFixed(2)}
        </p>
      </div>
    </div>
  )}
</div>
```

---

## Data Fetching Pattern

```tsx
useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get item metadata (common_name, sub_category for comparisons)
      const { data: itemData } = await supabase
        .from("master_ingredients")
        .select("id, common_name, sub_category, ...")
        .eq("id", itemId)
        .single();

      // 2. Get this item's history (180 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 180);
      
      const { data: historyData } = await supabase
        .from("vendor_price_history_enriched")
        .select("*")
        .eq("master_ingredient_id", itemId)
        .gte("effective_date", startDate.toISOString().split("T")[0])
        .order("effective_date", { ascending: true });

      // 3. Get sibling items (same common_name, different vendors)
      if (itemData?.common_name) {
        const { data: siblings } = await supabase
          .from("master_ingredients")
          .select("id, vendor, product")
          .eq("common_name", itemData.common_name)
          .neq("id", itemId);

        // Fetch their price history too...
      }

      // 4. Calculate category average (same sub_category)
      if (itemData?.sub_category) {
        // Fetch all items in category, group by date, calculate avg...
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [itemId]);
```

---

## Chart Data Preparation

Merge all series into a unified timeline:

```tsx
const chartData = useMemo(() => {
  const allPoints = new Map<number, Record<string, number>>();

  // Add selected item
  selectedHistory.forEach((point) => {
    if (!allPoints.has(point.date)) {
      allPoints.set(point.date, { date: point.date });
    }
    allPoints.get(point.date)!["selected"] = point.price;
  });

  // Add vendor comparisons (if toggled on)
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

  // Add category average (if toggled on)
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
```

---

## Y-Axis Domain Calculation

```tsx
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
```

---

## Wiring Row Click → Modal

```tsx
// In parent list component
const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

<ExcelDataGrid
  columns={columns}
  data={filteredData}
  onRowClick={(row) => setSelectedItem(row as ItemType)}
/>

{selectedItem && (
  <ChartModal
    item={selectedItem}
    onClose={() => setSelectedItem(null)}
  />
)}
```

---

## Line Style Legend

| Series | Stroke | Width | Dash | Dot |
|--------|--------|-------|------|-----|
| **Primary (selected)** | `#2dd4bf` (teal) | 3px | solid | r=4, activeDot r=6 |
| **Vendor comparison** | from VENDOR_COLORS | 2px | `5 5` | none |
| **Category average** | `#6b7280` (gray) | 1px | `2 2` | none, opacity 0.6 |
| **Reference line** | `#2dd4bf` | 1px | `5 5` | — |

---

## Insight Thresholds

| Insight | Trigger | Border Color |
|---------|---------|--------------|
| vs Category | Always if data exists | `border-gray-700/30` |
| Cheapest Vendor | savings > 0 | `border-emerald-500/20` |
| High Volatility | > 20% | `border-amber-500/20` |
| Trend Direction | \|change\| > 5% | rose or emerald `/20` |

---

## Future Applications

This same pattern can power:
- **Ingredient Edit Page** — Price history chart on the ingredient detail
- **Recipe Margin Analysis** — Cost trend over time
- **Labor Cost Dashboard** — Wage/hour trends by position
- **Revenue Trends** — Daily/weekly/monthly comparisons
- **Inventory Valuation** — Stock value over time

---

## Entry Points

The Price History Modal can be opened from three locations:

| Location | Component | How It Works |
|----------|-----------|-------------|
| **Price Watch Ticker** | `PriceWatchTickerInline.tsx` | Click item → navigates to VIM history tab |
| **BOH Vitals Tab** | `AdminDash_BOHVitalsTab.tsx` | Click watched ingredient → opens `PriceHistoryModalById` |
| **Ingredient Detail Page** | `IngredientDetailPage/index.tsx` | "View Price History" button → opens `PriceHistoryModalById` |

---

*Last updated: January 19, 2026*
