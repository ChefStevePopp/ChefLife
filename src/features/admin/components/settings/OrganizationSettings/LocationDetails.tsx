/**
 * LocationDetails - Capacity & Operating Hours
 * 
 * L5 Design: 
 * - Gray section icons (structural, not competing)
 * - Consistent typography hierarchy
 * - Focus on form content
 * 
 * Part of Company Settings → Location Tab
 * Note: Physical address is in Organization tab
 */

import React, { useState } from 'react';
import { Users, Clock, Sun } from 'lucide-react';
import type { Organization } from '@/types/organization';
import { OperatingHours } from './OperatingHours';

interface LocationDetailsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const LocationDetails: React.FC<LocationDetailsProps> = ({
  organization,
  onChange
}) => {
  const [activeHoursTab, setActiveHoursTab] = useState<'business' | 'team'>('business');

  const updateSettings = (key: string, value: any) => {
    onChange({
      settings: {
        ...organization.settings,
        [key]: value
      }
    });
  };

  // Calculate total seating
  const barSeating = parseInt(organization.settings?.bar_seating) || 0;
  const diningSeating = parseInt(organization.settings?.dining_room_seating) || 0;
  const patioSeating = parseInt(organization.settings?.patio_seating) || 0;
  const totalSeating = barSeating + diningSeating + patioSeating;

  // Show patio season input if patio seating > 0
  const showPatioSeason = patioSeating > 0;

  return (
    <div className="space-y-6">
      {/* Seating Capacity */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Seating Capacity</h2>
            <p className="text-sm text-gray-400">How many guests can you serve?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Bar Seating
            </label>
            <input
              type="number"
              value={organization.settings?.bar_seating || ''}
              onChange={(e) => updateSettings('bar_seating', parseInt(e.target.value) || 0)}
              className="input w-full"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Dining Room
            </label>
            <input
              type="number"
              value={organization.settings?.dining_room_seating || ''}
              onChange={(e) => updateSettings('dining_room_seating', parseInt(e.target.value) || 0)}
              className="input w-full"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Patio Seating
            </label>
            <input
              type="number"
              value={organization.settings?.patio_seating || ''}
              onChange={(e) => updateSettings('patio_seating', parseInt(e.target.value) || 0)}
              className="input w-full"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        {/* Total Capacity Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <span className="text-sm font-medium text-gray-400">Total Capacity</span>
          <span className="text-xl font-bold text-white">{totalSeating} seats</span>
        </div>
      </div>

      {/* Patio Season - Only show if patio seating exists */}
      {showPatioSeason && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
              <Sun className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Patio Season</h2>
              <p className="text-sm text-gray-400">When is your patio typically open?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Season Duration (weeks)
              </label>
              <input
                type="number"
                value={organization.settings?.patio_season_weeks || ''}
                onChange={(e) => updateSettings('patio_season_weeks', parseInt(e.target.value) || 0)}
                className="input w-full"
                placeholder="24"
                min="0"
                max="52"
              />
              <p className="text-xs text-gray-500 mt-1">
                Approximate weeks per year
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Typical Start Month
              </label>
              <select
                value={organization.settings?.patio_start_month || ''}
                onChange={(e) => updateSettings('patio_start_month', parseInt(e.target.value) || null)}
                className="input w-full"
              >
                <option value="">Select month</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Typical End Month
              </label>
              <select
                value={organization.settings?.patio_end_month || ''}
                onChange={(e) => updateSettings('patio_end_month', parseInt(e.target.value) || null)}
                className="input w-full"
              >
                <option value="">Select month</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Operating Hours */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Operating Hours</h2>
            <p className="text-sm text-gray-400">When are you open for business and staff?</p>
          </div>
        </div>

        {/* Hours Type Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveHoursTab('business')}
            className={`tab amber ${activeHoursTab === 'business' ? 'active' : ''}`}
          >
            <Clock className="w-4 h-4" />
            <span>Business Hours</span>
          </button>
          <button
            onClick={() => setActiveHoursTab('team')}
            className={`tab amber ${activeHoursTab === 'team' ? 'active' : ''}`}
          >
            <Users className="w-4 h-4" />
            <span>Team Hours</span>
          </button>
        </div>

        {/* Hours Description */}
        <div className="bg-gray-800/30 rounded-lg p-3 mb-4 border border-gray-700/30">
          <p className="text-sm text-gray-400">
            {activeHoursTab === 'business' ? (
              <>
                <span className="text-white font-medium">Business Hours:</span> When customers can visit or order. 
                Used for online ordering cutoffs and reservation availability.
              </>
            ) : (
              <>
                <span className="text-white font-medium">Team Hours:</span> When staff can be scheduled. 
                Typically starts before and ends after business hours for prep and cleanup.
              </>
            )}
          </p>
        </div>

        {/* Hours Editor */}
        {activeHoursTab === 'business' ? (
          <OperatingHours
            schedule={organization.settings?.operating_schedule || {}}
            onChange={(schedule) => updateSettings('operating_schedule', schedule)}
          />
        ) : (
          <OperatingHours
            schedule={organization.settings?.team_schedule || {}}
            onChange={(schedule) => updateSettings('team_schedule', schedule)}
          />
        )}
      </div>
    </div>
  );
};
