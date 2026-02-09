# Session 81 Handoff — Team Performance Data Flow Audit

**Date:** February 8, 2026  
**Session:** 81  
**Focus:** Complete end-to-end audit of Team Performance module data pipeline  
**Status:** ✅ AUDIT COMPLETE — Pipeline verified correct, no issues found

---

## What Was Completed

Full read-through and verification of the Team Performance module's data pipeline from CSV import through final UI display and NEXUS audit trail.

### Files Reviewed

| File | Purpose |
|------|---------|
| `src/features/team/services/deltaEngine.ts` | CSV parsing, shift matching, event detection |
| `src/features/team/components/TeamPerformance/index.tsx` | Main module (600+ lines, state machine, tabs) |
| `src/features/team/components/TeamPerformance/components/TeamTab.tsx` | Manager review interface |
| `src/features/team/components/ImportTab/index.tsx` | CSV upload and processing |
| `src/stores/performanceStore.ts` | Data aggregation, point calculations, tier assignment |

### Database Tables Verified

- `staged_events` — pending review events from imports
- `performance_point_events` — approved point-adding events
- `performance_point_reductions` — approved point-reducing events (30-day cap)
- `performance_coaching_records` — auto-triggered coaching records
- `performance_improvement_plans` — active PIPs
- `performance_cycles` — quadmester/trimester boundaries
- `organization_team_members` — active team roster
- `activity_logs` (NEXUS) — audit trail + sick day tracking

---

## Verified Data Flow (End-to-End)

### Phase 1: CSV Import → Delta Engine → Event Detection

1. ImportTab receives two 7shifts CSV exports (Scheduled + Worked)
2. Delta Engine parses into `ParsedShift` objects (filters zero-duration clock errors)
3. Groups shifts by employee + date
4. **Time-Proximity Matching:** Each worked shift matched to closest scheduled shift within 4-hour window (each scheduled shift matches once)
5. Calculates variances: `startVariance = workedIn - scheduledIn`, `endVariance = workedOut - scheduledOut`

**Event Detection Thresholds:**
- 5-15 min late = tardiness_minor (1 pt)
- 15+ min late = tardiness_major (2 pts)
- Left 30+ min early = early_departure (2 pts)
- Stayed 60+ min late = stay_late (-1 pt reduction)
- Arrived 30+ min early = arrive_early (-1 pt reduction)

**Security Exemptions:**
- Levels 0-1 (Owner, System): Exempt from all tracking
- Level 2 (Manager): Exempt from unscheduled shift tracking only
- Levels 3-5: Fully tracked

### Phase 2: Staging → Deduplication → Database Write

- Three-table dedup check (composite key: `team_member_id|event_date|event_type`)
- Checks `staged_events`, `performance_point_events`, `performance_point_reductions`
- NEXUS logs: `performance_import_processed`, `performance_events_staged`

### Phase 3: Team Review → Approve/Reject/Excuse/Modify

- **Approve (✓):** Auto-creates cycle if needed → inserts to point_events or point_reductions → deletes from staged
- **Modify (✏️):** Reclassify event type, adjust points, approve with `was_modified` flag
- **Excuse (🛡️):** Reason selection (SICK OK, LATE OK, etc.) → deletes from staged, no points
- **Reject (✗):** Discards entirely → deletes from staged
- Sick Day tracking: "SICK OK" excuses logged to activity_logs for time-off calculations

### Phase 4: Store Aggregation → Point Calculations → Tier Assignment

- `fetchTeamPerformance(cycleId?)` fetches all 7 data sources
- Running balance calculated chronologically (never below 0)
- 30-day reduction cap: max 3 pts reduction per rolling 30 days
- **Tiers:** 0-2 pts = Tier 1 (Excellence), 3-5 = Tier 2 (Strong), 6+ = Tier 3 (Focus)
- **Auto-coaching:** Threshold crossings auto-create pending coaching records

### Phase 5: UI Display → Module State Machine → Cycle Management

- State machine: `loading → not_enabled → setup_required → no_data → ready → error`
- 7-tab interface: Overview, Team, Points, Coaching, PIPs, Reports, Import
- Cycle auto-creation with quadmester boundaries (Jan-Apr, May-Aug, Sep-Dec)

---

## Configuration Source

`organizations.modules.team_performance.config` — deep-merged with defaults on fetch. Used by Delta Engine, store, and UI.

---

## Key Architectural Patterns Verified

| Pattern | Status |
|---------|--------|
| Three-table deduplication | ✅ Correct |
| Time-proximity shift matching (4hr window) | ✅ Correct |
| Running balance (never below 0) | ✅ Correct |
| 30-day reduction cap (3 pts max) | ✅ Correct |
| Auto-coaching on threshold crossing | ✅ Correct |
| Security level exemptions | ✅ Correct |
| Cycle auto-creation | ✅ Correct |
| NEXUS audit trail coverage | ✅ Complete |
| Timezone-safe date handling | ✅ Uses dateUtils |
| Sick day tracking via NEXUS | ✅ Deduplicates by date |

---

## What's Next (Session 82)

Continue working on Team Performance data flow — areas to explore:

1. **Data integrity edge cases** — what happens with overlapping cycles, retroactive imports, mid-cycle config changes
2. **Store ↔ Component sync** — verify TeamTab + TeamPerformance are consuming store data correctly and re-fetching on mutations
3. **Config propagation** — ensure config changes (thresholds, cycle length) properly cascade through Delta Engine and store
4. **Performance optimization** — identify any N+1 queries, unnecessary re-renders, or fetch waterfalls
5. **Missing features or gaps** — anything promised in roadmap but not yet wired up

---

*Session 81 — February 8, 2026*
