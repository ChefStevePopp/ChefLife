# Handoff: Time-Off Tracking Implementation
**Date:** January 5, 2026  
**Session Focus:** Sick days + vacation tracking on Team Tab for staged event review

---

## Summary

Implemented time-off tracking (sick days + vacation) displayed on the **Team Tab** member rows. This gives managers visibility into each team member's sick/vacation balance when reviewing staged attendance events - right where they need it when deciding whether to excuse an event as "SICK OK".

**L5 Design Compliance:** Uses Lucide icons (Thermometer, Palmtree) - no emojis.

---

## Files Modified

### 1. `src/features/team/types/index.ts`
- **Added:** `TimeOffUsage` interface
  ```typescript
  export interface TimeOffUsage {
    sick_days_used: number;
    sick_days_available: number;
    sick_period_start: string;  // ISO date
    vacation_hours_used?: number;
    vacation_hours_available?: number;
  }
  ```
- **Modified:** `TeamMemberPerformance` interface to include `time_off?: TimeOffUsage`

### 2. `src/stores/performanceStore.ts`
- **Added:** `TimeOffConfig` interface for extended config
- **Added:** `ExtendedPerformanceConfig` interface extending base config with `time_off`
- **Added:** `getSickPeriodStart()` utility function
  - Calculates reset period start based on config (calendar_year, anniversary, fiscal_year)
  - Handles anniversary calculation based on hire date
- **Modified:** `fetchTeamPerformance()` to:
  - Query `activity_logs` for excused events with `excuse_reason = 'SICK OK'`
  - Calculate sick days used per member based on their reset period
  - Include `time_off` data in the performance map
- **Modified:** `fetchConfig()` to include `time_off` settings from org config

### 3. `src/features/team/components/TeamPerformance/components/TeamTab.tsx`
- **Added imports:** `Thermometer`, `Palmtree` from lucide-react
- **Added:** Time-off split column on member rows showing:
  - **Sick:** Thermometer icon + `X/Y` (used/available days)
  - **Divider:** Vertical gray line
  - **Vacation:** Palmtree icon + `X/Yh` (used/available hours)
- **Color coding:**
  - Gray: None used
  - Amber/Sky: Some used (amber for sick, sky for vacation)
  - Rose: All used or exceeded

### 4. `src/features/team/components/TeamPerformance/components/PointsTab.tsx`
- **Removed:** Sick days display (Points Tab is for ledger auditing, not time-off)

---

## Visual Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ > [Avatar] Jane Smith          [2 pending]     🌡️ 1/3 | 🌴 8/40h    + Event  - Reduce │
│            Tier 1 • 0 pts                                                         │
└──────────────────────────────────────────────────────────────────────┘
                                                  └─────────────────┘
                                                   Time-Off Split Column
```

---

## How It Works

1. **Sick Days Data Source:** When a manager excuses an event with "SICK OK" reason, NEXUS logs it to `activity_logs` with:
   - `activity_type: 'performance_event_excused'`
   - `details.excuse_reason: 'SICK OK'`
   - `details.team_member_id: <member_id>`

2. **Counting Logic:**
   - Query all excused events from start of current year (baseline)
   - Filter per-member based on their sick reset period
   - Reset periods supported:
     - `calendar_year` - Jan 1 to Dec 31
     - `anniversary` - Hire date to next hire date
     - `fiscal_year` - Configurable (defaults to Jan 1)

3. **Display Location:** Team Tab member rows (where staged events are reviewed)

---

## Configuration

Time-off settings are in Team Performance Config (`/admin/modules/team-performance`):

```typescript
time_off: {
  enabled: boolean;
  protected_sick_days: number;     // e.g., 3 (Ontario ESA)
  sick_reset_period: 'calendar_year' | 'anniversary' | 'fiscal_year';
  // Vacation settings (future - Phase 2)
}
```

---

## Next Steps

1. **Vacation Tracking (Phase 2)**
   - Create `time_off_usage` table for manual vacation logging
   - Add "Log Time Off" modal to record approved vacation
   - Calculate vacation entitlement based on accrual method config

2. **7shifts Integration (Phase 3)**
   - Import approved time-off requests from 7shifts API
   - Auto-populate usage table

---

## Testing Notes

- To see time-off display:
  1. Ensure `time_off.enabled: true` in org config
  2. Navigate to Team Performance > Team tab
  3. Member rows should show the split column with Thermometer (sick) | Palmtree (vacation)

- Vacation will show 0/0h until Phase 2 table is created
