# Vendor Invoice Manager (VIM) - L5 Anatomy Review

**Date:** January 10, 2026  
**Status:** Design Audit  
**Reference:** L5-BUILD-STRATEGY.md

---

## Executive Summary

VIM is a 7-tab module for processing vendor invoices and updating ingredient prices. The **main container** (VendorInvoiceManager.tsx) is already L5 compliant with a proper header and tab structure. However, the **individual tab components** have inconsistent patterns and several opportunities for L5/L6 alignment.

---

## Main Container: VendorInvoiceManager.tsx ✅

**Status:** L5 Compliant

| Element | Status | Notes |
|---------|--------|-------|
| L5 Header Card | ✅ | `bg-[#1a1f2b] rounded-lg shadow-lg p-4` |
| Icon + Title | ✅ | Green CircleDollarSign, proper sizing |
| Subtitle | ✅ | "Process vendor invoices and update ingredient prices" |
| Expandable Info | ✅ | About Vendor Invoices with 4-card grid |
| Tab Navigation | ✅ | 7 tabs with L5 color progression |
| Diagnostic Path | ✅ | Shows file path when diagnostics enabled |

**Tab Color Progression:**
```
dashboard (primary) → analytics (green) → codes (amber) → 
umbrella (rose) → import (purple) → history (lime) → settings (red)
```

---

## Tab-by-Tab Analysis

---

### Tab 1: Price History (Dashboard) 🟡

**File:** `components/PriceHistory.tsx`  
**Status:** Partially L5, needs refinement

#### What's There:
- ✅ Uses ExcelDataGrid for data display
- ✅ Stat cards with icons (5-column grid)
- ✅ Filter chips for increase/decrease filtering
- ✅ Days dropdown for time range

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header redundant** | Has its own `bg-[#262d3c]` header with icon/title | Tab content shouldn't repeat the parent header pattern |
| **Stat cards not L5 StatBar** | Individual cards with `bg-gray-800/50` | Should use L5 StatBar pattern with dividers |
| **Section wrapper** | `bg-gray-800/50 rounded-lg p-6` | Content should flow directly, no nested cards |
| **No filter persistence** | Filters reset on navigation | Should persist like MIL grids |

#### Recommended Changes:

1. **Remove sub-header** - The "Price History Dashboard" header is redundant since we're inside a tab
2. **Convert stats to L5 StatBar:**
```tsx
<div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
  <div className="grid grid-cols-5 divide-x divide-gray-700/30">
    {/* stat cells */}
  </div>
</div>
```
3. **Add filter persistence** via navigation store (like MIL Allergens tab)
4. **Flatten structure** - Remove the `bg-gray-800/50` wrapper around the grid

---

### Tab 2: Analytics 🟡

**File:** `components/VendorAnalytics.tsx`  
**Status:** Partially L5, placeholder content

#### What's There:
- ✅ Sub-header with green TrendingUp icon
- ✅ Date range filter controls
- ✅ Vendor comparison table
- ✅ Recommendations section with colored info boxes

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header redundant** | Same pattern as Price History | Remove - we're in a tab |
| **Placeholder charts** | "Chart would be displayed here" | Either implement or remove |
| **Mixed card styles** | Some `bg-gray-800/50`, some `bg-gray-900/30` | Consistent card backgrounds |
| **No ExcelDataGrid** | Uses native `<table>` | Should use ExcelDataGrid for consistency |

#### Recommended Changes:

1. **Remove sub-header** 
2. **Replace placeholders** with actual charts (Recharts) or remove section entirely
3. **Convert vendor table to ExcelDataGrid** for filter/sort consistency
4. **Standardize cards** to `bg-gray-800/30 rounded-xl border border-gray-700/30`

---

### Tab 3: Code Groups 🟡

**File:** `components/ItemCodeGroupManager.tsx`  
**Status:** Partially L5, complex legacy structure

#### What's There:
- ✅ Expandable info section explaining the feature
- ✅ Search input
- ✅ Create form with 4-row layout
- ✅ Pagination controls
- ✅ Nested tables for code groups

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header redundant** | Amber Boxes icon header | Remove |
| **Custom list, not ExcelDataGrid** | Manual table with pagination | Consider ExcelDataGrid or accept as intentional |
| **Expandable info uses wrong pattern** | `expandable-info-section` without `expanded` class toggle | Use proper L5 expandable pattern |
| **Pagination custom** | ChevronLeft/Right buttons | Use ExcelDataGrid's PaginationControls or accept as-is |

#### Decision Point:

The grouped/nested structure (umbrella → codes) may justify custom rendering vs ExcelDataGrid. **Recommendation:** Keep custom structure but:
1. Remove sub-header
2. Fix expandable info pattern
3. Align card styling

---

### Tab 4: Umbrella Items 🟡

**File:** `components/UmbrellaIngredientManager.tsx`  
**Status:** Partially L5, similar issues to Code Groups

#### What's There:
- ✅ Expandable info section
- ✅ Search input
- ✅ Create form with cascading dropdowns (Major Group → Category → Sub-Category)
- ✅ Expandable umbrella cards with linked ingredients table
- ✅ Primary ingredient selection with radio buttons
- ✅ Pagination

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header redundant** | Rose Umbrella icon header | Remove |
| **Expandable info uses wrong pattern** | Same as Code Groups | Fix |
| **Complex card structure** | Good hierarchy but verbose | Could simplify |
| **Action buttons scattered** | Save, Edit, Delete, Link in different spots | Consolidate to action row |

#### Decision Point:

Like Code Groups, the nested structure (umbrella → linked ingredients) may justify custom rendering. The expandable cards are a good UX pattern for this data.

---

### Tab 5: Import 🟢

