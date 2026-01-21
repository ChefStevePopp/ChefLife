# Food Relationships & Recipe Manager Taxonomy Redesign

**Session Date:** January 21, 2026  
**Status:** Architecture Defined, Ready for Implementation  
**Priority:** High — Foundation for Recipe Manager & Reporting

---

## Executive Summary

We discovered that **Food Relationships is the universal taxonomy** for ChefLife — not just for ingredients, but for recipes too. The Major Groups already contain MIS EN PLACE, FINAL GOODS, and the system needs RECEIVING and RETAIL as recipe types.

This session defined the architecture for:
1. L5 redesign of Food Relationships with Guided Mode education
2. Recipe Manager tabs driven by Food Relationships (not hardcoded)
3. System vs User items with proper constraints
4. Database migration for `is_system` and `is_recipe_type` flags

---

## The Architectural Discovery

### Current State (Food Relationships Major Groups)

```
FOOD          → Raw ingredients
ALCOHOL       → Beverage ingredients  
MIS EN PLACE  → Prep recipes ← Already a recipe type!
FINAL GOODS   → Menu items   ← Already a recipe type!
RETAIL        → Packaged goods
CONSUMABLES   → Supplies
```

### The Insight

Recipe Manager's hardcoded tabs (Mis en Place, Final Plates, Receiving) should **pull from Food Relationships Major Groups** where `is_recipe_type = true`.

### The Production Pipeline

```
RECEIVING → MIS EN PLACE → FINAL GOODS
         ↘             ↘→ RETAIL
```

**Receiving IS a recipe** — it has:
- Inputs (case of chicken, vacuum bags, labels)
- Labor stages (receive, inspect temp, portion, seal, label, store)
- Time (18 minutes per case)
- Standards (temp ≤40°F, date labels correct)
- Yield (12 portions from 1 case)
- Output → Feeds Prep Lists

---

## Database Migration Plan

### New Columns

```sql
ALTER TABLE food_category_groups 
  ADD COLUMN is_system BOOLEAN DEFAULT false,
  ADD COLUMN is_recipe_type BOOLEAN DEFAULT false,
  ADD COLUMN icon VARCHAR(50);
```

### System Groups (Can't Delete, Can Archive)

| Group | is_system | is_recipe_type | icon | Purpose |
|-------|-----------|----------------|------|---------|
| FOOD | ✅ | ❌ | `Utensils` | Raw ingredients |
| ALCOHOL | ✅ | ❌ | `Wine` | Beverage ingredients |
| MIS EN PLACE | ✅ | ✅ | `ChefHat` | Prep recipes |
| FINAL GOODS | ✅ | ✅ | `UtensilsCrossed` | Menu items |
| RECEIVING | ✅ | ✅ | `PackageOpen` | Receiving procedures |
| CONSUMABLES | ✅ | ❌ | `Box` | Supplies, packaging |

### User Groups (Full Control)

| Group | is_system | is_recipe_type | icon | Purpose |
|-------|-----------|----------------|------|---------|
| RETAIL | ❌ | ✅ | `ShoppingBag` | Packaged goods (optional) |
| [Custom] | ❌ | ❌/✅ | User choice | Whatever they need |

---

