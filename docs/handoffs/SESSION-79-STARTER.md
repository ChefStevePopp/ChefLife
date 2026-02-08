# Session 79 Starter — Version & Status Tab L5 Rebuild

**Session:** 79
**Predecessor:** Session 78 (HANDOFF-SESSION-78-VersionStatus-L5-Prep.md)
**Focus:** Apply L5 design patterns to the Version & Status tab
**Goal:** L5 header with expandable info, subheader CSS classes, visual hierarchy polish

---

## Context

Session 78 separated Recipe Status and Version History into distinct cards and reviewed L5 design docs. The component works but doesn't use L5 patterns. This session applies them.

---

## What to Build

### 1. L5 Header Card (Variant A: Simple Header)

Wrap the existing bare icon+title in a proper L5 header card with expandable info section.

**Reference:** `src/features/admin/components/sections/Operations/Operations.tsx`

**Pattern:**
```tsx
<div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
        <History className="w-5 h-5 text-purple-400" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Version & Status</h1>
        <p className="text-gray-400 text-sm">Recipe lifecycle and change history</p>
      </div>
    </div>

    {/* Expandable Info Section */}
    <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
      <button onClick={() => setIsInfoExpanded(!isInfoExpanded)}
        className="expandable-info-header w-full justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">About Version & Status</span>
        </div>
        <ChevronUp className="w-4 h-4 text-gray-400" />
      </button>
      <div className="expandable-info-content">
        <div className="p-4 pt-2 space-y-4">
          {/* Version System explanation */}
          {/* Status Workflow explanation */}
          {/* Safety Floor explanation */}
        </div>
      </div>
    </div>
  </div>
</div>
```

**CSS classes (from index.css — no inline needed):**
- `.expandable-info-section` → border, rounded, background
- `.expandable-info-header` → button styling with hover
- `.expandable-info-content` → animated max-height + blur transition
- ChevronUp auto-rotates when `.expanded` is on parent

### 2. Replace Inline Icon Styling with Subheader Classes

**Recipe Status card** — currently `w-9 h-9 rounded-lg bg-blue-500/20`:
```tsx
// Before
<div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
  <ClipboardCheck className="w-5 h-5 text-blue-400" />
</div>

// After
<div className="subheader-icon-box primary">
  <ClipboardCheck />
</div>
```

**Version History card** — currently `w-9 h-9 rounded-lg bg-purple-500/20`:
```tsx
// Before
<div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
  <GitBranch className="w-5 h-5 text-purple-400" />
</div>

// After
<div className="subheader-icon-box purple">
  <GitBranch />
</div>
```

Card titles → `.subheader-title` class.

### 3. Write Expandable Info Content

Three short sections in the expandable panel:

**Versioning:** Patch = silent/trust, Minor = broadcast/team notified, Major = mandatory meeting. Versions auto-create on save when changes are detected.

**Status:** Draft → Review → Approved → Archived. Each status has a specific meaning for kitchen readiness.

**Safety Floor:** When CONTAINS allergens change, the system locks to Major. Cannot be overridden. Customer safety is absolute.

### 4. Verify & Clean

- Build compiles clean (`npm run build`)
- Touch targets remain 44px+
- Omega diagnostics line stays
- No functionality changes to Pending Changes, Status, or Version History logic

---

## Key Files

| File | Action |
|------|--------|
| `src/features/recipes/components/RecipeEditor/VersionHistory.tsx` | Add L5 header, replace inline styles with CSS classes |
| `src/index.css` | Reference only — has all needed classes |
| `docs/L5-BUILD-STRATEGY.md` | Reference — Variant A header pattern |
| `src/features/admin/components/sections/Operations/Operations.tsx` | Reference — gold standard implementation |

---

## Do NOT Touch

- `useRecipeChangeDetection.ts` — working, tested
- Pending Changes panel logic — life safety
- Safety floor enforcement — non-negotiable
- Version creation + NEXUS events — wired and working
- Status confirmation dialog — functional

---

*"It takes the same time to build it right as to build it wrong then fix it."*
