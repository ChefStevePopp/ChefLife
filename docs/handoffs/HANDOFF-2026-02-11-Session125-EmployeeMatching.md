# Session 125 Handoff — Employee Data Matching

**Date:** 2026-02-11
**Module:** The Team → TeamSettings → Roster Tab
**Status:** Code complete, pending browser test

---

## Context

Steve correctly identified that `punch_id` (internal POS clock-in codes like `0625`, `4104`) and `seven_shifts_id` (7shifts API user IDs — large integers) are two completely different identifiers serving different purposes:

- **`punch_id`** — Manual-first identity key. Exists for every team member regardless of API integration.
- **`seven_shifts_id`** — Optional integration bridge. Only populated when matched via the new Employee Data Matching workflow.

Both columns belong in `organization_team_members`. The Roster and My Profile must always work with manual data — most ChefLife users will never use an API integration.

---

## Deliverables

### 1. 7shifts Client Lib — Vault-Mode User Functions

**File:** `src/lib/7shifts.ts`

**Added:**
- `SevenShiftsUser` interface — typed shape of 7shifts user objects (id, first_name, last_name, email, mobile_phone, photo_url, hire_date, type, status, wage_type, punch_id)
- `getUsersVault(params)` — Fetches users via Vault credentials (used by matching workflow)
- `getRolesVault(params)` — Fetches roles via Vault (for future enrichment)
- `getDepartmentsVault(params)` — Fetches departments via Vault (for future enrichment)

All use the existing `callProxyVault()` pattern → `7shifts-proxy` Edge Function (v5).

### 2. Employee Data Matching — Types & Algorithm

**File:** `src/features/admin/components/sections/TeamSettings/index.tsx`

**Types:**
- `ChefLifeMember` — Subset of `organization_team_members` fields needed for matching
- `MatchType` — `'exact' | 'suggested' | 'manual' | 'linked' | 'unmatched'`
- `MatchCandidate` — Links a ChefLife member to a 7shifts user with match metadata

**Matching Algorithm (`buildMatches()`):**

Priority order:
1. **Already linked** — `seven_shifts_id` already populated → match type `linked`, confidence 100
2. **Exact name match** — Normalized `first_name last_name` identical → `exact`, confidence 95
3. **Email match** — Same email address → `exact`, confidence 90
4. **Fuzzy name match** — Weighted similarity (40% first, 60% last) ≥ 60% → `suggested`, shows confidence %
5. **Unmatched** — No match found

Name normalization handles: case insensitivity, whitespace trimming, multi-space collapse.
Containment check catches "Chef Steve" matching "Steve" at 75% similarity.

### 3. Employee Data Matching — UI

**Location:** TeamSettings → Roster tab → below Data Source section

**Only visible when 7shifts is connected.**

**Collapsible section** with chevron toggle and linked/total counter badge.

**Workflow:**
1. Click **Preview Match** → fetches ChefLife members + 7shifts users simultaneously
2. Runs `buildMatches()` algorithm → populates match table
3. Each row shows: ChefLife name + email | Punch ID (mono) | Status badge | 7shifts name + ID | Actions
4. **Status badges** (color-coded):
   - 🔵 **Linked** (blue) — Already saved to DB
   - 🟢 **Exact** (green) — Name/email match, needs confirmation
   - 🟡 **Fuzzy** (amber) — Partial match with confidence %, needs review
   - 🟣 **Manual** (purple) — User manually assigned
   - ⚪ **None** (gray) — No match found
5. **Actions per row:**
   - Linked rows: "✓ Saved" indicator (read-only)
   - Matched rows: Confirm button (toggleable) + X to unlink
   - Unmatched rows: Manual assignment dropdown (lists remaining 7shifts users)
6. **Summary footer** shows counts per category + "X 7shifts users not in ChefLife"
7. Click **Save N Matches** → writes to DB:
   - `seven_shifts_id` = matched 7shifts user ID
   - `seven_shifts_data` = full 7shifts user object (photo_url, hire_date, status, etc.)
   - `last_synced_at` = current timestamp
8. NEXUS audit log entry on save

**Safety:**
- Preview is read-only — no DB changes until explicit Save
- Toast notifications at each step
- Error state with red alert banner
- Unlinking returns 7shifts user to available pool

### 4. Edge Function Verification

**`7shifts-proxy` v5** — Confirmed `get_users` action exists and uses Vault credential resolution. No changes needed.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/7shifts.ts` | Added `SevenShiftsUser` type, `getUsersVault()`, `getRolesVault()`, `getDepartmentsVault()` |
| `src/features/admin/components/sections/TeamSettings/index.tsx` | Added matching types/algorithm, 7 new state vars, 5 handler functions, full matching UI section |

---

## Data Flow

```
Preview Match button
  → supabase.from('organization_team_members').select() — ChefLife roster
  → getUsersVault({ organizationId }) — 7shifts users via Vault proxy
    → buildMatches() — algorithm produces MatchCandidate[]
      → UI renders side-by-side table
        → User confirms/adjusts matches
          → Save Matches
            → supabase.update({ seven_shifts_id, seven_shifts_data, last_synced_at })
            → NEXUS audit log
```

---

## Next Steps (Session 126)

1. **Browser test** — Navigate to TeamSettings → Roster → expand Employee Data Matching → Preview Match
2. **Verify proxy response** — Confirm 7shifts users return correctly via Vault mode
3. **Test matching accuracy** — Compare auto-matched results against known Memphis Fire ↔ 7shifts mapping
4. **Build Roster View component** — The actual roster page rendering team member cards using `roster_display` config
5. **7shifts photo integration** — Use `photo_url` from `seven_shifts_data` as roster card avatar
