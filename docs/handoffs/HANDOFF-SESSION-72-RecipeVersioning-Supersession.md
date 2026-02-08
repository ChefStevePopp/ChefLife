# HANDOFF — Session 72: Recipe MAJOR.MINOR.PATCH Versioning + Supersession Pattern
## Communication Tiers, Version Format Migration, Platform Architecture Docs

**Session:** 72
**Date:** February 6, 2026
**Focus:** Recipe versioning upgrade (Layers 1+2 of 7-layer allergen integration) + platform pattern documentation
**Status:** Layers 1+2 complete. Pattern docs created. Ready for Layer 3 (inline panel + change detection).

---

## What Was Built

### 1. Version Format Migration (Layer 1)

**File:** `src/features/recipes/components/RecipeEditor/VersionHistory.tsx`

- **`normalizeVersion()`** function migrates legacy two-segment versions on read:
  - `"1.0"` → `"1.0.0"`, `"2.1"` → `"2.1.0"`
  - Applied to all version history entries at load time — no orphans
- Version bump state changed from `"major" | "minor"` to `"major" | "minor" | "patch"`
- Three next-version calculations: `nextPatchVersion`, `nextMinorVersion`, `nextMajorVersion`
- `createNewVersion()` handles all three bump types
- PATCH bumps preserve current recipe status (silent update)
- MINOR/MAJOR reset status to Draft

### 2. Communication Tier Labels (Layer 2)

**File:** Same — `VersionHistory.tsx`

Replaced version bump modal with 3-column inline card selector:

| Tier | Color | Label | Communication | Status Impact |
|------|-------|-------|---------------|---------------|
| PATCH | Gray | Trust management — silent | Notes, formatting, cross-contact wording | Keeps current status |
| MINOR | Amber | Broadcast review — team notified | Yield changes, new "may contain," method adjustments | Resets to Draft |
| MAJOR | Rose | Mandatory meeting + re-acknowledgment | New allergen CONTAINS, allergen removed, ingredient swap | Resets to Draft |

- Each card shows: version number, tier name, communication level, example changes, status impact
- Submit button color-coded by tier: `"Create 2.0.0 — Mandatory"`
- Toast messages tier-aware: `"Version 2.0.0 created — Mandatory meeting required"`
- MAJOR requires notes (button disabled until filled)
- `bumpType` field stored on version entries (`"patch" | "minor" | "major"`) — NEXUS-ready
- Version history list shows tier badges (Silent/Broadcast/Mandatory) with color coding

### 3. Platform Pattern Documentation

**File:** `docs/patterns/PATTERN-Supersession.md` — NEW

Platform-wide Supersession Pattern documenting:
- Schema shape: `superseded_at`, `superseded_by`, `supersedes_id`
- Query patterns: `WHERE superseded_at IS NULL` for active records
- Recursive CTE for full chain traversal
- UI treatment: grayed with forward/backward links
- Anti-patterns: never delete, never overwrite in place, never hide superseded
- Current implementations: Vendor Invoices, Allergen Declarations, Recipe Reissue (planned), Policies (future)

**File:** `docs/promises/PROMISE-Nothing-Erased.md` — NEW

Platform promise: "No record in ChefLife is ever silently erased."
- Ties to Natasha's Promise (allergen safety)
- Build rule: "If someone needs to prove what was here before, can they?"
- Tagline: "We don't erase your history. We help you build on it."

---

## Preceding Work (Same Session)

