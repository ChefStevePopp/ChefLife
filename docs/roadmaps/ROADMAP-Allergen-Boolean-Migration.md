# Recipe Allergen Boolean Migration Roadmap

> Bringing recipes to the same boolean column pattern as Master Ingredients.
> Eliminating JSON blobs. Making allergens indexable, queryable, and scalable.

**Created:** February 7, 2026
**Authors:** Steve Popp (Creator/Architect) & Claude (Architecture Partner)
**Status:** Phase 3 complete — all reads from booleans, dual-write active
**Decision:** Confirmed by Steve — required for platform scale

---

## Why This Migration Is Non-Negotiable

### The Current State

| Layer | Storage | Pattern | Queryable? |
|-------|---------|---------|------------|
| **Master Ingredients** | `allergen_peanut: boolean` × 21 + `allergen_peanut_may_contain: boolean` × 21 | Boolean columns | ✅ Indexed, instant |
| **Recipes** | `allergenInfo: { contains: ['peanut','garlic'], mayContain: [...] }` | JSONB blob | ❌ Full parse required |
| **Stations** | `kitchen_station_allergens: { ... }` | JSONB blob | ❌ Full parse required |

Booleans in, JSON blob out. The MIL does it right. Recipes don't.

### The Scale Problem

At 1 restaurant (Memphis Fire): JSON works fine. One org, ~50 recipes, nobody
notices the parse overhead.

At 1,000 restaurants × 200 recipes = **200,000 recipe rows**:

- **"Show me all recipes containing peanut"** — parses 200K JSON blobs
- **"Which restaurants have undeclared sesame?"** — full table scan
- **"Allergen compliance audit across platform"** — impossible at speed
- **Dashboard: "Your org has 47 recipes with tree nut exposure"** — slow
- **Customer portal QR lookup** — parses JSON on every public request

Boolean columns with indexes: **instant**.

### The Consistency Problem

Right now `useAllergenAutoSync` computes allergens from MIL booleans, then
flattens them back to string arrays in a JSON field. That round-trip is where
bugs live:

- Timing: sync fires after render but before save → stale data
- Comparison: array ordering differences cause false dirty flags
- Display: RecipeCardL5 reads persisted JSON, Declaration Panel reads live
  computed values — they can disagree (the bug that prompted this roadmap)

Boolean columns eliminate the round-trip entirely. The recipe stores truth the
same way the ingredient does. No conversion, no timing window, no disagreement.

### The Three-Tier Reality

Recipes need three states per allergen, not two:

| Tier | Source | Example |
|------|--------|---------|
| **Contains** | Inherited from ingredients or manual override | Peanut butter in a recipe = contains peanut |
| **May Contain** | Inherited from supplier warnings or manual | "Processed in facility with tree nuts" |
| **Environment** | Kitchen/station cross-contact (recipe-level only) | "Prepped next to the fryer that does gluten" |

MIL handles Contains + May Contain (ingredient is what it is).
Recipes add Environment (YOUR kitchen, YOUR operational risk).

This was decided January 9, 2026. Environment lives at recipe level and above,
not at ingredient level.

---

## Target Schema

### recipes Table — New Columns

