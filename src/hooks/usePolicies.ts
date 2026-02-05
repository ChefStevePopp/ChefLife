/**
 * usePolicies — CRUD hook for the relational `policies` table
 * ============================================================================
 * @deprecated BRIDGE LAYER — will be removed when all consumers migrate.
 *
 * This hook exists to keep legacy components (PolicyCard) working during
 * the transition from PolicyTemplate (camelCase JSONB) to Policy (snake_case
 * relational). It maps between the two shapes.
 *
 * NEW CODE SHOULD USE:
 *   - Types:    import { Policy } from '@/types/policies'
 *   - Service:  import { fetchPolicies, createPolicy, ... } from '@/lib/policy-data-service'
 *
 * The modern path (PolicyUploadForm, PoliciesTabContent) already uses
 * policy-data-service.ts + Policy type directly.
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import type { PolicyTemplate } from "@/types/modules";
import type { Policy, ReviewSchedule, RecertificationInterval } from "@/types/policies";

/**
 * @deprecated Use Policy from @/types/policies instead.
 * PolicyRow was an interim type identical to Policy. Kept as alias for compat.
 */
export type PolicyRow = Policy;

// =============================================================================
// MAPPERS: DB ↔ UI
// =============================================================================

/** Convert a DB row -> PolicyTemplate (for UI components) */
export function policyRowToTemplate(row: Policy): PolicyTemplate {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category_id,
    documentUrl: row.document_url,
    version: row.version,
    effectiveDate: row.effective_date,
    preparedDate: row.prepared_date || row.effective_date,
    lastRevisionDate: row.last_revision_date || row.effective_date,
    preparedBy: row.prepared_by || "",
    authorTitle: row.author_title || undefined,
    reviewSchedule: row.review_schedule as ReviewSchedule,
    nextReviewDate: row.next_review_date || undefined,
    requiresAcknowledgment: row.requires_acknowledgment,
    recertification: {
      required: row.recertification_required,
      interval: (row.recertification_interval || "none") as RecertificationInterval,
      customDays: row.recertification_custom_days || undefined,
    },
    applicableDepartments: row.applicable_departments || [],
    applicableScheduledRoles: row.applicable_scheduled_roles || [],
    applicableKitchenStations: row.applicable_kitchen_stations || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    // Extended fields available on the row (not on legacy PolicyTemplate)
    // Consumers can cast if they need these:
    // (row as PolicyRow).status, .published_at, .archived_at, etc.
  };
}

/** Convert a PolicyTemplate -> DB insert/update payload */
export function templateToPolicyInsert(
  template: PolicyTemplate,
  organizationId: string,
  userId: string,
  status: "draft" | "published" = "published"
): Record<string, unknown> {
  return {
    id: template.id,
    organization_id: organizationId,
    title: template.title.trim(),
    description: template.description?.trim() || null,
    category_id: template.category || "general",
    document_url: template.documentUrl || null,
    version: template.version.trim(),
    status,
    is_active: template.isActive ?? true,
    effective_date: template.effectiveDate,
    prepared_date: template.preparedDate || null,
    last_revision_date: template.lastRevisionDate || null,
    prepared_by: template.preparedBy?.trim() || null,
    author_title: template.authorTitle?.trim() || null,
    review_schedule: template.reviewSchedule || "annual",
    next_review_date: template.nextReviewDate || null,
    requires_acknowledgment: template.requiresAcknowledgment ?? true,
    recertification_required: template.recertification?.required ?? false,
    recertification_interval: template.recertification?.interval || "none",
    recertification_custom_days: template.recertification?.customDays || null,
    applicable_departments: template.applicableDepartments || [],
    applicable_scheduled_roles: template.applicableScheduledRoles || [],
    applicable_kitchen_stations: template.applicableKitchenStations || [],
    published_at: status === "published" ? new Date().toISOString() : null,
    published_by: status === "published" ? userId : null,
    created_by: template.createdBy || userId,
    updated_by: userId,
  };
}

// =============================================================================
// HOOK
// =============================================================================

