# Session 128 Handoff — Wages Editor + Labour Intelligence + Alpha Override

## Date: February 18, 2026

---

## COMPLETED ✅

### 1. Wage Data Populated — All Hourly Team Members
- **18 of 21** scheduled employees now have wages in `organization_team_members.wages[]`
- Rate patterns established and applied consistently:
  - DISH / AM DISH / NON-KITCHEN: $17.20 (Ontario minimum)
  - LINE / AM LINE: $19.00
  - COLD PREP: $18.00
  - EXPO: $17.50
  - BAR (FOH - BAR): $18.00
  - PMCA: $18.00
  - PIES: $18.50
  - CATERING / CATERING - OFFSITE: $19.00
  - ADMIN: $20.00
  - SUPERVISOR (FOH - SUPERVISOR): $20.00
  - FOH - SERVERS / HOST / BUS / TAKE-OUT / TRAINING / PATIO: $17.20
- **3 intentionally empty** (management/salaried): Chef Steve (level 1), Chef Lori (level 1), Chef John Rumbles (level 2)
- Also populated 7 non-scheduled team members for future schedule coverage

### 2. Alpha-Gated 2-Stage Wage Override — RolesTab
- **Location**: `src/features/team/components/EditTeamMemberModal/tabs/RolesTab.tsx`
- **Behavior for management members** (security_level ≤ 2 / Bravo and above):
  - Wage inputs show locked state (🔒 icon + em dash) by default
  - Footer message: "Salaried — excluded from labour cost calculations"
  - **Alpha editors only** (security_level ≤ 1) see the override button
  - **Stage 0**: "Override — Include in Labour" button (subtle gray, hover amber)
  - **Stage 1**: "Confirm Override" button (amber glow, animated pulse)
  - **Stage 2**: Wage inputs unlock, "Override active" message with "Re-lock" link
  - If management member already has wages from a previous override → starts at Stage 2
- **Non-management members**: Wage inputs visible and editable as before, with helper text
- **Props added**: `editorSecurityLevel` passed from `EditTeamMemberModal/index.tsx` → `RolesTab`

### 3. S. Development Popp — Nested Array Fix
- **Root cause**: `roles` column contained `{{...}}` (2D text array) instead of `{...}` (1D)
- **Fix**: Direct SQL update to flatten to proper 1D array matching Chef Steve Popp's role set
- **Impact**: Role matching in scheduleStore wage enrichment will now work correctly for this member

### 4. Store Fault-Tolerance — Already Implemented (Verified)
- `scheduleStore.ts > fetchShifts()` already splits into two queries:
  - Essential: `id, punch_id, email, avatar_url, first_name, last_name` — must succeed
  - Optional: `id, punch_id, roles, wages` → builds `wageMap` in separate try/catch
  - If wage query fails, avatars and shift rendering remain unaffected

### 5. Wages Editor in RolesTab — Already Implemented (Verified)
- Inline `$` + `/hr` inputs next to each role name in the Scheduled Roles section
- Parallel array management: `addRole()` creates both entries, `removeRole()` splices both
- `updateWage()` pads with zeros if wages array is shorter than roles array
- Form submission includes `wages` in updates (both admin and non-admin paths)
- Change detection (`hasChanges`) includes `wages` field comparison

---

## NOT YET COMPLETED ❌

### 1. Visual QA — Labour Intelligence Row 2
- With 18 of 21 employees now having wages, Row 2 should render showing:
  - `$X,XXX Labour` cost pill
  - `3 missing` amber warning (the 3 management members)
  - Week-over-week delta (if previous schedule has enriched shifts)
  - Editable target % (default 28%, persisted to localStorage)
  - Required sales pill
- **Needs live browser verification** — all JSX is in place, data is populated

### 2. Visual QA — Alpha Override Button
- Need to verify the 2-stage button renders correctly when editing Chef Steve, Chef Lori, or Chef John
- Verify locked wage inputs show properly with 🔒 icon
- Verify non-Alpha editors (Bravo/Charlie/Delta/Echo) do NOT see the override button
- Verify override unlock → wage inputs become functional → save persists

### 3. Recipe Draft State + Version Control (DESIGN CONFIRMED — NOT STARTED)
- Architecture confirmed in Session 127 — needs its own focused session
- Draft state, first publish = v1.0.0, revision layer, security-gated visibility
- See Session 127 handoff section 4 for full architecture

---

## FILES MODIFIED THIS SESSION

| File | Changes |
|------|---------|
| `src/features/team/components/EditTeamMemberModal/index.tsx` | Added `editorSecurityLevel` prop pass-through to `RolesTab` |
| `src/features/team/components/EditTeamMemberModal/tabs/RolesTab.tsx` | Added Alpha-gated 2-stage wage override for management members, locked wage inputs, security imports |

## DB CHANGES

| Change | Table | Detail |
|--------|-------|--------|
| Wage data populated | `organization_team_members` | 19 members updated with wages parallel to roles (12 scheduled + 7 non-scheduled) |
| Nested array fix | `organization_team_members` | S. Development Popp roles flattened from 2D to 1D array |

---

## KEY TECHNICAL NOTES

### Management Wage Override Flow
```
Editor opens management member → RolesTab
  ├── Member security_level ≤ 2? → Management detected
  │     ├── Has existing wages? → Start at Stage 2 (unlocked)
  │     └── No wages? → Start at Stage 0 (locked)
  │           ├── Stage 0: Lock icon on wage inputs, "Salaried" message
  │           ├── Editor is Alpha? → Show override button
  │           │     ├── Click 1: "Override — Include in Labour" → Stage 1
  │           │     └── Click 2: "Confirm Override" → Stage 2 (unlocked)
  │           └── Editor is NOT Alpha? → No override option visible
  └── Member security_level > 2? → Normal wage inputs (always visible)
```

### Wage Rate Map (Reference)
```
Role Category          Rate     Notes
─────────────────────  ───────  ────────────────────────
DISH / AM DISH         $17.20   Ontario minimum wage
NON-KITCHEN            $17.20   Non-culinary tasks
FOH base roles         $17.20   Servers, Host, Bus, etc.
EXPO                   $17.50   Expediting premium
BAR                    $18.00   Bartending premium  
COLD PREP              $18.00   Prep skill premium
PMCA                   $18.00   PM Closing premium
PIES                   $18.50   Specialty skill
LINE / AM LINE         $19.00   Line cook premium
CATERING               $19.00   Event premium
ADMIN                  $20.00   Administrative
SUPERVISOR             $20.00   Leadership premium
```

### Labour Intelligence Expected State
With wage data populated, the ScheduleWeekView Labour Intelligence row should show:
- **Labour Cost**: Sum of (shift_hours × wage_rate) for all shifts with wages
- **Missing**: 3 (Chef Steve, Chef Lori, Chef John — intentionally salaried)
- **Target**: 28% default, editable, localStorage-persisted
- **Required Sales**: Labour Cost ÷ (Target% / 100)
- **Delta**: Comparison to previous week (if previous schedule exists and has wage-enriched shifts)

---

## NEXT SESSION PRIORITIES

1. **Visual QA** — Load the schedule view in browser and verify Labour Intelligence Row 2 renders with all pills
2. **Test Alpha Override** — Open Chef Steve's profile → Roles tab → verify locked state → override flow
3. **Recipe Draft State + Version Control** — Full implementation session
4. **Consider**: Should the "3 missing" count in Labour Intelligence exclude management members? Currently it counts anyone without wage_rate on their shifts. Could add logic to exclude security_level ≤ 2 from the missing count, since they're intentionally excluded. Design decision needed.