```sql
-- 21 standard allergens × 3 states = 63 boolean columns
-- Pattern: allergen_{type}_{tier}

-- Peanut
allergen_peanut_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_peanut_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_peanut_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Crustacean
allergen_crustacean_contains      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_crustacean_may_contain   BOOLEAN NOT NULL DEFAULT FALSE,
allergen_crustacean_environment   BOOLEAN NOT NULL DEFAULT FALSE,

-- Tree Nut
allergen_treenut_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_treenut_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_treenut_environment      BOOLEAN NOT NULL DEFAULT FALSE,

-- Shellfish
allergen_shellfish_contains       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_shellfish_may_contain    BOOLEAN NOT NULL DEFAULT FALSE,
allergen_shellfish_environment    BOOLEAN NOT NULL DEFAULT FALSE,

-- Sesame
allergen_sesame_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_sesame_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_sesame_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Soy
allergen_soy_contains             BOOLEAN NOT NULL DEFAULT FALSE,
allergen_soy_may_contain          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_soy_environment          BOOLEAN NOT NULL DEFAULT FALSE,

-- Fish
allergen_fish_contains            BOOLEAN NOT NULL DEFAULT FALSE,
allergen_fish_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_fish_environment         BOOLEAN NOT NULL DEFAULT FALSE,

-- Wheat
allergen_wheat_contains           BOOLEAN NOT NULL DEFAULT FALSE,
allergen_wheat_may_contain        BOOLEAN NOT NULL DEFAULT FALSE,
allergen_wheat_environment        BOOLEAN NOT NULL DEFAULT FALSE,

-- Milk
allergen_milk_contains            BOOLEAN NOT NULL DEFAULT FALSE,
allergen_milk_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_milk_environment         BOOLEAN NOT NULL DEFAULT FALSE,

-- Sulphite
allergen_sulphite_contains        BOOLEAN NOT NULL DEFAULT FALSE,
allergen_sulphite_may_contain     BOOLEAN NOT NULL DEFAULT FALSE,
allergen_sulphite_environment     BOOLEAN NOT NULL DEFAULT FALSE,

-- Egg
allergen_egg_contains             BOOLEAN NOT NULL DEFAULT FALSE,
allergen_egg_may_contain          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_egg_environment          BOOLEAN NOT NULL DEFAULT FALSE,

-- Gluten
allergen_gluten_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_gluten_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_gluten_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Mustard
allergen_mustard_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_mustard_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_mustard_environment      BOOLEAN NOT NULL DEFAULT FALSE,

-- Celery
allergen_celery_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_celery_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_celery_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Garlic
allergen_garlic_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_garlic_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_garlic_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Onion
allergen_onion_contains           BOOLEAN NOT NULL DEFAULT FALSE,
allergen_onion_may_contain        BOOLEAN NOT NULL DEFAULT FALSE,
allergen_onion_environment        BOOLEAN NOT NULL DEFAULT FALSE,

-- Nitrite
allergen_nitrite_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_nitrite_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_nitrite_environment      BOOLEAN NOT NULL DEFAULT FALSE,

-- Mushroom
allergen_mushroom_contains        BOOLEAN NOT NULL DEFAULT FALSE,
allergen_mushroom_may_contain     BOOLEAN NOT NULL DEFAULT FALSE,
allergen_mushroom_environment     BOOLEAN NOT NULL DEFAULT FALSE,

-- Hot Pepper
allergen_hot_pepper_contains      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_hot_pepper_may_contain   BOOLEAN NOT NULL DEFAULT FALSE,
allergen_hot_pepper_environment   BOOLEAN NOT NULL DEFAULT FALSE,

-- Citrus
allergen_citrus_contains          BOOLEAN NOT NULL DEFAULT FALSE,
allergen_citrus_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
allergen_citrus_environment       BOOLEAN NOT NULL DEFAULT FALSE,

-- Pork
allergen_pork_contains            BOOLEAN NOT NULL DEFAULT FALSE,
allergen_pork_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_pork_environment         BOOLEAN NOT NULL DEFAULT FALSE,

-- Custom allergens (3 slots, same as MIL)
allergen_custom1_name             TEXT,
allergen_custom1_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom1_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom1_environment      BOOLEAN NOT NULL DEFAULT FALSE,

allergen_custom2_name             TEXT,
allergen_custom2_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom2_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom2_environment      BOOLEAN NOT NULL DEFAULT FALSE,

allergen_custom3_name             TEXT,
allergen_custom3_contains         BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom3_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
allergen_custom3_environment      BOOLEAN NOT NULL DEFAULT FALSE,

-- Freshness timestamp — set when allergens are reviewed and saved
allergen_declared_at              TIMESTAMPTZ,
```

**Total: 63 standard + 12 custom + 1 timestamp = 76 new columns**

### Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_recipes_allergen_peanut
  ON recipes (organization_id) WHERE allergen_peanut_contains = TRUE;

CREATE INDEX idx_recipes_allergen_milk
  ON recipes (organization_id) WHERE allergen_milk_contains = TRUE;

-- ... one per allergen for CONTAINS (the critical tier)

-- Platform-wide compliance query
CREATE INDEX idx_recipes_any_allergen
  ON recipes (organization_id)
  WHERE allergen_peanut_contains OR allergen_milk_contains OR
        allergen_egg_contains OR allergen_wheat_contains OR
        allergen_soy_contains OR allergen_treenut_contains OR
        allergen_fish_contains OR allergen_shellfish_contains OR
        allergen_sesame_contains;
```

---

## Migration Plan

### Phase 1: Add Columns + Backfill (Non-Breaking)

**Scope:** Database only. No frontend changes. Existing JSONB continues to work.

```sql
-- Step 1: Add all 75 columns with defaults
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS allergen_peanut_contains BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_peanut_may_contain BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_peanut_environment BOOLEAN NOT NULL DEFAULT FALSE,
  -- ... (all 75)
;

