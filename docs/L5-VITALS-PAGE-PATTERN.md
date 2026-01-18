# L5 Vitals Page Pattern

> **Gold Standard:** `AdminDash_KitchenTab.tsx`  
> **Also See:** `VendorAnalytics.tsx` (4-section analytics flow)  
> **Updated:** 2026-01-17

---

## When to Use

This pattern is for **dashboard pages that surface vitals from a domain** with drill-down capability:

- NEXUS Dashboard tabs (Kitchen, Team, Data, Organization, Craft)
- Analytics review pages (VendorAnalytics)
- Any "at a glance" page with collapsible detail sections
- Data triage interfaces

**Not for:** Configuration pages, form-heavy editors, or simple list views.

---

## Visual Anatomy

```
┌─ Subheader ────────────────────────────────────────────────────────┐
│ [Icon] Page Title                         [Compact Hero Widget]    │
│        Subtitle description                                        │
├────────────────────────────────────────────────────────────────────┤
│ ⓘ About [Feature]                                              ▼   │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│   │ Feature 1    │ │ Feature 2    │ │ Feature 3    │  (when open)  │
│   └──────────────┘ └──────────────┘ └──────────────┘               │
└────────────────────────────────────────────────────────────────────┘

┌─ Accordion Section ────────────────────────────────────────────────┐
│ [🔵] Section Title                              ┌──────────┐       │
│      Subtitle description                       │ 15 items │   ▼   │
│                                                 └──────────┘       │
└────────────────────────────────────────────────────────────────────┘

┌─ Accordion Section (expanded) ─────────────────────────────────────┐
│ [🟡] Section Title                              ┌──────────┐       │
│      Subtitle description                       │ 3 alerts │   ▲   │
│                                                 └──────────┘       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   [Section content - tables, cards, lists, etc.]                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Subheader (Container)

Uses the standard `.subheader` class from `index.css`.

```tsx
<div className="subheader">
  <div className="subheader-row">
    <div className="subheader-left">
      {/* Icon + Title */}
    </div>
    <div className="subheader-right">
      {/* Hero Widget */}
    </div>
  </div>
  
  {/* Expandable Info Section */}
  <div className={`expandable-info-section mt-4 ${isInfoExpanded ? 'expanded' : ''}`}>
    {/* ... */}
  </div>
</div>
```

### 2. Hero Widget (Compact)

A **contextual, compact widget** in the subheader-right that shows the most important real-time data for this domain.

| Page | Hero Widget |
|------|-------------|
| Kitchen | Compact Temperature Widget (cycles through equipment) |
| Team | "X on shift" indicator |
| Data | Price change trend indicator |
| Organization | Alert count badge |
| Craft | Training progress |

**Design requirements:**
- Fits in subheader row (shorter, wider)
- `px-4 py-1.5` padding (not full card padding)
- `bg-gray-800/50 rounded-lg` background
- Click navigates to detail page
- Uses `AnimatedNumber` for smooth transitions

**Reference:** `TemperatureStatCardCompact.tsx`

### 3. Expandable Info Section

Educational content explaining the page. Uses standard pattern from `L5-SUBHEADER-PATTERN.md`.

```tsx
<div className={`expandable-info-section mt-4 ${isInfoExpanded ? 'expanded' : ''}`}>
  <button
    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
    className="expandable-info-header w-full justify-between"
  >
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
      <span className="text-sm font-medium text-gray-300">About [Feature]</span>
    </div>
    <ChevronUp className="w-4 h-4 text-gray-400" />
  </button>
  <div className="expandable-info-content">
    <div className="p-4 pt-2 space-y-4">
      <p className="text-sm text-gray-400">
        {/* Description */}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Feature cards */}
      </div>
    </div>
  </div>
</div>
```

### 4. Accordion Sections

Each section is a collapsible card with:
- **Colored icon box** (L5 palette)
- **Title + subtitle**
- **Stat pill** (animated number, gray palette)
- **Chevron** (up when expanded)

```tsx
<div
  className={`card overflow-hidden transition-all duration-300 ${
    isExpanded ? "bg-gray-800/50" : "bg-gray-800/30"
  }`}
>
  <button
    onClick={() => toggleSection(section.id)}
    className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
  >
    {/* Left: Icon + Title */}
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="text-left">
        <h3 className="text-base font-medium text-white">{section.label}</h3>
        <p className="text-xs text-gray-500">{section.subtitle}</p>
      </div>
    </div>

    {/* Right: Stat Pill + Chevron */}
    <div className="flex items-center gap-3">
      <div className="flex items-baseline gap-1.5 px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-lg">
        <AnimatedNumber
          value={statValue}
          decimals={0}
          duration={1500}
          className="text-base font-semibold text-gray-300 tabular-nums"
        />
        <span className="text-xs text-gray-500">{section.statSuffix}</span>
      </div>
      
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </div>
  </button>

  {isExpanded && (
    <div className="px-4 pb-4 border-t border-gray-700/50">
      {/* Section content */}
    </div>
  )}
