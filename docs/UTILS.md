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

---

## ImageUploadModal - Universal Image Upload Component

**Location:** `@/shared/components/ImageUploadModal`

**Added:** January 13, 2026

**⚠️ IMPORTANT:** This is the **universal choice** for ALL image uploads in ChefLife. Do not create custom upload UIs - use this component.

### Use Cases

| Entity | Title | Subtitle | Aspect Hint |
|--------|-------|----------|-------------|
| Vendor Logo | "Vendor Logo" | Vendor name | "Square logos work best" |
| Team Avatar | "Profile Photo" | Member name | "Square photos work best" |
| Recipe Photo | "Recipe Photo" | Recipe name | "16:9 recommended for cards" |
| Ingredient | "Ingredient Photo" | Ingredient name | "Square works best" |
| Organization | "Organization Logo" | Org name | "Square logos work best" |

### L5 Design Compliance

This component follows full L5 design standards:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                  │
│ ┌──────┐                                                                │
│ │ icon │  Title                                              [X]       │
│ │ box  │  Subtitle                                                     │
│ └──────┘                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ BODY                                                                    │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                         DROP ZONE                                   │ │
│ │                    ┌──────────────┐                                │ │
│ │                    │   PREVIEW    │  ← Hero element               │ │
│ │                    └──────────────┘                                │ │
│ │              Drag & drop an image here                             │ │
│ │                         or                                         │ │
│ │                  [ Browse files ]  ← 44px touch target            │ │
│ │            Max size: 2MB • PNG, JPG, GIF, WebP                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ New image selected                              [Clear]          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                  │
│ [Remove image]                              [Cancel]  [Upload]         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Standards Applied

| Standard | Implementation |
|----------|----------------|
| Touch Targets | All buttons ≥44px height |
| Visual Hierarchy | Preview (hero) → Instructions (secondary) → Hints (tertiary) |
| Header Pattern | Icon box (bg-primary-500/20) + title/subtitle |
| State Feedback | Drag over, uploading, error, success states |
| Accessibility | Keyboard nav, focus rings, ARIA labels, screen reader support |
| Body Scroll Lock | Prevents background scroll when modal open |
| Backdrop | bg-black/60 + backdrop-blur-sm |
| Animation | animate-in fade-in zoom-in-95 |

### Props

```typescript
interface ImageUploadModalProps {
  /** Modal open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Upload handler - receives File, returns URL of uploaded image */
  onUpload: (file: File) => Promise<string>;
  /** Optional remove handler - if provided, shows "Remove image" button */
  onRemove?: () => Promise<void>;
  /** Current image URL (shows in preview) */
  currentImageUrl?: string;
  /** Modal title (default: "Upload Image") */
  title?: string;
  /** Modal subtitle (e.g., entity name) */
  subtitle?: string;
  /** Max file size in MB (default: 2) */
  maxSizeMB?: number;
  /** Aspect ratio hint shown to user */
  aspectHint?: string;
  /** Text shown in empty placeholder */
  placeholderText?: string;
  /** Custom icon for empty placeholder */
  placeholderIcon?: React.ReactNode;
  /** Accepted file types (default: "image/*") */
  accept?: string;
}
```

### Usage Examples

**Vendor Logo:**
```typescript
import { ImageUploadModal } from "@/shared/components";

const [isOpen, setIsOpen] = useState(false);

const handleUpload = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const baseFileName = `${orgId}/vendors/${vendorId}`;
  const newFileName = `${baseFileName}.${fileExt}`;
  
  // Delete all possible extensions to catch orphaned files
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  const filesToDelete = extensions.map(ext => `${baseFileName}.${ext}`);
  await supabase.storage.from("Logos").remove(filesToDelete).catch(() => {});
  
  // Upload new file
  await supabase.storage.from("Logos").upload(newFileName, file);
  const { data } = supabase.storage.from("Logos").getPublicUrl(newFileName);
  return `${data.publicUrl}?t=${Date.now()}`;
};

const handleRemove = async (): Promise<void> => {
  // Clear URL from database (actual file cleanup can be deferred)
  await updateVendor({ logo_url: null });
};

<ImageUploadModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onUpload={handleUpload}
  onRemove={currentLogoUrl ? handleRemove : undefined}
  currentImageUrl={currentLogoUrl}
  title="Vendor Logo"
  subtitle={vendorName}
  aspectHint="Square logos work best"
  placeholderText={vendorInitials}
/>
```

