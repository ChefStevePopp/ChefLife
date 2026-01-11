# ChefLife Volume 34 - Handoff Document
## Ingredient Detail Page - L5 Design Cohesion, Allergen Refactor & Navigation System

**Date:** January 9, 2026 (Session 2)  
**Session Focus:** L5 color progression, cost calculation visual consistency, allergen section refactor, ingredient navigation system

---

## 🧭 INGREDIENT NAVIGATION SYSTEM (NEW)

### The Problem
> "If you had 85 items in dairy - would you want to filter through 500 ingredients to deal with it? Back-forth-back-forth is death by a thousand clicks."

### The Solution
Preserve filtered list context when navigating from list to detail page.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ingredientNavigationStore.ts (Zustand)                        │
├─────────────────────────────────────────────────────────────────┤
│  ingredientIds: string[]     → Ordered IDs from filtered view   │
│  currentIndex: number        → Position in list                 │
│  filterDescription: string   → "85 ingredients" (for context)   │
├─────────────────────────────────────────────────────────────────┤
│  setNavigationContext(ids)   → Called by list on row click      │
│  setCurrentIndex(i)          → Called by detail on load         │
│  getPrevId() / getNextId()   → Navigation helpers                │
│  getPosition()               → Returns { current, total }        │
└─────────────────────────────────────────────────────────────────┘
```

### Flow

1. **List Page:** User filters to "Dairy" (85 items)
2. **Click Row:** `handleEditIngredient(ingredient, filteredIngredients)`
   - Store receives ordered IDs + filter description
   - Navigate to `/admin/data/ingredients/:id`
3. **Detail Page:** Loads ingredient, sets current index
4. **Navigation:** User presses → or clicks Next
   - Navigate to next ID in stored list
   - Still within "Dairy" context

### UI

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to List                            3 of 85    [←] [→] │
├─────────────────────────────────────────────────────────────────┤
│  🧂 2% Milk                                                     │
│  ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

- Navigation bar only shows when list context exists (>1 item)
- Buttons disabled when unsaved changes exist
- Tooltips show "Save changes first" when blocked

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous ingredient (if no unsaved changes) |
| `→` | Next ingredient (if no unsaved changes) |
| `Escape` | Back to list |
| `Cmd/Ctrl + S` | Save |

### Files Created/Modified

**New:**
- `src/stores/ingredientNavigationStore.ts` — Zustand store

**Modified:**
- `src/shared/components/ExcelDataGrid/index.tsx` — Added `onFilteredDataChange` callback
- `src/features/.../MasterIngredientList/index.tsx` — Tracks grid-filtered data, populates store on row click
- `src/features/.../IngredientDetailPage/index.tsx` — Consumes store, renders nav bar

### The Key Fix

The grid has its own internal filter state (Major Group → Category → search). Previously we couldn't access the grid's filtered result — we only passed the archive-filtered list.

**Solution:** `onFilteredDataChange` callback on ExcelDataGrid that fires whenever internal filtering changes. Parent subscribes and uses that list for navigation context.

```tsx
// ExcelDataGrid now exposes filtered data
<ExcelDataGrid
  data={filteredIngredients}
  onFilteredDataChange={setGridFilteredIngredients}  // NEW!
  onRowClick={(row) => handleEditIngredient(row)}
/>

// handleEditIngredient uses grid-filtered list
const listToUse = sourceList 
  || (gridFilteredIngredients.length > 0 ? gridFilteredIngredients : null)
  || filteredIngredients;
