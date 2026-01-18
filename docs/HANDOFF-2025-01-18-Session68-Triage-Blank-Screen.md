# HANDOFF: Session 68 - Fix Triage → Create Ingredient Blank Screen

## Context
Session 67 successfully implemented the **Catch Weight Toggle** for PDF import in VendorInvoiceManagement. The Scale button (⚖️) now allows users to manually mark items as priced by weight ($/lb) even when the unit shows as Case/Box - solving the brisket pricing problem where PDF invoices show line totals instead of per-lb rates.

However, clicking the **Pen icon** in Triage to create a new ingredient from a skipped import item results in a **blank screen with no console errors**.

## Problem
- User clicks pen (✏️) on a Triage item
- URL navigates to `/admin/data/ingredients/new?pending_id=xxx&item_code=xxx&product=xxx...`
- **Blank screen renders** - no form, no errors in console
- Silent failure - likely a render issue in IngredientDetailPage

## Likely Cause
The `IngredientDetailPage` component at:
```
C:\dev\cheflife\src\features\admin\components\sections\recipe\MasterIngredientList\IngredientDetailPage\index.tsx
```

Has triage URL param extraction logic around lines 580-590:
```typescript
const triageData = isNew ? {
  pendingId: searchParams.get('pending_id'),
  itemCode: searchParams.get('item_code'),
  product: searchParams.get('product'),
  price: searchParams.get('price'),
  vendor: searchParams.get('vendor'),
  uom: searchParams.get('uom'),
} : null;
const isFromTriage = !!(triageData?.pendingId);
```

The blank screen (no errors) suggests:
1. A conditional render returning `null` or empty content early
2. A state initialization issue with `formData` staying `null`
3. The `organization?.id` check failing silently

## Debug Steps
1. Check the loading state logic around line 890+:
   ```typescript
   if (isLoading || hasPermission === null) {
     return <LoadingSkeleton />
   }
   ```
   
2. Check if `formData` is being set for new ingredients (line ~780):
   ```typescript
   if (isNew) {
     if (organization?.id) {
       const newIngredient = createEmptyIngredient(organization.id);
       // Pre-fill from Triage data...
       setFormData(newIngredient);
     }
     return; // <-- This might exit before setting formData if org is undefined
   }
   ```

3. The issue is likely that `organization?.id` is undefined when the effect runs, so `formData` never gets set, and the final render guard:
   ```typescript
   if (!formData) {
     return <Loader2 spinning />
   }
   ```
   Shows spinner forever (or blank if that guard changed).

## Fix Strategy
The load effect at line ~770 needs to handle the async nature of `organization` loading:

```typescript
useEffect(() => {
  const loadIngredient = async () => {
    if (isNew) {
      // PROBLEM: organization might not be loaded yet
      if (organization?.id) {
        const newIngredient = createEmptyIngredient(organization.id);
        // ... pre-fill logic
        setFormData(newIngredient);
        setOriginalData(newIngredient);
      }
      return; // <-- Returns early without setting isLoading=false for new
    }
    // ... existing ingredient loading
  };
  loadIngredient();
}, [id, isNew, organization?.id, ingredientIds, setCurrentIndex]);
```

**The fix**: For `isNew`, we need to:
1. Wait for `organization?.id` to be defined before returning
2. OR set a different loading state that waits for auth
3. Make sure `isLoading` is correctly false for new ingredients

## Files to Check
1. `IngredientDetailPage/index.tsx` - Main component, lines 770-820 (load effect)
2. Check what `useAuth()` returns and when `organization` becomes available
3. Verify the Triage pen click handler is building the URL correctly

## Session 67 Completed Work
- ✅ Added `Scale` icon import to InvoiceEntryPanel
- ✅ Added `toggleCatchWeight()` function for manual mode switching
- ✅ Added Scale button in Actions column (cyan when active)
- ✅ Updated Price column to show "$/lb" prefix in catch weight mode
- ✅ Updated Received column to show weight input with "lbs" placeholder
- ✅ Visual indicators: cyan highlighting throughout for catch weight items
- ✅ Toast notifications explaining mode changes

## Test After Fix
1. Go to Triage tab in VIM
2. Find a skipped item
3. Click pen icon (✏️)
4. Verify IngredientDetailPage loads with:
   - Ghost banner showing "Creating from Triage"
   - Pre-filled product name, item code, price, vendor from URL params
5. Save ingredient
6. Verify item is removed from Triage (pending_import_items deleted)
7. Verify NEXUS event fires for `triage_item_converted`

## Quick Reference
- Triage pen click: `TriageTab.tsx` (builds URL with params)
- Create page: `IngredientDetailPage/index.tsx` (consumes params)
- URL pattern: `/admin/data/ingredients/new?pending_id=X&product=X&item_code=X&price=X&vendor=X&uom=X`
