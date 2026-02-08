# Session 74 Starter — Ingredient Hash Tripwire (Layer 4) + Panel Polish

**Session:** 74
**Predecessor:** Session 73 (HANDOFF-SESSION-73-InlinePendingChanges-ChangeDetection.md)
**Focus:** Layer 4 of 7-layer allergen-version integration + polish from live testing
**Goal:** Add ingredient hash tripwire to detect stale declarations, polish panel UX from testing feedback.

---

## Context

Session 73 built Layer 3:
- **Change detection hook** (`useRecipeChangeDetection.ts`) — compares current vs saved recipe, returns structured changes with tier suggestions and safety floors
- **Inline Pending Changes Panel** — persistent, non-dismissable, replaces the old modal
- **Safety floor enforcement** — CONTAINS allergen changes lock to MAJOR, no override

---

## What to Build

### Layer 4 — Ingredient Hash Tripwire

Every declaration should capture a SHA hash of the recipe's ingredient list at the moment of signing. When the ingredient list changes after a declaration, the UI shows a stale warning.

From ALLERGEN-DECLARATION-ARCHITECTURE.md:
```
Recipe v1.0.0 saved → Declaration made → ingredient_hash captured
Chef adds soy sauce → ingredient_hash changes → ⚠ STALE FLAG
UI shows: "Ingredients changed since last declaration"
```

**Implementation approach:**
1. Hash function: SHA-256 of sorted ingredient IDs + master_ingredient_ids + allergen arrays
2. Store hash on version entries (new field: `ingredientHash`)
3. Compare current hash vs last version's hash on VersionHistory tab
4. Show amber stale warning between the panel and the version list

### Polish from Testing

After running the Session 73 build:
- Test panel with real recipe edits — verify change detection accuracy
- Confirm safety floor lock with actual allergen changes
- Check tablet responsiveness of tier selector buttons (44px+ touch targets)
- Verify `onVersionCreated` snapshot reset clears the panel correctly

### Stretch Goals

1. **Retire & Reissue button** — Add to VersionHistory tab below version list
2. **RecipeCard old component cleanup** — Find remaining consumers, migrate to RecipeCardL5

---

## Key Documents

- `HANDOFF-SESSION-73-InlinePendingChanges-ChangeDetection.md` — What was built in session 73
- `docs/ALLERGEN-DECLARATION-ARCHITECTURE.md` — 7-layer plan (hash tripwire is Layer 4)
- `docs/patterns/PATTERN-Supersession.md` — For Retire & Reissue stretch goal
- `src/features/recipes/components/RecipeEditor/useRecipeChangeDetection.ts` — The hook to potentially extend
- `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` — The panel to extend

---

*"The hash catches the gap between 'something changed' and 'nobody re-declared.'"*
