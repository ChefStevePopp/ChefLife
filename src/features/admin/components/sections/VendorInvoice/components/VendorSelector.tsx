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
    <div className="card p-4">
      {/* Compact Header Row - Fully Justified */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Icon + Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Invoice Processing</h3>
            <p className="text-xs text-gray-500">Select vendor and method</p>
          </div>
        </div>

        {/* Vendor Selector */}
        <div className="flex-1 min-w-[200px] max-w-[400px]">
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

        {/* Upload Method Icons */}
        <div className="flex items-center gap-2">
          {/* CSV */}
          <button
            type="button"
            onClick={() => onFileTypeChange("csv")}
            className="flex flex-col items-center gap-0.5 group"
            title="CSV Import"
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${fileType === "csv" 
                ? "bg-primary-500/30 ring-2 ring-primary-500" 
                : "bg-gray-700/50 hover:bg-gray-700 group-hover:ring-1 group-hover:ring-gray-600"
              }
            `}>
              <FileSpreadsheet className={`w-5 h-5 ${fileType === "csv" ? "text-primary-400" : "text-gray-400 group-hover:text-gray-300"}`} />
            </div>
            <span className={`text-[10px] font-medium ${fileType === "csv" ? "text-primary-400" : "text-gray-500"}`}>
              CSV
            </span>
          </button>

          {/* PDF */}
          <button
            type="button"
            onClick={() => onFileTypeChange("pdf")}
            className="flex flex-col items-center gap-0.5 group"
            title="PDF Import"
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${fileType === "pdf" 
                ? "bg-green-500/30 ring-2 ring-green-500" 
                : "bg-gray-700/50 hover:bg-gray-700 group-hover:ring-1 group-hover:ring-gray-600"
              }
            `}>
              <FileText className={`w-5 h-5 ${fileType === "pdf" ? "text-green-400" : "text-gray-400 group-hover:text-gray-300"}`} />
            </div>
            <span className={`text-[10px] font-medium ${fileType === "pdf" ? "text-green-400" : "text-gray-500"}`}>
              PDF
            </span>
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => onFileTypeChange("manual")}
            className="flex flex-col items-center gap-0.5 group"
            title="Manual Entry"
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${fileType === "manual" 
                ? "bg-purple-500/30 ring-2 ring-purple-500" 
                : "bg-gray-700/50 hover:bg-gray-700 group-hover:ring-1 group-hover:ring-gray-600"
              }
            `}>
              <Edit className={`w-5 h-5 ${fileType === "manual" ? "text-purple-400" : "text-gray-400 group-hover:text-gray-300"}`} />
            </div>
            <span className={`text-[10px] font-medium ${fileType === "manual" ? "text-purple-400" : "text-gray-500"}`}>
              Manual
            </span>
          </button>
        </div>

        {/* Status Badges */}
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
                <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
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
      <div className={`expandable-info-section mt-4 ${isInfoExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
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
                  <Edit className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Manual Entry</span>
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