interface UsePoliciesReturn {
  /** Policies for the current org (as PolicyTemplate for UI compat) */
  policies: PolicyTemplate[];
  /** Raw DB rows (for consumers who need status, published_at, etc.) */
  policyRows: PolicyRow[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Create a new policy */
  createPolicy: (template: PolicyTemplate) => Promise<PolicyRow | null>;
  /** Update an existing policy */
  updatePolicy: (id: string, template: PolicyTemplate) => Promise<PolicyRow | null>;
  /** Delete a policy */
  deletePolicy: (id: string, title: string) => Promise<boolean>;
  /** Refresh from DB */
  refresh: () => Promise<void>;
}

export function usePolicies(): UsePoliciesReturn {
  const { organizationId, user } = useAuth();
  const [policyRows, setPolicyRows] = useState<PolicyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // FETCH — query policies table for this org
  // =========================================================================
  const fetchPolicies = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("policies")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setPolicyRows((data as PolicyRow[]) || []);
    } catch (err: any) {
      console.error("[usePolicies] Fetch error:", err);
      setError(err.message || "Failed to load policies");
      toast.error("Failed to load policies");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Auto-fetch on mount and when org changes
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // =========================================================================
  // CREATE
  // =========================================================================
  const createPolicy = useCallback(
    async (template: PolicyTemplate): Promise<PolicyRow | null> => {
      if (!organizationId || !user) {
        toast.error("Missing user or organization");
        return null;
      }

      try {
        const payload = templateToPolicyInsert(template, organizationId, user.id, "published");

        const { data, error: insertError } = await supabase
          .from("policies")
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        const newRow = data as PolicyRow;

        // Update local state
        setPolicyRows((prev) => [newRow, ...prev]);

        // Audit trail
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: "policy_uploaded",
          details: {
            policy_id: newRow.id,
            policy_title: newRow.title,
            category: newRow.category_id,
            version: newRow.version,
            source: "relational",
          },
        });

        toast.success(`Policy "${newRow.title}" created`);
        return newRow;
      } catch (err: any) {
        console.error("[usePolicies] Create error:", err);
        toast.error(`Failed to create policy: ${err.message}`);
        return null;
      }
    },
    [organizationId, user]
  );

  // =========================================================================
  // UPDATE
  // =========================================================================
  const updatePolicy = useCallback(
    async (id: string, template: PolicyTemplate): Promise<PolicyRow | null> => {
      if (!organizationId || !user) {
        toast.error("Missing user or organization");
        return null;
      }

      try {
        // Build update payload (exclude created_by — don't change authorship)
        const payload = templateToPolicyInsert(template, organizationId, user.id, "published");
        const { id: _id, organization_id: _orgId, created_by: _cb, ...updateFields } = payload;

        const { data, error: updateError } = await supabase
          .from("policies")
          .update({
            ...updateFields,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("organization_id", organizationId)
          .select()
          .single();

        if (updateError) throw updateError;

        const updatedRow = data as PolicyRow;

        // Update local state
        setPolicyRows((prev) =>
          prev.map((r) => (r.id === id ? updatedRow : r))
        );

        // Audit trail
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: "policy_updated",
          details: {
            policy_id: updatedRow.id,
            policy_title: updatedRow.title,
            version: updatedRow.version,
            source: "relational",
          },
        });

        toast.success(`Policy "${updatedRow.title}" updated`);
        return updatedRow;
      } catch (err: any) {
        console.error("[usePolicies] Update error:", err);
        toast.error(`Failed to update policy: ${err.message}`);
        return null;
      }
    },
    [organizationId, user]
  );

  // =========================================================================
  // DELETE
  // =========================================================================
  const deletePolicy = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      if (!organizationId || !user) {
        toast.error("Missing user or organization");
        return false;
      }

      try {
        const { error: deleteError } = await supabase
          .from("policies")
          .delete()
          .eq("id", id)
          .eq("organization_id", organizationId);

        if (deleteError) throw deleteError;

        // Update local state
        setPolicyRows((prev) => prev.filter((r) => r.id !== id));

        // Audit trail
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: "policy_deleted",
          details: {
            policy_id: id,
            policy_title: title,
            source: "relational",
          },
        });

        toast.success(`Policy "${title}" deleted`);
        return true;
      } catch (err: any) {
        console.error("[usePolicies] Delete error:", err);
        toast.error(`Failed to delete policy: ${err.message}`);
        return false;
      }
    },
    [organizationId, user]
  );

  // =========================================================================
  // DERIVED: PolicyTemplate[] for UI compatibility
  // =========================================================================
  const policies = policyRows.map(policyRowToTemplate);

  return {
    policies,
    policyRows,
    isLoading,
    error,
    createPolicy,
    updatePolicy,
    deletePolicy,
    refresh: fetchPolicies,
  };
}
