import { OrganizationModules } from './modules';
import { OrganizationIntegrations } from './integrations';

export interface OperatingHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface DailySchedule {
  [key: string]: OperatingHours[];
}

export interface OrganizationSettings {
  business_type:
    | "restaurant"
    | "cafe"
    | "bar"
    | "food_truck"
    | "catering"
    | "other";
  cuisine_type?: string;
  default_timezone: string;
  multi_unit: boolean;
  currency?: string;
  date_format?: string;
  time_format?: string;
  operating_schedule?: DailySchedule;
  weekStartsOn?: 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday
}

export interface HealthInspections {
  certificate?: {
    number?: string | null;
    expiry_date?: string | null;
    image_url?: string | null;
    last_updated?: string | null;
  };
  visits?: Array<{
    date: string;
    inspector: string;
    score?: number;
    notes?: string;
  }>;
  notifications?: string[];
}

export interface Organization {
  id: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  owner_id?: string;
  settings: OrganizationSettings;
  health_inspections?: HealthInspections;
  /** Feature modules with security permissions */
  modules?: OrganizationModules;
  /** External service integrations */
  integrations?: OrganizationIntegrations;
  created_at: string;
  updated_at: string;
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
  name: string;
  address: string;
  formatted_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_primary: boolean;
  settings: {
    pos_system?: string;
    scheduling_system?: string;
    inventory_system?: string;
    operating_schedule?: DailySchedule;
    [key: string]: any;
  };
  /** Module overrides for multi-unit flexibility */
  module_overrides?: LocationModuleOverrides;
  created_at: string;
  updated_at: string;
}
