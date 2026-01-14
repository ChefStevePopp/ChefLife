import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Settings,
  FileSpreadsheet,
  FileText,
  Check,
  ChevronRight,
  User,
  Phone,
  Mail,
  Hash,
  Save,
  PenLine,
  Sparkles,
  ExternalLink,
  Smartphone,
  Pencil,
} from "lucide-react";
import { type VendorCardData } from "@/shared/components/VendorCard";
import { ImageUploadModal } from "@/shared/components";
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
//
// Logo upload via universal ImageUploadModal
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

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
      if (e.key === 'Escape' && isOpen && !isLogoModalOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLogoModalOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isLogoModalOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isLogoModalOpen, onClose]);

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

  // Upload handler for ImageUploadModal
  const handleLogoUpload = async (file: File): Promise<string> => {
    if (!organizationId || !vendor) throw new Error("No organization or vendor");

    const fileExt = file.name.split(".").pop();
    const baseFileName = `${organizationId}/vendors/${vendor.vendor_id.replace(/\s+/g, '_')}`;
    const newFileName = `${baseFileName}.${fileExt}`;

    // Clean up any existing files for this vendor
    // 1. Delete by URL if we have one (handles exact file)
    // 2. Delete common extensions (handles orphaned files)
    const filesToDelete: string[] = [];
    const currentLogoUrl = logoUrl || vendor.logo_url;
    
    if (currentLogoUrl) {
      try {
        const url = new URL(currentLogoUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/Logos\/(.+)$/);
        if (pathMatch) {
          filesToDelete.push(pathMatch[1].split('?')[0]);
        }
      } catch (e) {
        // URL parsing failed, continue with extension-based cleanup
      }
    }
    
    // Always try common extensions to catch orphaned files
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    extensions.forEach(ext => {
      const path = `${baseFileName}.${ext}`;
      if (!filesToDelete.includes(path)) {
        filesToDelete.push(path);
      }
    });
    
    // Delete all potential files (ignore errors)
    if (filesToDelete.length > 0) {
      await supabase.storage.from("Logos").remove(filesToDelete).catch(() => {});
    }

    // Upload the new file
    const { error } = await supabase.storage
      .from("Logos")
      .upload(newFileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("Logos")
      .getPublicUrl(newFileName);

    const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setLogoUrl(newLogoUrl);
    toast.success("Logo uploaded");
    return newLogoUrl;
  };

  // Remove handler for ImageUploadModal
  const handleLogoRemove = async (): Promise<void> => {
    setLogoUrl(undefined);
    toast.success("Logo removed");
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        {/* Modal */}
        <div 
          ref={modalRef}
          className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-700 bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-200">Vendor Settings</h2>
                <p className="text-xs text-gray-500">{vendor.vendor_name}</p>
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
            {/* Logo Section - Click to Edit */}
            <div className="flex items-start gap-4">
              {/* Logo - clickable */}
              <div 
                className="relative group cursor-pointer"
                onClick={() => setIsLogoModalOpen(true)}
              >
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden ring-2 flex items-center justify-center transition-all ring-gray-700 hover:ring-gray-600 ${
                  logoUrl ? 'bg-gray-900' : 'bg-gray-700/50'
                }`}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={vendor.vendor_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-semibold text-gray-400">
                      {initials}
                    </span>
                  )}
                  
                  {/* Edit overlay */}
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-6 h-6 text-white mb-1" />
                    <span className="text-xs text-white/80">Click to edit</span>
                  </div>
                </div>
              </div>
              
              {/* Info beside logo */}
              <div className="flex-1 pt-1">
                <h3 className="text-gray-200 font-medium text-lg">{vendor.vendor_name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {vendor.total_invoices} invoice{vendor.total_invoices !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => setIsLogoModalOpen(true)}
                  className="text-sm text-rose-400 hover:text-rose-300 mt-3 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {logoUrl ? 'Change logo' : 'Add logo'}
                </button>
              </div>
            </div>

            {/* Invoice Methods Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-400">Invoice Methods</h4>
                <button
                  onClick={applySmartDefaults}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
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
              <h4 className="text-sm font-medium text-gray-400 mb-2">Default Method</h4>
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
              <h4 className="text-sm font-medium text-gray-400 mb-3">Vendor Details <span className="text-gray-500 font-normal">(Optional)</span></h4>
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
          <div className="flex items-center justify-between p-5 sm:p-6 border-t border-gray-700 bg-gray-800/30">
            {/* Link to Operations for vendor CRUD */}
            <a
              href="/admin/organization/operations#vendors"
              className="min-h-[44px] text-gray-500 hover:text-gray-400 text-xs flex items-center gap-1.5 px-3"
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

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        onUpload={handleLogoUpload}
        onRemove={logoUrl ? handleLogoRemove : undefined}
        currentImageUrl={logoUrl}
        title="Vendor Logo"
        subtitle={vendor.vendor_name}
        aspectHint="Square logos work best"
        placeholderText={initials}
      />
    </>
  );
};