**Team Member Avatar:**
```typescript
<ImageUploadModal
  isOpen={isAvatarModalOpen}
  onClose={() => setIsAvatarModalOpen(false)}
  onUpload={handleAvatarUpload}
  onRemove={member.avatar_url ? handleAvatarRemove : undefined}
  currentImageUrl={member.avatar_url}
  title="Profile Photo"
  subtitle={`${member.first_name} ${member.last_name}`}
  aspectHint="Square photos work best"
/>
```

**Recipe Photo:**
```typescript
<ImageUploadModal
  isOpen={isPhotoModalOpen}
  onClose={() => setIsPhotoModalOpen(false)}
  onUpload={handleRecipePhotoUpload}
  onRemove={recipe.photo_url ? handlePhotoRemove : undefined}
  currentImageUrl={recipe.photo_url}
  title="Recipe Photo"
  subtitle={recipe.name}
  maxSizeMB={5}
  aspectHint="16:9 recommended for recipe cards"
/>
```

### Trigger Pattern

The standard trigger is an avatar/image with a pencil overlay on hover:

```typescript
// In your component
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

// Avatar with edit overlay
<div 
  className="relative group cursor-pointer"
  onClick={() => setIsUploadModalOpen(true)}
>
  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-700 ...">
    {imageUrl ? (
      <img src={imageUrl} alt="" className="w-full h-full object-contain" />
    ) : (
      <span className="text-gray-400">{initials}</span>
    )}
  </div>
  
  {/* Edit overlay */}
  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                  transition-opacity flex items-center justify-center rounded-full">
    <Pencil className="w-4 h-4 text-white" />
  </div>
</div>

{/* Modal */}
<ImageUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  onUpload={handleUpload}
  {...otherProps}
/>
```

### State Flow

```
1. User clicks avatar → Modal opens
2. User drags file OR clicks "Browse files"
3. File validated (type + size)
   ├─ Invalid → Error shown, can retry
   └─ Valid → Preview shown + "New image selected" indicator
4. User clicks "Upload"
   ├─ onUpload() called with File
   ├─ Loading spinner shown
   └─ On success → Modal closes
5. OR User clicks "Remove image" (if current image exists)
   ├─ onRemove() called
   └─ On success → Modal closes
6. OR User clicks "Cancel" / "X" / Escape → Modal closes
```

### Error Handling

The modal handles these error cases:

| Error | Message |
|-------|--------|
| Wrong file type | "Please select an image file (PNG, JPG, GIF, WebP)" |
| File too large | "Image must be less than {X}MB (yours is {Y}MB)" |
| Upload failed | Shows error from onUpload or "Failed to upload image" |
| Remove failed | Shows error from onRemove or "Failed to remove image" |

### Accessibility

- **Keyboard:** Escape closes, Tab navigates, Enter/Space activates
- **Focus:** Initial focus on "Browse files" button
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Screen readers:** All interactive elements have labels

### Do NOT

❌ Create custom file upload UIs - use this component  
❌ Use inline drag-drop zones for images - open this modal instead  
❌ Skip the preview step - always let users confirm before upload  
❌ Forget the `onRemove` prop when there's an existing image

### Supabase Storage Note

**Why we delete before upload (not upsert):**

Supabase Storage's `upsert: true` option can fail with RLS policies that only allow INSERT. The workaround is to delete first, then upload.

**Handling orphaned files:**

Sometimes a file exists in storage but the URL wasn't saved to the database. To handle this, always delete all possible extensions for the entity:

```typescript
// ❌ DON'T - upsert can fail with RLS
await supabase.storage.from("Logos").upload(path, file, { upsert: true });

// ❌ PARTIAL - only works if URL is saved
if (currentUrl) {
  await supabase.storage.from("Logos").remove([extractPath(currentUrl)]);
}

// ✅ DO - delete all possible extensions to catch orphaned files
const baseFileName = `${orgId}/vendors/${vendorId}`;
const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const filesToDelete = extensions.map(ext => `${baseFileName}.${ext}`);
await supabase.storage.from("Logos").remove(filesToDelete).catch(() => {});
await supabase.storage.from("Logos").upload(`${baseFileName}.${newExt}`, file);
```

Supabase's `remove()` silently ignores files that don't exist, so this is safe.

---

## L5 Sub-header Pattern

**Location:** `src/index.css` (`.subheader` classes)

**Added:** January 13, 2026

**Purpose:** Standardized tab content headers that sit below the main module header, creating clear visual hierarchy.

### Visual Hierarchy

