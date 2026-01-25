# HANDOFF: Recipe Viewer L5/L6 Overhaul - Session 1

> **Date**: January 24, 2026
> **Focus**: RecipeViewer FullPageViewer.tsx - L5 design system, L6 user comfort, Ingredients tab
> **Route**: `/kitchen/recipes/:id`
> **Primary User**: Line cooks on iPad portrait during prep/service

---

## Session Summary

This session focused on bringing the Recipe Viewer into L5 design compliance and L6 user comfort standards. The Recipe Viewer is the tablet-based display cooks use during prep and service - it needs to be readable at a glance with greasy hands on a busy line.

### Key Accomplishments

1. **Tab System Aligned to L5 Color Progression**
2. **Ingredients Tab Rebuilt for Line Cooks**
3. **Configurable Sourcing Instructions (Org-level)**
4. **HeroHeader + Overview Tab Polished** (from prior compactions)

---

## Files Modified

### Core Components
| File | Changes |
|------|---------|
| `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx` | Tab color progression, `.tab` CSS class usage |
| `src/features/recipes/components/RecipeViewer/components/Overview.tsx` | Dashboard card grid, L5 CSS classes |
| `src/features/recipes/components/RecipeViewer/components/Ingredients.tsx` | Complete rebuild - mise en place UX |

### Configuration
| File | Changes |
|------|---------|
| `src/features/recipes/hooks/useRecipeConfig.ts` | Added `sourcingInstructions` config object |
| `src/features/admin/components/sections/RecipeSettings/index.tsx` | Sourcing Instructions UI section |

---

## Tab Color Progression (L5 Standard)

The tabs now follow the L5 color progression from `index.css`:

| Position | Tab | Color |
|----------|-----|-------|
| 1st | Overview | primary (blue) |
| 2nd | Ingredients | green |
| 3rd | Method | amber |
| 4th | Production | rose |
| 5th | Storage | purple |
| 6th | Quality | lime |
| 7th | Allergens | red |
| 8th | Equipment | cyan |
| 9th | Training | primary (cycle) |
| 10th | Media | green |

**Implementation**: Uses `.tab ${color} ${isActive ? 'active' : ''}` class pattern from index.css.

---

## Ingredients Tab - L6 User Comfort

### What Line Cooks Actually Need
- **Common measure** ("2 cups") not R/U jargon
- **Tap-to-check** mise en place verification
- **Batch scaling** (½×, 1×, 2×, 3×, 4×)
- **Allergen badges** per ingredient
- **Large touch targets** (44px+ for greasy hands)

### What We Removed (Admin Data)
- Cost columns
- R/U Type / # R/U
- Complex 7-column grid

### Visual Layout
```
┌─────────────────────────────────────────────────────────────┐
│ SUBHEADER: Ingredient Sourcing                   [8 items]  │
│   ⓘ Source First, Then Start                          ▼    │
├─────────────────────────────────────────────────────────────┤
│ TOOLBAR: [⚖️ 1× Batch ▼]           Mise en Place 3/8 ████░ │
├─────────────────────────────────────────────────────────────┤
│ ☑  2 cups      All-Purpose Flour                            │
├─────────────────────────────────────────────────────────────┤
│ ☐  250 ml      Whole Milk                          🥛       │
│                room temperature                              │
├─────────────────────────────────────────────────────────────┤
│ ☐  4 each      Eggs                                🥚       │
└─────────────────────────────────────────────────────────────┘
```

### Color Treatment (Muted Emerald)
- Icon accent: `emerald-400`
- Checked card bg: `emerald-500/10`
- Checked card border: `emerald-500/30`
- Progress bar: `emerald-500/70`
- Checkbox fill: `emerald-500/80`

---

## Configurable Sourcing Instructions

### Why This Matters
Different kitchens have different cultures. Memphis Fire's supportive "people over profit" tone shouldn't be forced on a high-volume corporate kitchen that needs brevity.

### Configuration Structure
```typescript
// In useRecipeConfig.ts
sourcingInstructions: {
  enabled: boolean,     // Show/hide entire section
  title: string,        // "Source First, Then Start"
  body: string,         // Multi-paragraph instructions
  footer: string,       // "Check with your lead if unsure"
}
```

### Admin UI Location
`/admin/modules/recipes#sourcing` → Recipe Manager Settings → General tab

### Default Text (Memphis Fire Tone)
```
Title: "Source First, Then Start"

Body: "Gather and verify all ingredients before you begin any prep work. 
A complete mise en place prevents waste, saves time, and lets you focus 
on the craft of cooking.

If something is missing or looks off, flag it now — not halfway through 
the recipe."

Footer: "Your kitchen may have specific sourcing procedures."
```

---

## Data Field Usage

### Ingredient Display Priority
| Field | Fallback | Notes |
|-------|----------|-------|
| Quantity | `common_measure` → `commonMeasure` → `quantity + unit` | Common measure is human-friendly |
| Name | `ingredient_name` → `masterInfo.product` → `name` | Joined field preferred |
| Allergens | `ingredient.allergens` → `masterInfo.allergens` | Joined field preferred |
| Notes | `ingredient.notes` | Prep instructions, temp requirements |

### Scaling Logic
```typescript
// Parses "2 cups" → multiplies → "4 cups"
scaleCommonMeasure("2 cups", scale=2) // Returns "4 cups"
scaleCommonMeasure("1.5 kg", scale=2) // Returns "3 kg"
```

---

## Outstanding Items (Next Session)

### Ingredients Tab Enhancements
- [ ] Storage location per ingredient ("Walk-in, shelf 2")
- [ ] Prep state indicators ("room temp", "thawed")
- [ ] Lead time alerts ("pull butter 1hr before")
- [ ] Substitution notes (when 86'd)
- [ ] Quality indicators ("ripe avocado")
- [ ] CCP/safety flags (raw protein handling)

### Other Tabs Needing L5 Treatment
- [ ] Method tab - step-by-step with timers
- [ ] Production tab - batch workflows
- [ ] Storage tab - location and shelf life
- [ ] Quality tab - standards and photos
- [ ] Allergens tab - safety display
- [ ] Equipment tab - required tools
- [ ] Training tab - skill requirements
- [ ] Media tab - photos and videos

### Tab Content Subheaders
Each tab should get its own subheader with:
- Tab identity color (from progression)
- Relevant count/stat pills
- Expandable info section (configurable per org)

---

## Technical Notes

### CSS Classes Used
- `.tab` - Horizontal tab pills with color variants
- `.card` - Dashboard card container
- `.icon-badge-{color}` - Colored icon boxes
- `.subheader` - Tab content header
- `.subheader-icon-box.{color}` - Tab identity color
- `.expandable-info-section` - Collapsible content

### Touch Target Compliance
All interactive elements maintain 44px minimum for iPad use with greasy/floury hands.

### Print Considerations
Recipe Viewer has `print:hidden` on nav elements - print stylesheet pending.

---

## Session Transcript

Full conversation available at:
```
/mnt/transcripts/2026-01-25-01-07-20-recipe-overview-tab-l5-refactor.txt
```

---

## Related Documentation

- `docs/L5-BUILD-STRATEGY.md` - Design system philosophy
- `docs/L5-SUBHEADER-PATTERN.md` - Subheader structure
- `docs/roadmaps/ROADMAP-Kitchen.md` - Recipe Manager roadmap
- `src/index.css` - CSS component library

---

*Handoff by: Claude*
*Ready for: Ingredients tab continuation, other tab L5 treatment*