</div>
```

---

## Stat Pill Styling

The stat pill uses the **muted gray palette** - it informs without demanding attention.

```tsx
// Standard gray pill (default state)
<div className="flex items-baseline gap-1.5 px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-lg">
  <AnimatedNumber
    value={15}
    decimals={0}
    duration={1500}
    className="text-base font-semibold text-gray-300 tabular-nums"
  />
  <span className="text-xs text-gray-500">pending</span>
</div>
```

**Future: Severity-based pill colors** (when data warrants it):

| State | Background | Border | Text |
|-------|------------|--------|------|
| Normal | `bg-gray-700/50` | `border-gray-600/50` | `text-gray-300` |
| Warning | `bg-amber-500/10` | `border-amber-500/30` | `text-amber-400` |
| Critical | `bg-rose-500/10` | `border-rose-500/30` | `text-rose-400` |
| Success | `bg-emerald-500/10` | `border-emerald-500/30` | `text-emerald-400` |

---

## AnimatedNumber on Load

Numbers animate **from 0 to their value** on initial load. This creates a premium "dashboard coming alive" feel.

```tsx
import { AnimatedNumber } from "@/shared/components/AnimatedNumber";

<AnimatedNumber
  value={85}
  decimals={0}
  duration={1500}
  className="text-base font-semibold text-gray-300 tabular-nums"
/>
```

**Key props:**
- `duration={1500}` — 1.5 seconds feels premium without being slow
- `decimals={0}` — whole numbers for counts, `1` for percentages/temps
- `tabular-nums` — prevents digit jumping during animation

---

## LocalStorage Persistence

Accordion expanded state persists across page navigation and browser refresh.

```tsx
const STORAGE_KEY = "cheflife-kitchen-expanded";

// Load from localStorage
const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as SectionId[]);
    }
  } catch (e) {
    console.error("Error loading expanded state:", e);
  }
  return new Set(); // Default: all collapsed
});

// Save to localStorage
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
}, [expandedSections]);
```

**Storage key convention:** `cheflife-{tab}-expanded`

---

## Section Definitions Pattern

Define sections as a typed constant array for consistency:

```tsx
const SECTIONS = [
  {
    id: "haccp",
    icon: Thermometer,
    color: "primary",
    label: "HACCP Monitoring",
    subtitle: "Temperature exceptions and food safety compliance alerts",
    statKey: "haccpFlags",
    statSuffix: "flags",
  },
  {
    id: "recipes",
    icon: FileText,
    color: "amber",
    label: "Recipe Activity",
    subtitle: "Creation, modifications, and cost impact tracking",
    statKey: "recipesNew",
    statSuffix: "new",
  },
  // ... more sections
] as const;

type SectionId = typeof SECTIONS[number]["id"];
```

**Color options:** `primary`, `amber`, `emerald`, `purple`, `rose`, `cyan`

---

## Color Classes Helper

```tsx
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: "bg-primary-500/20", text: "text-primary-400", border: "border-primary-500/30" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
};
```

---

## Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile (`< sm`) | Hero widget may stack below title; stat pills remain visible |
| Tablet (`sm` - `lg`) | Side-by-side layout works well |
| Desktop (`lg+`) | Full width, generous spacing |

**Key responsive classes:**
- Subheader: `subheader-row` handles flex-col on mobile via `lg:flex-row`
- Feature cards: `grid-cols-1 sm:grid-cols-2`
- Accordions: Full width at all breakpoints

---

## Implementation Checklist

When building a new Vitals Page:

- [ ] Create tab component in appropriate location
- [ ] Define `SECTIONS` constant with icons, colors, labels
- [ ] Import/create compact hero widget for subheader
- [ ] Add expandable info section with feature cards
- [ ] Build accordion sections with stat pills
- [ ] Wire up localStorage persistence for expanded state
- [ ] Connect stats to real data sources (stores, hooks)
- [ ] Add placeholder content for expanded sections
- [ ] Test responsive behavior

---

## Files Using This Pattern

| File | Domain |
|------|--------|
| `AdminDash_KitchenTab.tsx` | Kitchen vitals (Gold Standard) |
| `VendorAnalytics.tsx` | Vendor analytics (4-section flow) |
| `AdminDash_TeamTab.tsx` | Team vitals (planned) |
| `AdminDash_DataTab.tsx` | Data vitals (planned) |
| `AdminDash_OrganizationTab.tsx` | Org vitals (planned) |
| `AdminDash_CraftPerfectedTab.tsx` | Education vitals (planned) |

---

## Related Documentation

- [L5-BUILD-STRATEGY.md](L5-BUILD-STRATEGY.md) — Overall L5 philosophy
- [L5-SUBHEADER-PATTERN.md](L5-SUBHEADER-PATTERN.md) — Subheader copy-paste template
- [AnimatedNumber](../src/shared/components/AnimatedNumber/) — Number animation component

---

*Created: Session 62 (2026-01-17)*
