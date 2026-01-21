# Session Starting Prompt: Food Relationships & Recipe Manager Taxonomy

Copy everything below to start the next session:

---

## Context

I'm Steve, owner/chef of Memphis Fire BBQ (15 years, 4.6 stars, 3000+ reviews, Food Network featured) and creator of ChefLife — a restaurant management system built in React/TypeScript/Supabase. Working directory is `C:\dev\cheflife`.

## Last Session Summary

We completed the **Recipe Manager L5 upgrade** and discovered that **Food Relationships is the universal taxonomy** — not just for ingredients, but for recipes too.

### Recipe Manager L5 (Completed ✅)
- L5 header with Primary icon box, expandable info
- Loading skeleton (not spinner text)
- 300ms debounced search
- Status/Station filter dropdowns
- Sort dropdown (Updated, Name, Cost, Prep Time)
- Pagination (12 per page)
- "Showing X of Y" result count

### Food Relationships Architecture (Designed, Ready to Build)

**The discovery:** Major Groups like MIS EN PLACE and FINAL GOODS ARE recipe types. Recipe Manager tabs should pull from Food Relationships dynamically, not be hardcoded.

**The production pipeline:**
```
RECEIVING → MIS EN PLACE → FINAL GOODS
         ↘             ↘→ RETAIL
```

**Database migration needed:**
```sql
ALTER TABLE food_category_groups 
  ADD COLUMN is_system BOOLEAN DEFAULT false,
  ADD COLUMN is_recipe_type BOOLEAN DEFAULT false,
  ADD COLUMN icon VARCHAR(50);
```

**System groups (can't delete, can archive):**
- FOOD, ALCOHOL, MIS EN PLACE, FINAL GOODS, RECEIVING, CONSUMABLES

**Recipe tabs will be dynamic:**
```tsx
const recipeTabs = majorGroups
  .filter(g => g.is_recipe_type && !g.archived)
  .map(g => ({ id: g.id, label: g.name, icon: getIcon(g.icon) }));
```

## This Session's Scope

### Phase 1: Database & Cleanup (15 min)
1. Create migration for new columns
2. Comment out dead code: `sections/OperationsManager/FoodRelationshipsManager.tsx`
3. Apply migration locally

### Phase 2: Food Relationships L5 (45 min)
Refactor `src/features/admin/components/sections/FoodRelationshipsManager/index.tsx`:
- Remove redundant header (parent Operations.tsx handles it)
- Add `<GuidedModeProvider>` wrapper
- Add L5 subheader with `<GuidedModeToggle />`
- Add `<GuidanceTip>` per column (education content)
- Add search bar (filters all three columns)
- Add 🔒 Lock icon for system items
- Map icon column to Lucide components
- Add diagnostic path

### Phase 3: Recipe Manager Wiring (30 min)
- Pull tabs from Food Relationships store
- Filter by `is_recipe_type = true`
- Dynamic icons/colors

## Key Files

| File | Purpose |
|------|---------|
| `sections/FoodRelationshipsManager/index.tsx` | Active component (~850 lines, needs refactor) |
| `sections/OperationsManager/FoodRelationshipsManager.tsx` | DEAD CODE - comment out |
| `sections/Operations/Operations.tsx` | L5 parent (gold standard) |
| `IngredientDetailPage/index.tsx` | Guided Mode gold standard |
| `shared/components/L5/` | GuidedModeProvider, GuidanceTip, etc. |
| `stores/foodRelationshipsStore.ts` | Zustand store |
| `recipes/components/RecipeManager/RecipeManager.tsx` | Just upgraded to L5 |

## Guided Mode Education Content

**Page-level:**
> Your taxonomy is how ChefLife organizes everything. Think of it like folders — Major Groups are big folders, Categories are subfolders, Sub-Categories are the items inside. This powers your inventory reports, recipe costing, and P&L breakdowns.

**Major Groups column:**
> Top-level buckets. System groups (🔒) are locked because ChefLife needs them. You can add custom groups for things unique to your operation.

**Categories column:**
> Break things down further. FOOD → Proteins, Produce, Dairy. These become filter dropdowns throughout ChefLife.

**Sub-Categories column:**
> The finest detail. Proteins → Beef, Pork, Chicken. This is what you see in food cost reports.

## Design Decisions (Locked)

1. **Lucide icons only** — no emoji
2. **System groups can be archived, not deleted**
3. **Recipe tabs driven by Food Relationships** (dynamic)
4. **Guided Mode for education** (toggle persists to localStorage)
5. **Setup wizard will include this as Step 2**

## The 1000-User Test

- **Day 1 (Taco Truck):** Sees defaults, picks categories, never touches again. Zero config.
- **Day 90 (Growing):** Adds "Seafood" sub-category. Self-service.
- **Power User (Multi-Unit):** Adds custom "CATERING" group. Full control.

## Handoff Document

Full details: `docs/handoffs/HANDOFF-SESSION-Food-Relationships-Taxonomy.md`

## Important Patterns

- `<GuidedModeProvider>` wraps page, `<GuidedModeToggle />` in header
- `<GuidanceTip color="green">Content</GuidanceTip>` — only shows when guided mode ON
- System items: Lock icon, can archive but not delete
- Diagnostics: `{showDiagnostics && <div className="text-xs text-gray-500 font-mono">path</div>}`

Ready to build Food Relationships L5!
