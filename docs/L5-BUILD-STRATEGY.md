# ChefLife L5 Build Strategy

**Purpose:** A repeatable 6-phase approach for building enterprise-grade UI components from scratch or upgrading existing features to L5 polish.

**Use with:** Handoff documentation (feature specs) + UTILS.md (utility reference)

---

## Philosophy

### The Prime Directive: L5 From the Start

> **"We build L5 from the start — no MVP."**

Don't scaffold junk to polish later. Every component starts with:
- Proper L5 header structure
- Loading skeletons (not spinners)
- Empty states with clear CTAs
- Correct styling patterns

It takes the same time to build it right as to build it wrong then fix it.

### The Core Promise: Tech That Works For You, Not Against You

Before any design decision, ask:

> **"Does this work FOR the user or make them work for IT?"**

See: [PROMISE-Core-Philosophy.md](promises/PROMISE-Core-Philosophy.md)

This manifests as:
- **We Remember** — Filter settings persist, navigation knows context, history survives
- **We Learn** — Patterns improve suggestions, expertise trains the system
- **We Protect** — Audit trails build automatically, documentation is a byproduct
- **We Respect** — Don't block workflows, don't require perfection, don't waste time

---

### Design Principles

> "Let the color of the headline draw the eye... it's not quite the vibe until it's subtle."

ChefLife's L5 design language prioritizes:
- **Clarity over decoration** — neutral card backgrounds, colored icons/titles only
- **Progressive disclosure** — expandable info sections, tooltips over clutter
- **Symmetry and rhythm** — consistent spacing, card grids that flow
- **Power user respect** — keyboard shortcuts, bulk actions, smart defaults
- **Real-time feedback** — floating action bars, optimistic updates, live previews

### L6 — Respect the User's Time

L6 goes beyond polish. It's the difference between software that makes you work and software that works *for you*.

> "Phase 6 respects the user's craft. L6 respects their time."

**L6 Patterns:**
- **Filter-aware navigation** — Filter a list to 6 items, navigate through those 6 without losing context
- **Context preservation** — Filters persist across detail page visits (URL params or store)
- **One-click workflows** — Reduce multi-step processes to single actions where possible
- **Smart batch operations** — "Update all Dairy items" not "Click 85 times"
- **Non-blocking workflows** — Don't require perfection before progress (e.g., "Skip for Now")

**Reference Implementation:** Ingredient navigation system
- ExcelDataGrid exposes `onFilteredDataChange` callback
- Navigation store tracks filtered list context
- Detail page shows "3 of 6" with ← → buttons and keyboard arrows
- Guided mode explains the feature to new users

**The Test:** If a user filtered to 6 butter items, edited one, then had to re-filter to find the next — that's L5. If they just press → and stay in their butter context — that's L6.

---

### L7 (Future) — The System Learns

L7 is where ChefLife becomes intelligent. The system captures expertise and gives it back.

> "Teach it once, never again."

**L7 Patterns:**
- **Training data capture** — Every categorization, every mapping, every decision trains the model
- **Suggestions** — "47 similar items were categorized this way"
- **Auto-classification** — High-confidence items processed automatically
- **Corrections improve the model** — Wrong suggestions get corrected, system learns

**Reference Implementation:** VIM Import ML Training (in progress)
- `ml_training_mappings` captures vendor description → Common Name mappings
- `ml_training_feedback` logs accepted/corrected suggestions
- Confidence builds with repetition
- 5-year backfill creates initial training dataset

**The Test:** If the 100th "Chicken Thighs" categorization takes as long as the first — that's L6. If the system suggests "Chicken Thighs" with 95% confidence — that's L7.

See: [PROMISE-System-Learns.md](promises/PROMISE-System-Learns.md)

---

## Database Patterns

### Auth & Organization Relationship

**CRITICAL:** ChefLife has TWO tables that look similar but serve different purposes:

| Table | Purpose | Has `user_id`? | Use For |
|-------|---------|----------------|--------|
| `organization_roles` | Auth user → Organization link | ✅ Yes (`auth.uid()`) | RLS policies, permission checks |
| `organization_team_members` | HR roster / employee data | ❌ No (uses `email`) | Team display, scheduling, contact info |

**RLS Policy Pattern (copy this):**

```sql
-- Standard RLS for org-scoped tables
CREATE POLICY "Users can manage their organization's [table_name]"
    ON [table_name] FOR ALL
    USING (
        -- Check user belongs to this org via organization_roles
        EXISTS (
            SELECT 1 FROM organization_roles
            WHERE organization_id = [table_name].organization_id
            AND user_id = auth.uid()
        )
        -- OR dev override
        OR EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND u.raw_user_meta_data->>'system_role' = 'dev'
        )
    );
```

**With Role Restriction (owner/admin only):**

```sql
CREATE POLICY "Admins can manage [table_name]"
    ON [table_name] FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_roles
            WHERE organization_id = [table_name].organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
        OR EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND u.raw_user_meta_data->>'system_role' = 'dev'
        )
    );
```

**Common Mistake:** Using `organization_team_members` for RLS - this table has no `user_id` column!

**Reference Migrations:**
- `20240306000006_create_operations_settings.sql` - uses `organization_roles`
- `20240328000000_create_vendor_templates.sql` - older pattern (avoid)

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

There are two variants of L5 headers, both wrapped in a `bg-[#1a1f2b] rounded-lg shadow-lg p-4` card.

**Variant A: Simple Header** (Operations, Settings pages)
```tsx
// Reference: src/features/admin/components/sections/Operations/Operations.tsx
<div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
  <div className="flex flex-col gap-4">
    {/* Top row: Icon/Title */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Operations</h1>
          <p className="text-gray-400 text-sm">Define how your kitchen measures, stores, and categorizes</p>
        </div>
      </div>
    </div>

    {/* Expandable Info Section */}
    <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
      <button
        onClick={() => setIsInfoExpanded(!isInfoExpanded)}
        className="expandable-info-header w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">About Operations</span>
        </div>
        <ChevronUp className="w-4 h-4 text-gray-400" />
      </button>
      <div className="expandable-info-content">
        <div className="p-4 pt-2 space-y-4">
          {/* Info content here */}
        </div>
      </div>
    </div>
  </div>
</div>
```

**Variant B: Rich Header** (Team Performance, data-heavy pages)
```tsx
// Reference: src/features/team/components/TeamPerformance/index.tsx
<div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
  <div className="flex flex-col gap-4">
    {/* Top row: Icon/Title + Stats */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Icon + Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
          <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
        </div>
      </div>

      {/* Quick Stats Badge */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/30">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Team</div>
          <div className="text-lg font-semibold text-white">26</div>
        </div>
        {/* Conditional alert badges */}
        {alertCount > 0 && (
          <div className="px-3 py-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
            <div className="text-xs text-rose-400 uppercase tracking-wide">Tier 3</div>
            <div className="text-lg font-semibold text-rose-400">{alertCount}</div>
          </div>
        )}
      </div>
    </div>

    {/* Period Selector with Progress */}
    {selectedCycle && (
      <div className="space-y-2">
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center justify-between mb-2">
            {/* Period Dropdown */}
            <button className="flex items-center gap-2 hover:bg-gray-700/30 rounded-lg px-2 py-1">
              <Calendar className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-300">Jan-Apr 2026</span>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                Current
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs text-gray-500">Day 9 of 120</span>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500" style={{ width: '7.5%' }} />
            </div>
            <span className="text-xs text-gray-400">Jan 1, 2026 — Apr 30, 2026</span>
          </div>
        </div>
      </div>
    )}

    {/* Expandable Info Section */}
    <div className="expandable-info-section mt-4">
      {/* Same pattern as Variant A */}
    </div>
  </div>
</div>
```

**When to use which:**
| Variant | Use When |
|---------|----------|
| Simple (A) | Settings pages, config screens, simple modules |
| Rich (B) | Data-heavy pages with KPIs, time periods, or aggregate stats |

