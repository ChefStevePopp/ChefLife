# SESSION STARTER: Recipe Viewer Continuation

> **Latest Handoff**: `HANDOFF-2026-01-24-RecipeViewer-IngredientFlipCards.md`
> **Route**: `/kitchen/recipes/:id`
> **Primary Target**: iPad **LANDSCAPE** in folio keyboard

---

## Quick Context

We're building the **Recipe Viewer** - the tablet-based display line cooks use during prep and service. Landscape iPad in a folio keyboard is the primary target. Large touch targets for greasy hands.

### Completed This Session
- ✅ Tab system using L5 color progression
- ✅ **Ingredients tab with FLIP CARD pattern** (NEW!)
- ✅ "Checkmark on flip = forced information absorption" UX
- ✅ Configurable sourcing instructions (org-level)
- ✅ Common measure display (not R/U jargon)
- ✅ Batch scaling (½×, 1×, 2×, 3×, 4×)
- ✅ Vendor images from master_ingredients

---

## The Flip Card Innovation

**Philosophy**: Line cooks can't speedrun through checkboxes. They MUST:
1. See the ingredient (front: vendor image, quantity, allergens)
2. Tap to flip
3. Read Chef's Notes (back: storage, prep state, lead time, safety)
4. THEN check it off (checkbox lives on the BACK)

**Component**: `src/features/recipes/components/IngredientFlipCard/index.tsx`

---

## TODO: Wire Chef's Notes to Real Data

Currently using **mock data** based on ingredient name patterns:

```typescript
// Mock: butter → "Walk-in, Dairy shelf", "Room temp", "Pull 1hr before"
// Mock: chicken → "Walk-in, Meat drawer", "Thawed", safety note
```

**Data Model Options**:
1. `recipe_ingredients.chef_notes` JSONB (recipe-specific)
2. `master_ingredients.default_chef_notes` (global defaults)
3. Both (master defaults, recipe overrides)

---

## Other Tabs Needing L5 Treatment

| Tab | Color | Focus | Status |
|-----|-------|-------|--------|
| Overview | primary | Dashboard cards | ✅ Done |
| Ingredients | green | Flip cards | ✅ Done (data TODO) |
| Method | amber | Step-by-step with timers | ⏳ Pending |
| Production | rose | Batch workflows | ⏳ Pending |
| Storage | purple | Location and shelf life | ⏳ Pending |
| Quality | lime | Standards and photos | ⏳ Pending |
| Allergens | red | Safety display | ⏳ Pending |
| Equipment | cyan | Required tools | ⏳ Pending |
| Training | primary | Skill requirements | ⏳ Pending |
| Media | green | Photos and videos | ⏳ Pending |

---

## Key Files

```
src/features/recipes/components/
├── IngredientFlipCard/
│   └── index.tsx               # NEW! Flip card component
├── RecipeFlipCard/
│   └── index.tsx               # Original flip card (Recipe Library)
└── RecipeViewer/
    ├── FullPageViewer.tsx      # Main shell, tabs
    └── components/
        ├── Overview.tsx        # ✅ Done
        ├── Ingredients.tsx     # ✅ Done (flip card grid)
        ├── Method.tsx          # Needs L5
        ├── Production.tsx      # Needs L5
        ├── Storage.tsx         # Needs L5
        ├── Quality.tsx         # Needs L5
        ├── Allergens.tsx       # Needs L5
        ├── Equipment.tsx       # Needs L5
        ├── Training.tsx        # Needs L5
        └── Media.tsx           # Needs L5
```

---

## Grid Breakpoints

```css
/* Flip card grid for landscape iPad */
grid-cols-2      /* Mobile portrait */
md:grid-cols-3   /* Tablet portrait */
lg:grid-cols-4   /* Tablet landscape (primary) */
xl:grid-cols-5   /* Desktop */
```

---

## Start Command

```bash
cd C:\dev\cheflife
npm run dev
```

Navigate to: `http://localhost:5173/kitchen/recipes/[any-recipe-id]`

---

*Ready to continue: Chef's Notes data model OR other tab L5 treatment*
