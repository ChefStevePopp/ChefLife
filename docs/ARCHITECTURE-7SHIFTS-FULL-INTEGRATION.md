# 7shifts Full Integration Architecture

> **Status:** Approved — Ready to Build  
> **Prerequisite:** Phase 1 testing (Session 110 checklist)  
> **Pattern:** See `PATTERN-Integration-Gold-Standard.md`  
> **Last Updated:** February 10, 2026

---

## Vision

7shifts transitions from a scheduling-only data source to a **core data provider** feeding six ChefLife modules. All data lands in ChefLife-owned tables with `source: '7shifts'` provenance. Modules never call the 7shifts API directly — they consume normalized ChefLife data. If the operator ever switches scheduling platforms, only the sync layer changes.

---

## Data Streams

### Stream Map

```
7shifts API (v2.2025.0301)
    │
    ├── GET /company/{id}/shifts ─────────→ schedule_shifts        → Schedule Module
    ├── GET /company/{id}/time_punches ──→ time_punches (NEW)      → Delta Engine
    ├── GET /company/{id}/users ─────────→ team_members (enrich)   → The Roster
    ├── GET /company/{id}/users/wages ───→ team_member_wages (NEW) → Costing Layer
    ├── GET /assignments ────────────────→ team_member_roles (NEW) → The Roster
    ├── GET /availabilities ─────────────→ availability (NEW)      → Team Performance
    ├── GET /time_off ───────────────────→ time_off_requests (NEW) → Team Performance
    │
    ▼
ChefLife Modules (read from ChefLife tables, not 7shifts):

    Schedule Module ←──── schedule_shifts
    Delta Engine ←─────── schedule_shifts + time_punches (scheduled vs. actual)
    Team Performance ←──── time_punches + availability + time_off + attendance_records
    The Roster ←────────── team_members + team_member_roles
    Recipe Costing ←────── team_member_wages (labor rate per role)
    Prep Lists / Tasks ←── team_member_wages (labor cost per task duration)
```

### Stream Details

| Stream | 7shifts Endpoint(s) | ChefLife Table | Module(s) | Phase |
|--------|--------------------|--------------|-----------| ------|
| Shifts | `GET /shifts` (published, non-deleted) | `schedule_shifts` (exists) | Schedule | 1 ✅ |
| Time Punches | `GET /time_punches` | `time_punches` (new) | Delta Engine, Team Perf | 2 |
| Users | `GET /users` | `team_members` (enrich) | Roster | 1 ✅ |
| User Wages | `GET /user_wages` | `team_member_wages` (new) | Recipe Costing, Prep Lists | 3 |
| Assignments | `GET /assignments`, role/dept/location | `team_member_roles` (new or extend) | Roster | 3 |
| Availability | `GET /availabilities` | `availability` (new) | Team Performance | 4 |
| Time Off | `GET /time_off` | `time_off_requests` (new) | Team Performance | 4 |

---

## Automated Sync — CRON Architecture

### Why Not Webhooks

7shifts webhooks are enterprise-tier. For independent operators, a CRON-based sync running inside Supabase (`pg_cron` + `pg_net`) is simpler, cheaper, and completely within our control. It also means zero external infrastructure — everything runs inside the existing Supabase project.

### User-Facing Frequency Model

One dropdown, six options. The system tiers streams intelligently underneath.

| User Selection | Time Punches | Shifts | Time Off | Users / Wages / Availability |
|---------------|-------------|--------|----------|------------------------------|
| Real-time (15 min) | Every 15 min | Every hour | Every hour | Daily overnight |
| **Frequent (30 min)** ← DEFAULT | Every 30 min | Every 4 hours | Every 4 hours | Daily overnight |
| Standard (hourly) | Every hour | Every 4 hours | Every 4 hours | Daily overnight |
| Light (4 hours) | Every 4 hours | Every 4 hours | Every 4 hours | Daily overnight |
| Daily | Daily overnight | Daily overnight | Daily overnight | Daily overnight |
| Manual | Never | Never | Never | Never |

### Stream Tier Definitions

