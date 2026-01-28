# Session Starter: Recipe Viewer L5 Completion

## Quick Context

Continuing Recipe Viewer L5 build. **2 of 10 tabs complete**, 8 remaining.

## Start Here

1. Read handoff: `docs/handoffs/HANDOFF-Recipe-Viewer-L5.md`
2. Open Recipe Viewer: `/kitchen/recipes/{any-recipe-id}`
3. Check current tab implementations

## Tabs Complete ✅
- Overview (ViewerCard pattern)
- Ingredients (Letterbox flip cards)

## Tabs Remaining
- Method (text-focused, narrow container)
- Production, Storage, Quality, Allergens, Equipment (dashboard cards)
- Training (text + media)
- Media (visual grid, wide container)

## Key Files
- `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx`
- `src/features/recipes/components/RecipeViewer/components/*.tsx`
- `docs/L5-BUILD-STRATEGY.md` (L5 Viewer Screen Standard section)

## Design Decisions Already Made
- Tabs own color, cards stay neutral (gray icons)
- Content-type drives container width
- iPad landscape is PRIMARY target
- ViewerCard pattern for dashboard tabs
