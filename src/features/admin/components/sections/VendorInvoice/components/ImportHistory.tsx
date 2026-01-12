import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  History,
  ChevronDown,
  Pencil,
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
  invoice_date?: string; // The date ON the invoice (calendar date)
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
  // L5 STATUS BADGE - Only colorize when status varies
  // ---------------------------------------------------------------------------
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Completed" },
      superseded: { bg: "bg-gray-500/20", text: "text-gray-500", label: "Superseded" },
      processing: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Processing" },
      failed: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Failed" },
      pending: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Pending" },
    };
    
    const { bg, text, label } = config[status] || config.pending;
    
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // L5 PRICE CHANGE - Show ratio and percentage for context
  // ---------------------------------------------------------------------------
  const PriceChangeCell: React.FC<{ changes: number; total: number }> = ({ changes, total }) => {
    if (changes === 0 || total === 0) {
      return <span className="text-gray-600">—</span>;
    }
    
    const percent = Math.round((changes / total) * 100);
    
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-gray-300">{changes}</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-500">{total}</span>
        <span className={`text-xs ${percent >= 80 ? 'text-amber-400' : 'text-gray-500'}`}>
          ({percent}%)
        </span>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // HELPER: Get reference - prioritize invoice_number, then derive from filename
  // ---------------------------------------------------------------------------
  const getReference = (record: ImportRecord): string => {
    // If we have an invoice_number, use it
    if (record.invoice_number) return record.invoice_number;
    
    // Derive from filename
    if (record.file_name) {
      const fileName = record.file_name.toLowerCase();
      
      // Check file extension to determine type
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Date-only filenames like "07-01-2025.csv" → show "CSV Import"
        const dateOnlyPattern = /^\d{2}-\d{2}-\d{4}\.(csv|xlsx|xls)$/i;
        if (dateOnlyPattern.test(record.file_name)) {
          return 'CSV Import';
        }
        // Otherwise strip extension and return filename as reference
        return record.file_name.replace(/\.[^/.]+$/, "");
      }
      
      if (fileName.endsWith('.pdf')) {
        return 'PDF Import';
      }
      
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
        return 'Photo Import';
      }
    }
    
    // Fall back to import_type if we have it
    if (record.import_type) {
      const typeLabels: Record<string, string> = {
        'csv_import': 'CSV Import',
        'pdf_import': 'PDF Import',
        'mobile_import': 'Mobile',
        'manual_entry': 'Manual',
      };
      return typeLabels[record.import_type] || record.import_type;
    }
    
    return 'Import';
  };

  // ---------------------------------------------------------------------------
  // HELPER: Get import type from filename or import_type field
  // ---------------------------------------------------------------------------
  const getImportType = (record: ImportRecord): string => {
    // First check filename extension
    if (record.file_name) {
      const fileName = record.file_name.toLowerCase();
      if (fileName.endsWith('.csv')) return 'csv';
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'xlsx';
      if (fileName.endsWith('.pdf')) return 'pdf';
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) return 'photo';
    }
    // Fall back to import_type field
    if (record.import_type) {
      if (record.import_type.includes('csv')) return 'csv';
      if (record.import_type.includes('pdf')) return 'pdf';
      if (record.import_type.includes('mobile')) return 'photo';
    }
    return 'other';
  };

  // ---------------------------------------------------------------------------
  // HELPER: Get import type badge
  // ---------------------------------------------------------------------------
  const ImportTypeBadge: React.FC<{ record: ImportRecord }> = ({ record }) => {
    const type = getImportType(record);
    const config: Record<string, { label: string; className: string }> = {
      csv: { label: 'CSV', className: 'text-blue-400 bg-blue-500/10' },
      xlsx: { label: 'Excel', className: 'text-emerald-400 bg-emerald-500/10' },
      pdf: { label: 'PDF', className: 'text-purple-400 bg-purple-500/10' },
      photo: { label: 'Photo', className: 'text-cyan-400 bg-cyan-500/10' },
      other: { label: 'Other', className: 'text-gray-400 bg-gray-500/10' },
    };
    const { label, className } = config[type] || config.other;
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${className}`}>
        {label}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // L5 COLUMNS
  // ---------------------------------------------------------------------------
  const columns: ExcelColumn[] = [
    {
      key: "invoice_date",
      name: "Invoice Date",
      type: "custom",
      width: 120,
      align: "center",
      sortable: true,
      filterable: true,
      render: (value: string | null, row: ImportRecord) => {
        const dateStr = value || row.created_at;
        if (!dateStr) return <span className="text-gray-600">—</span>;
        const date = new Date(dateStr);
        return (
          <span className="text-gray-300">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      key: "vendor_id",
      name: "Vendor",
      type: "text",
      width: 140,
      sortable: true,
      filterable: true,
    },
    {
      key: "import_type",
      name: "Type",
      type: "custom",
      width: 70,
      align: "center",
      sortable: true,
      filterable: true,
      render: (_value: string, row: ImportRecord) => <ImportTypeBadge record={row} />,
    },
    {
      key: "invoice_number",
      name: "Reference",
      type: "custom",
      width: 120,
      align: "center",
      sortable: true,
      filterable: true,
      render: (_value: string | null, row: ImportRecord) => {
        const ref = getReference(row);
        const isInvoiceNum = ref.startsWith('INV-');
        return (
          <span className={`text-xs ${isInvoiceNum ? 'font-mono text-gray-300' : 'text-gray-500'}`}>
            {ref}
          </span>
        );
      },
    },
    {
      key: "version",
      name: "Ver",
      type: "custom",
      width: 50,
      align: "center",
      sortable: true,
      render: (value: number) => {
        const ver = value || 1;
        // Only highlight versions > 1
        if (ver > 1) {
          return <span className="text-xs font-medium text-amber-400">v{ver}</span>;
        }
        return <span className="text-xs text-gray-600">v{ver}</span>;
      },
    },
    {
      key: "file_name",
      name: "Source File",
      type: "text",
      width: 160,
      sortable: true,
      filterable: true,
    },
    {
      key: "price_changes",
      name: "Price Updates",
      type: "custom",
      width: 130,
      align: "center",
      sortable: true,
      render: (value: number, row: ImportRecord) => (
        <PriceChangeCell changes={value} total={row.items_count} />
      ),
    },
    {
      key: "status",
      name: "Status",
      type: "custom",
      width: 100,
      align: "center",
      sortable: true,
      filterable: true,
      filterType: "select",
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      name: "",
      type: "custom",
      width: 70,
      align: "center",
      sortable: false,
      filterable: false,
      render: (_value: any, row: ImportRecord) => (
        <div className="flex justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info(`Viewing details for ${row.file_name}`);
            }}
            className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors rounded hover:bg-blue-500/10"
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
              className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-500/10"
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
