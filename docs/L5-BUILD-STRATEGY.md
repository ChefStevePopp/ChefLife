# ChefLife L5 Build Strategy

**Purpose:** A repeatable 6-phase approach for building enterprise-grade UI components from scratch or upgrading existing features to L5 polish.

**Use with:** Handoff documentation (feature specs) + UTILS.md (utility reference)

---

## Philosophy

> "Let the color of the headline draw the eye... it's not quite the vibe until it's subtle."

ChefLife's L5 design language prioritizes:
- **Clarity over decoration** — neutral card backgrounds, colored icons/titles only
- **Progressive disclosure** — expandable info sections, tooltips over clutter
- **Symmetry and rhythm** — consistent spacing, card grids that flow
- **Power user respect** — keyboard shortcuts, bulk actions, smart defaults
- **Real-time feedback** — floating action bars, optimistic updates, live previews

---

## The 6 Phases

### Phase 1: Foundation
**Time:** 30-60 min  
**Goal:** Stop the blank screen, establish structure

**Deliverables:**
- [ ] Route(s) registered in AdminRoutes.tsx
- [ ] Folder structure created
- [ ] Main component with L5 header (back button, icon, title, subtitle)
- [ ] Loading skeleton (not spinner)
- [ ] Empty state with clear CTA
- [ ] Basic data fetch (even if no data exists yet)

**L5 Header Pattern:**
```tsx
<div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700 rounded-lg">
        <ArrowLeft className="w-5 h-5 text-gray-400" />
      </button>
      <div className="w-10 h-10 rounded-lg bg-{color}-500/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-{color}-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">Title</h1>
        <p className="text-gray-400 text-sm">Subtitle description</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {/* Primary action button */}
    </div>
  </div>
</div>
```

---

### Phase 1.2: Card Design
**Time:** 30-45 min  
**Goal:** Get the visual rhythm right before adding complexity

**Deliverables:**
- [ ] Card component with consistent structure
- [ ] Status pills (Active/Draft/Archived patterns)
- [ ] Icon + title alignment
- [ ] Metadata row (stats, dates, counts)
- [ ] Action buttons (Edit, Preview, etc.)
- [ ] Hover states

**Card Pattern:**
```tsx
<div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-gray-600 transition-colors">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-{color}-400" />
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
    <StatusPill status={status} />
  </div>
  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
    <span>Category: {category}</span>
    <span>•</span>
    <span>Last used: {date}</span>
  </div>
  <div className="mt-3 flex justify-end gap-2">
    <ActionButton>Edit</ActionButton>
    <ActionButton>Preview</ActionButton>
  </div>
</div>
```

**Status Pill Classes:**
```typescript
const statusClasses = {
  active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  archived: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
};
```

---

### Phase 2: Search & Filter
**Time:** 45-60 min  
**Goal:** High user impact — let users find what they need fast

**Deliverables:**
- [ ] Search input with debounce (300ms)
- [ ] Filter dropdowns (category, status, etc.)
- [ ] Sort dropdown
- [ ] Clear filters button
- [ ] Result count display
- [ ] Filters reset page to 1

**Search Pattern:**
```tsx
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 300);

// Filter logic
const filtered = items.filter(item => 
  item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
  (categoryFilter === 'all' || item.category === categoryFilter) &&
  (statusFilter === 'all' || item.status === statusFilter)
);
```

**Filter Bar Pattern:**
```tsx
<div className="flex flex-wrap items-center gap-3">
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
    <input
      type="text"
      placeholder="Search..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white"
    />
  </div>
  <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white">
    <option value="all">All Categories</option>
    {/* options */}
  </select>
</div>
```

---

### Phase 3: Pagination
**Time:** 30-45 min  
**Goal:** Handle scale gracefully

**Deliverables:**
- [ ] Items per page (default: 12)
- [ ] Previous/Next buttons
- [ ] "Page X of Y" display
- [ ] "Show all" toggle (optional)
- [ ] Page resets when filters change
- [ ] Only shows when items exceed page size

