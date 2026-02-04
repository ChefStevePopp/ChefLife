# ROADMAP-POLICY
## ChefLife HR Policy & Compliance Module — Commercial Product Architecture

**Document:** ROADMAP-POLICY  
**Version:** 1.0  
**Created:** 2026-02-03  
**Author:** Steve + Claude (architecture session)  
**Status:** Draft — awaiting Steve's review before implementation begins  
**Scope:** Design for 1,000+ organizations, 20,000+ team members, 50,000+ acknowledgment records

---

## 1. Vision

Every independent restaurant deserves the same compliance infrastructure as a corporate chain — without the corporate overhead. ChefLife's policy module should make it effortless for a chef-owner to upload a policy, get every applicable team member to read and sign it, know instantly who hasn't, and hand a compliance report to a health inspector with confidence.

**People over profit. Smiles over savings. Compassion over commerce.**  
The policy system exists to protect the team, not to police them.

---

## 2. Where We Are Today (Honest Assessment)

### What Works
- PolicyTemplate type system — thoughtful fields (applicability, recertification, versioning)
- CategoryManager — solid L5/L6 CRUD with baseball card UI, image uploads, reorder
- PolicyUploadForm — full metadata capture, PDF upload to Supabase storage
- PolicyCard — collapsible display with dynamic category resolution
- Schema separation — policyList vs policies settings (bug fixed 2026-02-03)

### What's Missing (the 90%)
- No acknowledgment tracking (the entire point of the module)
- No team-member-facing experience
- No compliance dashboard with real data
- No publishing workflow (draft vs live)
- No testing/assessment capability
- No certification tracking (external credentials)
- No template library (every org writes from scratch)
- **Policies stored in JSONB** — this is the architectural elephant in the room

### The JSONB Problem

Right now, `PolicyTemplate[]` lives inside `organizations.modules` as a JSONB array. This was fine for prototyping — one org, a few policies, quick reads.

At 1,000 organizations:

| Concern | JSONB (current) | Relational (needed) |
|---------|----------------|---------------------|
| Query "all policies expiring this month" | Full table scan, parse every org's JSONB blob | `WHERE next_review_date < '2026-03-01'` — indexed |
| Query "how many orgs use Food Safety category" | Impossible without parsing all blobs | `GROUP BY category` — trivial |
| Add a field to PolicyTemplate | Works (flexible schema) | Migration needed |
| Policy has 50 acknowledgment records | Can't store in JSONB (too transactional) | Foreign key to policies table |
| Concurrent edits (two admins editing different policies) | Last write wins, data loss risk | Row-level locking, safe |
| Full-text search across all policies | Not possible | `tsvector` column, instant |
| Audit trail (who changed what, when) | No history — overwritten in place | Trigger-based audit log |
| Storage at 1,000 orgs × 20 policies | 20,000 policies in JSONB blobs = slow reads | 20,000 rows = normal table |

