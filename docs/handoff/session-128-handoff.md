# Session 128 Handoff — Pay Type, Wages, Labour Intelligence, 7shifts Wage Architecture

## Date: February 18, 2026

---

## COMPLETED ✅

### 1. `pay_type` Field — Persistent Hourly/Salary Selector
- **Migration**: `add_pay_type_to_team_members` — `pay_type text NOT NULL DEFAULT 'hourly'` with CHECK constraint `('hourly', 'salary')`
- **Type updated**: `TeamMember.pay_type?: 'hourly' | 'salary'` in `src/features/team/types/index.ts`
- **Change detection**: Added to `fieldsToCompare` in EditTeamMemberModal
- **Submit path**: Added to `handleSubmit` updates
- **Store**: `teamStore.updateTeamMember` already handles `pay_type` via `if (updates.pay_type !== undefined)` guard
- **Fetch**: Uses `select("*")` — `pay_type` included automatically
- **Maps to**: 7shifts `wage_type` ('hourly' | 'weekly_salary')

### 2. RolesTab — Complete Rewrite Using Existing Patterns
- **File**: `src/features/team/components/EditTeamMemberModal/tabs/RolesTab.tsx`
- **TwoStageButton** — Used existing `@/components/ui/TwoStageButton` with `variant="warning"`, `icon={Lock}`, `confirmIcon={Pencil}`, `timeout={3000}`
- **Segmented toggle**: Hourly (green) / Salary (amber) — persistent to DB, drives all wage visibility
- **When hourly**: Wage inputs visible for all editors, helper text "Hourly wages power the Labour Intelligence row"
- **When salary**: Wage inputs locked (🔒 + em dash), helper text "Salaried — excluded from Labour Intelligence"
- **Alpha override**: TwoStageButton appears only when `isSalaried && isEditorAlpha` — unlocks wage inputs temporarily for analysis
- **Re-lock**: Simple underline text button to re-lock after override
- **No security-level assumptions**: Pay type is data-driven, any security level can be hourly or salary

### 3. Wage Data Populated — All Hourly Team Members
- **18 of 21** scheduled employees now have wages in `organization_team_members.wages[]`
- **3 set to `pay_type = 'salary'`**: Chef Steve (1117), Chef Lori (4104), Chef John Rumbles (0501)
- Rate patterns applied consistently (see Wage Rate Map below)
- Also populated 7 non-scheduled team members for future coverage

### 4. scheduleStore Wage Enrichment — pay_type Aware
- **Already implemented** in `scheduleStore.ts > fetchShifts()`:
  - Queries `id, punch_id, roles, wages, pay_type` in optional wage enrichment
  - `pay_type === 'salary'` → `wageMap` entry with `salaried: true`
  - `wage_rate = 0` for salaried (known, not missing)
  - `wage_rate = null` for truly missing (hourly with no data)
  - `wage_rate > 0` for hourly with data (included in cost)

### 5. Labour Intelligence — Correct Missing Count
- **`calcLabourCost()`** in ScheduleWeekView already handles all three states:
  - `wage_rate > 0` → add to labour cost total
  - `wage_rate === null` → count as missing (amber warning)
  - `wage_rate === 0` → salaried, deliberately excluded, NOT counted as missing
- **Expected result**: 0 missing (all 18 hourly have wages, 3 salaried at wage_rate=0)

### 6. S. Development Popp — Nested Array Fix
- Roles flattened from 2D `{{...}}` to 1D `{...}` array

---

## 7SHIFTS WAGE INTEGRATION STATUS

### What's Built
The 7shifts API client (`src/lib/7shifts.ts` v6) has full wage plumbing:
- `getUserWagesVault()` — per-user wage data with `wage_cents`, `role_id`, `effective_date`
- `getBulkUserWagesVault()` — batch with rate-limit-safe 5-at-a-time batching
- `getUserAssignmentsVault()` — role/department/location assignments
- `getLaborSettingsVault()` — company-level `wage_based_roles_enabled` flag
- `SevenShiftsUser.wage_type` — maps to our `pay_type`

### What's NOT Built Yet
The schedule sync flow (`sync7shiftsSchedule` in scheduleStore) does NOT call wage endpoints. Currently:
- 7shifts → roles, shifts, schedule data ✅
- 7shifts → wages, pay_type ❌ (manual entry only)

### Future Integration Path
When implemented, 7shifts wage sync would:
1. Call `getBulkUserWagesVault()` during team/schedule sync
2. Map `wage_cents / 100` → `wages[]` entries (per role_id → role name matching)
3. Map `wage_type: 'weekly_salary'` → `pay_type: 'salary'`
4. Map `wage_type: 'hourly'` → `pay_type: 'hourly'`
5. Write to `wages[]` and `pay_type` columns
6. **Integration overrides manual** — same pattern as roles/departments with `import_source`

### Manual Wages Are Correct For Now
Until 7shifts wage sync is built, manual entry is the source of truth. The `TwoStageButton` override and `pay_type` toggle ensure Alpha operators can manage this cleanly.

---

## FILES MODIFIED THIS SESSION

| File | Changes |
|------|---------|
| `src/features/team/types/index.ts` | Added `pay_type?: 'hourly' \| 'salary'` to TeamMember |
| `src/features/team/components/EditTeamMemberModal/index.tsx` | Added `pay_type` to change detection + submit + prop pass-through |
| `src/features/team/components/EditTeamMemberModal/tabs/RolesTab.tsx` | Full rewrite: segmented toggle, TwoStageButton override, pay_type-driven wage visibility |

## DB CHANGES

| Change | Table | Detail |
|--------|-------|--------|
| New column | `organization_team_members` | `pay_type text NOT NULL DEFAULT 'hourly'` with CHECK constraint |
| Wage data | `organization_team_members` | 19 members updated with wages (12 scheduled + 7 non-scheduled) |
| Pay type | `organization_team_members` | 3 management members set to `pay_type = 'salary'` |
| Array fix | `organization_team_members` | S. Development Popp roles flattened from 2D to 1D |

---

## WAGE RATE MAP (Reference)

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

---

## NEXT SESSION PRIORITIES

1. **Visual QA** — Load schedule view, verify Labour Intelligence Row 2 renders with 0 missing
2. **Test Pay Type Toggle** — Open Chef Steve → Roles → verify Salary selected, wages locked, TwoStageButton override works
3. **Test Hourly Member** — Open any Echo member → verify Hourly selected, wages visible
4. **Recipe Draft State + Version Control** — Full implementation session (architecture confirmed Session 127)
5. **7shifts Wage Sync** — Future session: wire `getBulkUserWagesVault()` into team sync flow
