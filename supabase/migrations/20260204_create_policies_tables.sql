-- =============================================================================
-- PHASE 1: Create policies + policy_acknowledgments tables
-- =============================================================================
-- ROADMAP-Policy.md §3.1 — Relational foundation for 1,000+ organizations
-- ADR-001: Policies move from JSONB to relational table
-- ADR-003: Acknowledgments are relational from day one
--
-- This migration creates the tables, indexes, and RLS policies.
-- Data migration from JSONB is handled in a separate idempotent script.
-- =============================================================================

-- =============================================
-- 1. POLICIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- IDENTITY
  title             TEXT NOT NULL,
  description       TEXT,
  category_id       TEXT NOT NULL,          -- References PolicyCategoryConfig.id in org JSONB config

  -- DOCUMENT
  document_url      TEXT,                   -- Supabase storage path to PDF
  version           TEXT NOT NULL DEFAULT '1.0',

  -- STATUS & LIFECYCLE
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  is_active         BOOLEAN NOT NULL DEFAULT true,

  -- POLICY DATES
  effective_date      DATE NOT NULL,
  prepared_date       DATE,
  last_revision_date  DATE,

  -- AUTHORSHIP
  prepared_by       TEXT,
  author_title      TEXT,

  -- REVIEW SCHEDULE
  review_schedule   TEXT NOT NULL DEFAULT 'annual'
                    CHECK (review_schedule IN ('quarterly','semi_annual','annual','biennial','as_needed')),
  next_review_date  DATE,

  -- ACKNOWLEDGMENT CONFIG
  requires_acknowledgment   BOOLEAN NOT NULL DEFAULT true,
  recertification_required  BOOLEAN NOT NULL DEFAULT false,
  recertification_interval  TEXT DEFAULT 'none'
                    CHECK (recertification_interval IN ('none','30_days','90_days','180_days','annual','biennial','custom')),
  recertification_custom_days INT,

  -- APPLICABILITY (who must acknowledge — empty = everyone)
  applicable_departments      TEXT[] DEFAULT '{}',
  applicable_scheduled_roles  TEXT[] DEFAULT '{}',
  applicable_kitchen_stations TEXT[] DEFAULT '{}',

  -- ASSESSMENT (optional quiz — JSONB is fine: read-heavy, write-rare)
  assessment        JSONB,

  -- VERSIONING (linked list of policy versions)
  superseded_by     UUID REFERENCES policies(id),
  previous_version  UUID REFERENCES policies(id),

  -- PUBLISHING
  published_at      TIMESTAMPTZ,
  published_by      UUID,
  archived_at       TIMESTAMPTZ,

  -- SYSTEM METADATA
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID NOT NULL,

  -- One version of a policy title per org
  CONSTRAINT unique_policy_version UNIQUE (organization_id, title, version)
);

-- INDEXES — designed for the queries that matter at scale
CREATE INDEX IF NOT EXISTS idx_policies_org
  ON policies(organization_id);

CREATE INDEX IF NOT EXISTS idx_policies_org_status
  ON policies(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_policies_org_category
  ON policies(organization_id, category_id);

CREATE INDEX IF NOT EXISTS idx_policies_review_date
  ON policies(next_review_date)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_policies_org_active
  ON policies(organization_id)
  WHERE is_active = true;

-- Full-text search across all policy titles and descriptions
CREATE INDEX IF NOT EXISTS idx_policies_search
  ON policies
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));


-- =============================================
-- 2. POLICY ACKNOWLEDGMENTS TABLE
-- =============================================
-- Created now (Phase 1) so foreign keys exist.
-- Populated in Phase 3 when the team-facing experience ships.
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id         UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  policy_version    TEXT NOT NULL,
  team_member_id    UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,

  -- STATUS
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'acknowledged', 'expired', 'waived')),

  -- ACKNOWLEDGMENT
  acknowledged_at   TIMESTAMPTZ,
  signature_data    TEXT,                   -- Base64 signature image
  ip_address        INET,                  -- Audit trail
  user_agent        TEXT,                   -- Audit trail (device info)

  -- ASSESSMENT RESULTS
  assessment_score      NUMERIC(5,2),
  assessment_passed     BOOLEAN,
  assessment_attempts   INT DEFAULT 0,
  last_attempt_at       TIMESTAMPTZ,

  -- EXPIRY
  expires_at            TIMESTAMPTZ,
  reminder_sent_at      TIMESTAMPTZ[],

  -- SYSTEM
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One ack record per team member per policy version
  CONSTRAINT unique_ack UNIQUE (policy_id, policy_version, team_member_id)
);

-- INDEXES — optimized for dashboard queries
CREATE INDEX IF NOT EXISTS idx_acks_org
  ON policy_acknowledgments(organization_id);

CREATE INDEX IF NOT EXISTS idx_acks_policy
  ON policy_acknowledgments(policy_id);

CREATE INDEX IF NOT EXISTS idx_acks_member
  ON policy_acknowledgments(team_member_id);

CREATE INDEX IF NOT EXISTS idx_acks_org_status
  ON policy_acknowledgments(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_acks_expiry
  ON policy_acknowledgments(expires_at)
  WHERE status = 'acknowledged';

CREATE INDEX IF NOT EXISTS idx_acks_pending
  ON policy_acknowledgments(organization_id)
  WHERE status = 'pending';


-- =============================================
-- 3. UPDATED_AT TRIGGER
-- =============================================
-- Auto-update updated_at on row changes (standard ChefLife pattern)
CREATE OR REPLACE FUNCTION update_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_policies_updated_at();

CREATE TRIGGER policy_acknowledgments_updated_at
  BEFORE UPDATE ON policy_acknowledgments
  FOR EACH ROW
  EXECUTE FUNCTION update_policies_updated_at();


-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================
-- Pattern: matches performance_cycles (20260104)
-- SELECT: any org member can read
-- ALL (insert/update/delete): owner or admin only

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- POLICIES — Read: all org members
CREATE POLICY "View policies"
  ON policies FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- POLICIES — Write: owner/admin only
CREATE POLICY "Manage policies"
  ON policies FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ACKNOWLEDGMENTS — Read: all org members
CREATE POLICY "View policy_acknowledgments"
  ON policy_acknowledgments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- ACKNOWLEDGMENTS — Admin manage all
CREATE POLICY "Manage policy_acknowledgments"
  ON policy_acknowledgments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ACKNOWLEDGMENTS — Team member self-write (Phase 3)
-- Deferred: organization_team_members doesn't have a user_id column yet.
-- When team-facing auth is built (Phase 3), add a policy like:
--   CREATE POLICY "Self acknowledge policies"
--     ON policy_acknowledgments FOR INSERT
--     WITH CHECK ( <team member auth lookup> );
-- For now, admin-only write via "Manage policy_acknowledgments" is sufficient.


-- =============================================
-- 5. REALTIME (optional — enable if needed)
-- =============================================
-- Uncomment if real-time subscriptions are needed for policy status updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE policies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE policy_acknowledgments;


-- =============================================
-- 6. VERIFICATION
-- =============================================
DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'policies') THEN
    RAISE EXCEPTION 'policies table was not created';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'policy_acknowledgments') THEN
    RAISE EXCEPTION 'policy_acknowledgments table was not created';
  END IF;

  RAISE NOTICE '✓ policies table created';
  RAISE NOTICE '✓ policy_acknowledgments table created';
  RAISE NOTICE '✓ Indexes created';
  RAISE NOTICE '✓ RLS policies applied';
  RAISE NOTICE '✓ Updated_at triggers installed';
  RAISE NOTICE 'Phase 1 schema ready — run data migration next.';
END $$;