**Decision: Policies must become a relational table.** Categories stay in JSONB config (they're org settings, low-volume, read-heavy). Acknowledgments are relational from day one.

---

## 3. Data Architecture (1,000 Org Scale)

### 3.1 New Tables

#### `policies`
The policy document itself. One row per policy per organization.

```sql
CREATE TABLE policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- IDENTITY
  title           TEXT NOT NULL,
  description     TEXT,
  category_id     TEXT NOT NULL,          -- References PolicyCategoryConfig.id in org JSONB
  
  -- DOCUMENT
  document_url    TEXT,                   -- Supabase storage path to PDF
  version         TEXT NOT NULL DEFAULT '1.0',
  
  -- STATUS & LIFECYCLE
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'archived')),
  is_active       BOOLEAN NOT NULL DEFAULT true,  -- Soft-delete / visibility toggle
  
  -- POLICY DATES
  effective_date    DATE NOT NULL,
  prepared_date     DATE,
  last_revision_date DATE,
  
  -- AUTHORSHIP
  prepared_by     TEXT,
  author_title    TEXT,
  
  -- REVIEW SCHEDULE
  review_schedule TEXT NOT NULL DEFAULT 'annual'
                  CHECK (review_schedule IN ('quarterly','semi_annual','annual','biennial','as_needed')),
  next_review_date DATE,
  
  -- ACKNOWLEDGMENT CONFIG
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  recertification_required BOOLEAN NOT NULL DEFAULT false,
  recertification_interval TEXT DEFAULT 'annual'
                  CHECK (recertification_interval IN ('none','30_days','90_days','180_days','annual','biennial','custom')),
  recertification_custom_days INT,
  
  -- APPLICABILITY (who must acknowledge — empty = everyone)
  applicable_departments     TEXT[] DEFAULT '{}',
  applicable_scheduled_roles TEXT[] DEFAULT '{}',
  applicable_kitchen_stations TEXT[] DEFAULT '{}',
  
  -- ASSESSMENT (optional quiz — JSONB is fine here, read-heavy, write-rare)
  assessment      JSONB,     -- { enabled, passingScore, maxAttempts, questions[] }
  
  -- VERSIONING
  superseded_by   UUID REFERENCES policies(id),  -- Points to replacement policy
  previous_version UUID REFERENCES policies(id), -- Points to prior version
  
  -- PUBLISHING
  published_at    TIMESTAMPTZ,
  published_by    UUID,
  archived_at     TIMESTAMPTZ,
  
  -- SYSTEM
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID NOT NULL,
  
  CONSTRAINT unique_policy_version UNIQUE (organization_id, title, version)
);

-- INDEXES
CREATE INDEX idx_policies_org ON policies(organization_id);
CREATE INDEX idx_policies_org_status ON policies(organization_id, status);
CREATE INDEX idx_policies_org_category ON policies(organization_id, category_id);
CREATE INDEX idx_policies_review_date ON policies(next_review_date) WHERE status = 'published';
CREATE INDEX idx_policies_search ON policies USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

#### `policy_acknowledgments`
The transactional heart of the system. One row per team member per policy version.

```sql
CREATE TABLE policy_acknowledgments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  policy_id       UUID NOT NULL REFERENCES policies(id),
  policy_version  TEXT NOT NULL,          -- Snapshot of version at time of ack
  team_member_id  UUID NOT NULL REFERENCES organization_team_members(id),
  
  -- STATUS
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'acknowledged', 'expired', 'waived')),
  
  -- ACKNOWLEDGMENT
  acknowledged_at TIMESTAMPTZ,
  signature_data  TEXT,                   -- Base64 signature image (if digital sig enabled)
  ip_address      INET,                  -- Audit trail
  user_agent      TEXT,                   -- Audit trail (device info)
  
  -- ASSESSMENT RESULTS
  assessment_score     NUMERIC(5,2),      -- Percentage score
  assessment_passed    BOOLEAN,
  assessment_attempts  INT DEFAULT 0,
  last_attempt_at      TIMESTAMPTZ,
  
  -- EXPIRY
  expires_at      TIMESTAMPTZ,            -- Calculated from recertification interval
  reminder_sent_at TIMESTAMPTZ[],         -- Track which reminders have been sent
  
  -- SYSTEM
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One ack record per team member per policy version
  CONSTRAINT unique_ack UNIQUE (policy_id, policy_version, team_member_id)
);

-- INDEXES
CREATE INDEX idx_acks_org ON policy_acknowledgments(organization_id);
CREATE INDEX idx_acks_policy ON policy_acknowledgments(policy_id);
CREATE INDEX idx_acks_member ON policy_acknowledgments(team_member_id);
CREATE INDEX idx_acks_status ON policy_acknowledgments(organization_id, status);
CREATE INDEX idx_acks_expiry ON policy_acknowledgments(expires_at) WHERE status = 'acknowledged';
CREATE INDEX idx_acks_pending ON policy_acknowledgments(organization_id) WHERE status = 'pending';
```

#### `certifications` (Phase 6)
External credentials with expiry tracking — separate from policy acknowledgment.

```sql
CREATE TABLE certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_member_id  UUID NOT NULL REFERENCES organization_team_members(id),
  
  -- CREDENTIAL
  type_id         TEXT NOT NULL,          -- References certificationTypes[] in HRConfig
  type_label      TEXT NOT NULL,          -- Denormalized for display (e.g., "Food Handler")
  certificate_number TEXT,
  issuing_authority TEXT,
  
  -- DATES
  issued_date     DATE NOT NULL,
  expiry_date     DATE,                   -- NULL = does not expire
  
  -- DOCUMENT
  document_url    TEXT,                   -- Scan/photo of certificate
  
  -- STATUS
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'revoked', 'pending_renewal')),
  verified_by     UUID,                   -- Admin who verified the certificate
  verified_at     TIMESTAMPTZ,
  
  -- SYSTEM
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_cert UNIQUE (organization_id, team_member_id, type_id)
);