| Tier | Streams | Rationale |
|------|---------|-----------|
| **Hot** | Time Punches | Clock-ins happen in real-time during service. Freshest data needed. |
| **Warm** | Shifts, Time Off | Schedules change a few times daily. Time-off has urgency (sick calls). |
| **Cool** | Users, Wages, Availability, Assignments | People data changes rarely. Daily batch is plenty. |

### Active Hours Optimization

High-frequency syncs (hot + warm tiers) only fire during the restaurant's operating hours. Overnight, only the daily "cool" streams run.

```jsonc
// Example: JSONB config for auto-sync
"7shifts": {
  "config": {
    "sync": {
      "enabled": true,
      "frequency": "every_30_min",
      "active_hours_only": true,
      "operating_hours": {
        "start": "06:00",
        "end": "23:00",
        "timezone": "America/Toronto"
      },
      "streams": {
        "shifts":       { "enabled": true, "last_sync_at": null },
        "time_punches": { "enabled": true, "last_sync_at": null },
        "users":        { "enabled": true, "last_sync_at": null },
        "wages":        { "enabled": true, "last_sync_at": null },
        "availability": { "enabled": true, "last_sync_at": null },
        "time_off":     { "enabled": true, "last_sync_at": null }
      },
      "last_full_sync_at": null
    }
  }
}
```

### CRON Implementation

Two pg_cron jobs handle everything:

**Job 1: High-Frequency Dispatcher** (runs every 15 minutes)
```
→ Query: Which orgs have auto-sync enabled?
→ For each org: Is it within operating hours?
→ For each stream: Has enough time elapsed since last_sync_at?
→ If due: Call Edge Function with action: "scheduled_sync", stream list
→ Update last_sync_at per stream
→ Log to NEXUS: automated_sync event
```

**Job 2: Nightly Batch** (runs at 2:00 AM per timezone)
```
→ Query: All orgs with any sync enabled
→ Run "cool" tier streams: users, wages, availability, assignments
→ Run any "warm" streams that were missed (catchup safety net)
→ Update last_sync_at
→ Log to NEXUS: nightly_sync event
```

The dispatcher is lightweight — it's a SELECT on `organizations.integrations` JSONB, then a `pg_net` HTTP call to the Edge Function for each org that's due. If nobody needs syncing, it exits immediately.

### Rate Limit Awareness

7shifts allows 10 requests/second per access token. Each stream sync uses 1–3 API calls (list endpoint + possible pagination). For a single org doing a full hot+warm sync:

| Stream | API Calls | Notes |
|--------|----------|-------|
| Time Punches | 1–2 | Paginated if >250 punches in window |
| Shifts | 1–2 | Paginated if >250 shifts in window |
| Time Off | 1 | Usually small result set |
| **Total per sync** | **3–5** | Well within 10/sec limit |

Even with 50 ChefLife organizations syncing simultaneously, the staggered timing (not all orgs sync at the same second) keeps us well under limits. The existing rate limiter in the Edge Function provides a safety net.

---

## Database Schema — New Tables

### `time_punches` (Phase 2)

The core table for the Delta Engine. Each row is a single clock-in/clock-out pair.

```sql
CREATE TABLE time_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- 7shifts provenance
  external_id BIGINT,                    -- 7shifts time_punch ID
  source TEXT NOT NULL DEFAULT '7shifts',
  
  -- Employee link
  team_member_id UUID REFERENCES team_members(id),
  external_user_id BIGINT,               -- 7shifts user_id (for matching)
  employee_name TEXT,                     -- denormalized for display
  
  -- Shift link (for Delta Engine comparison)
  schedule_shift_id UUID REFERENCES schedule_shifts(id),
  external_shift_id BIGINT,              -- 7shifts shift_id
  
  -- Punch data
  clocked_in_at TIMESTAMPTZ NOT NULL,
  clocked_out_at TIMESTAMPTZ,            -- null = currently clocked in
  auto_clocked_out BOOLEAN DEFAULT false, -- 7shifts auto-clock-out
  
  -- Breaks
  break_minutes INTEGER DEFAULT 0,
  paid_break_minutes INTEGER DEFAULT 0,
  unpaid_break_minutes INTEGER DEFAULT 0,
  
  -- Calculated
  total_hours NUMERIC(6,2),              -- actual worked hours (minus breaks)
  scheduled_hours NUMERIC(6,2),          -- from linked shift (for delta)
  delta_minutes INTEGER,                 -- actual - scheduled (positive = overtime)
  
  -- Role/Department context
  role_id BIGINT,
  role_name TEXT,
  department_id BIGINT,
  department_name TEXT,
  location_id BIGINT,
  
  -- Status
  status TEXT DEFAULT 'approved',        -- pending | approved | disputed
  notes TEXT,
  
  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Delta Engine queries
CREATE INDEX idx_time_punches_org_date ON time_punches(organization_id, clocked_in_at);
CREATE INDEX idx_time_punches_team_member ON time_punches(team_member_id, clocked_in_at);
CREATE INDEX idx_time_punches_external ON time_punches(organization_id, external_id);
CREATE INDEX idx_time_punches_shift ON time_punches(schedule_shift_id);
```

