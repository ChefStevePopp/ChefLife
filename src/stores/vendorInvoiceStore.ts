import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  PriceChange,
  CodeChange,
  VendorInvoiceStats,
} from "@/types/vendor-invoice";
import toast from "react-hot-toast";

interface VendorInvoiceStore {
  priceChanges: PriceChange[];
  codeChanges: CodeChange[];
  stats: VendorInvoiceStats;
  isLoading: boolean;
  error: string | null;
  lastInvoice: { filename?: string; invoice_date?: string; created_at: string } | null;
  lastUpload: { filename?: string; invoice_date?: string; created_at: string } | null;
  fetchInvoiceData: (vendorId: string) => Promise<void>;
  fetchLastInvoice: (vendorId: string) => Promise<void>;
  checkDuplicateFile: (vendorId: string, filename: string) => Promise<{ isDuplicate: boolean; existingDate?: string }>;
  savePriceChanges: (changes: PriceChange[]) => Promise<void>;
  saveCodeChanges: (changes: CodeChange[]) => Promise<void>;
  approvePriceChange: (changeId: string) => Promise<void>;
  rejectPriceChange: (changeId: string) => Promise<void>;
  handleCodeChange: (
    changeId: string,
    action: "update" | "new_item",
  ) => Promise<void>;
}

