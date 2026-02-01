# Session Prompt: Recipe Editor Ingredients - Continue

## Context
We just completed a major rebuild of the Recipe Editor's Ingredients Input component. Three-mode architecture is working: Table (desktop), Tablet (speed), and Guided (educational). The key innovation is **Sandbox Ingredients** - temporary placeholders for items not yet in the Master Ingredient List, styled amber, verified later via invoice import.

## Working Directory
```
C:\dev\cheflife
```

## Key Files
```
src/features/recipes/components/RecipeEditor/IngredientsInput/
├── index.tsx              # Mode switcher, wires Tablet/Guided buttons
├── types.ts               # Sandbox fields on RecipeIngredient
├── TableView.tsx          # Responsive flex table (desktop)
├── TabletMode.tsx         # Full-screen overlay, accepts showEducation prop
├── IngredientCard.tsx     # Shared card with educational tips
├── IngredientSearch.tsx   # Direction-aware dropdown
└── SandboxFields.tsx      # Vendor/code/description entry
```

## What's Working
- ✅ Table View with responsive flex columns (text grows, numbers fixed)
- ✅ Tablet Mode for speed entry (showEducation=false)
- ✅ Guided Mode with tips (showEducation=true, same component)
- ✅ Sandbox toggle with amber styling
- ✅ Verified badge (emerald) when linked to MIL
- ✅ Touch-friendly mode switcher badges
- ✅ Allergen cascade on ingredient changes

## Handoff Doc
`docs/HANDOFF-2026-01-31-IngredientsInput-L5-L6-Rebuild.md` has full details.

## Next Steps (Pick One)

### A. Test & Polish
Fire up the app, test all three modes, verify sandbox styling, check responsive breakpoints, test drag-to-reorder.

### B. Production Tab
Move to next Recipe Editor tab - yield amount/unit, batch scaling, production instructions.

### C. VIM Integration
Design the sandbox resolution flow - when an invoice arrives with a matching item, user can verify sandbox ingredient against MIL.

### D. Kitchen Notes Widget
Quick-capture for inspiration at the pass - voice-to-text, auto-creates sandbox ingredient, links to recipe draft.

## Philosophy
> "Two mindsets, one codebase: Tablet = 'I know what I'm doing', Guided = 'Help me understand'"

No separate components for training mode - just `showEducation={true}` on the same UI. KISS.

## To Get Started
```bash
cd C:\dev\cheflife
npm run dev
```
Navigate to any recipe in edit mode, check the Ingredients tab.
