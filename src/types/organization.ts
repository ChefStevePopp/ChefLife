/**
 * ChefLife Organization Types
 * 
 * Comprehensive type definitions for organization data.
 * Designed for multi-site support from day one.
 * 
 * Architecture:
 * - Organization = parent entity (legal, branding, defaults)
 * - Locations = individual sites (can override or inherit from org)
 * 
 * @see ONBOARDING-PHILOSOPHY.md for setup flow
 * @see ROADMAP.md for feature roadmap
 */

import { OrganizationModules } from './modules';
import { OrganizationIntegrations } from './integrations';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const BUSINESS_TYPES = [
  'full_service_restaurant',
  'quick_service_restaurant',
  'fast_casual',
  'cafe',
  'bar_pub',
  'food_truck',
  'catering',
  'ghost_kitchen',
  'bakery',
  'deli',
  'food_hall',
  'hotel_restaurant',
  'country_club',
  'other',
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

export const CUISINE_TYPES = [
  'American',
  'Italian',
  'Mexican',
  'Asian Fusion',
  'Chinese',
  'Japanese',
  'Korean',
  'Thai',
  'Vietnamese',
  'Indian',
  'Mediterranean',
  'Greek',
  'French',
  'Spanish',
  'BBQ',
  'Steakhouse',
  'Seafood',
  'Pizza',
  'Burger',
  'Southern',
  'Cajun/Creole',
  'Caribbean',
  'Middle Eastern',
  'Vegetarian/Vegan',
  'Farm to Table',
  'Comfort Food',
  'Other',
] as const;

export type CuisineType = typeof CUISINE_TYPES[number];

export const REVENUE_CENTERS = [
  'Dine-In',
  'Take-Out',
  'Delivery',
  'Catering',
  'Private Events',
  'Food Truck',
  'Ghost Kitchen',
  'Retail',
  'Merchandise',
  'Gift Cards',
  'Other',
] as const;

export type RevenueCenter = typeof REVENUE_CENTERS[number];

export const DELIVERY_PROVIDERS = [
  'UberEats',
  'DoorDash',
  'SkipTheDishes',
  'GrubHub',
  'Postmates',
  'Ritual',
  'ChowNow',
  'In-House',
  'Other',
] as const;

export type DeliveryProvider = typeof DELIVERY_PROVIDERS[number];

export const CURRENCIES = [
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

export const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', example: '01/15/2026' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)', example: '15/01/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)', example: '2026-01-15' },
  { value: 'MMM D, YYYY', label: 'Jan 15, 2026', example: 'Jan 15, 2026' },
  { value: 'D MMM YYYY', label: '15 Jan 2026', example: '15 Jan 2026' },
] as const;

export type DateFormat = typeof DATE_FORMATS[number]['value'];

export const TIME_FORMATS = [
  { value: '12h', label: '12-hour (AM/PM)', example: '2:30 PM' },
  { value: '24h', label: '24-hour', example: '14:30' },
] as const;

export type TimeFormat = typeof TIME_FORMATS[number]['value'];

export const TIMEZONES = [
  // Canada
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', country: 'CA' },
  { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)', country: 'CA' },
  { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)', country: 'CA' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', country: 'CA' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax)', country: 'CA' },
  { value: 'America/St_Johns', label: 'Newfoundland Time', country: 'CA' },
  // USA
  { value: 'America/New_York', label: 'Eastern Time (New York)', country: 'US' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', country: 'US' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', country: 'US' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', country: 'US' },
  { value: 'America/Phoenix', label: 'Arizona (No DST)', country: 'US' },
  { value: 'America/Anchorage', label: 'Alaska Time', country: 'US' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time', country: 'US' },
  // Other
  { value: 'Europe/London', label: 'London (GMT/BST)', country: 'UK' },
  { value: 'Europe/Paris', label: 'Paris (CET)', country: 'EU' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', country: 'AU' },
] as const;

export type Timezone = typeof TIMEZONES[number]['value'];

export const WEEK_START_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 6, label: 'Saturday' },
] as const;

export type WeekStartDay = 0 | 1 | 6;

export const PAY_PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'semimonthly', label: 'Semi-Monthly (1st & 15th)' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export type PayPeriod = typeof PAY_PERIODS[number]['value'];

// =============================================================================
// OPERATING HOURS
// =============================================================================