CREATE INDEX idx_certs_org ON certifications(organization_id);
CREATE INDEX idx_certs_member ON certifications(team_member_id);
CREATE INDEX idx_certs_expiry ON certifications(expiry_date) WHERE status = 'active';
```

### 3.2 Existing Tables (Changes)

#### `organizations.modules` (JSONB — stays)
Categories, settings, and configuration remain in JSONB. They're org-level preferences, not transactional data.

```jsonc
{
  "hr": {
    "config": {
      // Settings object (stays as-is)
      "policies": {
        "enabled": true,
        "policyCategories": [...],        // CategoryManager data — stays in JSONB
        "defaultRecertificationInterval": "annual",
        "defaultReviewSchedule": "annual",
        "reminderDaysBefore": [30, 14, 7, 1],
        "digitalSignaturesEnabled": true
      },
      // policyList REMOVED after migration to relational table
      // "policyList": [...]  ← migrated to policies table, then deleted
    }
  }
}
```

### 3.3 Migration Path (JSONB → Relational)

This is the most delicate operation. Every org's `policyList` array needs to become rows in the `policies` table, and existing data must be preserved exactly.

```
Phase 1: Create policies table (empty)
Phase 2: Migration script reads every org's policyList from JSONB
         → inserts rows into policies table
         → preserves all metadata (dates, versions, applicability)
         → maps document_url paths (no storage migration needed — PDFs stay in place)
Phase 3: Update frontend to read from policies table (Supabase query) instead of JSONB
Phase 4: After verification period, remove policyList from JSONB
```

**Key safety measure:** The migration script should be idempotent and non-destructive. Run it once, verify, run it again (no-op), then clean up. Never delete JSONB data until the relational version is confirmed working.

### 3.4 Volume Projections

| Metric | Year 1 (100 orgs) | Year 2 (500 orgs) | Year 3 (1,000 orgs) |
|--------|-------------------|-------------------|---------------------|
| Policies | ~1,500 | ~7,500 | ~15,000 |
| Acknowledgment records | ~15,000 | ~150,000 | ~500,000 |
| Certifications | ~2,000 | ~10,000 | ~25,000 |
| Storage (PDFs) | ~5 GB | ~25 GB | ~50 GB |
| Storage (category images) | ~50 MB | ~250 MB | ~500 MB |

These are well within Supabase's capabilities. No special infrastructure needed.

### 3.5 RLS Strategy

All three tables follow the same pattern:

```sql
-- SELECT: Org members can read their org's data
-- INSERT/UPDATE/DELETE: Alpha/Bravo (security_level <= 2) + Omega (dev)
-- Team member self-service: members can INSERT their own acknowledgment records
```

The acknowledgment table has a special case: team members need to write their own records (signing a policy), but they can't modify or delete anyone else's.

---

## 4. Product Architecture (What Users See)

### 4.1 Admin Experience

#### Settings Tab (CategoryManager — exists, enhance)
- **Current:** CRUD for categories with baseball card UI, image uploads, reorder
- **Add:** Description field, policy count badge, category-level defaults
- **Add:** Compliance indicator (green/amber/red) showing ack status per category

#### Policies Tab (PoliciesTabContent — exists, rework)
- **Current:** Upload form, card grid, view/edit/delete
- **Rework:** Read from `policies` table instead of JSONB
- **Add:** Status badges (draft/published/archived) on PolicyCard
- **Add:** Acknowledgment progress bar on PolicyCard (e.g., "12 of 15 acknowledged")
- **Add:** Publish/unpublish action (one-click status change)
- **Add:** Version history (superseded_by chain)
- **Add:** "Send reminder" bulk action for overdue acknowledgments
- **Add:** Filter/sort by status, category, compliance %

#### Compliance Dashboard (new — replaces placeholder link)
The command center. Answers the question every restaurant owner dreads: "Are we compliant?"

**Dashboard cards:**
- Overall compliance % (acknowledged / required across all published policies)
- Overdue count (acknowledgments past due)
- Expiring this month (recertifications + certifications)
- Policies pending review (next_review_date approaching)

**Views:**
- **By Policy:** Each published policy with progress bar, list of pending team members
- **By Person:** Each team member with their policy status (acknowledged, pending, overdue)
- **By Category:** Category-level compliance % with drill-down
- **Calendar:** Expiry timeline for recertifications and certifications
- **Export:** PDF/CSV compliance report for health inspectors, WSIB audits

#### Assessment Builder (new — Phase 5)
- Embedded in PolicyUploadForm (optional section)
- Question types: multiple choice, true/false
- Pass/fail threshold (default 80%)
- Max attempts (default 3, 0 = unlimited)
- Question explanation (shown after answering)
- Preview/test mode for admin

### 4.2 Team Member Experience

This is the other half of the product — the part that doesn't exist yet.

#### "My Policies" View
Accessible from the team member's main navigation. Shows:

**Needs Attention** (top, urgency-colored):
- New policies requiring acknowledgment (unread)
- Overdue recertifications
- Failed assessments (retake available)

**Acknowledged** (below, calm):
- Previously signed policies with dates
- Upcoming recertification dates

#### Read & Sign Flow
```
1. Team member opens policy from "My Policies"
2. PDF viewer shows the document (in-app or new tab)
3. "I have read and understood this policy" checkbox
4. If assessment enabled: quiz questions appear
   → Must pass to proceed (score shown, retake if failed)