**Pagination Pattern:**
```tsx
const ITEMS_PER_PAGE = 12;
const [currentPage, setCurrentPage] = useState(1);
const [showAll, setShowAll] = useState(false);

const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const displayed = showAll 
  ? filtered 
  : filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

// Reset page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [debouncedSearch, categoryFilter, statusFilter]);
```

**Pagination UI:**
```tsx
{totalPages > 1 && !showAll && (
  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
    <button 
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="px-3 py-1.5 rounded-lg bg-gray-700 disabled:opacity-50"
    >
      Previous
    </button>
    <span className="text-sm text-gray-400">
      Page {currentPage} of {totalPages}
    </span>
    <button 
      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="px-3 py-1.5 rounded-lg bg-gray-700 disabled:opacity-50"
    >
      Next
    </button>
  </div>
)}
```

---

### Phase 4: Sorting
**Time:** 20-30 min  
**Goal:** Let users organize data their way

**Deliverables:**
- [ ] Sort dropdown with options
- [ ] Ascending/descending toggle (optional)
- [ ] Visual indicator of current sort
- [ ] Sensible default sort

**Sort Pattern:**
```tsx
type SortOption = 'name' | 'created' | 'updated' | 'usage';
const [sortBy, setSortBy] = useState<SortOption>('updated');

const sorted = [...filtered].sort((a, b) => {
  switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'created':
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    case 'updated':
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    case 'usage':
      return b.send_count - a.send_count;
    default:
      return 0;
  }
});
```

---

### Phase 5: Core Feature Build
**Time:** 2-4 hours (varies by complexity)  
**Goal:** Build the main functionality

This phase is feature-specific. Examples:
- **The Roster:** Bulk actions with floating bar
- **Team Performance:** Config panels with toggles
- **Communications:** Template editor with live preview

**Common Patterns:**

**Floating Action Bar (unsaved changes):**
```tsx
{hasChanges && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <div className="bg-gray-900/95 border border-amber-500/30 rounded-xl px-6 py-3 shadow-2xl">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">Unsaved changes</span>
        <button onClick={handleUndo} className="btn-ghost">
          <RotateCcw className="w-4 h-4" /> Undo
        </button>
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
    </div>
  </div>
)}
```

**Two-Column Editor:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="space-y-4">
    {/* Form inputs */}
  </div>
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
    {/* Live preview */}
  </div>
</div>
```

**Expandable Info Section:**
```tsx
<div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
  <button
    onClick={() => setExpanded(!expanded)}
    className="w-full flex items-center gap-3 p-4 text-left"
  >
    <Info className="w-4 h-4 text-gray-400" />
    <span className="text-sm text-gray-400 flex-1">How this works</span>
    <ChevronUp className={`w-4 h-4 transform transition-transform ${expanded ? '' : 'rotate-180'}`} />
  </button>
  {expanded && (
    <div className="px-4 pb-4">
      <p className="text-sm text-gray-400">...</p>
    </div>
  )}
</div>
```

---

### Phase 6: Polish
**Time:** 30-60 min  
**Goal:** Enterprise-grade finishing touches

**Deliverables:**
- [ ] Keyboard shortcuts (if applicable)
- [ ] Smooth animations/transitions
- [ ] Loading states for all async actions
- [ ] Error handling with toast notifications
- [ ] Omega-only diagnostic text
- [ ] Accessibility (focus states, aria labels)

**Keyboard Shortcuts Pattern:**
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === '/' && !isInputFocused) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === 'ArrowLeft' && currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
    if (e.key === 'ArrowRight' && currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentPage, totalPages]);
```

**Omega Diagnostic Text:**
```tsx
{isOmega && (
  <div className="text-xs text-gray-500 font-mono">
    src/features/admin/components/sections/Feature/index.tsx
  </div>
)}
```

---

## UX Cohesion Standards

These standards ensure visual and interaction consistency across all ChefLife modules.

