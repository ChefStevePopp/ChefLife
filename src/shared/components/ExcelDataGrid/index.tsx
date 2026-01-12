import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  X,
  Download,
  RefreshCw,
  Database,
  RotateCcw,
  Columns,
  ChevronRight,
  Pencil,
} from "lucide-react";
import type { ExcelColumn } from "@/types/excel";
import { PaginationControls } from "./PaginationControls";
import { ColumnFilter } from "./ColumnFilter";
import { ResizableHeader } from "./ResizableHeader";
import { AllergenCell } from "@/features/admin/components/sections/recipe/MasterIngredientList/components/AllergenCell";
import { StatusCell } from "@/features/admin/components/sections/recipe/MasterIngredientList/components/StatusCell";
import { PriceChangeCell } from "@/features/admin/components/sections/VendorInvoice/components/PriceHistory/PriceChangeCell";
import { ImageWithFallback } from "@/shared/components/ImageWithFallback";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import toast from "react-hot-toast";

// =============================================================================
// EXCEL DATA GRID - L5 Design
// =============================================================================
// Reusable data grid with filtering, sorting, pagination, and column management.
// Used by: MasterIngredientList, VendorInvoiceManager, InventoryManagement
//
// Filter State Persistence:
// Supports restoring filter state when returning from detail views via
// initialFilterState prop and onFilterStateChange callback.
// =============================================================================

// Filter state type - exported for use by parent components
export interface GridFilterState {
  filters: Record<string, any>;
  activeFilters: string[];
  globalFilter: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
}

interface ExcelDataGridProps<T> {
  columns: ExcelColumn[];
  data: T[];
  categoryFilter?: string;
  onCategoryChange?: (category: string) => void;
  type?: string;
  onRowClick?: (row: T) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  /** Optional callback fired when filtered data changes (for navigation context, etc.) */
  onFilteredDataChange?: (filteredData: T[]) => void;
  /** Optional initial filter state to restore (e.g., when returning from detail view) */
  initialFilterState?: GridFilterState | null;
  /** Optional callback fired when filter state changes (for persistence) */
  onFilterStateChange?: (state: GridFilterState) => void;
}

// Helper to get nested value from object
const getNestedValue = (obj: any, path: string) => {
  return path.split(".").reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj);
};

