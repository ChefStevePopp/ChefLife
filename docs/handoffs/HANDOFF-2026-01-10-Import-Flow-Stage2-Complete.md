# Handoff: Import Flow Enhancement - Stage 2 Complete

**Date:** January 10, 2026  
**Focus:** VIM New Item Quick-Add with Guided Mode

---

## Session Summary

Built the inline quick-add workflow for new items during import, eliminating the flow-killing modal pattern and introducing the Guided mode toggle for progressive disclosure.

---

## What Was Built

### 1. NewIngredientInline Component
**File:** `src/features/admin/components/sections/VendorInvoice/components/NewIngredientInline.tsx`

**Features:**
- Inline expansion directly in the import table (no modal)
- Guided mode toggle (persists via localStorage, same key as IngredientDetailPage)
- Common Name autocomplete with usage count display
- Category cascade (Major Group → Category → Sub Category)
- Pre-filled data from invoice (product name, price, vendor code)
- ML training capture on save (to `ml_training_mappings`)
- "Skip for Now" button for non-blocking workflow
- "Add + Next" button for rapid entry
- Keyboard shortcuts: ⌘/Ctrl+Enter to save, Esc to cancel

**Layout:**
```
┌─ Quick Add ──────────────────────────────────────── [Guided 🔘] ─┐
│ Product Name: [pre-filled from invoice___________]               │
│ Common Name:  [autocomplete with suggestions_____] 🔗            │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 💡 Kitchen name linking across vendors. One name = unified  │  │  ← Guided only
│ │    costing across GFS, Flanagan, whoever.                   │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ Invoice Price: $4.89 (read-only)                                 │
│                                                                  │
│ Major Group: [▼]    Category: [▼]    Sub Category: [▼]          │
│                                                                  │
│                         [Skip for Now]  [Add + Next →]          │
└──────────────────────────────────────────────────────────────────┘
```

### 2. DataPreview.tsx Updates

**Changes:**
- Added `expandedItemCode` state for tracking which row is expanded
- Added `skippedItems` state for tracking items marked "Skip for Now"
- Plus button now toggles inline expansion (rotates 45° when expanded)
- Row highlights when expanded (emerald border, subtle background)
- "Skipped for now" label shows on skipped items (amber)
- Summary section shows skipped item count
- Confirm button enabled when items are handled (added, excluded, OR skipped)

**State Flow:**
```
New Item → Click [+] → Expands inline form
                    → Fill fields → [Add + Next] → Added to masterIngredients
                    → Or → [Skip for Now] → Added to skippedItems
                    → Or → [Cancel] → Collapses
```

### 3. Guided Mode Pattern

**Consistent with IngredientDetailPage:**
- Same localStorage key: `"cheflife-guided-mode"`
- Same visual toggle: GraduationCap icon, rounded pill
- Same state persistence across sessions
- GuidanceTip component for contextual help (only when Guided ON)

---

## Import Flow Stages

| Stage | Description | Status |
|-------|-------------|--------|
| **1** | MIL Common Name Field | ✅ Complete |
| **2** | **VIM New Item Quick-Add** | **✅ Complete** |
| 3 | Skip for Now + Pending Queue | ⏳ Next |
| 4 | MIL Pending Items Integration | ⏳ Planned |
| 5 | ML Suggestions | ⏳ Planned |
| 6 | NEXUS Integration | ⏳ Planned |

---

## Stage 3: Skip for Now + Pending Queue (NEXT)

Currently "Skip for Now" just marks items locally. Stage 3 will:

- [ ] Log skipped items to `pending_import_items` table
- [ ] Include invoice context (vendor, date, original description)
- [ ] Import completes with pending items recorded
- [ ] Badge count appears in MIL header via `get_pending_import_count()`

**Database change needed:**
```sql
-- Already created in Stage 1 migration
-- pending_import_items table ready for Stage 3 implementation
```

**Code location for Stage 3:**
- `DataPreview.tsx` → handleConfirm() → Add pending items insert
- `MasterIngredientList` → Header → Add badge from `get_pending_import_count()`

---

## Key Files Modified This Session

```
src/features/.../VendorInvoice/components/NewIngredientInline.tsx  # NEW
src/features/.../VendorInvoice/components/DataPreview.tsx          # Modified
src/features/.../VendorInvoice/components/index.ts                 # Export added
```

---

## Testing Checklist

- [ ] Import a CSV with new items
- [ ] Click + on a new item → inline form expands
- [ ] Toggle Guided mode → hints appear/disappear
- [ ] Type in Common Name → autocomplete suggestions appear
- [ ] Select Major Group → Categories filter correctly
- [ ] Click "Add + Next" → item added, form collapses, row shows as existing
- [ ] Click "Skip for Now" → item marked amber, form collapses
- [ ] Confirm Import → enabled when all items handled (added/excluded/skipped)
- [ ] Guided mode persists across page refresh

---

## Competitive Advantage Notes

The inline quick-add with Common Name autocomplete enables:

1. **Rapid Onboarding** — Adding 20 new items during import is now Tab→Tab→Enter fast
2. **ML Training Capture** — Every add populates `ml_training_mappings`
3. **Code Group Building** — Common Name typed here links items across vendors
4. **Non-Blocking** — Skip it, deal with it later. Import always completes.

This is the flow that makes the 5-year backfill *feasible* — not dreaded.

---

## Transcripts

- `/mnt/transcripts/2026-01-10-vim-stage2-inline-quickadd.txt`

---

## Next Session Checklist

1. Review this handoff
2. Start Stage 3: Pending queue database integration
3. Wire up `pending_import_items` insert on skip
4. Build badge count for MIL header
5. Consider MIL "Needs Review" tab for Stage 4

---

*Every invoice processed trains the system. The backfill begins.*