5. If digital signature enabled: signature pad appears
6. Submit → timestamp recorded → status changes to "acknowledged"
7. Confirmation screen with summary
```

#### Mobile Experience
Kitchen staff will do this on their phones during a break or before a shift. The entire flow must work on a 375px screen. The PDF viewer should offer a "summary" option for mobile (key points extracted from the PDF) alongside the full document link.

### 4.3 Notification Touchpoints

Integration with the Communications module (when built):

| Trigger | Notification | Channel |
|---------|-------------|---------|
| Policy published | "New policy requires your acknowledgment" | In-app + email |
| 30 days before recertification | "Your [Policy] acknowledgment expires in 30 days" | In-app |
| 14 days before recertification | Reminder | In-app + email |
| 7 days before recertification | Urgent reminder | In-app + email |
| 1 day before recertification | Final notice | In-app + email + SMS (if configured) |
| Recertification expired | "Your [Policy] acknowledgment has expired" | In-app + email |
| Assessment failed | "You did not pass the [Policy] assessment. You have X attempts remaining." | In-app |
| Certification expiring | "[Cert] expires in X days" | In-app + email |

---

## 5. Template Library (The Product Differentiator)

This is what separates ChefLife from "just another form builder." Most independent restaurants don't have an HR department writing policies. They need ready-made, legally reviewed templates they can adopt with confidence.

### 5.1 Concept

ChefLife ships a curated library of policy templates organized by jurisdiction and category. Restaurant owners browse the library, adopt templates they need, customize them with their restaurant's name and specifics, and publish.

### 5.2 Architecture

```sql
CREATE TABLE policy_templates_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IDENTITY
  title           TEXT NOT NULL,
  description     TEXT,
  category_id     TEXT NOT NULL,
  
  -- CONTENT
  document_url    TEXT NOT NULL,          -- Master PDF in ChefLife storage
  summary         TEXT,                   -- Key points for mobile viewing
  
  -- JURISDICTION
  jurisdiction    TEXT NOT NULL,          -- 'ON', 'BC', 'QC', 'ALL', etc.
  legal_references TEXT[],               -- e.g., ['OHSA s.25(2)(h)', 'O.Reg 851 s.45']
  
  -- METADATA
  version         TEXT NOT NULL DEFAULT '1.0',
  last_reviewed   DATE,                  -- When ChefLife last reviewed for accuracy
  reviewed_by     TEXT,                  -- Legal reviewer name
  
  -- REQUIREMENTS
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  recommended_assessment  BOOLEAN NOT NULL DEFAULT false,
  recommended_recertification TEXT DEFAULT 'annual',
  
  -- SYSTEM
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 Starter Library (Ontario Focus)

