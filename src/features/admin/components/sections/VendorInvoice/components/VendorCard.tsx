import React, { useState, useRef } from "react";
import {
  Building2,
  FileSpreadsheet,
  FileText,
  Check,
  MoreVertical,
  Trash2,
  Upload,
  Settings,
  Calendar,
  Package,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import toast from "react-hot-toast";

// =============================================================================
// VENDOR CARD - L5 Design
// =============================================================================
// Matches TeamList card pattern for visual consistency:
// - Logo (like avatar)
// - Name prominently displayed
// - Type badges (CSV, PDF, Photo)
// - Stats (imports, last import)
// - 3-dot action menu
// =============================================================================

export interface VendorConfig {
  vendor_id: string;
  vendor_name: string;
  logo_url?: string;
  supported_types: ("csv" | "pdf" | "photo")[];
  has_csv_template: boolean;
  has_pdf_template: boolean;
  total_imports: number;
  last_import?: string;
}

interface VendorCardProps {
  vendor: VendorConfig;
  isSelected?: boolean;
  onSelect?: () => void;
  onConfigureCSV?: () => void;
  onConfigurePDF?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onLogoUpdate?: (logoUrl: string) => void;
}

// Type badge colors - consistent with Import History
const TYPE_COLORS = {
  csv: {
    configured: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    unconfigured: "bg-gray-500/10 text-gray-500 border-gray-600/30",
  },
  pdf: {
    configured: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    unconfigured: "bg-gray-500/10 text-gray-500 border-gray-600/30",
  },
  photo: {
    configured: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    unconfigured: "bg-gray-500/10 text-gray-500 border-gray-600/30",
  },
};

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  isSelected = false,
  onSelect,
  onConfigureCSV,
  onConfigurePDF,
  onEdit,
  onRemove,
  onLogoUpdate,
}) => {
  const { organizationId } = useOrganizationId();
  const [openMenu, setOpenMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${organizationId}/vendors/${vendor.vendor_id}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      onLogoUpdate?.(logoUrl);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(!openMenu);
  };

  return (
    <div
      onClick={onSelect}
      className={`
        bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 
        group flex flex-col relative
        ${isSelected
          ? "border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30 scale-[1.02]"
          : "border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:scale-[1.01]"
        }
        ${onSelect ? "cursor-pointer" : ""}
      `}
    >
      {/* Selection indicator */}
      {onSelect && (
        <div
          className={`
            absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center 
            transition-all duration-200
            ${isSelected
              ? "bg-primary-500 border-primary-500 scale-110"
              : "border-gray-600 bg-gray-800/50 group-hover:border-gray-500"
            }
          `}
        >
          <Check
            className={`w-3 h-3 text-white transition-all duration-200 ${
              isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
          />
        </div>
      )}

      {/* Vertical Stack Layout - matching TeamList */}
      <div className="flex flex-col items-center text-center gap-3 flex-1">
        {/* Logo - Larger and centered (like avatar) */}
        <div className="relative group/logo">
          <div
            className={`
              w-16 h-16 rounded-xl bg-gray-700 overflow-hidden ring-2 transition-all
              flex items-center justify-center
              ${isSelected
                ? "ring-primary-500/50"
                : "ring-gray-700/50 group-hover:ring-primary-500/30"
              }
            `}
          >
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={`${vendor.vendor_name} logo`}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Building2 className="w-8 h-8 text-gray-500" />
            )}
            
            {/* Upload overlay */}
            {onLogoUpdate && (
              <div
                className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 
                           transition-opacity flex items-center justify-center cursor-pointer rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-white" />
                )}
              </div>
            )}
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          
          {/* Config indicator - like active dot on TeamList */}
          {(vendor.has_csv_template || vendor.has_pdf_template) && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Vendor Name */}
        <div className="text-white font-medium text-base leading-tight">
          {vendor.vendor_name}
        </div>

        {/* Type Badges - like role badge */}
        <div className="h-7 flex items-center gap-2">
          {/* CSV Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigureCSV?.();
            }}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium 
              border transition-all hover:scale-105
              ${vendor.has_csv_template
                ? TYPE_COLORS.csv.configured
                : TYPE_COLORS.csv.unconfigured
              }
            `}
            title={vendor.has_csv_template ? "CSV configured - click to edit" : "Click to configure CSV"}
          >
            <FileSpreadsheet className="w-3 h-3" />
            CSV
            {vendor.has_csv_template && <Check className="w-2.5 h-2.5" />}
          </button>

          {/* PDF Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigurePDF?.();
            }}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium 
              border transition-all hover:scale-105
              ${vendor.has_pdf_template
                ? TYPE_COLORS.pdf.configured
                : TYPE_COLORS.pdf.unconfigured
              }
            `}
            title={vendor.has_pdf_template ? "PDF configured - click to edit" : "Click to configure PDF"}
          >
            <FileText className="w-3 h-3" />
            PDF
            {vendor.has_pdf_template && <Check className="w-2.5 h-2.5" />}
          </button>
        </div>

        {/* Stats - like department pills */}
        <div className="h-6 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Package className="w-3 h-3" />
            <span>{vendor.total_imports} imports</span>
          </div>
          {vendor.last_import && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(vendor.last_import).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer section - always at bottom */}
      <div className="mt-auto pt-3 border-t border-gray-700/30">
        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400 min-h-[24px]">
          {vendor.has_csv_template && (
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3 text-blue-400" />
              Ready
            </span>
          )}
          {vendor.has_pdf_template && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-purple-400" />
              Ready
            </span>
          )}
          {!vendor.has_csv_template && !vendor.has_pdf_template && (
            <span className="text-gray-600">No templates configured</span>
          )}
        </div>

        {/* 3-dot Menu */}
        <div ref={menuRef} className="relative flex justify-end pt-2">
          {/* Animated Menu - slides in horizontally from right */}
          <div
            className={`
              flex items-center gap-2 mr-2 transition-all duration-200 ease-out
              ${openMenu
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4 pointer-events-none"
              }
            `}
          >
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  onRemove();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium 
                         text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg 
                         border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  onEdit();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium 
                         text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg 
                         border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            )}
          </div>

          <button
            onClick={toggleMenu}
            className={`
              p-1.5 rounded-lg transition-colors
              ${openMenu
                ? "text-primary-400 bg-gray-700/50"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
              }
            `}
            aria-label="Vendor actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
