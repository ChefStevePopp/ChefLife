# HANDOFF: Recipe Manager & Module Configuration Architecture

**Created:** January 21, 2026  
**Last Updated:** Session 63  
**Status:** Architecture Established — L3/L4 Shell Complete  
**Next Session Focus:** Return to Recipe Manager core workflow completion

---

## Executive Summary

We've established the Module Configuration architecture pattern. Recipe Manager Settings now exists as an L3/L4 shell with clearly defined tabs documenting what each section will contain when we return to build it out.

**Key Decision:** Configuration is separate from workflow. Daily recipe work happens in Recipe Manager (`/admin/recipes`). Periodic configuration happens in Recipe Manager Settings (`/admin/modules/recipes`).

---

## What We Accomplished This Session (63)

### Module Configuration Architecture ✅

**1. Created RecipeSettings Component**
- Location: `src/features/admin/components/sections/RecipeSettings/index.tsx`
- Route: `/admin/modules/recipes`
- Pattern: Matches TeamPerformanceConfig structure (back button, L5 header, tabbed content)

**2. Defined Five Configuration Tabs**

| Tab | Purpose | Key Features |
|-----|---------|--------------|
| **General** | Default values & workflow rules | Stations, storage areas, yield units, version control, approval workflow |
| **Import** | Excel migration | Column mapping, duplicate detection, validation, batch history |
| **Print Templates** | Recipe card layouts | Kitchen Copy, Training Copy, Costing Copy, branding, QR codes |
| **Website Embed** | iframe exports | Embed code generator, styling, recipe selection, analytics |
| **Allergen Portal** | Customer-facing allergen display | Big 9/14, disclaimers, cross-contact, QR codes for table tents |

**3. Wired Up Routes & Navigation**
- Added route in `AdminRoutes.tsx`
- Updated `ModulesManager` configPath for Recipe Manager
- Renamed legacy `RecipeConfig.tsx` → `_LEGACY_RecipeConfig.tsx`

**4. Established Pattern**
- Each tab shows "Coming Soon" with full feature roadmap
- Architecture note explains separation of concerns
- Settings will persist to `organization.modules.recipes.config`

---

## Architecture Decisions

### Separation of Concerns
```
Recipe Manager (/admin/recipes)
├── Daily workflow
├── Browse, create, edit recipes
├── Search, filter, sort
└── The "doing" interface

Recipe Manager Settings (/admin/modules/recipes)
├── Periodic configuration
├── Import templates & mappings
├── Print/export settings
├── Allergen portal config
└── The "setup" interface
```

### Why This Matters
- You don't change import templates every day
- Print layouts are set once, used many times
- Allergen portal config is regulatory/compliance — needs careful setup, then stability
- Keeping config separate prevents UI clutter in daily workflow

### Module Config Storage Pattern
```typescript
organization.modules.recipes.config = {
  general: { defaultStation, defaultStatus, ... },
  import: { templates: [...], columnMappings: {...} },
  print: { kitchenTemplate: {...}, trainingTemplate: {...} },
  embed: { allowedRecipes: [...], styling: {...} },
  allergens: { displayMode, disclaimerText, ... }
}
```

---

## Files Changed This Session

| File | Action | Notes |
|------|--------|-------|
| `src/features/admin/components/sections/RecipeSettings/index.tsx` | Created | L3/L4 shell with 5 tabs |
| `src/features/admin/routes/AdminRoutes.tsx` | Modified | Added `/admin/modules/recipes` route |
| `src/features/admin/components/sections/ModulesManager/index.tsx` | Modified | Updated configPath |
| `src/features/admin/components/sections/RecipeConfig.tsx` | Renamed | Now `_LEGACY_RecipeConfig.tsx` |

---

## Recipe Manager L5 Status (Unchanged)

These were completed in previous sessions and remain ready:

| Feature | Status |
|---------|--------|
| Dynamic tabs from Food Relationships | ✅ Done |
| Tab colors follow design system | ✅ Done |
| Badge icon/name from Food Relationships | ✅ Done |
| Header stats pills | ✅ Done |
| Expandable info with feature cards | ✅ Done |
| Import button in header | ✅ Done (links to existing import modal) |
| Settings access via Module Configurator | ✅ Done (Configure button now works) |

---

## Next Steps

### When We Return to Recipe Manager Settings
1. **General Tab** — Build dropdowns for default values, persist to org config
2. **Import Tab** — Excel template mapper (reference VendorSettings CSV pattern)
3. **Print Tab** — Template builder with live preview
4. **Embed Tab** — Code generator with copy-to-clipboard
5. **Allergen Tab** — Configuration wizard with preview

### Before That — Recipe Manager Core Completion
- Recipe Editor modal polish
- Ingredient linking (to Master Ingredient List)
- Costing calculations
- Version history
- Any remaining L5/L6 items from original audit

---

## Import Details (For When We Build It)

Steve confirmed:
- **Primary format:** Excel (existing recipe spreadsheets)
- **Use case:** Migration from current system, not daily imports
- **Pattern reference:** VendorSettings CSV mapper is the template

Key considerations for Excel import:
- Sheet selection (recipes might be on specific sheets)
- Header row detection
- Column mapping UI (drag-drop or dropdown)
- Preview before commit
- Duplicate handling (skip, merge, overwrite)
- Validation errors display

---

## Architecture Note

This session established **"configuration as documentation"** — the tabs and their feature lists serve as a roadmap even before implementation. When we return:
1. Tab structure is defined
2. Features are enumerated
3. Storage pattern is specified
4. We know exactly what to build

This is not MVP shortcuts — it's forward documentation that happens to be rendered in the UI.

---

*Session 63 focused on architecture and separation of concerns. Recipe Manager Settings is now discoverable via Feature Modules → Recipe Manager → Configure. The daily workflow remains unaffected.*
