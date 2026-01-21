/**
 * =============================================================================
 * PRICE HISTORY MODULE
 * =============================================================================
 * Modular price history visualization system.
 * 
 * Structure:
 * ├── PriceHistoryDetailModal.tsx   ← Main modal (shell only, ~150 lines)
 * ├── PriceHistoryModalById.tsx     ← Wrapper for ID-based access
 * ├── PriceChangeCell.tsx           ← Cell renderer for ExcelDataGrid
 * ├── columns.tsx                   ← ExcelDataGrid column definitions
 * ├── hooks/
 * │   ├── usePriceHistoryData.ts    ← All data fetching
 * │   ├── usePriceHistoryStats.ts   ← Stats calculations
 * │   └── useChartData.ts           ← Chart data preparation
 * ├── components/
 * │   ├── StatsGrid.tsx             ← 5 stat boxes
 * │   ├── PeriodSelector.tsx        ← 30d/60d/90d/180d/1yr/2yr
 * │   ├── CompareToggles.tsx        ← Vendor/Category toggles
 * │   ├── ChartLegend.tsx           ← Dot style legend
 * │   ├── PriceHistoryChart.tsx     ← Recharts wrapper
 * │   ├── InsightsPanel.tsx         ← Actionable insights
 * │   ├── PriceRecordList.tsx       ← Scrollable history list
 * │   ├── CustomDot.tsx             ← Recharts custom dot
 * │   └── CustomTooltip.tsx         ← Recharts custom tooltip
 * ├── config.ts                     ← Colors, constants
 * └── types.ts                      ← TypeScript interfaces
 * =============================================================================
 */

// Main components
export { PriceHistoryDetailModal } from "./PriceHistoryDetailModal";
export { PriceHistoryModalById } from "./PriceHistoryModalById";
export { PriceChangeCell } from "./PriceChangeCell";
export { priceHistoryColumns } from "./columns";

// Hooks (for reuse in other contexts)
export { usePriceHistoryData, usePriceHistoryStats, useChartData } from "./hooks";

// Sub-components (for composition)
export {
  StatsGrid,
  PeriodSelector,
  CompareToggles,
  ChartLegend,
  PriceHistoryChart,
  InsightsPanel,
  PriceRecordList,
} from "./components";

// Config & Types
export { VENDOR_COLORS, CATEGORY_COLOR, LOOKBACK_OPTIONS, CHART_CONFIG } from "./config";
export type {
  HistoryDataPoint,
  VendorLine,
  ItemMetadata,
  PriceHistoryStats,
  PriceHistoryData,
} from "./types";
