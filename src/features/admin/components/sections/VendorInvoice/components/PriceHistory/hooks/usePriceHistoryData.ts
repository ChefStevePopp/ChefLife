import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { PriceChange, HistoryDataPoint, ItemMetadata, PriceHistoryData } from "../types";

/**
 * =============================================================================
 * USE PRICE HISTORY DATA
 * =============================================================================
 * Hook that fetches all price history data for a given ingredient.
 * 
 * Data Sources:
 * - vendor_price_history_all: ALL records (for this item's full history)
 * - vendor_price_history_enriched: Only price CHANGES (for comparisons/category)
 * - master_ingredients: Item metadata
 * =============================================================================
 */

interface UsePriceHistoryDataProps {
  priceChange: PriceChange;
  lookbackDays: number;
}

export function usePriceHistoryData({
  priceChange,
  lookbackDays,
}: UsePriceHistoryDataProps): PriceHistoryData {
  const [selectedHistory, setSelectedHistory] = useState<HistoryDataPoint[]>([]);
  const [vendorComparisons, setVendorComparisons] = useState<Map<string, HistoryDataPoint[]>>(new Map());
  const [categoryAverage, setCategoryAverage] = useState<HistoryDataPoint[]>([]);
  const [itemMetadata, setItemMetadata] = useState<ItemMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            umbrellaName: null,
          });
        }

        // 2. Fetch this item's FULL price history
        const { data: historyData, error: historyError } = await supabase
          .from("vendor_price_history_all")
          .select("*")
          .eq("master_ingredient_id", ingredientId)
          .gte("effective_date", startDate.toISOString().split("T")[0])
          .order("effective_date", { ascending: true });

        if (historyError) throw historyError;

        // Transform data
        const selectedPoints: HistoryDataPoint[] = (historyData || []).map((row, index) => {
          const currentPrice = row.new_price || 0;
          const previousPrice = row.old_price || null;
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
        if (ingredientData?.common_name) {
          const { data: siblingData, error: siblingError } = await supabase
            .from("master_ingredients")
            .select("id, vendor, product")
            .eq("common_name", ingredientData.common_name)
            .neq("id", ingredientId);

          if (!siblingError && siblingData && siblingData.length > 0) {
            const siblingIds = siblingData.map((s) => s.id);

            const { data: siblingHistory, error: sibHistError } = await supabase
              .from("vendor_price_history_enriched")
              .select("*")
              .in("master_ingredient_id", siblingIds)
              .gte("effective_date", startDate.toISOString().split("T")[0])
              .order("effective_date", { ascending: true });

            if (!sibHistError && siblingHistory) {
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
                  hasChange: true,
                });
              });
              setVendorComparisons(grouped);
            }
          }
        }

        // 4. If we have a sub_category, calculate category average
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

  return {
    selectedHistory,
    vendorComparisons,
    categoryAverage,
    itemMetadata,
    isLoading,
    error,
  };
}
