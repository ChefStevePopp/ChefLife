/**
 * ChefLife Policy Types — Relational (Phase 1)
 *
 * These types map to the `policies` and `policy_acknowledgments` tables
 * created in 20260204_create_policies_tables.sql.
 *
 * ROADMAP-Policy.md ADR-001: Policies moved from JSONB to relational table.
 * Categories stay in JSONB (ADR-002).
 *
 * Naming convention: snake_case to match Supabase/Postgres column names.
 * Supabase returns snake_case by default from .select() queries.
 */

// =============================================================================
// POLICY (relational row from `policies` table)
// =============================================================================

export type PolicyStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// SHARED ENUMS — Single source of truth
// =============================================================================
// These are the canonical definitions. modules.ts re-exports them for backward
// compatibility with components that haven't migrated yet.
// If you're writing new code, import from here.
// =============================================================================

export type ReviewSchedule =
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'biennial'
  | 'as_needed';

export type RecertificationInterval =
  | 'none'
  | '30_days'
  | '90_days'
  | '180_days'
  | 'annual'
  | 'biennial'
  | 'custom';

/** @deprecated Use ReviewSchedule instead — same type, canonical name */
export type PolicyReviewSchedule = ReviewSchedule;
/** @deprecated Use RecertificationInterval instead — same type, canonical name */
export type PolicyRecertificationInterval = RecertificationInterval;

/** Assessment stored as JSONB on the policy row (Phase 5) */
export interface PolicyAssessment {
  enabled: boolean;
  passingScore: number;
  maxAttempts: number;
  questions: PolicyAssessmentQuestion[];
}

export interface PolicyAssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation?: string;
}

/**
 * Policy — one row from the `policies` table.
 *
 * Field names use snake_case to match Postgres columns.
 * This is what Supabase returns from .select() and what we
 * send to .insert() / .update().
 */
export interface Policy {
  id: string;
  organization_id: string;

  // Identity
  title: string;
  description: string | null;
  category_id: string;

  // Document
  document_url: string | null;
  version: string;

  // Status & Lifecycle
  status: PolicyStatus;
  is_active: boolean;

  // Policy Dates
  effective_date: string;       // DATE as ISO string
  prepared_date: string | null;
  last_revision_date: string | null;

  // Authorship
  prepared_by: string | null;
  author_title: string | null;

  // Review Schedule
  review_schedule: ReviewSchedule;
  next_review_date: string | null;

  // Acknowledgment Config
  requires_acknowledgment: boolean;
  recertification_required: boolean;
  recertification_interval: RecertificationInterval;
  recertification_custom_days: number | null;

  // Applicability
  applicable_departments: string[];
  applicable_scheduled_roles: string[];
  applicable_kitchen_stations: string[];

  // Assessment (Phase 5 — JSONB)
  assessment: PolicyAssessment | null;

  // Versioning
  superseded_by: string | null;
  previous_version: string | null;

  // Publishing
  published_at: string | null;
  published_by: string | null;
  archived_at: string | null;

  // System
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

/**
 * Insert payload — fields required when creating a new policy.
 * Omits server-managed fields (id, created_at, updated_at, etc.)
 */
export type PolicyInsert = Omit<Policy,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'published_at'
  | 'archived_at'
  | 'superseded_by'
  | 'previous_version'
  | 'assessment'
> & {
  id?: string;                    // Optional: let Postgres generate if omitted
  assessment?: PolicyAssessment | null;
  published_at?: string | null;
};

/**
 * Update payload — all fields optional except id.
 */
export type PolicyUpdate = Partial<Omit<Policy, 'id' | 'organization_id' | 'created_at' | 'created_by'>> & {
  updated_by: string;  // Always required on update
};


// =============================================================================
// VERSIONING — MAJOR.MINOR.PATCH (Phase 2)
// =============================================================================
//
// Communication hierarchy (maps to restaurant culture):
//   Patch  (1.0.0 → 1.0.1) — Note on the board. Typo fix, formatting.
//                              "Trust us, carry on." No action needed.
//   Minor  (1.0.x → 1.1.0) — Pre-shift mention. Substantive but optional review.
//                              "Worth a read when you get a minute."
//   Major  (1.x.x → 2.0.0) — All-hands meeting. New regs, changed procedures.
//                              "Everyone reads, everyone signs." Re-acknowledgment required.
//
// Same hierarchy applies to Recipe versioning (see Recipe Manager module).
// =============================================================================

export type VersionBumpType = 'patch' | 'minor' | 'major';

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Parse "1.2.3" → { major: 1, minor: 2, patch: 3 }. Falls back to { 1, 0, 0 }. */
export function parseVersion(version: string): ParsedVersion {
  const parts = (version || '1.0.0').split('.').map(Number);
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/** Format { major, minor, patch } → "1.2.3" */
export function formatVersion(v: ParsedVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** Bump a version string by type. Returns the new version string. */
export function bumpVersion(current: string, type: VersionBumpType): string {
  const v = parseVersion(current);
  switch (type) {
    case 'patch':
      return formatVersion({ ...v, patch: v.patch + 1 });
    case 'minor':
      return formatVersion({ ...v, minor: v.minor + 1, patch: 0 });
    case 'major':
      return formatVersion({ major: v.major + 1, minor: 0, patch: 0 });
  }
}

/** Labels for the version bump selector UI */
export const VERSION_BUMP_LABELS: Record<VersionBumpType, { label: string; description: string; icon: string }> = {
  patch: {
    label: 'Patch',
    description: 'Typo or formatting fix — no review needed',
    icon: '📌',
  },
  minor: {
    label: 'Minor Update',
    description: 'Worth a read — broadcast to team',
    icon: '📋',
  },
  major: {
    label: 'Major Revision',
    description: 'Everyone re-reads & re-signs',
    icon: '📢',
  },
};


// =============================================================================
// ACKNOWLEDGMENT (relational row from `policy_acknowledgments` table)
// =============================================================================

export type AcknowledgmentStatus = 'pending' | 'acknowledged' | 'expired' | 'waived';

/**
 * PolicyAcknowledgment — one row from the `policy_acknowledgments` table.
 * Phase 3 implementation — typed now for foreign key readiness.
 */
export interface PolicyAcknowledgment {
  id: string;
  organization_id: string;
  policy_id: string;
  policy_version: string;
  team_member_id: string;

  // Status
  status: AcknowledgmentStatus;

  // Acknowledgment
  acknowledged_at: string | null;
  signature_data: string | null;
  ip_address: string | null;       // DB type: INET. Supabase returns as string.
  user_agent: string | null;

  // Assessment
  assessment_score: number | null;  // DB type: NUMERIC(5,2). Supabase returns as number.
  assessment_passed: boolean | null;
  assessment_attempts: number;
  last_attempt_at: string | null;

  // Expiry
  expires_at: string | null;
  reminder_sent_at: string[] | null; // DB type: TIMESTAMPTZ[]. Supabase returns as string[].

  // System
  created_at: string;
  updated_at: string;
}
