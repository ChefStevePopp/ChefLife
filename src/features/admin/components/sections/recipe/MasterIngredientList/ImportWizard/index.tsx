import React, { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  MapPin,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import toast from "react-hot-toast";
import { MasterIngredient } from "@/types/master-ingredient";

// =============================================================================
// IMPORT WIZARD - Inline (No Modal)
// =============================================================================
// Multi-step wizard: Upload → Sheet → Map → Preview → Import
// Lives inline in the Import tab - survives auth refreshes
// =============================================================================

interface ImportWizardProps {
  organizationId?: string;
  existingIngredients: MasterIngredient[];
  onImport: (data: any[]) => Promise<void>;
}

// Field definitions for master ingredients import
const FIELD_DEFINITIONS = [
  { key: "product", label: "Product Name", required: true, description: "The ingredient name" },
  { key: "item_code", label: "Vendor/Item Code", required: false, description: "Vendor's product code" },
  { key: "vendor", label: "Vendor", required: false, description: "Primary vendor name" },
  { key: "major_group", label: "Major Group", required: false, description: "Top-level category (e.g., FOOD, ALCOHOL)" },
  { key: "category", label: "Category", required: false, description: "Category (e.g., DAIRY, PROTEINS)" },
  { key: "sub_category", label: "Sub-Category", required: false, description: "Sub-category (e.g., CHEESE, PORK)" },
  { key: "unit_of_measure", label: "Unit of Measure", required: false, description: "Purchase unit (e.g., CASE, EACH)" },
  { key: "current_price", label: "Current Price", required: false, description: "Current purchase price" },
  { key: "units_per_case", label: "Units per Case", required: false, description: "How many units in a case" },
  { key: "recipe_unit_type", label: "Recipe Unit", required: false, description: "Unit used in recipes (e.g., OZ, LB)" },
  { key: "recipe_unit_per_purchase_unit", label: "Recipe Units per Purchase", required: false, description: "Conversion factor" },
  { key: "yield_percent", label: "Yield %", required: false, description: "Usable yield percentage" },
  { key: "storage_area", label: "Storage Area", required: false, description: "Where item is stored" },
];

type Step = "upload" | "sheet" | "mapping" | "preview";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "sheet", label: "Sheet", icon: FileSpreadsheet },
  { id: "mapping", label: "Map Columns", icon: MapPin },
  { id: "preview", label: "Preview", icon: Eye },
];

