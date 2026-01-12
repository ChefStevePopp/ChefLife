import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Camera,
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  History,
  ChevronDown,
  Pencil,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { ExcelDataGrid } from "@/shared/components/ExcelDataGrid";
import type { ExcelColumn } from "@/types/excel";

// =============================================================================
// IMPORT HISTORY - L5 Design
// =============================================================================
// Version-controlled import history with audit trail
// Actions: View details, Edit (recalls document for correction)
// =============================================================================

export interface ImportRecord {
  id: string;
  created_at: string;
  vendor_id: string;
  import_type: string;
  file_name: string;
  file_url?: string;
  items_count: number;
  price_changes: number;
  new_items: number;
  status: string;
  created_by: string;
  created_by_name?: string;
  // Version control fields
  invoice_number?: string;
  version?: number;
  supersedes_id?: string;
  superseded_at?: string;
  superseded_by?: string;
}

interface ImportHistoryProps {
  onRecall?: (importRecord: ImportRecord) => void;
}

type DateRangeOption =
  | "all"
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "custom";

export const ImportHistory: React.FC<ImportHistoryProps> = ({ onRecall }) => {
  const { user, isLoading: authLoading, organizationId } = useAuth();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeOption, setDateRangeOption] =
    useState<DateRangeOption>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    },
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Update date range based on selected option
  useEffect(() => {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    switch (dateRangeOption) {
      case "today":
        break;
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "last7days":
        start.setDate(today.getDate() - 6);
        break;
      case "last30days":
        start.setDate(today.getDate() - 29);
        break;
      case "custom":
        setShowDatePicker(true);
        return;
      case "all":
        setShowDatePicker(false);
        return;
    }

    if (dateRangeOption !== "all" && dateRangeOption !== "custom") {
      setDateRange({
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      });
      setShowDatePicker(false);
    }
  }, [dateRangeOption]);

  // Fetch import history
  const fetchImportHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (authLoading) {
        setIsLoading(false);
        return;
      }

      const orgId = organizationId || user?.user_metadata?.organizationId;
      if (!orgId) {
        setError("Organization ID not found.");
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from("vendor_imports")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (dateRangeOption !== "all") {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      } else {
        query = query.limit(25);
      }

      if (searchTerm) {
        query = query.or(
          `vendor_id.ilike.%${searchTerm}%,file_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`,
        );
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setImports(data as ImportRecord[]);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching import history:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load import history",
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchImportHistory();
    } else if (!authLoading && !user) {
      setError("User not authenticated");
      setIsLoading(false);
    }
  }, [dateRange, dateRangeOption, authLoading, user, organizationId]);

  const handleRefresh = () => {
    fetchImportHistory();
  };

  // ---------------------------------------------------------------------------
  // L5 STATUS BADGE
  // ---------------------------------------------------------------------------
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
      superseded: { bg: "bg-gray-500/20", text: "text-gray-500", label: "Superseded" },
      processing: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Processing" },
      failed: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Failed" },
      pending: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Pending" },
    };
    
    const { bg, text, label } = config[status] || config.pending;
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // L5 PRICE CHANGE INDICATOR
  // ---------------------------------------------------------------------------
  const PriceChangeIndicator: React.FC<{ value: number; itemCount: number }> = ({ value, itemCount }) => {
    if (value === 0 || itemCount === 0) {
      return <span className="text-gray-500">—</span>;
    }
    
    const percent = Math.round((value / itemCount) * 100);
    const isHigh = percent >= 25;
    
    return (
      <div className="flex items-center gap-1">
        {isHigh ? (
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className={isHigh ? "text-amber-400" : "text-emerald-400"}>
          {value}
        </span>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // L5 COLUMNS
  // ---------------------------------------------------------------------------
  const columns: ExcelColumn[] = [
    {
      key: "created_at",
      name: "Date",
      type: "date",
      width: 120,
      sortable: true,
      filterable: true,
    },
    {
      key: "vendor_id",
      name: "Vendor",
      type: "text",
      width: 150,
      sortable: true,
      filterable: true,
    },
    {
      key: "invoice_number",
      name: "Reference",
      type: "custom",
      width: 130,
      sortable: true,
      filterable: true,
      render: (value: string | null) => (
        <span className={`font-mono text-xs ${!value ? "text-gray-500" : "text-gray-300"}`}>
          {value || "—"}
        </span>
      ),
    },
    {
      key: "version",
      name: "Ver",
      type: "custom",
      width: 50,
      align: "center",
      sortable: true,
      render: (value: number) => (
        <span className="text-xs text-gray-400">v{value || 1}</span>
      ),
    },
    {
      key: "file_name",
      name: "File",
      type: "text",
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      key: "items_count",
      name: "Items",
      type: "number",
      width: 70,
      align: "center",
      sortable: true,
    },
    {
      key: "price_changes",
      name: "Price Δ",
      type: "custom",
      width: 80,
      align: "center",
      sortable: true,
      render: (value: number, row: ImportRecord) => (
        <PriceChangeIndicator value={value} itemCount={row.items_count} />
      ),
    },
    {
      key: "status",
      name: "Status",
      type: "custom",
      width: 110,
      sortable: true,
      filterable: true,
      filterType: "select",
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      name: "",
      type: "custom",
      width: 80,
      sortable: false,
      filterable: false,
      render: (_value: any, row: ImportRecord) => (
        <div className="flex justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info(`Viewing details for ${row.file_name}`);
              // TODO: Open detail modal
            }}
            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded hover:bg-blue-500/10"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status !== 'superseded' && onRecall && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecall(row);
              }}
              className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-500/10"
              title="Edit / Create correction"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* L5 Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
            <History className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Import History</h3>
            <p className="text-sm text-gray-400">
              Version-controlled audit trail of all invoice imports
            </p>
          </div>
        </div>
        <button onClick={handleRefresh} className="btn-ghost">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Date Range
          </label>
          <div className="relative">
            <select
              value={dateRangeOption}
              onChange={(e) =>
                setDateRangeOption(e.target.value as DateRangeOption)
              }
              className="input w-full appearance-none pr-10 h-9 text-sm"
            >
              <option value="all">All Records (Last 25)</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {showDatePicker && (
          <>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="input w-full h-9 text-sm"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="input w-full h-9 text-sm"
              />
            </div>
          </>
        )}

        <button onClick={fetchImportHistory} className="btn-ghost h-9 text-sm">
          <Search className="w-4 h-4 mr-2" />
          Search
        </button>
      </div>

      {/* Data Grid */}
      {authLoading || isLoading ? (
        <div className="flex items-center justify-center p-12 text-gray-400">
          <div className="animate-spin h-5 w-5 border-2 border-lime-500 border-t-transparent rounded-full mr-3"></div>
          {authLoading ? "Loading..." : "Loading import history..."}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-12 text-rose-400 gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      ) : (
        <ExcelDataGrid
          columns={columns}
          data={imports.map((record) => ({
            ...record,
            version: record.version || 1,
            invoice_number: record.invoice_number || null,
          }))}
          onRefresh={fetchImportHistory}
          type="import-history"
        />
      )}
    </div>
  );
};
