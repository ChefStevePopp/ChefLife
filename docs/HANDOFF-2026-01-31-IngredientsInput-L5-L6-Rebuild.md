# HANDOFF: IngredientsInput L5/L6 Rebuild
**Date:** January 31, 2026  
**Session Focus:** Recipe Editor Ingredients Tab - Complete L5/L6 Redesign  
**Status:** ✅ Complete (Table + Tablet + Guided modes)

---

## Executive Summary

Complete rebuild of the Recipe Editor's Ingredients Input component with three-mode architecture designed for different user contexts:

| Mode | Purpose | User Mindset |
|------|---------|--------------|
| **Table** | Desktop efficiency | Full visibility, keyboard users |
| **Tablet** | Touch-first speed | "30 seconds, get this in" |
| **Guided** | Training/Education | "You want me to do what now?" |

Key innovation: **Sandbox Ingredients** - temporary placeholders for ingredients not yet in MIL, verified later via invoice import.

---

## Architecture Decisions

### Sandbox Ingredients (KISS Approach)
Rather than separate tables/pipelines, sandbox is a toggle on existing `RecipeIngredient`:

```typescript
// Added to RecipeIngredient type
is_sandbox?: boolean;
sandbox_vendor?: string;        // "GFS", "Flanagan"
sandbox_vendor_code?: string;   // "123456"
sandbox_description?: string;   // "Smoked Paprika 2kg"
sandbox_estimated_cost?: number;
```

**Resolution Flow:**
1. User toggles Sandbox ON → Enter vendor, code, description, estimated cost
2. Ingredient sits in recipe with amber styling
3. Invoice arrives via VIM → User returns to recipe
4. User toggles Sandbox OFF → Forced to select from MIL
5. Recipe cannot be "Approved" while sandbox items exist

### Three-Mode System
All modes share the same underlying component (`IngredientCard`), differentiated by context:

- **Table View**: `TableView.tsx` - Responsive flex layout, drag-to-reorder
- **Tablet Mode**: `TabletMode.tsx` with `showEducation={false}` - Full-screen, one-at-a-time
- **Guided Mode**: `TabletMode.tsx` with `showEducation={true}` - Same + tips/context

Uses existing `GuidedModeContext` framework from `shared/components/L5/`.

---

## Files Created/Modified

### New Component Structure
```
src/features/recipes/components/RecipeEditor/IngredientsInput/
├── index.tsx              # Mode switcher + state management
├── types.ts               # Local types, sandbox fields, templates
├── IngredientSearch.tsx   # Smart search (direction-aware dropdown)
├── SandboxFields.tsx      # Vendor/Code/Description/Cost entry
├── IngredientCard.tsx     # Shared card for Tablet/Guided modes
├── TableView.tsx          # Desktop responsive table
└── TabletMode.tsx         # Full-screen overlay (speed + guided)
```

### Modified Files
- `src/features/recipes/types/recipe.ts` - Added sandbox fields to RecipeIngredient

### Deprecated
- `IngredientsInput-OLD.tsx` - Previous flat component

---

## UI/UX Specifications

### Responsive Table Layout
Headers and rows use identical flex structure for perfect alignment:

| Column | Sizing | Behavior |
|--------|--------|----------|
| Grip | `w-5` fixed | Drag handle |
| Ingredient | `flex-[3]` | Grows most |
| Common Name | `flex-[1.5]` | Grows medium |
| Common Measure | `flex-[1.5]` | Grows medium |
| R/U Type | `w-24` fixed | Stays fixed |
| # R/U | `w-16` fixed | Stays fixed |
| R/U Cost | `w-20` fixed | Stays fixed |
| Total | `w-20` fixed | Stays fixed |
| Actions | `w-32` fixed | With border divider |

### Mode Switcher Badges
Touch-friendly badges with proper spacing:
```
[ ≡ Table ]   [ □ Tablet ]   [ 🎓 Guided ]
     gap-2         gap-2         gap-2
```
- `px-3 py-2` for touch targets
- Labels visible on `sm:` breakpoint and up
- Each badge has individual border styling

### Verified Badge vs Sandbox Toggle
- **Linked to MIL** → Emerald `[✓ Verified]` badge (celebrates good state)
- **Empty/Sandbox** → Sandbox toggle available

### Cost Summary
Single green summary bar at bottom of table (removed duplicate inline total):
```
┌─────────────────────────────────────────────────────┐
│  Total Recipe Cost                          $53.29  │
│  (amber if sandbox items, emerald if all verified)  │
└─────────────────────────────────────────────────────┘
```

---

## Guided Mode Education

When `showEducation={true}`, IngredientCard displays contextual tips:

**Search Mode:**
> **Finding Ingredients:** Search by name or vendor code. Can't find it? Toggle *Sandbox* to add it temporarily.

**Sandbox Mode:**
> **Sandbox Mode:** Enter the ingredient details manually. When your next invoice arrives, you can verify this item against your Master Ingredient List.

**Field Labels:**
- Quantity: "How many {unit} does this recipe need?"
- Common Measure: "Kitchen-friendly measurement for prep sheets"

---

## Testing Notes

### Real Kitchen Testing Feedback (Pain Points Addressed)
- ✅ Virtual keyboard consuming screen space → Direction-aware dropdown flips up
- ✅ Small touch targets → Big inputs in Tablet/Guided modes (`py-4`, `text-2xl`)
- ✅ Action bar competing with keyboard → Full-screen overlay with fixed header/footer
- ✅ Awkward inspiration capture → One-ingredient-at-a-time flow with "Add Another"

### Browser Testing
- Desktop: Table view with drag-to-reorder, keyboard navigation
- Tablet: Full-screen touch mode, swipe hints
- Mobile: Stacked card layout in Table view, full-screen modes

---

## Integration Points

### Stores Used
- `useMasterIngredientsStore` - Raw ingredients from MIL
- `useOperationsStore` - Vendor list for sandbox dropdown
- Supabase direct query - Prepared items (type='prepared')

### Allergen Cascade
When ingredients change, allergens are recalculated from MIL data and updated in `recipe.allergenInfo.contains[]`.

### Future: VIM Integration
Sandbox ingredients should appear in VIM workflow for verification when matching invoices arrive.

---

## Pending Work

- [ ] Swipe gestures for Tablet mode navigation
- [ ] Keyboard shortcuts (Tab, Enter, Ctrl+N, Ctrl+D, bulk paste)
- [ ] VIM → Sandbox resolution workflow
- [ ] Kitchen Notes Dashboard widget for quick capture
- [ ] Recipe status gate (cannot approve with sandbox items)

---

## Philosophy

> "No focus groups, no personas, no user journey maps drawn by people who've never worked a Friday rush. Just a chef who couldn't add Corn Ranchero Base without fighting his own tool."

Two mindsets, one codebase:
- **Tablet**: "I know what I'm doing, get out of my way"
- **Guided**: "I'm new here, help me understand"

---

## Quick Start for Next Session

```bash
# Component location
cd src/features/recipes/components/RecipeEditor/IngredientsInput/

# Key files to review
cat index.tsx      # Mode switching logic
cat TableView.tsx  # Desktop layout
cat TabletMode.tsx # Full-screen overlay
cat IngredientCard.tsx # Shared card component
```

### To Continue:
1. Test all three modes in browser
2. Review sandbox styling consistency
3. Plan VIM integration for sandbox resolution
4. Consider Kitchen Notes quick-capture widget

---

*Session compacted 5 times. Full transcript available at `/mnt/transcripts/2026-01-31-22-13-29-ingredients-input-l5-redesign.txt`*
