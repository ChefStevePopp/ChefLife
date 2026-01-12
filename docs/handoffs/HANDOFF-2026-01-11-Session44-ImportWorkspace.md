# HANDOFF: Session 44 — Two-Column Import Workspace

**Date:** January 11, 2026  
**Previous Session:** 43  
**Context:** VIM Import redesign — L6 two-column workspace with document preview

---

## Session Summary

Built the **Two-Column Import Workspace** — a C-suite accounting feature that keeps source documents visible during invoice entry. "No neck patterns, no tab switching."

### Philosophy Implemented
- **Audit Trail First:** Every invoice requires a document (PDF or photo)
- **Respect the User:** Source always visible on right while editing on left
- **Progressive Parsing:** We parse what we can, user corrects what we miss
- **Vendor-Specific Parsers:** Extensible system starting with Flanagan

---

## What Was Built

### 1. Vendor PDF Parsers (`src/lib/vendorPdfParsers/`)

| File | Purpose |
|------|---------|
| `index.ts` | Parser registry, vendor detection, generic interface |
| `flanagan.ts` | Flanagan Foodservice parser (2026+ format) |

**Flanagan Parser Features:**
- Extracts grid data (qty, item code, unit, price, line total)
- Extracts invoice metadata (date, customer number, totals)
- Extracts product descriptions with brand and pack size
- Merges grid + descriptions by position
- Calculates parse confidence score (0-100)
- Reports parse warnings

**Adding New Vendors:**
```typescript
// In vendorPdfParsers/index.ts
const vendorParsers: VendorConfig[] = [
  { name: 'Flanagan Foodservice', detect: isFlanaganInvoice, parse: parseFlanagan },
  { name: 'GFS', detect: isGFSInvoice, parse: parseGFSInvoice },  // ← Add here
];
```

### 2. Import Components (`src/features/admin/components/sections/VendorInvoice/components/`)

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `ImportWorkspace.tsx` | Two-column container | File upload, orchestrates parsing, handles submit |
| `DocumentPreview.tsx` | Right column: PDF/photo viewer | Zoom, rotate, page navigation, pdf.js integration |
| `InvoiceEntryPanel.tsx` | Left column: editable item table | Auto-matching to MIL, verification workflow, search |

### 3. VIM Updates

| File | Changes |
|------|---------|
| `VendorInvoiceManager.tsx` | Added ImportWorkspace, added "photo" import type |
| `VendorSelector.tsx` | Enabled PDF button, added Photo button |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IMPORT WORKSPACE                                │
│                                                                         │
│  1. User selects vendor + uploads PDF/photo                            │
│                          ↓                                              │
│  2. File → Supabase Storage (`vendor-invoices` bucket)                 │
│                          ↓                                              │
│  3. PDF parsed via vendorPdfParsers / Photo displayed                  │
│                          ↓                                              │
│  4. Items auto-matched to MIL (by item_code first, then name fuzzy)    │
│                          ↓                                              │
│  5. User verifies each item (checkmark button)                         │
│                          ↓                                              │
│  6. SUBMIT creates audit chain:                                        │
│                                                                         │
│     vendor_imports          ← Batch record                             │
│           ↓                                                            │
│     vendor_invoices         ← Header + document_file_path + hash       │
│           ↓                                                            │
│     vendor_invoice_items    ← Line items (match_status, confidence)    │
│           ↓                                                            │
│     vendor_price_history    ← Price changes (invoice_item_id FK)       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Two-Column Layout

