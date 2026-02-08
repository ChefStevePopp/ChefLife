# HANDOFF — Session 73: Inline Pending Changes Panel + Allergen-Aware Auto-Suggestions
## Layer 3 of 7-Layer Allergen Integration — Change Detection Architecture

**Session:** 73
**Date:** February 6, 2026
**Focus:** Replace dismissable version bump modal with persistent inline change detection panel
**Status:** Layer 3 complete. Hook + Panel + Editor integration. Ready for Layer 4 (ingredient hash tripwire).

---

## What Was Built

### 1. Change Detection Hook — `useRecipeChangeDetection.ts` (NEW)

**File:** `src/features/recipes/components/RecipeEditor/useRecipeChangeDetection.ts`

A pure comparison hook that takes `currentRecipe` and `lastSavedRecipe` and returns:

```typescript
interface ChangeDetectionResult {
  changes: DetectedChange[];   // Every individual change with tier + reasoning
  hasChanges: boolean;
  suggestedTier: BumpTier;     // MAX of all change tiers
  tierReason: string;          // Human-readable reason for the highest tier
  hasSafetyFloor: boolean;     // Any CONTAINS allergen change?
  minimumTier: BumpTier;       // Floor the operator cannot go below
}
```

**Detection rules implemented:**

| Detected Change | Tier | Safety Floor | Reasoning |
|---|---|---|---|
| New CONTAINS allergen | **MAJOR** | ✅ YES | Customer safety — mandatory meeting |
| CONTAINS allergen removed | **MAJOR** | ✅ YES | False confidence kills too |
| New ingredient with new allergen | **MAJOR** | ✅ YES | New ingredient introduces CONTAINS |
| New MAY CONTAIN | MINOR | No | Potential exposure — team awareness |
| MAY CONTAIN removed | MINOR | No | Risk profile changed |
| Ingredient added (no new allergen) | MINOR | No | Team should review |
| Ingredient removed | MINOR | No | Team should review |
| Yield changed | MINOR | No | Affects portioning |
| Method steps changed | MINOR | No | Affects technique |
| Cross-contact notes updated | PATCH | No | Documentation — trust management |
| Description/production notes updated | PATCH | No | Documentation — silent |

**Key design:** Each `DetectedChange` has its own `isSafetyFloor` flag. The aggregate `minimumTier` is the MAX of all safety-floored changes. Operator can escalate above `suggestedTier` but **never** downgrade below `minimumTier`.

**Per-ingredient attribution:** When an ingredient brings a new allergen, the change shows `Added "Peanut Butter" (CONTAINS: Peanuts)` — not just "allergen profile changed." If someone dies, the audit trail traces to the ingredient.

### 2. Inline Pending Changes Panel — `VersionHistory.tsx` (REWRITTEN)

**File:** `src/features/recipes/components/RecipeEditor/VersionHistory.tsx`

The dismissable 3-column card modal is **gone**. Replaced with a persistent inline panel:

**Panel states:**
- **No changes:** Collapsed single line — "No changes since v1.2.0" (gray, minimal)
- **Changes detected (no safety floor):** Expandable panel with amber/gray border, change list, tier selector, notes, commit button
- **Changes detected (safety floor active):** Rose border, lock icon on downgrade-blocked tiers, warning explains the floor

**Panel layout:**
```
┌─ PENDING CHANGES (3) ────────────────────────────────────────┐
│  🛡 New CONTAINS allergen: Peanut                   [MAJOR]  │
│    Removed "Almond Flour"                           [MINOR]  │
│    Yield changed: 12 → 16 portions                  [MINOR]  │
│                                                               │
│  🔒 Allergen safety floor — cannot downgrade below Major      │
│                                                               │
│  [PATCH🔒] [MINOR🔒] [■ MAJOR ■]   ← tier selector          │
│                                                               │
│  Notes: [________________________________] (required)         │
│  [ Create v2.0.0 — Mandatory Meeting Required ]               │
└───────────────────────────────────────────────────────────────┘
```

**Tier selector:** Compact inline buttons replacing the 3-column modal cards. Each button shows version number, tier name, and communication level. Locked tiers show a Lock icon and are visually dimmed + disabled. Auto-suggested tier shows an "↑ Suggested" indicator.

**Color system:**
- MAJOR / Safety floor: `rose-500/10` bg, `rose-500/30` border
- MINOR: `amber-500/10` bg, `amber-500/30` border
- PATCH: `gray-800/50` bg, `gray-700/50` border
- No changes: `gray-800/30` bg, `gray-700/30` border

**Commit button:** Full-width, color-coded by tier, disabled when MAJOR is selected but notes are empty.

**"Create New Version" button removed** from the Current Version card — the inline panel IS the version creation interface now. No redundant entry point.

### 3. Editor Integration — `RecipeEditor/index.tsx` (MODIFIED)

**File:** `src/features/recipes/components/RecipeEditor/index.tsx`

