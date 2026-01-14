import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface VendorTemplate {
  id: string;
  organization_id: string;
  vendor_id: string;
  name: string;
  file_type: "csv" | "pdf" | "photo";
  column_mapping?: Record<string, string>;
  ocr_regions?: Array<{
    name: string;
    type: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  created_at: string;
  updated_at: string;
}

interface VendorTemplatesStore {
  templates: VendorTemplate[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: (organizationId: string, vendorId?: string) => Promise<void>;
  getTemplate: (vendorId: string, fileType: "csv" | "pdf") => VendorTemplate | undefined;
  saveTemplate: (
    template: Omit<VendorTemplate, "id" | "created_at" | "updated_at">,
  ) => Promise<VendorTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<VendorTemplate>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useVendorTemplatesStore = create<VendorTemplatesStore>(
  (set, get) => ({
    templates: [],
    isLoading: false,
    error: null,

    getTemplate: (vendorId: string, fileType: "csv" | "pdf") => {
      return get().templates.find(
        t => t.vendor_id === vendorId && t.file_type === fileType
      );
    },

    fetchTemplates: async (organizationId: string, vendorId?: string) => {
      try {
        set({ isLoading: true, error: null });
        
        let query = supabase
          .from("vendor_templates")
          .select("*")
          .eq("organization_id", organizationId);
        
        if (vendorId) {
          query = query.eq("vendor_id", vendorId);
        }
        
        const { data, error } = await query;

        if (error) throw error;

        set({
          templates: data || [],
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching templates:", error);
        set({
          error:
            error instanceof Error ? error.message : "Failed to load templates",
          isLoading: false,
        });
      }
    },

    saveTemplate: async (template) => {
      try {
        // Upsert based on organization_id + vendor_id + file_type
        const { data, error } = await supabase
          .from("vendor_templates")
          .upsert([template], {
            onConflict: 'organization_id,vendor_id,file_type',
          })
          .select()
          .single();

        if (error) throw error;

        set((state) => {
          // Replace if exists, otherwise add
          const exists = state.templates.some(
            t => t.vendor_id === data.vendor_id && t.file_type === data.file_type
          );
          return {
            templates: exists
              ? state.templates.map(t => 
                  t.vendor_id === data.vendor_id && t.file_type === data.file_type ? data : t
                )
              : [...state.templates, data],
          };
        });
        
        return data;
      } catch (error) {
        console.error("Error saving template:", error);
        throw error;
      }
    },

    updateTemplate: async (id, updates) => {
      try {
        const { error } = await supabase
          .from("vendor_templates")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }));
      } catch (error) {
        console.error("Error updating template:", error);
        throw error;
      }
    },

    deleteTemplate: async (id) => {
      try {
        const { error } = await supabase
          .from("vendor_templates")
          .delete()
          .eq("id", id);

        if (error) throw error;

        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      } catch (error) {
        console.error("Error deleting template:", error);
        throw error;
      }
    },
  }),
);