```
┌────────────────────────────────────┬─────────────────────────────────────┐
│  LEFT: InvoiceEntryPanel           │  RIGHT: DocumentPreview             │
│  ════════════════════════════════  │  ═══════════════════════════════    │
│                                    │                                     │
│  Invoice Date: [2026-01-07    📅]  │  ┌─────────────────────────────────┐│
│  Invoice #:    [optional        ]  │  │ [🔍-] [100%] [🔍+] [⟳] [📥]    ││
│                                    │  ├─────────────────────────────────┤│
│  Parse confidence: 85% ✓           │  │                                 ││
│                                    │  │                                 ││
│  ┌────────────────────────────────┐│  │      PDF / PHOTO PREVIEW        ││
│  │ Product     │ Code │ Qty│Price ││  │                                 ││
│  ├─────────────┼──────┼────┼──────┤│  │   ← Scrollable, Zoomable →      ││
│  │ TOMATO HOT..│281416│ 2  │35.86 ││  │                                 ││
│  │ ONION RED.. │281298│ 1  │30.71 ││  │   Page 1 / 1                    ││
│  │ [+ Add Item]              ✓ 🗑 ││  │                                 ││
│  └────────────────────────────────┘│  └─────────────────────────────────┘│
│                                    │  01-07-2026.pdf • 124.5 KB          │
│  Verified: 2/2         $66.57     │                                     │
│  [Cancel]              [Save →]   │                                     │
└────────────────────────────────────┴─────────────────────────────────────┘
```

---

## Files Created

| File | Location | Lines |
|------|----------|-------|
| `flanagan.ts` | `src/lib/vendorPdfParsers/` | ~220 |
| `index.ts` | `src/lib/vendorPdfParsers/` | ~100 |
| `DocumentPreview.tsx` | `VendorInvoice/components/` | ~230 |
| `InvoiceEntryPanel.tsx` | `VendorInvoice/components/` | ~450 |
| `ImportWorkspace.tsx` | `VendorInvoice/components/` | ~280 |

---

## Files Modified

| File | Changes |
|------|---------|
| `VendorInvoiceManager.tsx` | Added ImportWorkspace, photo type, showWorkspace state |
| `VendorSelector.tsx` | Added Camera icon, Photo button, updated Props interface |

---

## Testing Needed

### PDF Import Flow
1. Go to Admin → Data Management → Vendor Invoices
2. Select "Flanagan Foods" vendor
3. Click "PDF" import type
4. Upload `01-07-2026.pdf` from VENDOR INVOICES folder
5. Verify:
   - [ ] PDF renders in preview panel
   - [ ] Items parsed correctly (13 items)
   - [ ] Auto-matching works (items with matching codes get green %)
   - [ ] Date extracted correctly (Jan 7, 2026)
   - [ ] Verification checkmarks work
   - [ ] Submit creates all audit records

### Photo Import Flow
1. Same steps but select "Photo" import type
2. Upload a photo of an invoice
3. Verify:
   - [ ] Photo renders in preview panel
   - [ ] Manual entry works with photo visible
   - [ ] Submit stores photo in storage bucket

---

## Known Limitations

1. **Parser is Flanagan-specific** — GFS, Sysco need their own parsers
2. **No OCR for photos** — Photo import is manual entry with photo for audit
3. **Auto-match is fuzzy** — May need manual correction for new items
4. **No backfill yet** — Historical data integration not implemented

---

## Next Steps (Session 45+)

1. **Test the full flow** with real Flanagan PDFs
2. **Add GFS parser** if Steve has sample invoices
3. **Manual Entry update** — Make photo required for audit compliance
4. **Backfill feature** — Apply to historical invoices
5. **Parse confidence ML** — Learn from corrections over time

---

## Key Files for Future Sessions

| What | Location |
|------|----------|
| Flanagan Parser | `src/lib/vendorPdfParsers/flanagan.ts` |
| Parser Registry | `src/lib/vendorPdfParsers/index.ts` |
| Two-Column Workspace | `VendorInvoice/components/ImportWorkspace.tsx` |
| Document Viewer | `VendorInvoice/components/DocumentPreview.tsx` |
| Entry Panel | `VendorInvoice/components/InvoiceEntryPanel.tsx` |
| VIM Main | `VendorInvoice/VendorInvoiceManager.tsx` |
| Audit Trail Schema | `supabase/migrations/20260110000000_vim_audit_trail.sql` |

---

## Bucket Confirmation

Per Steve's screenshot, `vendor-invoices` bucket exists with 2 policies (private, org-scoped).

---

*"C-suite accounting app that masquerades as restaurant software"*

Ready for testing! 🔥
