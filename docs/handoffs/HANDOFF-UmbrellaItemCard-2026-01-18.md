# Handoff: UmbrellaItemCard Price Mode & Visual Hierarchy

**Date:** January 18, 2026  
**Session Focus:** Price mode UI, tablecloth/placemat hierarchy, aggregate purchase history modal, data sync fix  
**File:** `src/features/admin/components/sections/VendorInvoice/components/UmbrellaItemCard.tsx`

---

## Completed Work

### 1. Tablecloth/Placemat Visual Hierarchy

Established a nested depth pattern for expandable sections:

| Layer | Element | Style |
|-------|---------|-------|
| 0 | Tablecloth | `bg-primary-800/10` (expandable section background) |
| 1 | Placemats | `.card` class (blur, shadow, solid border) |
| 2 | Content | Rows/buttons with `hover:bg-gray-700/30` |

**Three placemats in expanded view:**
- **Vendor Sources** - List of linked ingredients with selection circles
- **Price Calculation** - Three mode buttons (Primary/Average/Weighted)
- **From Primary** - Inherited properties (allergens, storage, unit, category)

### 2. Unified Color System

Single teal accent for all financial data:
- All prices: `text-teal-400/70`
- Primary badge: `bg-teal-500/10 text-teal-400/70`
- Selection circles: `border-teal-400/70 bg-teal-500/80`

### 3. Consistent Header Styling

All section headers now use:
```tsx
<h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
  Section Title
</h5>
<p className="text-xs text-gray-500 mt-1">
  Subtitle explanation
</p>
```

### 4. Price Mode Selection with Floating Action Bar

**Pattern:** Click option → pending state → floating bar → confirm

```tsx
// State
const [priceMode, setPriceMode] = useState<UmbrellaPriceMode>(umbrella.price_mode || 'primary');
const [pendingPriceMode, setPendingPriceMode] = useState<UmbrellaPriceMode | null>(null);
const displayPriceMode = pendingPriceMode || priceMode;
const hasPendingPriceModeChange = pendingPriceMode !== null && pendingPriceMode !== priceMode;
```

### 5. Aggregate Purchase History Modal

**Trigger:** "View aggregate purchase history" button in Price Calculation placemat

**Features:**
- ScatterChart with multi-vendor overlay (each ingredient = different color)
- Dot size scaled by purchase quantity (6px min → 16px max)
- Weighted average reference line (dashed teal)
- Stats row: Weighted Avg | Simple Avg | Spread | Purchase Count
- Vendor legend with purchase counts and total units

### 6. ✅ FIXED: Data Sync Architecture (Jan 18 Session)

**Problem Fixed:** Data was flowing both directions, creating sync confusion and potential corruption.

**Old (Broken) Architecture:**
```
Component: handleSetPrimary()
  ├── Fetches master ingredient data (REDUNDANT - store does this)
  ├── Builds 40+ field object manually (REDUNDANT)
  ├── Calls updateUmbrellaIngredient() 
  │     └── Store fetches same data AGAIN
  └── Calls updatePrimaryMasterIngredientFromUmbrella() ← BACKWARD SYNC BUG
        └── Pushed umbrella data BACK to vendor ingredient (corrupting source of truth)
```

**New (Clean) Architecture:**
```
Component: handleSetPrimary()
  └── Calls updateUmbrellaIngredient(id, { name, description, primary_master_ingredient_id })
        │
        └── Store handles everything internally:
              1. Fetches primary ingredient data
              2. Updates umbrella_ingredients table
              3. Syncs to UMB- master ingredient via setUmbrellaIngredientFromPrimary()
```

**One-Way Data Flow (Audit-Friendly):**
```
GFS Whipping Cream (Vendor Source of Truth)
    ↓ [User action: "Set as Primary" - timestamped]
Umbrella: Whipping Cream (inherits snapshot)
    ↓ [Automatic sync]
UMB-12345 in MIL (recipe costing reference)
```

**Changes Made:**
1. Removed redundant Supabase fetch from `handleSetPrimary()`
2. Removed backward sync call to `updatePrimaryMasterIngredientFromUmbrella()`
3. Removed unused `useMasterIngredientsStore` import
4. Simplified to just pass `{ name, description, primary_master_ingredient_id }`
5. Removed `setTimeout` hack - now uses clean `onRefresh()` directly

### 7. ✅ FIXED: "From Primary" Panel Live Preview (Jan 18 Session)

**Problem Fixed:** Panel showed stale umbrella data, not the selected primary's data.

**New Behavior:**
- Panel now reads from `selectedPrimary` (the currently selected vendor ingredient)
- Shows "Preview:" indicator when selection differs from saved primary
- Amber ring around panel when previewing pending change
- Allergens, storage, unit, and category all update immediately when you click a different vendor

**New Variables Added:**
```tsx
// The currently selected primary (may be pending save)
const selectedPrimary = vendorIngredients.find(ing => ing.id === selectedPrimaryId);

// Are we previewing a change that hasn't been saved yet?
const isPendingPrimaryChange = selectedPrimaryId !== umbrella.primary_master_ingredient_id;
```

---

## Testing Checklist

1. **Live Preview:**
   - [ ] Open an umbrella card with multiple vendor ingredients
   - [ ] Click a different vendor in the selection list
   - [ ] Verify "From Primary" panel updates immediately with "Preview:" label
   - [ ] Verify amber ring appears around the panel

2. **Save Flow:**
   - [ ] Click "Set as Primary" button
   - [ ] Verify toast shows "Primary ingredient saved and synced"
   - [ ] Verify umbrella properties update (allergens, storage, unit)

3. **MIL Sync:**
   - [ ] After saving primary, navigate to Master Ingredients List
   - [ ] Find the UMB- item for this umbrella
   - [ ] Verify it has the correct allergens, storage, unit from the primary

4. **No Backward Corruption:**
   - [ ] Check the original vendor ingredient (e.g., GFS Whipping Cream)
   - [ ] Verify its data was NOT modified by the umbrella save

---

## Files Modified

- `src/features/admin/components/sections/VendorInvoice/components/UmbrellaItemCard.tsx`

## Patterns to Reuse

This UmbrellaItemCard pattern should be copied to **Code Groups** page:

1. **Expandable card with tablecloth/placemat**
2. **Selection circles for choosing primary**
3. **Floating action bar for confirming changes**
4. **Multi-series scatter chart for aggregate data**
5. **Live preview panel with pending state indicator**

---

## Related Documentation

- `docs/L5-BUILD-STRATEGY.md` - Updated with tablecloth/placemat pattern
- `docs/UTILS.md` - Updated with charting component patterns
