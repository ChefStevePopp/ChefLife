# Session 36 Handoff - Triage Workflow & Ingredient Types
**Date:** January 10, 2026  
**Focus:** VIM Triage tab, Purchased vs Prep ingredients, Friendly IDs, Contextual Navigation

---

## What We Built

### 1. Triage Tab in VIM
**Location:** `/admin/data/vendor-invoices?tab=triage`

A unified cleanup queue showing items needing attention:
- **Skipped** (👻 Ghost) - 0% complete, parked during VIM import
- **Incomplete** (⚠️ AlertTriangle) - Partial %, needs required fields

Plus type filtering:
- **Purchased** (🛒 ShoppingCart) - From vendor, numeric item_code
- **Prep** (👨‍🍳 ChefHat) - Made in kitchen, no vendor code

**Features:**
- Stats bar with totals
- Filter pills (Source: All/Skipped/Incomplete | Type: Purchased/Prep)
- Expandable icon legend
- Icon-only table cells with tooltips
- Bulk delete 0% items
- Edit navigates to IngredientDetailPage with contextual back

**File:** `src/features/admin/components/sections/VendorInvoice/components/TriagePanel.tsx`

### 2. Ingredient Type System

**New Columns (migration ready, not yet run):**
```sql
ingredient_type TEXT DEFAULT 'purchased' CHECK (IN ('purchased', 'prep'))
source_recipe_id UUID REFERENCES recipes(id)
```

**Type Detection Logic:**
| Signal | Type |
|--------|------|
| `source_recipe_id` set | PREP (100% certain) |
| `item_code` is null/empty/"-" | PREP |
| `item_code` is numeric | PURCHASED |
| Default | PURCHASED |

**Migration file:** `supabase/migrations/20250110_ingredient_type.sql`

### 3. Friendly ID System
**File:** `src/lib/friendly-id.ts`

Base58 UUID encoding for prep item codes:
```
UUID:     7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c (36 chars)
Friendly: Xk9mR2pQ (8 chars)
```

**Functions:**
- `toFriendlyId(uuid)` - Encode
- `fromFriendlyId(code)` - Decode
- `generatePrepItemCode(recipeId)` - Get code for prep ingredient
- `determineIngredientType({item_code, source_recipe_id})` - Type detection

### 4. Contextual Back Navigation

**Store Update:** `ingredientNavigationStore.ts`
```typescript
returnTo: string; // e.g., "/admin/data/vendor-invoices?tab=triage"
setNavigationContext(ids, filterDescription?, returnTo?)
```

**Flow:**
- Triage → Edit → Back = Returns to Triage
- MIL → Edit → Back = Returns to MIL
- Dynamic label: "Back to Triage" vs "Back to Ingredients"

---

## Files Modified

| File | Changes |
|------|---------|
| `TriagePanel.tsx` | New component - unified triage view |
| `VendorInvoiceManager.tsx` | Added Triage tab (cyan) |
| `MasterIngredientList/index.tsx` | Removed "pending" status |
| `StatusCell.tsx` | Simplified to complete/incomplete only |
| `ingredientNavigationStore.ts` | Added `returnTo` field |
| `IngredientDetailPage/index.tsx` | Uses `returnTo` for navigation |
| `IngredientDetailPage/PageHeader.tsx` | Dynamic `backLabel` prop |
| `friendly-id.ts` | NEW - Base58 encoding, type determination |
| `master-ingredient.ts` | Added `ingredient_type`, `source_recipe_id` |
| `20250110_ingredient_type.sql` | NEW - Migration (not yet run) |

---

## Migration To Run

```sql
-- Add ingredient_type column
ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS ingredient_type TEXT DEFAULT 'purchased' 
CHECK (ingredient_type IN ('purchased', 'prep'));

-- Add source_recipe_id for prep items
ALTER TABLE master_ingredients
ADD COLUMN IF NOT EXISTS source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_master_ingredients_type 
ON master_ingredients(organization_id, ingredient_type);

-- Backfill: Items without item_code are prep
UPDATE master_ingredients 
SET ingredient_type = 'prep' 
WHERE (item_code IS NULL OR item_code = '' OR item_code = '-');
```

---

## What's Next

### Immediate
1. Run the migration in Supabase
2. Test Triage flow end-to-end
3. Test contextual back navigation from both entry points

### Future Work
1. **Recipe → Ingredient Creation Flow**
   - Button on prepared recipes: "Create as Ingredient"
   - Auto-generates friendly ID as item_code
   - Sets source_recipe_id link
   - Cost calculated from recipe

2. **Cost Cascade**
   - When prep recipe cost changes, update linked ingredient's cost_per_recipe_unit
   - Propagate to all recipes using that prep ingredient

3. **Type-Specific Completeness**
   - Purchased: vendor fields required
   - Prep: source_recipe_id required, vendor fields optional

---

## Key Decisions Made

1. **Ghost icon for Skipped** - It's "not really there yet"
2. **Icons-only in table** with expandable legend - Cleaner, denser
3. **Inline type detection** - Avoids module import issues
4. **Friendly ID = Base58** - Deterministic, reversible, URL-safe
5. **returnTo in store** - Enables contextual navigation without URL params

---

## Transcript Reference
`/mnt/transcripts/2026-01-10-21-50-42-stage3-triage-contextual-nav-prep-types.txt`

---

*"Keep communication consistent, keep commerce kind, and keep your culture cool and comfortable, my friends."*
