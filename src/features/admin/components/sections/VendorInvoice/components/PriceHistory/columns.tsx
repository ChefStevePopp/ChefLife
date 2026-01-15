import React from "react";
import { TrendingUp, TrendingDown, Truck } from "lucide-react";
import type { ExcelColumn } from "@/types/excel";
import { ImageWithFallback } from "@/shared/components/ImageWithFallback";

// Helper: Relative time formatter
const getRelativeTime = (dateString: string | null): string => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

// =============================================================================
// PRICE HISTORY COLUMNS - L5 Visual Hierarchy
// =============================================================================
// Tier 1 (Primary):   Vendor, Item Code — white, prominent
// Tier 2 (Secondary): Product, Change % — readable but softer
// Tier 3 (Supporting): Dates, Prices — muted, contextual
//
// Currency Treatment:
// - Old Price: Plain muted text (historical context)
// - New Price: Pill treatment based on direction
//   - Increase (bad): Rose pill
//   - Decrease (good): Emerald pill
// =============================================================================

export const priceHistoryColumns: ExcelColumn[] = [
  // --- Tier 3: Supporting (muted) ---
  {
    key: "created_at",
    name: "Created Date",
    type: "custom",
    filterType: "date",
    width: 110,
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span className="text-gray-500 text-sm">
        {value ? new Date(value).toLocaleDateString() : "—"}
      </span>
    ),
  },
  {
    key: "invoice_date",
    name: "Invoice Date",
    type: "custom",
    filterType: "date",
    width: 110,
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span className="text-gray-500 text-sm">
        {value ? new Date(value).toLocaleDateString() : "—"}
      </span>
    ),
  },

  // --- Tier 1: Vendor (logo or icon fallback) ---
  {
    key: "vendor_id",
    name: "Vendor",
    type: "custom",
    filterType: "select",
    width: 70,
    sortable: true,
    filterable: true,
    align: "center",
    render: (value: string, row: any) => {
      const logoUrl = row?.vendor_logo_url;
      return (
        <div className="flex items-center justify-center" title={value}>
          {logoUrl ? (
            <ImageWithFallback 
              src={logoUrl} 
              alt={value} 
              size="sm" 
              shape="rounded"
              className="w-8 h-8"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
              <Truck className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "item_code",
    name: "Item Code",
    type: "custom",
    filterType: "text",
    width: 110,
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span className="text-gray-400 font-mono">{value || "—"}</span>
    ),
  },

  // --- Tier 2: Secondary ---
  {
    key: "product_name",
    name: "Product",
    type: "custom",
    filterType: "text",
    width: 220,
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span className="text-gray-300">{value || "—"}</span>
    ),
  },

  // --- Tier 3: Old Price with relative time ---
  {
    key: "old_price",
    name: "Old Price",
    type: "custom",
    filterType: "number",
    width: 100,
    sortable: true,
    filterable: true,
    align: "right",
    render: (value: number, row: any) => {
      const relativeTime = getRelativeTime(row?.previous_date);
      return (
        <div className="text-right">
          <div className="text-gray-500">
            <span className="text-gray-600">$</span> {value != null ? value.toFixed(2) : "—"}
          </div>
          {relativeTime && (
            <div className="text-[10px] text-gray-600">{relativeTime}</div>
          )}
        </div>
      );
    },
  },
  {
    key: "new_price",
    name: "New Price",
    type: "custom",
    filterType: "number",
    width: 110,
    sortable: true,
    filterable: true,
    align: "right",
    render: (value: number, row: any) => {
      const changePercent = row?.change_percent ?? 0;
      const isIncrease = changePercent > 0;
      const isDecrease = changePercent < 0;

      if (value == null) return <span className="text-gray-500">—</span>;

      // Rose icon for price increases (bad) - matches Change % pattern
      if (isIncrease) {
        return (
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            <span className="text-gray-300">
              <span className="text-gray-500">$</span> {value.toFixed(2)}
            </span>
          </span>
        );
      }

      // Emerald icon for price decreases (good) - matches Change % pattern
      if (isDecrease) {
        return (
          <span className="inline-flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">
              <span className="text-gray-500">$</span> {value.toFixed(2)}
            </span>
          </span>
        );
      }

      // Neutral (no change)
      return (
        <span className="text-gray-400">
          <span className="text-gray-500">$</span> {value.toFixed(2)}
        </span>
      );
    },
  },

  // --- Tier 2: Change indicator ---
  {
    key: "change_percent",
    name: "Change %",
    type: "percent",
    filterType: "number",
    width: 110,
    sortable: true,
    filterable: true,
    align: "right",
    // Uses PriceChangeCell via ExcelDataGrid's percent handler
  },
];