**Header Anatomy:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                          ┌─────────┐  │
│ │ Icon │  Title                                   │  STATS  │  │
│ │ Box  │  Subtitle                                │   26    │  │
│ └──────┘                                          └─────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ 📅 Jan-Apr 2026 [Current] ▼                    Day 9 of 120   │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Jan 1 — Apr 30, 2026       │
├─────────────────────────────────────────────────────────────────┤
│ ⓘ About Team Performance                                   ⌃   │
│   (expandable content)                                         │
└─────────────────────────────────────────────────────────────────┘
```

**See also:** [L5-SUBHEADER-PATTERN.md](L5-SUBHEADER-PATTERN.md) — For section headers within pages (e.g., VendorSettings, tab content headers). Same visual language, lighter weight.

**See also:** [L5-VITALS-PAGE-PATTERN.md](L5-VITALS-PAGE-PATTERN.md) — For dashboard tabs and data review pages with accordion sections, stat pills, and hero widgets.

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
- [ ] Dropdown/popover stability (no re-render closures)
- [ ] Form state isolation (inputs don't trigger parent re-renders)

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

**Dropdown/Popover Stability:**

Dropdowns closing unexpectedly during user interaction is a common React bug caused by parent re-renders. Fix with:

```tsx
// 1. Lift dropdown state OR use stable refs
const [isOpen, setIsOpen] = useState(false);

// 2. Memoize dropdown component to prevent re-renders
const MemoizedDropdown = React.memo(Dropdown);

// 3. Stop propagation on dropdown container clicks
<div onClick={(e) => e.stopPropagation()}>
  <Dropdown />
</div>

// 4. Use stable keys (never Math.random() or array index for dynamic lists)
key={item.id}  // ✅ Good
key={index}    // ❌ Bad if list can change

// 5. Isolate form state - don't lift every keystroke to parent
const [localValue, setLocalValue] = useState(initialValue);
// Only sync to parent on blur or explicit save
onBlur={() => onParentChange(localValue)}
```

**Form State Isolation:**

Avoid re-rendering the entire form on every keystroke:

```tsx
// ❌ Bad: Every keystroke re-renders parent
<input 
  value={parentState.name} 
  onChange={(e) => setParentState({...parentState, name: e.target.value})} 
/>

// ✅ Good: Local state, sync on blur
const [localName, setLocalName] = useState(parentState.name);
<input 
  value={localName}
  onChange={(e) => setLocalName(e.target.value)}
  onBlur={() => updateParent('name', localName)}
/>

// ✅ Also good: Memoized child components
const FormField = React.memo(({ value, onChange }) => (
  <input value={value} onChange={onChange} />
));
```

---

### Phase 6.5: Beyond Expectations
**Time:** 1-2 hours (iterative)  
**Goal:** Transform functional into delightful — the "wow" factor

Phase 6 makes it work well. Phase 6.5 makes users *love* it.

**Deliverables:**
- [ ] Smart defaults that anticipate user needs
- [ ] Contextual insights ("Your top 5...", "Most used...")
- [ ] Bulk operations where repetition exists
- [ ] Print-friendly / export views for offline use
- [ ] Intelligent suggestions ("Items like X typically have Y")
- [ ] Progressive enhancement (basic works, power features reward exploration)
- [ ] Micro-celebrations (subtle success animations, not confetti)
- [ ] Zero-state guidance (empty states that teach, not just inform)

**Examples by Module:**

| Module | Phase 6.5 Feature |
|--------|-------------------|
| Allergens | "Unassigned audit" — one-click to see items needing allergen review |
| Allergens | Printable allergen matrix for health inspector |
| Allergens | "Contains" vs "May contain" distinction |
| Recipes | Auto-suggest allergens based on ingredients |
| Team | "Coaching momentum" — streak tracking for managers |
| Communications | "Best send time" suggestions based on open rates |
| Inventory | Reorder alerts before you run out |

**Philosophy:**

> "Phase 6 respects the user's time. Phase 6.5 respects their craft."

Restaurant operators are professionals. Phase 6.5 features acknowledge their expertise and make them better at their jobs — not just faster at tasks.

**When to Invest in 6.5:**
- Core workflow is stable (Phases 1-6 complete)
- User feedback indicates friction points
- Feature is used daily by operators
- Competitive differentiation opportunity

**Anti-patterns (not 6.5):**
- Animations for animation's sake
- Features that require explanation
- "Clever" over "clear"
- Gamification that feels patronizing

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

## Admin Lifecycle Architecture

The Organization section follows a natural admin journey:

```
ORGANIZATION
│
├── 1. Company Settings      "Who you are"
│   └── Name, industry, location, timezone
│
├── 2. Operations            "Your language"
│   └── Measurements, storage, vendors, food categories
│
├── 3. Modules               "What you need"
│   └── Enable/configure feature packs
│
├── 4. Integrations          "Who you connect with"
│   └── 7shifts, Square, external services
│
└── 5. Activity Log          "What's happening"
    └── NEXUS audit trail
```

**This is a journey, not a checklist.** Users can skip ahead and return.

### Module Hierarchy

##### Core Modules (Always Available)
- **Recipe Manager** — The kitchen brain
- **Print Manager** — Output configuration (planned)

##### Optional Modules (Enable When Ready)
- **Team Performance** — Points, tiers, coaching
- **Communications** — Email templates, broadcasts
- **HACCP** — Food safety tracking
- **Reports & Insights** — Cross-module analytics (planned)

Each module works independently. No module requires another module.

### Operations as Second Step

Operations defines the **vocabulary your business speaks**:

| Category | What It Defines |
|----------|----------------|
| Measurements | How you measure ingredients |
| Storage | Where things go |
| Vendors | Who you buy from |
| Food Relationships | How food is categorized |
| Business | Revenue channels, departments |

These values appear as dropdown options throughout ChefLife.

**Reference Implementation:** `src/features/admin/components/sections/Operations/`

```
Operations/
├── Operations.tsx          # Tabbed orchestrator
└── components/
    ├── VariablesTab.tsx    # Measurements, storage, vendors
    └── RelationshipsTab.tsx # Food taxonomy (groups → categories → subs)
```

---

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
| `.floating-action-bar` | Glowing action bar | For unsaved changes, bulk actions (see full docs below) |

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

### Floating Action Bar

The glowing action bar for unsaved changes, bulk actions, and contextual controls. Animates in from bottom with a gradient glow ring.

**When Steve says "action bar"** — this is what he means.

```html
<div class="floating-action-bar">           <!-- default: cyan/blue glow -->
  <div class="floating-action-bar-inner">
    <div class="floating-action-bar-content">
      <!-- Your buttons and status here -->
    </div>
  </div>
</div>
```

**Variants:**
| Variant | Class | Glow Color | Use For |
|---------|-------|------------|--------|
| Default | (none) | Cyan/Blue | New items, general actions |
| Warning | `.warning` | Amber | Unsaved changes |
| Danger | `.danger` | Rose | Delete confirmations |
| Success | `.success` | Emerald | Successful operations |

**Example - Unsaved Changes:**
```tsx
{hasUnsavedChanges && (
  <div className="floating-action-bar warning">
    <div className="floating-action-bar-inner">
      <div className="floating-action-bar-content">
        <span className="flex items-center gap-1.5 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          Unsaved changes
        </span>
        <div className="w-px h-6 bg-gray-700" />  {/* Divider */}
        <button className="btn-ghost text-sm py-1.5 px-4">Cancel</button>
        <button className="btn-primary text-sm py-1.5 px-4">
          <Save className="w-4 h-4 mr-1" /> Save
        </button>
      </div>
    </div>
  </div>
)}
```

**Anatomy:**
```
┌──────────────────────────────────────────────────────────────┐
│  ═══════════ ANIMATED GRADIENT GLOW (outer, blurred) ══════  │
│  ║══════════ ANIMATED GRADIENT RING (inner, sharp) ═══════║  │
│  ║                                                        ║  │
│  ║  ⚠ Status  │  Action 1  │  Action 2  │  [Primary]     ║  │
│  ║                                                        ║  │
│  ║════════════════════════════════════════════════════════║  │
│  ═══════════════════════════════════════════════════════════  │
└──────────────────────────────────────────────────────────────┘
```

**CSS Location:** `src/index.css` → search for "FLOATING ACTION BAR"

**Reference Implementations:**
- `src/features/admin/components/sections/recipe/MasterIngredientList/IngredientDetailPage/index.tsx`
- `src/features/team/components/TeamManagement/components/RosterBulkActions.tsx`

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
- [ ] Dropdown stability (no re-render closures)
- [ ] Form state isolation

### Phase 6.5: Beyond Expectations
- [ ] Smart defaults
- [ ] Contextual insights
- [ ] Bulk operations
- [ ] Print/export views
- [ ] Intelligent suggestions
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
13. **Dropdown stability** — dropdowns don't close unexpectedly on re-renders
14. **Form state isolation** — inputs don't cause full-page re-renders

**Phase 6.5 (Beyond Expectations) Criteria:**

15. **Contextual insights** — surface relevant stats/summaries
16. **Bulk operations** — reduce repetitive actions
17. **Print/export ready** — offline-friendly outputs where needed
18. **Smart suggestions** — anticipate user needs based on context
19. **Professional polish** — respects the user's expertise

---

## Database Foundations

Core schema relationships that underpin all ChefLife features.

### Organization Membership

```
auth.users (Supabase Auth)
    │
    ├── organization_roles (join table) ──► organizations
    │       user_id ◄─────────────────────► organization_id
    │
    └── organization_team_members (employees, may not be app users)
            └── References organization_id
