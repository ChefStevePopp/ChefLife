import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Settings,
  FileSpreadsheet,
  FileText,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Upload,
  Search,
  Filter,
  SortAsc,
  Check,
  ChevronDown,
  Info,
  ChevronUp,
} from "lucide-react";
import { VendorCard, type VendorCardData } from "@/shared/components";
import { VendorSettingsModal } from "./VendorSettingsModal";
import { useVendorTemplatesStore } from "@/stores/vendorTemplatesStore";
import { useVendorConfigsStore, inferVendorDefaults, type VendorConfig } from "@/stores/vendorConfigsStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// =============================================================================
// VENDOR SETTINGS - L6 Design (Tablet-First)
// =============================================================================
// Configure vendor-specific invoice templates using VendorCard pattern
// (matches TeamList card design for visual consistency)
//
// L6 FEATURES:
// - Search by vendor name
// - Filter by configuration status
// - Sort by name, invoices, recency
// - Smart defaults based on vendor name
// - Tablet-friendly grid (2 cols portrait, 4 cols landscape)
// - Database persistence via vendor_configs table
// =============================================================================

// Standard fields we need to extract from any invoice format
const STANDARD_FIELDS = [
  { key: "item_code", label: "Item Code", description: "Vendor's product code", required: true },
  { key: "product_name", label: "Product Name", description: "Product description", required: true },
  { key: "unit_price", label: "Unit Price", description: "Price per unit", required: true },
  { key: "unit_of_measure", label: "Unit of Measure", description: "UOM (EA, CS, LB, etc.)", required: true },
  { key: "quantity", label: "Quantity", description: "Quantity ordered", required: false },
  { key: "extended_price", label: "Extended Price", description: "Line total", required: false },
  { key: "pack_size", label: "Pack Size", description: "Units per case", required: false },
  { key: "brand", label: "Brand", description: "Product brand/manufacturer", required: false },
];

type SortOption = 'name' | 'invoices' | 'recent';
type FilterOption = 'all' | 'configured' | 'unconfigured';

