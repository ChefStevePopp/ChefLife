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

## Shared UI Components

Reusable UI components live in `src/components/ui/` and `src/shared/components/`.

### Destructive Action Protection

| Component | Location | Use Case |
|-----------|----------|----------|
| `ConfirmDialog` | `@/shared/components/ConfirmDialog` | Modal confirmation for major actions |
| `TwoStageButton` | `@/components/ui/TwoStageButton` | Inline "click twice" protection |

#### TwoStageButton

Lightweight inline protection for destructive actions. First click expands to show confirmation, second click executes.

```typescript
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { Trash2, X, Lock, Pencil } from "lucide-react";

// Cancel button
<TwoStageButton
  onConfirm={() => handleCancel()}
  icon={X}
  confirmText="Sure?"
  variant="danger"
/>

// Delete button
<TwoStageButton
  onConfirm={() => handleDelete()}
  icon={Trash2}
  confirmText="Delete?"
  variant="danger"
/>

// Smaller unlock/override button with icon change
<TwoStageButton
  onConfirm={() => enableOverride()}
  icon={Lock}
  confirmIcon={Pencil}
  confirmText="Override?"
  variant="warning"
  size="xs"
  timeout={3000}
/>
```

**Props:**
- `onConfirm` — Action to execute on second click
- `icon` — Lucide icon (default: X)
- `confirmIcon` — Optional different icon for confirm state
- `confirmText` — Text shown in confirm state (default: "Sure?")
- `variant` — `"danger"` | `"warning"` | `"neutral"`
- `size` — `"xs"` | `"sm"` | `"md"` (default: "md")
- `timeout` — Auto-reset time in ms (default: 2000)

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

## Friendly ID (Base58 UUID Encoding)

**File:** `src/lib/friendly-id.ts`

Converts UUIDs to short, URL-safe, readable codes - like Bitly but deterministic.

```
UUID:     7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c (36 chars)
Friendly: Xk9mR2pQ (8 chars)
```

**Functions:**

```typescript
import { 
  toFriendlyId, 
  fromFriendlyId, 
  generatePrepItemCode,
  isPrepItemCode 
} from "@/lib/friendly-id";

// Convert UUID to friendly code
const code = toFriendlyId(recipe.id);     // "Xk9mR2pQ"

// Convert back to UUID
const uuid = fromFriendlyId(code);        // "7f3a2b1c-4d5e-..."

// Generate item code for prep ingredient
const itemCode = generatePrepItemCode(recipe.id);

// Check if item code is a prep item (vs vendor code)
const isPrep = isPrepItemCode("Xk9mR2pQ");  // true
const isVendor = isPrepItemCode("1410441"); // false
```

**Use Cases:**
- Prep ingredient item codes (links to source recipe)
- URL-safe recipe slugs
- Scannable/printable codes
- One ID everywhere: MIL, Triage, Labels, URLs

**Ingredient Type Determination:**

```typescript
import { 
  determineIngredientType, 
  isPrepIngredient,
  isPurchasedIngredient 
} from "@/lib/friendly-id";

// Determine type from available signals
const type = determineIngredientType({
  item_code: ingredient.item_code,
  source_recipe_id: ingredient.source_recipe_id,
});
// Returns: 'purchased' | 'prep'

// Convenience checks
if (isPrepIngredient({ item_code: null })) { /* true */ }
if (isPurchasedIngredient({ item_code: "1410441" })) { /* true */ }
```

**Decision Tree:**
1. `source_recipe_id` is set → **PREP** (100% certain)
2. `item_code` is Base58 (friendly ID) → **PREP** (we generated it)
3. `item_code` is numeric → **PURCHASED** (vendor code)
4. `item_code` is null/empty/"-" → **PREP** (no vendor source)
5. Default → **PURCHASED**

---

## Index Exports

`src/utils/index.ts` re-exports commonly used utilities. Check this file to see what's available via `@/utils`.

---

## ExcelColumn Type System

**Location:** `src/types/excel.ts`

The `ExcelColumn` interface defines column behavior for `ExcelDataGrid`.

```typescript
import type { ExcelColumn } from "@/types/excel";

export interface ExcelColumn {
  key: string;           // Data field path (supports dot notation)
  name: string;          // Column header text
  type: "text" | "currency" | "percent" | "imageUrl" | "number" | 
        "boolean" | "date" | "allergen" | "status" | "custom";
  width: number;         // Column width in pixels
  sortable?: boolean;    // Enable sorting (default: true)
  filterable?: boolean;  // Enable filtering (default: false)
  filterType?: "text" | "number" | "currency" | "date" | "select";  // Override filter UI
  align?: "left" | "center" | "right";  // Header and cell alignment
  render?: (value: any, row: any) => React.ReactNode;  // Custom cell renderer
  filterOptions?: { value: string; label: string }[];  // Dropdown filter values
}
```