**File:** Multiple (`CSVUploader.tsx`, `PDFUploader.tsx`, `PhotoUploader.tsx`, `ManualInvoiceForm.tsx`)  
**Status:** Good L5 alignment

#### What's There:
- ✅ VendorSelector with file type toggle
- ✅ Drag-and-drop upload zones
- ✅ Two-stage flow (upload → DataPreview → confirm)
- ✅ Clear CTAs

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **No issues** | Clean implementation | ✅ |

This tab is the most aligned with L5 patterns. The conditional rendering of different uploaders based on `importType` is clean.

---

### Tab 6: History 🟡

**File:** `components/ImportHistory.tsx`  
**Status:** Partially L5, uses ExcelDataGrid

#### What's There:
- ✅ Uses ExcelDataGrid
- ✅ Date range dropdown with presets
- ✅ Custom date picker (conditional)
- ✅ Column definitions

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header redundant** | Lime History icon header | Remove |
| **Filters above grid** | Grid-based filter layout | Could integrate into ExcelDataGrid toolbar |
| **No filter persistence** | Resets on tab change | Add store persistence |

---

### Tab 7: Settings 🟡

**File:** `components/ImportSettings.tsx`  
**Status:** Partially L5, functional but dated

#### What's There:
- ✅ Vendor-specific template management
- ✅ CSV preview table
- ✅ Column mapping editor
- ✅ Save/Cancel workflow

#### Issues:

| Issue | Current | L5 Expected |
|-------|---------|-------------|
| **Sub-header** | Red Settings icon header | Remove |
| **Red info box** | `bg-red-500/10` explanatory text | Use standard info pattern |
| **PDF/Photo commented out** | Feature incomplete | Either enable or remove dead code |
| **Preview table** | Native `<table>` | Could be ExcelDataGrid for consistency |

---

## Common Issues Across All Tabs

### 1. Redundant Sub-Headers ❌

Every tab has its own header block with icon/title/subtitle inside `bg-[#262d3c]`. This creates visual nesting:

```
┌─ VIM Main Header (correct) ─────────────────────┐
│  💲 Vendor Invoice Manager                       │
│     Process vendor invoices...                   │
│  [tabs: Dashboard | Analytics | ... ]            │
├─────────────────────────────────────────────────┤
│  ┌─ Tab Sub-Header (redundant) ────────────────┐│
│  │  📊 Price History Dashboard                 ││
│  │     Track and analyze...                    ││
│  └─────────────────────────────────────────────┘│
│  [actual content]                                │
└─────────────────────────────────────────────────┘
```

**Fix:** Remove all sub-headers. The tab label provides context.

### 2. Inconsistent Card Styling

Three patterns observed:
- `bg-gray-800/50` (most tabs)
- `bg-gray-800/30 rounded-xl border border-gray-700/30` (L5 StatBar)
- `bg-[#262d3c]` (sub-headers)

**Fix:** Standardize on `bg-gray-800/30` for content sections.

### 3. No Filter Persistence (L6)

PriceHistory and ImportHistory use ExcelDataGrid but don't persist filter state. Users lose context when switching tabs.

**Fix:** Extend navigation store pattern from MIL:
```typescript
// ingredientNavigationStore.ts or a new vimNavigationStore.ts
priceHistoryFilterState: GridFilterState | null;
importHistoryFilterState: GridFilterState | null;
```

### 4. Mixed Table Implementations

| Tab | Implementation |
|-----|----------------|
| Price History | ExcelDataGrid ✅ |
| Analytics | Native `<table>` |
| Code Groups | Native `<table>` |
| Umbrella Items | Native `<table>` |
| Import | N/A |
| History | ExcelDataGrid ✅ |
| Settings | Native `<table>` |

**Decision:** Some nested structures (Code Groups, Umbrella Items) may justify custom tables. Analytics and Settings could migrate to ExcelDataGrid.

---

## Recommended Action Plan

### Priority 1: Quick Wins (1-2 hours)

1. **Remove all sub-headers** from tabs (6 files)
2. **Fix expandable info patterns** in Code Groups and Umbrella Items
3. **Standardize card backgrounds** to `bg-gray-800/30`

### Priority 2: L5 Polish (2-3 hours)

1. **Convert Price History stats** to L5 StatBar pattern
2. **Add filter persistence** to PriceHistory and ImportHistory ExcelDataGrids
3. **Remove placeholder charts** from Analytics (or implement them)

### Priority 3: Optional L6 (Future)

1. **Row click navigation** for price changes → ingredient detail
2. **Batch operations** for approving/rejecting price updates
3. **Convert Analytics vendor table** to ExcelDataGrid

---

## File Reference

```
src/features/admin/components/sections/VendorInvoice/
├── VendorInvoiceManager.tsx     # Main container (L5 ✅)
└── components/
    ├── PriceHistory.tsx          # Tab 1 - Dashboard
    ├── VendorAnalytics.tsx       # Tab 2 - Analytics
    ├── ItemCodeGroupManager.tsx  # Tab 3 - Code Groups
    ├── UmbrellaIngredientManager.tsx  # Tab 4 - Umbrella Items
    ├── CSVUploader.tsx           # Tab 5 - Import (CSV)
    ├── PDFUploader.tsx           # Tab 5 - Import (PDF)
    ├── PhotoUploader.tsx         # Tab 5 - Import (Photo)
    ├── ManualInvoiceForm.tsx     # Tab 5 - Import (Manual)
    ├── DataPreview.tsx           # Tab 5 - Import (Preview)
    ├── VendorSelector.tsx        # Tab 5 - Import (Selector)
    ├── ImportHistory.tsx         # Tab 6 - History
    └── ImportSettings.tsx        # Tab 7 - Settings
```

---

*Review by: Claude*  
*Next Review: After Priority 1 changes implemented*
