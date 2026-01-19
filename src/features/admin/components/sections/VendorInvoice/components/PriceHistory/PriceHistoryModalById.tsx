import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PriceHistoryDetailModal } from "./PriceHistoryDetailModal";
import type { PriceChange } from "@/stores/vendorPriceChangesStore";

/**
 * ============================================================================
 * PRICE HISTORY MODAL BY ID
 * ============================================================================
 * A wrapper around PriceHistoryDetailModal that accepts just an ingredient ID
 * and fetches the necessary data to display the modal.
 * 
 * Data Sources:
 * - vendor_price_history_enriched: Latest price change with vendor info
 * - master_ingredients: Fallback for basic info if no price history exists
 * 
 * Use this when you have an ingredient ID but not a full PriceChange object.
 * ============================================================================
 */

interface PriceHistoryModalByIdProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientId: string | null;
  ingredientName?: string; // Optional - will be fetched if not provided
}

export const PriceHistoryModalById: React.FC<PriceHistoryModalByIdProps> = ({
  isOpen,
  onClose,
  ingredientId,
  ingredientName,
}) => {
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchIngredientData = async () => {
      if (!isOpen || !ingredientId) {
        setPriceChange(null);
        return;
      }

      setIsLoading(true);
      try {
        // First, try to get the most recent price change from the enriched view
        // This gives us accurate price data with vendor info and logos
        const { data: latestPriceChange, error: priceError } = await supabase
          .from("vendor_price_history_enriched")
          .select(`
            id,
            organization_id,
            master_ingredient_id,
            vendor_id,
            item_code,
            product_name,
            old_price,
            new_price,
            change_percent,
            effective_date,
            previous_effective_date,
            created_at,
            vendor_logo_url,
            alert_price_change,
            show_in_price_ticker,
            vitals_tier
          `)
          .eq("master_ingredient_id", ingredientId)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (!priceError && latestPriceChange) {
          // We have price history - use the enriched data
          const priceChangeObj: PriceChange = {
            id: latestPriceChange.id,
            organization_id: latestPriceChange.organization_id,
            vendor_id: latestPriceChange.vendor_id || "",
            item_code: latestPriceChange.item_code || "",
            product_name: ingredientName || latestPriceChange.product_name || "Unknown",
            old_price: latestPriceChange.old_price || 0,
            new_price: latestPriceChange.new_price || 0,
            change_percent: latestPriceChange.change_percent || 0,
            created_at: latestPriceChange.created_at,
            invoice_date: latestPriceChange.effective_date,
            previous_date: latestPriceChange.previous_effective_date,
            vendor_logo_url: latestPriceChange.vendor_logo_url,
            alert_price_change: latestPriceChange.alert_price_change || false,
            show_in_price_ticker: latestPriceChange.show_in_price_ticker || false,
            vitals_tier: latestPriceChange.vitals_tier || "standard",
            ingredient_id: ingredientId,
          };

          setPriceChange(priceChangeObj);
        } else {
          // No price history yet - fall back to master_ingredients for basic info
          // This allows opening the modal even for ingredients without history
          const { data: ingredient, error: ingredientError } = await supabase
            .from("master_ingredients")
            .select(`
              id,
              product,
              item_code,
              vendor,
              current_price,
              alert_price_change,
              show_in_price_ticker,
              vitals_tier,
              organization_id
            `)
            .eq("id", ingredientId)
            .single();

          if (ingredientError) throw ingredientError;

          // Try to get vendor logo
          let vendorLogoUrl: string | null = null;
          if (ingredient.vendor) {
            const { data: vendorData } = await supabase
              .from("vendors")
              .select("logo_url")
              .eq("vendor_id", ingredient.vendor)
              .eq("organization_id", ingredient.organization_id)
              .single();
            vendorLogoUrl = vendorData?.logo_url || null;
          }

          // No price history = no change to show
          // current_price is the only price we know
          const currentPrice = ingredient.current_price || 0;

          // Construct a PriceChange-compatible object
          const priceChangeObj: PriceChange = {
            id: ingredient.id,
            organization_id: ingredient.organization_id,
            vendor_id: ingredient.vendor || "",
            item_code: ingredient.item_code || "",
            product_name: ingredientName || ingredient.product || "Unknown",
            old_price: currentPrice, // Same as new = no change
            new_price: currentPrice,
            change_percent: 0,
            created_at: new Date().toISOString(),
            invoice_date: new Date().toISOString(),
            previous_date: null,
            vendor_logo_url: vendorLogoUrl,
            alert_price_change: ingredient.alert_price_change || false,
            show_in_price_ticker: ingredient.show_in_price_ticker || false,
            vitals_tier: ingredient.vitals_tier || "standard",
            ingredient_id: ingredient.id,
          };

          setPriceChange(priceChangeObj);
        }
      } catch (err) {
        console.error("Failed to fetch ingredient for price history:", err);
        setPriceChange(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIngredientData();
  }, [isOpen, ingredientId, ingredientName]);

  if (!isOpen || !ingredientId) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-gray-300">Loading price history...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!priceChange) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gray-800 border border-gray-700 rounded-xl p-8">
          <p className="text-gray-400">Could not load ingredient data</p>
          <button onClick={onClose} className="mt-4 btn-primary">Close</button>
        </div>
      </div>
    );
  }

  return <PriceHistoryDetailModal priceChange={priceChange} onClose={onClose} />;
};

export default PriceHistoryModalById;
