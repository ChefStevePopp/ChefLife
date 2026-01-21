# ChefLife User Education Standards

> **Version:** 1.0  
> **Created:** January 21, 2026  
> **Status:** Active - Establishing patterns from Food Relationships L5

---

## Philosophy

ChefLife serves users from **Day 1 taco truck owners** to **Day 90 multi-unit operators**. Our education system must:

1. **Get out of the way** for experienced users
2. **Gently guide** new users without condescension  
3. **Build confidence** through progressive disclosure
4. **Never block** — education enhances, never gates

---

## The Education Hierarchy

### Level 1: Page Header (Parent Level)
**Component:** Expandable "About X" section  
**Location:** Top of page, in header card  
**Visibility:** Collapsed by default, user can expand  
**Purpose:** Big-picture overview of the feature

```
┌─────────────────────────────────────────────────────────────┐
│ ⓘ About Operations                                      ∧  │
├─────────────────────────────────────────────────────────────┤
│ Operations defines the vocabulary your business uses —      │
│ how you measure ingredients, where you store items...       │
└─────────────────────────────────────────────────────────────┘
```

**When to use:** Every major feature page (Operations, VIM, Recipe Manager, etc.)

---

### Level 2: Guided Mode Toggle
**Component:** `<GuidedModeToggle />`  
**Location:** Subheader, right side  
**Visibility:** Always visible, toggle ON/OFF  
**Purpose:** User controls whether they see contextual tips

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search...                              [🎓 Guide] [👁 Archived] │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- OFF (default for returning users): No tips shown
- ON: GuidanceTips appear throughout the interface

**Persistence:** LocalStorage (`cheflife-guided-mode`)

---

### Level 3: Guidance Tips (Contextual)
**Component:** `<GuidanceTip color="blue|green|amber|rose">`  
**Location:** Inline, near the element they explain  
**Visibility:** Only when Guided Mode is ON  
**Purpose:** Contextual education for specific sections

```tsx
<GuidanceTip color="green">
  Top-level buckets. System groups (🔒) are locked — 
  you can archive them but not delete.
</GuidanceTip>
```

**Colors:**
| Color | Usage |
|-------|-------|
| `blue` | Primary/overview tips |
| `green` | Success/confirmation context |
| `amber` | Warnings/important notes |
| `rose` | Critical/destructive context |

**Writing style:**
- **DO:** "Top-level buckets. System groups are locked."
- **DON'T:** "This section contains the major groups which are the top-level organizational units in the taxonomy hierarchy system."

Keep tips to **1-2 sentences max**. If it needs more, it belongs in documentation.

---

### Level 4: Tooltips (Element Level)
**Component:** Native `title` attribute or custom tooltip  
**Location:** On specific elements (icons, buttons)  
**Visibility:** On hover  
**Purpose:** Quick reference for iconography

```tsx
<Lock 
  className="w-3.5 h-3.5 text-amber-500" 
  title="System group — cannot delete" 
/>
```

**When to use:**
- Icon-only buttons (Edit, Archive, etc.)
- Status indicators (Lock, Recipe badge)
- Abbreviated text

---

### Level 5: Empty States
**Location:** Where content would normally appear  
**Visibility:** When no data exists  
**Purpose:** Guide user to take action OR explain why empty

**Pattern A: Call to Action**
```
┌─────────────────────────────────────────┐
│           📂                            │
│    No Categories Set Up                 │
│                                         │
│    Start by adding major groups...      │
│                                         │
│    [+ Add Major Group]                  │
└─────────────────────────────────────────┘
```

**Pattern B: Selection Required**
```
┌─────────────────────────────────────────┐
│                                         │
│       Select a major group              │
│                                         │
└─────────────────────────────────────────┘
```

**Pattern C: No Results**
```
┌─────────────────────────────────────────┐
│                                         │
│    No categories match search           │
│                                         │
└─────────────────────────────────────────┘
```

---