- **RecipeCardL5 consolidation** — RecipeManager now uses RecipeCardL5 instead of old RecipeCard component
- **Badge readability fix** — NEW/UPDATED badges use proper contrast colors
- **`updated_at` field fix** — was using `modified_at` (doesn't exist); permanent version detection uses `versions` array, not `updated_at` comparison
- **AllergenControl Supabase error** — fixed
- **Allergen Declaration versioning architecture** documented in `ALLERGEN-DECLARATION-ARCHITECTURE.md`

---

## Key Decisions

### Retire & Reissue (not Delete History)
When an operator wants to "start fresh" on a recipe:
1. **Retire** current recipe → `status = 'archived'`, full version history preserved
2. **Reissue** → new recipe created, inherits content, starts at `v1.0.0`
3. Bidirectional linking via `supersedes_id` / `superseded_by`
4. Old recipe shows "Superseded by [new recipe]" — clickable forward link
5. New recipe shows "Reissued from [Recipe Name] v3.2.1" — clickable backward link

### Automation Deferred (Layer 3)
The version bump modal works but was identified as insufficient for life-safety decisions. Next session replaces it with an **Inline Pending Changes Panel** that:
- Lives permanently on the VersionHistory tab (not a dismissable popup)
- Shows detected changes since last version
- Auto-suggests bump level with reasoning
- Cannot downgrade safety suggestions (CONTAINS change = MAJOR floor)
- Has "weight and gravitas" — always visible, not a casual modal

---

## What's Next

### Immediate (Next Session — Layer 3)

**Inline Pending Changes Panel + Allergen-Aware Auto-Suggestions**

This is the centerpiece. The panel replaces the modal and is the surface where change detection lives.

```
┌─ Version History Tab ──────────────────────────────────────────────┐
│                                                                     │
│  ┌─ PENDING CHANGES ─────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Detected Changes:                                             │ │
│  │  • Added "Peanut Butter" (CONTAINS: Peanuts)                   │ │
│  │  • Removed "Almond Flour"                                      │ │
│  │  • Yield changed: 12 → 16 portions                             │ │
│  │                                                                │ │
│  │  Suggested: MAJOR — New CONTAINS allergen detected             │ │
│  │  ⚠ Cannot downgrade — allergen safety floor                    │ │
│  │                                                                │ │
│  │  Notes: [________________________________]                     │ │
│  │                                                                │ │
│  │  [ Create v2.0.0 — Mandatory Meeting Required ]                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Version History:                                                   │
│  v1.1.0 — Broadcast — Jan 15, 2026                                 │
│  v1.0.0 — Published — Jan 1, 2026                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Automation rules:**
- Ingredient added/removed → auto-suggest MINOR
- New CONTAINS allergen → escalate to MAJOR
- Allergen removed → MAJOR ("false confidence kills too")
- Yield/method changes → MINOR
- Notes/formatting → PATCH
- Operator can escalate but NEVER downgrade safety suggestions

**Architecture requirement:** Needs a change detection context from the recipe editor that tracks what's different from last saved version.

### Soon After

- **Retire & Reissue** button on VersionHistory tab — first Supersession Pattern implementation in recipes
- **RecipeCard old component cleanup** — migrate remaining consumers to RecipeCardL5
- **Layer 4** — Ingredient hash tripwire (SHA comparison, amber warning when stale)

### Later (Needs Backend)

- **Layer 5** — NEXUS event emission from `bumpType`
- **Layer 6** — Smart card badges from NEXUS events
- **Layer 7** — Declaration table (needs Auth Identity Bridge)

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` | Full MAJOR.MINOR.PATCH upgrade, communication tiers, bumpType storage |
| `src/features/recipes/components/RecipeManager/index.tsx` | RecipeCardL5 swap, badge fixes, updated_at field fix |

## Files Created

| File | Purpose |
|------|---------|
| `docs/patterns/PATTERN-Supersession.md` | Platform-wide supersession architecture |
| `docs/promises/PROMISE-Nothing-Erased.md` | Platform promise — no silent deletion |
| `docs/ALLERGEN-DECLARATION-ARCHITECTURE.md` | Allergen declaration versioning (earlier in session) |

---

## Cross-References

- **7-Layer Integration Plan:** ALLERGEN-DECLARATION-ARCHITECTURE.md § Integration Layers
- **Versioning shared with Policies:** Same MAJOR.MINOR.PATCH + communication hierarchy (CHEFLIFE-ANATOMY.md § Compliance Shield)
- **Supersession Pattern:** PATTERN-Supersession.md (vendor invoices, allergen declarations, recipe reissue, policies)
- **Natasha's Promise:** ALLERGEN-DECLARATION-ARCHITECTURE.md § Natasha's Promise
- **Nothing Erased Promise:** PROMISE-Nothing-Erased.md

---

*Session 72 — "Nothing is ever silently erased."*