```
┌───────────────────────────────────────────────────────────────┐
│ MODULE HEADER (bg-[#1a1f2b])                                 │
│ ┌─────┐ Title                              [Actions]     │
│ │Icon │ Subtitle                                          │
│ └─────┘ (colored icon box)                               │
├───────────────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3] ...                                  │
├───────────────────────────────────────────────────────────────┤
│ SUB-HEADER (.subheader - slate-800/60)                       │
│ ┌─────┐ Title       [Dropdown]    [□][□][□]  Stats     │
│ │Icon │ Subtitle                   toggles              │
│ └─────┘ (grey icon box)                                  │
│ ⓘ Expandable Info Section                                   │
├───────────────────────────────────────────────────────────────┤
│ CONTENT                                                      │
└───────────────────────────────────────────────────────────────┘
```

### Key Design Rules

| Element | Module Header | Sub-header |
|---------|--------------|------------|
| Background | `bg-[#1a1f2b]` (blue-tinted) | `bg-slate-800/60` (neutral) |
| Icon box | Colored (`bg-{color}-500/20`) | Grey (`bg-gray-700/50`) |
| Purpose | Branding, module identity | Workspace, context |

### Classes

```css
.subheader            /* Container: slate-800/60 background */
.subheader-row        /* Flex row with responsive wrapping */
.subheader-left       /* Icon + title group */
.subheader-center     /* Dropdown/search area */
.subheader-right      /* Toggles/stats/actions */
.subheader-icon       /* Grey icon box (40x40) */
.subheader-title      /* text-lg font-medium text-white */
.subheader-subtitle   /* text-xs text-gray-500 */
.subheader-toggle     /* Toggle button container */
.subheader-toggle-icon/* Icon container (grey default) */
.subheader-toggle-label/* Small label below icon */
.subheader-stat       /* Stat pill (grey background) */
.subheader-stat-label /* Uppercase label */
.subheader-stat-value /* Large white number */
.subheader-info       /* Expandable help section */
```

### Toggle States

Toggles are **grey by default**, colored only when active:

```tsx
{/* Inactive: grey */}
<button className="subheader-toggle">
  <div className="subheader-toggle-icon"><FileText /></div>
  <span className="subheader-toggle-label">PDF</span>
</button>

{/* Active: colored - add "active {color}" */}
<button className="subheader-toggle active primary">
  <div className="subheader-toggle-icon"><FileSpreadsheet /></div>
  <span className="subheader-toggle-label">CSV</span>
</button>
```

**Available colors:** `primary`, `green`, `amber`, `rose`, `purple`

### Usage Example

```tsx
<div className="subheader">
  <div className="subheader-row">
    {/* Left: Icon + Title */}
    <div className="subheader-left">
      <div className="subheader-icon">
        <FileText />
      </div>
      <div>
        <h3 className="subheader-title">Invoice Processing</h3>
        <p className="subheader-subtitle">Select vendor and method</p>
      </div>
    </div>

    {/* Center: Dropdown */}
    <div className="subheader-center">
      <select className="input w-full">...</select>
    </div>

    {/* Right: Toggles */}
    <div className="subheader-right">
      <button className={`subheader-toggle ${active === 'csv' ? 'active primary' : ''}`}>
        <div className="subheader-toggle-icon"><FileSpreadsheet /></div>
        <span className="subheader-toggle-label">CSV</span>
      </button>
      <button className={`subheader-toggle ${active === 'pdf' ? 'active green' : ''}`}>
        <div className="subheader-toggle-icon"><FileText /></div>
        <span className="subheader-toggle-label">PDF</span>
      </button>
    </div>
  </div>

  {/* Expandable Info */}
  <div className="subheader-info expandable-info-section">
    ...
  </div>
</div>
```

### Reference Implementation

**VendorSelector:** `src/features/admin/components/sections/VendorInvoice/components/VendorSelector.tsx`

This is the canonical example of the sub-header pattern with toggles, dropdown, and expandable info.

### Do NOT

❌ Use colored icon boxes in sub-headers (reserve for module headers)  
❌ Use blue-tinted backgrounds for sub-headers (use slate/neutral)  
❌ Make toggles colored by default (grey until active)  
❌ Skip the sub-header when tab content needs context

---

## Premium Animation Components

ChefLife's signature smooth transitions for numbers and text. Used for temperatures, prices, percentages — anywhere numbers update.

**Location:** `src/shared/components/AnimatedNumber/`

**Philosophy:** "So smooth you're not sure if it moved."

### AnimatedNumber

Numbers smoothly interpolate between values at 60fps using `requestAnimationFrame`.

