import { create } from "zustand";
import { supabase } from "@/lib/supabase";

// =============================================================================
// VENDOR CONFIGS STORE
// =============================================================================
// Manages vendor-level settings (not templates - those are in vendorTemplatesStore)
// - Enabled invoice types (CSV, PDF, Manual, Mobile)
// - Default invoice type
// - Vendor contact details (rep name, email, phone, account #)
// - Logo URL
//
// Import Methods:
//   CSV    = bulk file import (spreadsheet)
//   PDF    = document parsing
//   Manual = desktop entry
//   Mobile = quick mobile workflow (L6 roadmap)
// =============================================================================

export interface VendorConfig {
  id?: string;
  organization_id: string;
  vendor_id: string;
  // Display
  logo_url?: string;
  // Enabled invoice types (UI uses 'mobile', DB uses 'photo_enabled')
  csv_enabled: boolean;
  pdf_enabled: boolean;
  manual_enabled: boolean;
  mobile_enabled: boolean;  // Maps to DB column 'photo_enabled'
  default_invoice_type: "csv" | "pdf" | "manual" | "photo";  // DB constraint uses 'photo' not 'mobile'
  // Vendor contact details
  account_number?: string;
  rep_name?: string;
  rep_email?: string;
  rep_phone?: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

// Smart defaults based on vendor name patterns
export const inferVendorDefaults = (vendorName: string): Partial<VendorConfig> => {
  const nameUpper = vendorName.toUpperCase();
  
  // GFS, Sysco, US Foods = typically CSV
  if (nameUpper.includes('GFS') || 
      nameUpper.includes('GORDON') || 
      nameUpper.includes('SYSCO') || 
      nameUpper.includes('US FOODS') ||
      nameUpper.includes('PERFORMANCE FOOD')) {
    return {
      csv_enabled: true,
      pdf_enabled: false,
      manual_enabled: true,
      mobile_enabled: false,
      default_invoice_type: 'csv',
    };
  }
  
  // Flanagan's, local distributors = typically PDF
  if (nameUpper.includes('FLANAGAN') || 
      nameUpper.includes('HIGHLAND') ||
      nameUpper.includes('SYSCO') === false && nameUpper.includes('FOODS')) {
    return {
      csv_enabled: false,
      pdf_enabled: true,
      manual_enabled: true,
      mobile_enabled: true,
      default_invoice_type: 'pdf',
    };
  }
  
  // Local farms, markets = typically manual/mobile (photo)
  if (nameUpper.includes('FARM') || 
      nameUpper.includes('MARKET') || 
      nameUpper.includes('LOCAL') ||
      nameUpper.includes('BUTCHER')) {
    return {
      csv_enabled: false,
      pdf_enabled: false,
      manual_enabled: true,
      mobile_enabled: true,
      default_invoice_type: 'photo',  // DB uses 'photo'
    };
  }
  
  // Default: manual entry with all options available
  return {
    csv_enabled: true,
    pdf_enabled: true,
    manual_enabled: true,
    mobile_enabled: true,
    default_invoice_type: 'manual',
  };
};

interface VendorConfigsStore {
  configs: VendorConfig[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConfigs: (organizationId: string) => Promise<void>;
  getConfig: (vendorId: string) => VendorConfig | undefined;
  saveConfig: (config: VendorConfig) => Promise<void>;
  updateConfig: (vendorId: string, updates: Partial<VendorConfig>) => Promise<void>;
  deleteConfig: (vendorId: string) => Promise<void>;
  
  // Helpers
  getOrCreateConfig: (organizationId: string, vendorId: string, vendorName: string) => VendorConfig;
}

export const useVendorConfigsStore = create<VendorConfigsStore>((set, get) => ({
  configs: [],
  isLoading: false,
  error: null,

  fetchConfigs: async (organizationId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from("vendor_configs")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) {
        // Table might not exist yet - that's OK, return empty
        if (error.code === '42P01') {
          console.warn("vendor_configs table not found - using defaults");
          set({ configs: [], isLoading: false });
          return;
        }
        throw error;
      }

      // Map DB column 'photo_enabled' to UI field 'mobile_enabled'
      const mappedConfigs = (data || []).map((row: any) => ({
        ...row,
        mobile_enabled: row.photo_enabled,  // DB: photo_enabled → UI: mobile_enabled
      }));

      set({
        configs: mappedConfigs,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching vendor configs:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to load vendor configs",
        isLoading: false,
        configs: [], // Still set empty array so UI doesn't break
      });
    }
  },

  getConfig: (vendorId: string) => {
    return get().configs.find(c => c.vendor_id === vendorId);
  },

  // Get existing config or create one with smart defaults
  getOrCreateConfig: (organizationId: string, vendorId: string, vendorName: string) => {
    const existing = get().configs.find(c => c.vendor_id === vendorId);
    if (existing) return existing;
    
    // Create config with smart defaults based on vendor name
    const defaults = inferVendorDefaults(vendorName);
    
    return {
      organization_id: organizationId,
      vendor_id: vendorId,
      csv_enabled: defaults.csv_enabled ?? true,
      pdf_enabled: defaults.pdf_enabled ?? false,
      manual_enabled: defaults.manual_enabled ?? true,
      mobile_enabled: defaults.mobile_enabled ?? false,
      default_invoice_type: defaults.default_invoice_type ?? 'manual',
    };
  },

  saveConfig: async (config: VendorConfig) => {
    try {
      // Upsert - insert or update based on org+vendor unique constraint
      const payload = {
        organization_id: config.organization_id,
        vendor_id: config.vendor_id,
        logo_url: config.logo_url,
        csv_enabled: config.csv_enabled,
        pdf_enabled: config.pdf_enabled,
        manual_enabled: config.manual_enabled,
        photo_enabled: config.mobile_enabled,  // UI: mobile_enabled → DB: photo_enabled
        default_invoice_type: config.default_invoice_type,
        account_number: config.account_number,
        rep_name: config.rep_name,
        rep_email: config.rep_email,
        rep_phone: config.rep_phone,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from("vendor_configs")
        .upsert(payload, {
          onConflict: 'organization_id,vendor_id',
        })
        .select()
        .single();

      if (error) throw error;

      // Map DB response back to UI field names
      const mappedData = {
        ...data,
        mobile_enabled: data.photo_enabled,  // DB: photo_enabled → UI: mobile_enabled
      };

      // Update local state
      set((state) => {
        const exists = state.configs.some(c => c.vendor_id === config.vendor_id);
        if (exists) {
          return {
            configs: state.configs.map(c => 
              c.vendor_id === config.vendor_id ? { ...c, ...mappedData } : c
            ),
          };
        } else {
          return {
            configs: [...state.configs, mappedData],
          };
        }
      });
      
      return data;
    } catch (error) {
      console.error("Error saving vendor config:", error);
      throw error;
    }
  },

  updateConfig: async (vendorId: string, updates: Partial<VendorConfig>) => {
    const existing = get().configs.find(c => c.vendor_id === vendorId);
    if (!existing) {
      throw new Error(`No config found for vendor: ${vendorId}`);
    }
    
    await get().saveConfig({ ...existing, ...updates });
  },

  deleteConfig: async (vendorId: string) => {
    try {
      const config = get().configs.find(c => c.vendor_id === vendorId);
      if (!config?.id) return;

      const { error } = await supabase
        .from("vendor_configs")
        .delete()
        .eq("id", config.id);

      if (error) throw error;

      set((state) => ({
        configs: state.configs.filter(c => c.vendor_id !== vendorId),
      }));
    } catch (error) {
      console.error("Error deleting vendor config:", error);
      throw error;
    }
  },
}));