## UI Design: Food Relationships L5 + Guided Mode

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 📂 Food Relationships                    [Guide 🎓] [Archived 👁]│
│ Your taxonomy for ingredients, recipes, and reporting           │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search all categories...                                     │
├─────────────────────────────────────────────────────────────────┤
│ [GuidanceTip: "Think of taxonomy like folders on your           │
│  computer — Major Groups are big folders, Categories are        │
│  subfolders, Sub-Categories are the specific items inside."]    │
├─────────────────────────────────────────────────────────────────┤
│ Major Groups       │ Categories         │ Sub-Categories        │
│ ─────────────────  │ ─────────────────  │ ─────────────────     │
│ [GuidanceTip]      │ [GuidanceTip]      │ [GuidanceTip]         │
│ 🔒 🍴 FOOD         │ Select a group...  │ Select a category...  │
│ 🔒 🍷 ALCOHOL      │                    │                       │
│ 🔒 👨‍🍳 MIS EN PLACE │                    │                       │
│ 🔒 🍽️ FINAL GOODS  │                    │                       │
│ 🔒 📦 RECEIVING    │                    │                       │
│ 🔒 📦 CONSUMABLES  │                    │                       │
│    🛍️ RETAIL       │                    │                       │
│ + Add Group        │                    │                       │
└─────────────────────────────────────────────────────────────────┘
```

### Guided Mode Education Content

**Page-level tip:**
> Your taxonomy is how ChefLife organizes everything in your kitchen. Think of it like folders on a computer — Major Groups are the big folders, Categories are subfolders, and Sub-Categories are the specific items inside. This structure powers your inventory reports, recipe costing, menu engineering, and P&L breakdowns.

**Major Groups column:**
> These are your top-level buckets. System groups (🔒) are locked because ChefLife needs them to function — they organize ingredients, recipes, and reports. You can add custom groups for things unique to your operation.

**Categories column:**
> Inside each Major Group, you break things down further. For example, FOOD might have Proteins, Produce, Dairy, and Dry Goods. These become the filter dropdowns you see throughout ChefLife.

**Sub-Categories column:**
> The finest level of detail. Proteins → Beef, Pork, Chicken, Seafood. When you run your food cost report by category, this is what you'll see. The more thoughtfully you set this up, the more useful your reports become.

---

## Recipe Manager Integration

### Current (Hardcoded)

```tsx
const TABS = [
  { id: "prepared", label: "Mis en Place" },
  { id: "final", label: "Final Plates" },
  { id: "receiving", label: "Receiving Items" },
];
```

### Future (Dynamic from Food Relationships)

```tsx
const recipeTabs = majorGroups
  .filter(g => g.is_recipe_type && !g.archived)
  .sort((a, b) => a.sort_order - b.sort_order)
  .map(g => ({
    id: g.id,
    label: g.name,
    icon: getIconForGroup(g.icon), // Lucide component
    color: g.color || 'primary',
  }));
```

Benefits:
- User adds CATERING as a recipe type → new tab appears automatically
- User archives RETAIL → tab disappears
- Consistent taxonomy across the entire system

---

## Files to Modify

### 1. Comment Out Dead Code

```
src/features/admin/components/sections/OperationsManager/FoodRelationshipsManager.tsx
```
This 600-line file is **not used** — RelationshipsTab imports from the other location.

### 2. Refactor Active Component

```
src/features/admin/components/sections/FoodRelationshipsManager/index.tsx
```

Changes:
- Remove redundant header (Operations.tsx handles it)
- Wrap in `<GuidedModeProvider>`
- Add L5 subheader with `<GuidedModeToggle />`
- Add `<GuidanceTip>` per column
- Add search bar (filters all three columns)
- Add 🔒 Lock icon for system items
- Map icon column to Lucide components
- Add diagnostic path

### 3. Create Migration

```
supabase/migrations/YYYYMMDD_food_relationships_system_flags.sql
```

### 4. Update Store (if needed)

```
src/stores/foodRelationshipsStore.ts
```

Handle new `is_system`, `is_recipe_type`, `icon` columns.

### 5. Later: Update Recipe Manager

Wire tabs to Food Relationships instead of hardcoded values.

---

## The 1000-User Test

**Day 1 User (Taco Truck):**
- Signs up
- Sees FOOD, MIS EN PLACE, FINAL GOODS already there
- Clicks FOOD → sees Proteins, Produce, Dairy, Dry Goods
- Thinks: "Oh, I just pick where my stuff goes"
- Never touches Food Relationships again
- **Zero configuration. Just works.**

**Day 90 User (Growing Restaurant):**
- Needs "Seafood" separate from "Proteins"
- Goes to Operations → Food Relationships
- Adds sub-category
- **Self-service. No support ticket.**

**Power User (Multi-Unit):**
- Needs custom Major Group for "CATERING"
- Clicks "+ Add Major Group"
- Builds out their taxonomy
- **Full control. Enterprise capability.**

---

## Completed This Session

1. ✅ Recipe Manager L5 audit
2. ✅ Recipe Manager L5 upgrade (header, skeleton, debounce, pagination, filters, sort)
3. ✅ Food Relationships audit (found dead code, identified issues)
4. ✅ Architecture decision: Food Relationships = universal taxonomy
5. ✅ Database migration plan defined
6. ✅ UI design with Guided Mode pattern defined
7. ✅ Integration plan for Recipe Manager

## Completed Session 2 (Jan 21, 2026)

1. ✅ Database migration created (`20260121100000_food_relationships_system_flags.sql`)
   - Added `is_system` and `is_recipe_type` columns to `food_category_groups`
   - Created index for recipe type lookups
   - Created trigger to prevent deletion of system groups
   - Auto-flags existing groups based on name matching
2. ✅ Dead code removed (`OperationsManager/FoodRelationshipsManager.tsx` → `_deprecated_`)
3. ✅ Store updated (`foodRelationshipsStore.ts`)
   - Added `icon`, `color`, `is_system`, `is_recipe_type` to types
   - Added `getRecipeTypeGroups()` helper for Recipe Manager integration
4. ✅ Icon mapping utility created (`src/utils/iconMapping.ts`)
   - Lucide icon name → component mapping
   - Suggested icons for common groups
   - Icon picker options for future UI
5. ✅ Food Relationships L5 complete rewrite (`FoodRelationshipsManager/index.tsx`)
   - GuidedModeProvider + GuidedModeToggle
   - GuidanceTip per column with educational content
   - Search bar filtering all columns
   - Lock icon (🔒) for system items
   - Recipe type badge
   - Lucide icon rendering from database
   - Diagnostic path
   - Removed redundant header (parent handles it)
6. ✅ Migration applied — lock icons and recipe badges now visible
7. ✅ UI polish pass
   - Restored readable font sizes
   - Grey text (not pure white) for item names
   - Styled description expansion cards
   - Subheader card with proper L5 styling
8. ✅ User Education Standards documented (`docs/USER-EDUCATION-STANDARDS.md`)
   - 6-level education hierarchy defined
   - GuidanceTip writing standards
   - Subheader pattern documented
   - Anti-patterns identified
9. ✅ GuidanceTips refined to match standards (shorter, punchier)

---

## Next Session Scope

### Phase 1: Database & Cleanup (15 min) - ✅ COMPLETE
1. ✅ Create migration for `is_system`, `is_recipe_type`, `icon` columns
2. ✅ Comment out dead code (`OperationsManager/FoodRelationshipsManager.tsx`)
3. ⏳ Apply migration locally (run `supabase db push` or apply to remote)

### Phase 2: Food Relationships L5 (45 min) - ✅ COMPLETE
1. ✅ Remove redundant header
2. ✅ Add GuidedModeProvider + GuidedModeToggle
3. ✅ Add L5 subheader
4. ✅ Add GuidanceTip per column
5. ✅ Add search bar
6. ✅ Add Lock icon for system items
7. ✅ Map icons to Lucide components
8. ✅ Add diagnostic path

### Phase 3: Recipe Manager Wiring (30 min) - TODO
1. Pull tabs from Food Relationships store
2. Filter by `is_recipe_type = true`
3. Dynamic icons/colors from database

### Phase 4: Testing & Polish (15 min) - TODO
1. Test Guided Mode toggle
2. Test search across columns
3. Verify system items can't be deleted
4. Verify Recipe Manager tabs update when Food Relationships changes

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `src/features/admin/components/sections/FoodRelationshipsManager/index.tsx` | Active component to refactor |
| `src/features/admin/components/sections/Operations/Operations.tsx` | L5 gold standard parent |
| `src/features/admin/components/sections/recipe/MasterIngredientList/IngredientDetailPage/index.tsx` | Guided Mode gold standard |
| `src/shared/components/L5/GuidedModeContext.tsx` | GuidedModeProvider + Toggle |
| `src/shared/components/L5/GuidanceTip.tsx` | Education component |
| `src/stores/foodRelationshipsStore.ts` | Zustand store for taxonomy |
| `src/features/recipes/components/RecipeManager/RecipeManager.tsx` | Just upgraded to L5 |

---

## Design Decisions Locked

1. **Lucide icons only** — no emoji in the system
2. **System groups can be archived, not deleted**
3. **Recipe tabs driven by Food Relationships** (future)
4. **Guided Mode for onboarding education**
5. **Setup wizard will include Food Relationships as Step 2**

---

## Related Documentation

- `docs/L5-BUILD-STRATEGY.md` — L5 design patterns
- `docs/CHEFLIFE-ANATOMY.md` — System architecture
- `docs/handoffs/HANDOFF-Recipe-Relational-Foundation.md` — Recipe ingredients migration (completed)
