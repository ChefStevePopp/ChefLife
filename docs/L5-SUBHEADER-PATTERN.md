# L5 Subheader Pattern

> **Gold Standard:** `ImportHistory.tsx`, `TriagePanel.tsx`, `PriceHistory.tsx`  
> **CSS Classes:** `src/index.css` (L5 SUB-HEADER PATTERN section)  
> **Updated:** 2026-01-18

---

## Philosophy

> "Let the color of the headline draw the eye... it's not quite the vibe until it's subtle."

The L5 subheader uses **color restraint**:
- **Tab identity color** reserved for the expandable info icon only
- **White** for the expandable title (clean, readable)
- **Gray palette** for everything else (stats, card titles, body text)
- **Weight over brightness** — use `font-semibold` for emphasis, not bright colors

---

## Visual Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                          ┌───┐ ┌───┐ ┌───┐    │
│ │ Tab  │  Title                                   │ 25│ │ 23│ │ 2 │  ↻ │
│ │Color │  Subtitle                                │Tot│ │Cmp│ │Sup│    │
│ └──────┘                                          └───┘ └───┘ └───┘    │
├─────────────────────────────────────────────────────────────────────────┤
│ [tab-color] ⓘ  About [Feature]                                      ⌃  │
│                                                                         │
│   Description paragraph text in gray-400...                             │
│                                                                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │[tab/80] Feature1│  │[tab/80] Feature2│  │[tab/80] Feature3│        │
│   │ gray-300 title  │  │ gray-300 title  │  │ gray-300 title  │        │
│   │ gray-500 desc   │  │ gray-500 desc   │  │ gray-500 desc   │        │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│   Footer hint text in gray-500, centered                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Color Hierarchy (The Pattern)

| Element | Color | Why |
|---------|-------|-----|
| Icon box background | `{tab-color}-500/20` | Tab identity |
| Icon box icon | `{tab-color}-400/80` | Tab identity |
| Expandable info icon | `{tab-color}-400` | **Draws the eye** |
| Expandable title | `white` | Clean, readable |
| Feature card icons | `{tab-color}-400/80` | Unified tab identity |
| Feature card titles | `gray-300` | Readable, not competing |
| Feature card descriptions | `gray-500` | Supporting info |
| Stats values | `gray-400` | Calm, informational |
| Stats labels | `gray-500` | Muted |
| Body text | `gray-400` | Standard content |
| Footer hints | `gray-500` | Tertiary info |

**Key Insight:** The only "bright" colors are:
1. The icon box (tab identity)
2. The expandable info icon (draws attention to learn more)

Everything else stays in the gray family for a calm, premium feel.

---

## Tab Identity Colors

| Tab | Color | Icon Box Class |
|-----|-------|----------------|
| Import | `primary` | `.subheader-icon-box.primary` |
| Triage | `cyan` | `.subheader-icon-box.cyan` |
| History | `lime` | `.subheader-icon-box.lime` |
| Price History | `primary` | `.subheader-icon-box.primary` |
| Analytics | `green` | `.subheader-icon-box.green` |
| Code Groups | `amber` | `.subheader-icon-box.amber` |
| Umbrella Items | `rose` | `.subheader-icon-box.rose` |
| Settings | `rose` | `.subheader-icon-box.rose` |

---

## Copy-Paste Template

```tsx
// Required imports
import { Info, ChevronUp, YourIcon, Feature1Icon, Feature2Icon, Feature3Icon } from "lucide-react";

// Required state
const [isInfoExpanded, setIsInfoExpanded] = useState(false);

// JSX - The Refined Pattern
<div className="subheader">
  <div className="subheader-row">
    {/* Left: Icon + Title */}
    <div className="subheader-left">
      <div className="subheader-icon-box {tab-color}">
        <YourIcon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="subheader-title">Your Title Here</h3>
        <p className="subheader-subtitle">Your subtitle description</p>
      </div>
    </div>
    
    {/* Right: Stats (gray palette, font-medium) */}
    <div className="subheader-right">
      <div className="subheader-toggle">
        <div className="subheader-toggle-icon">
          <span className="text-sm font-medium text-gray-400">{count1}</span>
        </div>
        <span className="subheader-toggle-label">Label1</span>
      </div>
      <div className="subheader-toggle">
        <div className="subheader-toggle-icon">
          <span className="text-sm font-medium text-gray-400">{count2}</span>
        </div>
        <span className="subheader-toggle-label">Label2</span>
      </div>
      
      <button onClick={handleRefresh} className="btn-ghost p-2" title="Refresh">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  </div>

  {/* Expandable Info Section - THE REFINED PATTERN */}
  <div className={`subheader-info expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
    <button
      onClick={() => setIsInfoExpanded(!isInfoExpanded)}
      className="expandable-info-header w-full justify-between"
    >
      <div className="flex items-center gap-2">
        {/* Tab color icon - draws the eye */}
        <Info className="w-4 h-4 text-{tab-color}-400 flex-shrink-0" />
        {/* White title - clean and readable */}
        <span className="text-sm font-medium text-white">About [Feature Name]</span>
      </div>
      <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
    </button>
    <div className="expandable-info-content">
      <div className="p-4 pt-2 space-y-4">
        {/* Body paragraph - gray-400 */}
        <p className="text-sm text-gray-400">
          Your description paragraph here. Use <span className="font-semibold">font-semibold</span> for 
          emphasis within the text, not bright colors.
        </p>
        
        {/* Feature cards - unified tab color icons, gray titles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="subheader-feature-card">
            {/* Tab color at 80% for icons */}
            <Feature1Icon className="w-4 h-4 text-{tab-color}-400/80" />
            <div>
              {/* Gray-300 for titles - readable but not competing */}
              <span className="subheader-feature-title text-gray-300">Feature 1</span>
              <p className="subheader-feature-desc">Description text</p>
            </div>
          </div>
          
          <div className="subheader-feature-card">
            <Feature2Icon className="w-4 h-4 text-{tab-color}-400/80" />
            <div>
              <span className="subheader-feature-title text-gray-300">Feature 2</span>
              <p className="subheader-feature-desc">Description text</p>
            </div>
          </div>
          
          <div className="subheader-feature-card">
            <Feature3Icon className="w-4 h-4 text-{tab-color}-400/80" />
            <div>
              <span className="subheader-feature-title text-gray-300">Feature 3</span>
              <p className="subheader-feature-desc">Description text</p>
            </div>
          </div>
        </div>
        
        {/* Footer hint - gray-500, centered */}
        <p className="text-xs text-gray-500 text-center">
          Optional footer hint text here.
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## Icon Box CSS Classes

