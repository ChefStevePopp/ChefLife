import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import toast from "react-hot-toast";
import type {
  InventorySession,
  ReviewCount,
  PendingReviewSession,
  CountForReview,
  SessionType,
  SessionStatus,
  CountStatus,
} from "@/types/inventory-sessions";

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface InventorySessionsStore {
  // State
  sessions: InventorySession[];
  pendingReviews: PendingReviewSession[];
  selectedSession: InventorySession | null;
  countsForReview: ReviewCount[];
  isLoading: boolean;
  isLoadingCounts: boolean;
  error: string | null;

  // Session CRUD
  fetchSessions: (status?: SessionStatus) => Promise<void>;
  fetchPendingReviews: () => Promise<void>;
  fetchSession: (id: string) => Promise<InventorySession | null>;
  createSession: (session: Partial<InventorySession>) => Promise<string | null>;
  updateSession: (id: string, updates: Partial<InventorySession>) => Promise<void>;
  
  // Review workflow
  fetchCountsForReview: (sessionId: string) => Promise<void>;
  submitForReview: (sessionId: string) => Promise<void>;
  approveSession: (sessionId: string, notes?: string) => Promise<void>;
  rejectSession: (sessionId: string, notes: string) => Promise<void>;
  
  // Individual count actions
  approveCount: (countId: string) => Promise<void>;
  flagCount: (countId: string, reason: string) => Promise<void>;
  adjustCount: (countId: string, newQuantity: number, reason: string) => Promise<void>;
  
  // Helpers
  setSelectedSession: (session: InventorySession | null) => void;
  clearError: () => void;
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

const transformSession = (row: any): InventorySession => ({
  id: row.id,
  organizationId: row.organization_id,
  sessionType: row.session_type,
  name: row.name,
  description: row.description,
  scopeCategories: row.scope_categories,
  scopeLocations: row.scope_locations,
  scopeVendor: row.scope_vendor,
  scopeInvoiceId: row.scope_invoice_id,
  startedAt: row.started_at,
  startedBy: row.started_by,
  completedAt: row.completed_at,
  completedBy: row.completed_by,
  requiresReview: row.requires_review,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNotes: row.review_notes,
  totalItemsCounted: row.total_items_counted || 0,
  totalValue: parseFloat(row.total_value) || 0,
  totalVarianceValue: parseFloat(row.total_variance_value) || 0,
  itemsWithVariance: row.items_with_variance || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const transformCountForReview = (row: CountForReview): ReviewCount => ({
  id: row.count_id,
  sessionId: row.session_id,
  masterIngredientId: row.master_ingredient_id,
  product: row.product,
  itemCode: row.item_code,
  majorGroup: row.major_group,
  category: row.category,
  subCategory: row.sub_category,
  storageArea: row.storage_area,
  unitOfMeasure: row.unit_of_measure,
  previousCount: row.previous_quantity,
  currentCount: row.current_count,
  expectedCount: row.expected_quantity,
  variance: row.variance || 0,
  variancePercent: row.variance_percent || 0,
  unitCost: parseFloat(String(row.unit_cost)) || 0,
  totalValue: parseFloat(String(row.total_value)) || 0,
  status: row.status,
  countDate: row.count_date,
  countedBy: row.counted_by,
  countedByName: row.counted_by_name,
  notes: row.notes,
});

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useInventorySessionsStore = create<InventorySessionsStore>((set, get) => ({
  sessions: [],
  pendingReviews: [],
  selectedSession: null,
  countsForReview: [],
  isLoading: false,
  isLoadingCounts: false,
  error: null,

  // --------------------------------------------------------------------------
  // FETCH SESSIONS
  // --------------------------------------------------------------------------
  fetchSessions: async (status?: SessionStatus) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      if (!organizationId) {
        throw new Error("No organization ID found");
      }

      let query = supabase
        .from("inventory_count_sessions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("started_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const sessions = (data || []).map(transformSession);
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      set({ 
        error: error instanceof Error ? error.message : "Failed to fetch sessions",
        isLoading: false 
      });
    }
  },

  // --------------------------------------------------------------------------
  // FETCH PENDING REVIEWS (from view)
  // --------------------------------------------------------------------------
  fetchPendingReviews: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      if (!organizationId) {
        throw new Error("No organization ID found");
      }

      const { data, error } = await supabase
        .from("inventory_pending_reviews")
        .select("*")
        .eq("organization_id", organizationId)
        .order("started_at", { ascending: false });

      if (error) throw error;

      set({ pendingReviews: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      set({ 
        error: error instanceof Error ? error.message : "Failed to fetch pending reviews",
        isLoading: false 
      });
    }
  },

  // --------------------------------------------------------------------------
  // FETCH SINGLE SESSION
  // --------------------------------------------------------------------------
  fetchSession: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("inventory_count_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      const session = transformSession(data);
      set({ selectedSession: session });
      return session;
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // CREATE SESSION
  // --------------------------------------------------------------------------
  createSession: async (session: Partial<InventorySession>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      if (!organizationId) {
        throw new Error("No organization ID found");
      }

      // Determine if review is required based on session type
      const requiresReview = ['full_physical', 'spot_check', 'cycle_count'].includes(
        session.sessionType || 'full_physical'
      );

      const { data, error } = await supabase
        .from("inventory_count_sessions")
        .insert({
          organization_id: organizationId,
          session_type: session.sessionType || 'full_physical',
          name: session.name,
          description: session.description,
          scope_categories: session.scopeCategories,
          scope_locations: session.scopeLocations,
          scope_vendor: session.scopeVendor,
          scope_invoice_id: session.scopeInvoiceId,
          started_by: user.id,
          requires_review: requiresReview,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "session_created",
          session_id: data.id,
          session_type: session.sessionType,
          session_name: session.name,
        },
        metadata: {
          category: "inventory",
          severity: "info",
        },
      });

      toast.success("Inventory session started");
      await get().fetchSessions();
      return data.id;
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create session");
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // UPDATE SESSION
  // --------------------------------------------------------------------------
  updateSession: async (id: string, updates: Partial<InventorySession>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.completedBy !== undefined) dbUpdates.completed_by = updates.completedBy;

      const { error } = await supabase
        .from("inventory_count_sessions")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      await get().fetchSessions();
      toast.success("Session updated");
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update session");
    }
  },

  // --------------------------------------------------------------------------
  // FETCH COUNTS FOR REVIEW
  // --------------------------------------------------------------------------
  fetchCountsForReview: async (sessionId: string) => {
    set({ isLoadingCounts: true, error: null });
    try {
      const { data, error } = await supabase
        .from("inventory_counts_for_review")
        .select("*")
        .eq("session_id", sessionId)
        .order("category", { ascending: true })
        .order("product", { ascending: true });

      if (error) throw error;

      const counts = (data || []).map(transformCountForReview);
      set({ countsForReview: counts, isLoadingCounts: false });
    } catch (error) {
      console.error("Error fetching counts for review:", error);
      set({ 
        error: error instanceof Error ? error.message : "Failed to fetch counts",
        isLoadingCounts: false 
      });
    }
  },

  // --------------------------------------------------------------------------
  // SUBMIT SESSION FOR REVIEW
  // --------------------------------------------------------------------------
  submitForReview: async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      // Update session status
      const { error } = await supabase
        .from("inventory_count_sessions")
        .update({
          status: 'pending_review',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "session_submitted_for_review",
          session_id: sessionId,
        },
        metadata: {
          category: "inventory",
          severity: "info",
        },
      });

      toast.success("Session submitted for review");
      await get().fetchSessions();
      await get().fetchPendingReviews();
    } catch (error) {
      console.error("Error submitting for review:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit for review");
    }
  },

  // --------------------------------------------------------------------------
  // APPROVE SESSION
  // --------------------------------------------------------------------------
  approveSession: async (sessionId: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      // Update session status
      const { error: sessionError } = await supabase
        .from("inventory_count_sessions")
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Update all pending counts in this session to approved
      const { error: countsError } = await supabase
        .from("inventory_counts")
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("status", "pending");

      if (countsError) throw countsError;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "session_approved",
          session_id: sessionId,
          review_notes: notes,
        },
        metadata: {
          category: "inventory",
          severity: "info",
        },
      });

      toast.success("Inventory session approved");
      await get().fetchSessions();
      await get().fetchPendingReviews();
    } catch (error) {
      console.error("Error approving session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to approve session");
    }
  },

  // --------------------------------------------------------------------------
  // REJECT SESSION
  // --------------------------------------------------------------------------
  rejectSession: async (sessionId: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      const { error } = await supabase
        .from("inventory_count_sessions")
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "session_rejected",
          session_id: sessionId,
          review_notes: notes,
        },
        metadata: {
          category: "inventory",
          severity: "warning",
        },
      });

      toast.success("Session rejected - recount required");
      await get().fetchSessions();
      await get().fetchPendingReviews();
    } catch (error) {
      console.error("Error rejecting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reject session");
    }
  },

  // --------------------------------------------------------------------------
  // APPROVE INDIVIDUAL COUNT
  // --------------------------------------------------------------------------
  approveCount: async (countId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      const { error } = await supabase
        .from("inventory_counts")
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", countId);

      if (error) throw error;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "count_approved",
          count_id: countId,
        },
        metadata: {
          category: "inventory",
          severity: "info",
        },
      });

      // Refresh counts
      const selectedSession = get().selectedSession;
      if (selectedSession) {
        await get().fetchCountsForReview(selectedSession.id);
      }
    } catch (error) {
      console.error("Error approving count:", error);
      toast.error(error instanceof Error ? error.message : "Failed to approve count");
    }
  },

  // --------------------------------------------------------------------------
  // FLAG COUNT FOR INVESTIGATION
  // --------------------------------------------------------------------------
  flagCount: async (countId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      const { error } = await supabase
        .from("inventory_counts")
        .update({
          status: 'flagged',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          adjustment_reason: reason,
        })
        .eq("id", countId);

      if (error) throw error;

      // Log activity
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "count_flagged",
          count_id: countId,
          reason,
        },
        metadata: {
          category: "inventory",
          severity: "warning",
        },
      });

      toast.success("Count flagged for review");
      
      // Refresh counts
      const selectedSession = get().selectedSession;
      if (selectedSession) {
        await get().fetchCountsForReview(selectedSession.id);
      }
    } catch (error) {
      console.error("Error flagging count:", error);
      toast.error(error instanceof Error ? error.message : "Failed to flag count");
    }
  },

  // --------------------------------------------------------------------------
  // ADJUST COUNT
  // --------------------------------------------------------------------------
  adjustCount: async (countId: string, newQuantity: number, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const organizationId = user?.user_metadata?.organizationId;

      // Get current count to calculate new total value
      const { data: currentCount, error: fetchError } = await supabase
        .from("inventory_counts")
        .select("quantity, unit_cost")
        .eq("id", countId)
        .single();

      if (fetchError) throw fetchError;

      const newTotalValue = newQuantity * (currentCount.unit_cost || 0);

      const { error } = await supabase
        .from("inventory_counts")
        .update({
          quantity: newQuantity,
          total_value: newTotalValue,
          status: 'adjusted',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          adjustment_reason: reason,
        })
        .eq("id", countId);

      if (error) throw error;

      // Log activity with before/after
      await logActivity({
        organization_id: organizationId,
        user_id: user?.id,
        activity_type: "inventory_updated" as any,
        details: {
          action: "count_adjusted",
          count_id: countId,
          previous_quantity: currentCount.quantity,
          new_quantity: newQuantity,
          reason,
        },
        metadata: {
          category: "inventory",
          severity: "warning",
          diffs: {
            table_name: "inventory_counts",
            record_id: countId,
            old_values: { quantity: currentCount.quantity },
            new_values: { quantity: newQuantity },
          },
        },
      });

      toast.success("Count adjusted");
      
      // Refresh counts
      const selectedSession = get().selectedSession;
      if (selectedSession) {
        await get().fetchCountsForReview(selectedSession.id);
      }
    } catch (error) {
      console.error("Error adjusting count:", error);
      toast.error(error instanceof Error ? error.message : "Failed to adjust count");
    }
  },

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  setSelectedSession: (session: InventorySession | null) => {
    set({ selectedSession: session });
  },

  clearError: () => {
    set({ error: null });
  },
}));