```tsx
import { AnimatedNumber } from "@/shared/components/AnimatedNumber";

// Temperature
<AnimatedNumber value={36.7} suffix="°F" decimals={1} />

// Price
<AnimatedNumber value={12.99} prefix="$" decimals={2} />

// Percentage
<AnimatedNumber value={85} suffix="%" decimals={0} />

// With custom styling
<AnimatedNumber 
  value={1234.56} 
  prefix="$" 
  decimals={2}
  className="text-3xl font-bold text-emerald-400"
  duration={1500}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | required | Target value to animate to |
| `duration` | `number` | `2000` | Animation duration in ms |
| `decimals` | `number` | `1` | Decimal places |
| `prefix` | `string` | `""` | Prefix (e.g., "$") |
| `suffix` | `string` | `""` | Suffix (e.g., "°F", "%") |
| `className` | `string` | `""` | Additional CSS classes |
| `nullText` | `string` | `"—"` | Text when value is null |
| `nullClassName` | `string` | `"text-gray-500"` | Class for null state |

**Key Details:**
- Uses `tabular-nums` to prevent digit width jumping
- Ease-out cubic easing (decelerates like a luxury gauge)
- 60fps via requestAnimationFrame

### MorphingText

Text transitions with a subtle blur + slide effect.

```tsx
import { MorphingText } from "@/shared/components/AnimatedNumber";

<MorphingText text={equipmentName} className="text-sm text-gray-400" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | required | Text to display |
| `className` | `string` | `""` | Additional CSS classes |
| `transitionDuration` | `number` | `1000` | Duration per direction (ms) |

**The Effect:**
- Text fades out with slight blur and downward drift
- New text fades in, blur clears, drifts back to position
- 1 second each direction = 2 second total transition

### CSS Classes (index.css)

For CSS-only approaches (when not using React components):

```css
.morph-text              /* Base: inline-block with transitions */
.morph-text.transitioning /* Blur + fade + slide out */
.morph-text.visible      /* Clear state */
.animated-number         /* tabular-nums for stable digit widths */
.premium-fade            /* Ultra-slow 1.5s opacity transition */
.premium-fade.fade-out   /* opacity: 0 */
.premium-fade.fade-in    /* opacity: 1 */
```

### Reference Implementation

**TemperatureStatCard:** `src/features/admin/components/AdminDashboard/TemperatureStatCard.tsx`

This widget cycles through 9 sensors with premium morph animation — the canonical example of the pattern.

### When to Use

✅ Dashboard widgets cycling through multiple data points  
✅ Temperature displays  
✅ Price updates  
✅ Percentage indicators  
✅ Any rotating display where jarring transitions would distract

### When NOT to Use

❌ Real-time data that changes rapidly (use instant updates)  
❌ User-initiated changes (use immediate feedback)  
❌ Critical alerts (use attention-grabbing transitions)  
❌ Static values that never change

---

## ChefLife Charts (Recharts Patterns)

ChefLife uses Recharts for data visualization. These patterns ensure visual consistency across all charts.

### Dark Theme Defaults

All charts share these styling conventions:

```tsx
// Axis styling
<XAxis 
  tick={{ fontSize: 10, fill: "#6b7280" }}  // gray-500
  tickLine={false}
  axisLine={false}
/>

// Tooltip styling
<Tooltip
  contentStyle={{
    backgroundColor: "#1f2937",  // gray-800
    border: "1px solid #374151",  // gray-700
    borderRadius: "8px",
    fontSize: "12px",
  }}
  labelStyle={{ color: "#9ca3af" }}  // gray-400
/>

// Reference line (dashed)
<ReferenceLine 
  y={value} 
  stroke="#6b7280"  // or #2dd4bf for emphasis
  strokeDasharray="3 3"
  strokeWidth={1}
/>
```

### Line Chart (Single Series)

**Use for:** Price history, temperature over time, single-metric trends

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

<ResponsiveContainer width="100%" height={120}>
  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
    <YAxis 
      domain={["dataMin - 0.1", "dataMax + 0.1"]}
      tick={{ fontSize: 10, fill: "#6b7280" }}
      tickLine={false}
      axisLine={false}
      tickFormatter={(v) => `${v.toFixed(2)}`}
      width={45}
    />
    <Tooltip /* dark theme styles */ />
    <ReferenceLine y={avgValue} stroke="#6b7280" strokeDasharray="3 3" />
    <Line
      type="monotone"
      dataKey="price"
      stroke="#2dd4bf"  // teal-400
      strokeWidth={2}
      dot={{ fill: "#2dd4bf", strokeWidth: 0, r: 3 }}
      activeDot={{ fill: "#5eead4", strokeWidth: 0, r: 5 }}
    />
  </LineChart>