### Level 6: Inline Validation
**Location:** Below form fields  
**Visibility:** On error or when guidance needed  
**Purpose:** Immediate feedback on user input

```tsx
{editingItem.is_system && (
  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
    <Lock className="w-3 h-3" /> System group — name locked
  </p>
)}
```

---

## Visual Language

### Icons with Meaning

| Icon | Meaning | Example |
|------|---------|---------|
| 🔒 `<Lock>` | System/protected item | System groups |
| 🎓 `<GraduationCap>` | Guided mode | Toggle button |
| ✨ `<Sparkles>` | Tip/guidance | GuidanceTip icon |
| 👁 `<Eye>` | Show hidden | Archived toggle |
| 📂 `<FolderTree>` | Category/taxonomy | Food Relationships |

### Badges

| Badge | Usage |
|-------|-------|
| `recipe` (blue) | Marks groups that are recipe types |
| `system` (amber) | Could mark system items explicitly |
| `new` (green) | Recently added items |

---

## Subheader Standard

Every tabbed content area should have a subheader card:

```tsx
<div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
  <div className="flex items-center justify-between gap-4">
    {/* Left: Search/Filter */}
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder="Search..."
        className="w-full pl-9 pr-8 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg text-sm"
      />
    </div>

    {/* Right: Controls */}
    <div className="flex items-center gap-2">
      <GuidedModeToggle />
      {/* Other toggles: Archived, View mode, etc. */}
    </div>
  </div>
</div>
```

---

## Implementation Checklist

When building a new L5 component:

- [ ] **Page header** has expandable "About X" section
- [ ] **Subheader** includes GuidedModeToggle (if complex feature)
- [ ] **GuidanceTips** exist for each major section (visible in guided mode)
- [ ] **Empty states** are educational, not just "No data"
- [ ] **Icon buttons** have `title` tooltips
- [ ] **System/locked items** have visual indicator + tooltip
- [ ] **Form validation** shows inline guidance

---

## Examples in Codebase

| Pattern | File | 
|---------|------|
| GuidedModeProvider | `src/shared/components/L5/GuidedModeContext.tsx` |
| GuidanceTip | `src/shared/components/L5/GuidanceTip.tsx` |
| Food Relationships (full example) | `src/features/admin/components/sections/FoodRelationshipsManager/index.tsx` |
| Ingredient Detail (full example) | `src/features/admin/components/sections/recipe/MasterIngredientList/IngredientDetailPage/index.tsx` |
| Operations (page header) | `src/features/admin/components/sections/Operations/Operations.tsx` |

---

## Anti-Patterns

### ❌ Don't: Wall of Text
```tsx
<GuidanceTip>
  This is the food relationships manager which allows you to configure 
  the hierarchical taxonomy structure used throughout the ChefLife 
  application for organizing ingredients, recipes, and generating 
  reports with proper categorization at multiple levels of granularity.
</GuidanceTip>
```

### ✅ Do: Concise & Scannable
```tsx
<GuidanceTip>
  <strong>Your taxonomy</strong> — like folders on a computer. Major Groups 
  are big folders, Categories are subfolders, Sub-Categories are items inside.
</GuidanceTip>
```

### ❌ Don't: Condescending
```tsx
<GuidanceTip>
  Click the blue "Add" button to add a new item. The button is located 
  in the top right corner of each column.
</GuidanceTip>
```

### ✅ Do: Assume Intelligence
```tsx
<GuidanceTip>
  System groups (🔒) are locked — you can archive them but not delete.
</GuidanceTip>
```

---

## Future Enhancements

1. **First-run wizard** — Guided setup for new organizations
2. **Contextual help panel** — Slide-out with deeper documentation
3. **Video tooltips** — Short clips for complex interactions
4. **Progress indicators** — "3 of 7 setup steps complete"
5. **Smart defaults** — Pre-populate based on business type

---

*This document is a living standard. Update as patterns evolve.*
