# Session 124 Handoff — The Team Core Module Expansion
**Date:** 2026-02-11  
**Focus:** Config pipeline fix, Roster tab build, 7shifts user enrichment schema

---

## What Was Done

### 1. ✅ Config Pipeline Fix (Schedule → Shift Card Pills)

**Problem:** TeamSettings card_display toggles saved to DB correctly, and ScheduleManager loaded them into `cardDisplayConfig` state and passed them to `ScheduleWeekView` — but ScheduleWeekView never forwarded the prop to `DayColumn` or `ShiftCard`. All 6 pills rendered unconditionally.

**Fix applied to:** `ScheduleWeekView.tsx`
- Added `cardDisplay` to `DayColumnProps` interface, forwarded in both desktop grid and mobile scroll renders
- Added `cardDisplay` to `ShiftCardProps` interface, forwarded from DayColumn
- Each pill now conditionally renders based on its config flag:
  - `show_shift_hours` → shift duration pill (e.g. "5h")
  - `show_weekly_hours` → weekly total pill (e.g. "32h/wk")
  - `show_department` → FOH/BOH badge
  - `show_tier` → T1/T2/T3 badge (also gated by `tier != null`)
  - `show_break_duration` → break pill (e.g. "30min break")
  - `show_notes` → shift notes section
- Used `!== false` pattern so pills default to visible when no config exists (backward compatible)

**Full pipeline now:**
```
TeamSettings UI toggles
  → organizations.modules.scheduling.config (Supabase JSONB)
    → ScheduleManager loads cardDisplayConfig state
      → ScheduleWeekView receives cardDisplay prop
        → DayColumn receives cardDisplay prop
          → ShiftCard conditionally renders each pill
```

### 2. ✅ Roster Tab in TeamSettings (Full Build)

**File:** `TeamSettings/index.tsx`

**New types added:**
- `RosterDisplayConfig` — layout, sort_by, sort_direction, group_by, and 6 field visibility toggles
- `TeamModuleConfig` expanded to include `roster_display` alongside `card_display`
- `DEFAULT_TEAM_CONFIG` expanded with roster defaults

**Roster tab content (3 sections):**
1. **Layout & Sorting** — 2×2 grid with:
   - Layout toggle (Grid / List)
   - Group By dropdown (None / Department / Role)
   - Sort By dropdown (Name / Role / Department / Hire Date)
   - Sort Direction toggle (A→Z / Z→A)

2. **Roster Card Fields** — 6 ToggleRow items:
   - Email, Phone, Hire Date, Role, Department, Active Status
   - All default to `true`

3. **Data Source** — 7shifts connection indicator:
   - Shows connected/not-connected status
   - Links to /admin/integrations when not connected
   - Reads from `modules.scheduling.integrations.seven_shifts.status`

**Helper functions added:**
- `updateRosterDisplay<K>()` — generic typed updater for any roster config key
- `updateRosterToggle()` — boolean shortcut for field visibility toggles
- `is7shiftsConnected` state — loaded from org modules on mount

**Config persistence:** Roster config saves to same JSONB path as card_display:
`organizations.modules.scheduling.config.roster_display`

### 3. ✅ Database Migration — 7shifts User Enrichment

**Migration:** `add_7shifts_user_fields`

**New columns on `organization_team_members`:**
| Column | Type | Notes |
|--------|------|-------|
| `seven_shifts_id` | `bigint UNIQUE` | 7shifts user ID for sync linkage |
| `seven_shifts_data` | `jsonb DEFAULT '{}'` | Raw 7shifts user payload (photo_url, wage_type, etc.) |
| `last_synced_at` | `timestamptz` | Last sync timestamp |

**Index:** `idx_otm_seven_shifts_id` — partial index on non-null values for fast lookups during sync.

### 4. ✅ ModulesManager Verified

Already correct from Session 123:
- Card label: "The Team"
- Icon: `Users`
- Route: `/admin/modules/team`

---

## Files Modified

| File | Change |
|------|--------|
| `ScheduleManager/components/ScheduleWeekView.tsx` | Forward cardDisplay prop through DayColumn → ShiftCard; conditional pill rendering |
| `TeamSettings/index.tsx` | Added RosterDisplayConfig type, roster_display defaults, full Roster tab UI, 7shifts status indicator |
| `organization_team_members` (DB) | Added seven_shifts_id, seven_shifts_data, last_synced_at columns |

---

## What's Next (Priority Order)

### Immediate (Session 125)
1. **Browser test** — Toggle TeamSettings card_display flags, verify pills hide/show on schedule
2. **Browser test** — Verify Roster tab renders with all controls, saves config to DB
3. **Build Roster View component** — Actually render team member cards using `roster_display` config
   - Fetch from `organization_team_members` where `is_active = true`
   - Apply layout (grid/list), grouping, sorting from config
   - Show/hide fields per toggle config
   - This is the actual Roster page content (not settings)

### Soon
4. **7shifts user sync** — Wire `get_users` endpoint to populate `seven_shifts_id` + `seven_shifts_data`:
   - Match by name (first_name + last_name) or allow manual linking
   - Store photo_url, hire_date, status, wage_type in seven_shifts_data
   - Update `last_synced_at` on each sync
   - Add "Sync Users" button to Roster tab in TeamSettings

5. **Roster enrichment** — Use seven_shifts_data to enhance roster cards:
   - 7shifts photo as avatar (fallback to dicebear)
   - Enriched hire_date, status from 7shifts
   - Sync indicator (last_synced_at relative time)

### Future
6. **My Profile tab** — Individual team member profile view/edit
7. **Phase 2: Delta Engine** — time_punches sync for attendance tracking
8. **Phase 3: Wages + Costing** — labor cost integration

---

## Architecture Notes

**Config storage pattern:**
```
organizations.modules.scheduling.config = {
  card_display: { show_shift_hours: true, ... },
  roster_display: { layout: 'grid', sort_by: 'name', ... }
}
```

**7shifts user data flow:**
```
7shifts API (get_users)
  → Edge Function proxy (Vault credentials)
    → organization_team_members.seven_shifts_id (linkage)
    → organization_team_members.seven_shifts_data (raw payload)
```

**Existing 7shifts proxy endpoints (v5):**
- `test_connection` — credential validation
- `health_check` — status ping
- `get_shifts` — shift data (used by schedule sync)
- `get_users` — user data (ready for roster sync)
- `get_roles` — role names
- `get_locations` — location list
- `get_departments` — department list
- `preview_shifts` — enriched shifts (joins users + roles)
