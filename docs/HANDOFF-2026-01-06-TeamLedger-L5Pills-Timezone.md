# Handoff: Team Ledger View + L5 Action Pills + Timezone Fixes
**Date:** January 6, 2026  
**Session Focus:** Team-wide audit ledger, L5 pill button styling, local timezone date handling

---

## Summary

Three major enhancements to the Team Performance module:

1. **Team Ledger View** — New view mode on Points Tab showing ALL events across the entire team in a chronological feed with filtering, search, and manager actions
2. **L5 Action Pills** — Consistent round pill button design for time-off indicators and action buttons
3. **Timezone Fixes** — Created `dateUtils.ts` utility to handle local dates correctly (no more UTC shift issues)

---

## Files Created

### 1. `src/utils/dateUtils.ts` (NEW)
Centralized date utilities for local timezone handling.

**Key Functions:**
```typescript
// Get today as YYYY-MM-DD in local timezone
getLocalDateString(date?: Date): string

// Get current year in local timezone  
getLocalYear(): number

// Parse YYYY-MM-DD without UTC shift
parseLocalDate(dateStr: string): Date

// Format for display (uses parseLocalDate internally)
formatDateForDisplay(dateStr: string, options?: Intl.DateTimeFormatOptions): string
formatDateShort(dateStr: string): string      // "Jan 6"
formatDateLong(dateStr: string): string       // "Monday, January 6, 2026"

// Period calculations for reset logic
getPeriodStart(resetPeriod: 'calendar_year' | 'anniversary' | 'fiscal_year', hireDate?: string): string

// Utility
getDaysAgo(n: number): string                 // N days ago as YYYY-MM-DD
isDateInRange(dateStr: string, startStr: string, endStr?: string): boolean
compareDateStrings(a: string, b: string): number
```

**Why This Exists:**
`new Date('2026-01-06')` interprets the string as UTC midnight, which displays as Jan 5th at 7pm EST. Using `parseLocalDate()` constructs the date with local timezone: `new Date(2026, 0, 6)`.

**Usage Pattern:**
```typescript
// ❌ WRONG - causes timezone shift
new Date(entry.event_date).toLocaleDateString(...)

// ✅ CORRECT - preserves local date
formatDateForDisplay(entry.event_date)
```

### 2. `src/features/team/components/TeamPerformance/components/AddSickDayModal.tsx` (NEW)
Modal for manually logging sick days with ESA compliance info.

**Features:**
- Shows current ESA usage (X/3 days)
- Date picker (cannot log future dates)
- Optional notes field
- Logs via NEXUS with `performance_event_excused` activity type
- Deduplicates by date (one sick day per calendar date)

### 3. `src/features/team/components/TeamPerformance/components/AddVacationModal.tsx` (NEW)
Modal for logging vacation time with flexible entry modes.

**Features:**
- Two entry modes: By Hours or By Dates
- **By Hours:** Single date + hour input with quick-select buttons (4h, 8h, 16h, 24h, 40h)
- **By Dates:** Date range picker, auto-calculates hours (days × 8h)
- Logs via NEXUS with `performance_vacation_logged` activity type

---

## Files Modified

### 1. `src/features/team/components/TeamPerformance/components/PointsTab.tsx`
**Major Enhancement:** Added view mode toggle and Team Ledger view.

**New Features:**
- **View Mode Toggle** — L5 pill buttons: `[👥 By Member]` `[📋 Team Ledger]`
- **Team Ledger View:**
  - Chronological feed of ALL events across team
  - Sticky date headers ("Monday, January 6, 2026")
  - Filters: Date range, event type (all/demerits/merits), specific member, search
  - Stats bar: "47 events • 32 demerits • 15 merits • Net: +24 pts"
  - Full manager actions (reclassify, excuse, remove) directly in ledger
  - Click member name to jump to their individual "By Member" view
  - Pagination (25 entries per page)

**L5 Styling Updates:**
- All date displays now use `dateUtils` formatters
- Manager action buttons use round pill style with hover states

### 2. `src/features/team/components/TeamPerformance/components/TeamTab.tsx`
**L5 Action Pills** — Replaced text buttons with interactive pill buttons:

```
[🌡️ 1/3]  [🌴 0h]  [➕]  [➖]
```

**Status Pills (Sick/Vacation):**
- Clickable → Opens respective modal
- Color states: Gray (none) → Amber/Sky (some) → Rose (all used)
- Tooltips explain click action

**Action Pills (Add Event/Reduction):**
- Round buttons with Plus/Minus icons
- Hover states: Gray → Amber (demerit) / Emerald (merit)

**Design Specs:**
```css
/* Status pills */
.status-pill {
  @apply rounded-full px-2.5 py-1.5 border transition-all duration-200;
}

/* Action pills */
.action-pill {
  @apply w-8 h-8 rounded-full border flex items-center justify-center;
}
```

