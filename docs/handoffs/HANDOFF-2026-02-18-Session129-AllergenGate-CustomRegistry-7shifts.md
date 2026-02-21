# HANDOFF — Session 129
## Allergen Review Gate UX + Custom Allergen Registry Roadmap + 7shifts Queue
**Date:** February 18, 2026
**Session:** 129
**Transcript:** `/mnt/transcripts/2026-02-18-23-24-37-allergen-review-gate-ux.txt`

---

## What Was Done

### 1. Allergen Review Gate — Two Bug Fixes

**Bug 1: Floating action bar "blip"**
- Root cause: `allergenReviewedRef` (useRef) doesn't trigger re-renders. The 
  `needsAllergenReview` useMemo read from the ref, but ref changes are invisible
  to React's render cycle. Bar would flash and vanish.
- Fix: Replaced entire ref-based system with state-based approach.
  - Removed `allergenReviewedRef` and `prevAllergenFingerprintRef`
  - Added `allergenReviewPending` useState
  - `needsAllergenReview` is now pure useMemo (no ref dependency)
  - `handleSave()` takes `skipAllergenGate` parameter
  - Floating bar visibility includes `|| needsAllergenReview`
  - Three-state button: "Review Allergens" → "Confirm & Save" → "Save Changes"

**Bug 2: Reset button nukes manual allergens → phantom MAJOR version bump**
- Root cause: RotateCcw button called `handleResetToAuto()` directly — one click
  wiped `allergenManualOverrides` to empty arrays. Hot Peppers (MANUAL) vanished.
  Change detection saw "CONTAINS allergen removed" → MAJOR bump.
- Fix: Two-click confirmation dropdown.
  - First click: shows popover listing every manual allergen that will be removed
  - Color-coded dots (rose=contains, amber=may contain, orange=promoted)
  - Cancel / Remove All buttons — explicit confirmation required

**Files changed:**
- `src/features/recipes/components/RecipeDetailPage/index.tsx`
- `src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx`

### 2. Custom Allergen Badge Fallback (Phase 0)

**Problem:** Custom allergens from MIL free-text slots (e.g., "Wine") flow through
the cascade but `AllergenBadge` returned `null` for unknown types. Count said 4
but only 3 badges rendered.

**Fix:** AllergenBadge now renders fallback for unrecognized types:
- Violet color, AlertTriangle icon, title-cased label from raw key
- Tooltip shows "custom" tag to distinguish from standards
- Stopgap until Custom Allergen Registry (Phase 1) provides proper metadata

**File changed:** `src/features/allergens/components/AllergenBadge.tsx`

### 3. Custom Allergen Registry Roadmap

**Created:** `docs/roadmaps/ROADMAP-Custom-Allergen-Registry.md`

5-phase plan to replace the 3 free-text MIL custom slots with a proper
organization-defined allergen registry:

| Phase | Scope | Sessions |
|---|---|---|
| Phase 0 | Badge fallback (done) | ✅ |
| Phase 1 | Registry table + Allergen Manager UI | 1-2 |
| Phase 2 | MIL integration (junction table, multi-select) | 1-2 |
| Phase 3 | Recipe cascade integration | 1-2 |
| Phase 4 | Audit trail + declarations | 1 |
| Phase 5 | Legacy column cleanup | 0.5 |

Key architecture decision: **Hybrid model** — hardcoded standards (21 boolean
columns, immutable regulatory) + organization custom registry (database table,
unlimited per org, full rendering metadata).

**Cross-referenced in:**
- `ROADMAP-Allergen-Boolean-Migration.md` (added reference link)
- `ALLERGEN-MANAGER.md` (inserted Phase 1.5 in future roadmap)

---

## Current State

### Allergen System
- ✅ Review gate: state-based, persistent UI, three-surface CTA
- ✅ Reset button: confirmation required before wiping manual allergens
- ✅ Custom badges: render with fallback (Phase 0 stopgap)
- ✅ Roadmap: 5-phase plan documented and cross-referenced
- ⬜ Custom allergen registry (Phase 1) — ready to build any session

### Known Issues
- Custom allergens don't participate in boolean write path (by design — 
  junction tables are the target, not more boolean columns)
- `allergenArraysToBooleans()` drops customs silently (JSONB preserves them)
- Version bumping and change detection don't see custom allergen changes

---

## NEXT SESSION — 7shifts Integration: The Team Module