### `team_member_wages` (Phase 3)

Wage history per role assignment. Supports the costing layer.

```sql
CREATE TABLE team_member_wages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  
  -- 7shifts provenance
  external_id BIGINT,
  external_user_id BIGINT,
  source TEXT NOT NULL DEFAULT '7shifts',
  
  -- Wage data
  role_id BIGINT,
  role_name TEXT,
  wage_type TEXT NOT NULL,               -- 'hourly' | 'salary'
  wage_rate NUMERIC(10,2) NOT NULL,      -- $/hr or $/year
  effective_date DATE NOT NULL,
  end_date DATE,                         -- null = current
  
  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wages_org_member ON team_member_wages(organization_id, team_member_id);
CREATE INDEX idx_wages_role ON team_member_wages(organization_id, role_name);
```

### `team_member_availability` (Phase 4)

```sql
CREATE TABLE team_member_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_member_id UUID REFERENCES team_members(id),
  
  -- 7shifts provenance
  external_id BIGINT,
  external_user_id BIGINT,
  source TEXT NOT NULL DEFAULT '7shifts',
  
  -- Availability data
  day_of_week INTEGER NOT NULL,          -- 0=Sun, 6=Sat
  available_from TIME,                   -- null = unavailable all day
  available_to TIME,
  is_available BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT true,     -- weekly pattern vs. one-time
  specific_date DATE,                    -- if not recurring
  reason TEXT,
  status TEXT DEFAULT 'approved',        -- pending | approved | denied
  
  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `time_off_requests` (Phase 4)

```sql
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_member_id UUID REFERENCES team_members(id),
  
  -- 7shifts provenance
  external_id BIGINT,
  external_user_id BIGINT,
  source TEXT NOT NULL DEFAULT '7shifts',
  
  -- Request data
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  partial_day BOOLEAN DEFAULT false,
  partial_start TIME,
  partial_end TIME,
  category TEXT,                         -- 'vacation' | 'sick' | 'personal' | 'other'
  status TEXT DEFAULT 'pending',         -- pending | approved | declined
  comments TEXT,
  
  -- Hours
  total_hours NUMERIC(6,2),
  
  -- Audit
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `team_member_roles` (Phase 3 — extends team_members)

If the existing `team_members` table already has a role field, we may extend it rather than create a new table. 7shifts supports multiple role assignments per user (cross-training), so this may need a junction table:

```sql
CREATE TABLE team_member_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  
  -- 7shifts provenance
  source TEXT NOT NULL DEFAULT '7shifts',
  
  -- Assignment
  role_id BIGINT,
  role_name TEXT NOT NULL,
  department_id BIGINT,
  department_name TEXT,
  location_id BIGINT,
  is_primary BOOLEAN DEFAULT false,
  
  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_role_assignments_member ON team_member_role_assignments(team_member_id);
```

---

## Costing Layer Integration

### The Principle

A recipe's true cost = `ingredient_cost + labor_cost`

Labor cost is calculated at the **role level**, not the individual level. This means "what does a Prep Cook hour cost?" rather than "what does Steve's hour cost?" The role-level approach:
- Avoids privacy concerns around individual wages
- Gives stable costs that don't fluctuate with scheduling
- Aligns with how restaurants actually think about labor allocation

