import React from "react";
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
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { CustomDot } from "./CustomDot";
import { CustomTooltip } from "./CustomTooltip";
import { VENDOR_COLORS, CATEGORY_COLOR, CHART_CONFIG } from "../config";
import type { VendorLine, PriceHistoryStats } from "../types";

/**
 * =============================================================================
 * PRICE HISTORY CHART
 * =============================================================================
 * Recharts line chart for price history visualization.
 * =============================================================================
 */

interface PriceHistoryChartProps {
  chartData: Record<string, any>[];
  yDomain: [number, number];
  stats: PriceHistoryStats | null;
  vendorId: string;
  vendorLines: VendorLine[];
  showVendorComparison: boolean;
  showCategoryTrend: boolean;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  chartData,
  yDomain,
  stats,
  vendorId,
  vendorLines,
  showVendorComparison,
  showCategoryTrend,
}) => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="bg-gray-900/50 rounded-lg p-4">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          .../PriceHistory/components/PriceHistoryChart.tsx
        </div>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid
            strokeDasharray={CHART_CONFIG.grid.strokeDasharray}
            stroke={CHART_CONFIG.grid.stroke}
            opacity={CHART_CONFIG.grid.opacity}
          />
          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: CHART_CONFIG.axis.fontSize, fill: CHART_CONFIG.axis.fill }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(timestamp) => {
              const d = new Date(timestamp);
              return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: CHART_CONFIG.axis.fontSize, fill: CHART_CONFIG.axis.fill }}
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
              stroke={VENDOR_COLORS[0]}
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{
                value: `$${stats.avgPrice.toFixed(2)} avg`,
                fill: VENDOR_COLORS[0],
                fontSize: 10,
                position: "right",
              }}
            />
          )}

          {/* Selected item line */}
          <Line
            type="monotone"
            dataKey="selected"
            name={vendorId}
            stroke={VENDOR_COLORS[0]}
            strokeWidth={CHART_CONFIG.selectedLine.strokeWidth}
            dot={<CustomDot />}
            activeDot={CHART_CONFIG.selectedLine.activeDot}
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
                strokeWidth={CHART_CONFIG.comparisonLine.strokeWidth}
                strokeDasharray={CHART_CONFIG.comparisonLine.strokeDasharray}
                dot={false}
                activeDot={{ fill: line.color, ...CHART_CONFIG.comparisonLine.activeDot }}
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
              strokeWidth={CHART_CONFIG.categoryLine.strokeWidth}
              strokeDasharray={CHART_CONFIG.categoryLine.strokeDasharray}
              dot={false}
              opacity={CHART_CONFIG.categoryLine.opacity}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