### 3. `src/stores/performanceStore.ts`
**Timezone Fixes:**
- Imports `getLocalYear`, `getLocalDateString`, `getPeriodStart`, `getDaysAgo` from dateUtils
- Uses string comparison for period dates (avoids Date object conversion)
- `getLocalDateString()` for default event dates instead of `new Date().toISOString().split('T')[0]`
- `getDaysAgo(30)` for 30-day reduction limit calculation

### 4. `src/features/team/components/TeamPerformance/components/index.ts`
- Exported `AddSickDayModal` and `AddVacationModal`

---

## Visual Reference

### Team Tab - L5 Action Pills
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ > [Avatar] Jane Smith          [2 pending]     [🌡️ 1/3] [🌴 0h] [➕] [➖]         │
│            Tier 1 • 0 pts                       ↑         ↑       ↑    ↑          │
└────────────────────────────────────────────────│─────────│───────│────│──────────┘
                                                 │         │       │    │
                                    Sick pill ───┘         │       │    └── Point reduction
                                    (click to log)         │       └─────── Add event
                                                           └───────────── Vacation pill
                                                           (click to log)
```

### Points Tab - View Mode Toggle
```
┌─────────────────────────────────────────────────────────────────┐
│  [👥 By Member]  [📋 Team Ledger]           Cycle: Jan 1 - Apr 30, 2026  │
└─────────────────────────────────────────────────────────────────┘
```

### Team Ledger View
```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [Search...]     [📅 From] → [📅 To]     [All Events ▼]  [All Members ▼]       │
├────────────────────────────────────────────────────────────────────────────────┤
│  5 events • 3 demerits • 2 merits • Net: +1 pts                                │
├────────────────────────────────────────────────────────────────────────────────┤
│  DATE          TEAM MEMBER              EVENT                    POINTS  NOTES │
├────────────────────────────────────────────────────────────────────────────────┤
│  Saturday, January 4, 2026                                                     │
│  Jan 4     [👤] McCabe Frost  T1    [↑] Tardiness (5-15 min)      +1     —     │
│  Jan 4     [👤] McCabe Frost  T1    [↓] Stayed 2+ Hours Late      -1     —     │
├────────────────────────────────────────────────────────────────────────────────┤
│  Thursday, January 2, 2026                                                     │
│  Jan 2     [👤] Darius St. Pierre T1 [↑] Tardiness (5-15 min)     +1     —     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Timezone Pattern - CRITICAL

**The Problem:**
```typescript
// Database stores: "2026-01-06"
// JS interprets as: UTC midnight = Jan 5, 7pm EST
new Date("2026-01-06").toLocaleDateString() // Shows "Jan 5" in EST!
```

**The Solution:**
```typescript
import { formatDateForDisplay, parseLocalDate } from '@/utils/dateUtils';

// For display
formatDateForDisplay(entry.event_date)  // Always correct

// For Date object (if needed)
parseLocalDate(entry.event_date)  // Local midnight, not UTC

// For comparisons - use strings directly
if (eventDate >= periodStart) { ... }  // YYYY-MM-DD sorts correctly
```

**Going Forward:**
- **NEVER** use `new Date(dateString)` for YYYY-MM-DD strings
- **ALWAYS** use `parseLocalDate()` or `formatDateForDisplay()`
- String comparison works for YYYY-MM-DD: `'2026-01-05' < '2026-01-06'` ✓

---

## Configuration

No new configuration required. Uses existing Team Performance config.

---

## Testing Checklist

- [ ] Team Tab: Click sick pill → AddSickDayModal opens
- [ ] Team Tab: Click vacation pill → AddVacationModal opens
- [ ] Team Tab: Hover states on all pills
- [ ] Points Tab: Toggle between By Member and Team Ledger
- [ ] Team Ledger: Date headers show correct dates (not shifted)
- [ ] Team Ledger: Filters work (date range, type, member, search)
- [ ] Team Ledger: Manager actions work (reclassify, excuse, remove)
- [ ] Team Ledger: Click member name → switches to By Member view for that person

---

## Next Steps

1. **Vacation Tracking (Phase 2)**
   - Create `time_off_usage` table for persistent vacation tracking
   - Calculate vacation entitlement based on accrual config

2. **7shifts Integration (Phase 3)**
   - Import approved time-off requests automatically

3. **Export Functionality**
   - Add CSV/PDF export to Team Ledger view

---

## Related Files Reference

```
src/
├── utils/
│   └── dateUtils.ts                    # NEW - Timezone-safe date utilities
├── stores/
│   └── performanceStore.ts             # Modified - Uses dateUtils
└── features/team/components/TeamPerformance/
    └── components/
        ├── TeamTab.tsx                 # Modified - L5 action pills
        ├── PointsTab.tsx               # Modified - Team Ledger view
        ├── AddSickDayModal.tsx         # NEW
        ├── AddVacationModal.tsx        # NEW
        └── index.ts                    # Modified - Exports new modals
```