export interface TimeSlot {
  open: string;   // HH:mm format (24h)
  close: string;  // HH:mm format (24h)
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];  // Multiple slots for split shifts (e.g., lunch/dinner)
}

export interface WeeklySchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

// Legacy format support (for migration)
export interface LegacyOperatingHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface LegacyDailySchedule {
  [key: string]: LegacyOperatingHours[];
}

// =============================================================================
// ADDRESS
// =============================================================================

export interface Address {
  street_line_1: string;
  street_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;  // ISO 3166-1 alpha-2 (CA, US, etc.)
  /** Formatted full address for display */
  formatted?: string;
  /** Latitude for mapping */
  latitude?: number;
  /** Longitude for mapping */
  longitude?: number;
}

// =============================================================================
// HEALTH & COMPLIANCE
// =============================================================================

export interface HealthCertificate {
  number?: string;
  expiry_date?: string;  // YYYY-MM-DD
  image_url?: string;
  last_updated?: string;  // ISO timestamp
}

export interface HealthInspection {
  date: string;  // YYYY-MM-DD
  inspector_name?: string;
  score?: number;
  grade?: string;  // A, B, C, etc.
  notes?: string;
  report_url?: string;
}

export interface HealthCompliance {
  certificate?: HealthCertificate;
  inspections: HealthInspection[];
  next_inspection_due?: string;  // YYYY-MM-DD
}

export interface LicensePermit {
  type: string;  // 'liquor', 'food_service', 'business', 'patio', etc.
  number?: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  status: 'active' | 'expired' | 'pending' | 'suspended';
  document_url?: string;
}

// =============================================================================
// SEATING & CAPACITY
// =============================================================================

export interface SeatingCapacity {
  dining_room: number;
  bar: number;
  patio: number;
  private_dining: number;
  /** Calculated total */
  total?: number;
}

export interface PatioSeason {
  /** Number of weeks patio is typically open */
  weeks_per_year: number;
  /** Typical start month (1-12) */
  start_month?: number;
  /** Typical end month (1-12) */
  end_month?: number;
}

// =============================================================================
// FINANCIAL SETTINGS
// =============================================================================

export interface FinancialSettings {
  /** Fiscal year start month (1-12), default 1 = January */
  fiscal_year_start_month: number;
  /** Target food cost percentage */
  target_food_cost_percent?: number;
  /** Target labor cost percentage */
  target_labor_cost_percent?: number;
  /** Target prime cost percentage (food + labor) */
  target_prime_cost_percent?: number;
  /** Default tip-out percentage */
  default_tip_out_percent?: number;
  /** Pay period type */
  pay_period: PayPeriod;
  /** Pay period anchor date (YYYY-MM-DD) - the start of a pay period */
  pay_period_anchor?: string;
}

// =============================================================================
// BRANDING & ASSETS
// =============================================================================

export interface BrandingAssets {
  /** Primary logo URL (for headers, reports) */
  logo_url?: string;
  /** Square logo/icon URL (for favicons, app icons) */
  icon_url?: string;
  /** Primary brand color (hex) */
  primary_color?: string;
  /** Secondary brand color (hex) */
  secondary_color?: string;
  /** Background image URL (for menus, reports) */
  background_url?: string;
}

// =============================================================================
// CONTACT INFORMATION
// =============================================================================

export interface ContactInfo {
  /** Primary contact email */
  email?: string;
  /** Primary phone number */
  phone?: string;
  /** Accounting/billing email */
  accounting_email?: string;
  /** Emergency contact number */
  emergency_phone?: string;
  /** Website URL */
  website?: string;
  /** Social media handles */
  social?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    yelp?: string;
    google_business?: string;
  };
}

// =============================================================================
// ONBOARDING & SETUP TRACKING
// =============================================================================

export interface OnboardingProgress {
  /** Has completed initial setup wizard */
  completed: boolean;
  /** Timestamp of completion */
  completed_at?: string;
  /** Individual step completion */
  steps: {
    organization: boolean;
    industry: boolean;
    location: boolean;
    localization: boolean;
    operations: boolean;
    first_team_member: boolean;
  };
  /** When each step was completed */
  step_timestamps?: {
    [key: string]: string;
  };
}

// =============================================================================
// ORGANIZATION SETTINGS (JSONB in database)
// =============================================================================

