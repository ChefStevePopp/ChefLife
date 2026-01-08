/**
 * Organization Settings Constants
 * 
 * Re-exports from @/types/organization for backwards compatibility.
 * New code should import directly from @/types/organization.
 * 
 * @deprecated Import from @/types/organization instead
 */

export { 
  BUSINESS_TYPES,
  CUISINE_TYPES, 
  REVENUE_CENTERS, 
  DELIVERY_PROVIDERS,
  CURRENCIES,
  DATE_FORMATS,
  TIME_FORMATS,
  TIMEZONES,
  WEEK_START_OPTIONS,
  PAY_PERIODS,
} from '@/types/organization';

// Legacy exports for existing code
export const INDUSTRY_SEGMENTS = [
  'Full Service Restaurant',
  'Quick Service Restaurant',
  'Fast Casual',
  'Cafe',
  'Bar/Pub',
  'Food Truck',
  'Catering',
  'Ghost Kitchen',
  'Other'
] as const;
