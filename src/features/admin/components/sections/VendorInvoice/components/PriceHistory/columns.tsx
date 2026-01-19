import React from "react";
import { TrendingUp, TrendingDown, Truck, Database } from "lucide-react";
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
//
// 180d Records (Canary Column):
// - Shows how many price records exist for this ingredient in last 180 days
// - 0 = no history (new item or data issue)
// - 1-2 = sparse
// - 6-12 = healthy (regular deliveries)
// - 20+ = suspicious (too many updates?)
// =============================================================================

export const priceHistoryColumns: ExcelColumn[] = [
  // --- Tier 3: Supporting (muted but legible) ---
  {
    key: "created_at",
    name: "Created Date",
    type: "custom",
    filterType: "date",
    width: 110,
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span className="text-gray-400 text-sm">
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
      <span className="text-gray-400 text-sm">
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

  // --- Tier 3: Old Price with relative date ---
  {
    key: "old_price",
    name: "Old Price",
    type: "custom",
    filterType: "number",
    width: 110,
    sortable: true,
    filterable: true,
    align: "right",
    render: (value: number, row: any) => {
      const relativeTime = getRelativeTime(row?.previous_date);
      return (
        <div className="text-right">
          <div className="text-gray-400 font-semibold">
            <span className="text-gray-500">$</span> {value != null ? value.toFixed(2) : "—"}
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

      // Rose for price increases (bad) - matches Change % pattern exactly
      if (isIncrease) {
        return (
          <span className="inline-flex items-center gap-1 text-rose-400">
            <TrendingUp className="w-4 h-4" />
            $ {value.toFixed(2)}
          </span>
        );
      }

      // Emerald for price decreases (good) - matches Change % pattern exactly
      if (isDecrease) {
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <TrendingDown className="w-4 h-4" />
            $ {value.toFixed(2)}
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

  // --- Canary Column: 180-Day Record Count ---
  // Shows data density for this ingredient - a health indicator
  {
    key: "record_count_180d",
    name: "180d",
    type: "custom",
    filterType: "number",
    width: 65,
    sortable: true,
    filterable: true,
    align: "center",
    render: (value: number | null | undefined) => {
      const count = value ?? 0;
      
      // Color coding based on data density
      // 0 = concerning (no history)
      // 1-2 = sparse (amber warning)
      // 3-12 = healthy (normal)
      // 13+ = frequent (might be suspicious if very high)
      let colorClass = "text-gray-500";
      let bgClass = "";
      let title = "Price records in last 180 days";
      
      if (count === 0) {
        colorClass = "text-gray-600";
        title = "No price history - new item or data gap";
      } else if (count <= 2) {
        colorClass = "text-amber-500/70";
        bgClass = "bg-amber-500/10";
        title = `${count} record${count > 1 ? 's' : ''} - sparse data`;
      } else if (count <= 12) {
        colorClass = "text-gray-400";
        title = `${count} records - healthy`;
      } else if (count <= 20) {
        colorClass = "text-primary-400/70";
        title = `${count} records - frequent updates`;
      } else {
        colorClass = "text-rose-400/70";
        bgClass = "bg-rose-500/10";
        title = `${count} records - unusually high, review for duplicates`;
      }

      return (
        <div 
          className={`flex items-center justify-center gap-1 ${bgClass} rounded px-1.5 py-0.5`}
          title={title}
        >
          <Database className={`w-3 h-3 ${colorClass}`} />
          <span className={`text-xs font-medium tabular-nums ${colorClass}`}>
            {count}
          </span>
        </div>
      );
    },
  },
];
