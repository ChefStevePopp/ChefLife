# Session Starter: Recipe Editor Ingredients - Continue

## Quick Context
We just completed the IngredientsInput L5/L6 rebuild with three-mode architecture (Table/Tablet/Guided) and the Sandbox ingredients concept.

## Files to Know
```
src/features/recipes/components/RecipeEditor/IngredientsInput/
├── index.tsx              # Mode switcher, state management
├── types.ts               # Types including sandbox fields
├── IngredientSearch.tsx   # Direction-aware dropdown search
├── SandboxFields.tsx      # Sandbox ingredient entry
├── IngredientCard.tsx     # Shared card (Tablet/Guided)
├── TableView.tsx          # Desktop responsive table
└── TabletMode.tsx         # Full-screen overlay
```

## What's Working
- ✅ Table View with responsive flex columns
- ✅ Tablet Mode for speed entry
- ✅ Guided Mode with educational tips
- ✅ Sandbox toggle (amber styling)
- ✅ Verified badge (emerald when linked to MIL)
- ✅ Touch-friendly mode switcher badges
- ✅ Allergen cascade on ingredient changes

## Immediate Next Steps

### Option A: Test & Polish
1. Test all three modes in browser
2. Verify sandbox styling consistency
3. Check responsive breakpoints
4. Test drag-to-reorder in Table view

### Option B: Production Tab
Move to next Recipe Editor tab:
- Yield Amount/Unit (single source of truth)
- Batch scaling
- Production instructions

### Option C: VIM Integration
Design the sandbox resolution flow:
- VIM detects matching invoice line
- User matches to sandbox ingredient
- Sandbox converts to verified MIL item

### Option D: Kitchen Notes Widget
Quick-capture for inspiration at the pass:
- Voice-to-text for hands-free
- Auto-creates sandbox ingredient
- Links to recipe draft

## Key Handoff Doc
`docs/HANDOFF-2026-01-31-IngredientsInput-L5-L6-Rebuild.md`

## Philosophy Reminder
> "Two mindsets, one codebase: Tablet = 'I know what I'm doing', Guided = 'Help me understand'"