Minimal changes:
- Added `useRef` import
- Created `lastSavedRecipeRef` initialized with `structuredClone(initialRecipe)` — deep copy prevents mutation
- VersionHistory now receives `lastSavedRecipe` and `onVersionCreated` props
- `onVersionCreated` callback resets the ref to current recipe state — panel clears after commit

```typescript
const lastSavedRecipeRef = useRef<Recipe | Omit<Recipe, 'id'> | null>(
  initialRecipe ? structuredClone(initialRecipe) : null
);

<VersionHistory
  recipe={recipe}
  onChange={handleChange}
  lastSavedRecipe={lastSavedRecipeRef.current}
  onVersionCreated={() => {
    lastSavedRecipeRef.current = structuredClone(recipe);
  }}
/>
```

---

## Key Decisions

### Modal → Inline Panel (Life Safety Weight)
"A dismissable popup doesn't carry the weight this deserves." The inline panel is always visible when changes exist. It cannot be closed. It cannot be skipped. The operator must engage with the detected changes and commit at the right tier before proceeding.

### Safety Floor Is Absolute
When a CONTAINS allergen is added or removed, the minimum tier locks to MAJOR. The operator sees a rose warning with a Lock icon. The PATCH and MINOR buttons are dimmed and disabled. There is no override. The rationale: "If someone dies, we need to know that we did our best to ensure people got the data they needed."

### Per-Ingredient Attribution
The change list shows ingredient-level detail with allergen callouts. This is more expensive to compute than top-level array diffs, but it creates the audit trail a coroner's inquest would need.

### Snapshot via structuredClone + useRef
The `lastSavedRecipeRef` captures the recipe state at modal open. `structuredClone` prevents the reference from mutating as the user edits. After version commit, `onVersionCreated` resets the ref — the panel shows clean "No changes" state.

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/recipes/components/RecipeEditor/index.tsx` | Added `useRef`, `lastSavedRecipeRef`, passed new props to VersionHistory |
| `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` | Full rewrite — modal removed, inline panel with change detection |

## Files Created

| File | Purpose |
|------|---------|
| `src/features/recipes/components/RecipeEditor/useRecipeChangeDetection.ts` | Change detection hook — compares current vs saved, returns tier suggestions with safety floors |

---

## Bug Found + Fixed During Testing

### Silent Allergen Absorption Bug (Critical)

**Symptom:** Remove an ingredient that sources allergens → allergens silently become "manual" entries → declaration unchanged → version panel sees nothing.

**Root cause:** `parseExistingAllergenInfo()` in `AllergenControl/index.tsx` couldn't distinguish between "operator deliberately added this manually" and "this was auto-sourced from an ingredient that no longer exists." It classified all non-auto allergens as manual overrides, silently absorbing the removal.

**Fix (AllergenControl/index.tsx):** Removed the backfill behavior. If the cascade doesn't source an allergen and there's no explicit manual record, it drops from the declaration. The version panel catches it as "CONTAINS removed → MAJOR."

**Known tradeoff:** Legitimate manual allergens (added on purpose by operator) will also drop on next tab mount, because `allergenInfo.contains` is a flat array with no source attribution. **Future fix:** Persist `manualAllergenOverrides` as a separate recipe field so truly manual entries survive independently.

### Allergen-from-Ingredients Independent Analysis (Enhancement)

**Problem:** The AllergenControl cascade only runs when the Allergens tab is mounted. If the operator removes an allergen-carrying ingredient on the Ingredients tab and goes straight to Versions, `allergenInfo` hasn't updated yet.

**Fix (useRecipeChangeDetection.ts):** Added Section 4b — independent ingredient-level allergen analysis. The hook now collects allergens from `ingredient.allergens[]` joined fields and compares previous vs current ingredient sets directly. Deduplicates against changes already caught by the `allergenInfo` diff. This works regardless of whether the Allergen tab was visited.

---

## What's Next

### Immediate (Layer 4)

**Ingredient Hash Tripwire**
- SHA hash of ingredient list stored per version
- Amber warning when ingredient list changes after a declaration was made
- The gap detector between "something changed" and "nobody re-declared"

### Stretch (Deferred from this session)

- **Retire & Reissue button** — Supersession Pattern on VersionHistory tab
- **RecipeCard old component cleanup** — migrate remaining consumers to RecipeCardL5

### Later (Layers 5-7)

- **Layer 5** — NEXUS event emission from `bumpType`
- **Layer 6** — Smart card badges from NEXUS events
- **Layer 7** — Declaration table (needs Auth Identity Bridge)

---

## Cross-References

- **Layer 1+2 (Session 72):** HANDOFF-SESSION-72-RecipeVersioning-Supersession.md
- **7-Layer Plan:** docs/ALLERGEN-DECLARATION-ARCHITECTURE.md
- **Supersession Pattern:** docs/patterns/PATTERN-Supersession.md
- **Nothing Erased Promise:** docs/promises/PROMISE-Nothing-Erased.md
- **Allergen Cascade Hook:** src/features/recipes/components/RecipeEditor/AllergenControl/useAllergenCascade.ts

---

*Session 73 — "If someone dies, we need to know that we did our best to ensure people got the data they needed."*