export const useVendorInvoiceStore = create<VendorInvoiceStore>((set, get) => ({
  priceChanges: [],
  codeChanges: [],
  stats: {
    itemsToUpdate: 0,
    averageChange: 0,
    potentialSavings: 0,
    issueCount: 0,
  },
  isLoading: false,
  error: null,
  lastInvoice: null,
  lastUpload: null,

  fetchInvoiceData: async (vendorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const [priceChangesRes, codeChangesRes] = await Promise.all([
        supabase
          .from("vendor_price_changes")
          .select("*")
          .eq("organization_id", user.user_metadata.organizationId)
          .eq("vendor_id", vendorId)
          .order("invoice_date", { ascending: false }),
        supabase
          .from("vendor_code_changes")
          .select("*")
          .eq("organization_id", user.user_metadata.organizationId)
          .eq("vendor_id", vendorId)
          .order("invoice_date", { ascending: false }),
      ]);

      if (priceChangesRes.error) throw priceChangesRes.error;
      if (codeChangesRes.error) throw codeChangesRes.error;

      set({
        priceChanges: priceChangesRes.data as any,
        codeChanges: codeChangesRes.data as any,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      set({ error: "Failed to load invoice data" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLastInvoice: async (vendorId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      // Fetch both: last by invoice date AND last by upload date
      const [invoiceDateResult, uploadDateResult] = await Promise.all([
        // Last by invoice date (most recent invoice in system by calendar)
        // Falls back to created_at ordering for legacy data without invoice_date
        supabase
          .from("vendor_imports")
          .select("file_name, invoice_date, created_at")
          .eq("organization_id", user.user_metadata.organizationId)
          .eq("vendor_id", vendorId)
          .eq("status", "completed")
          .order("invoice_date", { ascending: false, nullsFirst: false })
          .limit(1),
        // Last by upload date (most recent import action)
        supabase
          .from("vendor_imports")
          .select("file_name, invoice_date, created_at")
          .eq("organization_id", user.user_metadata.organizationId)
          .eq("vendor_id", vendorId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      // Last invoice by date
      if (invoiceDateResult.data && invoiceDateResult.data.length > 0) {
        set({
          lastInvoice: {
            filename: invoiceDateResult.data[0].file_name,
            invoice_date: invoiceDateResult.data[0].invoice_date,
            created_at: invoiceDateResult.data[0].created_at,
          },
        });
      } else {
        set({ lastInvoice: null });
      }

      // Last upload
      if (uploadDateResult.data && uploadDateResult.data.length > 0) {
        set({
          lastUpload: {
            filename: uploadDateResult.data[0].file_name,
            invoice_date: uploadDateResult.data[0].invoice_date,
            created_at: uploadDateResult.data[0].created_at,
          },
        });
      } else {
        set({ lastUpload: null });
      }
    } catch (error) {
      console.error("Error fetching last invoice:", error);
      set({ lastInvoice: null, lastUpload: null });
    }
  },

  checkDuplicateFile: async (vendorId: string, filename: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        return { isDuplicate: false };
      }

      const { data, error } = await supabase
        .from("vendor_imports")
        .select("invoice_date, created_at")
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("vendor_id", vendorId)
        .eq("file_name", filename)
        .neq("status", "superseded")
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          isDuplicate: true,
          existingDate: data[0].invoice_date || data[0].created_at,
        };
      }
      return { isDuplicate: false };
    } catch (error) {
      console.error("Error checking duplicate file:", error);
      return { isDuplicate: false };
    }
  },

  savePriceChanges: async (changes) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase.from("vendor_price_changes").upsert(
        changes.map((change: any) => ({
          organization_id: user.user_metadata.organizationId,
          ...change,
        })) as any,
      );

      if (error) throw error;
      set({ priceChanges: changes });
      toast.success("Price changes saved successfully");
    } catch (error) {
      console.error("Error saving price changes:", error);
      toast.error("Failed to save price changes");
    }
  },

  saveCodeChanges: async (changes) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase.from("vendor_code_changes").upsert(
        changes.map((change: any) => ({
          organization_id: user.user_metadata.organizationId,
          ...change,
        })) as any,
      );

      if (error) throw error;
      set({ codeChanges: changes });
      toast.success("Code changes saved successfully");
    } catch (error) {
      console.error("Error saving code changes:", error);
      toast.error("Failed to save code changes");
    }
  },

  approvePriceChange: async (changeId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase
        .from("vendor_price_changes")
        .update({
          approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", changeId)
        .eq("organization_id", user.user_metadata.organizationId);

      if (error) throw error;

      set((state) => ({
        priceChanges: state.priceChanges.map((change: any) =>
          change.id === changeId
            ? {
                ...change,
                approved: true,
                approvedBy: user.id,
                approvedAt: new Date().toISOString(),
              }
            : change,
        ),
      }));

      toast.success("Price change approved");
    } catch (error) {
      console.error("Error approving price change:", error);
      toast.error("Failed to approve price change");
    }
  },

  rejectPriceChange: async (changeId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase
        .from("vendor_price_changes")
        .update({
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", changeId)
        .eq("organization_id", user.user_metadata.organizationId);

      if (error) throw error;

      set((state) => ({
        priceChanges: state.priceChanges.map((change: any) =>
          change.id === changeId
            ? {
                ...change,
                rejectedBy: user.id,
                rejectedAt: new Date().toISOString(),
              }
            : change,
        ),
      }));

      toast.success("Price change rejected");
    } catch (error) {
      console.error("Error rejecting price change:", error);
      toast.error("Failed to reject price change");
    }
  },

  handleCodeChange: async (changeId, action) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.user_metadata?.organizationId) {
        throw new Error("No organization ID found");
      }

      const { error } = await supabase
        .from("vendor_code_changes")
        .update({
          handled: true,
          handled_by: user.id,
          handled_at: new Date().toISOString(),
          action,
        })
        .eq("id", changeId)
        .eq("organization_id", user.user_metadata.organizationId);

      if (error) throw error;

      set((state) => ({
        codeChanges: state.codeChanges.map((change: any) =>
          change.id === changeId
            ? {
                ...change,
                handled: true,
                handledBy: user.id,
                handledAt: new Date().toISOString(),
                action,
              }
            : change,
        ),
      }));

      toast.success("Code change handled successfully");
    } catch (error) {
      console.error("Error handling code change:", error);
      toast.error("Failed to handle code change");
    }
  },
}));