### The Calculation

```
labor_cost_per_recipe_batch = 
  SUM(
    active_prep_time_minutes / 60  ×  avg_hourly_rate_for_role
  )
```

Where `avg_hourly_rate_for_role` comes from:
1. `team_member_wages` table, filtered by role
2. Average of all current (end_date IS NULL) hourly rates for that role
3. Cached and recalculated on nightly sync

### Where It Surfaces

| Module | How Labor Cost Appears |
|--------|----------------------|
| Recipe Manager | "Labor: $13.50/batch" alongside ingredient cost |
| Recipe Costing | Total cost = ingredients + labor, with breakdown |
| Prep Lists | Each prep item shows estimated labor cost based on prep time × role rate |
| Task Lists | Task duration × role rate = labor cost per task |
| Menu Engineering | Food cost % can include or exclude labor (toggle) |

### Role Rate Lookup

```sql
-- View: current average hourly rate per role per organization
CREATE VIEW role_labor_rates AS
SELECT 
  organization_id,
  role_name,
  AVG(wage_rate) as avg_hourly_rate,
  MIN(wage_rate) as min_hourly_rate,
  MAX(wage_rate) as max_hourly_rate,
  COUNT(*) as employee_count
FROM team_member_wages
WHERE wage_type = 'hourly'
  AND end_date IS NULL
GROUP BY organization_id, role_name;
```

---

## Delta Engine Architecture

### Concept

The Delta Engine compares **scheduled shifts** against **actual time punches** to produce actionable attendance intelligence.

```
Scheduled Shift:  10:00 AM → 6:00 PM (8 hours)
Actual Punch:     10:12 AM → 6:45 PM (8.55 hours, 12 min late, 45 min overtime)
Delta:            +12 min late arrival, +45 min overtime, net +33 min
```

### Matching Logic

Time punches link to scheduled shifts via:
1. **External shift ID** (7shifts provides this on some punches)
2. **Employee + Date + Time window** (fuzzy match: same person, same day, ±2 hour start time tolerance)
3. **Unmatched punches** = unscheduled shifts (flagged for review)
4. **Unmatched shifts** = no-shows (flagged for review)

### Delta Categories

| Category | Definition | Team Performance Impact |
|----------|-----------|------------------------|
| **On Time** | Clocked in within ±5 min of scheduled start | No action |
| **Late Arrival** | Clocked in >5 min after scheduled start | Points per attendance policy |
| **Early Departure** | Clocked out >15 min before scheduled end | Points per attendance policy |
| **No Show** | Scheduled shift with no matching punch | Highest point value |
| **Unscheduled** | Time punch with no matching shift | Flagged for manager review |
| **Overtime** | Actual hours exceed scheduled hours | Flagged, cost impact calculated |
| **Short Shift** | Actual hours significantly less than scheduled | Flagged for investigation |

### Feed into Team Performance

The Delta Engine produces `attendance_events` that feed directly into the existing points-based system:

```sql
-- Generated by Delta Engine after each time_punches sync
INSERT INTO attendance_records (
  organization_id, team_member_id, 
  event_type,       -- 'late_arrival', 'no_show', 'early_departure', etc.
  event_date,
  scheduled_start, scheduled_end,
  actual_start, actual_end,
  delta_minutes,
  points_assessed,  -- per attendance policy tier
  source            -- '7shifts_delta_engine'
);
```

---

## Edge Function Expansion

### New Actions for `7shifts-proxy` v6

| Action | API Call | Purpose |
|--------|---------|---------|
| `get_time_punches` | `GET /company/{id}/time_punches` | Clock-in/clock-out data |
| `get_user_wages` | `GET /users/{id}/wages` (per user) | Wage history |
| `get_assignments` | `GET /assignments` | Role/dept/location assignments |
| `get_availabilities` | `GET /availabilities` | Employee availability patterns |
| `get_time_off` | `GET /time_off` | Time-off requests and statuses |
| `scheduled_sync` | (orchestrator) | Multi-stream sync for CRON |

