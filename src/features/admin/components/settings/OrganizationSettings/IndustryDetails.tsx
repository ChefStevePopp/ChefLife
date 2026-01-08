/**
 * IndustryDetails - Business Classification & Revenue
 * 
 * L5 Design: 
 * - Gray section icons (structural, not competing)
 * - Checkbox groups with clean layout
 * - Focus on form content
 * 
 * Part of Company Settings → Industry Tab
 */

import React from 'react';
import { Store, Utensils, DollarSign, Truck } from 'lucide-react';
import type { Organization } from '@/types/organization';
import { 
  BUSINESS_TYPES,
  CUISINE_TYPES, 
  REVENUE_CENTERS, 
  DELIVERY_PROVIDERS 
} from '@/types/organization';

// Display labels for business types
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  full_service_restaurant: 'Full Service Restaurant',
  quick_service_restaurant: 'Quick Service Restaurant',
  fast_casual: 'Fast Casual',
  cafe: 'Café / Coffee Shop',
  bar_pub: 'Bar / Pub',
  food_truck: 'Food Truck',
  catering: 'Catering',
  ghost_kitchen: 'Ghost Kitchen',
  bakery: 'Bakery',
  deli: 'Deli / Sandwich Shop',
  food_hall: 'Food Hall Vendor',
  hotel_restaurant: 'Hotel Restaurant',
  country_club: 'Country Club / Private Club',
  other: 'Other',
};

interface IndustryDetailsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

export const IndustryDetails: React.FC<IndustryDetailsProps> = ({
  organization,
  onChange
}) => {
  const updateSettings = (key: string, value: any) => {
    onChange({
      settings: {
        ...organization.settings,
        [key]: value
      }
    });
  };

  const handleArrayToggle = (key: string, item: string, checked: boolean) => {
    const currentItems = organization.settings?.[key] || [];
    const updatedItems = checked
      ? [...currentItems, item]
      : currentItems.filter((i: string) => i !== item);
    updateSettings(key, updatedItems);
  };

  const revenueCenters = organization.settings?.revenue_centers || [];
  const hasDelivery = revenueCenters.includes('Delivery');

  return (
    <div className="space-y-6">
      {/* Business Type */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Business Type</h2>
            <p className="text-sm text-gray-400">What type of food service operation are you?</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Industry Segment
          </label>
          <select
            value={organization.settings?.business_type || 'full_service_restaurant'}
            onChange={(e) => updateSettings('business_type', e.target.value)}
            className="input w-full max-w-md"
          >
            {BUSINESS_TYPES.map(type => (
              <option key={type} value={type}>
                {BUSINESS_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
          
          {organization.settings?.business_type === 'other' && (
            <input
              type="text"
              value={organization.settings?.business_type_other || ''}
              onChange={(e) => updateSettings('business_type_other', e.target.value)}
              className="input w-full max-w-md mt-3"
              placeholder="Describe your business type"
            />
          )}
        </div>
      </div>

      {/* Cuisine Types */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <Utensils className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Cuisine Type(s)</h2>
            <p className="text-sm text-gray-400">Select all that apply to your menu</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CUISINE_TYPES.map(cuisine => (
            <label 
              key={cuisine} 
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(organization.settings?.cuisine_types || []).includes(cuisine)}
                onChange={(e) => handleArrayToggle('cuisine_types', cuisine, e.target.checked)}
                className="form-checkbox rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500/20"
              />
              <span className="text-sm text-gray-300">{cuisine}</span>
            </label>
          ))}
        </div>
        
        {(organization.settings?.cuisine_types || []).includes('Other') && (
          <input
            type="text"
            value={organization.settings?.cuisine_types_other || ''}
            onChange={(e) => updateSettings('cuisine_types_other', e.target.value)}
            className="input w-full max-w-md mt-4"
            placeholder="Describe your cuisine type"
          />
        )}
      </div>

      {/* Revenue Centers */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Revenue Centers</h2>
            <p className="text-sm text-gray-400">How do customers order from you?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {REVENUE_CENTERS.map(center => (
            <label 
              key={center} 
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={revenueCenters.includes(center)}
                onChange={(e) => handleArrayToggle('revenue_centers', center, e.target.checked)}
                className="form-checkbox rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500/20"
              />
              <span className="text-sm text-gray-300">{center}</span>
            </label>
          ))}
        </div>

        {revenueCenters.includes('Other') && (
          <input
            type="text"
            value={organization.settings?.revenue_centers_other || ''}
            onChange={(e) => updateSettings('revenue_centers_other', e.target.value)}
            className="input w-full max-w-md mb-4"
            placeholder="Describe other revenue center"
          />
        )}

        {/* Primary Revenue Center */}
        {revenueCenters.length > 1 && (
          <div className="pt-4 border-t border-gray-700/50">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Primary Revenue Center
            </label>
            <select
              value={organization.settings?.primary_revenue_center || ''}
              onChange={(e) => updateSettings('primary_revenue_center', e.target.value)}
              className="input w-full max-w-md"
            >
              <option value="">Select primary revenue source</option>
              {revenueCenters.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Where does most of your revenue come from?
            </p>
          </div>
        )}
      </div>

      {/* Delivery Providers - Only show if Delivery is selected */}
      {hasDelivery && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Delivery Providers</h2>
              <p className="text-sm text-gray-400">Which delivery services do you use?</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {DELIVERY_PROVIDERS.map(provider => (
              <label 
                key={provider} 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(organization.settings?.delivery_providers || []).includes(provider)}
                  onChange={(e) => handleArrayToggle('delivery_providers', provider, e.target.checked)}
                  className="form-checkbox rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500/20"
                />
                <span className="text-sm text-gray-300">{provider}</span>
              </label>
            ))}
          </div>
          
          {(organization.settings?.delivery_providers || []).includes('Other') && (
            <input
              type="text"
              value={organization.settings?.delivery_providers_other || ''}
              onChange={(e) => updateSettings('delivery_providers_other', e.target.value)}
              className="input w-full max-w-md mt-4"
              placeholder="Enter delivery provider name"
            />
          )}
        </div>
      )}
    </div>
  );
};
