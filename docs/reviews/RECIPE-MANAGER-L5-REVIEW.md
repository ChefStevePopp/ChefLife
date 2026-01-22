# Recipe Manager - L5/L6/L7 Anatomy Review

**Date:** January 21, 2026  
**Status:** Design Audit  
**Reference:** L5-BUILD-STRATEGY.md

---

## Executive Summary

Recipe Manager is a dynamic tab-based module for managing kitchen recipes across different recipe types (Mis en Place, Final Goods, Receiving, Retail, etc.). As of this session, **dynamic tabs** are now wired to Food Relationships — tabs appear/disappear based on `is_recipe_type` flag on Major Groups.

This review captures current state and planned L5/L6/L7 progression.

---

## Main Container: RecipeManager.tsx

**File:** `src/features/recipes/components/RecipeManager/RecipeManager.tsx`  
**Status:** L5 Compliant (with L6 opportunities)

| Element | Status | Notes |
|---------|--------|-------|
| L5 Header Card | ✅ | `bg-[#1a1f2b] rounded-lg shadow-lg p-4` |
| Icon + Title | ✅ | ChefHat icon, proper sizing |
| Subtitle | ✅ | "Build your kitchen's knowledge base" |
| Expandable Info | ✅ | About Recipe Manager with type explanations |
| Dynamic Tab Navigation | ✅ | Pulls from `getRecipeTypeGroups()` |
| Search + Filters | ✅ | Debounced search, status, station, sort |
| Pagination | ✅ | 12 items per page |
| Diagnostic Path | ✅ | Shows file path when diagnostics enabled |

---

## Dynamic Tabs Integration ✅

**Wired in this session (Jan 21, 2026)**

| Feature | Status | Notes |
|---------|--------|-------|
| Tabs from Food Relationships | ✅ | `getRecipeTypeGroups()` drives tabs |
| Dynamic icons | ✅ | Uses group's icon via `getLucideIcon()` |
| Color cycling | ✅ | `TAB_COLORS` array for visual variety |
| Legacy type mapping | ✅ | Backward compat for `type="prepared"` etc. |
| Tab sort order | ✅ | Respects `sort_order` from database |
| Empty state | ✅ | Shows message if no recipe types configured |

**Connection:**
- Food Relationships: Toggle `is_recipe_type` on Major Group
- Recipe Manager: Tab appears/disappears dynamically
- Archive group → Tab hidden (recipes preserved)

---

## L5/L6/L7 Feature Matrix

### Tab Ordering

| Level | Feature | Status |
|-------|---------|--------|
| **L5** | Tabs respect `sort_order` from database | ✅ Done |
| **L6** | Drag-and-drop tab reordering in Recipe Manager | 🔲 Planned |
| **L6** | Drag-and-drop in Food Relationships persists to tabs | 🔲 Planned |
| **L7** | User preference to hide/show specific tabs | 🔲 Future |

**Current workaround:** Adjust `sort_order` via SQL or direct DB edit.

```sql
-- Example: Set logical workflow progression
UPDATE food_category_groups SET sort_order = 0 WHERE name = 'MIS EN PLACE';
UPDATE food_category_groups SET sort_order = 1 WHERE name = 'FINAL GOODS';
UPDATE food_category_groups SET sort_order = 2 WHERE name = 'RECEIVING';
UPDATE food_category_groups SET sort_order = 3 WHERE name = 'RETAIL';
```

---

### Recipe Filtering

| Level | Feature | Status |
|-------|---------|--------|
| **L5** | Filter by `major_group` ID (modern) | ✅ Done |
| **L5** | Fallback to `type` field (legacy) | ✅ Done |
| **L5** | Search across name, description, station | ✅ Done |
| **L5** | Status filter (draft/review/approved/archived) | ✅ Done |
| **L5** | Station filter | ✅ Done |
| **L6** | Filter persistence across tab switches | 🔲 Planned |
| **L6** | Save filter presets | 🔲 Future |

---

### Recipe Cards

| Level | Feature | Status |
|-------|---------|--------|
| **L5** | RecipeCard component | ✅ Exists |
| **L5** | Click to edit | ✅ Done |
| **L6** | Quick actions (duplicate, archive) on hover | 🔲 Planned |
| **L6** | Batch selection for bulk operations | 🔲 Future |
| **L7** | Card view vs. list view toggle | 🔲 Future |

---

### Recipe Editor Modal

| Level | Feature | Status |
|-------|---------|--------|
| **L5** | Full recipe editing | ✅ Exists |
| **L5** | Sets `major_group` on new recipes | ✅ Done |
| **L5** | Sets legacy `type` for backward compat | ✅ Done |
| **L6** | Ingredient linking to Master Ingredients | 🔲 See HANDOFF-Recipe-Relational-Foundation.md |
| **L6** | Cost auto-calculation from linked ingredients | 🔲 Planned |
| **L7** | Version history with diff view | 🔲 Future |

---

## Related Components

### Food Relationships Manager

**File:** `src/features/admin/components/sections/FoodRelationshipsManager/index.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Recipe Type toggle | ✅ | Enables/disables tab in Recipe Manager |
| 8-cap validation | ✅ | Max 8 recipe types |
| System group protection | ✅ | Can't disable system recipe types |
| Sort order via drag | 🔲 | GripVertical icons exist, not wired |

---

### Food Relationships Store

**File:** `src/stores/foodRelationshipsStore.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| `getRecipeTypeGroups()` | ✅ | Returns filtered, sorted groups |
| `sort_order` included | ✅ | Fixed this session |
| `updateSortOrder()` | ✅ | Method exists, needs UI wiring |

---

## Recommended Action Plan

### Priority 1: Current Sprint ✅

1. ~~Wire dynamic tabs to `getRecipeTypeGroups()`~~ Done
2. ~~Fix `sort_order` in store~~ Done
3. ~~Legacy type mapping for backward compat~~ Done

### Priority 2: L6 Polish (Future Sprint)

1. **Drag-and-drop tab ordering** in Food Relationships
   - Wire GripVertical handles to `updateSortOrder()`
   - Changes persist to Recipe Manager tabs automatically

2. **Filter persistence** for Recipe Manager
   - Create `recipeNavigationStore.ts`
   - Persist search, status, station filters across tab switches

3. **Recipe Relational Foundation**
   - Migrate JSONB ingredients to relational table
   - See: `docs/handoffs/HANDOFF-Recipe-Relational-Foundation.md`

### Priority 3: L7 Future

1. **User tab preferences** - Hide tabs you don't use
2. **Card vs. List view** toggle
3. **Recipe version history** with visual diff

---

## File Reference

```
src/features/recipes/
├── components/
│   ├── RecipeManager/
│   │   └── RecipeManager.tsx    # Main container
│   ├── RecipeCard.tsx           # Grid card display
│   ├── RecipeEditor/            # Modal editor
│   └── RecipeImportModal/       # Import flow
├── stores/
│   └── recipeStore.ts           # Recipe CRUD
└── types/
    └── recipe.ts                # Type definitions

src/stores/
└── foodRelationshipsStore.ts    # getRecipeTypeGroups()

src/features/admin/components/sections/
└── FoodRelationshipsManager/    # Recipe Type toggle lives here
```

---

## Session Notes

**Jan 21, 2026:**
- Wired Recipe Manager tabs to Food Relationships
- Added legacy type mapping for backward compatibility
- Fixed `sort_order` inclusion in store
- Tab order respects database `sort_order`
- Discussed L6 drag-and-drop for tab reordering

---

*Review by: Claude*  
*Next Review: After L6 drag-and-drop implementation*
