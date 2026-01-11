import React from "react";
import { Check, AlertTriangle, Calendar, Settings } from "lucide-react";
import { useOperationsStore } from "@/stores/operationsStore";
import { useVendorTemplatesStore } from "@/stores/vendorTemplatesStore";
import { useVendorInvoiceStore } from "@/stores/vendorInvoiceStore";
import { format } from "date-fns";

interface Props {
  selectedVendor: string;
  onVendorChange: (vendor: string) => void;
  onSettingsClick: () => void;
}

/**
 * ImportHeader - Clean, minimal vendor selection with mapping status
 * 
 * The OLD flow that worked well:
 * 1. Select vendor from dropdown
 * 2. See green "Mapping Verified ✓" badge if template exists
 * 3. Drop your file
 * 
 * Settings tab is for one-time setup. Import is for daily use.
 */
export const ImportHeader: React.FC<Props> = ({
  selectedVendor,
  onVendorChange,
  onSettingsClick,
}) => {
  const { settings, fetchSettings } = useOperationsStore();
  const { templates } = useVendorTemplatesStore();
  const { fetchLastInvoice, lastInvoice } = useVendorInvoiceStore();
  const vendors = settings?.vendors || [];

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
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 mb-6">
      {/* Vendor Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-400">Vendor:</label>
        <select
          value={selectedVendor}
          onChange={(e) => onVendorChange(e.target.value)}
          className="input py-1.5 px-3 min-w-[160px]"
        >
          <option value="">Select vendor...</option>
          {vendors.map((vendor) => (
            <option key={vendor} value={vendor}>
              {vendor}
            </option>
          ))}
        </select>
      </div>

      {/* Mapping Status Badge */}
      {selectedVendor && (
        <>
          {hasTemplate ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Mapping Verified</span>
            </div>
          ) : (
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">No mapping</span>
              <Settings className="w-3.5 h-3.5 ml-1" />
            </button>
          )}
        </>
      )}

      {/* Last Import Info */}
      {selectedVendor && lastInvoice && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 text-gray-400 rounded-lg ml-auto">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            Last: {format(new Date(lastInvoice.created_at), "MMM d, yyyy")}
          </span>
        </div>
      )}
    </div>
  );
};
