# Session 79 Handoff — Complete

> Version & Status L5 Visual Polish + Allergen Architecture Review

**Date:** February 7, 2026
**Session:** 79
**Status:** Architecture review complete — decisions documented, ready for implementation

---

## What Was Built (Part 1: Visual Polish)

### Version & Status Tab — L5 Alignment ✅

Three visual inconsistencies fixed to match Vendor Invoice Settings pattern:

1. **Expandable info cards** — stripped rainbow text from descriptions. Color
   now lives only in icon + title. All description text is `text-gray-500` prose.
2. **Status selector active button** — removed `border-current` (was picking up
   full amber). Now uses 20% opacity border from `config.activeBg`.
3. **Current status display** — neutral `bg-gray-800/30` card instead of tinted
   amber background. Only icon + "Draft" text carry color.

**Build:** Clean (`tsc --noEmit` + `vite build`)

---

## What Was Discovered (Part 2: Allergen Discrepancy)

Steve showed screenshot: Declaration Panel displays "Citrus" and "Garlic" as
CONTAINS, but RecipeCardL5 only shows "Garlic." Citrus missing from the card.

### Root Cause

`allergenInfo` JSONB is a point-in-time snapshot. It only updates when someone
opens the recipe editor and saves. If MIL allergen data changes after the
recipe was last saved, the card shows stale data while the Declaration Panel
(which computes live from MIL booleans) shows current data.

---

## What Was Documented (Part 3: Architecture Review)

### New Documents Created

1. **`docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md`**
   - Full migration plan: 76 columns (75 booleans + `allergen_declared_at` timestamp)
   - 4-phase implementation (5-7 sessions)
   - Cascade chain documented: MIL → Prepared Recipe → Final Plate
   - Target schema, migration SQL, component changeover map
   - Decision log with Steve's confirmations

2. **`docs/ALLERGEN-DATA-FLOW-REVIEW.md`**
   - Complete trace of all 4 allergen computation paths
   - Exact discrepancy mechanism explained
   - How versioning logic evolves with boolean columns
   - Architecture decisions resolved (timestamp replaces background cascade)

### Existing Documents Updated

3. **`docs/ALLERGEN-MANAGER.md`**
   - Recipes table schema section now points to boolean migration
   - Old JSONB placeholder replaced with boolean column target

4. **`docs/ALLERGEN-DECLARATION-ARCHITECTURE.md`**
   - New "Boolean Migration" section with cross-link
   - Notes that declaration pinning table may also move from TEXT[] to booleans

---

## Key Architecture Findings

### Three Parallel Extraction Paths

`extractFromMasterIngredient()` is duplicated in three files:
- `useAllergenCascade.ts` (tab display)
- `useAllergenAutoSync.ts` (persistence)
- `useRecipeChangeDetection.ts` (version bump)

Post-migration: consolidate to shared `allergenUtils.ts`, eliminate copy in
change detection entirely (compares booleans directly).

### Cascade Chain Preserved

The MIL → Prepared Recipe → Final Plate cascade chain works identically with
booleans. `useAllergenAutoSync` already handles both raw ingredients (reads MIL
booleans) and prepared ingredients (reads sub-recipe data from store). The only
change is storage format — booleans instead of JSONB arrays.

### Timestamp Replaces Background Cascade

Steve's insight: instead of building Supabase triggers to auto-propagate MIL
changes, the `allergen_declared_at` timestamp on RecipeCardL5 tells the chef
when allergens were last reviewed. "current to 01/15/2026" — if that's stale,
the chef opens and re-saves. Their professional judgment handles freshness.
This eliminated Phase 4 (background cascade), Phase 6 (recursive sub-recipe
cascade), and the `allergen_stale` flag — dropping scope from 7-10 to 5-7
sessions.

---

## Architecture Decisions

| # | Decision | Resolution | Status |
|---|---|---|---|
| 1 | Background cascade on MIL change? | **NO** — `allergen_declared_at` timestamp handles freshness | ✅ Resolved |
| 2 | Stale declaration flag? | **Replaced** by timestamp — card shows "current to MM/DD/YYYY" | ✅ Resolved |
| 3 | Cascade chain MIL → Prepared → Final Plate? | **Mechanics unchanged** — storage format only | ✅ Resolved |
| 4 | Environment tier in version detection? | MINOR (same as May Contain) | Recommended |
| 5 | Consolidate extractFromMasterIngredient? | YES — shared allergenUtils.ts | Recommended |

---

## Files Modified This Session

| File | Change |
|---|---|
| `src/.../RecipeEditor/VersionHistory.tsx` | L5 visual polish (3 fixes) |
| `docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md` | **NEW** — full migration roadmap |
| `docs/ALLERGEN-DATA-FLOW-REVIEW.md` | **NEW** — architecture review |
| `docs/ALLERGEN-MANAGER.md` | Updated recipes table schema section |
| `docs/ALLERGEN-DECLARATION-ARCHITECTURE.md` | Added boolean migration section |
| `docs/handoffs/HANDOFF-SESSION-79-VersionStatus-L5-Complete.md` | Updated earlier in session |

---

## Next Session Options

### Option A: Start Phase 1 (Database Migration)
- Add 76 columns (75 booleans + `allergen_declared_at` timestamp)
- Backfill from existing allergenInfo JSONB
- Create indexes
- Zero risk — additive, non-breaking

### Option B: Continue Recipe Viewer Tabs
- Method tab, Production tab, etc. from Kitchen roadmap
- Allergen migration can wait for a dedicated sprint

### Option C: Phase 1 + Phase 2 Combined
- Run database migration + shared utility + dual-write in one session
- Architecture is clean and decided — ready to build

---

*Session 79: Started as visual polish, ended as a full allergen architecture
review. The discrepancy between card and declaration wasn't a bug — it was
the architecture telling us the JSONB pattern can't scale.*

---

**Document Version:** 2.0 (expanded from L5-only to include architecture review)
**Created:** February 7, 2026