export const VendorSettings: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { settings, fetchSettings } = useOperationsStore();
  const { configs, fetchConfigs, saveConfig } = useVendorConfigsStore();
  const { saveTemplate } = useVendorTemplatesStore();
  
  // State
  const [vendorCards, setVendorCards] = useState<VendorCardData[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search, Filter, Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Expandable info
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Modal states
  const [settingsModalVendor, setSettingsModalVendor] = useState<VendorCardData | null>(null);
  const [editMode, setEditMode] = useState<"csv" | "pdf" | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  
  // CSV Editor state
  const [csvColumns, setCSVColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  
  // Ref for click-outside menu handling
  const gridRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId, isFilterOpen]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch vendor configs when org is available
  useEffect(() => {
    if (organizationId) {
      fetchConfigs(organizationId);
    }
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // LOAD VENDOR DATA
  // ---------------------------------------------------------------------------
  const loadVendorData = useCallback(async () => {
    if (!settings?.vendors) {
      setIsLoading(false);
      setVendorCards([]);
      return;
    }
    
    if (!organizationId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get all templates
      const { data: allTemplates } = await supabase
        .from("vendor_templates")
        .select("*")
        .eq("organization_id", organizationId);

      // Get import stats (upload dates)
      const { data: importStats } = await supabase
        .from("vendor_imports")
        .select("vendor_id, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      // Get invoice stats (invoice dates - the actual invoice date, not upload)
      const { data: invoiceStats } = await supabase
        .from("vendor_invoices")
        .select("vendor_id, invoice_date")
        .eq("organization_id", organizationId)
        .order("invoice_date", { ascending: false });

      // Build vendor cards, merging configs with templates
      const cards: VendorCardData[] = settings.vendors.map((vendorName) => {
        const vendorTemplates = allTemplates?.filter(t => t.vendor_id === vendorName) || [];
        const csvTemplate = vendorTemplates.find(t => t.file_type === "csv");
        const pdfTemplate = vendorTemplates.find(t => t.file_type === "pdf");
        const vendorImports = importStats?.filter(i => i.vendor_id === vendorName) || [];
        const vendorInvoices = invoiceStats?.filter(i => i.vendor_id === vendorName) || [];
        
        // Get saved config or use smart defaults
        const savedConfig = configs.find(c => c.vendor_id === vendorName);
        const defaults = inferVendorDefaults(vendorName);
        
        return {
          vendor_id: vendorName,
          vendor_name: vendorName,
          logo_url: savedConfig?.logo_url,
          has_csv_template: !!csvTemplate,
          has_pdf_template: !!pdfTemplate,
          // Use saved config or smart defaults
          csv_enabled: savedConfig?.csv_enabled ?? defaults.csv_enabled ?? true,
          pdf_enabled: savedConfig?.pdf_enabled ?? defaults.pdf_enabled ?? false,
          mobile_enabled: savedConfig?.mobile_enabled ?? defaults.mobile_enabled ?? false,
          manual_enabled: savedConfig?.manual_enabled ?? defaults.manual_enabled ?? true,
          default_invoice_type: (savedConfig?.default_invoice_type ?? defaults.default_invoice_type ?? "manual") as "csv" | "pdf" | "manual" | "mobile",
          // Stats - separate invoice date vs upload date
          total_invoices: vendorImports.length,
          last_invoice_date: vendorInvoices[0]?.invoice_date,
          last_upload_date: vendorImports[0]?.created_at,
          // Vendor details
          account_number: savedConfig?.account_number,
          rep_name: savedConfig?.rep_name,
          rep_email: savedConfig?.rep_email,
          rep_phone: savedConfig?.rep_phone,
        };
      });

      setVendorCards(cards);
    } catch (error) {
      console.error("Error loading vendor data:", error);
      toast.error("Failed to load vendor configurations");
    } finally {
      setIsLoading(false);
    }
  }, [settings?.vendors, organizationId, configs]);

  useEffect(() => {
    loadVendorData();
  }, [loadVendorData]);

  // ---------------------------------------------------------------------------
  // FILTERED & SORTED VENDORS
  // ---------------------------------------------------------------------------
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...vendorCards];
    
    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(v => v.vendor_name.toLowerCase().includes(lower));
    }
    
    // Filter
    if (filterStatus === 'configured') {
      result = result.filter(v => v.has_csv_template || v.has_pdf_template);
    } else if (filterStatus === 'unconfigured') {
      result = result.filter(v => !v.has_csv_template && !v.has_pdf_template);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.vendor_name.localeCompare(b.vendor_name);
        case 'invoices':
          return b.total_invoices - a.total_invoices;
        case 'recent':
          if (!a.last_upload_date && !b.last_upload_date) return 0;
          if (!a.last_upload_date) return 1;
          if (!b.last_upload_date) return -1;
          return new Date(b.last_upload_date).getTime() - new Date(a.last_upload_date).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [vendorCards, searchTerm, filterStatus, sortBy]);

  // ---------------------------------------------------------------------------
  // VENDOR SETTINGS HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenSettings = (vendor: VendorCardData) => {
    setSettingsModalVendor(vendor);
  };

  const handleSaveVendorSettings = async (updatedVendor: VendorCardData) => {
    if (!organizationId) return;
    
    // Save to database
    const configToSave: VendorConfig = {
      organization_id: organizationId,
      vendor_id: updatedVendor.vendor_id,
      logo_url: updatedVendor.logo_url,
      csv_enabled: updatedVendor.csv_enabled ?? true,
      pdf_enabled: updatedVendor.pdf_enabled ?? false,
      mobile_enabled: updatedVendor.mobile_enabled ?? false,
      manual_enabled: updatedVendor.manual_enabled ?? true,
      default_invoice_type: updatedVendor.default_invoice_type ?? "manual",
      account_number: updatedVendor.account_number,
      rep_name: updatedVendor.rep_name,
      rep_email: updatedVendor.rep_email,
      rep_phone: updatedVendor.rep_phone,
    };
    
    await saveConfig(configToSave);
    
    // Update local state immediately
    setVendorCards(prev => prev.map(v => 
      v.vendor_id === updatedVendor.vendor_id ? updatedVendor : v
    ));
  };

  // Note: Vendor CRUD happens in Operations → Vendors
  // VendorSettings only configures import methods for existing vendors

  // ---------------------------------------------------------------------------
  // CSV TEMPLATE HANDLERS
  // ---------------------------------------------------------------------------
  const handleConfigureCSV = (vendor: VendorCardData) => {
    setSettingsModalVendor(null);
    setSelectedVendor(vendor.vendor_id);
    setEditMode("csv");
    setPreviewData(null);
    setCSVColumns([]);
    setColumnMapping({});
  };

  const handleCSVUpload = (data: any[]) => {
    if (data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    setCSVColumns(columns);
    setPreviewData(data.slice(0, 3));
    
    // Auto-detect mappings
    const autoMapping: Record<string, string> = {};
    STANDARD_FIELDS.forEach(field => {
      const match = columns.find(col => {
        const lowerCol = col.toLowerCase();
        switch (field.key) {
          case "item_code":
            return lowerCol.includes("item") || lowerCol.includes("code") || lowerCol.includes("sku");
          case "product_name":
            return lowerCol.includes("product") || lowerCol.includes("name") || lowerCol.includes("description") || lowerCol.includes("desc");
          case "unit_price":
            return lowerCol.includes("price") || lowerCol.includes("cost") || lowerCol.includes("unit_price");
          case "unit_of_measure":
            return lowerCol.includes("uom") || lowerCol.includes("unit") || lowerCol.includes("measure");
          case "quantity":
            return lowerCol.includes("qty") || lowerCol.includes("quantity") || lowerCol === "shipped";
          case "extended_price":
            return lowerCol.includes("extended") || lowerCol.includes("total") || lowerCol.includes("amount");
          case "pack_size":
            return lowerCol.includes("pack") || lowerCol.includes("size");
          case "brand":
            return lowerCol.includes("brand") || lowerCol.includes("mfr") || lowerCol.includes("manufacturer");
          default:
            return false;
        }
      });
      if (match) autoMapping[field.key] = match;
    });
    
    setColumnMapping(autoMapping);
  };

  const handleSaveCSVTemplate = async () => {
    if (!selectedVendor || !organizationId) return;
    
    const missingRequired = STANDARD_FIELDS
      .filter(f => f.required && !columnMapping[f.key])
      .map(f => f.label);
    
    if (missingRequired.length > 0) {
      toast.error(`Missing required mappings: ${missingRequired.join(", ")}`);
      return;
    }
    
    try {
      await saveTemplate({
        vendor_id: selectedVendor,
        name: `${selectedVendor} CSV Template`,
        file_type: "csv",
        column_mapping: columnMapping,
        organization_id: organizationId,
      });
      
      toast.success("CSV template saved");
      setEditMode(null);
      setPreviewData(null);
      setCSVColumns([]);
      setSelectedVendor(null);
      loadVendorData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  // ---------------------------------------------------------------------------
  // PDF TEMPLATE HANDLERS
  // ---------------------------------------------------------------------------
  const handleConfigurePDF = (vendor: VendorCardData) => {
    setSettingsModalVendor(null);
    setSelectedVendor(vendor.vendor_id);
    setEditMode("pdf");
  };

  // ---------------------------------------------------------------------------
  // LOGO UPDATE HANDLER
  // ---------------------------------------------------------------------------
  const handleLogoUpdate = async (vendorId: string, logoUrl: string) => {
    if (!organizationId) return;
    
    // Update local state immediately
    setVendorCards(prev => prev.map(v => 
      v.vendor_id === vendorId ? { ...v, logo_url: logoUrl } : v
    ));
    
    // Persist to database
    const existingCard = vendorCards.find(v => v.vendor_id === vendorId);
    if (existingCard) {
      const configToSave: VendorConfig = {
        organization_id: organizationId,
        vendor_id: vendorId,
        logo_url: logoUrl,
        csv_enabled: existingCard.csv_enabled ?? true,
        pdf_enabled: existingCard.pdf_enabled ?? false,
        mobile_enabled: existingCard.mobile_enabled ?? false,
        manual_enabled: existingCard.manual_enabled ?? true,
        default_invoice_type: existingCard.default_invoice_type ?? "manual",
        account_number: existingCard.account_number,
        rep_name: existingCard.rep_name,
        rep_email: existingCard.rep_email,
        rep_phone: existingCard.rep_phone,
      };
      
      try {
        await saveConfig(configToSave);
      } catch (error) {
        console.error("Error saving logo:", error);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: CSV MAPPING EDITOR
  // ---------------------------------------------------------------------------
  const CSVMappingEditor = () => (
    <div className="bg-gray-800/50 rounded-xl p-5 sm:p-6 space-y-6 border border-gray-700/50">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          CSV Column Mapping — {selectedVendor}
        </h4>
        <button
          onClick={() => {
            setEditMode(null);
            setPreviewData(null);
            setCSVColumns([]);
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {!previewData && (
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center">
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">Upload a sample CSV from {selectedVendor}</p>
          <p className="text-sm text-gray-500 mb-4">We'll auto-detect columns and help you map them</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split("\n");
                const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
                const data = lines.slice(1, 4).map(line => {
                  const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
                  return headers.reduce((obj, header, i) => {
                    obj[header] = values[i] || "";
                    return obj;
                  }, {} as Record<string, string>);
                });
                handleCSVUpload(data);
              };
              reader.readAsText(file);
            }}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="btn-primary min-h-[48px] cursor-pointer inline-flex items-center gap-2 px-6"
          >
            <Upload className="w-5 h-5" />
            Select CSV File
          </label>
        </div>
      )}
      
      {previewData && (
        <>
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Sample Data Preview</h5>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-900">
                  <tr>
                    {csvColumns.map(col => (
                      <th key={col} className="px-3 py-2.5 text-left text-xs font-medium text-gray-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {csvColumns.map(col => (
                        <td key={col} className="px-3 py-2.5 text-xs text-gray-300 whitespace-nowrap">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-3">Column Mapping</h5>
            <div className="bg-gray-900/50 rounded-xl p-4 space-y-3">
              {STANDARD_FIELDS.map(field => (
                <div key={field.key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className={`text-sm ${field.required ? "text-white" : "text-gray-400"}`}>
                      {field.label}
                      {field.required && <span className="text-rose-400 ml-1">*</span>}
                    </span>
                    <p className="text-xs text-gray-500">{field.description}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={columnMapping[field.key] || ""}
                      onChange={(e) => setColumnMapping(prev => ({
                        ...prev,
                        [field.key]: e.target.value
                      }))}
                      className={`input w-full min-h-[48px] ${
                        field.required && !columnMapping[field.key] 
                          ? "border-rose-500/50" 
                          : ""
                      }`}
                    >
                      <option value="">— Select column —</option>
                      {csvColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setEditMode(null);
                setPreviewData(null);
                setCSVColumns([]);
              }}
              className="btn-ghost min-h-[48px] px-5"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCSVTemplate}
              className="btn-primary min-h-[48px] px-5"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // RENDER: PDF REGION EDITOR (Placeholder)
  // ---------------------------------------------------------------------------
  const PDFRegionEditor = () => (
    <div className="bg-gray-800/50 rounded-xl p-5 sm:p-6 space-y-6 border border-gray-700/50">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          PDF Region Mapping — {selectedVendor}
        </h4>
        <button
          onClick={() => setEditMode(null)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="bg-purple-500/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-400 font-medium mb-1">PDF Region Mapping</p>
            <p className="text-sm text-gray-300">
              Define specific areas on a vendor's invoice where data like item codes, prices, 
              and quantities appear. Useful for vendors like Flanagan's with consistent PDF layouts.
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center">
        <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 mb-2">Upload a sample PDF from {selectedVendor}</p>
        <p className="text-sm text-gray-500 mb-4">
          Draw regions on the PDF to define where data should be extracted
        </p>
        <button className="btn-ghost min-h-[48px]" disabled>
          Coming Soon
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // COUNTS
  // ---------------------------------------------------------------------------
  const configuredCount = vendorCards.filter(v => v.has_csv_template || v.has_pdf_template).length;
  const unconfiguredCount = vendorCards.length - configuredCount;

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-xl shadow-lg p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Vendor Invoice Settings</h3>
                <p className="text-sm text-gray-400">Configure how invoices are imported from each vendor</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Vendors</div>
                <div className="text-lg font-semibold text-white">{vendorCards.length}</div>
              </div>
              {configuredCount > 0 && (
                <div className="px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 uppercase tracking-wide">Ready</div>
                  <div className="text-lg font-semibold text-emerald-400">{configuredCount}</div>
                </div>
              )}
              {unconfiguredCount > 0 && (
                <div className="px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="text-xs text-amber-400 uppercase tracking-wide">Setup</div>
                  <div className="text-lg font-semibold text-amber-400">{unconfiguredCount}</div>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">About Vendor Settings</span>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3 text-sm text-gray-400">
                <p>
                  Configure how invoices are imported from each vendor. Click a vendor's{" "}
                  <span className="text-blue-400 font-medium">CSV</span> or{" "}
                  <span className="text-purple-400 font-medium">PDF</span> badge to set up templates, 
                  or tap the <span className="text-white font-medium">⋮ menu → Settings</span> for full configuration.
                </p>
                <p>
                  <span className="text-emerald-400">●</span> Green dot = template ready · 
                  Hover/tap logo to upload · Smart defaults auto-configure based on vendor name
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Mode: CSV or PDF Editor */}
      {editMode === "csv" && selectedVendor && <CSVMappingEditor />}
      {editMode === "pdf" && selectedVendor && <PDFRegionEditor />}
      
      {/* Search, Filter, Sort Bar */}
      {!editMode && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-11 min-h-[48px]"
            />
          </div>
          
          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`btn-ghost min-h-[48px] px-4 flex items-center gap-2 ${
                filterStatus !== 'all' ? 'text-primary-400 border-primary-500/30' : ''
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {filterStatus === 'all' ? 'All' : filterStatus === 'configured' ? 'Ready' : 'Needs Setup'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden">
                {[
                  { value: 'all', label: 'All Vendors', count: vendorCards.length },
                  { value: 'configured', label: 'Ready', count: configuredCount },
                  { value: 'unconfigured', label: 'Needs Setup', count: unconfiguredCount },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterStatus(option.value as FilterOption);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-700/50 transition-colors ${
                      filterStatus === option.value ? 'text-primary-400 bg-primary-500/10' : 'text-gray-300'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-gray-500">{option.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input min-h-[48px] min-w-[140px]"
          >
            <option value="name">Name A-Z</option>
            <option value="invoices">Most Invoices</option>
            <option value="recent">Recent First</option>
          </select>
          
          {/* Refresh */}
          <button
            onClick={() => loadVendorData()}
            className="btn-ghost min-h-[48px] min-w-[48px] flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Vendor Grid */}
      {!editMode && (
        <div className="space-y-4">
          {/* Results count */}
          {(searchTerm || filterStatus !== 'all') && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {filteredAndSortedVendors.length} of {vendorCards.length} vendors
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          
          {isLoading ? (
            // Loading skeleton - Tablet responsive grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 animate-pulse"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-20 h-20 rounded-xl bg-gray-700" />
                    <div className="space-y-2 w-full">
                      <div className="h-5 bg-gray-700 rounded w-3/4 mx-auto" />
                      <div className="h-8 bg-gray-700 rounded w-full mx-auto" />
                      <div className="h-4 bg-gray-700 rounded w-2/3 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedVendors.length === 0 ? (
            <div className="text-center p-12 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
              {vendorCards.length === 0 ? (
                <>
                  <p className="text-lg font-medium text-gray-400 mb-1">No vendors configured</p>
                  <p className="text-sm">Add vendors in Operations → Vendors list first</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-400 mb-1">No vendors match</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            // Tablet-responsive grid: 1 col mobile, 2 col tablet portrait, 3-4 col larger
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAndSortedVendors.map(vendor => (
                <VendorCard
                  key={vendor.vendor_id}
                  vendor={vendor}
                  onSettings={handleOpenSettings}
                  onConfigureCSV={handleConfigureCSV}
                  onConfigurePDF={handleConfigurePDF}
                  onLogoUpdate={handleLogoUpdate}
                  isMenuOpen={openMenuId === vendor.vendor_id}
                  onMenuToggle={setOpenMenuId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vendor Settings Modal */}
      <VendorSettingsModal
        isOpen={!!settingsModalVendor}
        vendor={settingsModalVendor}
        onClose={() => setSettingsModalVendor(null)}
        onSave={handleSaveVendorSettings}
        onConfigureCSV={handleConfigureCSV}
        onConfigurePDF={handleConfigurePDF}
      />
    </div>
  );
};
