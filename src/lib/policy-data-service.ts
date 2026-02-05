/**
 * Policy Data Service — Relational (Phase 1)
 *
 * All CRUD operations for the `policies` table.
 * Replaces the JSONB read/write operations that were in PoliciesTabContent
 * and PolicyUploadForm.
 *
 * ROADMAP-Policy.md Phase 1: Relational Migration
 * ADR-001: Policies moved from JSONB to relational table
 *
 * Note: policyService (lib/policy-service.ts) continues to handle PDF
 * upload/delete from Supabase Storage. This service handles the policy
 * *data* — the row in the table.
 */

import { supabase } from "./supabase";
import {
  bumpVersion,
  type Policy,
  type PolicyInsert,
  type PolicyUpdate,
  type PolicyStatus,
  type VersionBumpType,
} from "@/types/policies";

// =============================================================================
// QUERIES (READ)
// =============================================================================

/**
 * Fetch all active policies for an organization.
 * Sorted by category then title — matches the grid display order.
 */
export async function fetchPolicies(organizationId: string): Promise<Policy[]> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("category_id")
    .order("title");

  if (error) throw error;
  return (data ?? []) as Policy[];
}

/**
 * Fetch policies filtered by status.
 * Used for admin views: "show me drafts" or "show me archived".
 */
export async function fetchPoliciesByStatus(
  organizationId: string,
  status: PolicyStatus
): Promise<Policy[]> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", status)
    .eq("is_active", true)
    .order("title");

  if (error) throw error;
  return (data ?? []) as Policy[];
}

/**
 * Fetch a single policy by ID.
 * Returns null if not found.
 */
export async function fetchPolicy(policyId: string): Promise<Policy | null> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", policyId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data as Policy;
}

/**
 * Count policies per category for an organization.
 * Used by CategoryManager to show count badges.
 */
export async function countPoliciesByCategory(
  organizationId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("policies")
    .select("category_id")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const catId = (row as { category_id: string }).category_id;
    counts[catId] = (counts[catId] || 0) + 1;
  }
  return counts;
}

// =============================================================================
// MUTATIONS (WRITE)
// =============================================================================

/**
 * Create a new policy.
 * Returns the full row (with server-generated id and timestamps).
 */
export async function createPolicy(policy: PolicyInsert): Promise<Policy> {
  const { data, error } = await supabase
    .from("policies")
    .insert(policy)
    .select()
    .single();

  if (error) throw error;
  return data as Policy;
}

/**
 * Update an existing policy.
 * Only sends the fields that changed.
 * updated_at is refreshed automatically by the DB trigger, but we also
 * set it client-side for immediate UI feedback.
 */
export async function updatePolicy(
  policyId: string,
  updates: PolicyUpdate
): Promise<Policy> {
  const { data, error } = await supabase
    .from("policies")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", policyId)
    .select()
    .single();

  if (error) throw error;
  return data as Policy;
}

/**
 * Soft-delete a policy.
 * Sets is_active = false — the row stays for audit trail.
 * PDF stays in storage (cleanup is a separate concern).
 */
