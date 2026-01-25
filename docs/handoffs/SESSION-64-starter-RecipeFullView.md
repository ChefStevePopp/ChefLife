# Session 64 Starter: Recipe Full View L5 Overhaul

## Context

You're continuing ChefLife development with Steve, chef/owner of Memphis Fire BBQ and creator of ChefLife restaurant management system. This session focuses on the **Recipe Full View** - the FOH (front-of-house) display that line cooks see when they tap into a recipe from the Recipe Library.

## What We Just Did (Session 63)

Revamped `RecipeViewer.tsx` (the recipe library/grid) with:
- L5 header pattern with multi-select filter pills
- Discover/Recently Viewed carousel in expandable info section
- Premium morph animation (blur + fade with asymmetric timing)
- 1920px as "real desktop" breakpoint
- View history tracking in localStorage

**The Recipe Library now looks great. Now we need the individual recipe view to match.**

## Current State: FullPageViewer

**Location:** `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx`
**Route:** `/kitchen/recipes/:id`
**Purpose:** FOH recipe display for line cooks, prep team

### Current Architecture
```
FullPageViewer.tsx
├── ViewerHeader.tsx      (sticky header with recipe name, print)
├── ViewerSidebar.tsx     (vertical tab navigation)
└── Tab Components:
    ├── Overview.tsx
    ├── Ingredients.tsx
    ├── Method.tsx
    ├── Production.tsx
    ├── Storage.tsx
    ├── Quality.tsx
    ├── Equipment.tsx
    ├── Allergens.tsx
    ├── Training.tsx
    └── Media.tsx
```

## The Challenge

The current FullPageViewer is **functional but dated**:
- Generic styling, doesn't match L5 design system
- Sidebar navigation feels desktop-centric
- Not optimized for tablet (primary FOH device)
- Print stylesheet likely needs work
- No premium animations

## Design Goals

### 1. FOH-First Design
- **Tablet portrait is primary** (iPad on recipe stand)
- Large touch targets (greasy hands, flour-covered fingers)
- High contrast for busy kitchen lighting
- Quick glance information hierarchy

### 2. L5 Visual Hierarchy
- Hero image/media at top
- Recipe name, station badge, timing pills
- Tabbed content below (horizontal on mobile, could be sidebar on desktop)
- Premium morph transitions between tabs

### 3. Information Priority
```
CRITICAL (always visible):
- Recipe name
- Station assignment
- Primary image
- Yield/portions

ONE TAP AWAY:
- Ingredients (with quantities, scaling?)
- Method/Steps
- Allergen warnings

DEEP DIVE:
- Production specs
- Storage protocols
- Quality standards
- Equipment list
- Training materials
```

### 4. Kitchen-Specific Features
- **Scaling calculator?** (batch size adjustment)
- **Timer integration?** (tap step to start timer)
- **Checkoff mode?** (mark steps complete during prep)
- **Print optimization** (clean, waste-conscious printout)

## Technical Considerations

### Responsive Breakpoints
```
Mobile portrait:     Single column, horizontal tabs
Tablet portrait:     Hero + horizontal tabs (PRIMARY TARGET)
Tablet landscape:    Sidebar possible
Desktop (1920px+):   Full sidebar + expanded content
```

### Animation Continuity
Use the premium morph pattern from Session 63:
```css
/* Tab content transitions */
opacity 0.3s ease-out, filter 0.3s ease-out (expand)
opacity 0.2s ease-in, filter 0.2s ease-in (retract)
```

### Print Stylesheet
- Single page per recipe if possible
- No wasted margins
- QR code linking back to digital version?
- Allergen warnings prominent

## Files to Modify

### Primary
- `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx`
- `src/features/recipes/components/RecipeViewer/components/ViewerHeader.tsx`
- `src/features/recipes/components/RecipeViewer/components/ViewerSidebar.tsx`

### Tab Components (all need L5 treatment)
- `Overview.tsx` - Hero, quick stats, description
- `Ingredients.tsx` - List with quantities, possibly scaling
- `Method.tsx` - Steps with timing, possibly checkable
- `Production.tsx` - Yield, batch specs
- `Storage.tsx` - Shelf life, temp requirements
- `Quality.tsx` - Standards, plating specs
- `Equipment.tsx` - Required tools
- `Allergens.tsx` - Warnings, cross-contact
- `Training.tsx` - Videos, tips
- `Media.tsx` - Photo gallery

### CSS
- `src/index.css` - May need new component classes

## Reference Files

- **L5 Design System:** `docs/DESIGN-SYSTEM.md`
- **RecipeViewer (just completed):** `src/features/recipes/components/RecipeViewer/RecipeViewer.tsx`
- **Recipe Type:** `src/features/recipes/types/recipe.ts`
- **Premium animations:** Search `index.css` for "Premium morph"

## Suggested Approach

### Phase 1: Structure
1. Redesign FullPageViewer shell (header, navigation, content area)
2. Implement horizontal tab bar for tablet
3. Add premium morph transitions

### Phase 2: Core Content
4. Overview tab - hero image, quick stats, description
5. Ingredients tab - clean list, consider scaling UI
6. Method tab - steps with visual hierarchy

### Phase 3: Supporting Tabs
7. Storage, Allergens, Equipment
8. Quality, Production
9. Training, Media

### Phase 4: Polish
10. Print stylesheet
11. Loading states, skeletons
12. Empty states
13. Error handling

## Questions to Discuss

1. **Scaling calculator** - Is batch scaling in scope? Complex but valuable.
2. **Step checkoff** - Persist locally? Or too much state management?
3. **Timer integration** - Worth the complexity for v1?
4. **Navigation pattern** - Horizontal tabs vs bottom nav vs sidebar?
5. **Back navigation** - Return to library with scroll position preserved?

## Success Criteria

- [ ] Looks premium on iPad portrait (primary use case)
- [ ] L5 visual hierarchy throughout
- [ ] Premium morph animations on tab switches
- [ ] Print produces clean, usable output
- [ ] Touch targets ≥44px
- [ ] Information hierarchy serves line cooks
- [ ] Consistent with RecipeViewer aesthetic

---

**This is a big one - probably multi-session. Start with the shell and core tabs, polish later.**
