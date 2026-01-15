import React, { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  History,
  Settings,
  LineChart,
  Plus,
  TrendingUp,
  Umbrella,
  Boxes,
  CircleDollarSign,
  Info,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { CSVUploader } from "./components/CSVUploader";
import { ImportSettings } from "./components/ImportSettings";
import { VendorSettings } from "./components/VendorSettings";
import { PriceHistory } from "./components/PriceHistory";
import { VendorSelector } from "./components/VendorSelector";
import { ImportHeader } from "./components/ImportHeader";
import { PDFUploader } from "./components/PDFUploader";
import { PhotoUploader } from "./components/PhotoUploader";
import { ImportWorkspace } from "./components/ImportWorkspace";
import { DataPreview } from "./components/DataPreview";
import { ItemCodeGroupManager } from "./components/ItemCodeGroupManager";
import { UmbrellaIngredientManager } from "./components/UmbrellaIngredientManager";
import { VendorAnalytics } from "./components/VendorAnalytics";
import { ImportHistory, ImportRecord } from "./components/ImportHistory";
import { TriagePanel } from "./components/TriagePanel";
import { useVendorTemplatesStore } from "@/stores/vendorTemplatesStore";
import { ManualInvoiceForm } from "./components/ManualInvoiceForm";
import { useSearchParams } from "react-router-dom";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useVariantTesting } from "@/hooks/useVariantTesting";
import { VariantToggle } from "@/components/ui/VariantToggle";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { supabase } from "@/lib/supabase";
import { ocrService } from "@/lib/ocr-service";
import toast from "react-hot-toast";

// =============================================================================
// VENDOR INVOICE MANAGER - L5 Design
// =============================================================================
// Reference: L5-BUILD-STRATEGY.md - Simple Header (Variant A)
// Location: Admin → Data Management → Vendor Invoices
// =============================================================================

type TabId = "dashboard" | "analytics" | "codes" | "umbrella" | "import" | "triage" | "history" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "Price History", icon: LineChart, color: "primary" },
  { id: "analytics", label: "Analytics", icon: TrendingUp, color: "green" },
  { id: "codes", label: "Code Groups", icon: Boxes, color: "amber" },
  { id: "umbrella", label: "Umbrella Items", icon: Umbrella, color: "rose" },
  { id: "import", label: "Import", icon: FileSpreadsheet, color: "purple" },
  { id: "triage", label: "Triage", icon: ClipboardList, color: "cyan" },
  { id: "history", label: "History", icon: History, color: "lime" },
  { id: "settings", label: "Settings", icon: Settings, color: "red" },
];

