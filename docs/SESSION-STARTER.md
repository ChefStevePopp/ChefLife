# ChefLife Session Starter
> **Paste this first message every session.** ~100 lines of critical context.

---

## What ChefLife Is
Restaurant management system. React/TypeScript/Supabase. Desktop admin + mobile command center.
**The body metaphor:** Recipes = Heart, Data = COGS Engine, Teams = Skin, Comms = Voice, NEXUS = Circulatory, Operations = Skeleton.

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
| **Recipe Manager** | 60% | Basic CRUD, needs costing integration |
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

### L6 Philosophy
> "L5 respects the user's craft. L6 respects their time."
- Filter-aware navigation (don't lose context)
- Pending state + floating action bar for strategic decisions
- Smart defaults that anticipate needs

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
src/index.css               # CSS component library (tabs, pills, action bars)
src/stores/                  # Zustand stores
docs/L5-BUILD-STRATEGY.md   # Full design system reference
docs/CHEFLIFE-ANATOMY.md    # Architecture & flows
```

---

## Diagnostic Paths
Enable in browser console: `localStorage.setItem('showDiagnostics', 'true'); location.reload();`
Every visual component shows its file path when enabled.

---

## Current Work Queue
1. **Food Relationships — Final Polish** ⬅️ NEXT SESSION
   - Sub-header info cards: titles should match icon colors (VIM Settings pattern)
   - Pattern: `<span className="text-sm font-medium text-primary-400">Title</span>`
   - Currently bright gray, should be: primary/emerald/amber/rose per icon
2. **Recipe Manager — Wire Dynamic Tabs**
   - Tabs should come from `getRecipeTypeGroups()` (Food Relationships)
   - Currently hardcoded, needs to respect taxonomy
3. **Recipe Manager — Relational Foundation**
   - Migrate JSONB ingredients → relational `recipe_ingredients` table
   - Add cascade triggers (price change → recipe cost auto-update)
   - Handoff: `docs/handoffs/HANDOFF-Recipe-Relational-Foundation.md`
4. **Triage Panel** - Needs L5 polish
5. **Mobile Shell** - Design complete, build pending

---

## Session Protocol
1. **Tell me what we're working on** - module, feature, or bug
2. **I'll check relevant files** - using the locations above
3. **Show me the exact component** - use diagnostic paths if needed
4. **We build/fix together** - following L5/L6 patterns

---

## Quick Commands
- "Read the VIM folder" → I check VendorInvoice components
- "Check the index.css" → I review CSS patterns
- "What's the subheader pattern?" → I reference L5-BUILD-STRATEGY
- "Enable diagnostics" → I remind you of the localStorage command

---

*Last updated: January 21, 2026 — Food Relationships L5 complete, sub-header polish pending*
