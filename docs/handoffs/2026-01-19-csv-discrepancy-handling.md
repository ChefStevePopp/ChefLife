# Handoff: CSV Uploader Discrepancy Handling (Critical Bug Fix)

**Session Date:** January 19, 2026  
**Priority:** HIGH - Alpha bug causing reporting havoc  
**Type:** Bug fix + Feature parity

---

## The Problem

**Real-world scenario discovered in Alpha:**
- GFS CSV import had a line item for "Chocolate Milk" with `$0.00` price
- This indicates a **shorted item** (ordered but not delivered)
- The $0.00 price was imported as-is, polluting:
  - Price History tracking
  - Cost calculations
  - Reporting/analytics

**Root cause:** CSVUploader.tsx lacks the discrepancy handling that exists in ImportWorkspace.tsx (used for PDF and Manual imports).

---

## The Solution

Add discrepancy handling to CSVUploader matching the pattern in ImportWorkspace.tsx:
- Two-stage button for marking discrepancies
- Discrepancy types: `short`, `damaged`, `wrong_item`, `price_mismatch`
- When marked as discrepancy, the line item should:
  - NOT update price history
  - Be flagged in the invoice for credit processing
  - Store the discrepancy reason

---

## Reference Files

### 1. ImportWorkspace.tsx (Gold Standard Pattern)
**Path:** `src/features/admin/components/sections/VendorInvoice/components/ImportWorkspace.tsx`

This file has the working discrepancy pattern for PDF/Manual imports. Key elements to extract:
- Discrepancy type dropdown or selection
- Two-stage confirmation button
- How it prevents price updates for discrepancy items
- Credit generation flow

### 2. CSVUploader.tsx (Needs Update)
**Path:** `src/features/admin/components/sections/VendorInvoice/components/CSVUploader.tsx`

This handles CSV imports from GFS, Sysco, etc. Currently missing:
- Any discrepancy handling UI
- Protection against $0.00 prices
- Short/damage flagging

### 3. TwoStageButton Component
**Path:** `src/shared/components/TwoStageButton.tsx`

Reusable confirmation pattern - first click expands, second click confirms.

### 4. Database Tables
- `vendor_invoice_items` - has `discrepancy_type`, `discrepancy_notes` columns
- `vendor_credits` - stores credit requests linked to invoice items
- `vendor_price_history` - should NOT be updated for discrepancy items

---

## Implementation Approach

### Step 1: Analyze ImportWorkspace.tsx
```bash
# Find discrepancy-related code
grep -n "discrepancy" ImportWorkspace.tsx
grep -n "short" ImportWorkspace.tsx
grep -n "damaged" ImportWorkspace.tsx
```

Extract:
- The UI pattern for marking discrepancies
- The data flow for storing discrepancy info
- How it prevents price history pollution

### Step 2: Add to CSVUploader.tsx

**UI Changes:**
- Add a discrepancy column/button to each line item row
- Use TwoStageButton with amber/warning variant
- Show discrepancy type selector on confirm stage

**Logic Changes:**
- When saving/committing CSV import:
  - Skip price history update for items marked as discrepancy
  - Store discrepancy_type and discrepancy_notes
  - Optionally create vendor_credit record

### Step 3: Add $0.00 Price Detection

**Auto-detection:**
- If `price === 0` or `price === null`, auto-suggest "short" discrepancy
- Visual indicator (amber highlight) on suspicious rows
- Don't auto-mark, but make it obvious to the user

**Validation:**
- Warn before commit if any $0.00 prices exist unmarked
- "3 items have $0.00 prices. Mark as shorts?"

---

## Discrepancy Types

| Type | Description | Price History | Credit |
|------|-------------|---------------|--------|
| `short` | Ordered but not delivered | ❌ Skip | ✅ Yes |
| `damaged` | Received damaged | ❌ Skip | ✅ Yes |
| `wrong_item` | Wrong product delivered | ❌ Skip | ✅ Yes |
| `price_mismatch` | Price different than expected | ⚠️ Review | ⚠️ Maybe |