```

| Table | Purpose | When to Use |
|-------|---------|-------------|
| `organization_roles` | Links users → organizations | **RLS policies**, permission checks |
| `organizations` | The orgs themselves | Company settings, branding |
| `organization_team_members` | Team members (employees) | Scheduling, performance, payroll |

**Key distinction:** A `team_member` is an employee (may not have app login). A `user` in `organization_roles` has app access.

### RLS Policy Pattern

Every table with `organization_id` uses this pattern:

```sql
-- Standard RLS for org-scoped tables
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's data" ON your_table
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's data" ON your_table
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));
```

**⚠️ Common Mistake:** The table is `organization_roles`, NOT `user_organizations`. Migrations have failed on this.

### Operations Settings

Organization-wide configuration lives in `operations_settings`:

```sql
operations_settings
├── organization_id (FK → organizations)
├── storage_areas text[]
├── kitchen_stations text[]
├── vendors text[]
├── purchase_unit_measures text[]   -- Case, kg, lb, Box, etc.
├── volume_measures text[]
├── weight_measures text[]
├── ... (many more arrays)
└── category_groups jsonb           -- UI tab configuration
```

**Access Pattern:**
```typescript
import { useOperationsStore } from "@/stores/operationsStore";

const { settings, fetchSettings } = useOperationsStore();
const purchaseUnits = settings?.purchase_unit_measures || ['Case', 'Each', 'kg', 'lb'];
```

This powers all dropdowns in the app - vendors, storage areas, measurements, etc.

### Vendor Invoice Chain

```
vendor_imports (batch import record)
    │
    └── vendor_invoices (individual invoice)
            │
            ├── vendor_invoice_items (line items)
            │       ├── master_ingredient_id (FK)
            │       ├── quantity_ordered / quantity_received
            │       └── discrepancy_type, notes
            │
            └── vendor_credits (for shorts/damages)
                    └── Links back to invoice_item_id
```

**Audit Trail:** Every price change traces back to a source document via `vendor_price_history.invoice_item_id`.

### Migration Naming Convention

```
YYYYMMDD[sequence]_description.sql

Examples:
20260111000000_vim_order_delivery_tracking.sql
20260111100000_add_purchase_unit_measures.sql
```

Sequence numbers (`000000`, `100000`) allow multiple migrations per day in order.

---

## References

- **UTILS.md** — Date utilities, formatters
- **src/index.css** — CSS component library (buttons, cards, animations)
- **tailwind.config.js** — Custom colors, fonts, fluid spacing
- **Handoff docs** — Feature specifications
- **ROADMAP-Communications.md** — Communications module roadmap

**Reference Implementations:**
- **Team Performance** — Gold standard tabbed interface (7 tabs, modular components), **Rich L5 Header** with stats + progress
- **Operations** — Admin lifecycle step 2, **Simple L5 Header** with expandable info
- **Communications** — Tabbed module pattern (Library + Settings tabs, route simplification)
- **The Roster** — L5 list page (search, filter, pagination, bulk actions)
- **TemplateEditor** — L5 editor with header-to-tabs pattern

**L5 Header Gold Standards:**
- `src/features/admin/components/sections/Operations/Operations.tsx` — Simple Header (Variant A)
- `src/features/team/components/TeamPerformance/index.tsx` — Rich Header (Variant B)

**Related Documentation:**
- **ROADMAP.md** — Product roadmap with module hierarchy
- **ONBOARDING-PHILOSOPHY.md** — First-run UX principles

---

## L5 Viewer Screen Standard

The **Viewer Screen** pattern is the gold standard for all user-facing (non-admin) screens where staff consume information. The Recipe Viewer is the reference implementation.

### Target Devices (Priority Order)

| Priority | Device | Resolution | Primary User |
|----------|--------|------------|-------------|
| 1 | iPad Landscape in Folio | ~1366×1024 | Line cooks, prep cooks |
| 2 | iPad Portrait on Stand | ~1024×1366 | Recipe reference |
| 3 | Desktop 1920×1080 | 1920×1080 | Managers, reviewing |
| 4 | Large Display 2560+ | 2560×1440+ | Office, presentations |

**One codebase scales gracefully from 4K to tablet portrait.** No separate "mobile version."

### Responsive Container Strategy

Content width adapts to content type, not fixed breakpoints:

| Content Type | Max Width | Tailwind Class | Use Case |
|--------------|-----------|----------------|----------|
| Visual grids | 1600px | `max-w-[1600px]` | Flip cards, image galleries, ingredient cards |
| Dashboard cards | 1280px | `max-w-7xl` | Overview panels, settings, 2-3 column grids |
| Text-focused | 896px | `max-w-4xl` | Method steps, procedures, long-form reading |
| Forms | 672px | `max-w-2xl` | Input forms, dialogs |
| Full-bleed | 100% | `max-w-none` | Recipe Library, media galleries |

**Implementation Pattern:**
```tsx
const getContainerClass = (contentType: string) => {
  switch (contentType) {
    case 'visual-grid':   return 'max-w-[1600px]';
    case 'dashboard':     return 'max-w-7xl';
    case 'text':          return 'max-w-4xl';
    case 'form':          return 'max-w-2xl';
    case 'full-bleed':    return 'max-w-none';
    default:              return 'max-w-7xl';
  }
};

// Usage
<div className={`${getContainerClass(contentType)} mx-auto`}>
  {children}
</div>
```

### Grid Column Breakpoints

Consistent column progression across all grid-based content:

| Breakpoint | Width | Tailwind | Columns | Device |
|------------|-------|----------|---------|--------|
| Base | <640px | (default) | 1 | Phone portrait |
| `sm` | 640px | `sm:` | 2 | Phone landscape, small tablet |
| `md` | 768px | `md:` | 2 | iPad portrait |
| `lg` | 1024px | `lg:` | 3 | iPad landscape |
| `xl` | 1280px | `xl:` | 3-4 | Desktop |
| `2xl` | 1536px | `2xl:` | 4 | Large desktop |
| Custom | 1920px | `min-[1920px]:` | 5 | Full HD+ |

**Standard Grid Classes:**
```tsx
// Visual cards (ingredients, recipes)
"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1920px]:grid-cols-4 gap-6"

// Dashboard cards (overview panels)
"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"

