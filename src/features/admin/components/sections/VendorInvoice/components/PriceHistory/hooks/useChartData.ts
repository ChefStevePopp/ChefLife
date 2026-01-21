import { useMemo } from "react";
import type { HistoryDataPoint } from "../types";

/**
 * =============================================================================
 * USE CHART DATA
 * =============================================================================
 * Hook that prepares chart data and calculates Y-axis domain.
 * =============================================================================
 */

interface UseChartDataProps {
  selectedHistory: HistoryDataPoint[];
  vendorComparisons: Map<string, HistoryDataPoint[]>;
  categoryAverage: HistoryDataPoint[];
  showVendorComparison: boolean;
  showCategoryTrend: boolean;
}

interface UseChartDataReturn {
  chartData: Record<string, any>[];
  yDomain: [number, number];
}

export function useChartData({
  selectedHistory,
  vendorComparisons,
  categoryAverage,
  showVendorComparison,
  showCategoryTrend,
}: UseChartDataProps): UseChartDataReturn {
  // Prepare chart data - merge all series into unified timeline
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

  // Calculate Y-axis domain
  const yDomain = useMemo<[number, number]>(() => {
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

  return { chartData, yDomain };
}
