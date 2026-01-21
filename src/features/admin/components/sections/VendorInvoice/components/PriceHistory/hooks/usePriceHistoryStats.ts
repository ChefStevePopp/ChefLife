import { useMemo } from "react";
import type { HistoryDataPoint, PriceHistoryStats, VendorLine } from "../types";
import { VENDOR_COLORS } from "../config";

/**
 * =============================================================================
 * USE PRICE HISTORY STATS
 * =============================================================================
 * Hook that calculates statistics from price history data.
 * =============================================================================
 */

interface UsePriceHistoryStatsProps {
  selectedHistory: HistoryDataPoint[];
  vendorComparisons: Map<string, HistoryDataPoint[]>;
  categoryAverage: HistoryDataPoint[];
  productName: string;
}

interface UsePriceHistoryStatsReturn {
  stats: PriceHistoryStats | null;
  vendorLines: VendorLine[];
}

export function usePriceHistoryStats({
  selectedHistory,
  vendorComparisons,
  categoryAverage,
  productName,
}: UsePriceHistoryStatsProps): UsePriceHistoryStatsReturn {
  // Calculate stats
  const stats = useMemo<PriceHistoryStats | null>(() => {
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
    const actualChanges = selectedHistory.filter((p) => p.hasChange).length;

    // Compare to category average
    let vsCategoryAvg: number | null = null;
    if (categoryAverage.length > 0) {
      const categoryPrices = categoryAverage.map((p) => p.price);
      const categoryAvgPrice = categoryPrices.reduce((a, b) => a + b, 0) / categoryPrices.length;
      vsCategoryAvg =
        categoryAvgPrice > 0 ? ((avgPrice - categoryAvgPrice) / categoryAvgPrice) * 100 : null;
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

  // Build vendor lines config
  const vendorLines = useMemo<VendorLine[]>(() => {
    const lines: VendorLine[] = [];
    let colorIndex = 1; // Start at 1, 0 is reserved for selected item

    vendorComparisons.forEach((points, id) => {
      if (points.length > 0) {
        lines.push({
          id,
          vendor: points[0].vendor,
          product: productName,
          color: VENDOR_COLORS[colorIndex % VENDOR_COLORS.length],
          dataKey: `vendor_${id}`,
          isSelected: false,
        });
        colorIndex++;
      }
    });

    return lines;
  }, [vendorComparisons, productName]);

  return { stats, vendorLines };
}
