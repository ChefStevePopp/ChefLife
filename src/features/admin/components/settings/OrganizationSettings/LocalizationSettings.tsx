/**
 * LocalizationSettings - Regional & Format Preferences
 * 
 * L5 Design: 
 * - Gray section icons (structural, not competing)
 * - Consistent typography hierarchy
 * - Focus on form content
 * 
 * Uses constants from @/types/organization for full timezone/currency support
 * Part of Company Settings → Localization Tab
 */

import React from "react";
import { Globe, Calendar, MapPinned } from "lucide-react";
import type { Organization } from "@/types/organization";
import { 
  TIMEZONES, 
  CURRENCIES, 
  DATE_FORMATS, 
  TIME_FORMATS,
  WEEK_START_OPTIONS 
} from "@/types/organization";

interface LocalizationSettingsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const LocalizationSettings: React.FC<LocalizationSettingsProps> = ({
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

  // Group timezones by country for better UX
  const groupedTimezones = TIMEZONES.reduce((acc, tz) => {
    const country = tz.country;
    if (!acc[country]) acc[country] = [];
    acc[country].push(tz);
    return acc;
  }, {} as Record<string, typeof TIMEZONES[number][]>);

  const countryLabels: Record<string, string> = {
    CA: '🇨🇦 Canada',
    US: '🇺🇸 United States',
    UK: '🇬🇧 United Kingdom',
    EU: '🇪🇺 Europe',
    AU: '🇦🇺 Australia',
  };

  return (
    <div className="space-y-6">
      {/* Regional Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Regional Settings</h2>
            <p className="text-sm text-gray-400">Configure timezone and locale preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Default Timezone
            </label>
            <select
              value={organization.settings?.default_timezone || "America/Toronto"}
              onChange={(e) => updateSettings("default_timezone", e.target.value)}
              className="input w-full"
            >
              {Object.entries(groupedTimezones).map(([country, zones]) => (
                <optgroup key={country} label={countryLabels[country] || country}>
                  {zones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Used for scheduling, reports, and timestamps
            </p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Currency
            </label>
            <select
              value={organization.settings?.currency || "CAD"}
              onChange={(e) => updateSettings("currency", e.target.value)}
              className="input w-full"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Used for recipe costing, invoices, and reports
            </p>
          </div>
        </div>
      </div>

      {/* Date & Time Formats */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Date & Time Formats</h2>
            <p className="text-sm text-gray-400">How dates and times are displayed throughout ChefLife</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Date Format
            </label>
            <select
              value={organization.settings?.date_format || "MM/DD/YYYY"}
              onChange={(e) => updateSettings("date_format", e.target.value)}
              className="input w-full"
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Time Format
            </label>
            <select
              value={organization.settings?.time_format || "12h"}
              onChange={(e) => updateSettings("time_format", e.target.value)}
              className="input w-full"
            >
              {TIME_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Week Starts On */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Week Starts On
            </label>
            <select
              value={organization.settings?.week_starts_on?.toString() || "1"}
              onChange={(e) =>
                updateSettings("week_starts_on", parseInt(e.target.value))
              }
              className="input w-full"
            >
              {WEEK_START_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Affects calendar views and weekly reports
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Location Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <MapPinned className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Multi-Location</h2>
            <p className="text-sm text-gray-400">Enable support for multiple locations</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div>
            <p className="text-sm font-medium text-white">Multi-Unit Support</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable if you operate multiple locations that need separate tracking
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={organization.settings?.multi_unit === true}
              onChange={(e) => updateSettings("multi_unit", e.target.checked)}
            />
            <div className="toggle-switch-track" />
          </label>
        </div>

        {organization.settings?.multi_unit && (
          <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-sm text-amber-300">
              <span className="font-medium">Multi-location enabled.</span> You can now add and manage 
              individual locations with their own settings, hours, and team assignments.
              Go to <span className="font-mono text-xs">Admin → Locations</span> to configure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
