/**
 * OrganizationDetails - Business Identity & Contact
 * 
 * L5 Design: 
 * - Gray section icons (structural, not competing)
 * - Consistent typography hierarchy throughout
 * - Focus on form content
 * - Logo uploader for branding (appears in Nexus header)
 * 
 * Part of Company Settings → Organization Tab
 */

import React, { useState } from "react";
import { Building2, Mail, MapPin, Briefcase, ImageIcon, Pencil } from "lucide-react";
import { ImageUploadModal } from "@/shared/components";
import { supabase } from "@/lib/supabase";
import { useOrganizationId } from "@/hooks/useOrganizationId";
import toast from "react-hot-toast";
import type { Organization } from "@/types/organization";

// ChefBot placeholder - shown when no logo uploaded
const CHEFBOT_PLACEHOLDER = "https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png";

interface OrganizationDetailsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({
  organization,
  onChange,
}) => {
  const { organizationId } = useOrganizationId();
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  const updateSettings = (key: string, value: any) => {
    onChange({
      settings: {
        ...organization.settings,
        [key]: value,
      },
    });
  };

  const updateBranding = (key: string, value: any) => {
    onChange({
      settings: {
        ...organization.settings,
        branding: {
          ...organization.settings?.branding,
          [key]: value,
        },
      },
    });
  };

  // Logo upload handler
  const handleLogoUpload = async (file: File): Promise<string> => {
    if (!organizationId) throw new Error("No organization");

    const fileExt = file.name.split(".").pop();
    const baseFileName = `${organizationId}/logo`;
    const newFileName = `${baseFileName}.${fileExt}`;

    // Clean up existing logo files (catch orphaned files)
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    const filesToDelete = extensions.map(ext => `${baseFileName}.${ext}`);
    await supabase.storage.from("Logos").remove(filesToDelete).catch(() => {});

    // Upload new file
    const { error } = await supabase.storage
      .from("Logos")
      .upload(newFileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("Logos")
      .getPublicUrl(newFileName);

    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    updateBranding('logo_url', logoUrl);
    toast.success("Logo uploaded - save to apply");
    return logoUrl;
  };

  // Logo remove handler
  const handleLogoRemove = async (): Promise<void> => {
    updateBranding('logo_url', '');
    toast.success("Logo removed - save to apply");
  };

  // Check if corporate address should mirror location address
  const useSameAddress = organization.settings?.corporate_same_as_location !== false;

  const handleSameAddressToggle = (same: boolean) => {
    if (same) {
      updateSettings('corporate_same_as_location', true);
    } else {
      updateSettings('corporate_same_as_location', false);
    }
  };

  const currentLogo = organization.settings?.branding?.logo_url;
  const initials = organization.name?.substring(0, 2).toUpperCase() || 'CO';

  return (
    <div className="space-y-6">
      {/* Business Logo */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Business Logo</h2>
            <p className="text-sm text-gray-400">Your logo appears in the Nexus dashboard header and printed documents</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div 
            className="relative group cursor-pointer"
            onClick={() => setIsLogoModalOpen(true)}
          >
            <div className="w-24 h-24 rounded-xl overflow-hidden ring-2 ring-gray-600/50 group-hover:ring-primary-500/50 flex items-center justify-center shadow-lg transition-all duration-200 bg-gray-800">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt={`${organization.name} logo`}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <img
                  src={CHEFBOT_PLACEHOLDER}
                  alt="ChefLife placeholder"
                  className="w-full h-full object-contain p-2 opacity-50"
                />
              )}
            </div>
            
            {/* Edit overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Pencil className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Instructions */}
          <div className="flex-1">
            <p className="text-sm text-gray-300 mb-2">
              {currentLogo 
                ? "Click the logo to change or remove it"
                : "Click to upload your restaurant logo"
              }
            </p>
            <p className="text-xs text-gray-500">
              Square logos work best. PNG or SVG with transparent background recommended.
              Your logo will appear in the Nexus dashboard header.
            </p>
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        onUpload={handleLogoUpload}
        onRemove={currentLogo ? handleLogoRemove : undefined}
        currentImageUrl={currentLogo}
        title="Business Logo"
        subtitle={organization.name}
        aspectHint="Square logos work best (PNG or SVG recommended)"
        placeholderText={initials}
      />

      {/* Business Identity */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Business Identity</h2>
            <p className="text-sm text-gray-400">Legal and operating names for your business</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Business Operating Name *
            </label>
            <input
              type="text"
              value={organization.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="input w-full"
              placeholder="Enter business operating name"
            />
            <p className="text-xs text-gray-500 mt-1">
              The name customers know you by
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Business Legal Name
            </label>
            <input
              type="text"
              value={organization.legal_name || ""}
              onChange={(e) => onChange({ legal_name: e.target.value })}
              className="input w-full"
              placeholder="Enter legal business name"
            />
            <p className="text-xs text-gray-500 mt-1">
              As registered with your government
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Tax ID / Business Number
            </label>
            <input
              type="text"
              value={organization.tax_id || ""}
              onChange={(e) => onChange({ tax_id: e.target.value })}
              className="input w-full"
              placeholder="e.g., 123456789 RT0001"
            />
            <p className="text-xs text-gray-500 mt-1">
              CRA Business Number, EIN, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Website
            </label>
            <input
              type="url"
              value={organization.website || ""}
              onChange={(e) => onChange({ website: e.target.value })}
              className="input w-full"
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Contact Information</h2>
            <p className="text-sm text-gray-400">Primary contact details for your organization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Primary Email
            </label>
            <input
              type="email"
              value={organization.contact_email || ""}
              onChange={(e) => onChange({ contact_email: e.target.value })}
              className="input w-full"
              placeholder="info@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Primary Phone
            </label>
            <input
              type="tel"
              value={organization.contact_phone || ""}
              onChange={(e) => onChange({ contact_phone: e.target.value })}
              className="input w-full"
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Accounting Email
            </label>
            <input
              type="email"
              value={organization.settings?.accounting_email || ""}
              onChange={(e) => updateSettings('accounting_email', e.target.value)}
              className="input w-full"
              placeholder="accounting@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              For invoices and financial communications
            </p>
          </div>
        </div>
      </div>

      {/* Corporate Address */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Corporate Address</h2>
            <p className="text-sm text-gray-400">Legal/mailing address for invoices, tax forms, and letterhead</p>
          </div>
        </div>

        {/* Same as Location Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 mb-6">
          <div>
            <p className="text-sm font-medium text-white">Same as Primary Location</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Use the restaurant address for corporate mail
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useSameAddress}
              onChange={(e) => handleSameAddressToggle(e.target.checked)}
            />
            <div className="toggle-switch-track" />
          </label>
        </div>

        {/* Corporate Address Fields - Only show if different */}
        {!useSameAddress && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={organization.settings?.corporate_street || ""}
                onChange={(e) => updateSettings('corporate_street', e.target.value)}
                className="input w-full"
                placeholder="123 Corporate Drive, Suite 100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={organization.settings?.corporate_city || ""}
                  onChange={(e) => updateSettings('corporate_city', e.target.value)}
                  className="input w-full"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Province / State
                  </label>
                  <input
                  type="text"
                  value={organization.settings?.corporate_state || ""}
                  onChange={(e) => updateSettings('corporate_state', e.target.value)}
                  className="input w-full"
                  placeholder="ON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Postal / ZIP Code
                  </label>
                  <input
                  type="text"
                  value={organization.settings?.corporate_postal || ""}
                  onChange={(e) => updateSettings('corporate_postal', e.target.value)}
                  className="input w-full"
                  placeholder="A1A 1A1"
                />
              </div>
            </div>
          </div>
        )}

        {useSameAddress && (
          <p className="text-sm text-gray-500">
            Corporate mail will use your primary location address (below).
          </p>
        )}
      </div>

      {/* Primary Location Address */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Primary Location Address</h2>
            <p className="text-sm text-gray-400">Where you operate — for health dept, deliveries, and Google Business</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={organization.settings?.street_address || ""}
              onChange={(e) => updateSettings('street_address', e.target.value)}
              className="input w-full"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                City
              </label>
              <input
                type="text"
                value={organization.settings?.city || ""}
                onChange={(e) => updateSettings('city', e.target.value)}
                className="input w-full"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Province / State
                </label>
                <input
                type="text"
                value={organization.settings?.state || ""}
                onChange={(e) => updateSettings('state', e.target.value)}
                className="input w-full"
                placeholder="ON"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Postal / ZIP Code
                </label>
                <input
                type="text"
                value={organization.settings?.postal_code || ""}
                onChange={(e) => updateSettings('postal_code', e.target.value)}
                className="input w-full"
                placeholder="A1A 1A1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