</ResponsiveContainer>
```

**Reference:** `PriceHistoryModal` in `UmbrellaItemCard.tsx`

### Scatter Chart (Multi-Series)

**Use for:** Aggregate purchase history, multi-vendor comparisons, quantity-weighted data

```tsx
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Color palette for multiple series
const VENDOR_COLORS = [
  { stroke: "#2dd4bf", fill: "#2dd4bf" }, // teal
  { stroke: "#f59e0b", fill: "#f59e0b" }, // amber
  { stroke: "#a78bfa", fill: "#a78bfa" }, // purple
  { stroke: "#fb7185", fill: "#fb7185" }, // rose
  { stroke: "#38bdf8", fill: "#38bdf8" }, // sky
  { stroke: "#4ade80", fill: "#4ade80" }, // green
  { stroke: "#f472b6", fill: "#f472b6" }, // pink
  { stroke: "#facc15", fill: "#facc15" }, // yellow
];

<ResponsiveContainer width="100%" height={200}>
  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
    <XAxis 
      dataKey="date"
      type="number"
      domain={['dataMin', 'dataMax']}
      tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      /* dark theme styles */
    />
    <YAxis 
      dataKey="price"
      type="number"
      domain={[chartDomain.min, chartDomain.max]}
      tickFormatter={(v) => `${v.toFixed(0)}`}
      width={40}
      /* dark theme styles */
    />
    <Tooltip content={<CustomTooltip />} />
    
    {/* Weighted average reference line */}
    <ReferenceLine 
      y={weightedAvg} 
      stroke="#2dd4bf" 
      strokeDasharray="5 5"
      strokeWidth={2}
      label={{ value: `${weightedAvg.toFixed(2)} weighted`, fill: '#2dd4bf', fontSize: 10, position: 'right' }}
    />
    
    {/* One Scatter per data series */}
    {vendors.map((vendor, idx) => (
      <Scatter
        key={vendor.id}
        name={vendor.name}
        data={vendor.data}
        fill={VENDOR_COLORS[idx % VENDOR_COLORS.length].fill}
        opacity={0.8}
      />
    ))}
  </ScatterChart>
</ResponsiveContainer>
```

**Reference:** `AggregatePurchaseHistoryModal` in `UmbrellaItemCard.tsx`

### Quantity-Scaled Dots

For scatter charts where dot size should reflect quantity:

```tsx
// Scale dot size by quantity (min 6px, max 16px)
const minQty = Math.min(...data.map(d => d.quantity));
const maxQty = Math.max(...data.map(d => d.quantity));
const range = maxQty - minQty || 1;
const normalizedQty = (entry.quantity - minQty) / range;
const dotSize = 6 + (normalizedQty * 10);  // 6 to 16
```

### Stats Row Pattern

Display key metrics below charts:

```tsx
<div className="grid grid-cols-4 gap-2">
  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
    <p className="text-2xs text-gray-500 uppercase">Weighted Avg</p>
    <p className="text-sm font-semibold text-teal-400 tabular-nums">${stats.weightedAvg.toFixed(2)}</p>
  </div>
  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
    <p className="text-2xs text-gray-500 uppercase">Simple Avg</p>
    <p className="text-sm font-medium text-gray-300 tabular-nums">${stats.simpleAvg.toFixed(2)}</p>
  </div>
  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
    <p className="text-2xs text-gray-500 uppercase">Spread</p>
    <p className="text-sm font-medium text-amber-400/70 tabular-nums">${stats.spread.toFixed(2)}</p>
  </div>
  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
    <p className="text-2xs text-gray-500 uppercase">Purchases</p>
    <p className="text-sm font-medium text-gray-300 tabular-nums">{stats.count}</p>
  </div>
</div>
```

### Custom Tooltip Pattern

```tsx
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl">
      <p className="text-xs text-gray-400">{data.dateStr}</p>
      <p className="text-sm font-medium text-white">${data.price.toFixed(2)}</p>
      <p className="text-xs text-gray-500">{data.product}</p>
      <p className="text-xs text-gray-500">Qty: {data.quantity}</p>
    </div>
  );
};
```

### Chart Container Pattern

Wrap charts in a subtle container:

```tsx
<div className="bg-gray-900/50 rounded-lg p-3">
  <ResponsiveContainer width="100%" height={200}>
    {/* Chart here */}
  </ResponsiveContainer>
</div>
```

### Color Semantics

| Color | Hex | Use For |
|-------|-----|--------|
| Teal | `#2dd4bf` | Primary data, prices, positive values |
| Amber | `#f59e0b` | Secondary data, warnings, spread |
| Rose | `#fb7185` | Negative changes, errors |
| Gray | `#6b7280` | Reference lines, axes, muted text |
