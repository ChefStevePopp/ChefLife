# Handoff: Import Flow Enhancement - Stage 1 Complete

**Date:** January 10, 2026  
**Focus:** VIM Audit Trail, PROMISES System, Common Name Field, ML Training Infrastructure

---

## Session Summary

Major infrastructure session establishing the foundation for intelligent, learning import workflows.

---

## What Was Built

### 1. PROMISES Documentation System
Core philosophy documented in `/docs/promises/`:

- **PROMISE-Core-Philosophy.md** — "Tech That Works FOR You, Not Against You"
  - Four pillars: We Remember, We Learn, We Protect, We Respect
  - Memphis Fire test for every feature
  
- **PROMISE-System-Learns.md** — ML training philosophy
  - 4 phases: Capture → Suggest → Auto-Classify → Cross-Tenant Learning

### 2. L5/L6/L7 Architecture Defined
Updated in `L5-BUILD-STRATEGY.md`:

| Level | Focus | Example |
|-------|-------|---------|
| L5 | Looks Right | Consistent UI, clear hierarchy |
| L6 | Works Right | Context preserved, non-blocking workflows |
| L7 | Thinks Right | System learns, suggests, auto-classifies |

### 3. Database Migration
**File:** `supabase/migrations/20260110100000_vim_common_name_ml_training.sql`

**New columns:**
- `master_ingredients.common_name` — Kitchen language name linking Code Groups and Umbrellas

**New tables:**
- `pending_import_items` — "Skip for Now" queue for non-blocking imports
- `ml_training_mappings` — Every categorization decision captured
- `ml_training_feedback` — Suggestion acceptance/rejection tracking

**New functions:**
- `get_common_name_suggestions(org_id, search, limit)` — Autocomplete helper
- `get_pending_import_count(org_id)` — Badge count for MIL
- `get_ml_suggestion(org_id, vendor_id, description)` — ML suggestion lookup

**Extensions:**
- `pg_trgm` enabled for fuzzy matching

### 4. Common Name Field (Stage 1 ✅)
**Location:** Basic Information section (expandable in PageHeader)

**File:** `EditIngredientModal/BasicInformation.tsx`

**Features:**
- CommonNameAutocomplete component with debounced search
- Usage count display ("47 items")  
- Link icon indicator when populated
- Fallback query if RPC not available yet

**Layout:**
```
Row 1: Product Name (2/3)    │ Vendor (1/3)
Row 2: Common Name (2/3) 🔗  │ Vendor Code (1/3)
Row 3: Major Group │ Category │ Sub Category
Row 4: Storage Area
```

### 5. TypeScript Types Updated
`src/types/master-ingredient.ts` — Added `common_name?: string | null`

---

## Import Flow Stages

| Stage | Description | Status |
|-------|-------------|--------|
| **1** | **MIL Common Name Field** | **✅ Complete** |
| 2 | VIM New Item Quick-Add | ⏳ Next |
| 3 | Skip for Now + Pending Queue | ⏳ Planned |
| 4 | MIL Pending Items Integration | ⏳ Planned |
| 5 | ML Suggestions | ⏳ Planned |
| **6** | **NEXUS Integration** | ⏳ Planned |

---

## Stage 2: VIM New Item Quick-Add (NEXT)

**Goal:** Fast inline workflow for adding new ingredients during import

**Requirements:**
- [ ] Inline expansion instead of full modal
- [ ] Common Name field with autocomplete
- [ ] Smart category defaults from name parsing
- [ ] Keyboard-friendly: Tab → Tab → Enter
- [ ] "Add + Next" for rapid entry
- [ ] Capture to `ml_training_mappings` on save

**Key files to modify:**
- `src/features/admin/components/sections/recipe/VendorInvoiceManager/DataPreview.tsx`
- Possibly extract `NewIngredientInline.tsx` component

**Design principle:** Non-blocking. User can add quickly or skip for later.

---

## Stage 3: Skip for Now + Pending Queue

- [ ] "Skip for Now" button on new items
- [ ] Log to `pending_import_items` table
- [ ] Import completes with pending items (non-blocking)
- [ ] Count appears as badge in MIL

---

## Stage 4: MIL Pending Items Integration

- [ ] Badge on MIL header from `get_pending_import_count()`
- [ ] "Needs Review" filter/tab
- [ ] Quick resolution UI: Link / Create / Dismiss
- [ ] ML suggestions shown for each pending item

---

## Stage 5: ML Suggestions

- [ ] Show suggestions during import from `ml_training_mappings`
- [ ] Confidence indicator ("92% match based on 47 similar items")
- [ ] Track acceptance/rejection in `ml_training_feedback`
- [ ] Suggestions improve with each decision

---

## Stage 6: NEXUS Integration (Activity Logs)

**Gap identified:** NEXUS events exist but aren't being fired from VIM.

**Events already defined in `src/lib/nexus/events.ts`:**
- `invoice_imported` - "Invoice from {vendor} imported"
- `price_change_detected` - "Price change detected: {item}" (severity: warning)

**Tasks:**
- [ ] Import `nexus` from `@/lib/nexus` in VIM components
- [ ] Fire `invoice_imported` after successful import with details:
  - vendor, invoice_number, item_count, total_amount
  - Link to import batch ID for drill-down
- [ ] Fire `price_change_detected` for each significant price change:
  - item name, old_price, new_price, percent_change
  - Only fire if change > threshold (configurable, default 5%?)
- [ ] Activity logs appear in NEXUS feed with audit trail links

**Why this matters:** Without NEXUS integration, admins don't see import activity in the unified activity feed. The audit trail exists in the DB but isn't surfaced to users.

---

## Common Name Architecture

```
master_ingredients.common_name: "Back Ribs"
    │
    ├──→ Code Group (GFS): codes 1057484, 1089721, 1102847
    ├──→ Code Group (Flanagan): codes FL-8821, FL-9902  
    │
    └──→ Umbrella Group "Back Ribs" (weighted avg across vendors)
```

**One field typed by user → three automatic connections**

---

## 5-Year Backfill Strategy

The historical invoice backfill IS the ML training dataset:
- ~1,000 categorization decisions
- Trains vendor-specific patterns (GFS naming conventions)
- Builds Common Name vocabulary
- Establishes category defaults
- Suggestions should appear by invoice #50

**Competitive moat:** Years of training data competitors can't replicate.

---

## Key Files Modified This Session

```
src/types/master-ingredient.ts                    # common_name type
src/features/.../BasicInformation.tsx             # Common Name autocomplete
src/features/.../IngredientDetailPage/index.tsx   # Cleaned up (removed duplicate)
supabase/migrations/20260110100000_*.sql          # Full ML infrastructure
docs/promises/PROMISE-Core-Philosophy.md          # Core manifesto
docs/promises/PROMISE-System-Learns.md            # ML philosophy
docs/L5-BUILD-STRATEGY.md                         # L7 section added
docs/journal.md                                   # Updated with stages
```

---

## Transcripts

- `/mnt/transcripts/2026-01-10-18-40-42-vim-promises-system-common-name-ml-foundation.txt`
- `/mnt/transcripts/2026-01-10-18-28-53-vim-audit-trail-day2-complete-promises-system.txt`

---

## Next Session Checklist

1. Review this handoff
2. Start Stage 2: VIM New Item Quick-Add
3. Focus on `DataPreview.tsx` modifications
4. Build inline expansion component
5. Test keyboard flow: Tab → Tab → Enter

---

*The backfill begins when Stage 2-3 are complete. Every invoice processed trains the system.*
