/**
 * Organization Store
 * 
 * Global state management for organization data.
 * Provides typed access to organization settings across the app.
 * 
 * Usage:
 *   const { organization, settings, timezone } = useOrganizationStore();
 *   const currency = useOrganizationStore(state => state.settings?.currency);
 * 
 * @see types/organization.ts for type definitions
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { 
  Organization, 
  OrganizationSettings, 
  Location,
  Timezone,
  CurrencyCode,
  WeekStartDay,
} from '@/types/organization';
import { DEFAULT_ORGANIZATION_SETTINGS } from '@/types/organization';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface OrganizationStore {
  // === State ===
  organization: Organization | null;
  locations: Location[];
  activeLocationId: string | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: string | null;
  
  // === Computed (for convenience) ===
  /** Quick access to settings */
  settings: OrganizationSettings | null;
  /** Organization name */
  name: string;
  /** Effective timezone (from active location or org) */
  timezone: Timezone;
  /** Currency code */
  currency: CurrencyCode;
  /** Week start day */
  weekStartsOn: WeekStartDay;
  /** Is multi-site enabled */
  isMultiSite: boolean;
  /** Is onboarding complete */
  isOnboardingComplete: boolean;
  
  // === Actions ===
  fetchOrganization: (orgId: string) => Promise<void>;
  fetchLocations: (orgId: string) => Promise<void>;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
  updateSettings: (updates: Partial<OrganizationSettings>) => Promise<void>;
  setActiveLocation: (locationId: string | null) => void;
  reset: () => void;
  
  // === Selectors ===
  getActiveLocation: () => Location | null;
  getLocationById: (id: string) => Location | null;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_TIMEZONE: Timezone = 'America/Toronto';
const DEFAULT_CURRENCY: CurrencyCode = 'CAD';
const DEFAULT_WEEK_START: WeekStartDay = 1;

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useOrganizationStore = create<OrganizationStore>((set, get) => ({
  // === Initial State ===
  organization: null,
  locations: [],
  activeLocationId: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  
  // === Computed Getters ===
  get settings() {
    return get().organization?.settings ?? null;
  },
  
  get name() {
    return get().organization?.name ?? '';
  },
  
  get timezone() {
    const state = get();
    const activeLocation = state.getActiveLocation();
    return activeLocation?.settings?.timezone 
      ?? state.organization?.settings?.default_timezone 
      ?? DEFAULT_TIMEZONE;
  },
  
  get currency() {
    return get().organization?.settings?.currency ?? DEFAULT_CURRENCY;
  },
  
  get weekStartsOn() {
    return get().organization?.settings?.week_starts_on ?? DEFAULT_WEEK_START;
  },
  
  get isMultiSite() {
    return get().organization?.settings?.multi_unit === true;
  },
  
  get isOnboardingComplete() {
    return get().organization?.settings?.onboarding?.completed === true;
  },
  
  // === Actions ===
  
  fetchOrganization: async (orgId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (error) throw error;
      
      // Ensure settings has all required fields with defaults
      const organization: Organization = {
        ...data,
        settings: {
          ...DEFAULT_ORGANIZATION_SETTINGS,
          ...data.settings,
        },
      };
      
      set({ 
        organization,
        isLoading: false,
        lastFetched: new Date().toISOString(),
      });
      
      // Also fetch locations if multi-site
      if (organization.settings.multi_unit) {
        get().fetchLocations(orgId);
      }
      
    } catch (error) {
      console.error('[OrganizationStore] Error fetching organization:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load organization',
        isLoading: false,
      });
    }
  },
  
  fetchLocations: async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_locations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      set({ locations: data || [] });
      
      // Auto-select primary location if none selected
      const state = get();
      if (!state.activeLocationId && data?.length) {
        const primary = data.find(l => l.is_primary) || data[0];
        set({ activeLocationId: primary.id });
      }
      
    } catch (error) {
      console.error('[OrganizationStore] Error fetching locations:', error);
      // Don't set error state - locations are optional
    }
  },
  
  updateOrganization: async (updates: Partial<Organization>) => {
    const { organization } = get();
    if (!organization) return;
    
    try {
      set({ isLoading: true, error: null });
      
      const updatedOrg = {
        ...organization,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('organizations')
        .update(updatedOrg)
        .eq('id', organization.id);
      
      if (error) throw error;
      
      set({ 
        organization: updatedOrg,
        isLoading: false,
      });
      
    } catch (error) {
      console.error('[OrganizationStore] Error updating organization:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update organization',
        isLoading: false,
      });
      throw error;
    }
  },
  
  updateSettings: async (updates: Partial<OrganizationSettings>) => {
    const { organization } = get();
    if (!organization) return;
    
    const updatedSettings = {
      ...organization.settings,
      ...updates,
    };
    
    await get().updateOrganization({ settings: updatedSettings });
  },
  
  setActiveLocation: (locationId: string | null) => {
    set({ activeLocationId: locationId });
  },
  
  reset: () => {
    set({
      organization: null,
      locations: [],
      activeLocationId: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    });
  },
  
  // === Selectors ===
  
  getActiveLocation: () => {
    const state = get();
    if (!state.activeLocationId) return null;
    return state.locations.find(l => l.id === state.activeLocationId) ?? null;
  },
  
  getLocationById: (id: string) => {
    return get().locations.find(l => l.id === id) ?? null;
  },
}));

// =============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// =============================================================================

/** Get just the organization name */
export const useOrganizationName = () => 
  useOrganizationStore(state => state.organization?.name ?? '');

/** Get just the timezone */
export const useOrganizationTimezone = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.default_timezone ?? DEFAULT_TIMEZONE
  );

/** Get just the currency */
export const useOrganizationCurrency = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.currency ?? DEFAULT_CURRENCY
  );

/** Get just the date format */
export const useOrganizationDateFormat = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.date_format ?? 'MM/DD/YYYY'
  );

/** Get just the time format */
export const useOrganizationTimeFormat = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.time_format ?? '12h'
  );

/** Get business type */
export const useBusinessType = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.business_type ?? 'full_service_restaurant'
  );

/** Check if multi-site */
export const useIsMultiSite = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.multi_unit === true
  );

/** Get onboarding status */
export const useOnboardingStatus = () => 
  useOrganizationStore(state => ({
    completed: state.organization?.settings?.onboarding?.completed ?? false,
    steps: state.organization?.settings?.onboarding?.steps ?? {},
  }));

/** Get financial settings */
export const useFinancialSettings = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.financial ?? null
  );

/** Get branding assets */
export const useBrandingAssets = () => 
  useOrganizationStore(state => 
    state.organization?.settings?.branding ?? null
  );
