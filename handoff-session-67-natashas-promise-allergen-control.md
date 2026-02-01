# Session 67 Handoff: Natasha's Promise - Allergen Control L5 Polish

**Date:** February 1, 2026  
**Focus:** AllergenControl L5 subheader, expandable info section, RecipeSettings fix  
**Status:** Functional with minor polish remaining

---

## What We Built

### 1. AllergenControl L5 Subheader (COMPLETE)

**File:** `C:\dev\src\features\recipes\components\RecipeEditor\AllergenControl\index.tsx`

Added the full L5 subheader pattern matching the gold standard from BasicInformation:

- **Icon box** (rose) with Shield icon
- **Title:** "Allergen Control"
- **Subtitle:** "Natasha's Promise — Purchase → Plate traceability"
- **Stats pills:** Contains count (rose when > 0), May Contain count (amber when > 0)
- **Actions:** Print button, Share button

### 2. Expandable Info Section (COMPLETE)

Added the "Why This Matters" expandable section with:

**Core Message:**
> In 2016, Natasha Ednan-Laperouse died from an allergic reaction to sesame in a sandwich that wasn't labeled. Her death led to Natasha's Law in the UK, requiring full allergen labeling. This system honors her memory by ensuring the allergen chain never breaks — from the invoice to the plate.

**Four Feature Cards:**
| Card | Icon Color | Description |
|------|------------|-------------|
| Auto-Cascade | Rose | Allergens flow automatically from ingredients |
| Audit Trail | Emerald | Click any allergen to see source ingredients |
| Safety Locks | Amber | Auto-detected allergens can't be removed |
| Customer Trust | Purple | Share declarations via QR code |

**Pro Tip (The Chain):**
> Vendor Abstract / Label → Master Ingredient → Recipe → Final Plate → Customer

**Icons imported:** `Info, ChevronUp, ChevronDown, Link2, FileCheck, AlertTriangle, Heart`

### 3. RecipeSettings ALLERGEN_CONFIG Fix (COMPLETE)

**File:** `C:\dev\src\features\admin\components\sections\RecipeSettings\index.tsx`

Fixed `ReferenceError: ALLERGEN_CONFIG is not defined` in AllergenPortalSection:
- Changed `ALLERGEN_CONFIG[allergen]` → `ALLERGENS[allergen]` (lines ~1343, ~1377)
- Changed icon display to static `⚠️` since ALLERGENS stores Lucide icon names, not emojis

---

## Key Decisions

### "Vendor Abstract / Label" vs "Vendor Invoice"
- Invoice = pricing and quantities
- Abstract/Label = allergen data source of truth
- Chain now reads: **Vendor Abstract / Label → MIL → Recipe → Plate → Customer**

### Why This Complexity Exists
Not overengineering for Memphis Fire alone — building for UK/EU operators where Natasha's Law requires:
- Full ingredient + allergen labeling on PPDS
- Contains vs May Contain distinction
- Cross-contact documentation
- Audit trail (defensible in court)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/features/recipes/components/RecipeEditor/AllergenControl/index.tsx` | L5 subheader, expandable info section, Natasha's Promise dedication |
| `src/features/admin/components/sections/RecipeSettings/index.tsx` | Fixed ALLERGEN_CONFIG → ALLERGENS |

---

## What's Working

- ✅ Auto-detection cascade: VIM → MIL → Recipe Ingredients → Allergen Declaration
- ✅ L5 subheader with stats pills
- ✅ Expandable info section with Natasha's story
- ✅ L5 floating action bar for unsaved changes
- ✅ RecipeSettings Allergen Portal section loads without errors

---

## Pending Work

### Station Environmental Allergens
Architecture planned but not implemented:
- Configure allergens at station level (Operations → Kitchen → Kitchen Stations)
- Cascade to all recipes assigned to that station
- Three tiers: Contains, May Contain, Environmental

**Data model (planned):**
```typescript
kitchen_station_allergens?: Record<string, {
  environmentalAllergens: AllergenType[];
  notes?: string;
}>;
```

### Allergen Icons
RecipeSettings uses static `⚠️` for all allergens. Could enhance with:
- Emoji mapping in constants.ts
- Or dynamic Lucide icon rendering

### Public Allergen Declaration Page
- Route: `/public/allergen/{recipeId}`
- Mobile-first, customer-facing
- QR code generation for table tents

---

## The Chain Must Never Break

```
Vendor Abstract / Label
        ↓
  Master Ingredient (MIL)
        ↓
   Recipe Ingredients
        ↓
  Allergen Declaration
        ↓
   Customer / Plate
```

This is Natasha's Promise.

---

## Session Notes

- Filesystem MCP was intermittently unresponsive throughout session
- Working directory is `C:\dev` (not `C:\dev\cheflife`)
- TipTap question raised but not resolved (npm dependency, not VS Code extension)

---

## Next Session Priorities

1. Station environmental allergens implementation
2. Allergen emoji/icon mapping for better visual display
3. Continue L5 polish across other Recipe Editor tabs