### filterType vs type

The `filterType` property allows custom columns to specify their filter behavior independently of display:

```typescript
// Icon display + dropdown filter
{
  key: "source",
  type: "custom",           // Display: custom render function
  filterType: "select",     // Filter: dropdown with unique values
  filterable: true,
  render: (value) => <IconBadge value={value} />
}

// Custom display + range filter
{
  key: "percent_complete",
  type: "custom",           // Display: progress bar
  filterType: "number",     // Filter: min/max range inputs
  filterable: true,
  render: (value) => <ProgressBar value={value} />
}
```

| filterType | Filter UI | Use For |
|------------|-----------|--------|
| `text` | Text input / autocomplete | Names, descriptions |
| `select` | Dropdown | Categorical data (status, type) |
| `number` | Min/Max range | Numeric values |
| `currency` | Min/Max range | Dollar amounts |
| `date` | Date range picker | Date fields |

### Custom Column Rendering

Use `type: "custom"` with `render` function for complex cell content:

```typescript
const columns: ExcelColumn[] = [
  {
    key: "source",
    name: "Source",
    type: "custom",
    width: 90,
    align: "center",
    render: (value: string) => (
      <div className="flex justify-center">
        {value === "skipped" ? (
          <Ghost className="w-4 h-4 text-amber-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        )}
      </div>
    ),
  },
  {
    key: "unit_price",
    name: "Price",
    type: "custom",
    width: 100,
    align: "right",
    render: (value: number | null) => (
      <span>{value != null ? `${value.toFixed(2)}` : "-"}</span>
    ),
  },
  {
    key: "percent_complete",
    name: "% Complete",
    type: "custom",
    width: 140,
    align: "center",
    render: (value: number) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${value < 50 ? "bg-rose-500" : "bg-emerald-500"}`} 
               style={{ width: `${value}%` }} />
        </div>
        <span className="text-xs">{value}%</span>
      </div>
    ),
  },
];
```

### Standard Type Behaviors

| Type | Rendering | Notes |
|------|-----------|-------|
| `text` | String value | Searchable, filterable |
| `currency` | `$X.XX` format | Numeric sorting |
| `percent` | `X.X%` format | Numeric sorting |
| `number` | Raw number | Numeric sorting |
| `date` | Locale date string | Date sorting |
| `boolean` | "Yes"/"No" | - |
| `imageUrl` | `ImageWithFallback` | Not sortable |
| `allergen` | `AllergenCell` component | Special MIL component |
| `status` | `StatusCell` component | Special MIL component |
| `custom` | Uses `render` function | Full control |

### Reference Implementation

- **Triage Panel:** `src/features/admin/components/sections/VendorInvoice/components/TriagePanel.tsx`
  - Icon columns, progress bars, action buttons
- **MasterIngredientList:** `src/features/admin/components/sections/recipe/MasterIngredientList/index.tsx`
  - Standard columns with allergen/status special types

---

## Entity Card Pattern

ChefLife uses a consistent card pattern for displaying entities in grids. All cards share the same visual structure from `TeamList`.

### Card Components

| Component | Location | Entity Type |
|-----------|----------|-------------|
| `TeamList` | `@/features/team/components/TeamList` | Team Members (people) |
| `VendorCard` | `@/shared/components/VendorCard` | Vendors (businesses) |
| `IntegrationCard` | `@/shared/components/IntegrationCard` | Third-party integrations |
| `FeatureCard` | `@/shared/components/FeatureCard` | Module features |

### Shared Card Structure

All entity cards follow this exact layout:

```
┌─────────────────────────────────┐
│ [checkbox]                      │  ← Selection (optional)
│         ┌─────┐                 │
│         │LOGO │ ●               │  ← Avatar/Logo + active indicator
│         └─────┘                 │
│        Entity Name              │  ← Name
│    [BADGE] [BADGE]              │  ← Role/Type badges
│   (pill) (pill) (pill)          │  ← Tags/departments/stats
│─────────────────────────────────│
│  📧 info@email.com              │  ← Details line 1
│  📞 555-1234                    │  ← Details line 2
│              [Remove] [Edit] ⋮  │  ← 3-dot menu (slides in)
└─────────────────────────────────┘
```

### VendorCard Usage (Updated Jan 13, 2026)

```typescript
import { VendorCard, type VendorCardData } from "@/shared/components";

