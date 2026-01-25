# HANDOFF: Recipe Viewer L5/L6 Overhaul - Session 2

> **Date**: January 24, 2026 (Session 2)
> **Focus**: Ingredients Tab - Flip Card Pattern (Mise en Place UX)
> **Route**: `/kitchen/recipes/:id`
> **Primary User**: Line cooks on iPad **LANDSCAPE** in folio keyboard

---

## Session Summary

Major UX breakthrough: **"Checkmark on flip = forced information absorption."**

We replaced the card-based list with a **flip card grid** pattern, borrowing from the RecipeFlipCard component used in the Recipe Library. This transforms mise en place from a mindless checklist into a **verification ritual**.

### The Philosophy

Line cooks can't speedrun through checkboxes. They MUST:
1. **See the ingredient** (front: vendor image, quantity, name, allergens)
2. **Tap to flip**
3. **Read Chef's Notes** (back: storage location, prep state, lead time, safety)
4. **THEN check it off**

The checkbox lives on the BACK of the card. You have to flip to check.

---

## Files Created/Modified

### New Component
| File | Purpose |
|------|---------|
| `src/features/recipes/components/IngredientFlipCard/index.tsx` | 3D flip card for ingredients |

### Modified
| File | Changes |
|------|---------|
| `src/features/recipes/components/RecipeViewer/components/Ingredients.tsx` | Replaced list with flip card grid |

---

## IngredientFlipCard Component

### Visual Layout

**FRONT FACE:**
```
┌────────────────────────────┐
│ [Tap for details]  🥜 🥛   │  ← Allergen badges top-right
│                            │
│     [Vendor Image]         │  ← Product photo from master_ingredients
│                            │
│     or Package icon        │
│                            │
├────────────────────────────┤
│ 2 cups                     │  ← Quantity (hero, scaled)
│ All-Purpose Flour          │  ← Ingredient name
│ room temperature           │  ← Notes (if any)
└────────────────────────────┘
```

**BACK FACE:**
```
┌────────────────────────────┐
│ All-Purpose Flour          │
│ 2 cups                     │  ← Quantity repeated
├────────────────────────────┤
│ ⓘ CHEF'S NOTES             │
│                            │
│ 📍 Location                │
│    Walk-in, Dairy shelf    │
│                            │
│ 🌡️ Prep State              │
│    Room temperature        │
│                            │
│ ⏱️ Lead Time               │
│    Pull 1 hour before      │
│                            │
│ ⚠️ Safety                   │
│    Check expiry date       │
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ ☐ I have this ready  │   │  ← THE CHECKBOX (big, 56px)
│ └──────────────────────┘   │
└────────────────────────────┘
```

### Aspect Ratio

- **3:4** (portrait cards in landscape grid)
- Not 9:16 like RecipeFlipCard (these aren't hero images)

### Grid Layout

```
// Tailwind responsive grid
grid-cols-2      // Mobile portrait
md:grid-cols-3   // Tablet portrait  
lg:grid-cols-4   // Tablet landscape (primary target)
xl:grid-cols-5   // Desktop
```

---

## Chef's Notes - TODO: Wire to Real Data

Currently using **static mock data** based on ingredient name patterns:

```typescript
const getMockChefNotes = (ingredientName: string): ChefNotes => {
  if (name.includes("butter")) {
    return {
      storageLocation: "Walk-in, Dairy shelf",
      prepState: "Room temperature",
      leadTime: "Pull 1 hour before prep",
    };
  }
  // ... etc
};
```

### Future Data Model

**Option A**: Add to `recipe_ingredients` table
```sql
ALTER TABLE recipe_ingredients ADD COLUMN chef_notes JSONB DEFAULT '{}'::jsonb;
-- Structure: { storageLocation, prepState, leadTime, safetyNote }
```

**Option B**: Add to `master_ingredients` table (global defaults)
```sql
-- Already has storage_area, could add:
ALTER TABLE master_ingredients 
  ADD COLUMN default_prep_state TEXT,
  ADD COLUMN default_lead_time TEXT,
  ADD COLUMN safety_notes TEXT;
```

**Recommendation**: Both - master_ingredients for defaults, recipe_ingredients for overrides.

---

## Flip Animation Details

```css
/* Premium flip - 500ms ease-out cubic */
transform: rotateY(180deg);
transition: transform 500ms cubic-bezier(0.33, 1, 0.68, 1);
```

### Check Behavior
1. Tap card → flips to back
2. Tap checkbox → checks item, waits 300ms, auto-flips to front
3. Front shows completed state (emerald border, checkmark overlay)

---

## Vendor Images

Images come from `master_ingredients.image_url` field.

If no image: Gradient placeholder with Package icon.

---

## Toolbar Additions

- **Reset button** - Clears all checks (appears when any items checked)
- **Progress bar** - Fills green, turns solid emerald-500 at 100%
- **Completion message** - "Mise en place complete! Ready to cook."

---

## Outstanding Items

### Chef's Notes Data (TODO)
- [ ] Create migration for recipe_ingredients.chef_notes JSONB
- [ ] Add default fields to master_ingredients
- [ ] Build admin UI for editing Chef's Notes per ingredient
- [ ] Recipe-level override vs master-level defaults

### Other Tabs Needing L5 Treatment
- [ ] Method tab - step-by-step with timers
- [ ] Production tab - batch workflows  
- [ ] Storage tab - location and shelf life
- [ ] Quality tab - standards and photos
- [ ] Allergens tab - safety display
- [ ] Equipment tab - required tools
- [ ] Training tab - skill requirements
- [ ] Media tab - photos and videos

---

## Technical Notes

### Props Interface

```typescript
interface IngredientFlipCardProps {
  ingredient: {
    id: string;
    ingredient_name?: string;
    name?: string;
    quantity: number;
    unit: string;
    common_measure?: string;
    notes?: string;
    allergens?: string[];
    master_ingredient_id?: string;
  };
  masterInfo?: MasterIngredient | null;
  scaledMeasure: string | null;
  isChecked: boolean;
  onToggleCheck: () => void;
  chefNotes?: ChefNotes;  // TODO: Wire to real data
}
```

### ChefNotes Interface

```typescript
interface ChefNotes {
  storageLocation?: string;  // "Walk-in, shelf 2"
  prepState?: string;        // "Room temp", "Thawed", "Diced"
  leadTime?: string;         // "Pull 1hr before service"
  safetyNote?: string;       // "Check for mold", "Smell before use"
}
```

---

## Related Documentation

- `docs/L5-BUILD-STRATEGY.md` - Design system philosophy
- `src/features/recipes/components/RecipeFlipCard/index.tsx` - Original flip card pattern
- `src/index.css` - CSS animations and transitions

---

*Handoff by: Claude*
*Ready for: Chef's Notes data model, other tab L5 treatment*