export interface OrganizationSettings {
  // === Identity ===
  /** Business type/segment */
  business_type: BusinessType;
  /** Cuisine types (can be multiple) */
  cuisine_types: CuisineType[];
  /** Custom cuisine type if 'Other' selected */
  cuisine_types_other?: string;
  
  // === Revenue ===
  /** Revenue centers (can be multiple) */
  revenue_centers: RevenueCenter[];
  /** Custom revenue center if 'Other' selected */
  revenue_centers_other?: string;
  /** Primary revenue center */
  primary_revenue_center?: RevenueCenter;
  /** Delivery providers if delivery enabled */
  delivery_providers?: DeliveryProvider[];
  /** Custom delivery provider if 'Other' selected */
  delivery_providers_other?: string;
  
  // === Location ===
  /** Primary address (for single-site or HQ) */
  address?: Address;
  /** Seating capacity */
  seating?: SeatingCapacity;
  /** Patio season details */
  patio_season?: PatioSeason;
  
  // === Hours ===
  /** Business hours (customer-facing) */
  business_hours?: WeeklySchedule;
  /** Team hours (when staff can work) */
  team_hours?: WeeklySchedule;
  /** Legacy format support */
  operating_schedule?: LegacyDailySchedule;
  team_schedule?: LegacyDailySchedule;
  
  // === Localization ===
  /** Default timezone (IANA format) */
  default_timezone: Timezone;
  /** Currency code */
  currency: CurrencyCode;
  /** Date display format */
  date_format: DateFormat;
  /** Time display format */
  time_format: TimeFormat;
  /** Week starts on (0=Sun, 1=Mon, 6=Sat) */
  week_starts_on: WeekStartDay;
  
  // === Financial ===
  financial?: FinancialSettings;
  
  // === Compliance ===
  health?: HealthCompliance;
  licenses?: LicensePermit[];
  
  // === Branding ===
  branding?: BrandingAssets;
  
  // === Contact ===
  contact?: ContactInfo;
  
  // === Multi-Site ===
  /** Whether this org has multiple locations */
  multi_unit: boolean;
  
  // === Onboarding ===
  onboarding?: OnboardingProgress;
  
  // === Corporate Address ===
  /** Whether corporate address is same as primary location */
  corporate_same_as_location?: boolean;
  /** Corporate/mailing street address */
  corporate_street?: string;
  /** Corporate city */
  corporate_city?: string;
  /** Corporate state/province */
  corporate_state?: string;
  /** Corporate postal code */
  corporate_postal?: string;
  
  // === Legacy fields (for backwards compatibility) ===
  /** @deprecated Use address.street_line_1 */
  street_address?: string;
  /** @deprecated Use address.city */
  city?: string;
  /** @deprecated Use address.state_province */
  state?: string;
  /** @deprecated Use address.postal_code */
  postal_code?: string;
  /** @deprecated Use seating.bar */
  bar_seating?: number;
  /** @deprecated Use seating.dining_room */
  dining_room_seating?: number;
  /** @deprecated Use seating.patio */
  patio_seating?: number;
  /** @deprecated Use patio_season.weeks_per_year */
  patio_season_weeks?: number;
  /** @deprecated Use contact.accounting_email */
  accounting_email?: string;
  /** @deprecated Use business_type */
  industry_segment?: string;
  /** @deprecated Use business_type */
  industry_segment_other?: string;
}

// =============================================================================
// ORGANIZATION (Main Entity)
// =============================================================================

export interface Organization {
  id: string;
  
  // === Identity ===
  /** Business operating name */
  name: string;
  /** Legal registered name */
  legal_name?: string;
  /** Tax ID / Business Number */
  tax_id?: string;
  
  // === Contact (top-level for quick access) ===
  /** Primary contact email */
  contact_email?: string;
  /** Primary phone */
  contact_phone?: string;
  /** Website */
  website?: string;
  
  // === Ownership ===
  /** User ID of organization owner */
  owner_id?: string;
  
  // === Configuration ===
  /** All organization settings */
  settings: OrganizationSettings;
  
  // === Modules ===
  /** Feature modules with security permissions */
  modules?: OrganizationModules;
  
  // === Integrations ===
  /** External service integrations */
  integrations?: OrganizationIntegrations;
  
  // === Metadata ===
  created_at: string;
  updated_at: string;
}

// =============================================================================
// LOCATION (For Multi-Site)
// =============================================================================