-- Step 2: Backfill from existing allergenInfo JSONB
UPDATE recipes SET
  allergen_peanut_contains = COALESCE(
    'peanut' = ANY(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE("allergenInfo"->'contains', '[]'::jsonb)))
    ), FALSE
  ),
  allergen_peanut_may_contain = COALESCE(
    'peanut' = ANY(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE("allergenInfo"->'mayContain', '[]'::jsonb)))
    ), FALSE
  ),
  -- ... (repeat for all 21 allergens, contains + mayContain)
  -- environment starts as FALSE for all (new tier, no existing data)
WHERE "allergenInfo" IS NOT NULL;

-- Step 3: Create partial indexes
CREATE INDEX IF NOT EXISTS idx_recipes_allergen_peanut_contains
  ON recipes (organization_id) WHERE allergen_peanut_contains = TRUE;
-- ... (per allergen)
```

**Risk:** Zero. Additive columns with defaults. Existing code reads JSONB, new
columns sit there quietly. No downtime.

### Phase 2: Dual-Write (Transition)

**Scope:** `useAllergenAutoSync` writes to BOTH JSONB and boolean columns.

Update the hook to:
1. Compute allergens from MIL (same as today)
2. Write to `allergenInfo` JSONB (backward compat)
3. Write to boolean columns (new truth)

```typescript
// useAllergenAutoSync — dual-write phase
onChangeRef.current({
  // Legacy JSONB (keep for backward compat during transition)
  allergenInfo: {
    contains: finalContains,
    mayContain: finalMayContain,
    crossContactRisk: manual.crossContactNotes || [],
  },
  // New boolean columns
  ...Object.fromEntries(
    ALLERGEN_KEYS.flatMap(key => [
      [`allergen_${key}_contains`, finalContains.includes(key)],
      [`allergen_${key}_may_contain`, finalMayContain.includes(key)],
      // environment stays untouched — manual only
    ])
  ),
});
```

**Verification:** Both JSONB and booleans agree on every save. Log discrepancies
to console in dev mode. Run for 1-2 weeks before Phase 3.

### Phase 3: Read from Booleans

**Scope:** All UI components switch to reading boolean columns.

Update consumers:
- **RecipeCardL5** — reads `recipe.allergen_garlic_contains` instead of
  `recipe.allergenInfo.contains.includes('garlic')`
- **DeclarationPanel** — reads boolean columns for display
- **useRecipeChangeDetection** — compares boolean columns for version bump
- **NEXUS events** — fires based on boolean column diffs
- **Any query/filter** — uses boolean columns with indexes

**Helper utility:**
```typescript
// Shared utility for reading allergens from boolean columns
export function getRecipeAllergens(recipe: Recipe): {
  contains: AllergenType[];
  mayContain: AllergenType[];
  environment: AllergenType[];
} {
  const contains: AllergenType[] = [];
  const mayContain: AllergenType[] = [];
  const environment: AllergenType[] = [];

  for (const key of ALLERGEN_KEYS) {
    if (recipe[`allergen_${key}_contains`]) contains.push(key);
    if (recipe[`allergen_${key}_may_contain`]) mayContain.push(key);
    if (recipe[`allergen_${key}_environment`]) environment.push(key);
  }
  return { contains, mayContain, environment };
}
```

### Phase 4: Drop JSONB

**Scope:** Remove legacy columns after all reads are migrated.

1. Remove `allergenInfo` JSONB column from recipes table
2. Remove `allergenManualOverrides` JSONB column (manual overrides stored as
   separate boolean flags or in a clean structure)
3. Remove dual-write from `useAllergenAutoSync`
4. Remove JSONB parsing from all components
5. Update TypeScript `Recipe` type to remove JSONB fields

**Only after:** All reads confirmed on booleans for 2+ weeks in production.

---

## What Changes Per Component

| Component | Current (JSONB) | Target (Booleans) | Phase |
|---|---|---|---|
| `useAllergenAutoSync` | Writes `allergenInfo: { contains: [...] }` | Writes `allergen_X_contains: true` | Phase 2 |
| `RecipeCardL5` | Reads `recipe.allergenInfo?.contains` | Reads `recipe.allergen_X_contains` | Phase 3 |
| `DeclarationPanel` | Reads from `useAllergenCascade` computed → JSONB | Reads boolean columns directly | Phase 3 |
| `useRecipeChangeDetection` | Compares `allergenInfo` arrays | Compares boolean columns | Phase 3 |
| `VersionHistory` | Displays changes from array diffs | Displays changes from boolean diffs | Phase 3 |
| `recipeStore.ts` | Passes JSONB to Supabase | Passes booleans to Supabase | Phase 2 |
| Recipe type | `allergenInfo?: { contains: string[] }` | `allergen_peanut_contains?: boolean` × 63 | Phase 2 |
| Platform queries | `WHERE allergenInfo::text LIKE '%peanut%'` | `WHERE allergen_peanut_contains = TRUE` | Phase 3 |

---

## Environment Tier — New Capability

The Environment tier is the payoff for this migration. It doesn't exist in JSONB
today. Boolean columns make it a first-class citizen.

### How Environment Gets Set

Environment is **never auto-computed**. It's a manual declaration by the operator:

> "I know this recipe is prepped near the fryer that handles gluten."
> "This station shares cutting boards with the nut station."

The Allergens tab in the Recipe Editor gets an Environment section:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏭 Kitchen Environment Risks                                       │
│    Cross-contact from your kitchen setup                           │
│                                                                     │
│    These are risks from YOUR prep area, not from ingredients.       │
│    Station-level defaults can be set in Allergen Manager.           │
│                                                                     │
│    [Gluten] [Shellfish] [+Add]                                     │
│                                                                     │
│    Source: Assigned to Breading Station (2 inherited)               │
│    + 0 manual overrides                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Inheritance from Stations

Station allergens (already stored in `operations_settings`) seed the Environment
tier for any recipe assigned to that station. Operator can add more but cannot
remove inherited station risks (same safety-lock principle as CONTAINS).

---

## Cascade Chain: MIL → Prepared Recipe → Final Plate

The allergen cascade chain is the core safety flow. Boolean columns don't
change the mechanics — they change the storage format.

### How It Works Today (JSONB)

```
1. Operator opens a Prepared Recipe
2. useAllergenAutoSync fires (editor level, always mounted)
3. For each ingredient:
   • Raw ingredient → reads MIL boolean columns (allergen_peanut, etc.)
   • Prepared ingredient → reads sub-recipe allergenInfo JSONB from store
