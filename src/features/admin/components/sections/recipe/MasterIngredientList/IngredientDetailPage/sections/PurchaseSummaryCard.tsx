import React from "react";
import { DollarSign, FileText, History } from "lucide-react";
import type { PriceSource } from "../hooks/usePriceSource";

/**
 * =============================================================================
 * PURCHASE SUMMARY CARD
 * =============================================================================
 * Shows the current price with source information.
 * Displays invoice details or marks as manual entry.
 * =============================================================================
 */

interface PurchaseSummaryCardProps {
  productName: string;
  commonName: string | null;
  vendorName: string;
  currentPrice: number;
  unitOfMeasure: string;
  priceSource: PriceSource | null;
  onViewPriceHistory: () => void;
}

export const PurchaseSummaryCard: React.FC<PurchaseSummaryCardProps> = ({
  productName,
  commonName,
  vendorName,
  currentPrice,
  unitOfMeasure,
  priceSource,
  onViewPriceHistory,
}) => {
  if (currentPrice <= 0) return null;

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg overflow-hidden ring-1 ring-green-500/30">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-300">Purchase Summary</h2>
          <span className="text-xs text-gray-500">
            {priceSource?.type === "invoice"
              ? "From invoice import"
              : "Current pricing"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Main equation row */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap py-4">
          {/* Item */}
          <div className="text-center min-w-[80px]">
            <div
              className="text-lg sm:text-xl font-bold text-white truncate max-w-[140px]"
              title={commonName || productName}
            >
              {commonName || productName || "—"}
            </div>
            <div className="text-xs text-gray-500">Item</div>
          </div>

          <div className="text-lg text-gray-600 hidden sm:block">•</div>

          {/* Vendor */}
          <div className="text-center min-w-[80px]">
            <div
              className="text-lg sm:text-xl font-bold text-white truncate max-w-[120px]"
              title={priceSource?.vendorName || vendorName}
            >
              {priceSource?.vendorName || vendorName || "—"}
            </div>
            <div className="text-xs text-gray-500">Vendor</div>
          </div>

          <div className="text-lg text-gray-600 hidden sm:block">•</div>

          {/* Price Result */}
          <div className="text-center px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="text-xl sm:text-2xl font-bold text-green-400">
              ${currentPrice.toFixed(2)}
            </div>
            <div className="text-xs text-green-400/70">
              per {unitOfMeasure || "unit"}
            </div>
          </div>

          <div className="text-lg text-gray-600 hidden sm:block">•</div>

          {/* Invoice Date */}
          <div className="text-center min-w-[60px]">
            <div className="text-lg sm:text-xl font-bold text-white">
              {priceSource?.updatedAt
                ? priceSource.updatedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </div>
            <div className="text-xs text-gray-500">
              {priceSource?.type === "invoice" ? "Invoice Date" : "Updated"}
            </div>
          </div>
        </div>

        {/* Source indicator */}
        {priceSource?.type === "invoice" && (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-800/30 rounded-lg text-sm">
            <FileText className="w-3.5 h-3.5 text-green-400" />
            <span className="text-gray-400">
              {priceSource.invoiceNumber && (
                <>
                  Invoice{" "}
                  <span className="text-white">#{priceSource.invoiceNumber}</span>
                </>
              )}
              {priceSource.importedAt && (
                <span className="text-gray-500 ml-2">
                  • Imported{" "}
                  {priceSource.importedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </span>
          </div>
        )}
        {priceSource?.type === "manual" && (
          <div className="text-center text-xs text-gray-500">
            * Manual entry or legacy data — no invoice on file
          </div>
        )}

        {/* View Price History Button */}
        <button
          onClick={onViewPriceHistory}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          View Price History
        </button>
      </div>
    </div>
  );
};

export default PurchaseSummaryCard;