The `scheduled_sync` action is the CRON entry point. It receives a list of streams to sync and runs them in sequence, returning a summary:

```jsonc
// Request
{
  "action": "scheduled_sync",
  "organizationId": "uuid",
  "integrationKey": "7shifts",
  "streams": ["time_punches", "shifts"],
  "params": {
    "sync_window_hours": 48  // how far back to look for changes
  }
}

// Response
{
  "results": {
    "time_punches": { "synced": 47, "created": 3, "updated": 44, "errors": 0 },
    "shifts": { "synced": 23, "created": 0, "updated": 2, "errors": 0 }
  },
  "duration_ms": 1840,
  "next_sync_at": "2026-02-10T15:30:00Z"
}
```

---

## Build Phases

### Phase 1: Foundation — Shifts + Users + Vault Security ✅
**Status:** Built (Sessions 107–110), awaiting integration testing

- [x] Vault-encrypted credential storage
- [x] Edge Function v5 with credential resolver
- [x] Shift sync with employee matching
- [x] IntegrationCard status badges (all states)
- [x] Config panel with connect/disconnect/reconnect flows
- [x] Stale data warning banner
- [ ] Integration test checklist (Session 110 — NEXT)

### Phase 2: Time Punches + Delta Engine
**Value:** Transforms attendance from manual to data-driven

- [ ] `time_punches` table migration
- [ ] Edge Function: `get_time_punches` action
- [ ] Client library: `syncTimePunches()` function
- [ ] Delta Engine: shift-to-punch matching algorithm
- [ ] Delta Engine: attendance event generation
- [ ] Team Performance integration: auto-populated attendance records
- [ ] Gap Scanner evolution: scheduled-vs-actual comparison view
- [ ] Config panel: time punch sync controls

### Phase 3: Wages + Assignments → Costing Layer
**Value:** Real labor costs in recipes and prep lists

- [ ] `team_member_wages` table migration
- [ ] `team_member_role_assignments` table migration
- [ ] Edge Function: `get_user_wages`, `get_assignments` actions
- [ ] `role_labor_rates` view
- [ ] Recipe Manager: labor cost per batch (prep_time × role_rate)
- [ ] Prep List: labor cost per item
- [ ] Roster: multi-role assignment display

### Phase 4: Availability + Time Off → Team Performance
**Value:** Complete people picture for scheduling intelligence

- [ ] `team_member_availability` table migration
- [ ] `time_off_requests` table migration
- [ ] Edge Function: `get_availabilities`, `get_time_off` actions
- [ ] Team Performance: availability calendar view
- [ ] Team Performance: time-off request visibility
- [ ] Time off integration with ESA-compliant sick leave tracking

### Phase 5: CRON Automation
**Value:** "Set it and forget it" — data stays fresh automatically

- [ ] `pg_cron` job: high-frequency dispatcher (every 15 min)
- [ ] `pg_cron` job: nightly batch (2 AM)
- [ ] Edge Function: `scheduled_sync` orchestrator action
- [ ] Config panel: frequency selector dropdown
- [ ] Config panel: operating hours configuration
- [ ] Config panel: per-stream enable/disable (Omega only)
- [ ] Sync history log (visible in config panel)
- [ ] NEXUS: automated_sync event type

---

## Omega vs. Standard Admin Visibility

| Feature | Standard Admin | Omega |
|---------|---------------|-------|
| Frequency dropdown | ✅ Single selector | ✅ Single selector |
| Stream toggles | Hidden (all enabled) | ✅ Per-stream on/off |
| Operating hours | ✅ Start/end time | ✅ Start/end time |
| Sync history | Last sync timestamp | Full sync log with stream details |
| Delta Engine view | Summary badges | Full delta breakdown with raw data |
| Wage data | Labor cost on recipes | Raw wage table access |

---

## Notes

- All new tables get RLS policies scoped to `organization_id` from JWT claims
- All tables include `source` column for multi-platform future (Deputy, HotSchedules)
- All tables include `external_id` for upsert-based sync (no duplicates)
- Wage data at role level for costing (not individual — privacy by design)
- Delta Engine runs as a post-sync step after time_punches land
- NEXUS logs every automated sync with stream counts and duration
