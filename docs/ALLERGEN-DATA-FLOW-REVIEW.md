# Allergen Data Flow — Architecture Review

> Tracing the full chain from MIL boolean → Recipe Card display.
> Understanding WHY the Declaration Panel and RecipeCardL5 disagree,
> and how the boolean migration + versioning logic must evolve together.

**Created:** February 7, 2026
**Session:** 79 (Architecture Review)
**Status:** Review document — decisions needed before implementation

---

## The Three Parallel Computation Paths

There are currently **three independent places** that compute allergens from
ingredients. Each reads the same MIL booleans, but they run at different times,
in different scopes, and write to different targets.

### Path 1: `useAllergenCascade` (Tab-Level Display)

```
File:    AllergenControl/useAllergenCascade.ts
Mounts:  ONLY when Allergens tab is active
Reads:   MIL boolean columns (allergen_peanut, etc.)
         + sub-recipe allergenInfo JSONB (from store)
Writes:  NOTHING to recipe — display only
Feeds:   AutoDetectedPanel, ManualOverrides, DeclarationPanel
```

This is what the operator SEES on the Allergens tab. It's live, always current
with MIL data, and includes full attribution (which ingredient contributed which
allergen). It builds `declaration.contains` and `allergensWithContext` for the
Declaration Panel.

### Path 2: `useAllergenAutoSync` (Editor-Level Persistence)

```
File:    RecipeEditor/useAllergenAutoSync.ts
Mounts:  At RecipeEditor level — runs on ALL tabs
Reads:   MIL boolean columns (same extraction)
         + sub-recipe allergenInfo JSONB (from store)
         + recipe.allergenManualOverrides (persisted)
Writes:  recipe.allergenInfo JSONB (via onChange → formData)
Feeds:   The JSONB blob that gets saved to Supabase
```

This is what gets PERSISTED. It mirrors the same computation as Path 1 but
writes the result to `formData.allergenInfo` as a JSON blob. The save flow
then pushes this blob to Supabase.

### Path 3: `useRecipeChangeDetection` (Version Bump Logic)

```
File:    RecipeEditor/useRecipeChangeDetection.ts
Mounts:  At RecipeDetailPage level — runs on ALL tabs
Reads:   recipe.allergenInfo (from formData — set by Path 2)
         + its OWN independent MIL boolean extraction (collectIngredientAllergens)
         + sub-recipe allergenInfo JSONB (from store)
Compares: formData.allergenInfo vs originalData.allergenInfo
Outputs: DetectedChange[] with tier suggestions + safety floors
```