```

## 🎯 EXECUTIVE SUMMARY

This session completed the L5 design cohesion for the Ingredient Detail Page, including fixing the icon color progression, unifying the visual style across all three cost calculations (Pu/Iu/Ru), refactoring the Allergen Section to L5 standards, and implementing a full ingredient navigation system with prev/next and keyboard support.

**L6 Achievement:** Filter-aware navigation now respects the user's filtered context. Filter to 6 butter items → click one → navigate through all 6 with ←→ arrows without losing context. This is the difference between software that makes you work and software that works for you.

### Key Achievements
1. ✅ Fixed section icon color progression to match L5 tab sequence
2. ✅ Unified cost calculation displays (chunky fonts, highlighted result boxes)
3. ✅ Added Purchase Unit cost display to Purchase Information section
4. ✅ Refactored Allergen Section with simplified two-button controls
5. ✅ Applied L5 button patterns (rounded-full, soft fills, colored icons)
6. ✅ Added subtle severity group headers with slate background
7. ✅ **NEW:** Ingredient Navigation Store (Zustand) for filtered list context
8. ✅ **NEW:** Prev/Next navigation with keyboard support (← →)
9. ✅ **NEW:** Skeleton loading state (replacing spinner)
10. ✅ **NEW:** Position indicator ("3 of 47")

### Pending Decision
- ⏳ **Purchase Information: Read-only vs Editable** — Should fields be locked to enforce invoice-only price updates for audit trail integrity?

---

## 🎨 L5 COLOR PROGRESSION (Fixed)

Section icons now follow the established L5 tab color sequence:

```
┌─────────────────────────────────────────────────────────────────┐
│ #  SECTION                 COLOR      CLASSES                  │
├─────────────────────────────────────────────────────────────────┤
│ 0  Basic Information       Primary    text-primary-400         │
│ 1  Purchase Information    Green      text-green-400           │
│ 2  Inventory Units         Amber      text-amber-400           │
│ 3  Recipe Units            Rose       text-rose-400            │
│ 4  Cost Calculator         Purple     text-purple-400          │
│ 5  Reporting & Tracking    Lime       text-lime-400            │
│ 6  Allergens               Red        text-red-400             │
└─────────────────────────────────────────────────────────────────┘
```

**Sequence:** `primary → green → amber → rose → purple → lime → red`

---

## 💰 THE TRIANGLE - Visual Consistency

All three cost calculations now share the same visual pattern:

| Unit | Section | Color | Display |
|------|---------|-------|---------|
| **Pu** | Purchase Information | Green | `$30.96 per kg` |
| **Iu** | Inventory Units | Amber | `$30.96 ÷ 5 = $6.19 per kg` |
| **Ru** | Cost Calculator | Purple | `$30.96 ÷ 176.37 = $0.1755 per OZ` |

**Shared Styling:**
- Input numbers: `text-lg sm:text-xl font-bold text-white`
- Result box: `text-xl sm:text-2xl font-bold text-{color}-400`
- Result container: `bg-{color}-500/20 rounded-lg border border-{color}-500/30`
- Labels: `text-xs text-gray-500` / `text-xs text-{color}-400/70`
- No background overlay on the equation row (clean)

---

## 🛡️ ALLERGEN SECTION REFACTOR

### Before → After

| Aspect | Before | After |
|--------|--------|-------|
| Controls | 3 icons (circle, filled circle, alert) | 2 buttons (Check, Alert) |
| Active state | Solid color fill | Soft fill + ring (`bg-{color}-500/20 ring-1`) |
| Button shape | `rounded-lg` | `rounded-full` |
| Default state | Explicit "None" button | Neither selected = not present |
| Severity headers | Small dot + text | Slate background bar with ring |
| Custom allergens | Card-style with 3 buttons | Inline input with Check/Alert |

### L5 Button Pattern Applied

```
Inactive:  rounded-full bg-gray-800/30 text-gray-600
Contains:  rounded-full bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30  
May Contain: rounded-full bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30
```

### Severity Headers

```
┌─────────────────────────────────────────────────────────────────┐
│ ● HIGH PRIORITY — LIFE-THREATENING                         (0) │
└─────────────────────────────────────────────────────────────────┘
```

- Background: `bg-slate-800/30`
- Ring: `ring-1 ring-slate-700/30`
- Colored dot indicates severity level
- Count badge appears when allergens are marked

### Custom Allergens

- Inline text input with placeholder examples
- Placeholders: "e.g., Kiwi, Latex...", "e.g., Mango, Avocado...", "e.g., Banana, Papaya..."
- Check/Alert buttons appear only when name is entered

---

## ⏳ PENDING: PURCHASE INFORMATION AUDIT TRAIL

### The Question
Should Purchase Information fields (Case/Package, Price, Unit of Measure) be **read-only** to enforce that all price updates flow through the Invoice Import system?

### The Reasoning
> "If we allow adjustment here, then there is no audit trail. In Excel, I built it so I had to only input in the Vendor Invoice sheet no matter what — it's still a vendor, you didn't pull it out of thin air... protect that audit trail."

### Proposed Behavior

| Field | Current | Proposed |
|-------|---------|----------|
| Case/Package Description | Editable input | Read-only display (from invoice) |
| Purchase Price | Editable input | Read-only display (from invoice) |
| Unit of Measure | Editable dropdown | Read-only display (from invoice) |

### UI Concept

```
┌─────────────────────────────────────────────────────────────────┐
│ $ Purchase Information    Invoice details and pricing          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BEEF BRISKET AA 120 BNLS                                      │
│  Flanagan • Item #222850                                       │
│                                                                 │
│  Pack Size: 4/7.82KG          Price: $521.51 per Case          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              $521.51                                     │   │
│  │           per purchase unit                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Last updated: Jan 7, 2026 via Flanagan Invoice #INV-2026-001  │
│                                                                 │
│  [Update via Invoice Import →]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dependencies
- Invoice Import system needs to capture Pack Size field
- Need to track `last_price_update_date` and `last_invoice_id` on ingredients
- Link to Invoice Import route

