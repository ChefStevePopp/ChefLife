import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { MasterIngredient } from "@/types/master-ingredient";

export interface PriceChange {
  id: string;
  organization_id: string;
  vendor_id: string;
  item_code: string;
  product_name: string;
  old_price: number;
  new_price: number;
  change_percent: number;
  created_at: string;
  invoice_date: string;
  previous_date: string | null;
  vendor_logo_url: string | null;
  // Reporting & Tracking flags from MIL
  alert_price_change: boolean;       // NEXUS notification on price changes
  show_in_price_ticker: boolean;     // Display in Price Watch Ticker
  vitals_tier: string;               // BOH Vitals criticality: 'standard' | 'elevated' | 'critical'
  master_ingredient?: MasterIngredient;
  ingredient_id?: string;
  // Canary column: 180-day record count for data integrity monitoring
  record_count_180d?: number;
}

interface VendorPriceChangesStore {
  priceChanges: PriceChange[];
  isLoading: boolean;
  error: string | null;
  fetchPriceChanges: (days?: number, filter?: { filterType?: 'increase' | 'decrease'; ingredientId?: string }, sortMode?: 'created' | 'invoice' | 'vendor') => Promise<void>;
  setFilter: (filter: { filterType?: 'increase' | 'decrease'; ingredientId?: string }) => void;
}

