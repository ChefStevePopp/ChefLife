# Session 46: Price Source Tracking Implementation

**Date:** January 12, 2026  
**Focus:** Invoice-sourced price visibility with override protection  
**Transcript:** `/mnt/transcripts/2026-01-12-13-23-45-price-source-tracking-implementation.txt`

---

## Summary

Implemented price source tracking in the Ingredient Detail Page to show users WHERE their ingredient prices came from (invoice vs manual entry), with two-stage override protection to prevent accidental changes to invoice-sourced prices.

---

## Completed Work

### 1. TwoStageButton Enhancement (`@/components/ui/TwoStageButton`)

Added new props to the existing component:
- `size` prop: `"xs"` | `"sm"` | `"md"` (default: "md")
- `confirmIcon` prop: Optional different icon for confirm state

```typescript
<TwoStageButton
  onConfirm={() => enableOverride()}
  icon={Lock}
  confirmIcon={Pencil}
  confirmText="Edit?"
  variant="warning"
  size="xs"
  timeout={3000}
/>
```

### 2. Price Source Type Definition

```typescript
interface PriceSource {
  type: 'invoice' | 'manual' | 'unknown';
  invoiceNumber?: string;
  vendorName?: string;
  updatedAt: Date;
}
```

### 3. Price Source Fetch Function

Queries `vendor_price_history` table for most recent price update:

```typescript
const fetchPriceSource = async (ingredientId: string) => {
  const { data: priceHistory } = await supabase
    .from('vendor_price_history')
    .select(`
      id,
      price,
      created_at,
      vendor_invoices (
        invoice_number,
        vendors (
          name
        )
      )
    `)
    .eq('master_ingredient_id', ingredientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Sets priceSource state with invoice details or null for legacy
}
```

### 4. Purchase Price Field with Lock

- Lock icon 🔒 inside input field (right side)
- Two-stage click to unlock: 🔒 → [✏️ Edit?] → ✏️ (enabled)
- Field is read-only until override enabled
- Toast warning when override enabled
- Works for ALL users (not just alpha)

### 5. Equation-Style Price Card

Matches Cost Calculator visual pattern when invoice source exists:

```
Highland  •  $5.78  •  /kg  •  Jan 12  =  [$5.78]
Vendor       Price     Unit    Updated     per kg
```

For manual/legacy data (no price source):
```
[$5.78]
per kg
* Manual entry or legacy data
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ui/TwoStageButton.tsx` | Added `size` and `confirmIcon` props |
| `src/features/admin/.../IngredientDetailPage/index.tsx` | Price source tracking, override protection, equation card |
| `docs/UTILS.md` | Updated TwoStageButton documentation |

---

## State Variables Added

```typescript
const [priceSource, setPriceSource] = useState<PriceSource | null>(null);
const [isPriceOverrideEnabled, setIsPriceOverrideEnabled] = useState(false);
```

---

## Data Flow

```
Invoice Import → vendor_price_history record → links to vendor_invoices
                                              ↓
Ingredient Detail Page loads → fetchPriceSource() queries history
                                              ↓
Most recent history entry determines badge display
                                              ↓
If no history → price is legacy/manual (no source info)
```

---

## User Experience

| Scenario | Field State | Visual |
|----------|-------------|--------|
| New ingredient | Editable | No lock |
| No price source (legacy) | Editable | "* Manual entry or legacy data" |
| Has price source | Read-only | 🔒 Lock button, equation card with vendor/date |
| Override enabled | Editable | ✏️ Pencil icon, toast warning shown |

---

## Testing Notes

To see the full equation card with lock button:
1. Import an invoice through VIM
2. Navigate to an ingredient that was updated by that import
3. Should show equation: `Vendor • Price • Unit • Date = [Result]`
4. Lock icon appears in price input field
5. Click lock → "Edit?" → Click again → Field unlocks with warning

For ingredients WITHOUT price history:
- Just shows the simple result box
- No lock icon (field is editable)
- Shows "* Manual entry or legacy data"

---

## Known Issues / Next Steps

1. **Hard refresh may be needed** - After significant TSX changes, Vite hot reload sometimes doesn't pick up everything
2. **Backfill consideration** - Existing ingredients won't have price source until next invoice import updates them
3. **Future: Price history tab** - Could add a History tab showing all price changes with sources

---

## Related Promises

- **PROMISE-Audit-Trail.md** — Price source tracking is part of accounting-grade audit trail
- **PROMISE-Core-Philosophy.md** — "Tech that works FOR you" - protecting users from accidental data corruption

---

*Session 46 | January 12, 2026*