// Helper to detect UUID strings (to filter them out of dropdowns)
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function ExcelDataGrid<T>({
  columns,
  data,
  categoryFilter = "all",
  onCategoryChange,
  type = "default",
  onRowClick,
  onRefresh,
  isLoading = false,
  onFilteredDataChange,
  initialFilterState,
  onFilterStateChange,
}: ExcelDataGridProps<T>) {
  const { showDiagnostics } = useDiagnostics();
  
  // Track if we've initialized from props (to avoid re-applying on every render)
  const hasInitialized = useRef(false);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting - initialize from props if provided
  const [sortColumn, setSortColumn] = useState<string | null>(
    initialFilterState?.sortColumn ?? null
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    initialFilterState?.sortDirection ?? null
  );

  // Filtering - initialize from props if provided
  const [filters, setFilters] = useState<Record<string, any>>(
    initialFilterState?.filters ?? {}
  );
  const [activeFilters, setActiveFilters] = useState<string[]>(
    initialFilterState?.activeFilters ?? []
  );
  const [showFilterPanel, setShowFilterPanel] = useState(
    // Auto-expand filter panel if returning with active filters
    (initialFilterState?.activeFilters?.length ?? 0) > 0
  );
  const [globalFilter, setGlobalFilter] = useState(
    initialFilterState?.globalFilter ?? ""
  );

  // Column customization
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const savedWidths = localStorage.getItem(`excel-grid-widths-${type}`);
    return savedWidths ? JSON.parse(savedWidths) : {};
  });
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const savedColumns = localStorage.getItem(`excel-grid-columns-${type}`);
    return savedColumns ? JSON.parse(savedColumns) : columns.map((col) => col.key);
  });
  
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem(`excel-grid-order-${type}`);
    return savedOrder ? JSON.parse(savedOrder) : columns.map((col) => col.key);
  });
  
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, globalFilter, categoryFilter]);

  // Initialize columns when columns change
  useEffect(() => {
    const columnKeys = columns.map((col) => col.key);
    setVisibleColumns(columnKeys);

    setColumnOrder((prev) => {
      const newColumns = columnKeys.filter((key) => !prev.includes(key));
      if (newColumns.length > 0) {
        const updatedOrder = [...prev.filter((key) => columnKeys.includes(key)), ...newColumns];
        localStorage.setItem(`excel-grid-order-${type}`, JSON.stringify(updatedOrder));
        return updatedOrder;
      }
      const filteredOrder = prev.filter((key) => columnKeys.includes(key));
      if (filteredOrder.length !== prev.length) {
        localStorage.setItem(`excel-grid-order-${type}`, JSON.stringify(filteredOrder));
        return filteredOrder;
      }
      return prev;
    });
  }, [columns, type]);

  // Notify parent of filter state changes (for persistence across navigation)
  useEffect(() => {
    // Skip the initial render to avoid overwriting restored state
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    
    onFilterStateChange?.({
      filters,
      activeFilters,
      globalFilter,
      sortColumn,
      sortDirection,
    });
  }, [filters, activeFilters, globalFilter, sortColumn, sortDirection, onFilterStateChange]);

  // ---------------------------------------------------------------------------
  // FILTERED & SORTED DATA
  // ---------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    let result = [...data];

    // Category filter
    if (categoryFilter && categoryFilter !== "all") {
      result = result.filter((item) => {
        const category = (item as any).ingredient?.category || "";
        return category === categoryFilter;
      });
    }

    // Global filter
    if (globalFilter) {
      const lowercasedFilter = globalFilter.toLowerCase();
      result = result.filter((item) => {
        return columns.some((column) => {
          const value = getNestedValue(item, column.key);
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowercasedFilter);
        });
      });
    }

    // Column filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (!filterValue) return;
      const column = columns.find((col) => col.key === key);
      if (!column) return;

      result = result.filter((item) => {
        const value = getNestedValue(item, key);
        if (value == null) return false;

        // Use filterType if specified, otherwise fall back to column type
        const effectiveType = column.filterType || column.type;

        switch (effectiveType) {
          case "text":
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case "select":
            // Exact match for dropdown selections
            return String(value) === String(filterValue);
          case "number":
          case "currency":
            const [min, max] = filterValue as [number | null, number | null];
            if (min !== null && value < min) return false;
            if (max !== null && value > max) return false;
            return true;
          case "date":
            const [startDate, endDate] = filterValue as [string, string];
            const dateValue = new Date(value);
            if (startDate && new Date(startDate) > dateValue) return false;
            if (endDate && new Date(endDate) < dateValue) return false;
            return true;
          default:
            // For custom columns without filterType, do text match
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        }
      });
    });

    // Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortColumn);
        const bValue = getNestedValue(b, sortColumn);

        if (aValue == null) return sortDirection === "asc" ? -1 : 1;
        if (bValue == null) return sortDirection === "asc" ? 1 : -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortDirection === "asc"
          ? aValue > bValue ? 1 : -1
          : aValue > bValue ? -1 : 1;
      });
    }

    return result;
  }, [data, columns, categoryFilter, globalFilter, filters, sortColumn, sortDirection]);

  // Notify parent of filtered data changes (for navigation context, etc.)
  useEffect(() => {
    onFilteredDataChange?.(filteredData);
  }, [filteredData, onFilteredDataChange]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  // ---------------------------------------------------------------------------
  // UNIQUE VALUES FOR SMART FILTERS
  // ---------------------------------------------------------------------------
  // Compute unique values for filterable columns (text OR custom with filterType)
  const columnUniqueValues = useMemo(() => {
    const uniqueMap: Record<string, string[]> = {};
    
    columns
      .filter((col) => 
        col.type === "text" || 
        col.filterType === "select" || 
        col.filterType === "text"
      )
      .forEach((col) => {
        const values = new Set<string>();
        data.forEach((item) => {
          const value = getNestedValue(item, col.key);
          if (value != null && String(value).trim() !== "") {
            values.add(String(value));
          }
        });
        // Sort alphabetically for better UX
        uniqueMap[col.key] = Array.from(values).sort((a, b) => 
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
      });
    
    return uniqueMap;
  }, [data, columns]);

  // ---------------------------------------------------------------------------
  // CASCADING CATEGORY FILTERS
  // ---------------------------------------------------------------------------
  // Major Group → Category → Sub Category (dependent dropdowns)
  const cascadingCategoryOptions = useMemo(() => {
    // Use _name fields (resolved text) over raw UUID fields
    const selectedMajorGroup = filters["major_group_name"] || filters["major_group"];
    const selectedCategory = filters["category_name"] || filters["category"];
    
    // Get all unique major groups (prefer _name field)
    const majorGroups = new Set<string>();
    data.forEach((item) => {
      const value = getNestedValue(item, "major_group_name") || getNestedValue(item, "major_group");
      if (value && String(value).trim() && !isUUID(String(value))) {
        majorGroups.add(String(value));
      }
    });
    
    // Get categories filtered by selected major group
    const categories = new Set<string>();
    data.forEach((item) => {
      const majorGroup = getNestedValue(item, "major_group_name") || getNestedValue(item, "major_group");
      const category = getNestedValue(item, "category_name") || getNestedValue(item, "category");
      
      if (category && String(category).trim() && !isUUID(String(category))) {
        // If no major group selected, show all categories
        // If major group selected, only show categories within that major group
        if (!selectedMajorGroup || majorGroup === selectedMajorGroup) {
          categories.add(String(category));
        }
      }
    });
    
    // Get sub-categories filtered by selected category
    const subCategories = new Set<string>();
    data.forEach((item) => {
      const majorGroup = getNestedValue(item, "major_group_name") || getNestedValue(item, "major_group");
      const category = getNestedValue(item, "category_name") || getNestedValue(item, "category");
      const subCategory = getNestedValue(item, "sub_category_name") || getNestedValue(item, "sub_category");
      
      if (subCategory && String(subCategory).trim() && !isUUID(String(subCategory))) {
        // Must match major group (if selected) AND category (if selected)
        const majorGroupMatch = !selectedMajorGroup || majorGroup === selectedMajorGroup;
        const categoryMatch = !selectedCategory || category === selectedCategory;
        
        if (majorGroupMatch && categoryMatch) {
          subCategories.add(String(subCategory));
        }
      }
    });
    
    return {
      majorGroups: Array.from(majorGroups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
      categories: Array.from(categories).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
      subCategories: Array.from(subCategories).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    };
  }, [data, filters]);

  // Detect which column keys are used for categories (some use _name suffix)
  const categoryColumnKeys = useMemo(() => {
    const keys = columns.map(c => c.key);
    return {
      majorGroup: keys.includes("major_group_name") ? "major_group_name" : "major_group",
      category: keys.includes("category_name") ? "category_name" : "category",
      subCategory: keys.includes("sub_category_name") ? "sub_category_name" : "sub_category",
    };
  }, [columns]);

  // Check if this grid has category hierarchy columns
  const hasCategoryHierarchy = useMemo(() => {
    const keys = columns.map(c => c.key);
    return (
      (keys.includes("major_group") || keys.includes("major_group_name")) &&
      (keys.includes("category") || keys.includes("category_name"))
    );
  }, [columns]);

  // Columns to show in "Other Filters" (excluding category hierarchy and non-filterable)
  const otherFilterColumns = useMemo(() => {
    const excludeKeys = [
      "major_group", "major_group_name",
      "category", "category_name", 
      "sub_category", "sub_category_name",
      "storage_area", "cost_per_recipe_unit", "recipe_unit_type", // Trimmed per Steve's request
      "actions", // Never filterable
    ];
    return columns.filter((col) => {
      // Skip excluded keys
      if (excludeKeys.includes(col.key)) return false;
      // Skip non-filterable types
      if (col.type === "imageUrl" || col.type === "allergen") return false;
      // Include if explicitly marked filterable
      if (col.filterable === true) return true;
      // Include text columns by default
      if (col.type === "text") return true;
      // Exclude everything else (unless filterable is explicitly true above)
      return false;
    });
  }, [columns]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const handleColumnResize = (columnKey: string, width: number) => {
    setColumnWidths((prev) => {
      const newWidths = { ...prev, [columnKey]: width };
      localStorage.setItem(`excel-grid-widths-${type}`, JSON.stringify(newWidths));
      return newWidths;
    });
  };

  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns((prev) => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey];
      localStorage.setItem(`excel-grid-columns-${type}`, JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleFilterChange = (columnKey: string, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [columnKey]: value };
      
      // Cascading clear: if Major Group changes, clear Category and Sub Category
      if (columnKey === categoryColumnKeys.majorGroup || columnKey === "major_group" || columnKey === "major_group_name") {
        newFilters[categoryColumnKeys.category] = null;
        newFilters[categoryColumnKeys.subCategory] = null;
        // Also clear alternate keys just in case
        newFilters["category"] = null;
        newFilters["category_name"] = null;
        newFilters["sub_category"] = null;
        newFilters["sub_category_name"] = null;
      }
      
      // Cascading clear: if Category changes, clear Sub Category
      if (columnKey === categoryColumnKeys.category || columnKey === "category" || columnKey === "category_name") {
        newFilters[categoryColumnKeys.subCategory] = null;
        newFilters["sub_category"] = null;
        newFilters["sub_category_name"] = null;
      }
      
      return newFilters;
    });
    
    // Update active filters list
    if (value && !activeFilters.includes(columnKey)) {
      setActiveFilters((prev) => [...prev, columnKey]);
    } else if (!value && activeFilters.includes(columnKey)) {
      setActiveFilters((prev) => prev.filter((key) => key !== columnKey));
    }
    
    // Also update active filters for cascaded clears
    if (columnKey === categoryColumnKeys.majorGroup || columnKey === "major_group" || columnKey === "major_group_name") {
      setActiveFilters((prev) => prev.filter((key) => 
        ![
          categoryColumnKeys.category, categoryColumnKeys.subCategory,
          "category", "category_name", "sub_category", "sub_category_name"
        ].includes(key)
      ));
    }
    if (columnKey === categoryColumnKeys.category || columnKey === "category" || columnKey === "category_name") {
      setActiveFilters((prev) => prev.filter((key) => 
        ![categoryColumnKeys.subCategory, "sub_category", "sub_category_name"].includes(key)
      ));
    }
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFilters([]);
    setGlobalFilter("");
  };

  const handleExport = () => {
    // Build CSV from visible columns and filtered data
    const exportColumns = visibleColumnOrder
      .map(key => columns.find(col => col.key === key))
      .filter((col): col is ExcelColumn => col !== undefined && col.type !== "imageUrl" && col.type !== "allergen");
    
    const headers = exportColumns.map(col => col.name);
    const rows = filteredData.map(item => 
      exportColumns.map(col => {
        const value = getNestedValue(item, col.key);
        if (value == null) return "";
        if (col.type === "currency") return Number(value).toFixed(2);
        if (col.type === "date") return new Date(value).toLocaleDateString();
        if (col.type === "percent") return `${Number(value).toFixed(1)}%`;
        return String(value);
      })
    );
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success(`Exported ${filteredData.length} rows`);
  };

  const handleResetAll = () => {
    setColumnWidths({});
    setColumnOrder(columns.map(col => col.key));
    setVisibleColumns(columns.map(col => col.key));
    localStorage.removeItem(`excel-grid-widths-${type}`);
    localStorage.removeItem(`excel-grid-order-${type}`);
    localStorage.removeItem(`excel-grid-columns-${type}`);
    toast.success("Column settings reset");
  };

  const handleColumnReorder = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const newOrder = [...columnOrder];
    const fromIndex = newOrder.indexOf(fromKey);
    const toIndex = newOrder.indexOf(toKey);
    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, fromKey);
      setColumnOrder(newOrder);
      localStorage.setItem(`excel-grid-order-${type}`, JSON.stringify(newOrder));
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderCellContent = (item: any, column: ExcelColumn) => {
    const value = getNestedValue(item, column.key);
    if (value == null) return "-";

    switch (column.type) {
      case "currency":
        return `${Number(value).toFixed(2)}`;
      case "date":
        return new Date(value).toLocaleDateString();
      case "percent":
        return `${Number(value).toFixed(1)}%`;
      case "imageUrl":
        return <ImageWithFallback src={value} alt="Thumbnail" size="md" shape="rounded" />;
      case "boolean":
        return value ? "Yes" : "No";
      default:
        return String(value);
    }
  };

  const renderCell = (column: ExcelColumn, row: T) => {
    // Custom render function takes priority
    if (column.type === "custom" && column.render) {
      const value = getNestedValue(row, column.key);
      return column.render(value, row);
    }

    if (column.type === "allergen") {
      return <AllergenCell ingredient={row} />;
    }

    if (column.type === "status") {
      return <StatusCell ingredient={row as any} />;
    }

    if (column.type === "percent" || column.key.includes("change") || column.key.includes("_percent")) {
      return <PriceChangeCell value={getNestedValue(row, column.key)} />;
    }

    if ((column.type === "number" || column.type === "currency") &&
        (column.key.includes("price") || column.key.includes("changes") || column.key === "new_items")) {
      const value = getNestedValue(row, column.key);
      if (value > 0) {
        return <span className="text-emerald-400">{renderCellContent(row, column)}</span>;
      } else if (value < 0) {
        return <span className="text-rose-400">{renderCellContent(row, column)}</span>;
      }
    }

    return renderCellContent(row, column);
  };

  const visibleColumnOrder = columnOrder.filter((key) => visibleColumns.includes(key));
  
  // Computed: are any columns hidden or reordered?
  const hiddenColumnCount = columns.length - visibleColumns.length;
  const hasColumnCustomization = hiddenColumnCount > 0 || Object.keys(columnWidths).length > 0;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          src/shared/components/ExcelDataGrid/index.tsx → type="{type}"
        </div>
      )}

      {/* ========================================================================
       * TOOLBAR - L5 Design
       * ======================================================================== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Global Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search all columns..."
            className="input w-full pl-9 py-2 text-sm"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowFilterPanel(!showFilterPanel);
              if (!showFilterPanel) setShowColumnSettings(false);
            }}
            className={`btn-ghost text-sm ${
              showFilterPanel ? "bg-gray-700" : ""
            } ${activeFilters.length > 0 ? "text-primary-400" : ""}`}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {activeFilters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                {activeFilters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowColumnSettings(!showColumnSettings);
              if (!showColumnSettings) setShowFilterPanel(false);
            }}
            className={`btn-ghost text-sm ${
              showColumnSettings ? "bg-gray-700" : ""
            } ${hasColumnCustomization ? "text-amber-400" : ""}`}
          >
            <Columns className="w-4 h-4 mr-1" />
            Columns
            {hiddenColumnCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                {hiddenColumnCount} hidden
              </span>
            )}
          </button>

          <button 
            onClick={handleExport}
            className="btn-ghost text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`btn-ghost text-sm ${isLoading ? "opacity-50" : ""}`}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================
       * FILTER PANEL - Inline (toggled by toolbar button)
       * ======================================================================== */}
      {showFilterPanel && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-300">Filter by column values</span>
            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear all filters
              </button>
            )}
          </div>
          
          {/* Category Hierarchy - Cascading Dropdowns */}
          {hasCategoryHierarchy && (
            <div className="mb-5 pb-4 border-b border-gray-700/50">
              <div className="text-sm font-semibold text-gray-300 mb-3">Category Hierarchy</div>
              <div className="flex items-center gap-2">
                {/* Major Group */}
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-500 mb-1 block">Major Group</label>
                  <ColumnFilter
                    column={{ key: categoryColumnKeys.majorGroup, name: "Major Group", type: "text", width: 150 }}
                    value={filters[categoryColumnKeys.majorGroup] || null}
                    onChange={(value) => handleFilterChange(categoryColumnKeys.majorGroup, value)}
                    onClear={() => handleFilterChange(categoryColumnKeys.majorGroup, null)}
                    uniqueValues={cascadingCategoryOptions.majorGroups}
                    forceDropdown
                  />
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-5" />
                
                {/* Category */}
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <ColumnFilter
                    column={{ key: categoryColumnKeys.category, name: "Category", type: "text", width: 150 }}
                    value={filters[categoryColumnKeys.category] || null}
                    onChange={(value) => handleFilterChange(categoryColumnKeys.category, value)}
                    onClear={() => handleFilterChange(categoryColumnKeys.category, null)}
                    uniqueValues={cascadingCategoryOptions.categories}
                    forceDropdown
                  />
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 mt-5" />
                
                {/* Sub Category */}
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-500 mb-1 block">Sub Category</label>
                  <ColumnFilter
                    column={{ key: categoryColumnKeys.subCategory, name: "Sub Category", type: "text", width: 150 }}
                    value={filters[categoryColumnKeys.subCategory] || null}
                    onChange={(value) => handleFilterChange(categoryColumnKeys.subCategory, value)}
                    onClear={() => handleFilterChange(categoryColumnKeys.subCategory, null)}
                    uniqueValues={cascadingCategoryOptions.subCategories}
                    forceDropdown
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Other Filters */}
          {otherFilterColumns.length > 0 && (
            <div>
              {hasCategoryHierarchy && (
                <div className="text-sm font-semibold text-gray-300 mb-3">Search Filters</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherFilterColumns.map((column) => (
                  <div key={column.key} className="space-y-1">
                    <label className="text-xs text-gray-500">{column.name}</label>
                    <ColumnFilter
                      column={column}
                      value={filters[column.key] || null}
                      onChange={(value) => handleFilterChange(column.key, value)}
                      onClear={() => handleFilterChange(column.key, null)}
                      uniqueValues={columnUniqueValues[column.key] || []}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
       * COLUMN SETTINGS PANEL - Inline (toggled by toolbar button)
       * ======================================================================== */}
      {showColumnSettings && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Toggle visibility • Drag headers to reorder • Drag edges to resize</span>
            {hasColumnCustomization && (
              <button
                onClick={handleResetAll}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <label
                key={column.key}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  visibleColumns.includes(column.key)
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800/50 text-gray-500 line-through"
                }`}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.key)}
                  onChange={() => toggleColumnVisibility(column.key)}
                  className="sr-only"
                />
                {column.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================
       * DATA TABLE
       * ======================================================================== */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              {visibleColumnOrder.map((columnKey) => {
                const column = columns.find((col) => col.key === columnKey);
                if (!column) return null;
                return (
                  <th
                    key={column.key}
                    className="p-0 text-sm font-medium"
                    style={{
                      width: `${columnWidths[column.key] || column.width}px`,
                      minWidth: `${columnWidths[column.key] || column.width}px`,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingColumn && draggingColumn !== column.key) {
                        e.currentTarget.classList.add("bg-gray-700");
                      }
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("bg-gray-700")}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("bg-gray-700");
                      if (draggingColumn) {
                        handleColumnReorder(draggingColumn, column.key);
                      }
                      setDraggingColumn(null);
                    }}
                  >
                    <ResizableHeader
                      column={{ ...column, width: columnWidths[column.key] || column.width }}
                      onResize={(width) => handleColumnResize(column.key, width)}
                      onSort={() => handleSort(column.key)}
                      sortDirection={sortColumn === column.key ? sortDirection : null}
                      isFiltered={activeFilters.includes(column.key)}
                      onToggleFilter={() => {
                        if (activeFilters.includes(column.key)) {
                          handleFilterChange(column.key, null);
                        } else {
                          setShowFilterPanel(true);
                        }
                      }}
                      onDragStart={() => setDraggingColumn(column.key)}
                      onDragEnd={() => setDraggingColumn(null)}
                    />
                  </th>
                );
              })}
              {/* Edit column header - with tooltip for training */}
              {onRowClick && (
                <th className="px-3 py-2 text-sm font-medium text-center w-12" title="Click any row to edit">
                  <Pencil className="w-3.5 h-3.5 text-gray-500 mx-auto" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-800/50 transition-colors group ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {visibleColumnOrder.map((columnKey) => {
                    const column = columns.find((col) => col.key === columnKey);
                    if (!column) return null;
                    return (
                      <td
                        key={`${rowIndex}-${column.key}`}
                        className={`px-4 py-3 text-sm text-gray-300 ${
                          column.align === "center" ? "text-center" :
                          column.align === "right" ? "text-right" : ""
                        }`}
                        style={{
                          width: `${columnWidths[column.key] || column.width}px`,
                          minWidth: `${columnWidths[column.key] || column.width}px`,
                        }}
                      >
                        {renderCell(column, row)}
                      </td>
                    );
                  })}
                  {/* Edit affordance - pencil only with tooltip */}
                  {onRowClick && (
                    <td className="px-3 py-3 text-center w-12">
                      <span 
                        className="inline-flex text-gray-600 group-hover:text-primary-400 transition-colors"
                        title="Click to edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumnOrder.length + (onRowClick ? 1 : 0)} className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                      <Database className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No data available</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {activeFilters.length > 0 || globalFilter
                        ? "Try adjusting your filters"
                        : "Import data to get started"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================
       * PAGINATION & SUMMARY
       * ======================================================================== */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredData.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Active filter summary */}
      {(activeFilters.length > 0 || globalFilter) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <span>Filtered:</span>
          <span className="text-gray-400">{filteredData.length} of {data.length} items</span>
          <button
            onClick={clearAllFilters}
            className="text-primary-400 hover:text-primary-300 ml-2"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