export const ImportWizard: React.FC<ImportWizardProps> = ({
  organizationId,
  existingIngredients,
  onImport,
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [step, setStep] = useState<Step>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [workbook, setWorkbook] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<any[]>([]);
  
  // Preview pagination
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 10;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { cellDates: true, cellNF: false, cellText: false });
      setWorkbook(wb);
      setFileName(file.name);
      setSelectedSheet("");
      setSheetColumns([]);
      setSheetData([]);
      setColumnMapping({});
      setMappedData([]);
      
      // If only one sheet, auto-select it
      if (wb.SheetNames.length === 1) {
        handleSheetSelect(wb, wb.SheetNames[0]);
      } else {
        setStep("sheet");
      }
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read file. Please ensure it's a valid Excel or CSV file.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSheetSelect = useCallback((wb: any, sheetName: string) => {
    if (!wb || !sheetName) return;

    try {
      setIsProcessing(true);
      const worksheet = wb.Sheets[sheetName];
      
      // Get raw data with headers
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
      
      if (jsonData.length < 2) {
        toast.error("Sheet appears to be empty or has no data rows");
        return;
      }

      // First row is headers
      const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim()).filter(Boolean);
      const dataRows = jsonData.slice(1).filter((row: any) => 
        row.some((cell: any) => cell !== "")
      );

      setSelectedSheet(sheetName);
      setSheetColumns(headers);
      setSheetData(dataRows);
      
      // Auto-map columns with fuzzy matching
      const autoMapping: Record<string, string> = {};
      FIELD_DEFINITIONS.forEach((field) => {
        const match = headers.find((h) => {
          const headerLower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const fieldLower = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          const keyLower = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          return headerLower.includes(fieldLower) || 
                 headerLower.includes(keyLower) ||
                 fieldLower.includes(headerLower);
        });
        if (match) {
          autoMapping[field.key] = match;
        }
      });
      setColumnMapping(autoMapping);
      setStep("mapping");
    } catch (error) {
      console.error("Error loading sheet:", error);
      toast.error("Failed to load sheet data");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMappingComplete = useCallback(() => {
    if (sheetColumns.length === 0 || sheetData.length === 0) return;

    try {
      setIsProcessing(true);
      
      // Transform data using mapping
      const transformed = sheetData
        .map((row: any) => {
          const item: Record<string, any> = {};
          FIELD_DEFINITIONS.forEach((field) => {
            const sourceColumn = columnMapping[field.key];
            if (sourceColumn) {
              const colIndex = sheetColumns.indexOf(sourceColumn);
              if (colIndex >= 0) {
                item[field.key] = row[colIndex];
              }
            }
          });
          return item;
        })
        .filter((item) => item.product && String(item.product).trim() !== "");

      if (transformed.length === 0) {
        toast.error("No valid rows found. Ensure 'Product Name' is mapped and has data.");
        return;
      }

      setMappedData(transformed);
      setPreviewPage(1);
      setStep("preview");
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Failed to process data");
    } finally {
      setIsProcessing(false);
    }
  }, [sheetColumns, sheetData, columnMapping]);

  const handleImport = useCallback(async () => {
    if (mappedData.length === 0 || !organizationId) {
      toast.error("No data to import or organization not found");
      return;
    }

    try {
      setIsProcessing(true);
      await onImport(mappedData);
      
      // Reset wizard after successful import
      resetWizard();
      toast.success(`Successfully imported ${mappedData.length} ingredients`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data");
    } finally {
      setIsProcessing(false);
    }
  }, [mappedData, organizationId, onImport]);

  const resetWizard = useCallback(() => {
    setStep("upload");
    setWorkbook(null);
    setFileName("");
    setSelectedSheet("");
    setSheetColumns([]);
    setSheetData([]);
    setColumnMapping({});
    setMappedData([]);
    setPreviewPage(1);
  }, []);

  const goBack = useCallback(() => {
    if (step === "sheet") {
      resetWizard();
    } else if (step === "mapping") {
      setStep(workbook?.SheetNames.length > 1 ? "sheet" : "upload");
    } else if (step === "preview") {
      setStep("mapping");
    }
  }, [step, workbook, resetWizard]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    onDrop: (files) => files[0] && handleFileUpload(files[0]),
  });

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------
  const requiredFields = FIELD_DEFINITIONS.filter((f) => f.required);
  const mappedRequiredCount = requiredFields.filter((f) => columnMapping[f.key]).length;
  const canProceedToPreview = mappedRequiredCount === requiredFields.length;
  
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  
  // Preview pagination
  const totalPreviewPages = Math.ceil(mappedData.length / previewPageSize);
  const previewStartIndex = (previewPage - 1) * previewPageSize;
  const previewRows = mappedData.slice(previewStartIndex, previewStartIndex + previewPageSize);
  
  // Match stats for preview
  const existingCount = mappedData.filter((item) => {
    const existingByCode = item.item_code 
      ? existingIngredients.find((i) => i.item_code === item.item_code) 
      : null;
    const existingByName = existingIngredients.find(
      (i) => i.product?.toLowerCase() === item.product?.toLowerCase()
    );
    return existingByCode || existingByName;
  }).length;
  const newCount = mappedData.length - existingCount;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isPast = stepIndex > index;
            const isClickable = isPast && !isProcessing;
            
            return (
              <React.Fragment key={s.id}>
                {index > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isPast ? "bg-primary-500" : "bg-gray-700"}`} />
                )}
                <button
                  onClick={() => isClickable && setStep(s.id)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-500/20 text-primary-400"
                      : isPast
                        ? "text-primary-400 hover:bg-gray-800 cursor-pointer"
                        : "text-gray-500 cursor-default"
                  }`}
                >
                  {isPast && !isActive ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {isProcessing ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            <span className="text-gray-400">Processing...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================
           * STEP 1: UPLOAD
           * ================================================================ */}
          {step === "upload" && (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary-500 bg-primary-500/10"
                    : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-white font-medium text-lg mb-2">
                  {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
                </p>
                <p className="text-gray-400 mb-4">or click to browse</p>
                <p className="text-sm text-gray-500">
                  Supports .xlsx, .xlsm, .xls, and .csv files
                </p>
              </div>

              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Tips for best results</p>
                    <ul className="text-sm text-gray-300 mt-2 space-y-1">
                      <li>• First row should contain column headers</li>
                      <li>• At minimum, include a "Product Name" column</li>
                      <li>• Existing items will be matched by Item Code or Product Name</li>
                      <li>• You'll map your columns to our fields in the next step</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
           * STEP 2: SHEET SELECTION
           * ================================================================ */}
          {step === "sheet" && workbook && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Select Sheet</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="text-primary-400">{fileName}</span> contains multiple sheets
                  </p>
                </div>
                <button onClick={resetWizard} className="btn-ghost text-sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Start Over
                </button>
              </div>
              
              <div className="grid gap-3">
                {workbook.SheetNames.map((name: string) => (
                  <button
                    key={name}
                    onClick={() => handleSheetSelect(workbook, name)}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-primary-500/50 hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                      <span className="text-white font-medium">{name}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
           * STEP 3: COLUMN MAPPING
           * ================================================================ */}
          {step === "mapping" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Map Your Columns</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Match columns from <span className="text-primary-400">{selectedSheet}</span> to our fields
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${canProceedToPreview ? "text-green-400" : "text-amber-400"}`}>
                    {mappedRequiredCount}/{requiredFields.length} required
                  </span>
                  <button onClick={resetWizard} className="btn-ghost text-sm">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Start Over
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {FIELD_DEFINITIONS.map((field) => (
                  <div
                    key={field.key}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      field.required && !columnMapping[field.key]
                        ? "border-amber-500/30 bg-amber-500/5"
                        : columnMapping[field.key]
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-gray-700 bg-gray-800/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{field.label}</span>
                        {field.required && (
                          <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{field.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <select
                      value={columnMapping[field.key] || ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="input w-48 flex-shrink-0"
                    >
                      <option value="">-- Select column --</option>
                      {sheetColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample data preview */}
              {sheetData.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Sample data (row 1 of {sheetData.length}):
                  </h4>
                  <div className="text-sm text-gray-300 grid grid-cols-2 gap-2">
                    {sheetColumns.slice(0, 6).map((col, i) => (
                      <div key={col} className="flex gap-2 truncate">
                        <span className="text-gray-500">{col}:</span>
                        <span className="truncate">{String(sheetData[0]?.[i] || "-")}</span>
                      </div>
                    ))}
                    {sheetColumns.length > 6 && (
                      <div className="text-gray-500 col-span-2">
                        ...and {sheetColumns.length - 6} more columns
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <button onClick={goBack} className="btn-ghost">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
                <button
                  onClick={handleMappingComplete}
                  disabled={!canProceedToPreview}
                  className="btn-primary"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
           * STEP 4: PREVIEW
           * ================================================================ */}
          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Review Import Data</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {mappedData.length} items ready • {newCount} new • {existingCount} updates
                  </p>
                </div>
                <button onClick={resetWizard} className="btn-ghost text-sm">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Start Over
                </button>
              </div>

              {/* Preview Table */}
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-400 font-medium w-12">#</th>
                        {FIELD_DEFINITIONS
                          .filter((f) => columnMapping[f.key])
                          .slice(0, 5)
                          .map((field) => (
                            <th key={field.key} className="px-4 py-3 text-left text-gray-400 font-medium">
                              {field.label}
                            </th>
                          ))}
                        <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {previewRows.map((row, i) => {
                        const globalIndex = previewStartIndex + i;
                        const existingByCode = row.item_code 
                          ? existingIngredients.find((ing) => ing.item_code === row.item_code) 
                          : null;
                        const existingByName = existingIngredients.find(
                          (ing) => ing.product?.toLowerCase() === row.product?.toLowerCase()
                        );
                        const isUpdate = existingByCode || existingByName;
                        
                        return (
                          <tr key={globalIndex} className="hover:bg-gray-800/50">
                            <td className="px-4 py-2 text-gray-500">{globalIndex + 1}</td>
                            {FIELD_DEFINITIONS
                              .filter((f) => columnMapping[f.key])
                              .slice(0, 5)
                              .map((field) => (
                                <td key={field.key} className="px-4 py-2 text-gray-300">
                                  {String(row[field.key] || "-")}
                                </td>
                              ))}
                            <td className="px-4 py-2">
                              {isUpdate ? (
                                <span className="text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded">
                                  Update
                                </span>
                              ) : (
                                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded">
                                  New
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPreviewPages > 1 && (
                  <div className="px-4 py-3 bg-gray-900 border-t border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Showing {previewStartIndex + 1}-{Math.min(previewStartIndex + previewPageSize, mappedData.length)} of {mappedData.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="btn-ghost text-sm px-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-400">
                        Page {previewPage} of {totalPreviewPages}
                      </span>
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        disabled={previewPage === totalPreviewPages}
                        className="btn-ghost text-sm px-2"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-medium">Ready to import</p>
                    <p className="text-sm text-gray-300 mt-1">
                      <span className="text-green-400">{newCount}</span> new items will be added, 
                      <span className="text-amber-400"> {existingCount}</span> existing items will be updated
                      (matched by Item Code or Product Name).
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <button onClick={goBack} className="btn-ghost">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Mapping
                </button>
                <button onClick={handleImport} className="btn-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Import {mappedData.length} Items
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
