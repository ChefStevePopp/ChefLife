# NEXT SESSION PROMPT — HR Policy Phase 3: Acknowledgments & Team Auth

**Paste this at the start of your next session.**

---

## Context

You're continuing work on ChefLife, a commercial restaurant management platform built in React/TypeScript/Supabase. Steve is the Chef/Owner creator. You are his architecture partner.

Sessions 68-71 built the HR & Policies module through Phase 2. The foundation is solid:
- Relational `policies` table with full lifecycle (draft/published/archived)
- MAJOR.MINOR.PATCH versioning with restaurant communication hierarchy
- PolicyUploadForm with soft toggles, plain-English explainers, dirty-state protection
- PolicyCard visual entity cards with category hero images
- CategoryManager with drag-reorder and image upload
- NEXUS event system already logging policy_uploaded, policy_updated events
- Type system cleaned up — single source of truth in `types/policies.ts`
- `policy_acknowledgments` table already exists in migration (schema ready, not yet populated)
- `PolicyAcknowledgment` type already defined and waiting

## What We're Building (Phase 3)

The acknowledgment system — the part where team members actually read and sign policies. This is the legal receipt layer.

### Key Files to Read First

1. `docs/handoffs/HANDOFF-SESSION-71-PolicyForm-UX-TypeCleanup.md` — most recent handoff, has the full architecture state diagram and phase status
2. `docs/handoffs/HANDOFF-SESSION-70-HR-Policy-Architecture.md` — the roadmap session, covers the full 9-phase plan
3. `docs/CHEFLIFE-ANATOMY.md` — search for "Compliance Shield" and "Type System Architecture" (v2.1 sections)
4. `src/types/policies.ts` — canonical types including PolicyAcknowledgment
5. `supabase/migrations/20260204_create_policies_tables.sql` — the acknowledgments table schema
6. `src/lib/policy-data-service.ts` — existing CRUD service (modern path)
7. `src/features/admin/components/sections/PoliciesManager/index.tsx` — compliance dashboard (has placeholder zeros to wire up)

### The Auth Question

ChefLife uses a 7shifts-style auth model:
- First user = admin/account owner (Alpha role)
- Admin invites team members (Bravo through Echo security levels)
- Team members already have accounts and use ChefLife daily (recipes, task lists, build diagrams)
- Policy acknowledgment is just another feature in the app they already use

The `policy_acknowledgments` table needs a self-write RLS policy so team members can insert their own acknowledgment rows. The migration has a deferred comment about this — `organization_team_members` needs a `user_id` column or equivalent auth lookup.

### What Needs Building

1. **Team member self-write RLS** — so a logged-in team member can acknowledge policies assigned to them
2. **Acknowledgment data service** — `lib/acknowledgment-data-service.ts` following the same pattern as `policy-data-service.ts`
3. **User-side read-and-confirm flow** — PDF viewer, scroll, tap "I have read and understand this policy"
4. **New NEXUS event types** — `policy_ack_required`, `policy_ack_completed`, `policy_ack_overdue`
5. **Wire real counts into PoliciesManager** — replace the placeholder zeros with actual acknowledgment joins
6. **Team tab Policy Compliance card** — sits alongside Attendance Today and Coaching Flags in Team Vitals

### Design Principles

- Built for the 22-year-old shift lead, not an HR department
- Legal receipt = who + what version + when + where (IP/device) + proof (optional signature)
- Same L5/L6 visual standards as everything else in ChefLife
- NEXUS handles all event routing — no separate notification infrastructure
- Types go in `types/policies.ts` (single source of truth)
- Snake_case types matching DB columns (no mapping layer)

### The "No What-The-Hell" Test

A developer opening this code for the first time should understand the acknowledgment flow in under 2 minutes by reading the types and the data service. If they can't, we failed.