4. Computes merged set + manual overrides
5. Writes allergenInfo JSONB to formData
6. Save persists JSONB to Supabase

7. Operator opens a Final Plate that uses this Prepared Recipe
8. Same flow → reads the Prepared Recipe's JSONB from store
9. Inherits allergens → writes Final Plate's JSONB
10. Save persists
```

### How It Works After (Booleans)

```
1. Operator opens a Prepared Recipe
2. useAllergenAutoSync fires (same hook, same trigger)
3. For each ingredient:
   • Raw ingredient → reads MIL boolean columns (same as today)
   • Prepared ingredient → reads sub-recipe boolean columns from store
4. Computes merged set + manual overrides
5. Writes boolean columns to formData + sets allergen_declared_at = now()
6. Save persists booleans to Supabase

7. Operator opens a Final Plate that uses this Prepared Recipe
8. Same flow → reads the Prepared Recipe's booleans from store
9. Inherits allergens → writes Final Plate's booleans
10. Save persists + updates allergen_declared_at
```

### What Changes

| Aspect | Before | After |
|---|---|---|
| Storage format | JSONB arrays | Boolean columns |
| Cascade trigger | `useAllergenAutoSync` on editor open | Same |
| MIL → Recipe | Reads MIL booleans, writes recipe JSONB | Reads MIL booleans, writes recipe booleans |
| Recipe → Parent | Reads sub-recipe JSONB from store | Reads sub-recipe booleans from store |
| Freshness signal | None (stale data looks identical to fresh) | `allergen_declared_at` timestamp on card |

### Freshness at Each Level

The `allergen_declared_at` timestamp tells the operator when each level
was last cascaded:

```
MIL: Garlic (allergen_garlic = true)     ← source of truth, always current
  ↓
Prepared Recipe: "Garlic Butter"          current to 01/15/2026
  (last opened + saved on Jan 15)
  ↓
Final Plate: "Garlic Bread"               current to 12/20/2025
  (last opened + saved on Dec 20 — older than the prep recipe)
  The chef sees this date and knows to re-save
```

No background triggers. No stale flags. The timestamp is the truth.
The cascade runs when the operator opens the recipe — same as today.

---

## Queries This Enables

At scale (1000 restaurants, 200K recipes):

```sql
-- "Which recipes contain peanut?" — instant with index
SELECT name, organization_id FROM recipes
WHERE allergen_peanut_contains = TRUE;

-- "Compliance audit: recipes with undeclared allergens"
-- (ingredient has allergen but recipe boolean is FALSE)
-- Only possible with boolean columns on both sides

-- "Platform allergen dashboard"
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE allergen_peanut_contains) as peanut_recipes,
  COUNT(*) FILTER (WHERE allergen_milk_contains) as milk_recipes,
  COUNT(*) FILTER (WHERE allergen_gluten_contains) as gluten_recipes
