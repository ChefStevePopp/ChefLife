import React, { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Check,
  MoreVertical,
  Trash2,
  Upload,
  Package,
  Settings,
  PenLine,
  Calendar,
  Clock,
  Smartphone,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import { ImageUploadModal } from "@/shared/components";
import toast from "react-hot-toast";

// =============================================================================
// VENDOR CARD - L5 Design
// =============================================================================
// 4 Import Methods (color sequence: primary → green → amber → rose):
//   CSV    = primary (blue) - bulk file import
//   PDF    = green          - document parsing
//   Manual = amber          - desktop entry
//   Mobile = rose           - quick mobile workflow
//
// Icon style matches header: bg-{color}-500/20 + text-{color}-400
// Uses .card class pattern: shadow-xl for depth
// Logo upload via universal ImageUploadModal
// =============================================================================

export interface VendorCardData {
  vendor_id: string;
  vendor_name: string;
  logo_url?: string;
  has_csv_template: boolean;
  has_pdf_template: boolean;
  csv_enabled?: boolean;
  pdf_enabled?: boolean;
  manual_enabled?: boolean;
  mobile_enabled?: boolean;
  default_invoice_type?: "csv" | "pdf" | "manual" | "mobile";
  total_invoices: number;
  last_invoice_date?: string;
  last_upload_date?: string;
  account_number?: string;
  rep_name?: string;
  rep_email?: string;
  rep_phone?: string;
}

export interface VendorCardProps {
  vendor: VendorCardData;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (vendorId: string) => void;
  onSettings?: (vendor: VendorCardData) => void;
  onRemove?: (vendor: VendorCardData) => void;
  onConfigureCSV?: (vendor: VendorCardData) => void;
  onConfigurePDF?: (vendor: VendorCardData) => void;
  onLogoUpdate?: (vendorId: string, logoUrl: string) => void;
  isMenuOpen?: boolean;
  onMenuToggle?: (vendorId: string | null) => void;
}

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  onSettings,
  onRemove,
  onLogoUpdate,
  isMenuOpen = false,
  onMenuToggle,
}) => {
  const { organizationId } = useOrganizationId();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const initials = getInitials(vendor.vendor_name);

  const csvEnabled = vendor.csv_enabled ?? true;
  const pdfEnabled = vendor.pdf_enabled ?? false;
  const manualEnabled = vendor.manual_enabled ?? true;
  const mobileEnabled = vendor.mobile_enabled ?? false;
  const defaultMethod = vendor.default_invoice_type ?? "manual";

  // Upload handler for ImageUploadModal
  const handleUpload = async (file: File): Promise<string> => {
    if (!organizationId) throw new Error("No organization");

    const fileExt = file.name.split(".").pop();
    const baseFileName = `${organizationId}/vendors/${vendor.vendor_id.replace(/\s+/g, '_')}`;
    const newFileName = `${baseFileName}.${fileExt}`;

    // Clean up any existing files for this vendor
    const filesToDelete: string[] = [];
    
    if (vendor.logo_url) {
      try {
        const url = new URL(vendor.logo_url);
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

    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    onLogoUpdate?.(vendor.vendor_id, logoUrl);
    toast.success("Logo uploaded");
    return logoUrl;
  };

  // Remove handler for ImageUploadModal
  const handleRemove = async (): Promise<void> => {
    // Just clear the URL - actual file cleanup can happen later
    onLogoUpdate?.(vendor.vendor_id, "");
    toast.success("Logo removed");
  };

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(vendor.vendor_id);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuToggle?.(isMenuOpen ? null : vendor.vendor_id);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuToggle?.(null);
    onSettings?.(vendor);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuToggle?.(null);
    onRemove?.(vendor);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLogoUpdate) {
      setIsUploadModalOpen(true);
    }
  };

  // ===========================================================================
  // METHOD ICON
  // L5 header style: bg-{color}-500/20 + text-{color}-400
  // Sequence: primary → green → amber → rose
  // ===========================================================================
  const MethodIcon = ({ 
    type, 
    enabled, 
    isDefault, 
  }: { 
    type: 'csv' | 'pdf' | 'manual' | 'mobile';
    enabled: boolean;
    isDefault: boolean;
  }) => {
    const icons = { csv: FileSpreadsheet, pdf: FileText, manual: PenLine, mobile: Smartphone };
    const labels = { csv: 'CSV', pdf: 'PDF', manual: 'Manual', mobile: 'Mobile' };
    
    const Icon = icons[type];
    
    if (!enabled) return null;

    let boxClass = 'bg-gray-700/50';
    let iconClass = 'text-gray-500';
    let labelClass = 'text-gray-500';

    if (isDefault) {
      switch (type) {
        case 'csv':
          boxClass = 'bg-primary-500/20';
          iconClass = 'text-primary-400';
          labelClass = 'text-primary-400';
          break;
        case 'pdf':
          boxClass = 'bg-green-500/20';
          iconClass = 'text-green-400';
          labelClass = 'text-green-400';
          break;
        case 'manual':
          boxClass = 'bg-amber-500/20';
          iconClass = 'text-amber-400';
          labelClass = 'text-amber-400';
          break;
        case 'mobile':
          boxClass = 'bg-rose-500/20';
          iconClass = 'text-rose-400';
          labelClass = 'text-rose-400';
          break;
      }
    }

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div 
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${boxClass}`}
          title={`${labels[type]}${isDefault ? ' (default)' : ''}`}
        >
          <Icon className={`w-4 h-4 ${iconClass}`} />
        </div>
        <span className={`text-[10px] font-medium ${labelClass}`}>
          {labels[type]}
        </span>
      </div>
    );
  };

  // Build configured pills array
  const configuredPills: { label: string }[] = [];
  if (vendor.has_csv_template) configuredPills.push({ label: 'CSV' });
  if (vendor.has_pdf_template) configuredPills.push({ label: 'PDF' });

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`card p-0 overflow-hidden transition-all duration-200 group flex flex-col relative ${
          isSelected 
            ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30' 
            : 'hover:border-gray-600/50'
        } ${selectable ? 'cursor-pointer' : ''}`}
      >
        {/* Selection Checkbox */}
        {selectable && (
          <div 
            className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 z-10 ${
              isSelected 
                ? 'bg-primary-500 border-primary-500' 
                : 'border-gray-600 bg-gray-800/50 group-hover:border-gray-500'
            }`}
          >
            <Check className={`w-3 h-3 text-white transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        {/* =====================================================================
         * HERO SECTION: Avatar + Name (dark zone with shadow)
         * Click avatar to open ImageUploadModal
         * ===================================================================== */}
        <div className="flex flex-col items-center text-center p-5 pb-4 bg-gray-900/50 shadow-lg">
          <div 
            className={`relative group/logo ${onLogoUpdate ? 'cursor-pointer' : ''}`}
            onClick={handleAvatarClick}
          >
            {/* Rounded square icon style - logo fills container */}
            <div className={`w-20 h-20 rounded-xl overflow-hidden ring-2 flex items-center justify-center shadow-lg transition-all duration-200 ${
              isSelected 
                ? 'ring-primary-500/50' 
                : 'ring-gray-600/50 group-hover/logo:ring-primary-500/30'
            } ${vendor.logo_url ? 'bg-gray-900' : 'bg-gray-700/50'}`}>
              {vendor.logo_url ? (
                <img
                  src={vendor.logo_url}
                  alt={`${vendor.vendor_name} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-semibold text-gray-400">
                  {initials}
                </span>
              )}
            </div>
            
            {/* Edit overlay - rounded square */}
            {onLogoUpdate && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <Pencil className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Vendor Name - softer than white */}
          <h3 className="mt-3 text-gray-200 font-semibold text-lg leading-tight">
            {vendor.vendor_name}
          </h3>
        </div>

        {/* =====================================================================
         * SECONDARY: Method Icons
         * ===================================================================== */}
        <div className="flex items-start justify-center gap-3 px-5 pt-4 pb-3">
          <MethodIcon type="csv" enabled={csvEnabled} isDefault={defaultMethod === 'csv'} />
          <MethodIcon type="pdf" enabled={pdfEnabled} isDefault={defaultMethod === 'pdf'} />
          <MethodIcon type="manual" enabled={manualEnabled} isDefault={defaultMethod === 'manual'} />
          <MethodIcon type="mobile" enabled={mobileEnabled} isDefault={defaultMethod === 'mobile'} />
        </div>

        {/* =====================================================================
         * TERTIARY: Quick Look Data
         * ===================================================================== */}
        <div className="px-5 py-3 space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Package className="w-3 h-3" />
            <span>{vendor.total_invoices} invoice{vendor.total_invoices !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>Invoice: {formatDate(vendor.last_invoice_date)}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Upload: {formatDate(vendor.last_upload_date)}</span>
          </div>
        </div>

        {/* =====================================================================
         * FOOTER: Pills + Menu
         * ===================================================================== */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-gray-700/30">
          {/* Configured template pills */}
          <div className="flex items-center gap-1.5">
            {configuredPills.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded"
              >
                <Check className="w-2.5 h-2.5" />
                {pill.label}
              </span>
            ))}
          </div>

          {/* Menu */}
          {(onSettings || onRemove) && (
            <div className="flex items-center">
              <div 
                className={`flex items-center gap-2 mr-2 transition-all duration-200 ease-out ${
                  isMenuOpen 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 translate-x-4 pointer-events-none'
                }`}
              >
                {onRemove && (
                  <button
                    onClick={handleRemoveClick}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
                {onSettings && (
                  <button
                    onClick={handleSettingsClick}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </button>
                )}
              </div>

              <button
                onClick={toggleMenu}
                className={`p-1.5 rounded-lg transition-colors ${
                  isMenuOpen 
                    ? 'text-primary-400 bg-gray-700/50' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                }`}
                aria-label="Vendor actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        onRemove={vendor.logo_url ? handleRemove : undefined}
        currentImageUrl={vendor.logo_url}
        title="Vendor Logo"
        subtitle={vendor.vendor_name}
        aspectHint="Square logos work best"
        placeholderText={initials}
      />
    </>
  );
};