Add to `src/index.css` under the L5 SUB-HEADER section:

```css
/* Icon box color variants */
.subheader-icon-box {
  @apply w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0;
}

.subheader-icon-box.primary {
  @apply bg-primary-500/20;
}
.subheader-icon-box.primary svg {
  @apply text-primary-400/80;
}

.subheader-icon-box.cyan {
  @apply bg-cyan-500/20;
}
.subheader-icon-box.cyan svg {
  @apply text-cyan-400/80;
}

.subheader-icon-box.lime {
  @apply bg-lime-500/20;
}
.subheader-icon-box.lime svg {
  @apply text-lime-400/80;
}

.subheader-icon-box.green {
  @apply bg-green-500/20;
}
.subheader-icon-box.green svg {
  @apply text-green-400/80;
}

.subheader-icon-box.amber {
  @apply bg-amber-500/20;
}
.subheader-icon-box.amber svg {
  @apply text-amber-400/80;
}

.subheader-icon-box.rose {
  @apply bg-rose-500/20;
}
.subheader-icon-box.rose svg {
  @apply text-rose-400/80;
}
```

---

## Stats Pattern (Gray Palette)

**Before (gaudy):**
```tsx
<span className="text-sm font-semibold text-amber-400">{skippedCount}</span>
<span className="text-sm font-semibold text-rose-400">{incompleteCount}</span>
```

**After (refined):**
```tsx
<span className="text-sm font-medium text-gray-400">{skippedCount}</span>
<span className="text-sm font-medium text-gray-400">{incompleteCount}</span>
```

**Why:** Stats inform, they don't compete. The colored icon box already establishes tab identity. Stats should be calm and readable, not attention-grabbing.

---

## Exception: Semantic Legend Cards

Some tabs (like Triage) have expandable info cards that serve as a **legend** for icons in the data grid. In this case, the cards keep semantic colors because they explain what the icons mean:

```tsx
{/* Triage legend - semantic colors explain the grid icons */}
<div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
  <div className="icon-badge-amber">
    <Ghost />
  </div>
  <span className="text-sm font-medium text-amber-400">Skipped Items</span>
  <p className="text-xs text-gray-500">From invoice import...</p>
</div>
```

**Rule:** Use semantic colors in expandable info ONLY when the cards explain icons used elsewhere in the UI.

---

## Reference Implementations

| Tab | File | Pattern Notes |
|-----|------|---------------|
| **History** ✅ | `ImportHistory.tsx` | Lime tab, white title, gray stats |
| **Triage** ✅ | `TriagePanel.tsx` | Cyan tab, semantic legend cards |
| **Price History** ✅ | `PriceHistory.tsx` | Primary tab, 4-column feature grid |
| **Analytics** ✅ | `VendorAnalytics.tsx` | Green tab, 4-section navigation |
| **Code Groups** ✅ | `ItemCodeGroupManager.tsx` | Amber tab, simple text info |
| **Umbrella Items** ✅ | `UmbrellaIngredientManager.tsx` | Rose tab, 3-column feature grid |

---

## The Test

Look at your expandable info section and ask:

1. **Is the info icon the tab's color?** (draws attention)
2. **Is the title white?** (clean, readable)
3. **Are all feature card icons the same color (tab at 80%)?** (unified)
4. **Are feature card titles gray-300?** (readable, not competing)
5. **Are stats gray-400 with font-medium?** (calm, informational)

If yes to all five, you've got the L5 refined pattern. 🎯

---

*Last updated: January 18, 2026 — Refined color hierarchy established*