export interface LocationSettings {
  /** Override business hours (null = use org default) */
  business_hours?: WeeklySchedule | null;
  /** Override team hours (null = use org default) */
  team_hours?: WeeklySchedule | null;
  /** Override seating capacity */
  seating?: SeatingCapacity | null;
  /** Override patio season */
  patio_season?: PatioSeason | null;
  /** Location-specific timezone (null = use org default) */
  timezone?: Timezone | null;
  /** Location-specific financial targets */
  financial?: Partial<FinancialSettings> | null;
  /** Location-specific health compliance */
  health?: HealthCompliance | null;
  /** Location-specific licenses */
  licenses?: LicensePermit[] | null;
  
  // === Integration Overrides ===
  /** POS system for this location */
  pos_system?: string;
  /** Scheduling system for this location */
  scheduling_system?: string;
  /** Inventory system for this location */
  inventory_system?: string;
}

export interface LocationModuleOverrides {
  /** Module-specific overrides for this location */
  [moduleId: string]: {
    /** Override enabled state (null = use org default) */
    enabled?: boolean | null;
    /** Override config (merged with org default) */
    config?: Record<string, unknown>;
  };
}

export interface Location {
  id: string;
  organization_id: string;
  
  // === Identity ===
  /** Location name (e.g., "Downtown", "Airport Location") */
  name: string;
  /** Location code (e.g., "DT01", "APT") */
  code?: string;
  /** Whether this is the primary/flagship location */
  is_primary: boolean;
  /** Whether this location is active */
  is_active: boolean;
  
  // === Address ===
  address: Address;
  
  // === Contact ===
  phone?: string;
  email?: string;
  /** General manager for this location */
  manager_id?: string;
  
  // === Settings (overrides org defaults) ===
  settings: LocationSettings;
  
  // === Module Overrides ===
  module_overrides?: LocationModuleOverrides;
  
  // === Metadata ===
  created_at: string;
  updated_at: string;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  business_type: 'full_service_restaurant',
  cuisine_types: [],
  revenue_centers: ['Dine-In'],
  default_timezone: 'America/Toronto',
  currency: 'CAD',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  week_starts_on: 1,  // Monday
  multi_unit: false,
  financial: {
    fiscal_year_start_month: 1,
    pay_period: 'biweekly',
  },
  onboarding: {
    completed: false,
    steps: {
      organization: false,
      industry: false,
      location: false,
      localization: false,
      operations: false,
      first_team_member: false,
    },
  },
};

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  sunday: { closed: true, slots: [] },
  monday: { closed: false, slots: [{ open: '11:00', close: '22:00' }] },
  tuesday: { closed: false, slots: [{ open: '11:00', close: '22:00' }] },
  wednesday: { closed: false, slots: [{ open: '11:00', close: '22:00' }] },
  thursday: { closed: false, slots: [{ open: '11:00', close: '22:00' }] },
  friday: { closed: false, slots: [{ open: '11:00', close: '23:00' }] },
  saturday: { closed: false, slots: [{ open: '11:00', close: '23:00' }] },
};

// =============================================================================
// TYPE GUARDS & UTILITIES
// =============================================================================

/** Check if organization has multi-site enabled */
export const isMultiSite = (org: Organization): boolean => {
  return org.settings?.multi_unit === true;
};

/** Get effective timezone for a location (falls back to org default) */
export const getEffectiveTimezone = (org: Organization, location?: Location): Timezone => {
  return location?.settings?.timezone ?? org.settings.default_timezone ?? 'America/Toronto';
};

/** Get effective currency for a location (falls back to org default) */
export const getEffectiveCurrency = (org: Organization, location?: Location): CurrencyCode => {
  return org.settings.currency ?? 'CAD';
};

/** Calculate total seating capacity */
export const getTotalSeating = (seating?: SeatingCapacity): number => {
  if (!seating) return 0;
  return (seating.dining_room || 0) + (seating.bar || 0) + (seating.patio || 0) + (seating.private_dining || 0);
};

/** Check if onboarding is complete */
export const isOnboardingComplete = (org: Organization): boolean => {
  return org.settings?.onboarding?.completed === true;
};

/** Get onboarding progress percentage */
export const getOnboardingProgress = (org: Organization): number => {
  const steps = org.settings?.onboarding?.steps;
  if (!steps) return 0;
  const completed = Object.values(steps).filter(Boolean).length;
  const total = Object.keys(steps).length;
  return Math.round((completed / total) * 100);
};
