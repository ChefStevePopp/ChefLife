# Session 73 Starter — Inline Pending Changes Panel + Allergen-Aware Auto-Suggestions

**Session:** 73
**Predecessor:** Session 72 (HANDOFF-SESSION-72-RecipeVersioning-Supersession.md)
**Focus:** Layer 3 of 7-layer allergen-version integration
**Goal:** Replace the version bump modal with a persistent inline panel that detects changes and auto-suggests the appropriate communication tier.

---

## Context

Session 72 built Layers 1+2:
- **Layer 1:** MAJOR.MINOR.PATCH format migration in VersionHistory.tsx
- **Layer 2:** Communication tier labels (Patch=Silent, Minor=Broadcast, Major=Mandatory)

The current implementation uses a modal with a 3-column card selector. It works but was identified as **insufficient for life-safety decisions**. A dismissable popup doesn't carry the weight that allergen versioning demands.

---

## What to Build

### Inline Pending Changes Panel

A permanent panel on the Version History tab that appears when the recipe has unsaved changes compared to the last saved version. Not a modal. Not dismissable. Always visible when changes exist.

```
┌─ Version History Tab ──────────────────────────────────────────────┐
│                                                                     │
│  ┌─ PENDING CHANGES ─────────────────────────────────────────────┐ │
│  │  ▸ Detected Changes (3)                                       │ │
│  │    • Added "Peanut Butter" (CONTAINS: Peanuts)     → MAJOR    │ │
│  │    • Removed "Almond Flour"                        → MINOR    │ │
│  │    • Yield changed: 12 → 16 portions               → MINOR    │ │
│  │                                                                │ │
│  │  Suggested Tier: ██ MAJOR — New CONTAINS allergen detected     │ │
│  │  ⚠ Cannot downgrade — allergen safety floor                    │ │
│  │                                                                │ │
│  │  Notes: [________________________________] (required for MAJOR) │ │
│  │                                                                │ │
│  │  [ Create v2.0.0 — Mandatory Meeting Required ]                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Version History:                                                   │
│  v1.1.0 [Broadcast] — Jan 15, 2026 — "Adjusted yield for catering" │
│  v1.0.0 [Published]  — Jan 1, 2026  — "Initial recipe"             │
└─────────────────────────────────────────────────────────────────────┘
```

### Change Detection Rules

| Detected Change | Auto-Suggested Tier | Reasoning |
|-----------------|---------------------|-----------|
| Notes, formatting, cross-contact wording | PATCH | Trust management — silent |
| Ingredient added (no new allergen) | MINOR | Broadcast — team reviews |
| Ingredient removed | MINOR | Broadcast — team reviews |
| Yield changed | MINOR | Broadcast — affects portioning |
| Method step changed | MINOR | Broadcast — affects technique |
| New CONTAINS allergen | **MAJOR** (floor) | Mandatory — life safety |
| Allergen REMOVED | **MAJOR** (floor) | Mandatory — "false confidence kills too" |
| Ingredient swap | MAJOR | Mandatory — potential allergen change |

**Critical rule:** Operator can escalate (PATCH → MINOR → MAJOR) but NEVER downgrade when a safety floor is set.

### Architecture Requirement

The panel needs to know **what changed since the last saved version**. This means:

1. **Snapshot at load** — When recipe loads, snapshot the ingredient list, allergens, yield, method
2. **Compare on render** — VersionHistory tab compares current editor state vs snapshot
3. **Categorize changes** — Each change maps to a suggested tier
4. **Take highest** — Final suggestion = MAX(all individual suggestions)

This likely means a **change detection context or hook** that the RecipeEditor provides and VersionHistory consumes.

**Possible approach:**
```typescript
// Hook that lives in RecipeEditor, passed to VersionHistory
const useRecipeChangeDetection = (recipe: Recipe, lastVersion: RecipeVersion) => {
  // Compare current recipe state vs last version snapshot
  // Return: { changes: Change[], suggestedTier: 'patch' | 'minor' | 'major', tierReason: string }
};
```

---

## Files to Touch

| File | Action |
|------|--------|
| `VersionHistory.tsx` | Replace modal with inline panel, consume change detection |
| New: `useRecipeChangeDetection.ts` | Hook that compares current state to last version |
| `RecipeDetailPage.tsx` or `RecipeEditor.tsx` | May need to pass current state down to VersionHistory |

---

## Design Notes

- Panel uses `bg-rose-500/10 border-rose-500/30` when MAJOR is suggested (life safety = rose)
- Panel uses `bg-amber-500/10 border-amber-500/30` when MINOR is suggested
- Panel uses `bg-gray-800/50 border-gray-700/50` when PATCH is suggested
- "Cannot downgrade" warning uses the L5 `expandable-info-section` pattern
- Commit button inherits tier color (same pattern as current modal)
- Panel collapses to a summary line when no changes detected: "No changes since v1.2.0"

---

## Stretch Goals (if time permits)

1. **Retire & Reissue button** — Add to VersionHistory tab below the version list. Uses Supersession Pattern (PATTERN-Supersession.md).
2. **RecipeCard cleanup** — Find remaining consumers of old `RecipeCard/index.tsx` and migrate to `RecipeCardL5`.
3. **Layer 4 — Ingredient hash tripwire** — SHA of ingredient list stored per version, amber warning when stale.

---

## Key Documents

- `HANDOFF-SESSION-72-RecipeVersioning-Supersession.md` — What was built in session 72
- `docs/ALLERGEN-DECLARATION-ARCHITECTURE.md` — 7-layer integration plan
- `docs/patterns/PATTERN-Supersession.md` — Supersession Pattern
- `docs/promises/PROMISE-Nothing-Erased.md` — Platform promise
- `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` — Current implementation

---

*"This panel is where life-safety decisions live. It deserves weight and gravitas."*
