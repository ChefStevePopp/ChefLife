# Session 127 Handoff — Labour Cost Intelligence + Filter Bar L5 Redesign

## Date: February 11, 2026 (evening session)

---

## COMPLETED ✅

### 1. L5 Filter Bar Redesign — ScheduleWeekView (`ScheduleWeekView.tsx`)
- **Department toggles**: Icon-box pattern with Users/ConciergeBell/Flame icons, colored active rings (gray/blue/orange), responsive labels hide on mobile
- **Role filter popover**: Pill-style button opens dropdown with color swatches for each role, replaces native `<select>`, respects active department filter
- **Active filter indicator**: Amber pill with X to clear all filters
- **Stats pills**: Shift count + total hours, right-aligned
- **Full component file**: `src/features/admin/components/sections/ScheduleManager/components/ScheduleWeekView.tsx`

### 2. Labour Intelligence Row (Filter Bar Row 2) — Complete JSX, Waiting on Wage Data
All JSX is written and renders conditionally when `hasWageData` is true:
- **Labour Cost pill**: Primary ring, shows `$X,XXX Labour` for filtered shifts
- **Missing Wage warning**: Amber pill, counts unique employees without wage data
- **Week-over-week delta**: Emerald (savings) or rose (increase) with dollar + percentage
- **Editable Labour Target %**: Click-to-edit inline, persisted to localStorage (`cheflife-schedule-labour-target-pct`), default 28%
- **Required Sales pill**: Emerald, formula `labourCost ÷ targetPct = salesNeeded`
- **Graceful degradation**: Entire Row 2 hidden if no wage data exists

### 3. Wage Rate Architecture
- **DB column added**: `organization_team_members.wages numeric[] DEFAULT '{}'` — parallel to existing `roles text[]`
  - Migration applied: `add_wages_to_team_members` on project `vcfigkwtsqvrvahfprya`
  - Pattern: `roles[i]` maps to `wages[i]` (e.g., roles=["FOH Server","FOH Host"], wages=[17.20, 16.50])
- **ScheduleShift type extended**: `wage_rate?: number | null` in `src/types/schedule.ts`
- **Store enrichment**: `scheduleStore.ts > fetchShifts()` matches `shift.role` → `member.roles[]` index → `member.wages[]` value
  - Dual-lookup preserved: `byPunchId` then `byId` for avatar_url
  - Fallback: uses first wage if role doesn't match

### 4. Previous Week Comparison — Parent Effect
- **File**: `src/features/admin/components/sections/ScheduleManager/index.tsx`
- `previousWeekShifts` state + useEffect fetches shifts from the schedule immediately before the displayed one
- Enriches previous shifts with wage_rate using same logic as store
- Passed as prop `previousWeekShifts` to `<ScheduleWeekView>`

### 5. Avatar Bug Fix
- **Root cause**: Adding `wages` to the team member SELECT query before the column existed caused the entire query to fail silently, returning no team members, so all shifts got DiceBear defaults
- **Fix**: Column now exists (migration applied), and dual-lookup for avatar was restored with separate `byPunchId`/`byId` variables

---

## NOT YET COMPLETED ❌

### 1. Wages Per Role Editor — Team Member Edit Modal (The Roster)
- **Location**: `src/features/team/components/EditTeamMemberModal/` (has `tabs/` subdirectory)
- **Plan**: Add a "Wages" tab or section to the edit modal where managers can set hourly rates per role
- **Data shape**: Parallel array UI — for each entry in `roles[]`, show the role name and an input for the corresponding `wages[]` value
- **Needs**: Read existing modal structure, add wages tab, save back to `organization_team_members.wages`
- **NOT STARTED** — only identified the file location

### 2. Store Fault-Tolerance for Missing Columns
- **Issue**: If `wages` column is ever missing or query fails, the entire team member fetch fails and takes avatars with it
- **Planned fix**: Split into two queries — essential fields (id, punch_id, avatar_url) first, then wage data as optional enrichment in a separate try/catch
- **NOT STARTED** — the immediate fix (adding the column) resolved the issue but the defensive pattern hasn't been implemented

