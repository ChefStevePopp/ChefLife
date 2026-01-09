import React, { useState, useCallback } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Eye,
  Loader2,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { LoadingLogo } from "@/features/shared/components";
import toast from "react-hot-toast";

// =============================================================================
// IMPORT EXCEL MODAL - L5 Design
// =============================================================================
// Multi-step wizard: Upload → Map Columns → Preview → Import
// Used by: MasterIngredientList, PreparedItems, Inventory
// =============================================================================

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[], sheetName: string) => Promise<void>;
  type: "inventory" | "prepared-items" | "master-ingredients";
}

// Field definitions for each import type
const FIELD_DEFINITIONS = {
  "master-ingredients": [
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
  ],
  "prepared-items": [
    { key: "product", label: "Item Name", required: true, description: "The prepared item name" },
    { key: "category", label: "Category", required: false, description: "Item category" },
    { key: "sub_category", label: "Sub-Category", required: false, description: "Item sub-category" },
    { key: "station", label: "Station", required: false, description: "Prep station" },
    { key: "storage_area", label: "Storage Area", required: false, description: "Where item is stored" },
    { key: "container", label: "Container", required: false, description: "Container type" },
    { key: "shelf_life", label: "Shelf Life", required: false, description: "Days until expiration" },
    { key: "recipe_unit", label: "Recipe Unit", required: false, description: "Unit of measure" },
    { key: "cost_per_unit", label: "Cost per Unit", required: false, description: "Cost per recipe unit" },
    { key: "yield_percent", label: "Yield %", required: false, description: "Usable yield" },
  ],
  inventory: [
    { key: "product", label: "Product Name", required: true, description: "The item name" },
    { key: "item_code", label: "Item Code", required: false, description: "Item identifier" },
    { key: "category", label: "Category", required: false, description: "Item category" },
    { key: "unit_of_measure", label: "Unit", required: false, description: "Count unit" },
    { key: "quantity", label: "Quantity", required: false, description: "Current count" },
    { key: "price", label: "Price", required: false, description: "Unit price" },
  ],
};

