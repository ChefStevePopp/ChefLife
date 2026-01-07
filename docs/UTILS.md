# ChefLife Utilities Documentation

This document describes the utility modules in `src/utils/` for developer reference.

---

## Date Utilities

ChefLife has **two** date utility files serving different purposes:

### `dateUtils.ts` — Local Timezone Date Strings (RECOMMENDED)
**Use for:** Database date fields (YYYY-MM-DD), event dates, period calculations

This module handles date **strings** in YYYY-MM-DD format without timezone conversion issues. 

**⚠️ CRITICAL:** Never use `new Date('2026-01-06')` for date strings from the database. This interprets as UTC midnight, displaying as the previous day in EST/local time.

#### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getLocalDateString` | `(date?: Date) => string` | Today (or given date) as YYYY-MM-DD in local timezone |
| `getLocalYear` | `() => number` | Current year in local timezone |
| `getLocalYearStart` | `(year?: number) => string` | Start of year as YYYY-MM-DD |
| `getLocalYearEnd` | `(year?: number) => string` | End of year as YYYY-MM-DD |
| `parseLocalDate` | `(dateStr: string) => Date` | Parse YYYY-MM-DD to Date without UTC shift |
| `formatDateForDisplay` | `(dateStr: string, options?) => string` | Format for UI display (default: "Jan 6, 2026") |
| `formatDateShort` | `(dateStr: string) => string` | Short format: "Jan 6" |
| `formatDateLong` | `(dateStr: string) => string` | Long format: "Monday, January 6, 2026" |
| `getPeriodStart` | `(resetPeriod, hireDate?) => string` | Calculate reset period start date |
| `getDaysAgo` | `(n: number) => string` | N days ago as YYYY-MM-DD |
| `isDateInRange` | `(dateStr, startStr, endStr?) => boolean` | Check if date is within range |
| `compareDateStrings` | `(a: string, b: string) => number` | Compare two date strings |
| `getWeekBounds` | `(dateStr: string) => {start, end}` | Get week start/end containing date |
| `isCurrentYear` | `(dateStr: string) => boolean` | Check if date is in current year |
| `getRelativeDateLabel` | `(dateStr: string) => string \| null` | Returns "Today", "Yesterday", or null |

#### Usage Examples

```typescript
import { 
  getLocalDateString, 
  formatDateForDisplay, 
  parseLocalDate,
  getPeriodStart 
} from '@/utils/dateUtils';

// Get today's date for database insert
const eventDate = getLocalDateString(); // "2026-01-06"

// Display a date from the database
<span>{formatDateForDisplay(entry.event_date)}</span> // "Jan 6, 2026"

// Compare dates (string comparison works for YYYY-MM-DD)
if (eventDate >= periodStart) { ... }

// Need a Date object for date-fns or other libs
const dateObj = parseLocalDate(entry.event_date);

// Calculate sick day reset period
const periodStart = getPeriodStart('calendar_year'); // "2026-01-01"
const anniversaryStart = getPeriodStart('anniversary', member.hire_date);
```

#### The Timezone Problem (Why This Module Exists)

```typescript
// Database stores: "2026-01-06"

// ❌ WRONG - Interprets as UTC midnight = Jan 5 at 7pm EST
new Date("2026-01-06").toLocaleDateString('en-US'); // "1/5/2026" in EST!

// ✅ CORRECT - Uses local timezone
parseLocalDate("2026-01-06").toLocaleDateString('en-US'); // "1/6/2026"
formatDateForDisplay("2026-01-06"); // "Jan 6, 2026"
```

---

### `date.ts` — Date Object Operations
**Use for:** Working with JavaScript Date objects, relative dates, date-fns operations

Uses `date-fns` library for Date object formatting and manipulation.

#### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatDate` | `(date: Date) => string` | Format as "Jan 6, 2026" |
| `formatTime` | `(date: Date) => string` | Format as "3:30 PM" |
| `formatDateTime` | `(date: Date) => string` | Format as "Jan 6, 2026 3:30 PM" |
| `getRelativeDay` | `(date: Date) => string` | "Today", "Tomorrow", or "Monday, Jan 6" |
| `getNextNDays` | `(n: number) => Date[]` | Array of next N days as Date objects |

#### Usage Examples

```typescript
import { formatDate, getRelativeDay, getNextNDays } from '@/utils/date';

// Format a Date object
const now = new Date();
console.log(formatDate(now)); // "Jan 6, 2026"

// Get relative day label
console.log(getRelativeDay(new Date())); // "Today"

// Get next 7 days for a date picker
const week = getNextNDays(7);
```

---

## When to Use Which Date Module

| Scenario | Module | Example |
|----------|--------|---------|
| Database date field (YYYY-MM-DD) | `dateUtils` | `formatDateForDisplay(record.event_date)` |
| Default date for form input | `dateUtils` | `getLocalDateString()` |
| Date comparison from DB | `dateUtils` | `if (dateStr >= startStr)` (string compare) |
| Current timestamp | `date` | `formatDateTime(new Date())` |
| Relative day display | `date` | `getRelativeDay(scheduleDate)` |
| Date arithmetic | `date` / `date-fns` | `addDays(date, 7)` |

---

## Other Utility Modules

### `calendarUtils.ts`
Calendar-related utilities (not yet documented).

### `employeeMatching.ts`
Utilities for matching employees between systems (7shifts, etc.).

### `excel/` and `excel.ts`
Excel file generation and parsing utilities for reports and imports.

### `masterIngredientsTemplate.ts`
Template generation for ingredient master list imports.

### `number.ts`
Number formatting utilities.

### `string.ts`
String manipulation utilities.

### `validation.ts`
Form and data validation utilities.

---

## Adding New Utilities

When adding new date-related utilities:
1. **String dates (YYYY-MM-DD):** Add to `dateUtils.ts`
2. **Date object operations:** Add to `date.ts` or use date-fns directly
3. **Document here** with signature and usage example

For other utilities:
1. Add to appropriate existing module or create new file
2. Export from `index.ts` if broadly used
3. Document here

---

## Index Exports

`src/utils/index.ts` re-exports commonly used utilities. Check this file to see what's available via `@/utils`.