export const VendorInvoiceManager = () => {
  const { showDiagnostics } = useDiagnostics();
  const { organizationId } = useOrganizationId();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  // Read initial tab from URL query param, default to "dashboard"
  const initialTab = (searchParams.get("tab") as TabId) || "dashboard";
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === initialTab) ? initialTab : "dashboard"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCSVData] = useState<any[] | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [manualVendorId, setManualVendorId] = useState("");
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [importType, setImportType] = useState<"csv" | "pdf" | "manual">("csv");
  const [sourceFile, setSourceFile] = useState<File | null>(null); // For audit trail
  const [supersedeInfo, setSupersedeInfo] = useState<{ isSupersede: boolean; existingDate: string } | null>(null);
  
  // Recall state - when editing a previous import
  const [recallRecord, setRecallRecord] = useState<ImportRecord | null>(null);
  
  // Import draft state - tracks if ImportWorkspace has unsaved work
  const [hasImportDraft, setHasImportDraft] = useState(false);
  
  // Triage badge state
  const [triageCount, setTriageCount] = useState(0);
  const [triageAnimating, setTriageAnimating] = useState(false);

  // A/B Testing: Compare header variants (dev/omega users only)
  const {
    activeVariant: headerVariant,
    setVariant: setHeaderVariant,
    showToggle: showHeaderToggle,
    variants: headerVariants,
  } = useVariantTesting("VendorSelector", ["original", "compact"] as const, "original");

  // ---------------------------------------------------------------------------
  // STORES
  // ---------------------------------------------------------------------------
  const { templates, fetchTemplates } = useVendorTemplatesStore();

  // ---------------------------------------------------------------------------
  // TRIAGE COUNT - Badge for tab
  // ---------------------------------------------------------------------------
  const fetchTriageCount = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      // Count pending_import_items (skipped items)
      const { count: skippedCount } = await supabase
        .from('pending_import_items')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      // Count ALL incomplete master_ingredients - purchased AND prep
      // Fetch everything, filter client-side to match TriagePanel exactly
      const { data: allIngredients } = await supabase
        .from('master_ingredients')
        .select('id, major_group, category, sub_category, recipe_unit_type, recipe_unit_per_purchase_unit, yield_percent, storage_area, archived, ingredient_type, source_recipe_id')
        .eq('organization_id', organizationId);

      // Fields that count toward completion (same as TriagePanel)
      const COMPLETION_FIELDS = [
        'major_group', 'category', 'sub_category', 'recipe_unit_type',
        'recipe_unit_per_purchase_unit', 'yield_percent', 'storage_area'
      ];
      
      // Count ALL non-archived ingredients with < 100% completion
      // This includes both purchased AND prep items
      const incompleteCount = (allIngredients || []).filter((ing: any) => {
        // Skip archived items
        if (ing.archived === true) return false;
        
        // Count filled fields
        const filledFields = COMPLETION_FIELDS.filter(field => {
          const value = ing[field];
          return value !== null && value !== undefined && value !== '' && value !== 0;
        });
        const percent = Math.round((filledFields.length / COMPLETION_FIELDS.length) * 100);
        return percent < 100;
      }).length;

      const newCount = (skippedCount || 0) + incompleteCount;
      
      // Trigger animation if count increased
      if (newCount > triageCount && triageCount > 0) {
        setTriageAnimating(true);
        setTimeout(() => setTriageAnimating(false), 1500);
      }
      
      setTriageCount(newCount);
    } catch (error) {
      console.error('Error fetching triage count:', error);
    }
  }, [organizationId, triageCount]);

  // Fetch on mount and when tab changes
  useEffect(() => {
    fetchTriageCount();
  }, [organizationId]);

  // Refresh count when tab changes (to update badge after processing items)
  useEffect(() => {
    fetchTriageCount();
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // SYNC TAB WITH URL
  // ---------------------------------------------------------------------------
  // When URL changes (browser back/forward), sync tab state
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabId;
    if (urlTab && TABS.some(t => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // When tab changes via click, update URL (optional, for bookmarkability)
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    // Update URL without full navigation
    if (tabId === "dashboard") {
      setSearchParams({});  // Remove param for default tab
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (selectedVendor && organizationId) {
      fetchTemplates(organizationId, selectedVendor);
    }
  }, [selectedVendor, organizationId, fetchTemplates]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleUpload = async (data: any[] | File, fileDate?: Date, uploadedFile?: File, supersedeData?: { isSupersede: boolean; existingDate: string }) => {
    if (!selectedVendor) {
      toast.error("Please select a vendor first");
      return;
    }

    // For CSV uploads, check if vendor has a template
    if (!(data instanceof File) && importType === "csv") {
      const vendorTemplate = templates.find((t) => t.vendor_id === selectedVendor);
      if (!vendorTemplate) {
        toast.error(
          <div className="flex flex-col gap-2">
            <span>No CSV template found for this vendor</span>
            <button
              onClick={() => handleTabChange("settings")}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition-colors"
            >
              Set up template
            </button>
          </div>,
          { duration: 5000 }
        );
        return;
      }
    }

    if (data instanceof File) {
      setIsLoading(true);
      try {
        if (importType === "pdf") {
          await processPDFUpload(data);
        }
        // Note: "mobile" type uses MobileInvoice component directly, not file upload
      } catch (error: any) {
        console.error(`Error processing ${importType.toUpperCase()}:`, error);
        toast.error(`Failed to process ${importType.toUpperCase()} file: ${error.message}`);
        setCSVData([{
          item_code: "ERROR",
          product_name: `${importType.toUpperCase()} processing failed - please try manual entry`,
          unit_price: 0,
          unit_of_measure: "EA",
        }]);
        setInvoiceDate(new Date());
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // CSV processing
    try {
      const vendorTemplate = templates.find((t) => t.vendor_id === selectedVendor);
      if (!vendorTemplate?.column_mapping) {
        toast.error("Template mapping not found");
        return;
      }

      if (fileDate) setInvoiceDate(fileDate);

      const transformedData = data.map((row) => ({
        item_code: row[vendorTemplate.column_mapping.item_code],
        product_name: row[vendorTemplate.column_mapping.product_name],
        unit_price: parseFloat(row[vendorTemplate.column_mapping.unit_price]) || 0,
        unit_of_measure: row[vendorTemplate.column_mapping.unit_of_measure],
      }));

      // Store source file for audit trail
      if (uploadedFile) {
        setSourceFile(uploadedFile);
      }

      // Store supersede info for audit trail
      if (supersedeData) {
        setSupersedeInfo(supersedeData);
      } else {
        setSupersedeInfo(null);
      }

      setCSVData(transformedData);
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast.error("Failed to process CSV data");
    }
  };

  const processPDFUpload = async (file: File) => {
    const vendorTemplate = templates.find((t) => t.vendor_id === selectedVendor);
    if (!vendorTemplate) {
      toast.error("No template found for this vendor");
      return;
    }

    try {
      const ocrResults = await ocrService.processPDF(file);
      const extractedData = ocrService.extractInvoiceData(ocrResults);
      processOCRResults(extractedData, "PDF");
    } catch (error) {
      console.error("PDF processing error:", error);
      toast.error("Failed to process PDF. Adding placeholder data.");
      setCSVData([{
        item_code: "PDF-ERROR",
        product_name: "PDF processing failed - please try manual entry",
        unit_price: 0,
        unit_of_measure: "EA",
      }]);
      setInvoiceDate(new Date());
    }
  };

  const processPhotoUpload = async (file: File) => {
    try {
      const ocrResults = await ocrService.processImage(file);
      const extractedData = ocrService.extractInvoiceData(ocrResults);
      processOCRResults(extractedData, "image");
    } catch (error) {
      console.error("Photo processing error:", error);
      toast.error("Failed to process image. Adding placeholder data.");
      setCSVData([{
        item_code: "PHOTO-ERROR",
        product_name: "Image processing failed - please try manual entry",
        unit_price: 0,
        unit_of_measure: "EA",
      }]);
      setInvoiceDate(new Date());
    }
  };

  const processOCRResults = (extractedData: any, sourceType: string) => {
    let mappedData: any[] = [];

    if (extractedData?.items && Array.isArray(extractedData.items)) {
      mappedData = extractedData.items.map((item: any, index: number) => ({
        item_code: item.itemCode || `ITEM-${index + 1}`,
        product_name: item.description || `Product ${index + 1}`,
        unit_price: item.unitPrice || 0,
        unit_of_measure: "EA",
      }));
    }

    if (mappedData.length === 0) {
      toast.warning(`No items could be extracted from the ${sourceType}. Adding a placeholder item.`);
      mappedData.push({
        item_code: "OCR-FAILED",
        product_name: "OCR extraction failed - please try manual entry",
        unit_price: 0,
        unit_of_measure: "EA",
      });
    } else {
      toast.success(`Successfully extracted ${mappedData.length} items from ${sourceType}`);
    }

    // Set invoice date
    if (extractedData?.date) {
      const parsedDate = new Date(extractedData.date);
      setInvoiceDate(!isNaN(parsedDate.getTime()) ? parsedDate : new Date());
    } else {
      setInvoiceDate(new Date());
    }

    setCSVData(mappedData);
  };

  const handleManualSubmit = (data: any[], date: Date) => {
    setCSVData(data);
    setInvoiceDate(date);
    setManualVendorId(selectedVendor);
  };

  const handleImportComplete = async () => {
    try {
      toast.success("Data imported and prices updated successfully");
      setCSVData(null);
      setSelectedVendor("");
      handleTabChange("triage"); // Go to Triage to handle any pending items
    } catch (error) {
      console.error("Error in import confirmation:", error);
      toast.error("There was an error completing the import");
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/VendorInvoice/VendorInvoiceManager.tsx
        </div>
      )}

      {/* ========================================================================
       * L5 HEADER CARD - Variant A (Simple)
       * Reference: Operations.tsx, L5-BUILD-STRATEGY.md
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CircleDollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Vendor Invoice Manager
                </h1>
                <p className="text-gray-400 text-sm">
                  Process vendor invoices and update ingredient prices
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleTabChange("import");
                  setTimeout(() => setImportType("manual"), 50);
                }}
                className="btn-ghost text-primary-400 hover:text-primary-300 border border-primary-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Invoice
              </button>
              <button
                onClick={() => {
                  handleTabChange("import");
                  setTimeout(() => {
                    if (importType === "manual") setImportType("csv");
                  }, 50);
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Import Invoice
              </button>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Vendor Invoices
                </span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <p className="text-sm text-gray-400">
                  Import vendor invoices via CSV or PDF to automatically update 
                  ingredient prices. Track price history, analyze vendor performance, 
                  and manage umbrella items that aggregate costs across vendors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-primary-400">Price History</span>
                    <p className="text-xs text-gray-500 mt-1">Track price changes over time</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-green-400">Analytics</span>
                    <p className="text-xs text-gray-500 mt-1">Vendor spend & trends</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-amber-400">Code Groups</span>
                    <p className="text-xs text-gray-500 mt-1">Map vendor codes to ingredients</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-rose-400">Umbrella Items</span>
                    <p className="text-xs text-gray-500 mt-1">Aggregate multi-vendor costs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * L5 TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2 p-4">
                        {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isTriage = tab.id === 'triage';
              const isImport = tab.id === 'import';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`tab ${tab.color} ${isActive ? "active" : ""} relative`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {/* Triage badge */}
                  {isTriage && (
                    <span 
                      className={`
                        absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] 
                        flex items-center justify-center 
                        text-[10px] font-bold rounded-full px-1
                        ${triageCount > 0 
                          ? 'text-white bg-red-700' 
                          : 'text-gray-500 bg-gray-700'
                        }
                      `}
                    >
                      {triageAnimating && triageCount > 0 && (
                        <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-60" />
                      )}
                      <span className="relative z-10">
                        {triageCount > 99 ? '99+' : triageCount}
                      </span>
                    </span>
                  )}
                  {/* Import draft indicator */}
                  {isImport && hasImportDraft && !isActive && (
                    <span 
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-[#1a1f2b]"
                      title="Draft in progress"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* Vendor Selection - Only visible for import tab */}
          {activeTab === "import" && (
            <div className="mb-6">
              {/* A/B Testing: Dev/omega users can compare variants */}
              {showHeaderToggle && (
                <VariantToggle
                  componentName="VendorSelector"
                  variants={[...headerVariants]}
                  activeVariant={headerVariant}
                  onVariantChange={setHeaderVariant}
                  labels={{ original: "Original", compact: "Compact" }}
                />
              )}
              
              {headerVariant === "compact" ? (
                <ImportHeader
                  selectedVendor={selectedVendor}
                  onVendorChange={setSelectedVendor}
                  onSettingsClick={() => setActiveTab("settings")}
                />
              ) : (
                <VendorSelector
                  selectedVendor={selectedVendor}
                  onVendorChange={setSelectedVendor}
                  fileType={importType}
                  onFileTypeChange={(type) => setImportType(type as "csv" | "pdf" | "manual")}
                />
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 relative animate-bounce">
                <img
                  src="https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png"
                  alt="Loading..."
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-gray-400 mt-4">Processing your file...</p>
            </div>
          ) : csvData ? (
            /* Data Preview */
            <DataPreview
              data={csvData}
              vendorId={manualVendorId || selectedVendor}
              invoiceDate={invoiceDate || new Date()}
              sourceFile={sourceFile || undefined}
              importType={importType === "manual" ? "manual_entry" : `${importType}_import` as any}
              supersedeInfo={supersedeInfo || undefined}
              onDateChange={(date) => setInvoiceDate(date)}
              onConfirm={handleImportComplete}
              onCancel={() => {
                setCSVData(null);
                setSelectedVendor("");
                setSourceFile(null);
                setSupersedeInfo(null);
              }}
            />
          ) : (
            /* Tab Content */
            <>
              {activeTab === "dashboard" && <PriceHistory />}
              {activeTab === "analytics" && <VendorAnalytics />}
              {activeTab === "codes" && <ItemCodeGroupManager />}
              {activeTab === "umbrella" && <UmbrellaIngredientManager />}
                            {activeTab === "import" && (
                <>
                  {importType === "csv" && (
                    <CSVUploader
                      onUpload={handleUpload}
                      hasTemplate={templates.some((t) => t.vendor_id === selectedVendor)}
                      vendorId={selectedVendor}
                    />
                  )}
                  {(importType === "pdf" || importType === "manual") && (
                    selectedVendor ? (
                      <ImportWorkspace
                        vendorId={selectedVendor}
                        vendorName={selectedVendor}
                        importType={importType === "pdf" ? "pdf" : "photo"}
                        recallRecord={recallRecord}
                        onDraftChange={setHasImportDraft}
                        onComplete={() => {
                          setSelectedVendor("");
                          setImportType("csv");
                          setRecallRecord(null);
                          setHasImportDraft(false);
                          handleTabChange("triage");
                        }}
                        onCancel={() => {
                          setSelectedVendor("");
                          setImportType("csv");
                          setRecallRecord(null);
                          setHasImportDraft(false);
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/50">
                        <h3 className="text-lg font-medium text-white mb-2">
                          {importType === "pdf" ? "PDF Import" : "Manual Entry"}
                        </h3>
                        <p className="text-gray-400 text-center mb-4">
                          Please select a vendor first to begin
                        </p>
                      </div>
                    )
                  )}
                </>
              )}
              {/* Keep ImportWorkspace mounted but hidden when there's a draft and on other tabs */}
              {activeTab !== "import" && hasImportDraft && selectedVendor && (importType === "pdf" || importType === "manual") && (
                <div className="hidden">
                  <ImportWorkspace
                    vendorId={selectedVendor}
                    vendorName={selectedVendor}
                    importType={importType === "pdf" ? "pdf" : "photo"}
                    recallRecord={recallRecord}
                    onDraftChange={setHasImportDraft}
                    onComplete={() => {
                      setSelectedVendor("");
                      setImportType("csv");
                      setRecallRecord(null);
                      setHasImportDraft(false);
                      handleTabChange("triage");
                    }}
                    onCancel={() => {
                      setSelectedVendor("");
                      setImportType("csv");
                      setRecallRecord(null);
                      setHasImportDraft(false);
                    }}
                  />
                </div>
              )}
              {activeTab === "history" && (
                <ImportHistory
                  onRecall={(importRecord) => {
                    // Store the record for recall
                    setRecallRecord(importRecord);
                    // Switch to import tab with vendor pre-selected
                    setSelectedVendor(importRecord.vendor_id);
                    setImportType("manual"); // Use photo/manual import for corrections
                    handleTabChange("import");
                    toast(
                      `Loading ${importRecord.file_name} for correction. Upload new version when ready.`,
                      { icon: "📝", duration: 5000 }
                    );
                  }}
                />
              )}
              {activeTab === "triage" && <TriagePanel />}
              {activeTab === "settings" && <VendorSettings />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
