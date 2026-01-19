import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * =============================================================================
 * USE PRICE SOURCE HOOK
 * =============================================================================
 * Fetches and tracks where an ingredient's current price came from.
 * Shows invoice details or marks as manual/legacy entry.
 * =============================================================================
 */

export interface PriceSource {
  type: "invoice" | "manual" | "unknown";
  invoiceNumber?: string;
  vendorName?: string;
  updatedAt: Date;       // Invoice date (when price was effective)
  importedAt?: Date;     // Import date (when we recorded it)
}

export function usePriceSource() {
  const [priceSource, setPriceSource] = useState<PriceSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPriceSource = useCallback(
    async (ingredientId: string, fallbackUpdatedAt?: string) => {
      setIsLoading(true);
      try {
        // Get most recent price history entry for this ingredient
        const { data: priceHistory, error } = await supabase
          .from("vendor_price_history")
          .select(
            `
            id,
            price,
            created_at,
            source_type,
            vendor_id,
            vendor_import_id,
            vendor_imports (
              invoice_number,
              invoice_date,
              vendor_id,
              file_name,
              created_at
            )
          `
          )
          .eq("master_ingredient_id", ingredientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows returned, which is fine
          console.error("Error fetching price source:", error);
          setPriceSource(null);
          return;
        }

        if (priceHistory) {
          const vendorImport = priceHistory.vendor_imports as any;
          // Use invoice_date (when price was effective) not created_at (when we imported)
          const invoiceDate = vendorImport?.invoice_date
            ? new Date(vendorImport.invoice_date)
            : new Date(priceHistory.created_at);
          const importDate = vendorImport?.created_at
            ? new Date(vendorImport.created_at)
            : new Date(priceHistory.created_at);

          setPriceSource({
            type: "invoice",
            invoiceNumber: vendorImport?.invoice_number || undefined,
            vendorName:
              vendorImport?.vendor_id || priceHistory.vendor_id || undefined,
            updatedAt: invoiceDate,
            importedAt: importDate,
          });
        } else {
          // No price history - set as manual/legacy with ingredient's updated_at
          setPriceSource({
            type: "manual",
            updatedAt: fallbackUpdatedAt
              ? new Date(fallbackUpdatedAt)
              : new Date(),
          });
        }
      } catch (err) {
        console.error("Error fetching price source:", err);
        setPriceSource(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearPriceSource = useCallback(() => {
    setPriceSource(null);
  }, []);

  return {
    priceSource,
    isLoading,
    fetchPriceSource,
    clearPriceSource,
  };
}

export default usePriceSource;
