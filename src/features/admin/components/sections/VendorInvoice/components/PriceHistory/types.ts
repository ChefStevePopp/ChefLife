import type { PriceChange } from "@/stores/vendorPriceChangesStore";

/**
 * =============================================================================
 * PRICE HISTORY TYPES
 * =============================================================================
 * Shared types for the Price History feature.
 * =============================================================================
 */

export interface HistoryDataPoint {
  date: number; // timestamp
  dateStr: string;
  price: number;
  previousPrice: number | null;
  vendor: string;
  ingredientId: string;
  hasChange: boolean; // True if price differs from previous record
}

export interface VendorLine {
  id: string;
  vendor: string;
  product: string;
  color: string;
  dataKey: string;
  isSelected: boolean;
}

export interface ItemMetadata {
  commonName: string | null;
  subCategory: string | null;
  subCategoryName: string | null;
  umbrellaId: string | null;
  umbrellaName: string | null;
}

export interface PriceHistoryStats {
  firstPrice: number;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalChange: number;
  volatility: number;
  recordCount: number;
  actualChanges: number;
  vsCategoryAvg: number | null;
  cheapestVendor: {
    vendor: string;
    price: number;
    savings: number;
  } | null;
}

export interface PriceHistoryData {
  selectedHistory: HistoryDataPoint[];
  vendorComparisons: Map<string, HistoryDataPoint[]>;
  categoryAverage: HistoryDataPoint[];
  itemMetadata: ItemMetadata | null;
  isLoading: boolean;
  error: string | null;
}

export type { PriceChange };