| Category | Policy | Jurisdiction | Assessment? |
|----------|--------|-------------|-------------|
| Health & Safety | Occupational Health & Safety Policy | ON (OHSA) | Yes |
| Health & Safety | WHMIS / GHS Policy | ON (OHSA) | Yes |
| Health & Safety | Workplace Violence & Harassment Prevention | ON (Bill 168) | Yes |
| Health & Safety | Emergency Procedures | ALL | No |
| Health & Safety | First Aid Policy | ON (Reg 1101) | No |
| Food Safety | Food Safety / HACCP Policy | ON (HPPA) | Yes |
| Food Safety | Allergen Management Policy | ALL | Yes |
| Food Safety | Temperature Control & Monitoring | ALL | Yes |
| Employment & HR | Employment Standards Overview | ON (ESA) | No |
| Employment & HR | Attendance & Punctuality | ALL | No |
| Employment & HR | Progressive Discipline | ALL | No |
| Employment & HR | Accessibility (AODA) | ON (AODA) | No |
| Workplace Conduct | Code of Conduct | ALL | No |
| Workplace Conduct | Anti-Discrimination & Human Rights | ON (OHRC) | No |
| Workplace Conduct | Social Media Policy | ALL | No |
| Workplace Conduct | Substance Use Policy | ALL | No |
| Operations | Cash Handling & POS | ALL | No |
| Operations | Opening & Closing Procedures | ALL | No |
| Operations | Equipment Use & Maintenance | ALL | No |
| Technology & Privacy | Privacy Policy (Employee Data) | ON (PIPEDA) | No |
| Training | New Hire Orientation Checklist | ALL | No |
| Training | Cross-Training Guidelines | ALL | No |

### 5.4 Adopt Flow

```
1. Admin browses template library (filtered by their province/state)
2. Clicks "Adopt this policy"
3. ChefLife copies the template PDF to the org's storage
4. Pre-fills PolicyUploadForm with template metadata
5. Admin customizes: restaurant name, effective date, any org-specific amendments
6. Saves as their policy (now in their policies table, disconnected from template)
7. Template library shows "Adopted ✓" badge
```

### 5.5 Template Updates

When ChefLife updates a template (law change, best practice update), orgs that adopted it get a notification: "The WHMIS Policy template has been updated to reflect [change]. Review and update your version?" This is advisory, not automatic — the org's policy is their own.

---

## 6. Implementation Phases

### Phase 0: Foundation Fixes (Current Session — 2026-02-03)
**Scope:** Fix what's broken before building forward.

- [x] Schema collision fix (policyList vs policies) — done 2026-02-03
- [x] SQL migration: rescue policies from mangled JSONB — written
- [x] SQL migration: open policy-documents bucket to images — written
- [x] CategoryManager bucket swap (Logos → policy-documents) — done
- [ ] CategoryManager bug: inline image remove → call handleImageRemove
- [ ] CategoryManager: add description field to PolicyCategoryConfig
- [ ] CategoryManager: add policy count badge to cards

### Phase 1: Relational Migration
**Scope:** Move policies from JSONB to their own table. No new features — same UI, better foundation.

- [ ] Create `policies` table (SQL migration)
- [ ] Create RLS policies for `policies` table
- [ ] Migration script: JSONB policyList → policies table rows
- [ ] Update PoliciesTabContent to query `policies` table
- [ ] Update PolicyUploadForm to insert/update `policies` table
- [ ] Update PolicyCard to read from query results (not JSONB)
- [ ] Update delete handler to delete from `policies` table
- [ ] Verification period — confirm all data intact
- [ ] Remove policyList from JSONB (cleanup migration)
- [ ] Update PolicyTemplate TypeScript type to match table columns

### Phase 2: Publishing Workflow
**Scope:** Give policies a lifecycle. Draft → Published → Archived.

- [ ] Add `status` column to policies table (default: 'draft')
- [ ] PolicyCard: status badge (draft=gray, published=green, archived=amber)
- [ ] PolicyCard: publish/unpublish action button
- [ ] PoliciesTabContent: filter by status
- [ ] PolicyUploadForm: status selector (draft/published)
- [ ] Archive flow: mark as archived, set superseded_by reference
- [ ] Version history: link previous_version → superseded_by chain

### Phase 3: Acknowledgment System (The Core)
**Scope:** The reason the module exists. Team members read and sign policies.

- [ ] Create `policy_acknowledgments` table (SQL migration)
- [ ] Create RLS policies (admin read all, team member self-write)
- [ ] Publishing trigger: create pending acknowledgment records for applicable team members
- [ ] PolicyCard: acknowledgment progress bar (X of Y)
- [ ] Compliance Dashboard: overall %, per-policy, per-person views
- [ ] "My Policies" view for team members
- [ ] Read & sign flow (checkbox + timestamp)
- [ ] Recertification expiry calculation (auto-set expires_at)
- [ ] Overdue detection query
- [ ] "Send reminder" action for admins

