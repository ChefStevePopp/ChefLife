# ChefLife Session Starter
> **Paste this first message every session.** ~100 lines of critical context.

---

## What ChefLife Is
Restaurant management system. React/TypeScript/Supabase. Desktop admin + mobile command center.
**The body metaphor:** Recipes = Heart of the House, Data = COGS Engine, Teams = Skin, Comms = Voice, NEXUS = Circulatory, Operations = Skeleton.

**Core Mantra:** *"An accounting app masquerading as restaurant software."*
- Every dollar in, every dollar out, every transformation tracked
- Correct by default — triggers, not manual refresh
- Zero support tickets at 1000 restaurants

---

## Current State (Jan 2026)
| Area | Status | Notes |
|------|--------|-------|
| **VIM (Vendor Invoice Manager)** | 80% | Import, Triage, History, Umbrellas, Analytics tabs working |
| **Master Ingredient List** | 90% | ExcelDataGrid, L6 navigation, route-based editing |
| **Price History** | ✅ Modularized | 12 files, reusable components |
| **Food Relationships** | ✅ L5 Complete | Three-column taxonomy manager with Guided Mode |
| **Recipe Manager** | 65% | Dynamic tabs, change tracking built, needs L5 polish |
| **Team Performance** | 70% | 7-tab interface, attendance tracking |
| **Mobile Shell** | 30% | People/Place/Profit concept designed |

---

## Critical Patterns (Don't Break These)

### L5 Design Language
- **Cards:** `bg-gray-800/50 border border-gray-700/50 rounded-2xl`
- **Icon badges:** `w-7 h-7 rounded-lg bg-{color}-500/20` → icon `w-5 h-5 text-{color}-400/80`
- **Floating action bar:** `.floating-action-bar` + `.warning`/`.danger`/`.success` variants
- **Tabs:** Color progression: primary → green → amber → rose → purple → lime → red → cyan
- **Subheader pills:** `.subheader-pill` + `.highlight` for suggestions
- **Admin container:** `.admin-container` for responsive admin layouts

### L6 Philosophy
> "L5 respects the user's craft. L6 respects their time."
- Filter-aware navigation (don't lose context)
- Pending state + floating action bar for strategic decisions
- Smart defaults that anticipate needs
- Tab-level change tracking (show exactly where unsaved changes are)

### Data Architecture
- **Triangle Model:** Purchase unit → Inventory unit → Recipe unit
- **Cascade System:** Price change → triggers downstream recipe cost updates
- **RLS Pattern:** Always use `organization_roles` (not `organization_team_members`)

---

## Key File Locations

### Feature Modules
```
src/features/admin/components/sections/
├── VendorInvoice/          # VIM - the COGS engine
│   ├── VendorInvoiceManager.tsx
│   └── components/
│       ├── PriceHistory/   # Modularized chart modal
│       ├── UmbrellaIngredientManager.tsx
│       └── ItemCodeGroupManager.tsx
├── FoodRelationshipsManager/  # Taxonomy (DNA)
│   └── index.tsx              # Three-column L5 with Guided Mode
├── recipe/
│   └── MasterIngredientList/
│       └── IngredientDetailPage/  # Route-based editing
├── Operations/             # Skeleton config
└── Communications/         # Voice module

src/features/recipes/components/
├── RecipeManager/          # List view
├── RecipeDetailPage/       # 11-tab editor (Heart of the House)
│   ├── index.tsx           # Main orchestrator
│   ├── PageHeader.tsx      # Title, status, actions
│   ├── RecipeTabs.tsx      # Tab navigation with change indicators
│   └── useTabChanges.ts    # Tracks which tabs have unsaved changes
└── RecipeEditor/           # Tab content components (all have diagnostics)
    ├── BasicInformation/   # Recipe info, ingredients, costing
    ├── InstructionEditor   # Steps and stages
    ├── ProductionSpecs     # Timing, yield, temps
    ├── LabelRequirements   # Labeling config
    ├── StorageProtocols    # Storage, shelf life
    ├── StationEquipment    # Equipment lists
    ├── QualityStandards    # Visual/texture/taste standards
    ├── AllergenControl     # Allergen management
    ├── MediaManager        # Photos and videos
    ├── TrainingModule      # Training requirements
    └── VersionHistory      # Versioning and status
```

### Shared Components
```
src/shared/components/
├── ExcelDataGrid/          # L5 data grid (search, filter, sort, export)
├── TwoStageButton.tsx      # Non-modal confirmations
├── ConfirmDialog.tsx       # Modal confirmations
├── ImageWithFallback.tsx   # Graceful image loading
└── AnimatedNumber.tsx      # Premium morph animations
```

### Core Files
```
src/index.css               # CSS component library (tabs, pills, action bars, admin-container)
src/stores/                  # Zustand stores
docs/L5-BUILD-STRATEGY.md   # Full design system reference
docs/CHEFLIFE-ANATOMY.md    # Architecture & flows
docs/ADMIN-LAYOUT-STRATEGY.md  # Responsive admin layout patterns
```

---

## Diagnostic Paths
Enable in browser console: `localStorage.setItem('showDiagnostics', 'true'); location.reload();`
Every visual component shows its file path when enabled. All Recipe Editor tabs now have diagnostics.

---

## Current Work Queue

### 🎯 NEXT SESSION: Recipe Manager L5 Polish
**Context:** Recipe Manager is the "Heart of the House" - extremely high-touch section in the beginning of the user journey. This needs to be a SHOWSTOPPER.

**What's Already Built:**
- ✅ Dynamic Recipe Type dropdown from Food Relationships
- ✅ Tab-level change tracking with amber visual indicators
- ✅ `useTabChanges` hook for granular unsaved change detection
- ✅ Floating action bar shows exactly which tabs have changes
- ✅ Responsive container (`.admin-container`) applied
- ✅ All 11 tab components have diagnostic paths

**L5 Polish Priorities:**
1. **Visual Language Audit** - Apply L5 card/icon badge patterns consistently
2. **Tab Content Review** - Each of the 11 tabs needs L5 treatment
3. **Empty States** - Guided mode / helpful prompts when sections are empty
4. **Form Patterns** - Consistent input styling, validation feedback
5. **Section Headers** - Icon badges, color progression, descriptions
6. **Action Patterns** - Save behavior, discard confirmation, keyboard shortcuts

**Questions to Answer:**
- What makes a recipe editor "premium" vs "basic"?
- How do we guide new users through a complex 11-tab interface?
- What information is critical vs nice-to-have per tab?
- Should tabs be collapsible or always visible?

---

## Session Protocol
1. **Tell me what we're working on** - module, feature, or bug
2. **I'll check relevant files** - using the locations above
3. **Show me the exact component** - use diagnostic paths if needed
4. **We build/fix together** - following L5/L6 patterns

---

## Quick Commands
- "Read the Recipe folder" → I check RecipeDetailPage and RecipeEditor components
- "Check the index.css" → I review CSS patterns
- "What's the L5 pattern for X?" → I reference L5-BUILD-STRATEGY
- "Enable diagnostics" → I remind you of the localStorage command

---

*Last updated: January 22, 2026 — Session 68: Admin layout strategy, tab change tracking, Recipe Editor diagnostics*
