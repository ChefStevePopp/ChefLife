import React, { useState } from "react";
import {
  Store,
  FileSpreadsheet,
  FileText,
  Info,
  Calendar,
  Edit,
  ChevronUp,
  FileCheck2,
  FileX2,
} from "lucide-react";
import { useOperationsStore } from "@/stores/operationsStore";
import { useVendorTemplatesStore } from "@/stores/vendorTemplatesStore";
import { useVendorInvoiceStore } from "@/stores/vendorInvoiceStore";
import { formatDateForDisplay } from "@/utils/dateUtils";

// =============================================================================
// VENDOR SELECTOR - L5 Sub-header Pattern
// =============================================================================
// Uses standardized .subheader classes from index.css
// Structure: Icon (grey) | Title | Dropdown | Toggle Icons | Status Badges
// Toggle icons: Grey when inactive, colored when active
// =============================================================================

interface Props {
  selectedVendor: string;
  onVendorChange: (vendor: string) => void;
  fileType: "csv" | "pdf" | "manual";
  onFileTypeChange: (type: "csv" | "pdf" | "manual") => void;
}

export const VendorSelector: React.FC<Props> = ({
  selectedVendor,
  onVendorChange,
  fileType,
  onFileTypeChange,
}) => {
  const { settings, fetchSettings } = useOperationsStore();
  const { templates } = useVendorTemplatesStore();
  const { fetchLastInvoice, lastInvoice, lastUpload } = useVendorInvoiceStore();
  const vendors = settings?.vendors || [];
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  React.useEffect(() => {
    if (selectedVendor) {
      fetchLastInvoice(selectedVendor);
    }
  }, [selectedVendor, fetchLastInvoice]);

  const hasTemplate = templates.some((t) => t.vendor_id === selectedVendor);

  return (
    <div className="subheader">
      {/* Main Row - Fully Justified */}
      <div className="subheader-row">
        {/* Left: Icon + Title */}
        <div className="subheader-left">
          <div className="subheader-icon">
            <FileText />
          </div>
          <div>
            <h3 className="subheader-title">Invoice Processing</h3>
            <p className="subheader-subtitle">Select vendor and method</p>
          </div>
        </div>

        {/* Center: Vendor Selector */}
        <div className="subheader-center">
          <select
            value={selectedVendor}
            onChange={(e) => onVendorChange(e.target.value)}
            className="input w-full text-sm"
            required
          >
            <option value="">Select vendor...</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Upload Method Toggles */}
        <div className="subheader-right">
          {/* CSV */}
          <button
            type="button"
            onClick={() => onFileTypeChange("csv")}
            className={`subheader-toggle ${fileType === "csv" ? "active primary" : ""}`}
            title="CSV Import"
          >
            <div className="subheader-toggle-icon">
              <FileSpreadsheet />
            </div>
            <span className="subheader-toggle-label">CSV</span>
          </button>

          {/* PDF */}
          <button
            type="button"
            onClick={() => onFileTypeChange("pdf")}
            className={`subheader-toggle ${fileType === "pdf" ? "active green" : ""}`}
            title="PDF Import"
          >
            <div className="subheader-toggle-icon">
              <FileText />
            </div>
            <span className="subheader-toggle-label">PDF</span>
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => onFileTypeChange("manual")}
            className={`subheader-toggle ${fileType === "manual" ? "active amber" : ""}`}
            title="Manual Entry"
          >
            <div className="subheader-toggle-icon">
              <Edit />
            </div>
            <span className="subheader-toggle-label">Manual</span>
          </button>
        </div>

        {/* Status Badges (when vendor selected) */}
        {selectedVendor && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
            {/* Template Status */}
            {fileType !== "manual" && (
              hasTemplate ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <FileCheck2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex flex-col text-xs leading-relaxed">
                    <span className="text-gray-300">
                      <span className="text-gray-500">CSV Template:</span>{" "}
                      <span className="font-medium text-emerald-400">Ready</span>
                    </span>
                    <span className="text-gray-500">Column mapping configured</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800/50 rounded-lg border border-rose-500/30">
                  <FileX2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div className="flex flex-col text-xs leading-relaxed">
                    <span className="text-gray-300">
                      <span className="text-gray-500">CSV Template:</span>{" "}
                      <span className="font-medium text-rose-400">Not configured</span>
                    </span>
                    <span className="text-gray-500">Go to Settings to set up</span>
                  </div>
                </div>
              )
            )}
            
            {/* Invoice History Info */}
            {(lastInvoice || lastUpload) && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex flex-col text-xs leading-relaxed">
                  {/* Last Invoice Date (by calendar) - fall back to upload date for legacy */}
                  {(lastInvoice?.invoice_date || lastInvoice?.created_at) && (
                    <span 
                      className="text-gray-300"
                      title={`Last invoice: ${lastInvoice.filename || 'Unknown'}`}
                    >
                      <span className="text-gray-500">Last Invoice:</span>{" "}
                      <span className="font-medium text-white">
                        {lastInvoice.invoice_date 
                          ? formatDateForDisplay(lastInvoice.invoice_date)
                          : formatDateForDisplay(lastInvoice.created_at.split('T')[0])}
                      </span>
                    </span>
                  )}
                  {/* Last Upload (when imported) */}
                  {lastUpload?.created_at && (
                    <span 
                      className="text-gray-300"
                      title={`Uploaded: ${lastUpload.filename || 'Unknown'}`}
                    >
                      <span className="text-gray-500">Last Upload:</span>{" "}
                      <span className="font-medium text-gray-400">
                        {formatDateForDisplay(lastUpload.created_at.split('T')[0])}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Info Section */}
      <div className={`subheader-info expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">
              Import Methods Guide
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-primary-400">CSV Import</span>
                </div>
                <p className="text-xs text-gray-500">
                  Upload vendor CSV files. Requires a template to map columns to your ingredient list.
                </p>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">PDF Import</span>
                </div>
                <p className="text-xs text-gray-500">
                  Upload PDF invoices. We'll extract line items and match to ingredients automatically.
                </p>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">Manual Entry</span>
                </div>
                <p className="text-xs text-gray-500">
                  Photo upload for audit trail + manual data entry. Best for receipts and paper invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