### Phase 4: Digital Signatures
**Scope:** Signature capture for audit-grade acknowledgments.

- [ ] Signature pad component (canvas-based, mobile-friendly)
- [ ] Store signature_data as base64 on acknowledgment record
- [ ] Display signature in acknowledgment detail view
- [ ] Optional per-org toggle (digitalSignaturesEnabled already in config)

### Phase 5: Assessment / Testing
**Scope:** Verify understanding, not just "I clicked the button."

- [ ] AssessmentQuestion TypeScript type
- [ ] Assessment builder in PolicyUploadForm (optional section)
- [ ] Question types: multiple choice, true/false
- [ ] Pass/fail threshold, max attempts
- [ ] Assessment UI in team member sign flow
- [ ] Score recording on acknowledgment record
- [ ] Failed attempt handling (retake, lockout after max attempts)
- [ ] Assessment analytics on Compliance Dashboard

### Phase 6: Certification Tracking
**Scope:** External credentials (Food Handler, Smart Serve, First Aid, WHMIS).

- [ ] Create `certifications` table (SQL migration)
- [ ] Certification type configuration in HRConfig (already stubbed)
- [ ] CertificationCard component
- [ ] Upload certificate scan/photo
- [ ] Expiry tracking + alerts
- [ ] Per-person certification status view
- [ ] Compliance Dashboard integration
- [ ] "Certifications" tab UI (replace "Coming Soon")

### Phase 7: Template Library
**Scope:** ChefLife-curated policy templates. The product differentiator.

- [ ] Create `policy_templates_library` table
- [ ] Seed with Ontario starter library (20+ templates)
- [ ] Template browser UI (filterable by category, jurisdiction)
- [ ] Adopt flow (copy template → pre-fill PolicyUploadForm)
- [ ] "Adopted" badge on template cards
- [ ] Template update notifications

### Phase 8: Notifications & Distribution
**Scope:** Connect to Communications module.

- [ ] Publish trigger → create notification for applicable team members
- [ ] Recertification reminder schedule (30/14/7/3/1 days)
- [ ] Certification expiry reminders
- [ ] Email delivery (Communications module integration)
- [ ] In-app notification badges

### Phase 9: Compliance Reporting
**Scope:** Export-ready reports for health inspectors, WSIB, and HR audits.

- [ ] PDF compliance report generator
- [ ] Per-policy acknowledgment report (who signed, when, signature)
- [ ] Per-person compliance summary
- [ ] Certification validity report
- [ ] Date-range filtering
- [ ] Print-optimized layout
- [ ] Export to CSV

---

## 7. Architecture Decisions Log

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| ADR-001 | Policies move from JSONB to relational table | JSONB can't support acknowledgment foreign keys, cross-org queries, indexing, or concurrent edits at scale | 2026-02-03 |
| ADR-002 | Categories stay in JSONB | Org-level settings, low volume, read-heavy, no cross-org queries needed | 2026-02-03 |
| ADR-003 | Acknowledgments are relational from day one | High volume transactional data, needs indexing, foreign keys, and efficient dashboard queries | 2026-02-03 |
| ADR-004 | Assessment questions stored as JSONB on policy row | Read-heavy, write-rare, co-located with the policy they belong to, no cross-policy query need | 2026-02-03 |
| ADR-005 | Template library is a separate table from org policies | Templates are ChefLife-owned, orgs adopt copies. No tight coupling — org can diverge freely | 2026-02-03 |
| ADR-006 | Digital signatures stored as base64 on acknowledgment row | Simple, no additional storage infrastructure, viewable inline in compliance reports | 2026-02-03 |
| ADR-007 | Certifications are separate from policy acknowledgments | Different lifecycle (external vs internal), different expiry model, different data shape | 2026-02-03 |
| ADR-008 | Category images stored in policy-documents bucket | Same RLS, same org-scoping, no new bucket needed. Path: `{orgId}/policy-categories/{catId}.webp` | 2026-02-03 |
| ADR-009 | RLS follows existing ChefLife pattern | SELECT: all org members. Write: Alpha/Bravo + Omega. Self-write: team members can acknowledge their own policies | 2026-02-03 |