This determines whether a save requires a PATCH, MINOR, or MAJOR version bump.
It reads the JSONB blob that Path 2 wrote, AND independently computes from MIL
booleans as a safety net (section 4b: "catches allergen changes from ingredient
additions/removals even when the AllergenControl tab hasn't been visited").

### Path 4: `RecipeCardL5` (Card Display — The Problem)

```
File:    RecipeCard/RecipeCardL5.tsx
Mounts:  Recipe list page — outside the editor entirely
Reads:   recipe.allergenInfo?.contains (from Zustand store)
Source:  Supabase select("*") → whatever JSONB was saved last
```

This reads the PERSISTED blob. It has no live computation. It shows whatever
was in the database at fetch time.

---

## The Discrepancy Mechanism

```
Timeline of the Citrus/Garlic bug:
═══════════════════════════════════

1. Recipe created with Garlic ingredient (allergen_garlic = true on MIL)
   → allergenInfo saved: { contains: ['garlic'] }

2. Later: Operator adds Citrus ingredient to MIL
   (or updates an existing MIL item to set allergen_citrus = true)
   → MIL boolean is now TRUE

3. Recipe is NOT re-opened and re-saved

4. RecipeCardL5 reads: recipe.allergenInfo.contains = ['garlic']
   → Shows: "Garlic" only ❌

5. Operator opens Recipe → Allergens tab
   → useAllergenCascade runs live from MIL booleans
   → Declaration Panel shows: "Citrus + Garlic" ✅
   → useAllergenAutoSync fires, writes to formData.allergenInfo

6. But if operator doesn't SAVE → the database still has ['garlic'] only
   → Card and Declaration Panel still disagree
```

**Root cause:** `allergenInfo` JSONB is a **point-in-time snapshot** that's only
updated when someone opens the editor AND saves. It's a derived cache of MIL
booleans, but it has no background refresh mechanism. When MIL data changes,
every recipe using that ingredient goes stale until manually re-saved.

---

## What the Boolean Migration Fixes

### Fixed: Card ↔ Declaration Disagreement

With boolean columns on recipes, the save flow writes individual booleans
instead of a JSON blob. But MORE importantly, we can:

**Option A — Compute at save time (same as today but cleaner):**
Same trigger point, but booleans instead of JSON. Still requires re-save.

**Option B — Background cascade on MIL change (new capability):**
When `master_ingredients.allergen_citrus` changes from FALSE → TRUE, a
Supabase function/trigger can:
```sql
-- When MIL allergen changes, update all recipes using that ingredient
UPDATE recipes r SET
  allergen_citrus_contains = TRUE
FROM recipe_ingredients ri
WHERE ri.recipe_id = r.id
  AND ri.master_ingredient_id = $mil_id
  AND r.allergen_citrus_contains = FALSE;
```
This is **impossible with JSONB** because you can't efficiently do a partial
update inside a JSON array. With booleans, it's a simple indexed UPDATE.

**Option C — Compute at read time (query-level JOIN):**
```sql
SELECT r.*,
  EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    JOIN master_ingredients mi ON mi.id = ri.master_ingredient_id
    WHERE ri.recipe_id = r.id AND mi.allergen_citrus = TRUE
  ) AS allergen_citrus_contains
FROM recipes r
WHERE r.id = $1;
```
This is always current but adds query complexity. Useful for the customer
portal but probably too heavy for the recipe list grid.

### Fixed: Sub-Recipe Stale Inheritance

Both `useAllergenAutoSync` and `useAllergenCascade` read sub-recipe allergens
from `sub.allergenInfo.contains` — the same stale JSONB. If a sub-recipe's
ingredients change, the parent recipe inherits stale allergen data.

With boolean columns on both parent and sub-recipe, Option B can cascade
recursively: MIL change → sub-recipe booleans update → parent recipe booleans
update.

### Fixed: Three Parallel Extractions

Today, `extractFromMasterIngredient()` is duplicated in THREE files with a
comment "keep in sync." With boolean columns on recipes:

- `useAllergenAutoSync` writes booleans directly (no extraction needed at read time)
- `useRecipeChangeDetection` compares boolean columns (no independent extraction)
- `useAllergenCascade` still extracts for the Allergens tab UI (attribution)
  but the SAVE path is gone — it's display only

The extraction function consolidates to ONE place for ONE purpose (UI display
with per-ingredient attribution).

---

## What the Boolean Migration Doesn't Fix (And Doesn't Need To)

### At-Rest Freshness

Recipe booleans are a point-in-time snapshot, updated at save time. If MIL
allergen data changes after the recipe was last saved, the recipe booleans
are stale. This is the same as today, just in a cleaner container.

**The solution is not infrastructure — it's transparency.**

A single `allergen_declared_at` timestamp on the card tells the operator
exactly when allergens were last reviewed:

```
DECLARED ALLERGENS          current to 01/15/2026
🥜 Peanut  🥛 Milk  🌾 Gluten
```

The operator's professional judgment handles freshness. A chef who sees
"current to 3 months ago" knows to open it and re-save. No background
trigger, no stale flag, no NEXUS event. The existing `useAllergenAutoSync`
cascade handles the in-editor flow correctly — when they open the recipe,
allergens recompute from current MIL data, and saving persists + updates
the timestamp.

This is simpler, more honest, and respects the operator's intelligence.

---

## How Versioning Must Evolve

### Current Version Flow

```
RecipeDetailPage (index.tsx)
│
├── useAllergenAutoSync         → writes formData.allergenInfo
│                                  (JSONB blob)
├── useRecipeChangeDetection    → compares formData vs originalData
│   ├── Reads allergenInfo JSONB from both
│   └── Also does independent MIL boolean extraction (section 4b)
│
├── handleSave()
│   ├── Allergen Review Gate
│   │   ├── Check 1: allergenInfo JSONB differs from baseline?
│   │   └── Check 2: ingredient composition changed?
│   │   └── If either: redirect to Allergens tab, block save
│   │
│   ├── Auto Version Bump
│   │   └── if formData.version === originalData.version && hasChanges:
│   │       bump at suggestedTier, generate change notes
│   │
│   └── NEXUS Events
│       ├── recipe_version_{tier}: version bump occurred
│       ├── recipe_allergen_changed: contains/mayContain diffs
│       └── recipe_allergen_declared: operator confirmed
```

### Post-Boolean Version Flow

```
RecipeDetailPage (index.tsx)
│
├── useAllergenAutoSync         → writes boolean columns to formData
│   ├── allergen_citrus_contains = true
│   ├── allergen_garlic_contains = true
│   └── (no JSONB blob)
│
├── useRecipeChangeDetection    → compares boolean columns
│   ├── formData.allergen_X_contains vs originalData.allergen_X_contains
│   ├── formData.allergen_X_may_contain vs originalData.allergen_X_may_contain
│   ├── formData.allergen_X_environment vs originalData.allergen_X_environment
│   └── Section 4b (independent MIL extraction) ELIMINATED
│       (no longer needed — booleans ARE the truth)
│
├── handleSave()
│   ├── Allergen Review Gate
│   │   ├── Check 1: any allergen boolean differs from baseline?
│   │   │   (simple loop over ALLERGEN_KEYS, compare booleans)
│   │   └── Check 2: (same ingredient composition check)
│   │
│   ├── Auto Version Bump
│   │   └── (same logic, but changes detected from boolean diffs)
│   │
│   ├── allergen_declared_at = now()
│   │   └── Set when allergen booleans confirmed and saved
│   │       Card displays: "current to MM/DD/YYYY"
│   │       Operator's professional judgment handles freshness
│   │
│   └── NEXUS Events
│       ├── recipe_version_{tier}: (same)
│       ├── recipe_allergen_changed: boolean diff summary
│       │   metadata: { changed_fields: ['allergen_citrus_contains'] }
│       └── recipe_allergen_declared: (same)
```

**At rest:** RecipeCardL5 reads boolean columns + `allergen_declared_at`.
No background triggers. No stale flags. The timestamp is the truth.
The existing cascade (`useAllergenAutoSync`) recomputes from current MIL
data whenever the recipe editor opens — saving updates the booleans and
the timestamp.

---

## Decisions Needed

### 1. ~~Background Cascade~~ → RESOLVED: Not Needed

**Decision (Feb 7):** The `allergen_declared_at` timestamp on the card provides
transparency about freshness. The existing `useAllergenAutoSync` cascade handles
the in-editor flow. No background triggers, no stale flags, no NEXUS stale events.
The operator's professional judgment handles at-rest freshness.

### 2. ~~Stale Declaration Flag~~ → RESOLVED: Replaced by Timestamp

**Decision (Feb 7):** `allergen_declared_at` column replaces the stale flag concept.
Card shows "current to MM/DD/YYYY" — honest, simple, no infrastructure.

### 3. Environment Tier in Version Detection

Currently `useRecipeChangeDetection` checks `allergen-contains` (MAJOR),
`allergen-maycontain` (MINOR), and `allergen-crosscontact` (PATCH).

With boolean columns, we add `allergen-environment`. What tier?

**Recommendation:** Environment changes = **MINOR** (same as May Contain).
Environment is "your kitchen's cross-contact risk" — it affects the customer
disclosure but it's not a new CONTAINS. Team needs awareness, not mandatory
meeting.

### 4. `extractFromMasterIngredient` Consolidation

Three copies today. After migration:
- `useAllergenCascade` still needs it for per-ingredient attribution in the UI
- `useAllergenAutoSync` needs it to compute which booleans to set on the recipe
- `useRecipeChangeDetection` no longer needs it (compares booleans directly)

**Action:** Extract to shared utility (`allergenUtils.ts`), import in the two
hooks that still need it. Delete the copy in change detection.

### 5. Sub-Recipe Allergen Cascade Chain

The cascade chain is: **MIL → Prepared Recipe → Final Plate**

This chain already works today via `useAllergenAutoSync`. The hook handles
both ingredient types:

```
For each ingredient in recipe:
  IF raw → read MIL boolean columns (allergen_peanut, etc.)
  IF prepared → read sub-recipe allergen data from store
```

With boolean columns, the only change is what "read sub-recipe allergen data"
means:
- **Today:** `sub.allergenInfo.contains.includes('citrus')` (JSONB array)
- **After:** `sub.allergen_citrus_contains === true` (boolean column)

The cascade mechanics are identical. When you open a recipe:
1. `useAllergenAutoSync` fires, reads current MIL booleans for raw ingredients
2. For prepared ingredients, reads the sub-recipe's booleans from the store
3. Computes the merged set, writes booleans to formData
4. Save persists booleans + updates `allergen_declared_at`

The timestamp at each level tells the operator the freshness:
- Prepared recipe: "current to 01/15/2026" (last time MIL data was cascaded)
- Final plate: "current to 12/20/2025" (older — needs re-save to pick up
  the prepared recipe's January update)

**Decision:** Cascade chain preserved as-is. No recursive triggers needed.
Timestamp transparency handles multi-level freshness.

---

## Implementation Sequence (Revised)

Based on this review, the roadmap phases should be:

### Phase 1: Columns + Backfill (1 session)
- Add 75 boolean columns to recipes table
- Backfill from existing allergenInfo JSONB
- Create indexes
- No frontend changes — JSONB continues to work

### Phase 2: Shared Utility + Dual-Write (1-2 sessions)
- Extract `extractFromMasterIngredient` → `allergenUtils.ts`
- Update `useAllergenAutoSync` to write BOTH JSONB and booleans
- Update Recipe TypeScript type
- Update `recipeStore.ts` to include boolean columns in saves

### Phase 3: Read from Booleans (2-3 sessions)
- `RecipeCardL5` reads boolean columns
- `DeclarationPanel` reads boolean columns (via allergensWithContext)
- `useRecipeChangeDetection` compares boolean columns
  - Remove section 4b (independent MIL extraction)
  - Add environment tier detection
- Allergen Review Gate compares booleans
- NEXUS events use boolean diff metadata
- `handleSave` version bump logic uses boolean comparison

### Phase 4: Drop JSONB (1 session)
- Remove `allergenInfo` JSONB column
- Remove `allergenManualOverrides` JSONB column (convert to structured booleans)
- Remove dual-write from `useAllergenAutoSync`
- Clean up TypeScript types

**Total: 5-7 sessions.** Background cascade and sub-recipe cascade triggers
were removed from scope — the `allergen_declared_at` timestamp handles
freshness transparency, and the existing `useAllergenAutoSync` handles the
in-editor cascade. No new infrastructure needed beyond boolean columns.

---

## File Impact Summary

| File | Current Role | Post-Migration Role | Changes |
|---|---|---|---|
| `useAllergenAutoSync.ts` | Computes JSONB from MIL booleans | Computes recipe booleans from MIL booleans | Write target changes |
| `useAllergenCascade.ts` | Live computation for tab display | Same — display + attribution only | Reads recipe booleans for sub-recipes |
| `useRecipeChangeDetection.ts` | Compares JSONB + independent MIL extraction | Compares boolean columns only | Section 4b removed, environment added |
| `RecipeCardL5.tsx` | Reads allergenInfo JSONB | Reads boolean columns | Simple field swap |
| `DeclarationPanel.tsx` | Receives computed props | Same — props come from useAllergenCascade | No direct changes |
| `AllergenControl/index.tsx` | Orchestrates tab | Same | No direct changes |
| `RecipeDetailPage/index.tsx` | Allergen review gate + NEXUS | Boolean comparisons instead of JSONB | Gate + NEXUS logic simplified |
| `recipeStore.ts` | Strips `allergens`, passes `allergenInfo` | Passes boolean columns + `allergen_declared_at` | Clean up field stripping |
| `allergenUtils.ts` | **NEW** | Shared extraction utility | Single source of truth |

---

## References

- [ROADMAP-Allergen-Boolean-Migration.md](./roadmaps/ROADMAP-Allergen-Boolean-Migration.md) — Phase plan + schema
- [ALLERGEN-DECLARATION-ARCHITECTURE.md](./ALLERGEN-DECLARATION-ARCHITECTURE.md) — Versioning + NEXUS + lifecycle
- [ALLERGEN-MANAGER.md](./ALLERGEN-MANAGER.md) — Three-state system + station cascade

---

*Three hooks reading the same MIL booleans, writing to three different targets,
comparing at three different times. That's not architecture — that's three
people shouting the same fact into three different rooms and hoping someone
writes it down. Boolean columns + background cascade: one truth, one write,
every reader current.*

---

**Document Version:** 1.0
**Last Updated:** February 7, 2026
**Status:** Awaiting decisions on background cascade + environment tier