// Flip cards (taller aspect ratio, need more width)
"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1920px]:grid-cols-4 gap-6"
```

### Viewer Screen Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HERO HEADER                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ← Back   [Badge]                              [Status] [Print]   │  │
│  │                                                                  │  │
│  │                      Recipe Name                                 │  │
│  │                      Station                                     │  │
│  │                                                                  │  │
│  │                                        [Time] [Yield] [Version]  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  TAB BAR (sticky)                                                       │
│  [Overview] [Ingredients] [Method] [Production] [Storage] ...          │
├─────────────────────────────────────────────────────────────────────────┤
│  TAB CONTENT (responsive container)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │   Content adapts to type:                                       │   │
│  │   - Dashboard cards: max-w-7xl, 2-3 columns                     │   │
│  │   - Visual grids: max-w-[1600px], 3-4 columns                   │   │
│  │   - Text content: max-w-4xl, single column                      │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↑ centered with mx-auto                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Touch-First Design Requirements

| Element | Minimum Size | Why |
|---------|--------------|-----|
| Buttons | 44×44px | Apple HIG, greasy fingers |
| Tab pills | 44px height | Thumb-friendly |
| Card tap targets | Full card | No precision required |
| Spacing between targets | 8px+ | Prevent mis-taps |

### Premium Transitions

Viewer screens use the Premium Morph pattern for tab transitions:

```tsx
// Tab content transition
const [isTransitioning, setIsTransitioning] = useState(false);

useEffect(() => {
  if (activeTab !== displayedTab) {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDisplayedTab(activeTab);
      requestAnimationFrame(() => setIsTransitioning(false));
    }, 150);
    return () => clearTimeout(timer);
  }
}, [activeTab, displayedTab]);

// CSS classes
className={`
  transition-all duration-200
  ${isTransitioning 
    ? "opacity-0 blur-[2px] translate-y-1" 
    : "opacity-100 blur-0 translate-y-0"}
`}
```

### Reference Implementation

**Gold Standard:** `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx`

| Component | Pattern |
|-----------|--------|
| `HeroHeader` | Responsive hero with back nav, badges, stats |
| `TabBar` | Horizontal scrolling tabs with auto-center |
| `TabContent` | Dynamic container width per content type |
| `Overview` | Dashboard card grid (2-3 columns) |
| `Ingredients` | Visual flip card grid (3-4 columns) |
| `Method` | Narrow text container for readability |

### ViewerCard Pattern (Overview Cards)

Dashboard cards within viewer screens use **neutral gray** styling to avoid competing with colored tabs:

```
┌─────────────────────────────────────────────────────────────┐
│ [Gray Icon] Card Title                      [Stat Badge]   │  ← Header stripe
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Card content in gray palette                              │  ← Content area
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Color Philosophy:**
- Tabs own color identity - cards stay neutral
- Gray icon boxes don't compete with tab colors
- Darker header stripe (`bg-gray-800/70`) creates hierarchy
- Optional stat badge on right for quick-glance info

**Implementation:**
```tsx
interface ViewerCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  stat?: string | number;  // Optional stat in header
  statLabel?: string;
}

const ViewerCard: React.FC<ViewerCardProps> = ({
  icon: Icon, title, children, stat, statLabel
}) => (
  <div className="card overflow-hidden">
    {/* Header Bar - Darker stripe with gray icon */}
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      {stat !== undefined && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-700/50">
          <span className="text-sm font-medium text-gray-300">{stat}</span>
          {statLabel && <span className="text-xs text-gray-500">{statLabel}</span>}
        </div>
      )}
    </div>
    <div className="p-4 text-sm text-gray-400">{children}</div>
  </div>
);
```

**Reference:** `Overview.tsx` — Uses ViewerCard for Allergens, Description, Chef's Notes, Equipment, Certifications, Label Requirements

### When to Use Viewer Pattern

| Use Viewer Pattern | Use Admin/Manager Pattern |
|--------------------|---------------------------|
| Reading recipes | Editing recipes |
| Viewing schedules | Managing schedules |
| Checking inventory | Adjusting inventory |
| Training content | Creating training |
| Any "consumption" screen | Any "CRUD" screen |

---

## Container Query Fluid Typography

For elements that need text to scale with their container (not the viewport), use CSS Container Queries with `cqw` units.

> "The card knows its own size. The text scales to fit."

**When to use:** Flip cards, grid items, any component where the same element appears at wildly different sizes depending on grid density.

### The Pattern

**1. Mark the container:**
```tsx
<div className="card-responsive">
  {/* Children can now use cqw units */}
</div>
```

**2. CSS in index.css:**
```css
/* Container query setup */
.card-responsive {
  container-type: inline-size;
}

/* Text scales with container width */
.card-quantity {
  font-size: clamp(0.875rem, 8cqw, 1.5rem);  /* 14px min, 24px max */
  font-weight: 700;
}

.card-name {
  font-size: clamp(0.625rem, 5cqw, 0.875rem);  /* 10px min, 14px max */
}

.card-allergen-badge {
  width: clamp(1.25rem, 12cqw, 1.75rem);  /* 20px min, 28px max */
  height: clamp(1.25rem, 12cqw, 1.75rem);
}

.card-letterbox {
  padding: clamp(0.375rem, 4cqw, 0.75rem);  /* 6px min, 12px max */
}
```

**How cqw works:**
- `1cqw` = 1% of the container's width
- `8cqw` on a 150px card = 12px
- `8cqw` on a 200px card = 16px
- `clamp()` sets min/max bounds

**Scaling Table:**
| Container Width | 8cqw Result | Use Case |
|-----------------|-------------|----------|
| 100px | 8px | Dense mobile grid |
| 150px | 12px | Standard card |
| 200px | 16px | Comfortable card |
| 250px | 20px (capped at 24px) | Large card |

### Reference Implementation

**Location:** `src/features/recipes/components/IngredientFlipCard/index.tsx`

```tsx
<div className="h-full w-full card-responsive">
  <div className="card-letterbox bg-gray-800/70">
    <span className="card-quantity text-white">2 cups</span>
    <span className="card-name text-gray-400">All-Purpose Flour</span>
  </div>
</div>
```

**CSS Classes (in index.css):**
- `.card-responsive` — marks container
- `.card-quantity` — large bold numbers
- `.card-name` — smaller item name
- `.card-allergen-badge` — icon container
- `.card-allergen-text` — tiny allergen labels
- `.card-letterbox` — scaled padding

---

## CSS Grid Auto-Fill Pattern

For grids that should automatically determine column count based on available space:

> "No breakpoints. The grid figures it out."

**When to use:** Card grids where you want optimal density without managing breakpoints.

### The Pattern

```tsx
<div 
  className="grid gap-4"
  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
>
  {items.map(item => (
    <div key={item.id} className="aspect-[9/16]">
      <Card item={item} />
    </div>
  ))}
</div>
```

**How it works:**
- `auto-fill` — Grid calculates how many columns fit
- `minmax(150px, 1fr)` — Each column is at least 150px, grows equally to fill space
- No partial cards — cards either fit completely or wrap
- Works on ANY screen size without breakpoints

**Responsive Behavior:**
| Container Width | Min Card Size | Columns | Card Width |
|-----------------|---------------|---------|------------|
| 320px | 150px | 2 | 160px |
| 600px | 150px | 4 | 150px |
| 900px | 150px | 6 | 150px |
| 1200px | 150px | 8 | 150px |

### Combining with Container Queries

```tsx
// Grid determines columns automatically
<div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
  {items.map(item => (
    // Wrapper maintains aspect ratio
    <div className="aspect-[9/16]">
      {/* Card fills wrapper, uses container queries for text */}
      <IngredientFlipCard item={item} />
    </div>
  ))}
</div>
```

**The key insight:** The grid wrapper sets the aspect ratio, the card fills it with `h-full w-full`, and container queries handle text scaling.

### Reference Implementation

**Location:** `src/features/recipes/components/RecipeViewer/components/Method/GuidedView.tsx` (Mise en Place page)

---

## Deep Linking with URL Parameters

For tabbed interfaces that need shareable/bookmarkable state:

> "Copy the URL. Send it to a cook. They land exactly where you were."

**When to use:** Any viewer with tabs or sub-views that users might want to share or bookmark.

### The Pattern

**URL Structure:**
```
/recipes/{id}?tab=method&mode=guided&page=3
```

