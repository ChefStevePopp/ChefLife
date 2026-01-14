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
  Trash2,
  Edit3,
} from "lucide-react";
import { VendorCard, type VendorCardData } from "@/shared/components";
import { VendorSettingsModal } from "./VendorSettingsModal";
import { useVendorTemplatesStore, type VendorTemplate } from "@/stores/vendorTemplatesStore";
import { useVendorConfigsStore, inferVendorDefaults, type VendorConfig } from "@/stores/vendorConfigsStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const { settings, fetchSettings } = useOperationsStore();
  const { configs, fetchConfigs, saveConfig } = useVendorConfigsStore();
  const { templates, fetchTemplates, saveTemplate, deleteTemplate } = useVendorTemplatesStore();
  
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
  const [existingTemplate, setExistingTemplate] = useState<VendorTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // PDF Parser state
  const [pdfParseResult, setPdfParseResult] = useState<any>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfParserType, setPdfParserType] = useState<string>("auto");
  const [existingPdfTemplate, setExistingPdfTemplate] = useState<VendorTemplate | null>(null);
  
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
      fetchTemplates(organizationId);
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
    if (!organizationId || !user?.id) return;
    
    // Get previous state for diff tracking
    const previousVendor = vendorCards.find(v => v.vendor_id === updatedVendor.vendor_id);
    
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
    
    // Log to NEXUS
    await nexus({
      organization_id: organizationId,
      user_id: user.id,
      activity_type: 'vendor_config_updated',
      details: {
        vendor: updatedVendor.vendor_name,
        vendor_id: updatedVendor.vendor_id,
        csv_enabled: updatedVendor.csv_enabled,
        pdf_enabled: updatedVendor.pdf_enabled,
        manual_enabled: updatedVendor.manual_enabled,
        mobile_enabled: updatedVendor.mobile_enabled,
        default_invoice_type: updatedVendor.default_invoice_type,
      },
      metadata: {
        diffs: {
          table_name: 'vendor_configs',
          record_id: updatedVendor.vendor_id,
          old_values: previousVendor ? {
            csv_enabled: previousVendor.csv_enabled,
            pdf_enabled: previousVendor.pdf_enabled,
            manual_enabled: previousVendor.manual_enabled,
            mobile_enabled: previousVendor.mobile_enabled,
            default_invoice_type: previousVendor.default_invoice_type,
          } : {},
          new_values: {
            csv_enabled: updatedVendor.csv_enabled,
            pdf_enabled: updatedVendor.pdf_enabled,
            manual_enabled: updatedVendor.manual_enabled,
            mobile_enabled: updatedVendor.mobile_enabled,
            default_invoice_type: updatedVendor.default_invoice_type,
          },
        },
      },
    });
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
    
    // Check for existing template
    const existing = templates.find(
      t => t.vendor_id === vendor.vendor_id && t.file_type === "csv"
    );
    
    if (existing && existing.column_mapping) {
      // Load existing mapping
      setExistingTemplate(existing);
      setColumnMapping(existing.column_mapping);
      // Extract column names from the mapping values
      const cols = Object.values(existing.column_mapping).filter(Boolean);
      setCSVColumns([...new Set(cols)] as string[]);
      setPreviewData(null); // No preview for existing, but show mapping
    } else {
      // Fresh start
      setExistingTemplate(null);
      setPreviewData(null);
      setCSVColumns([]);
      setColumnMapping({});
    }
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
    if (!selectedVendor || !organizationId || !user?.id) return;
    
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
      
      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: existingTemplate ? 'vendor_template_updated' : 'vendor_template_created',
        details: {
          vendor: selectedVendor,
          template_type: 'csv',
          mapped_fields: Object.keys(columnMapping).length,
          columns: csvColumns.length,
        },
      });
      
      toast.success(existingTemplate ? "CSV template updated" : "CSV template saved");
      setEditMode(null);
      setPreviewData(null);
      setCSVColumns([]);
      setSelectedVendor(null);
      setExistingTemplate(null);
      loadVendorData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleDeleteCSVTemplate = async () => {
    if (!existingTemplate || !organizationId || !user?.id) return;
    
    setIsDeleting(true);
    try {
      await deleteTemplate(existingTemplate.id);
      
      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'vendor_template_deleted',
        details: {
          vendor: selectedVendor,
          template_type: 'csv',
          template_id: existingTemplate.id,
        },
      });
      
      toast.success("CSV template deleted");
      setEditMode(null);
      setPreviewData(null);
      setCSVColumns([]);
      setSelectedVendor(null);
      setExistingTemplate(null);
      setColumnMapping({});
      loadVendorData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PDF TEMPLATE HANDLERS
  // ---------------------------------------------------------------------------
  const handleConfigurePDF = (vendor: VendorCardData) => {
    setSettingsModalVendor(null);
    setSelectedVendor(vendor.vendor_id);
    setEditMode("pdf");
    
    // Check for existing template
    const existing = templates.find(
      t => t.vendor_id === vendor.vendor_id && t.file_type === "pdf"
    );
    
    if (existing) {
      setExistingPdfTemplate(existing);
      // Pre-select the parser type if saved
      if (existing.column_mapping?.parser_type) {
        setPdfParserType(existing.column_mapping.parser_type);
      }
    } else {
      setExistingPdfTemplate(null);
      setPdfParserType("auto");
    }
    setPdfParseResult(null);
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
        console.error("[VendorSettings] Error saving logo to database:", error);
        toast.error("Logo uploaded but failed to save to database");
      }
    } else {
      console.warn('[VendorSettings] No existing card found for vendor:', vendorId);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: CSV MAPPING EDITOR
  // ---------------------------------------------------------------------------
  const CSVMappingEditor = () => {
    const hasMapping = Object.keys(columnMapping).length > 0;
    const showMappingUI = previewData || (existingTemplate && hasMapping);
    
    return (
      <div className="card p-0 overflow-hidden">
        {/* Header - L5 subheader style */}
        <div className="flex items-center justify-between p-5 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-200">
                {existingTemplate ? 'Edit CSV Template' : 'New CSV Template'}
              </h4>
              <p className="text-xs text-gray-500">{selectedVendor}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existingTemplate && (
              <button
                onClick={handleDeleteCSVTemplate}
                disabled={isDeleting}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10"
                title="Delete template"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => {
                setEditMode(null);
                setPreviewData(null);
                setCSVColumns([]);
                setExistingTemplate(null);
                setColumnMapping({});
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Status banner for existing template */}
          {existingTemplate && !previewData && (
            <div className="bg-primary-500/10 rounded-xl p-4 border border-primary-500/20">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-primary-400 font-medium mb-1">Template Configured</p>
                  <p className="text-sm text-gray-400">
                    This vendor has a CSV template with {Object.keys(columnMapping).filter(k => columnMapping[k]).length} mapped fields.
                    Upload a new CSV to update the column mapping.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Upload area - always show for re-upload */}
          <div className={`border-2 border-dashed rounded-xl p-6 text-center ${
            showMappingUI ? 'border-gray-700/50' : 'border-gray-700'
          }`}>
            <Upload className={`w-8 h-8 mx-auto mb-2 ${showMappingUI ? 'text-gray-600' : 'text-gray-500'}`} />
            <p className={`mb-1 ${showMappingUI ? 'text-gray-500 text-sm' : 'text-gray-400'}`}>
              {showMappingUI ? 'Upload new CSV to update mapping' : `Upload a sample CSV from ${selectedVendor}`}
            </p>
            {!showMappingUI && (
              <p className="text-sm text-gray-500 mb-3">We'll auto-detect columns and help you map them</p>
            )}
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
              className={`cursor-pointer inline-flex items-center gap-2 px-4 ${
                showMappingUI 
                  ? 'btn-ghost min-h-[40px] text-sm' 
                  : 'btn-primary min-h-[48px] px-6'
              }`}
            >
              <Upload className="w-4 h-4" />
              {showMappingUI ? 'Upload New CSV' : 'Select CSV File'}
            </label>
          </div>
          
          {/* Preview table - only when fresh upload */}
          {previewData && (
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
          )}
          
          {/* Column Mapping - show when we have columns or existing mapping */}
          {showMappingUI && (
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
                      {csvColumns.length > 0 ? (
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
                      ) : (
                        <div className={`input w-full min-h-[48px] flex items-center ${
                          columnMapping[field.key] ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {columnMapping[field.key] || '— Not mapped —'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          {showMappingUI && (
            <div className="flex justify-between items-center pt-2">
              <div>
                {existingTemplate && (
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(existingTemplate.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditMode(null);
                    setPreviewData(null);
                    setCSVColumns([]);
                    setExistingTemplate(null);
                    setColumnMapping({});
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
                  {existingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER: PDF PARSER EDITOR
  // ---------------------------------------------------------------------------
  const PDFParserEditor = () => {
    // Supported parsers
    const PARSERS = [
      { id: "auto", name: "Auto-Detect", description: "Automatically detect vendor format" },
      { id: "flanagan", name: "Flanagan (Official Invoice)", description: "Standard delivery invoice with table format", status: "ready" },
      { id: "flanagan-portal", name: "Flanagan (Portal Export)", description: "Customer portal PDF export", status: "ready" },
      { id: "gfs", name: "Gordon Food Service", description: "GFS invoice format", status: "coming_soon" },
      { id: "sysco", name: "Sysco", description: "Sysco invoice format", status: "coming_soon" },
      { id: "generic", name: "Generic", description: "Basic text extraction", status: "ready" },
    ];

    const handlePDFUpload = async (file: File) => {
      setPdfParsing(true);
      setPdfParseResult(null);
      
      try {
        // Dynamic import to avoid loading pdf.js until needed
        const { parsePDFInvoice } = await import("@/lib/pdf-parser-service");
        const result = await parsePDFInvoice(
          file, 
          pdfParserType !== "auto" ? { vendorId: selectedVendor!, parserType: pdfParserType as any } : undefined
        );
        setPdfParseResult(result);
      } catch (error) {
        console.error("PDF parsing error:", error);
        toast.error("Failed to parse PDF");
      } finally {
        setPdfParsing(false);
      }
    };

    const handleSavePDFTemplate = async () => {
      if (!selectedVendor || !organizationId || !user?.id || !pdfParseResult) return;
      
      try {
        await saveTemplate({
          vendor_id: selectedVendor,
          name: `${selectedVendor} PDF Template`,
          file_type: "pdf",
          organization_id: organizationId,
          // Store the parser type in column_mapping for now (ocr_regions could be used later)
          column_mapping: { 
            parser_type: pdfParseResult.vendor.toLowerCase(),
            confidence: String(pdfParseResult.parseConfidence),
          },
        });
        
        // Log to NEXUS
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: existingPdfTemplate ? 'vendor_template_updated' : 'vendor_template_created',
          details: {
            vendor: selectedVendor,
            template_type: 'pdf',
            parser_type: pdfParseResult.vendor,
            confidence: pdfParseResult.parseConfidence,
            items_parsed: pdfParseResult.items.length,
          },
        });
        
        toast.success(existingPdfTemplate ? "PDF template updated" : "PDF template saved");
        setEditMode(null);
        setPdfParseResult(null);
        setSelectedVendor(null);
        setExistingPdfTemplate(null);
        loadVendorData();
      } catch (error) {
        console.error("Error saving PDF template:", error);
        toast.error("Failed to save template");
      }
    };

    const handleDeletePDFTemplate = async () => {
      if (!existingPdfTemplate || !organizationId || !user?.id) return;
      
      setIsDeleting(true);
      try {
        await deleteTemplate(existingPdfTemplate.id);
        
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'vendor_template_deleted',
          details: {
            vendor: selectedVendor,
            template_type: 'pdf',
            template_id: existingPdfTemplate.id,
          },
        });
        
        toast.success("PDF template deleted");
        setEditMode(null);
        setPdfParseResult(null);
        setSelectedVendor(null);
        setExistingPdfTemplate(null);
        loadVendorData();
      } catch (error) {
        console.error("Error deleting template:", error);
        toast.error("Failed to delete template");
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <div className="card p-0 overflow-hidden">
        {/* Header - L5 subheader style */}
        <div className="flex items-center justify-between p-5 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-200">
                {existingPdfTemplate ? 'Edit PDF Template' : 'New PDF Template'}
              </h4>
              <p className="text-xs text-gray-500">{selectedVendor}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existingPdfTemplate && (
              <button
                onClick={handleDeletePDFTemplate}
                disabled={isDeleting}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10"
                title="Delete template"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => {
                setEditMode(null);
                setPdfParseResult(null);
                setExistingPdfTemplate(null);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Existing template status */}
          {existingPdfTemplate && !pdfParseResult && (
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-400 font-medium mb-1">Template Configured</p>
                  <p className="text-sm text-gray-400">
                    Parser: {existingPdfTemplate.column_mapping?.parser_type || 'auto'} · 
                    Confidence: {existingPdfTemplate.column_mapping?.confidence || '—'}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parser Selection */}
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-2">Parser Type</h5>
            <select
              value={pdfParserType}
              onChange={(e) => setPdfParserType(e.target.value)}
              className="input w-full min-h-[48px]"
            >
              {PARSERS.map(parser => (
                <option 
                  key={parser.id} 
                  value={parser.id}
                  disabled={parser.status === "coming_soon"}
                >
                  {parser.name} {parser.status === "coming_soon" ? "(Coming Soon)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {PARSERS.find(p => p.id === pdfParserType)?.description}
            </p>
          </div>
          
          {/* Upload area */}
          <div className={`border-2 border-dashed rounded-xl p-6 text-center ${
            pdfParseResult ? 'border-gray-700/50' : 'border-gray-700'
          }`}>
            {pdfParsing ? (
              <div className="py-4">
                <div className="w-10 h-10 border-3 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Parsing PDF...</p>
              </div>
            ) : (
              <>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${pdfParseResult ? 'text-gray-600' : 'text-gray-500'}`} />
                <p className={`mb-1 ${pdfParseResult ? 'text-gray-500 text-sm' : 'text-gray-400'}`}>
                  {pdfParseResult ? 'Upload different PDF to test' : `Upload a sample PDF from ${selectedVendor}`}
                </p>
                {!pdfParseResult && (
                  <p className="text-sm text-gray-500 mb-3">We'll extract text and show you the parsed results</p>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePDFUpload(file);
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 ${
                    pdfParseResult 
                      ? 'btn-ghost min-h-[40px] text-sm' 
                      : 'btn-primary min-h-[48px] px-6'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {pdfParseResult ? 'Upload New PDF' : 'Select PDF File'}
                </label>
              </>
            )}
          </div>
          
          {/* Parse Results */}
          {pdfParseResult && (
            <div className="space-y-4">
              {/* Confidence & Warnings */}
              <div className={`rounded-xl p-4 border ${
                pdfParseResult.parseConfidence >= 80 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : pdfParseResult.parseConfidence >= 50
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    pdfParseResult.parseConfidence >= 80 ? 'text-green-400' :
                    pdfParseResult.parseConfidence >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    Parse Confidence: {pdfParseResult.parseConfidence}%
                  </span>
                  <span className="text-sm text-gray-400">
                    Detected: {pdfParseResult.vendor}
                  </span>
                </div>
                {pdfParseResult.parseWarnings?.length > 0 && (
                  <div className="text-xs text-gray-400 space-y-1">
                    {pdfParseResult.parseWarnings.map((w: string, i: number) => (
                      <p key={i}>⚠️ {w}</p>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Invoice Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Invoice Date</p>
                  <p className="text-sm text-white font-medium">{pdfParseResult.invoiceDate || '—'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Items</p>
                  <p className="text-sm text-white font-medium">{pdfParseResult.items.length}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Subtotal</p>
                  <p className="text-sm text-white font-medium">${pdfParseResult.subtotal.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Fulfillment</p>
                  <p className="text-sm text-white font-medium">{pdfParseResult.fulfillmentType || '—'}</p>
                </div>
              </div>
              
              {/* Parsed Items Table */}
              {pdfParseResult.items.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">
                    Parsed Items ({pdfParseResult.items.length})
                  </h5>
                  <div className="overflow-x-auto rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400">Code</th>
                          <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400">Product</th>
                          <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400">Qty</th>
                          <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400">Price</th>
                          <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {pdfParseResult.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-800/50">
                            <td className="px-3 py-2 text-xs text-gray-300 font-mono">{item.itemCode}</td>
                            <td className="px-3 py-2 text-xs text-gray-300">
                              {item.productName}
                              {item.brand && <span className="text-gray-500 ml-1">({item.brand})</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-xs text-gray-300 text-right">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-300 text-right">${item.extendedPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          {pdfParseResult && (
            <div className="flex justify-between items-center pt-2">
              <div>
                {existingPdfTemplate && (
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(existingPdfTemplate.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditMode(null);
                    setPdfParseResult(null);
                    setExistingPdfTemplate(null);
                  }}
                  className="btn-ghost min-h-[48px] px-5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePDFTemplate}
                  disabled={pdfParseResult.parseConfidence < 50}
                  className="btn-primary min-h-[48px] px-5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {existingPdfTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
      {/* L5 Sub-header - Grey icon box (informational context, not module identity) */}
      <div className="subheader">
        <div className="subheader-row">
          {/* Left: Icon + Title - Rose to match Settings tab */}
          <div className="subheader-left">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Settings className="w-7 h-7 text-rose-400/80" />
            </div>
            <div>
              <h3 className="subheader-title">Vendor Invoice Settings</h3>
              <p className="subheader-subtitle">Configure how invoices are imported from each vendor</p>
            </div>
          </div>
          
          {/* Right: Stats in icon box style (matches toggle pattern) */}
          <div className="subheader-right">
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <span className="text-sm font-semibold text-gray-400">{vendorCards.length}</span>
              </div>
              <span className="subheader-toggle-label">Vendors</span>
            </div>
            {configuredCount > 0 && (
              <div className="subheader-toggle">
                <div className="subheader-toggle-icon">
                  <span className="text-sm font-semibold text-gray-400">{configuredCount}</span>
                </div>
                <span className="subheader-toggle-label">Ready</span>
              </div>
            )}
            {unconfiguredCount > 0 && (
              <div className="subheader-toggle">
                <div className="subheader-toggle-icon">
                  <span className="text-sm font-semibold text-gray-400">{unconfiguredCount}</span>
                </div>
                <span className="subheader-toggle-label">Setup</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`subheader-info expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About Vendor Settings</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Configure how invoices are imported from each vendor. Set up import templates, enable methods, and manage vendor contact details.
              </p>
              
              {/* Card-style items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/30">
                  <FileSpreadsheet className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-primary-400">CSV Templates</span>
                    <p className="text-xs text-gray-500">Map vendor columns to ingredients</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/30">
                  <FileText className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-green-400">PDF Parsing</span>
                    <p className="text-xs text-gray-500">Extract data from invoice PDFs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/30">
                  <Upload className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-amber-400">Logo Upload</span>
                    <p className="text-xs text-gray-500">Hover vendor card to upload</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/30">
                  <Settings className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-rose-400">Vendor Details</span>
                    <p className="text-xs text-gray-500">Rep contact and account info</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Tap the three-dot menu on any vendor card for full settings
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Mode: CSV or PDF Editor */}
      {editMode === "csv" && selectedVendor && <CSVMappingEditor />}
      {editMode === "pdf" && selectedVendor && <PDFParserEditor />}
      
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