### Navigation Depth

**Maximum 3 levels of nesting:**
```
Config → List → Detail (with tabs)
  1        2           3
```

**Anti-pattern (avoid):**
```
Config → List → Editor → Preview → Send
  1        2       3         4        5
```

When a feature needs multiple concerns (edit, preview, send), use **tabs within the detail view** rather than separate routes.

### Tabbed Interfaces

Use tabs when a module has multiple concerns that benefit from context preservation and reduced navigation depth.

**Reference Implementations:**
- `src/features/team/components/TeamPerformance/index.tsx` — Gold standard (7 tabs)
- `src/features/admin/components/sections/Communications/Communications.tsx` — Module config + list combined

**The Pattern:**
```
┌─ Header Card ──────────────────────────────────────┐
│ Icon + Title + Stats                               │
│ Platform status / contextual info                  │
│ Expandable info section                            │
└────────────────────────────────────────────────────┘

┌─ Tabs + Content Card ──────────────────────────────┐
│ [Tab 1]  [Tab 2]  [Tab 3]                         │
│ ───────────────────────────────────────────────── │
│ Tab content renders here based on activeTab       │
└────────────────────────────────────────────────────┘
```

**Route Simplification with Tabs:**
```
// Before: Separate routes for config and list
/admin/modules/communications           → Config page
/admin/modules/communications/templates → List page (extra click)

// After: Tabs combine them
/admin/modules/communications           → Library tab (default)
/admin/modules/communications?tab=settings → Settings tab
```

**Tab buttons with L5 styling:**
```tsx
<div className="flex items-center gap-2">
  <button className={`tab primary ${activeTab === 'library' ? 'active' : ''}`}>
    <Library className="w-4 h-4" />
    Library
  </button>
  <button className={`tab green ${activeTab === 'settings' ? 'active' : ''}`}>
    <Settings className="w-4 h-4" />
    Settings
  </button>
</div>
```

**Modular Tab Components:**

Keep tab content in separate files for maintainability:
```
Communications/
├── Communications.tsx      # ~300 lines - orchestrator only
├── components/
│   ├── LibraryTab.tsx      # Self-contained tab
│   ├── SettingsTab.tsx     # Self-contained tab
│   ├── StoreTab.tsx        # Future tab (one file to add)
│   └── ...
```

Each tab component owns:
- Its own state
- Its own data fetching  
- Its own NEXUS logging
- Its own UI

The orchestrator stays slim (~300 lines max).

**Tab Color Progression (from index.css):**

| Position | Color | Class | Use For |
|----------|-------|-------|--------|
| 1st | Blue | `.primary` | Primary/default tab |
| 2nd | Green | `.green` | Content, success states |
| 3rd | Amber | `.amber` | Review, warnings, pending |
| 4th | Rose | `.rose` | Danger, deletions |
| 5th | Purple | `.purple` | HR, people, special |
| 6th | Lime | `.lime` | Fresh, new items |
| 7th | Red | `.red` | Critical actions |
| 8th | Cyan | `.cyan` | Info, secondary blue |

*Blues bookend the row for visual balance when using full progression.*

**Tab Anatomy:**
- Icon (Lucide, 4x4) + Label
- Active: white text, colored top bar, `bg-gray-800`
- Inactive: gray text, muted icon, hover reveals

### Icon Standard

**Lucide Icons only.** No mixing icon libraries.

```tsx
// ✅ Correct
import { FileText, Code, Eye, Send } from "lucide-react";

// ❌ Wrong - don't mix libraries
import { FaFile } from "react-icons/fa";
import { MdCode } from "react-icons/md";
```

**Icon Sizes:**
| Context | Size | Class |
|---------|------|-------|
| Inline with text | 4x4 | `w-4 h-4` |
| Card headers | 5x5 | `w-5 h-5` |
| Empty states | 8x8 to 12x12 | `w-8 h-8` / `w-12 h-12` |
| Page headers | 5x5 in icon box | `w-5 h-5` |