FROM recipes
GROUP BY organization_id;

-- "Customer portal: is this dish safe for my allergy?"
SELECT
  allergen_peanut_contains,
  allergen_peanut_may_contain,
  allergen_peanut_environment
FROM recipes
WHERE id = $1 AND organization_id = $2;
-- Single row, three booleans. No parsing.
```

---

## Dependencies

| Dependency | Status | Blocks |
|---|---|---|
| MIL boolean columns | ✅ Done | Nothing |
| Supabase migration access | ✅ Available | Phase 1 |
| Auth Identity Bridge | ❌ Not built | Phase 4 (declaration pinning only) |
| Station allergen config | ✅ Done (JSONB in operations_settings) | Environment inheritance |
| Recipe type updates | Needed | Phase 2 |
| RecipeCardL5 refactor | Needed | Phase 3 |

**Phase 1 can start any session.** No blockers.

---

## Session Estimates

| Phase | Sessions | Notes | Status |
|---|---|---|---|
| Phase 1: Add columns + backfill | 1 | SQL migration + `allergen_declared_at` timestamp + verification | ✅ Session 80 |
| Phase 2: Shared utility + dual-write | 1 | allergenUtils.ts + useAllergenAutoSync + Recipe type + 3 dedup | ✅ Session 80 |
| Phase 3: Read from booleans | 0.5 | All consumers already migrated; 2 final JSONB reads switched | ✅ Session 80 |
| Phase 4: Drop JSONB | 1 | Cleanup after validation period | |
| **Total** | **5-7 sessions** | Can be interleaved with other work |

> **Architecture simplification (Feb 7):** Background cascade triggers and stale
> flags were removed from scope. The existing `useAllergenAutoSync` already handles
> the in-editor cascade correctly. The `allergen_declared_at` timestamp on the card
> tells the operator when allergens were last reviewed — their professional judgment
> handles freshness. No new infrastructure needed beyond the boolean columns.

---

## Decision Log

| Date | Decision | Who |
|---|---|---|
| 2026-01-09 | Double boolean pattern for MIL (Contains + May Contain) | Steve |
| 2026-01-09 | Environment tier lives at recipe level, not ingredient level | Steve |
| 2026-01-09 | Causational hint at ingredient level pointing to recipe Environment | Steve |
| 2026-02-07 | Boolean migration is non-negotiable for platform scale | Steve |
| 2026-02-07 | JSONB blobs must be eliminated before multi-tenant scale | Steve |
| 2026-02-07 | `allergen_declared_at` timestamp replaces background cascade + stale flags | Steve |
| 2026-02-07 | Cascade chain (MIL → Prepared → Final Plate) mechanics unchanged — storage format only | Steve |
| 2026-02-08 | Phase 1 complete — 76 columns added, backfill verified, 24 indexes, 0 mismatches | Steve + Claude |
| 2026-02-08 | Phase 2 complete — shared allergenUtils.ts, dual-write active, 3 duplicate functions consolidated | Steve + Claude |
| 2026-02-08 | Phase 3 complete — all reads switched to booleans; only crossContactRisk remains on JSONB (no boolean equiv) | Steve + Claude |

---

## References

- [ALLERGEN-DATA-FLOW-REVIEW.md](../ALLERGEN-DATA-FLOW-REVIEW.md) — Full data flow trace + architecture decisions
- [ALLERGEN-DECLARATION-ARCHITECTURE.md](../ALLERGEN-DECLARATION-ARCHITECTURE.md) — Versioning, NEXUS, declaration lifecycle
- [ALLERGEN-MANAGER.md](../ALLERGEN-MANAGER.md) — Three-state system, stations, white-label, compliance
- [ROADMAP-Custom-Allergen-Registry.md](./ROADMAP-Custom-Allergen-Registry.md) — Custom allergen registry (replaces 3-slot free-text system)
- [Session conversation Jan 9, 2026](https://claude.ai/chat/7536260c-5a72-42e7-9a16-1a3b993f0610) — Original boolean + Environment tier discussion
- [ROADMAP-Data.md](./ROADMAP-Data.md) — MIL allergen columns (done)
- [ROADMAP-Kitchen.md](./ROADMAP-Kitchen.md) — Recipe allergens tab (pending)

---

*"63 booleans look like a lot of columns until you try to parse 200,000 JSON
blobs at query time. Then they look like common sense."*

---

**Document Version:** 1.0
**Last Update:** February 7, 2026
**Next Review:** When Phase 1 is scheduled
