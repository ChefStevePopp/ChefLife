# Recipe Viewer L5 Completion - Session Prompt

## Context

We're building out the Recipe Viewer - the user-facing screen where kitchen staff view recipe details on iPads and desktops. This is the **gold standard template** for all ChefLife viewer screens (as opposed to admin/CRUD screens).

Two tabs are complete (Overview, Ingredients). Eight remain. The design system and patterns are established - this session is about applying them consistently.

## What's Already Done

**L5 Viewer Screen Standard** - Fully documented in `L5-BUILD-STRATEGY.md`. Key points:
- iPad landscape in folio is the PRIMARY target device
- One responsive codebase scales from tablet to 4K - no separate mobile version
- Container widths adapt to content type, not arbitrary breakpoints

**Responsive Container Strategy** - Implemented in `FullPageViewer.tsx`:
- Visual grids (ingredients, media): `max-w-[1600px]`
- Dashboard cards (overview, most tabs): `max-w-7xl` 
- Text-focused (method): `max-w-4xl`

**ViewerCard Pattern** - Created for dashboard-style tabs:
- Gray icon boxes - tabs own the color, cards stay neutral
- Darker header stripe creates visual hierarchy
- Simple, professional, no visual competition with the colored tab bar above

**Overview Tab** - Complete. Six ViewerCard components in a responsive grid.

**Ingredients Tab** - Complete. Letterbox flip cards with allergen icons, vendor images, L5 back face.

## What Needs To Be Built

Eight tabs, in suggested order:

1. **Method** (amber) - Step-by-step instructions. Use narrow `max-w-4xl` container. Numbered steps with subtle amber accent on step numbers. This is text-focused content - prioritize readability.

2. **Production** (rose) - Batch sizing, scaling info, timing. Dashboard cards showing batch yield, scale factors, production schedule considerations.

3. **Storage** (purple) - Shelf life, temperature requirements, container specs. Dashboard cards for storage conditions, dating requirements, FIFO notes.

4. **Quality** (lime) - QC checkpoints and standards. Dashboard cards for quality checks, plating standards, temperature requirements at service.

5. **Allergens** (red) - Full allergen detail. More comprehensive than the Overview card - show contains, may contain, cross-contact with full explanations and handling procedures.

6. **Equipment** (cyan) - Complete equipment list with specifications. More detail than Overview - include sizes, model numbers, alternatives.

7. **Training** (primary) - Training videos, documents, required certifications. Mix of embedded media and lists.

8. **Media** (green) - Photo and video gallery. Use wide `max-w-[1600px]` container. Grid of media items with lightbox on click.

## Design Principles To Follow

- **Tabs own color, cards stay neutral** - Use the ViewerCard pattern with gray icons
- **Touch targets 44px minimum** - Kitchen staff have greasy hands
- **Premium morph transitions** - Already implemented between tabs
- **Content drives container width** - Method is narrow, Media is wide, most are medium

## Files To Work With

- `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx` - Main orchestrator
- `src/features/recipes/components/RecipeViewer/components/` - Individual tab components
- `src/features/recipes/components/RecipeViewer/components/Overview.tsx` - Reference for ViewerCard pattern

## Reference Documentation

- `docs/handoffs/HANDOFF-Recipe-Viewer-L5.md` - Detailed handoff with code examples
- `docs/L5-BUILD-STRATEGY.md` - L5 Viewer Screen Standard section
- `docs/SESSION-STARTER-RecipeViewer-L5.md` - Quick reference

## How To Start

1. Open the Recipe Viewer in browser: `/kitchen/recipes/` then click any recipe
2. Click through each tab to see current state
3. Start with **Method** tab - it's the most impactful and has a clear pattern (numbered steps)
4. Test responsive behavior by resizing browser (particularly around 1024px for iPad landscape)

## Success Looks Like

- All 10 tabs render meaningful content with consistent styling
- Gray ViewerCard headers throughout (no rainbow icons competing with tabs)
- Responsive layouts work from iPad landscape through 4K
- Touch targets are appropriately sized
- The whole thing feels calm, professional, and easy to scan in a busy kitchen

Steve will likely have feedback as you go - he's hands-on and knows exactly what works in a real kitchen environment. The philosophy is "tabs own color, cards stay neutral" - when in doubt, keep it gray and let the content speak.