### Context
Sessions 123-124 built TeamSettings config page and fixed import paths.
The 7shifts Edge Function (`get_users`, `get_shifts`) is operational.
Full architecture: `docs/ARCHITECTURE-7SHIFTS-FULL-INTEGRATION.md`
Previous handoff: `docs/handoffs/HANDOFF-2026-02-11-TeamSettings-7shifts-Expansion.md`

### Priority Work

**1. Verify & Align TeamSettings (30 min)**
- Test toggle pipeline end-to-end: toggle off → save → confirm pill disappears
- Align ModulesManager card label: "The Schedule" → "The Team"
- Fix configPath: card shows `/admin/schedule/settings`, actual route is `/admin/modules/team`
- Confirm tier toggle gating (disabled when Team Performance module is off)

**2. The Roster — 7shifts User Data Enrichment**
- `get_users` endpoint is already wired in the Edge Function
- Currently only names used for schedule shift enrichment
- Expand to populate `team_members` with: email, phone, hire_date, status, photo_url
- `get_assignments` endpoint → role/department/location assignments
- Build Roster tab content in TeamSettings (display prefs, sort options)
- Build/enhance Roster view with richer employee cards

**3. The Schedule — Sync Configuration**
- **Sync frequency dropdown** — the 6-tier model from the architecture doc:
  Real-time (15min) / Frequent (30min) / Standard (hourly) / Light (4hr) / Daily / Manual
- Stream tiering underneath: Hot (time punches) / Warm (shifts, time off) / 
  Cold (users, wages, availability)
- Configuration UI in TeamSettings → Integration tab
- **Manual sync button** with last-sync timestamp display
- **CRON setup** — `pg_cron` + `pg_net` for automated sync (see architecture doc 
  "Automated Sync — CRON Architecture" section)
- Sync status indicator: last successful sync, next scheduled, error state

**4. Schedule Refinements (if time)**
- Draft vs. published shift awareness (7shifts has draft state)
- Schedule events (closures, special events from 7shifts events endpoint)

### Priority 5: Employment Records — Historical Hours & Proof of Employment

> Staff request (Feb 18) — employee needs Proof of Employment letter.
> Full spec in `ROADMAP-Team.md` under "Employment Records" section.

- **Step 1:** Historical hours import via 7shifts Hours & Wages Report API
  (`/v2/reports/hours_and_wages?punches=true`), monthly chunks, new
  `team_member_hours_summary` table, one-time 12-month backfill
- **Step 2:** TeamSettings 4th tab ("Employment") — per-employee annual
  summary with 12-month hour grid, role breakdown, tenure display
- **Step 3:** Communications template "Proof of Employment" with merge fields,
  generates PDF with letterhead, hours breakdown, ESA compliance language

### Key Files for Next Session
```
docs/ARCHITECTURE-7SHIFTS-FULL-INTEGRATION.md     — Full integration plan
docs/roadmaps/ROADMAP-Team.md                     — Team roadmap (updated with 7shifts + Employment Records)
docs/handoffs/HANDOFF-2026-02-11-TeamSettings-7shifts-Expansion.md — Previous handoff
src/features/admin/components/TeamSettings/        — Config page (built, 3 tabs)
src/features/admin/components/sections/Communications/ — Template library
src/features/schedule/                             — Schedule module
supabase/functions/seven-shifts/                   — Edge Function
```

### Architecture Reference
- **Phase 1** (Shifts + Users + Vault): ✅ Built, needs integration testing
- **Phase 2** (Time Punches + Delta Engine): After Roster/Schedule work
- **Phase 3** (Wages + Assignments → Costing): After Delta Engine  
- **Phase 4** (Availability + Time Off): After Costing
- **Phase 5** (CRON Automation): After all streams active

---

## Session Stats
- Files modified: 3 (RecipeDetailPage, AllergenControl, AllergenBadge)
- Files created: 1 (ROADMAP-Custom-Allergen-Registry.md)
- Files updated: 4 (ROADMAP-Allergen-Boolean-Migration.md, ALLERGEN-MANAGER.md, ROADMAP-Team.md, this handoff)
- Bugs fixed: 2 (review gate blip, reset button nuke)
- Architecture decisions: 1 (hybrid custom allergen model)

---

*"The allergen system protects lives. The scheduling system respects time.
Neither tolerates shortcuts."*