### 3. Populate Test Wage Data
- No team members currently have `wages[]` populated, so the Labour Intelligence row doesn't render
- Need to either: populate via The Roster modal once built, OR run a manual SQL update for testing

### 4. Recipe Draft State + Version Control Redesign (DESIGN DECISION — CONFIRMED)
- **Problem**: Recipes currently increment version on every save, even during initial creation. A new recipe can reach v3 before anyone sees it.
- **Confirmed architecture**:
  - **Draft state**: No version number (display as `DRAFT`). Saves freely, no version bumps, no notifications, no audit trail beyond creation timestamps. Visible only to Alpha/Beta/Omega security tiers.
  - **First publish** → `v1.0.0`. This is the birth certificate. Recipe enters operational visibility, costs track, allergen declaration activates, line cooks can see it.
  - **Post-publish** follows existing MAJOR.MINOR.PATCH hierarchy (same as policies): Patch=trust, Minor=broadcast, Major=mandatory meeting.
  - **Draft revision state**: When editing a published recipe, live version stays visible to team while changes accumulate in a draft layer. Publishing the revision triggers the appropriate version bump.
- **Implementation needs**: Add `status` field (draft/published/archived), `published_version` field, gate version increment behind publish action not save action, security tier visibility gates.
- **NOT STARTED** — design confirmed, needs its own focused session

### 5. Expandable Info Section Overflow Fix (CostingSummary + AllergenControl)
- **Fixed**: `CostingSummary.tsx` line 131 — added optional chaining `settings?.recipe_unit_measures` (settings was null during new recipe creation)
- **Fixed**: `index.css` expandable-info-section — added `overflow: visible` to `.expanded` state on both `.expandable-info-section` and `.expandable-info-content` so absolute-positioned dropdowns (like ManualOverrides allergen picker) aren't clipped

---

## FILES MODIFIED THIS SESSION

| File | Changes |
|------|---------|
| `src/types/schedule.ts` | Added `wage_rate?: number \| null` to ScheduleShift interface |
| `src/stores/scheduleStore.ts` | Extended `fetchShifts()` with wage matching from `roles[]/wages[]` parallel arrays, fixed dual-lookup for avatar |
| `src/features/admin/components/sections/ScheduleManager/components/ScheduleWeekView.tsx` | Complete L5 filter bar rebuild with department toggles, role popover, labour intelligence row |
| `src/features/admin/components/sections/ScheduleManager/index.tsx` | Added `previousWeekShifts` state + effect, passed as prop to ScheduleWeekView |
| `src/features/recipes/components/RecipeEditor/BasicInformation/CostingSummary.tsx` | Added null guard: `settings?.recipe_unit_measures` |
| `src/index.css` | Added `overflow: visible` to `.expandable-info-section.expanded` and its `.expandable-info-content` |

## DB CHANGES

| Migration | Table | Change |
|-----------|-------|--------|
| `add_wages_to_team_members` | `organization_team_members` | Added `wages numeric[] DEFAULT '{}'` |

---

## KEY TECHNICAL NOTES

### Wage Matching Algorithm (scheduleStore.ts)
```typescript
const roleIdx = member.roles.findIndex(r => r.toLowerCase() === shift.role.toLowerCase());
if (roleIdx !== -1 && member.wages[roleIdx] != null) {
  wage_rate = member.wages[roleIdx]; // Exact role match
} else if (member.wages.length > 0) {
  wage_rate = member.wages[0]; // Fallback to first wage
}
```

### Labour Intelligence Visibility Logic
```typescript
hasWageData: current.total > 0 || current.missingWageCount < uniqueEmployeeCount
// Shows Row 2 if ANY employee has wage data OR if at least one has a missing wage
// Hidden only when ZERO wage data exists for anyone
```

### localStorage Persistence
- Key: `cheflife-schedule-labour-target-pct`
- Default: 28
- Range: 1-100, step 0.5