---

## Database Schema Reference

```sql
-- vendor_invoice_items (existing columns)
discrepancy_type text,           -- 'short', 'damaged', 'wrong_item', 'price_mismatch'
discrepancy_notes text,          -- Free-form notes
quantity_ordered numeric,        -- What was ordered
quantity_received numeric,       -- What was actually received (0 for shorts)

-- vendor_credits (linked table)
invoice_item_id uuid,            -- FK to the problem item
credit_amount numeric,
credit_status text,              -- 'pending', 'approved', 'applied'
reason text
```

---

## UI Pattern from ImportWorkspace

Look for this general pattern in ImportWorkspace.tsx:

```tsx
// Conceptual pattern - actual code may differ
<TwoStageButton
  icon={AlertTriangle}
  confirmIcon={Check}
  variant="warning"
  size="sm"
  confirmLabel="Short"
  onConfirm={() => markAsDiscrepancy(item.id, 'short')}
/>
```

Or it might be a dropdown + button combo:

```tsx
<select value={discrepancyType} onChange={...}>
  <option value="">No Issue</option>
  <option value="short">Short</option>
  <option value="damaged">Damaged</option>
  <option value="wrong_item">Wrong Item</option>
</select>
```

---

## Testing Scenarios

1. **Import CSV with $0.00 price**
   - Should highlight row as suspicious
   - User marks as "short"
   - Price history NOT updated
   - Credit record created

2. **Import CSV with normal prices**
   - No warnings
   - Normal flow
   - Price history updated

3. **Import CSV, mark item as damaged**
   - Discrepancy saved
   - Price history skipped for that item
   - Other items process normally

4. **Commit without marking $0.00 items**
   - Warning dialog: "3 items have $0.00 prices"
   - Options: "Mark as Shorts" / "Import Anyway" / "Cancel"

---

## Files to Read First

1. `src/features/admin/components/sections/VendorInvoice/components/ImportWorkspace.tsx`
   - Full discrepancy handling pattern
   - Credit generation flow

2. `src/features/admin/components/sections/VendorInvoice/components/CSVUploader.tsx`
   - Current CSV import flow
   - Where to add discrepancy UI

3. `src/shared/components/TwoStageButton.tsx`
   - Confirmation button pattern

4. `src/stores/vendorInvoiceStore.ts` (if exists)
   - How invoice items are saved
   - Price history update logic

---

## Success Criteria

- [ ] CSVUploader has discrepancy marking UI matching ImportWorkspace
- [ ] $0.00 prices are visually flagged as suspicious
- [ ] Discrepancy items do NOT update price history
- [ ] Discrepancy type and notes are saved to vendor_invoice_items
- [ ] Warning shown if committing with unmarked $0.00 prices
- [ ] Credit records created for shorts/damages (if pattern exists in ImportWorkspace)

---

## Session Start Commands

```bash
# 1. Read the gold standard pattern
view C:\dev\cheflife\src\features\admin\components\sections\VendorInvoice\components\ImportWorkspace.tsx

# 2. Read the file to update
view C:\dev\cheflife\src\features\admin\components\sections\VendorInvoice\components\CSVUploader.tsx

# 3. Check TwoStageButton for reference
view C:\dev\cheflife\src\shared\components\TwoStageButton.tsx
```

---

## Context from This Session

**Completed today:**
1. ✅ PriceHistoryDetailModal - Gold standard chart modal with Recharts
2. ✅ ExcelDataGrid rowClickIcon prop - Now configurable per grid
3. ✅ PriceHistory uses LineChart icon instead of Pencil
4. ✅ Documentation: L5-BUILD-STRATEGY.md, chartmodal.md, this handoff

**The chart modal revealed the $0.00 bug** - seeing price history made the bad data obvious. This is exactly the kind of insight L6 features surface.

---

*Handoff prepared: January 19, 2026*
*Next session: CSV Uploader discrepancy handling*