**Reading URL params:**
```tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Read params with defaults
const tab = searchParams.get('tab') || 'overview';
const mode = searchParams.get('mode') || 'compact';
const page = parseInt(searchParams.get('page') || '0', 10);
```

**Updating URL without navigation:**
```tsx
const updateParams = (updates: Record<string, string | null>) => {
  const newParams = new URLSearchParams(searchParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
  });
  setSearchParams(newParams, { replace: true });
};

// Usage
updateParams({ mode: 'guided', page: '3' });
updateParams({ page: null }); // Remove param
```

### Recipe Viewer URL Params

| Param | Values | Default | Purpose |
|-------|--------|---------|--------|
| `tab` | overview, ingredients, method, etc. | overview | Which tab is active |
| `mode` | compact, guided, focus | compact | Method viewing mode |
| `page` | 0, 1, 2... | 0 | Guided mode page index |

**Example URLs:**
```
/recipes/abc123                           → Overview tab
/recipes/abc123?tab=method                → Method tab, Compact mode
/recipes/abc123?tab=method&mode=guided    → Guided mode, Cover page
/recipes/abc123?tab=method&mode=guided&page=1  → Mise en Place page
/recipes/abc123?tab=method&mode=guided&page=5  → Step 3 (after cover + mise + 3 steps)
```

### Reference Implementation

**Location:** `src/features/recipes/components/RecipeViewer/FullPageViewer.tsx`

```tsx
// URL param sync
useEffect(() => {
  const urlTab = searchParams.get('tab');
  const urlMode = searchParams.get('mode');
  const urlPage = searchParams.get('page');
  
  if (urlTab && VIEWER_TABS.some(t => t.id === urlTab)) {
    setActiveTab(urlTab);
  }
  if (urlMode && ['compact', 'guided', 'focus'].includes(urlMode)) {
    setViewMode(urlMode as ViewMode);
  }
  if (urlPage !== null) {
    setCurrentPage(parseInt(urlPage, 10));
  }
}, [searchParams]);

// Update URL when state changes
const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  updateParams({ tab, mode: null, page: null }); // Reset sub-params on tab change
};
```

**Benefits:**
- Shareable links to exact recipe state
- Browser back/forward works naturally
- Refresh preserves position
- Can deep-link from training materials

---

ChefLife has two distinct experiences:
- **Desktop Admin** — Complex data grids, deep configuration, sidebar navigation
- **Mobile Command Center** — Launcher-style interface, swipeable pages, glanceable widgets

### The Paradigm Shift

| Desktop Admin | Mobile Command |
|---------------|----------------|
| Complex data grids | Glanceable widgets |
| Deep navigation | Swipe pages |
| Mouse precision | Thumb-friendly targets |
| Information dense | Action focused |
| Sidebar + tabs | Launcher + icons |

Same data. Completely different experience.

### Three Pillars: People, Place, Profit

```
         ○  ●  ○
      People|Place|Profit
```

| Page | Focus | Primary Actions |
|------|-------|----------------|
| **People** | Team management | Schedule, messaging, who's on |
| **Place** | Operations | Temps, tasks, checklists, receiving |
| **Profit** | Money flow | Quick Invoice, revenue, counts |

This hierarchy mirrors restaurant philosophy:
> "If you don't have the people, you don't have a place for guests. No guests, no profit."

### MobileShell Components

| Component | Purpose |
|-----------|--------|
| `MobileShell` | Root wrapper, page state, swipe handling |
| `AlertTicker` | Animated urgent notifications banner |
| `HeroContext` | Greeting, shift info, contextual imagery |
| `SwipeablePages` | Horizontal scroll-snap container |
| `WidgetAccordion` | Expandable sections with animated stats |
| `IconCluster` | Glassmorphism action button grid |
| `PageDots` | Newton's cradle navigation indicator |
| `BottomNav` | Updated 4+1 navigation |

### Signature Interactions

**Newton's Cradle Page Dots:**
Physics-based animation that transfers momentum between dots on page swipe.
```css
@keyframes cradle-swing-out {
  0%   { transform: rotate(0deg) translateX(0); }
  40%  { transform: rotate(25deg) translateX(6px); }
  70%  { transform: rotate(-8deg) translateX(-2px); }
  100% { transform: rotate(0deg) translateX(0); }
}

.dot-active { animation: cradle-receive 0.3s ease-out 0.15s; } /* 0.15s delay = momentum transfer */
```

**Glassmorphism Icons:**
```css
.glass-icon {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

**Widget Accordions:**
Expandable sections with animated stats flowing to the right of the title.
```
┌────────────────────────────────────────────────┐
│ ▼ Team Schedule                    5 on │ 1 brk │
├────────────────────────────────────────────────┤
│  ○ Emily (EXPO)   10am - 8pm                   │
│  ○ Marcus (LINE)   3pm - 9:30pm               │
└────────────────────────────────────────────────┘
```

### Role-Based Visibility

If you can't use it, you don't see it. No greyed-out buttons.

| Role | People | Place | Profit |
|------|--------|-------|--------|
| **Line Cook** | My Profile, Schedule | Temps, Tasks | — |
| **Shift Lead** | + Full Team | + Receive | Invoice, Counts |
| **Manager** | All | All | All + Admin |

### CSS-First Approach

No animation libraries. Pure CSS for:
- `scroll-snap-type: x mandatory` — page swiping
- `@keyframes` — all animations
- `backdrop-filter: blur()` — glassmorphism
- CSS Grid — responsive icon clusters
- `transition` — interactive feedback

### File Structure

```
src/features/mobile/
├── components/
│   ├── MobileShell.tsx
│   ├── AlertTicker.tsx
│   ├── HeroContext.tsx
│   ├── SwipeablePages.tsx
│   ├── WidgetAccordion.tsx
│   ├── IconCluster.tsx
│   ├── PageDots.tsx
│   └── pages/
│       ├── PeoplePage.tsx
│       ├── PlacePage.tsx
│       └── ProfitPage.tsx
├── hooks/
│   ├── useShiftContext.ts
│   └── useAlerts.ts
└── index.ts
```

**Reference Roadmap:** [ROADMAP-Mobile-Dashboard.md](roadmaps/ROADMAP-Mobile-Dashboard.md)

**Reference Promise:** [PROMISE-Phone-Command-Center.md](promises/PROMISE-Phone-Command-Center.md)

---

## Premium Interaction Patterns

ChefLife's signature interactions communicate quality through subtle, considered motion. These aren't flashy animations — they're quiet signals that someone cared about your experience.

> "So smooth you're not sure if it moved."

### Philosophy

Premium motion should:
- **Never demand attention** — it serves, doesn't distract
- **Feel inevitable** — like physics, not decoration
- **Reward observation** — notice it once, appreciate it forever
- **Degrade gracefully** — works without animation too

### Two-Stage Button

**Reference:** `src/shared/components/TwoStageButton.tsx`

A confirmation pattern that prevents accidental destructive actions without modal interruption.

**Behavior:**
1. First click: Button expands to reveal confirmation state
2. Second click: Action executes
3. Click away or timeout: Reverts to initial state

**The Premium Detail:** The expansion is a smooth 200ms scale + opacity transition. The icon can change between states (e.g., Lock → Pencil for "unlock to edit").

```tsx
<TwoStageButton
  icon={Lock}
  confirmIcon={Pencil}      // Optional: different icon for confirm state
  variant="warning"          // danger | warning | neutral
  size="sm"                  // xs | sm | md
  confirmLabel="Edit"
  onConfirm={handleUnlock}