// Full data interface
interface VendorCardData {
  vendor_id: string;
  vendor_name: string;
  logo_url?: string;
  // Template configuration status
  has_csv_template: boolean;
  has_pdf_template: boolean;
  // Enabled invoice types
  csv_enabled?: boolean;
  pdf_enabled?: boolean;
  photo_enabled?: boolean;
  manual_enabled?: boolean;
  // Default invoice method
  default_invoice_type?: "csv" | "pdf" | "photo" | "manual";
  // Stats (user-facing: "invoices" not "imports")
  total_invoices: number;
  last_invoice?: string;
  // Optional vendor details
  account_number?: string;
  rep_name?: string;
  rep_email?: string;
  rep_phone?: string;
}

// Usage with controlled menu (like TeamList openMenuId pattern)
const [openMenuId, setOpenMenuId] = useState<string | null>(null);

<VendorCard
  vendor={vendorData}
  onSettings={(v) => handleOpenSettings(v)}
  onConfigureCSV={(v) => handleConfigureCSV(v)}
  onConfigurePDF={(v) => handleConfigurePDF(v)}
  onLogoUpdate={(vendorId, logoUrl) => handleLogoUpdate(vendorId, logoUrl)}
  isMenuOpen={openMenuId === vendorData.vendor_id}
  onMenuToggle={setOpenMenuId}
/>
```

### Colored Initials Fallback

When no logo is uploaded, VendorCard displays colored initials:
- Single word: first 2 chars ("GFS" → "GF")
- Multiple words: first letter of first 2 words ("Highland Packers" → "HP")
- Color determined by hash of vendor name (consistent across renders)

### Tablet-First Design (L6)

VendorCard uses 44px+ touch targets for tablet use:
- `min-h-[36px] min-w-[60px]` on invoice type badges
- `min-h-[44px]` on menu buttons
- Responsive sizing: `w-16 h-16 sm:w-20 sm:h-20` for logo area

### Key Features

1. **Selection Mode** - Checkbox in top-left for bulk operations
2. **Active Indicator** - Green dot when entity is "active" (has template, is_active, etc.)
3. **Clickable Badges** - Type badges (CSV, PDF) launch configuration
4. **Logo Upload** - Hover over icon to upload (for VendorCard)
5. **3-dot Menu** - Slides in from right on hover/click
6. **Consistent Animations** - scale-[1.01] hover, scale-[1.02] selected

### Creating New Entity Cards

When creating a new entity card, copy the structure from `TeamList` or `VendorCard`:

1. Same container classes: `bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border...`
2. Same selection checkbox position and animation
3. Same avatar/logo container: `w-16 h-16 rounded-full/xl ring-2...`
4. Same badge pattern: `px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide border...`
5. Same footer: `mt-auto pt-3 border-t border-gray-700/30`
6. Same menu animation: `transition-all duration-200 ease-out opacity-0 translate-x-4`

---

## Zustand Stores

### vendorConfigsStore (Added Jan 13, 2026)

**File:** `src/stores/vendorConfigsStore.ts`

Manages vendor-level settings (separate from templates in `vendorTemplatesStore`).

```typescript
import { useVendorConfigsStore, inferVendorDefaults } from "@/stores/vendorConfigsStore";

// In component
const { configs, fetchConfigs, saveConfig, getOrCreateConfig } = useVendorConfigsStore();

// Fetch all configs for org
await fetchConfigs(organizationId);

// Get or create config with smart defaults
const config = getOrCreateConfig(orgId, vendorId, vendorName);

// Save config (upserts)
await saveConfig({
  organization_id: orgId,
  vendor_id: "GFS",
  csv_enabled: true,
  pdf_enabled: false,
  photo_enabled: false,
  manual_enabled: true,
  default_invoice_type: "csv",
  account_number: "12345",
  rep_name: "John Smith",
});

// Get smart defaults based on vendor name
const defaults = inferVendorDefaults("GFS");  // { csv_enabled: true, default_invoice_type: 'csv' }
const defaults = inferVendorDefaults("Flanagan's");  // { pdf_enabled: true, default_invoice_type: 'pdf' }
const defaults = inferVendorDefaults("Local Farm");  // { manual_enabled: true, default_invoice_type: 'manual' }
```

**Smart Defaults Logic:**
- GFS, Sysco, US Foods, Gordon → CSV enabled, default CSV
- Flanagan's, Highland → PDF enabled, default PDF  
- Farm, Market, Local, Butcher → Photo + Manual, default Manual
- Everything else → All enabled, default Manual