**Decision deferred to future session.**

---

## 📁 FILES MODIFIED

### Ingredient Navigation Store (NEW)
**File:** `src/stores/ingredientNavigationStore.ts`
- New Zustand store for filtered list navigation context
- Holds ingredient IDs, current index, filter description
- Provides getPrevId(), getNextId(), getPosition() helpers

### Master Ingredient List
**File:** `src/features/admin/components/sections/recipe/MasterIngredientList/index.tsx`
- Added import for ingredientNavigationStore
- Updated handleEditIngredient to accept source list parameter
- Populates navigation context on row click (both tabs)
- Updated AllergensTabProps interface

### Ingredient Detail Page
**File:** `src/features/admin/components/sections/recipe/MasterIngredientList/IngredientDetailPage/index.tsx`
- Added ChevronLeft, ChevronRight icons
- Import and consume ingredientNavigationStore
- Added navigateToPrev(), navigateToNext() handlers
- Added keyboard navigation (← →)
- Added navigation bar UI with position indicator
- Replaced spinner with skeleton loading state
- Added aria-labels for accessibility
- Fixed section icon colors to L5 progression
- Added Purchase Unit cost display
- Removed background overlay from Inventory Units calculation

### Allergen Section
**File:** `src/features/admin/components/sections/recipe/MasterIngredientList/EditIngredientModal/AllergenSection.tsx`
- Complete refactor to L5 standards
- Two-button controls (Check/Alert) replacing three-button pattern
- L5 button styling (rounded-full, soft fills)
- Severity headers with slate background + ring
- Custom allergens with placeholder text
- Compact legend at top

---

## 🗺️ ROADMAP - NEXT SESSIONS

### Immediate
- [ ] **Decision: Purchase Information read-only** — Finalize audit trail approach
- [ ] **Run database migration** from Vol 33 (cascade triggers)
- [ ] **Test cascade system** end-to-end

### Short-term
- [ ] **Invoice Import → Price Update connection**
- [ ] **Pack Size parsing** in invoice import
- [ ] **Price history tracking** (last_updated, last_invoice_id)

### Medium-term
- [ ] **Read-only Purchase Information UI** (if decision is yes)
- [ ] **Invoice Manager** integration
- [ ] **Price change alerts** for tracked ingredients

---

## 🧠 L5 DESIGN PATTERNS ESTABLISHED

### Icon Button Pattern
```tsx
// Inactive
className="w-8 h-8 rounded-full bg-gray-800/30 text-gray-600 hover:bg-gray-700/50"

// Active (use section color)
className="w-8 h-8 rounded-full bg-{color}-500/20 text-{color}-400 ring-1 ring-{color}-500/30"
```

### Sub-header Pattern (within sections)
```tsx
className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 ring-1 ring-slate-700/30"
```

### Cost Calculation Display Pattern
```tsx
// Equation row - no background
<div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-4">
  <div className="text-lg sm:text-xl font-bold text-white">$30.96</div>
  <div className="text-lg text-gray-600">÷</div>
  <div className="text-lg sm:text-xl font-bold text-white">5</div>
  <div className="text-lg text-gray-600">=</div>
  <div className="px-3 py-1.5 bg-{color}-500/20 rounded-lg border border-{color}-500/30">
    <div className="text-xl sm:text-2xl font-bold text-{color}-400">$6.19</div>
    <div className="text-xs text-{color}-400/70">per unit</div>
  </div>
</div>
```

---

## 💬 CONTEXT FOR NEXT CLAUDE

> "We completed L5 design cohesion for the Ingredient Detail Page. Icon colors now follow the tab progression (primary → green → amber → rose → purple → lime → red). All three cost calculations (Pu/Iu/Ru) have consistent visual styling. The Allergen Section was refactored with two-button Check/Alert controls using the L5 soft-fill rounded-full pattern. We also implemented a full ingredient navigation system with prev/next buttons, keyboard support (← →), position indicator, and skeleton loading — so users can navigate through filtered lists without going back to the list page. One pending decision: whether to make Purchase Information read-only to enforce invoice-only price updates for audit trail integrity."

**Steve's Philosophy:** "Protect that audit trail."

**L5 Mantra:** "Color for focus — let the important things pop, let the structure recede."

**Navigation UX:** "If you had 85 items in dairy, would you want to filter through 500 ingredients? Back-forth-back-forth is death by a thousand clicks."

---

*Generated: January 9, 2026 | ChefLife Volume 34*