/>
```

**When to use:**
- Delete/archive actions (danger variant)
- Override protected data (warning variant)
- Any destructive action that doesn't warrant a full modal

**When NOT to use:**
- Actions with complex consequences (use ConfirmDialog)
- Bulk operations (use floating action bar with explicit confirmation)

---

### Premium Morph Animation

**Reference:** `src/features/admin/components/AdminDashboard/TemperatureStatCard.tsx`

Used when cycling through multiple data points in a single widget. The transition is so smooth users aren't sure if the data changed.

**Components:**

#### AnimatedTemperature
Numbers smoothly interpolate between values at 60fps using `requestAnimationFrame`.

```tsx
const AnimatedTemperature: React.FC<{ value: number | null; duration?: number }> = ({ 
  value, 
  duration = 2000 
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || displayValue === null) {
      setDisplayValue(value);
      return;
    }

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic - decelerates like a luxury gauge
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValueRef.current! + (value - startValueRef.current!) * eased;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  if (displayValue === null) return <span>No Data</span>;

  return (
    <span className="text-2xl font-bold text-white tabular-nums">
      {displayValue.toFixed(1)}°F
    </span>
  );
};
```

**Key details:**
- `tabular-nums` — prevents digit width jumping during animation
- Ease-out cubic — decelerates naturally like real physics
- 2-second duration — slow enough to feel premium, fast enough to not frustrate
- 60fps via requestAnimationFrame — buttery smooth

#### MorphingText
Text transitions with a subtle blur + slide effect.

```tsx
const MorphingText: React.FC<{ text: string; className?: string }> = ({ 
  text, 
  className = "" 
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (text !== displayText) {
      setIsTransitioning(true);
      
      // Halfway through, swap the text
      const timeout = setTimeout(() => {
        setDisplayText(text);
        setIsTransitioning(false);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [text, displayText]);

  return (
    <span 
      className={`inline-block transition-all duration-1000 ease-in-out ${className} ${
        isTransitioning 
          ? 'opacity-0 blur-[2px] translate-y-1' 
          : 'opacity-100 blur-0 translate-y-0'
      }`}
    >
      {displayText}
    </span>
  );
};
```

**The effect:**
- Text fades out with slight blur and downward drift
- New text fades in, blur clears, drifts back to position
- 1 second each direction = 2 second total transition

#### Timing Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   8 seconds display    │    2 second morph    │   repeat    │
│   ═══════════════════  │  ────────────────    │             │
│   "Walk-In Cooler"     │  blur → swap → clear │             │
│   38.2°F               │  38.2 → → → → 35.8   │             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**When to use:**
- Dashboard widgets cycling through multiple data points
- Any rotating display where jarring transitions would distract
- Status indicators that update periodically

**When NOT to use:**
- Real-time data that changes rapidly (use instant updates)
- User-initiated changes (use immediate feedback)
- Critical alerts (use attention-grabbing transitions)

---

### Design Principles for Premium Motion

| Principle | Implementation |
|-----------|----------------|
| **Slow is premium** | 1.5-2s transitions feel luxurious, 200ms feels cheap |
| **Ease-out always** | Deceleration feels natural, linear feels robotic |
| **tabular-nums** | Numbers shouldn't dance around during animation |
| **Blur adds depth** | Subtle blur (2px) creates perceived z-depth |
| **Pause on hover** | Respect user attention, stop cycling when focused |
| **No progress bars** | If you need to show progress, it's not smooth enough |

### The Luxury Test

> "Does this feel like a Tesla dashboard or a rental car?"

- **Tesla:** Numbers glide to new values, displays morph imperceptibly
- **Rental:** Numbers snap, displays flicker, everything demands attention

ChefLife aims for Tesla.

---

## Tablecloth/Placemat Visual Hierarchy

For expandable sections with nested content, use the tablecloth/placemat metaphor:

```
┌─ Expandable Section (Tablecloth) ───────────────────────────────────────┐
│  bg-primary-800/10                                            │
│                                                               │
│  ┌─ Placemat (.card) ───────┐  ┌─ Placemat (.card) ───────┐  │
│  │                          │  │                          │  │
│  │  Content row             │  │  Content row             │  │
│  │    hover:bg-gray-700/30  │  │    hover:bg-gray-700/30  │  │
│  │  Content row             │  │  Content row             │  │
│  │                          │  │                          │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Depth Hierarchy:**

| Layer | Element | Style |
|-------|---------|-------|
| 0 | Tablecloth | `bg-primary-800/10` (subtle tint on expandable section) |
| 1 | Placemats | `.card` class (blur, shadow, solid border) |
| 2 | Content | Rows/buttons with `hover:bg-gray-700/30` (no background wrapper) |

**Key Principles:**
- Placemats use the `.card` class from index.css
- Content sits directly on placemat — no extra wrapper divs
- Hover states provide interactivity without visual noise
- Section headers above placemats, not inside

**Section Header Pattern:**
```tsx
<div className="mb-3">
  <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
    Section Title
  </h5>
  <p className="text-xs text-gray-500 mt-1">
    Optional subtitle explanation
  </p>
</div>
<div className="card p-4 space-y-2">
  {/* Content rows here */}
</div>
```

**Reference Implementation:** `UmbrellaItemCard.tsx` — Vendor Sources, Price Calculation, From Primary placemats

---

## Selection Button Pattern (Radio-Style)

For mutually exclusive options within a placemat:

```tsx
<button
  onClick={() => handleSelect(option)}
  className={`w-full p-3 rounded-lg text-left transition-all ${
    isSelected
      ? 'ring-2 ring-gray-500 bg-gray-700/20'  // Subtle ring + tint
      : 'hover:bg-gray-700/30'                   // Just hover
  }`}
>
  <div className="flex items-center gap-3">
    <div className="icon-badge bg-gray-700/50">
      <Icon className={`w-4 h-4 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`} />
    </div>
    <div className="flex-1">
      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
        Option Label
      </span>
      <p className="text-2xs text-gray-500 mt-0.5">Description</p>
    </div>
    <span className="text-sm font-semibold tabular-nums text-teal-400/70">
      $00.00
    </span>
    {isSelected && <Check className="w-4 h-4 text-gray-400" />}
  </div>
</button>
```

**Design Decisions:**
- Gray ring instead of colored fills (professional, not flashy)
- Icons remain static gray — no color changes on selection
- Checkmark appears only when selected
- All values use `tabular-nums` for alignment

---

## Pending State + Floating Action Bar Pattern

For important decisions that deserve gravitas (price mode, status changes):

```tsx
// State
const [currentValue, setCurrentValue] = useState(initialValue);
const [pendingValue, setPendingValue] = useState<ValueType | null>(null);
const displayValue = pendingValue || currentValue;
const hasPendingChange = pendingValue !== null && pendingValue !== currentValue;

// Selection handler - doesn't save immediately
const handleSelect = (newValue: ValueType) => {
  if (newValue === currentValue) {
    setPendingValue(null);  // Clicking current clears pending
  } else {
    setPendingValue(newValue);
  }
};

// Floating action bar (warning variant for changes)
{hasPendingChange && (
  <div className="floating-action-bar warning">
    <div className="floating-action-bar-inner">
      <div className="floating-action-bar-content">
        <Icon className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-gray-300">
          Field: <span className="text-white font-medium">{currentValue}</span>
          <span className="text-gray-500 mx-1">→</span>
          <span className="text-amber-400 font-medium">{pendingValue}</span>
        </span>
        <div className="w-px h-6 bg-gray-700" />
        <button onClick={handleCancel} className="btn-ghost text-sm py-1.5 px-4">
          Cancel
        </button>
        <button onClick={handleSave} className="btn-primary text-sm py-1.5 px-4">
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </button>
      </div>
    </div>
  </div>
)}
```

**When to Use:**
- Price mode changes (affects recipe costing)
- Status transitions (active → archived)
- Any change where "oops, didn't mean to click that" is possible

**Reference Implementation:** `UmbrellaItemCard.tsx` — Price mode selection

---

## Unified Financial Color (Teal at 70%)

All money-related values use a single teal accent:

```tsx
// Prices
<span className="text-teal-400/70">${price.toFixed(2)}</span>

// Primary badge
<span className="bg-teal-500/10 text-teal-400/70 px-1.5 py-0.5 rounded">
  Primary
</span>

// Selection circle (when selected)
<button className="border-teal-400/70 bg-teal-500/80">
  <Check className="text-white" />
</button>
```

**Why 70% opacity?**
- Muted enough to not compete with white text
- Distinct enough to signal "this is money"
- Consistent across all financial data

---

*Last updated: January 18, 2026 - Tablecloth/Placemat Hierarchy, Selection Pattern, Pending State Pattern added*

---

## Changelog

**Jan 31, 2026 (Session - IngredientsInput L5/L6 Rebuild):**
- **Three-Mode Input Pattern** documented:
  - Table Mode: Desktop efficiency, responsive flex layout
  - Tablet Mode: Full-screen speed entry, one ingredient at a time
  - Guided Mode: Same as Tablet with `showEducation={true}` for tips
  - Key insight: Don't build separate components, use props to add context
- **Sandbox Ingredients** concept:
  - Toggle on RecipeIngredient: `is_sandbox`, `sandbox_vendor`, `sandbox_vendor_code`, `sandbox_description`, `sandbox_estimated_cost`
  - Amber styling for unverified, emerald "Verified" badge when linked to MIL
  - Resolution flow: Invoice arrives → User matches → Sandbox converts to verified
- **Responsive Flex Table Pattern** added to DESIGN-SYSTEM.md:
  - Headers and rows use identical flex structure
  - `flex-[N]` for text columns that grow proportionally
  - `w-XX flex-shrink-0` for fixed-width numeric/action columns
  - Reference: `IngredientsInput/TableView.tsx`
- **Touch-Friendly Mode Switcher**:
  - Spaced badges instead of grouped buttons
  - `px-3 py-2` for 44px+ touch targets
  - Labels visible on `sm:` breakpoint and up
- **Reference Implementation:** `src/features/recipes/components/RecipeEditor/IngredientsInput/`

**Jan 29, 2026 (Session - Responsive Flip Cards & URL Routing):**
- **Container Query Fluid Typography** pattern documented:
  - `cqw` units for text that scales with container width
  - `.card-responsive` marks container for queries
  - `.card-quantity`, `.card-name`, `.card-allergen-badge`, `.card-letterbox` classes
  - Scaling table showing cqw → px conversions
  - Reference: IngredientFlipCard/index.tsx
- **CSS Grid Auto-Fill Pattern** documented:
  - `repeat(auto-fill, minmax(150px, 1fr))` for automatic column count
  - No breakpoints needed — grid calculates optimal density
  - Combining with container queries for complete responsive system
  - Reference: GuidedView.tsx Mise en Place page
- **Deep Linking with URL Parameters** documented:
  - Recipe Viewer URL params: tab, mode, page
  - `useSearchParams` pattern for reading/writing
  - Example URLs for all Guided mode pages
  - Benefits: shareable, bookmarkable, back/forward works
  - Reference: FullPageViewer.tsx
- **IngredientFlipCard** fully responsive:
  - Container queries for all text/icon sizing
  - "None Defined" for allergen-free state (liability language)
  - Emerald check icon matches allergen badge sizing

**Jan 28, 2026 (Session - Recipe Viewer L5 Responsive):**
- **L5 Viewer Screen Standard** documented:
  - Target devices: iPad landscape (primary) → 4K displays
  - Responsive container strategy by content type
  - Grid column breakpoints table
  - Viewer screen anatomy diagram
  - Touch-first design requirements (44px minimum)
  - Premium transition pattern
  - Reference implementation: FullPageViewer.tsx
- **ViewerCard Pattern** created for Overview dashboard cards:
  - Gray icon boxes (don't compete with colored tabs)
  - Darker header stripe with optional stat badge
  - "Tabs own color, cards stay neutral" philosophy
  - Documented in L5 Viewer Screen Standard section
- **FullPageViewer.tsx** updated:
  - Dynamic container widths: `max-w-[1600px]` (visual), `max-w-7xl` (dashboard), `max-w-4xl` (text)
  - Tab-specific container selection via `getContainerClass()`
- **Overview.tsx** redesigned:
  - New ViewerCard component replaces colored DashboardCard
  - Grid now 3 columns on desktop: `xl:grid-cols-3`
  - Stat badges added (allergen count, equipment count, etc.)
- **IngredientFlipCard** L5 redesign:
  - Letterbox layout: allergen icons top, image middle, quantity bottom
  - Back face matches RecipeFlipCard L5 style exactly
  - "No Allergens Declared" (legal language, not "No Allergens")
  - Proper Tailwind color mapping for allergen icons
- **Ingredients grid** updated:
  - 3 columns on lg, 4 on 1920px+
  - Larger gap (gap-6)

**Jan 19, 2026 (Session - Price History Detail Modal):**
- **PriceHistoryDetailModal** - L6 chart modal with Recharts:
  - 180-day price history line chart
  - Multi-vendor comparison (same common_name, dashed lines)
  - Category average trend (sub_category, dotted line)
  - Actionable insights: vs category, cheapest vendor, volatility warning, trend direction
  - Toggle buttons for comparison layers
  - Stats row: 180d Change, Current, Avg, Volatility
  - Price change history list
- **Chart Modal Pattern** documented in `docs/patterns/chartmodal.md`
- **PriceHistory.tsx L5 Pills Pattern**:
  - Subheader updated with stats pills (Changes count, Alerts with animate-attention)
  - Row click → opens PriceHistoryDetailModal
  - Phase 6 marked complete
- **Reference Implementation**: `PriceHistory/PriceHistoryDetailModal.tsx`

**Jan 18, 2026 (Session - L5 Visual Hierarchy Refinement):**
- **Refined L5 Expandable Info Pattern** across all VIM tabs:
  - Tab identity color reserved for expandable info icon only
  - White title, gray-300 card titles, tab-color/80 icons
  - Pattern documented in L5-SUBHEADER-PATTERN.md
- Files updated: VendorAnalytics.tsx, ItemCodeGroupManager.tsx, UmbrellaIngredientManager.tsx
- Added `.subheader-icon-box` color variants to index.css (lime, cyan, green, amber, rose, primary, gray)

**Jan 18, 2026 (Session - Umbrella Price Mode):
- **Tablecloth/Placemat Visual Hierarchy** pattern documented:
  - Layer 0: Tablecloth = `bg-primary-800/10` (expandable section background)
  - Layer 1: Placemats = `.card` class (blur, shadow, solid border)
  - Layer 2: Content = rows/buttons with `hover:bg-gray-700/30` (no wrapper)
  - Section headers above placemats: `text-sm font-semibold text-gray-400 uppercase tracking-wider`
- **Selection Button Pattern (Radio-style)** documented:
  - Active state: `ring-2 ring-gray-500 bg-gray-700/20` (subtle ring, not colored fill)
  - Inactive: `hover:bg-gray-700/30`
  - Icon stays gray, checkmark appears only when selected
  - `tabular-nums` for all numeric values
- **Pending State + Floating Action Bar Pattern** documented:
  - For strategic decisions (price mode, status changes)
  - Click sets pending → floating bar appears → confirm/cancel
  - Warning variant (amber glow) for unsaved changes
  - Pattern: `displayValue = pendingValue || currentValue`
- **Unified Financial Color (Teal at 70%)** documented:
  - All prices: `text-teal-400/70`
  - Primary badge: `bg-teal-500/10 text-teal-400/70`
  - Selection circle: `border-teal-400/70 bg-teal-500/80`
- **Reference Implementation:** `UmbrellaItemCard.tsx` - price mode selection, aggregate purchase modal
- **Chart Patterns** added to UTILS.md:
  - Dark theme defaults for Recharts
  - Line chart (single series) pattern
  - Scatter chart (multi-series) pattern
  - Quantity-scaled dots formula
  - VENDOR_COLORS palette (8 colors)
  - Stats row pattern

**Jan 12, 2026 (Session 46 - Price Source Tracking):**
- **TwoStageButton Enhancement** - Added `size` and `confirmIcon` props:
  - `size`: "xs" | "sm" | "md" for different contexts
  - `confirmIcon`: Optional different icon for confirm state (e.g., Lock → Pencil)
  - Use case: Inline override protection for invoice-sourced prices
- **Price Source Pattern** - Invoice-sourced data visualization:
  - Query `vendor_price_history` for source tracking
  - Read-only fields with two-stage unlock for data integrity
  - Equation-style card matching Cost Calculator visual pattern

**Jan 11, 2026 (Session 44 - Triage L5 Polish):**
- **L5 Icon Badge Pattern** added to `src/index.css`:
  - Container → Icon at 70% with 80% opacity step-down
  - `w-7 h-7 rounded-lg` container → `w-5 h-5` icon
  - Background: `{color}-500/20`, Icon: `{color}-400/80`
  - CSS classes: `.icon-badge-amber`, `.icon-badge-rose`, `.icon-badge-primary`, `.icon-badge-purple`, `.icon-badge-emerald`, `.icon-badge-gray`
  - Usage: `<div className="icon-badge-amber"><Ghost /></div>` (no className on icon needed)
- **TwoStageButton** sizing documented:
  - Dimensions: `h-8 w-8` container, `w-4 h-4` icon
  - Variants: `danger` (rose), `warning` (amber), `neutral` (gray)
  - Pattern: First click expands, second click confirms
- **ExcelDataGrid filterType support**:
  - Added `filterType` property to ExcelColumn interface
  - Custom columns can specify filter behavior independently of display
  - `type: "custom"` + `filterType: "select"` = icon display + dropdown filter
  - `columnUniqueValues` now computes for `filterType: "select"` or `filterType: "text"`
- **Triage Panel visual hierarchy**:
  - All columns center-aligned (eliminates middle void)
  - Product Name + Price as heroes (white, font-medium/semibold)
  - Code + % Complete as secondary (gray-500, text-sm)
  - Progress bar: `h-1.5 bg-primary-500/40` (muted L5)
  - Edit button matches TwoStageButton: `h-8 w-8` + `w-4 h-4` icon

**Jan 10, 2026 (Session 40 - Triage Panel L5 Refactor):**
- **Triage Panel refactored to ExcelDataGrid standard**:
  - Replaced custom 300+ line table with ExcelDataGrid component
  - Gained: search, pagination, column filters, sorting, export, column visibility - all free
  - Custom rendering via `type: "custom"` + `render` function for icons/progress bars
  - StatBar integration with muted gray palette for contextual stats
- **ExcelColumn type extended**:
  - Added `align?: "left" | "center" | "right"` property
  - `type: "custom"` with `render?: (value, row) => ReactNode`
  - Both headers and cells now respect alignment
- **ResizableHeader updated**:
  - Respects `column.align` for header text alignment
- **Currency formatting**:
  - Triage Panel uses custom render for `$X.XX` display
  - Pattern: `render: (value) => value != null ? `${value.toFixed(2)}` : "-"`
- **Duplicate edit column removed**:
  - `onRowClick` no longer passed when Actions column has edit button
  - Actions column now centered with edit/delete buttons

**L5 Refactor Pattern (Triage Example):**
```tsx
// Custom column with icon rendering
{
  key: "source",
  name: "Source",
  type: "custom",
  width: 90,
  align: "center",
  render: (value: string) => (
    <div className="flex justify-center">
      {value === "skipped" ? (
        <Ghost className="w-4 h-4 text-amber-400" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-rose-400" />
      )}
    </div>
  ),
}
```

**Jan 10, 2026 (L6 Navigation):**
- **Added L6 — Respect the User's Time** philosophy section:
  - Filter-aware navigation preserves user context
  - Reference implementation: Ingredient navigation with `onFilteredDataChange`
  - "The Test": Re-filtering = L5, arrow key through filtered set = L6
- ExcelDataGrid now exposes filtered data via callback
- Navigation store (`ingredientNavigationStore.ts`) tracks filtered list context
- Guided mode tip explains navigation to new users

**Jan 9, 2026 (Session 2 - Route-Based Editing):**
- **Documented Floating Action Bar** as standard component:
  - Full usage guide with variants (default, warning, danger, success)
  - Anatomy diagram showing glow layers
  - Example code for unsaved changes pattern
  - Added to CSS component library quick reference table
  - Note: "When Steve says action bar, this is what he means"
- Created `IngredientDetailPage` - route-based editing replacing modal
- Added `ConfirmDialog` as standard for destructive confirmations
- Routes: `/admin/data/ingredients/:id` and `/admin/data/ingredients/new`

**Jan 10, 2026 (Session 36):**
- **Triage Workflow** - New tab in VIM (Import → Triage → History)
  - Unified view: Skipped items (0%) + Incomplete ingredients (partial %)
  - Icon-only table with expandable legend
  - Icons: Ghost (skipped), AlertTriangle (incomplete), ShoppingCart (purchased), ChefHat (prep)
- **Ingredient Types** - Purchased vs Prep distinction
  - `ingredient_type: 'purchased' | 'prep'` column
  - `source_recipe_id` for prep → recipe link
  - Type detection: numeric code = purchased, empty/- = prep
- **Friendly ID System** (`src/lib/friendly-id.ts`)
  - Base58 UUID encoding: `7f3a2b1c...` → `Xk9mR2pQ`
  - Deterministic, reversible, URL-safe
  - Future: prep item codes link to source recipes
- **Contextual Back Navigation**
  - `returnTo` field in ingredientNavigationStore
  - Triage → Edit → Back returns to Triage
  - MIL → Edit → Back returns to MIL
  - Dynamic back label: "Back to Triage" vs "Back to Ingredients"
- **Migration Ready** (not yet run): `20250110_ingredient_type.sql`

**Jan 9, 2026 (Late Night):**
- **Documented L5 Header Pattern** with two variants:
  - Variant A: Simple Header (Operations, Settings) - Icon + Title + Expandable Info
  - Variant B: Rich Header (Team Performance) - Icon + Title + Stats Badge + Period Selector + Progress Bar + Expandable Info
- Added Header Anatomy ASCII diagram
- Added reference implementations: `Operations.tsx`, `TeamPerformance/index.tsx`
- Fixed sidebar active states for hash-based routes (#ingredients, #prepared, #inventory)
- Created `ImageWithFallback` component for graceful missing image handling
- Simplified `ExcelImports.tsx` - removed duplicate tab navigation (sidebar handles it)
- Updated `InventoryManagement` with L5 tabs using index.css `.tab` classes

**Jan 8, 2026 (Evening):**
- Added Phase 6 Polish: Dropdown/popover stability pattern
- Added Phase 6 Polish: Form state isolation pattern
- Updated success criteria with stability requirements
- Documented common re-render bugs and fixes

**Jan 8, 2026 (PM Session 2):**
- Added Admin Lifecycle Architecture section
- Added Module Hierarchy (Core vs Optional)
- Added Operations as reference implementation
- Created ROADMAP.md with full product roadmap
- Created ONBOARDING-PHILOSOPHY.md for first-run UX
- Updated References with new documentation links

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

**Jan 13, 2026 (Session 57 - VendorSettings L6):**
- **VendorConfigsStore** (`src/stores/vendorConfigsStore.ts`) - New Zustand store:
  - CRUD for `vendor_configs` table
  - `inferVendorDefaults(vendorName)` - smart defaults based on vendor name patterns
  - GFS/Sysco → CSV, Flanagan's → PDF, Farms/Markets → Manual
- **VendorCard Shared Component** (`src/shared/components/VendorCard/`):
  - Colored initials fallback (like Slack/Gmail)
  - 44px+ touch targets for tablet-first design
  - Invoice type badges: CSV, PDF, Photo, Manual
  - Logo upload on hover to Supabase Storage
  - 3-dot menu with slide animation
- **VendorSettingsModal** - Full config panel:
  - Toggle switches for each invoice method
  - "Smart Defaults" button with sparkle icon
  - Vendor details: account #, rep name/email/phone
  - "Manage vendor list" link to Operations (not Remove)
- **VendorSettings L6 Features**:
  - Search by vendor name
  - Filter: All / Ready / Needs Setup
  - Sort: Name A-Z / Most Invoices / Recent First
  - Responsive grid: 1 col mobile → 2 tablet → 3-4 desktop
  - Database persistence via `vendor_configs` table
- **Architecture Decision**: Vendor CRUD in Operations, config in VIM Settings
- **Terminology**: "imports" → "invoices" in user-facing UI
- **Reference Implementation**: VendorSettings as tablet-first L6 pattern
