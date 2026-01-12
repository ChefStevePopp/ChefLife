# HANDOFF: Session 46 — Re-apply Version Control & Pending Items

**Date:** January 12, 2026  
**Previous Session:** 45  
**Context:** Re-applying Session 45 changes to home machine (work machine changes weren't pushed)

---

## Session Summary

Re-applied all Session 45 changes to the home machine which was behind. All automatic version control and pending_import_items functionality is now in place.

---

## What Was Applied

### 1. Migration: Import Version Control
**File:** `supabase/migrations/20260111210000_import_version_control.sql`

Adds to `vendor_imports`:
- `version` (integer, default 1)
- `supersedes_id` (uuid, FK to vendor_imports)
- `superseded_at` (timestamptz)
- `superseded_by` (uuid, FK to auth.users)
- `invoice_number` (text)
- New status value: `'superseded'`

### 2. ImportWorkspace.tsx — Full Update

**Key changes:**
- Automatic version control: System detects same invoice_number OR file_name from same vendor
- Auto-supersedes ALL previous non-superseded imports
- Creates new import with version = max(existing) + 1
- NEXUS logging for `import_version_created` events
- Correct column names: `vendor_code` (not item_code), `total_price` (not line_total)
- Only matched items (with master_ingredient_id) go to vendor_invoice_items
- **NEW: Unmatched items insert into pending_import_items for Triage**

### 3. ImportHistory.tsx — Version Display

**New columns:**
- Invoice # (with "—" for null)
- Version number
- Status (color-coded: completed=green, superseded=gray, processing=amber)

**Actions column using custom render:**
- Eye icon: View details (placeholder)
- Recall icon: Opens Import tab with vendor pre-selected

**Removed:**
- Delete button (audit trail = immutable)
- Download button

### 4. VendorInvoiceManager.tsx — Recall Handler

Added `onRecall` prop to ImportHistory with handler that:
- Sets selected vendor from the import record
- Switches to Import tab
- Sets import type to "manual" (photo)
- Shows toast explaining that new version will be created automatically

---

## Files Modified

| File | Location |
|------|----------|
| `ImportWorkspace.tsx` | `src/features/admin/components/sections/VendorInvoice/components/` |
| `ImportHistory.tsx` | `src/features/admin/components/sections/VendorInvoice/components/` |
| `VendorInvoiceManager.tsx` | `src/features/admin/components/sections/VendorInvoice/` |

## Files Created

| File | Location |
|------|----------|
| `20260111210000_import_version_control.sql` | `supabase/migrations/` |

---

## Version Control Flow (Automatic)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC VERSION CONTROL                            │
│                                                                         │
│  1. Upload file for VENDOR_X                                           │
│                          ↓                                              │
│  2. Check vendor_imports:                                              │
│     - Same invoice_number (if present) OR same file_name               │
│     - WHERE status != 'superseded'                                     │
│                          ↓                                              │
│  3. If found:                                                          │
│     - UPDATE all matches: status='superseded', superseded_at, by       │
│     - New import: version = max(existing) + 1, supersedes_id           │
│     - NEXUS: log import_version_created                                │
│                          ↓                                              │
│  4. If not found:                                                      │
│     - New import: version = 1                                          │
│                                                                         │
│  Result: Full audit chain, immutable history                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pending Import Items Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UNMATCHED ITEMS → TRIAGE                            │
│                                                                         │
│  During import:                                                        │
│    items.filter(item => item.matchedIngredientId)                      │
│      → vendor_invoice_items (requires master_ingredient_id)            │
│                                                                         │
│    items.filter(item => !item.matchedIngredientId)                     │
│      → pending_import_items (for Triage tab)                           │
│      → Uses upsert on (org_id, vendor_id, item_code, status)           │
│                                                                         │
│  Triage badge updates automatically when items need attention          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ExcelDataGrid Custom Column Pattern

Reference from `docs/UTILS.md`:

```typescript
{
  key: "actions",
  name: "Actions",
  type: "custom",
  width: 100,
  sortable: false,
  filterable: false,
  render: (_value: any, row: ImportRecord) => (
    <div className="flex justify-center gap-1">
      <button onClick={(e) => { e.stopPropagation(); ... }}>
        <Eye className="w-4 h-4" />
      </button>
    </div>
  ),
}
```

**Key points:**
- Use `type: "custom"` with `render` function
- Don't put JSX in data object
- `render` receives `(value, row)`

---

## Testing Checklist

### Version Control
- [ ] Upload Highland Packers file → Creates v1
- [ ] Upload same file again → Auto-supersedes, creates v2
- [ ] History shows superseded status (gray)
- [ ] NEXUS has import_version_created event

### Pending Items
- [ ] Import with unmatched items → Check pending_import_items table
- [ ] Triage badge updates
- [ ] Console shows "[VIM] X items queued for triage"

### Recall Flow
- [ ] History → Click Recall button
- [ ] Switches to Import tab
- [ ] Vendor is pre-selected
- [ ] Toast shows "Ready to upload correction..."

---

## Database State Note

The migration adds columns to `vendor_imports`. If existing data has NULL versions, they'll default to 1. The `superseded` status is new, so existing records will have their original statuses.

---

## Git Sync Note

⚠️ **Work machine may have uncommitted changes.** When returning to work:
1. Check for local changes on work machine
2. If changes exist, push from work first
3. Then pull to home
4. OR if work changes are identical, just pull from home

---

## Next Session Priorities

1. **Run migration** on Supabase (if not already applied)
2. **Test version control flow** with real upload
3. **Test pending_import_items** appearing in Triage
4. **Test Recall flow** end-to-end

---

## Key Files for Reference

| What | Location |
|------|----------|
| Import Workspace | `src/features/admin/components/sections/VendorInvoice/components/ImportWorkspace.tsx` |
| Import History | `src/features/admin/components/sections/VendorInvoice/components/ImportHistory.tsx` |
| VIM Manager | `src/features/admin/components/sections/VendorInvoice/VendorInvoiceManager.tsx` |
| Version Control Migration | `supabase/migrations/20260111210000_import_version_control.sql` |
| Pending Items Migration | `supabase/migrations/20250110_pending_import_items.sql` |
| ExcelDataGrid docs | `docs/UTILS.md` |

---

*"No user buttons. No fraud vector. Pure data-driven audit trail."* 📋
