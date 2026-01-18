# L5 Subheader Pattern

> **Gold Standard:** `VendorSettings.tsx` (lines ~680-780)  
> **CSS Classes:** `src/index.css` (L5 SUB-HEADER PATTERN section)  
> **Updated:** 2026-01-17

---

## Visual Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                    ┌───┐ ┌───┐ ┌───┐  │
│ │ Icon │  Title                             │ 20│ │ 2 │ │ 18│  │
│ │ Box  │  Subtitle                          │Vnd│ │Rdy│ │Set│  │
│ └──────┘                                    └───┘ └───┘ └───┘  │
├─────────────────────────────────────────────────────────────────┤
│ ⓘ About [Feature]                                          ⌃   │
│   (expandable content with card-style feature highlights)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Copy-Paste Template

```tsx
// Required imports
import { Info, ChevronUp, YourIcon } from "lucide-react";

// Required state
const [isInfoExpanded, setIsInfoExpanded] = useState(false);

// JSX - Copy this exactly
<div className="subheader">
  <div className="subheader-row">
    {/* Left: Icon + Title */}
    <div className="subheader-left">
      <div className="w-10 h-10 rounded-lg bg-{color}-500/20 flex items-center justify-center">
        <YourIcon className="w-7 h-7 text-{color}-400/80" />
      </div>
      <div>
        <h3 className="subheader-title">Your Title Here</h3>
        <p className="subheader-subtitle">Your subtitle description</p>
      </div>
    </div>
    
    {/* Right: Stats toggles */}
    <div className="subheader-right">
      <div className="subheader-toggle">
        <div className="subheader-toggle-icon">
          <span className="text-sm font-semibold text-gray-400">{count1}</span>
        </div>
        <span className="subheader-toggle-label">Label1</span>
      </div>
      {count2 > 0 && (
        <div className="subheader-toggle">
          <div className="subheader-toggle-icon">
            <span className="text-sm font-semibold text-gray-400">{count2}</span>
          </div>
          <span className="subheader-toggle-label">Label2</span>
        </div>
      )}
    </div>
  </div>

  {/* Expandable Info Section */}
  <div className={`subheader-info expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
    <button
      onClick={() => setIsInfoExpanded(!isInfoExpanded)}
      className="expandable-info-header w-full justify-between"
    >
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-300">About [Feature Name]</span>
      </div>
      <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
    </button>
    <div className="expandable-info-content">
      <div className="p-4 pt-2 space-y-4">
        <p className="text-sm text-gray-400">
          Your description paragraph here.
        </p>
        
        {/* Card-style feature highlights (optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-700/30">
            <Icon1 className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-primary-400">Feature 1</span>
              <p className="text-xs text-gray-500">Description</p>
            </div>
          </div>
          {/* Repeat for more features */}
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Optional footer hint text
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## Key Components

### 1. Wrapper
- Class: `.subheader`
- Provides: card background, border, rounded corners, padding

### 2. Main Row
- Class: `.subheader-row`
- Layout: flex, space-between, items-center

### 3. Left Section
- Class: `.subheader-left`
- Contains: Icon box + title/subtitle

### 4. Icon Box Pattern
```tsx
<div className="w-10 h-10 rounded-lg bg-{color}-500/20 flex items-center justify-center">
  <Icon className="w-7 h-7 text-{color}-400/80" />
</div>
```
- Container: `w-10 h-10` (40px)
- Icon: `w-7 h-7` (70% of container)
- Icon opacity: `80%` (step-down from container)

### 5. Right Section (Stats)
- Class: `.subheader-right`
- Contains: `.subheader-toggle` items

### 6. Stats Toggle Pattern
```tsx
<div className="subheader-toggle">
  <div className="subheader-toggle-icon">
    <span className="text-sm font-semibold text-gray-400">{number}</span>
  </div>
  <span className="subheader-toggle-label">Label</span>
</div>
```

### 7. Expandable Info
- Classes: `.subheader-info`, `.expandable-info-section`
- Toggle: Add/remove `.expanded` class
- ChevronUp rotates 180° when collapsed

---

## Color by Section

| Section | Icon Box BG | Icon Color |
|---------|-------------|------------|
| Default/Primary | `bg-primary-500/20` | `text-primary-400/80` |
| Kitchen | `bg-primary-500/20` | `text-primary-400/80` |
| Team | `bg-green-500/20` | `text-green-400/80` |
| Data | `bg-amber-500/20` | `text-amber-400/80` |
| Organization | `bg-rose-500/20` | `text-rose-400/80` |
| Settings | `bg-rose-500/20` | `text-rose-400/80` |

---

## When to Use

✅ **Use this pattern for:**
- Module configuration pages (VendorSettings, Operations)
- List pages with contextual stats
- Any page needing expandable help/info section
- Pages with multiple stat counters

❌ **Don't use for:**
- Main module headers (use L5 Header pattern instead)
- Simple content sections without stats
- Modal headers

---

## Reference Implementations

1. **Gold Standard:** `src/features/admin/components/sections/VendorInvoice/components/VendorSettings.tsx`
2. **Operations:** `src/features/admin/components/sections/Operations/Operations.tsx`

---

## CSS Location

All classes defined in `src/index.css`:
- Search for "L5 SUB-HEADER PATTERN"
- Lines ~150-450
