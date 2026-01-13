import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Settings,
  FileSpreadsheet,
  FileText,
  Check,
  ChevronRight,
  Upload,
  User,
  Phone,
  Mail,
  Hash,
  Save,
  PenLine,
  Sparkles,
  ExternalLink,
  Trash2,
  Smartphone,
} from "lucide-react";
import { type VendorCardData } from "@/shared/components/VendorCard";
import { supabase } from "@/lib/supabase";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { inferVendorDefaults } from "@/stores/vendorConfigsStore";
import toast from "react-hot-toast";

// =============================================================================
// VENDOR SETTINGS MODAL - L5 Design
// =============================================================================
// Invoice Methods (color sequence: primary → green → amber → rose):
//   CSV    = primary (blue) - bulk file import
//   PDF    = green          - document parsing  
//   Manual = amber          - desktop entry
//   Mobile = rose           - quick mobile workflow
// =============================================================================

interface VendorSettingsModalProps {
  isOpen: boolean;
  vendor: VendorCardData | null;
  onClose: () => void;
  onSave: (vendor: VendorCardData) => Promise<void>;
  onConfigureCSV: (vendor: VendorCardData) => void;
  onConfigurePDF: (vendor: VendorCardData) => void;
}

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export const VendorSettingsModal: React.FC<VendorSettingsModalProps> = ({
  isOpen,
  vendor,
  onClose,
  onSave,
  onConfigureCSV,
  onConfigurePDF,
}) => {
  const { organizationId } = useOrganizationId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [csvEnabled, setCsvEnabled] = useState(true);
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [manualEnabled, setManualEnabled] = useState(true);
  const [mobileEnabled, setMobileEnabled] = useState(false);
  const [defaultInvoiceType, setDefaultInvoiceType] = useState<"csv" | "pdf" | "manual" | "mobile">("manual");
  const [accountNumber, setAccountNumber] = useState("");
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when vendor changes
  useEffect(() => {
    if (vendor) {
      setLogoUrl(vendor.logo_url);
      setCsvEnabled(vendor.csv_enabled ?? true);
      setPdfEnabled(vendor.pdf_enabled ?? false);
      setManualEnabled(vendor.manual_enabled ?? true);
      setMobileEnabled(vendor.mobile_enabled ?? false);
      setDefaultInvoiceType(vendor.default_invoice_type ?? "manual");
      setAccountNumber(vendor.account_number ?? "");
      setRepName(vendor.rep_name ?? "");
      setRepEmail(vendor.rep_email ?? "");
      setRepPhone(vendor.rep_phone ?? "");
    }
  }, [vendor]);

  // Keyboard handler (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Apply smart defaults
  const applySmartDefaults = () => {
    if (!vendor) return;
    
    const defaults = inferVendorDefaults(vendor.vendor_name);
    setCsvEnabled(defaults.csv_enabled ?? true);
    setPdfEnabled(defaults.pdf_enabled ?? false);
    setManualEnabled(defaults.manual_enabled ?? true);
    setMobileEnabled(defaults.mobile_enabled ?? false);
    setDefaultInvoiceType(defaults.default_invoice_type ?? "manual");
    
    toast.success("Smart defaults applied");
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId || !vendor) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organizationId}/vendors/${vendor.vendor_id.replace(/\s+/g, '_')}.${fileExt}`;

      const { error } = await supabase.storage
        .from("Logos")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("Logos")
        .getPublicUrl(fileName);

      const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogoUrl(newLogoUrl);
      toast.success("Logo uploaded");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!vendor) return;
    
    setIsSaving(true);
    try {
      const updatedVendor: VendorCardData = {
        ...vendor,
        logo_url: logoUrl,
        csv_enabled: csvEnabled,
        pdf_enabled: pdfEnabled,
        manual_enabled: manualEnabled,
        mobile_enabled: mobileEnabled,
        default_invoice_type: defaultInvoiceType,
        account_number: accountNumber || undefined,
        rep_name: repName || undefined,
        rep_email: repEmail || undefined,
        rep_phone: repPhone || undefined,
      };
      
      await onSave(updatedVendor);
      toast.success("Vendor settings saved");
      onClose();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Get enabled invoice types for default dropdown
  const getEnabledTypes = () => {
    const types: { value: string; label: string }[] = [];
    if (csvEnabled) types.push({ value: "csv", label: "CSV Import" });
    if (pdfEnabled) types.push({ value: "pdf", label: "PDF Import" });
    if (manualEnabled) types.push({ value: "manual", label: "Manual Entry" });
    if (mobileEnabled) types.push({ value: "mobile", label: "Mobile Entry" });
    return types;
  };

  if (!isOpen || !vendor) return null;

  const initials = getInitials(vendor.vendor_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Vendor Settings</h2>
              <p className="text-sm text-gray-400">{vendor.vendor_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 active:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden ring-2 ring-gray-700 flex items-center justify-center ${
                !logoUrl ? 'bg-gray-700' : 'bg-gray-900'
              }`}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={vendor.vendor_name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-semibold text-gray-400">
                    {initials}
                  </span>
                )}
                
                {/* Upload overlay */}
                <div
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                             transition-opacity flex items-center justify-center cursor-pointer rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium text-lg">{vendor.vendor_name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {vendor.total_invoices} invoice{vendor.total_invoices !== 1 ? 's' : ''} · Tap logo to upload
              </p>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(undefined)}
                  className="text-sm text-rose-400 hover:text-rose-300 mt-2 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove logo
                </button>
              )}
            </div>
          </div>

          {/* Invoice Methods Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-300">Invoice Methods</h4>
              <button
                onClick={applySmartDefaults}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Smart Defaults
              </button>
            </div>
            <div className="space-y-2">
              {/* CSV - Primary (blue) */}
              <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer min-h-[72px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">CSV Import</span>
                    <p className="text-xs text-gray-500">Bulk import from spreadsheet</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {csvEnabled && vendor.has_csv_template && (
                    <span className="text-xs text-primary-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                  {csvEnabled && !vendor.has_csv_template && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onConfigureCSV(vendor);
                      }}
                      className="min-h-[36px] text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 px-2"
                    >
                      Configure <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={csvEnabled}
                      onChange={(e) => setCsvEnabled(e.target.checked)}
                    />
                    <div className="toggle-switch-track" />
                  </label>
                </div>
              </label>

              {/* PDF - Green */}
              <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer min-h-[72px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">PDF Import</span>
                    <p className="text-xs text-gray-500">Extract from PDF documents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pdfEnabled && vendor.has_pdf_template && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                  {pdfEnabled && !vendor.has_pdf_template && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onConfigurePDF(vendor);
                      }}
                      className="min-h-[36px] text-xs text-green-400 hover:text-green-300 flex items-center gap-1 px-2"
                    >
                      Configure <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <label className="toggle-switch emerald" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={pdfEnabled}
                      onChange={(e) => setPdfEnabled(e.target.checked)}
                    />
                    <div className="toggle-switch-track" />
                  </label>
                </div>
              </label>

              {/* Manual - Amber */}
              <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer min-h-[72px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">Manual Entry</span>
                    <p className="text-xs text-gray-500">Type items at desktop</p>
                  </div>
                </div>
                <label className="toggle-switch amber" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={manualEnabled}
                    onChange={(e) => setManualEnabled(e.target.checked)}
                  />
                  <div className="toggle-switch-track" />
                </label>
              </label>

              {/* Mobile - Rose */}
              <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer min-h-[72px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">Mobile Entry</span>
                    <p className="text-xs text-gray-500">Quick entry on phone</p>
                  </div>
                </div>
                <label className="toggle-switch rose" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={mobileEnabled}
                    onChange={(e) => setMobileEnabled(e.target.checked)}
                  />
                  <div className="toggle-switch-track" />
                </label>
              </label>
            </div>
          </div>

          {/* Default Invoice Type */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Default Method</h4>
            <select
              value={defaultInvoiceType}
              onChange={(e) => setDefaultInvoiceType(e.target.value as any)}
              className="input w-full min-h-[48px] text-base"
            >
              {getEnabledTypes().map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Auto-selected when adding an invoice from this vendor
            </p>
          </div>

          {/* Vendor Details Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Vendor Details <span className="text-gray-500 font-normal">(Optional)</span></h4>
            <div className="space-y-3">
              {/* Account Number */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Account Number</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Your account # with this vendor"
                    className="input w-full pl-11 min-h-[48px] text-base"
                  />
                </div>
              </div>

              {/* Rep Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Sales Rep Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="Your rep's name"
                    className="input w-full pl-11 min-h-[48px] text-base"
                  />
                </div>
              </div>

              {/* Rep Email */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Sales Rep Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                    placeholder="rep@vendor.com"
                    className="input w-full pl-11 min-h-[48px] text-base"
                  />
                </div>
              </div>

              {/* Rep Phone */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Sales Rep Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={repPhone}
                    onChange={(e) => setRepPhone(e.target.value)}
                    placeholder="555-123-4567"
                    className="input w-full pl-11 min-h-[48px] text-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-t border-gray-700 bg-gray-800/50">
          {/* Link to Operations for vendor CRUD */}
          <a
            href="/admin/organization/operations#vendors"
            className="min-h-[44px] text-gray-400 hover:text-gray-300 text-sm flex items-center gap-1.5 px-3"
          >
            <ExternalLink className="w-4 h-4" />
            Manage vendor list
          </a>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-ghost min-h-[44px] px-5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary min-h-[44px] px-5"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
