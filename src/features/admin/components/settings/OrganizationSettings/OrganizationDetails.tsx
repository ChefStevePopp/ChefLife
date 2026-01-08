/**
 * OrganizationDetails - Business Identity & Contact
 * 
 * L5 Design: 
 * - Gray section icons (structural, not competing)
 * - Consistent typography hierarchy throughout
 * - Focus on form content
 * 
 * Part of Company Settings → Organization Tab
 */

import React from "react";
import { Building2, Mail, MapPin, Briefcase } from "lucide-react";
import type { Organization } from "@/types/organization";

interface OrganizationDetailsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({
  organization,
  onChange,
}) => {
  const updateSettings = (key: string, value: any) => {
    onChange({
      settings: {
        ...organization.settings,
        [key]: value,
      },
    });
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

  return (
    <div className="space-y-6">
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