type Step = "upload" | "sheet" | "mapping" | "preview";

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImport,
  type,
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
  const [sheetPreview, setSheetPreview] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<any[]>([]);

  const fields = FIELD_DEFINITIONS[type];

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
      setSheetPreview([]);
      setColumnMapping({});
      
      // If only one sheet, auto-select it
      if (wb.SheetNames.length === 1) {
        handleSheetSelect(wb, wb.SheetNames[0]);
      } else {
        setStep("sheet");
      }
    } catch (error) {
      console.error("Error reading Excel:", error);
      toast.error("Failed to read file. Please ensure it's a valid Excel file.");
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
      const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
      const dataRows = jsonData.slice(1).filter((row: any) => 
        row.some((cell: any) => cell !== "")
      );

      setSelectedSheet(sheetName);
      setSheetColumns(headers);
      setSheetPreview(dataRows.slice(0, 5) as any[]); // First 5 rows for preview
      
      // Auto-map columns with fuzzy matching
      const autoMapping: Record<string, string> = {};
      fields.forEach((field) => {
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
  }, [fields]);

  const handleMappingComplete = useCallback(() => {
    if (!workbook || !selectedSheet) return;

    try {
      setIsProcessing(true);
      const worksheet = workbook.Sheets[selectedSheet];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Transform data using mapping
      const transformed = dataRows
        .filter((row: any) => row.some((cell: any) => cell !== ""))
        .map((row: any) => {
          const item: Record<string, any> = {};
          fields.forEach((field) => {
            const sourceColumn = columnMapping[field.key];
            if (sourceColumn) {
              const colIndex = headers.indexOf(sourceColumn);
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
      setStep("preview");
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Failed to process data");
    } finally {
      setIsProcessing(false);
    }
  }, [workbook, selectedSheet, columnMapping, fields]);

  const handleImport = useCallback(async () => {
    if (mappedData.length === 0) return;

    try {
      setIsProcessing(true);
      await onImport(mappedData, selectedSheet);
      toast.success(`Successfully imported ${mappedData.length} items`);
      onClose();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data");
    } finally {
      setIsProcessing(false);
    }
  }, [mappedData, selectedSheet, onImport, onClose]);

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

  const resetWizard = useCallback(() => {
    setStep("upload");
    setWorkbook(null);
    setFileName("");
    setSelectedSheet("");
    setSheetColumns([]);
    setSheetPreview([]);
    setColumnMapping({});
    setMappedData([]);
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (!isOpen) return null;

  const typeLabel = type === "master-ingredients" 
    ? "Master Ingredients" 
    : type === "prepared-items" 
      ? "Prepared Items" 
      : "Inventory";

  const requiredFields = fields.filter((f) => f.required);
  const mappedRequiredCount = requiredFields.filter((f) => columnMapping[f.key]).length;
  const canProceedToPreview = mappedRequiredCount === requiredFields.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#1a1f2b] p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import {typeLabel}</h2>
              <p className="text-sm text-gray-400">
                {fileName || "Upload an Excel or CSV file"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-center gap-2">
            {[
              { id: "upload", label: "Upload", icon: Upload },
              { id: "sheet", label: "Sheet", icon: FileSpreadsheet },
              { id: "mapping", label: "Map Columns", icon: MapPin },
              { id: "preview", label: "Preview", icon: Eye },
            ].map((s, index) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isPast = ["upload", "sheet", "mapping", "preview"].indexOf(step) > index;
              return (
                <React.Fragment key={s.id}>
                  {index > 0 && (
                    <ChevronRight className={`w-4 h-4 ${isPast ? "text-primary-400" : "text-gray-600"}`} />
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-500/20 text-primary-400"
                        : isPast
                          ? "text-primary-400"
                          : "text-gray-500"
                    }`}
                  >
                    {isPast && !isActive ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isProcessing ? (
            <div className="flex items-center justify-center py-12">
              <LoadingLogo message="Processing..." />
            </div>
          ) : (
            <>
              {/* Step 1: Upload */}
              {step === "upload" && (
                <div className="space-y-6">
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
                          <li>• You'll map your columns to our fields in the next step</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Sheet Selection */}
              {step === "sheet" && workbook && (
                <div className="space-y-4">
                  <p className="text-gray-400">
                    This file contains multiple sheets. Select the one with your data:
                  </p>
                  <div className="grid gap-3">
                    {workbook.SheetNames.map((name: string) => (
                      <button
                        key={name}
                        onClick={() => handleSheetSelect(workbook, name)}
                        className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/80 transition-colors text-left"
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

              {/* Step 3: Column Mapping */}
              {step === "mapping" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">Map Your Columns</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Match your spreadsheet columns to our fields
                      </p>
                    </div>
                    <div className="text-sm">
                      <span className={mappedRequiredCount === requiredFields.length ? "text-green-400" : "text-amber-400"}>
                        {mappedRequiredCount}/{requiredFields.length} required fields mapped
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          field.required && !columnMapping[field.key]
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-gray-700 bg-gray-800/50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{field.label}</span>
                            {field.required && (
                              <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                        <select
                          value={columnMapping[field.key] || ""}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="input w-48"
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

                  {/* Preview of first row */}
                  {sheetPreview.length > 0 && (
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">
                        Sample data from row 1:
                      </h4>
                      <div className="text-sm text-gray-300 space-y-1">
                        {sheetColumns.slice(0, 5).map((col, i) => (
                          <div key={col} className="flex gap-2">
                            <span className="text-gray-500">{col}:</span>
                            <span>{String(sheetPreview[0]?.[i] || "-")}</span>
                          </div>
                        ))}
                        {sheetColumns.length > 5 && (
                          <div className="text-gray-500">...and {sheetColumns.length - 5} more columns</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Preview */}
              {step === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">Review Import Data</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {mappedData.length} items ready to import
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-400 font-medium">#</th>
                            {fields
                              .filter((f) => columnMapping[f.key])
                              .slice(0, 6)
                              .map((field) => (
                                <th key={field.key} className="px-4 py-3 text-left text-gray-400 font-medium">
                                  {field.label}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {mappedData.slice(0, 20).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                              <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                              {fields
                                .filter((f) => columnMapping[f.key])
                                .slice(0, 6)
                                .map((field) => (
                                  <td key={field.key} className="px-4 py-2 text-gray-300">
                                    {String(row[field.key] || "-")}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {mappedData.length > 20 && (
                      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-sm text-gray-400">
                        Showing 20 of {mappedData.length} items
                      </div>
                    )}
                  </div>

                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    <div className="flex gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-green-400 font-medium">Ready to import</p>
                        <p className="text-sm text-gray-300 mt-1">
                          {mappedData.length} items will be added to your {typeLabel.toLowerCase()}.
                          Existing items with matching codes will be updated.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800/50 p-4 border-t border-gray-700 flex items-center justify-between">
          <div>
            {step !== "upload" && (
              <button
                onClick={() => {
                  if (step === "sheet") resetWizard();
                  else if (step === "mapping") setStep(workbook?.SheetNames.length > 1 ? "sheet" : "upload");
                  else if (step === "preview") setStep("mapping");
                }}
                className="btn-ghost"
                disabled={isProcessing}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost" disabled={isProcessing}>
              Cancel
            </button>
            {step === "mapping" && (
              <button
                onClick={handleMappingComplete}
                disabled={!canProceedToPreview || isProcessing}
                className="btn-primary"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Preview
              </button>
            )}
            {step === "preview" && (
              <button
                onClick={handleImport}
                disabled={isProcessing || mappedData.length === 0}
                className="btn-primary"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {mappedData.length} Items
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