export const useVendorPriceChangesStore = create<VendorPriceChangesStore>(
  (set) => ({
    priceChanges: [],
    isLoading: false,
    error: null,

    fetchPriceChanges: async (days = 30, filter?: { filterType?: 'increase' | 'decrease'; ingredientId?: string }, sortMode: 'created' | 'invoice' | 'vendor' = 'created') => {
      try {
        set({ isLoading: true, error: null });

        // Determine which date field to filter on based on sort mode
        const dateField = sortMode === 'invoice' ? 'effective_date' : 'created_at';
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Try the enriched view first (has logos, previous_date, and alert flags)
        const { data: enrichedData, error: enrichedError } =
          await supabase
            .from("vendor_price_history_enriched")
            .select(`
              id,
              organization_id,
              master_ingredient_id,
              vendor_id,
              old_price,
              new_price,
              change_percent,
              effective_date,
              previous_effective_date,
              created_at,
              product_name,
              item_code,
              vendor_logo_url,
              alert_price_change,
              show_in_price_ticker,
              vitals_tier
            `)
            .gte(dateField, cutoffDate)
            .order(dateField, { ascending: false });

        if (!enrichedError && enrichedData) {
          // Get unique ingredient IDs for 180d count lookup
          const ingredientIds = [...new Set(
            enrichedData
              .map(row => row.master_ingredient_id)
              .filter(Boolean)
          )];

          // Fetch 180-day record counts for these ingredients (the "canary" data)
          // This is a separate query for efficiency - avoids complex window functions in main query
          const cutoff180d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          let recordCounts: Map<string, number> = new Map();
          
          if (ingredientIds.length > 0) {
            const { data: countData, error: countError } = await supabase
              .from("vendor_price_history")
              .select("master_ingredient_id")
              .in("master_ingredient_id", ingredientIds)
              .gte("effective_date", cutoff180d);

            if (!countError && countData) {
              // Count occurrences per ingredient
              countData.forEach(row => {
                const id = row.master_ingredient_id;
                recordCounts.set(id, (recordCounts.get(id) || 0) + 1);
              });
            }
          }

          // Use enriched view data with 180d counts merged in
          const priceChanges = enrichedData.map((row) => ({
            id: row.id,
            organization_id: row.organization_id,
            vendor_id: row.vendor_id,
            item_code: row.item_code || "",
            product_name: row.product_name || "Unknown Product",
            old_price: row.old_price || 0,
            new_price: row.new_price || 0,
            change_percent: row.change_percent || 0,
            created_at: row.created_at,
            invoice_date: row.effective_date,
            previous_date: row.previous_effective_date,
            vendor_logo_url: row.vendor_logo_url,
            alert_price_change: row.alert_price_change || false,
            show_in_price_ticker: row.show_in_price_ticker || false,
            vitals_tier: row.vitals_tier || 'standard',
            ingredient_id: row.master_ingredient_id,
            // Canary column: 180-day record count
            record_count_180d: recordCounts.get(row.master_ingredient_id) || 0,
          }));

          set({ priceChanges, isLoading: false });
          return;
        }

        // Fallback: Query raw table if view doesn't exist yet
        console.warn("Enriched view not available, falling back to raw table");
        
        const { data: priceHistoryData, error: priceHistoryError } =
          await supabase
            .from("vendor_price_history")
            .select(`
              id,
              organization_id,
              master_ingredient_id,
              vendor_id,
              price,
              previous_price,
              effective_date,
              source_type,
              created_at
            `)
            .gte(
              "created_at",
              new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            )
            .order("created_at", { ascending: false });

        if (priceHistoryError) throw priceHistoryError;

        // Get all unique ingredient IDs
        const ingredientIds = [
          ...new Set(priceHistoryData?.map((h) => h.master_ingredient_id).filter(Boolean) || []),
        ];

        // Fetch master ingredients for these IDs
        const { data: masterIngredientsData, error: masterIngredientsError } =
          await supabase
            .from("master_ingredients_with_categories")
            .select("*")
            .in("id", ingredientIds);

        if (masterIngredientsError) throw masterIngredientsError;

        // Fetch 180-day record counts (canary data) - fallback path
        const cutoff180d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        let recordCounts: Map<string, number> = new Map();
        
        if (ingredientIds.length > 0) {
          const { data: countData, error: countError } = await supabase
            .from("vendor_price_history")
            .select("master_ingredient_id")
            .in("master_ingredient_id", ingredientIds)
            .gte("effective_date", cutoff180d);

          if (!countError && countData) {
            countData.forEach(row => {
              const id = row.master_ingredient_id;
              recordCounts.set(id, (recordCounts.get(id) || 0) + 1);
            });
          }
        }

        // Create a map for quick lookup
        const masterIngredientsMap = (masterIngredientsData || []).reduce(
          (map, ingredient) => {
            map[ingredient.id] = ingredient;
            return map;
          },
          {} as Record<string, MasterIngredient>,
        );

        // Transform to the expected PriceChange format
        const enrichedPriceChanges = (priceHistoryData || []).map((history) => {
          const ingredient = masterIngredientsMap[history.master_ingredient_id];
          const oldPrice = history.previous_price || 0;
          const newPrice = history.price || 0;
          const changePercent =
            oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

          return {
            id: history.id,
            organization_id: history.organization_id,
            vendor_id: history.vendor_id,
            item_code: ingredient?.item_code || "",
            product_name: ingredient?.product || "Unknown Product",
            old_price: oldPrice,
            new_price: newPrice,
            change_percent: changePercent,
            created_at: history.created_at,
            invoice_date: history.effective_date,
            previous_date: null, // Not available in fallback
            vendor_logo_url: null, // Not available in fallback
            alert_price_change: ingredient?.alert_price_change || false,
            show_in_price_ticker: ingredient?.show_in_price_ticker || false,
            vitals_tier: ingredient?.vitals_tier || 'standard',
            master_ingredient: ingredient,
            ingredient_id: history.master_ingredient_id,
            // Canary column: 180-day record count
            record_count_180d: recordCounts.get(history.master_ingredient_id) || 0,
          };
        });

        set({
          priceChanges: enrichedPriceChanges,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching price changes:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load price changes",
          isLoading: false,
        });
      }
    },

    setFilter: () => {
      // Filter is applied client-side in PriceHistory component
      // This is a no-op placeholder for interface compatibility
    },
  }),
);