export async function deletePolicy(
  policyId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("policies")
    .update({
      is_active: false,
      status: "archived" as PolicyStatus,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", policyId);

  if (error) throw error;
}

/**
 * Hard-delete a policy (remove row entirely).
 * Only for cleaning up unwanted drafts.
 * Published policies should be soft-deleted instead.
 */
export async function hardDeletePolicy(policyId: string): Promise<void> {
  const { error } = await supabase
    .from("policies")
    .delete()
    .eq("id", policyId);

  if (error) throw error;
}

// =============================================================================
// LIFECYCLE (Phase 2 — Publishing Workflow, typed now)
// =============================================================================

/**
 * Publish a draft policy.
 */
export async function publishPolicy(
  policyId: string,
  userId: string
): Promise<Policy> {
  return updatePolicy(policyId, {
    status: "published",
    published_at: new Date().toISOString(),
    published_by: userId,
    updated_by: userId,
  });
}

/**
 * Archive a published policy.
 */
export async function archivePolicy(
  policyId: string,
  userId: string
): Promise<Policy> {
  return updatePolicy(policyId, {
    status: "archived",
    archived_at: new Date().toISOString(),
    updated_by: userId,
  });
}

// =============================================================================
// VERSIONING (Phase 2 — MAJOR.MINOR.PATCH)
// =============================================================================
//
// Communication hierarchy:
//   Patch  — Note on the board. No review needed.
//   Minor  — Pre-shift mention. Optional review broadcast.
//   Major  — All-hands meeting. Archives old, creates new, re-ack required.
// =============================================================================

/**
 * Patch bump — typo/formatting fix.
 * Same row, version increments, no notification, no re-ack.
 * "Trust us, carry on."
 */
export async function patchBumpPolicy(
  policyId: string,
  currentVersion: string,
  userId: string
): Promise<Policy> {
  const newVersion = bumpVersion(currentVersion, 'patch');
  return updatePolicy(policyId, {
    version: newVersion,
    last_revision_date: new Date().toISOString().split('T')[0],
    updated_by: userId,
  });
}

/**
 * Minor bump — substantive but optional review.
 * Same row, version increments, resets patch to 0.
 * "Worth a read when you get a minute."
 */
export async function minorBumpPolicy(
  policyId: string,
  currentVersion: string,
  userId: string
): Promise<Policy> {
  const newVersion = bumpVersion(currentVersion, 'minor');
  return updatePolicy(policyId, {
    version: newVersion,
    last_revision_date: new Date().toISOString().split('T')[0],
    updated_by: userId,
  });
}

/**
 * Major revision — archives old policy, creates new version row.
 * Links the chain: old.superseded_by → new.id, new.previous_version → old.id
 * New version starts as draft so admin can review before publishing.
 * "Everyone reads, everyone signs."
 *
 * Returns the NEW policy (the draft that replaces the old one).
 */
export async function majorRevisionPolicy(
  oldPolicy: Policy,
  userId: string
): Promise<{ archived: Policy; newDraft: Policy }> {
  const newVersion = bumpVersion(oldPolicy.version, 'major');

  // 1. Create the new version as a draft (copies most fields)
  const newDraft = await createPolicy({
    organization_id: oldPolicy.organization_id,
    title: oldPolicy.title,
    description: oldPolicy.description,
    category_id: oldPolicy.category_id,
    document_url: oldPolicy.document_url,       // Same PDF until admin uploads new one
    version: newVersion,
    status: 'draft',                             // Starts as draft for review
    is_active: true,
    effective_date: oldPolicy.effective_date,
    prepared_date: new Date().toISOString().split('T')[0],
    last_revision_date: new Date().toISOString().split('T')[0],
    prepared_by: oldPolicy.prepared_by,
    author_title: oldPolicy.author_title,
    review_schedule: oldPolicy.review_schedule,
    next_review_date: oldPolicy.next_review_date,
    requires_acknowledgment: oldPolicy.requires_acknowledgment,
    recertification_required: oldPolicy.recertification_required,
    recertification_interval: oldPolicy.recertification_interval,
    recertification_custom_days: oldPolicy.recertification_custom_days,
    applicable_departments: oldPolicy.applicable_departments,
    applicable_scheduled_roles: oldPolicy.applicable_scheduled_roles,
    applicable_kitchen_stations: oldPolicy.applicable_kitchen_stations,
    previous_version: oldPolicy.id,              // Chain link: points back
    created_by: userId,
    updated_by: userId,
  });

  // 2. Archive the old policy and link it forward
  const archived = await updatePolicy(oldPolicy.id, {
    status: 'archived',
    archived_at: new Date().toISOString(),
    superseded_by: newDraft.id,                  // Chain link: points forward
    updated_by: userId,
  });

  return { archived, newDraft };
}