**Icon Box Pattern (headers):**
```tsx
<div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
  <Mail className="w-5 h-5 text-amber-400" />
</div>
```

---

## CSS Component Library

**Location:** `src/index.css`

ChefLife maintains a centralized CSS component library for reusable patterns. Always check here before writing inline styles or duplicating patterns.

### Core Components (from `@layer components`)

| Class | Purpose | Usage |
|-------|---------|-------|
| `.card` | Standard card container | `bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-xl` |
| `.btn` | Button base | Flex, centered, rounded, with transitions |
| `.btn-primary` | Primary action | Blue background with hover |
| `.btn-secondary` | Secondary action | Gray background |
| `.btn-ghost` | Subtle action | Transparent with border |
| `.btn-ghost-red` | Danger ghost | Red text, red hover |
| `.btn-ghost-green` | Success ghost | Green text, green hover |
| `.btn-ghost-amber` | Warning ghost | Amber text, amber hover |
| `.btn-ghost-primary` | Primary ghost | Blue text, blue hover |
| `.input` | Standard text input | Dark background, border, focus ring |
| `.tab` | Tab navigation button | With color variants (see UX Cohesion) |
| `.tab.active` | Active tab state | White text, colored top bar |
| `.expandable-info-section` | Collapsible info panel | Use with `.expanded` class toggle |
| `.expandable-kanban-section` | Collapsible kanban panel | Alternative expandable style |

### Animation Classes

| Class | Effect |
|-------|--------|
| `.animate-slide-in-right` | Slide in from right |
| `.animate-in.slide-in-from-left-2` | Slide in from left |
| `.animate-in.slide-in-from-right-2` | Slide in from right |
| `.animate-in.fade-in` | Fade in |
| `.mobile-nav-appear` | Mobile navigation slide up |
| `.task-updated` | Green pulse for updated items |

### Floating Action Bar

```html
<div class="floating-action-bar">           <!-- or .warning, .danger, .success -->
  <div class="floating-action-bar-inner">
    <div class="floating-action-bar-content">
      <!-- Your content -->
    </div>
  </div>
</div>
```

**Variants:** `.warning` (amber), `.danger` (rose), `.success` (emerald)

### Toggle Switch

```html
<label class="toggle-switch">       <!-- or .emerald, .amber, .rose -->
  <input type="checkbox" />
  <div class="toggle-switch-track" />
</label>
```

**Variants:** `.emerald`, `.amber`, `.rose` (default is primary blue)

### Specialized Components

| Class | Purpose | Location |
|-------|---------|----------|
| `.highlighted-editor` | Code editor with syntax highlighting | TemplateEditor |
| `.highlighted-editor-backdrop` | Syntax highlight layer | TemplateEditor |
| `.highlighted-editor-textarea` | Transparent input layer | TemplateEditor |
| `.merge-field` | Highlighted merge field tag | TemplateEditor |
| `.toggle-switch` | On/off toggle switch | Config pages |
| `.toggle-switch-track` | Toggle switch track element | Config pages |
| `.stage-dropdown` | Wider dropdown for recipe stages | Recipe components |

### Utility Classes

| Class | Purpose |
|-------|--------|
| `.scrollbar-thin` | Thin scrollbar with hover reveal |
| `.pb-safe` | Safe area padding for mobile |
| `.line-clamp-1/2/3` | Text truncation |
| `.text-2xs` | Extra small text (0.65rem) |
| `.text-balance` | Balanced text wrapping |
| `.text-pretty` | Pretty text wrapping |

### Adding New CSS Components

When adding reusable styles:
1. Add to `src/index.css` in appropriate `@layer` section
2. Include a comment header describing the component
3. Document in this strategy file
4. Remove any inline `<style>` tags from components

---

## L5 Color Palette

Use these consistently across all L5 components:

| Purpose | Color | Tailwind Classes |
|---------|-------|------------------|
| Primary actions | Blue | `bg-primary-500`, `text-primary-400` |
| Success/Active | Emerald | `bg-emerald-500/20`, `text-emerald-400` |
| Warning/Pending | Amber | `bg-amber-500/20`, `text-amber-400` |
| Danger/Error | Rose | `bg-rose-500/20`, `text-rose-400` |
| Info | Sky | `bg-sky-500/20`, `text-sky-400` |
| Neutral | Gray | `bg-gray-500/20`, `text-gray-400` |
| HR/People | Purple | `bg-purple-500/20`, `text-purple-400` |
| Operations | Cyan | `bg-cyan-500/20`, `text-cyan-400` |

**Card Background:** `bg-gray-800/50` (never colored backgrounds on cards)  
**Border:** `border-gray-700/50`  
**Hover Border:** `hover:border-gray-600`

---

## Template: Phase Planning

When starting a new feature, copy this template:

```markdown
## [Feature Name] — L5 Build Plan

### Phase 1: Foundation
- [ ] Routes in AdminRoutes.tsx
- [ ] Folder: src/features/admin/components/sections/[Feature]/
- [ ] Main component with L5 header
- [ ] Loading skeleton
- [ ] Empty state

### Phase 1.2: Card Design
- [ ] [Item]Card.tsx component
- [ ] Status pills
- [ ] Metadata row
- [ ] Action buttons

### Phase 2: Search & Filter
- [ ] Search with debounce
- [ ] [Filter 1] dropdown
- [ ] [Filter 2] dropdown
- [ ] Clear filters

### Phase 3: Pagination
- [ ] 12 items per page
- [ ] Previous/Next
- [ ] Page indicator
- [ ] Reset on filter change

### Phase 4: Sorting
- [ ] Sort by [option 1]
- [ ] Sort by [option 2]
- [ ] Default: [option]

### Phase 5: Core Feature
- [ ] [Main feature 1]
- [ ] [Main feature 2]
- [ ] [Main feature 3]

### Phase 6: Polish
- [ ] Keyboard shortcuts
- [ ] Animations
- [ ] Error handling
- [ ] Omega diagnostics
```

---

## Success Criteria

A feature is L5 complete when:

1. **No blank screens** — every route has a component
2. **Loading states** — skeletons, not spinners
3. **Empty states** — clear messaging with CTA
4. **Search works** — users find things fast
5. **Filters work** — category, status, etc.
6. **Pagination** — handles 100+ items gracefully
7. **Sorting** — at least 2-3 options
8. **Keyboard accessible** — tab navigation, escape closes modals
9. **Error handling** — toast notifications, not silent failures
10. **Omega diagnostics** — file path visible for debugging
11. **Consistent styling** — follows L5 color palette and patterns
12. **Floating save bar** — for any form with unsaved changes

---

## References

- **UTILS.md** — Date utilities, formatters
- **src/index.css** — CSS component library (buttons, cards, animations)
- **tailwind.config.js** — Custom colors, fonts, fluid spacing
- **Handoff docs** — Feature specifications
- **ROADMAP-Communications.md** — Communications module roadmap

**Reference Implementations:**
- **Team Performance** — Gold standard tabbed interface (7 tabs, modular components)
- **Communications** — Tabbed module pattern (Library + Settings tabs, route simplification)
- **The Roster** — L5 list page (search, filter, pagination, bulk actions)
- **TemplateEditor** — L5 editor with header-to-tabs pattern

---

*Last updated: January 8, 2026*

---

## Changelog

**Jan 8, 2026 (PM):**
- Added Communications module as second tabbed interface reference
- Documented route simplification pattern (tabs reduce clicks)
- Added modular tab component structure (orchestrator + tab files)
- Updated tabbed interface visual diagram

**Jan 8, 2026 (AM):**
- Added UX Cohesion Standards (navigation depth, tabbed interfaces, icon standard)
- Added Tab Color Progression reference
- Documented Lucide-only icon policy
- Added toggle switch to CSS component library
- Added highlighted editor styles reference