---

## 8. Key Metrics (How We Know It's Working)

### Product Metrics
- **Adoption rate:** % of orgs with ≥1 published policy
- **Coverage:** Average policies per org
- **Compliance rate:** % of required acknowledgments completed
- **Time to acknowledge:** Median days from policy publish to team acknowledgment
- **Assessment pass rate:** First-attempt pass % (indicates policy clarity)
- **Template adoption:** % of orgs using at least one ChefLife template

### Technical Metrics
- **Query performance:** Compliance dashboard load time < 500ms at 1,000 orgs
- **Storage efficiency:** Average PDF size, category image size
- **Acknowledgment throughput:** Records per minute during peak (shift change)
- **Migration success:** Zero data loss during JSONB → relational migration

---

## 9. Open Questions (For Steve)

1. **Assessment complexity:** Simple (multiple choice + true/false) or do we need scenario-based questions with narrative answers? The simple version ships in Phase 5; scenarios would need an LLM grading layer.

2. **Multi-location policies:** Memphis Fire is single-location. When an org has 3 locations, should policies be org-wide or location-specific? (Recommendation: org-wide with optional location applicability filter, like the existing department/role/station filters.)

3. **Policy versioning:** When an admin edits a published policy, should it create a new version automatically (v1.0 → v1.1) and require re-acknowledgment? Or should minor edits be allowed without triggering re-ack? (Recommendation: explicit "Create New Version" action for substantive changes, silent edits for typo fixes.)

4. **Template library business model:** Free with ChefLife? Premium tier? Per-template purchase? (Recommendation: free starter library included, premium templates for specialized compliance like AODA deep-dive or HACCP plans.)

5. **Third-party integrations:** Do orgs need to import policies from existing systems (Google Drive, Dropbox)? Or is upload-from-file sufficient? (Recommendation: file upload only for v1. Google Drive import as a future enhancement.)

6. **Jurisdiction expansion:** Ontario first, then which provinces? When do we tackle US states? (Recommendation: Ontario → BC → Alberta → Quebec, then US starting with states with large independent restaurant populations: California, Texas, New York, Florida.)

---

## 10. File Reference Map

Current files involved in the policy system:

```
src/types/modules.ts
  ├── PolicyTemplate (interface)
  ├── PolicyCategoryConfig (interface)
  ├── HRConfig (interface)
  ├── DEFAULT_POLICY_CATEGORIES (constant)
  └── Supporting types (RecertificationInterval, ReviewSchedule, etc.)

src/features/admin/components/sections/HRSettings/
  ├── index.tsx
  │   ├── HRSettings (main component)
  │   ├── PoliciesTabContent (policy CRUD)
  │   └── SettingsTabContent (config + CategoryManager host)
  └── components/
      ├── CategoryManager.tsx     ← Categories CRUD with baseball cards
      ├── PolicyCard.tsx          ← Collapsible policy display card
      └── PolicyUploadForm.tsx    ← Policy creation/edit form

supabase/migrations/
  ├── 20260201_add_modules_to_organizations.sql
  ├── 20260201_migrate_hr_data_to_modules.sql
  ├── 20260203_migrate_policies_to_policylist.sql    ← Schema collision fix
  ├── 20260203_policy_documents_allow_images.sql     ← Bucket MIME types
  └── policy_documents_bucket_rls.sql

src/shared/components/
  └── ImageUploadModal.tsx        ← Shared image upload with crop/preview

src/utils/
  └── imageOptimization.ts        ← optimizeImage() utility (WebP, resize)
```

---

## 11. Session Handoff Notes

When picking up this roadmap in a future session:

1. **Read this document first** — it's the single source of truth for the policy module architecture.
2. **Check which Phase 0 items are still pending** — CategoryManager fixes may or may not be done.
3. **Phase 1 (relational migration) is the critical path** — everything after depends on policies living in their own table.
4. **Don't skip the migration verification period** — run JSONB → relational migration, verify data, THEN update frontend, THEN clean up JSONB. Three separate steps, not one atomic change.
5. **The template library (Phase 7) is the product differentiator** — but it's not useful until the acknowledgment system (Phase 3) works. Templates without sign-off tracking are just documents in a bucket.

---

*"Keep communication consistent, keep commerce kind, and keep your culture cool and comfortable."*
