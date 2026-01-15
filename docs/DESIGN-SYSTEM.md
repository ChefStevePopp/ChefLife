# ChefLife L5 Design System

> **Last Updated:** January 2025  
> **Gold Standard Reference:** `VendorSettings.tsx`

---

## Sub-Header Pattern

The sub-header is the primary content header for tab panels. It creates visual hierarchy below the module header.

### Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Icon Box]  Title                              [Stat] [Stat] [Stat]    │
│             Subtitle                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ ⓘ Expandable Info Section                                        ▼    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│   │ Feature  │ │ Feature  │ │ Feature  │ │ Feature  │   (when open)   │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.subheader` | Container with slate background |
| `.subheader-row` | Flex row for left/right layout |
| `.subheader-left` | Icon box + title group |
| `.subheader-right` | Stats/toggles/actions |
| `.subheader-icon-box` | Colored icon container |
| `.subheader-icon-box.{color}` | Color variants: primary, green, amber, rose, purple, cyan, gray |
| `.subheader-title` | Main heading |
| `.subheader-subtitle` | Description text |
| `.subheader-toggle` | Stat box with label |
| `.subheader-info` | Expandable section container |

### Icon Box Design

```
Container: w-10 h-10 rounded-lg bg-{color}-500/20
Icon:      w-7 h-7 text-{color}-400/80
```

**Color Rule:** The icon box color **inherits from the active tab's color**. This creates visual continuity — you always know where you are.

| Tab | Tab Color | Subheader Icon Box |
|-----|-----------|-------------------|
| Import | primary | `.subheader-icon-box.primary` |
| Triage | green | `.subheader-icon-box.green` |
| Price History | amber | `.subheader-icon-box.amber` |
| Settings | rose | `.subheader-icon-box.rose` |

### Usage Example

```tsx
<div className="subheader">
  <div className="subheader-row">
    {/* Left: Icon + Title */}
    <div className="subheader-left">
      <div className="subheader-icon-box rose">
        <Settings className="w-7 h-7" />
      </div>
      <div>
        <h3 className="subheader-title">Page Title</h3>
        <p className="subheader-subtitle">Brief description</p>
      </div>
    </div>
    
    {/* Right: Stats */}
    <div className="subheader-right">
      <div className="subheader-toggle">
        <div className="subheader-toggle-icon">
          <span className="text-sm font-semibold text-gray-400">42</span>
        </div>
        <span className="subheader-toggle-label">Items</span>
      </div>
    </div>
  </div>

  {/* Expandable Info */}
  <div className="subheader-info expandable-info-section">
    <button className="expandable-info-header w-full justify-between">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">About This Page</span>
      </div>
      <ChevronUp className="w-4 h-4 text-gray-400" />
    </button>
    <div className="expandable-info-content">
      <div className="p-4 pt-2">
        <!-- Feature cards grid -->
      </div>
    </div>
  </div>
</div>
```

---

## Icon Badge Pattern

Small icon containers for status indicators in tables and lists.

### CSS Classes

| Class | Background | Icon Color |
|-------|------------|------------|
| `.icon-badge-amber` | amber-500/20 | amber-400/80 |
| `.icon-badge-rose` | rose-500/20 | rose-400/80 |
| `.icon-badge-primary` | primary-500/20 | primary-400/80 |
| `.icon-badge-purple` | purple-500/20 | purple-400/80 |
| `.icon-badge-emerald` | emerald-500/20 | emerald-400/80 |
| `.icon-badge-gray` | gray-700/50 | gray-500 |

### Sizing Convention

```
Container: w-7 h-7 (default)
Icon:      w-5 h-5 (~70% of container)
```

### Usage Example

```tsx
<div className="icon-badge-amber">
  <Ghost className="w-5 h-5" />
</div>
```

---

## Tab Color Progression

Standard order for multi-tab interfaces:

```
primary (blue) → green → amber → rose → purple → lime → red → cyan
```

Blues bookend the row for visual balance.

---

## Expandable Info Section

Collapsible help/context area with smooth animation.

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.expandable-info-section` | Container with collapsed state |
| `.expandable-info-section.expanded` | Open state |
| `.expandable-info-header` | Clickable header row |
| `.expandable-info-content` | Animated content area |

### Feature Cards (inside expandable)

```tsx
<div className="subheader-feature-card">
  <FileSpreadsheet className="w-4 h-4 text-primary-400" />
  <div>
    <span className="subheader-feature-title text-primary-400">CSV Templates</span>
    <p className="subheader-feature-desc">Map vendor columns to ingredients</p>
  </div>
</div>
```

---

## Color Palette Reference

| Color | Token | Use Case |
|-------|-------|----------|
| Primary (Sky Blue) | `primary-500` | Default actions, links, Import tab |
| Green | `green-500` | Success, PDF, positive changes |
| Amber | `amber-500` | Warning, skipped items, attention |
| Rose | `rose-500` | Settings, danger, negative changes |
| Purple | `purple-500` | Prep items, special categories |
| Cyan | `cyan-500` | History, time-based, secondary blue |
| Gray | `gray-500/600/700` | Neutral, disabled, backgrounds |

---

## Design Principles

### L5: Visual Hierarchy
- Clear information architecture
- Consistent spacing and alignment
- Color codes meaning

### L6: Interaction
- Touch-friendly targets (min 44px)
- Clear affordances
- Smooth transitions

### L7: Data Promise
- Every change traceable
- History preserved
- User trust maintained

---

## File References

- **CSS:** `src/index.css` (search for "L5 SUB-HEADER PATTERN")
- **Gold Standard:** `src/features/admin/components/sections/VendorInvoice/components/VendorSettings.tsx`
- **StatBar Component:** `src/shared/components/StatBar.tsx`
- **ExcelDataGrid:** `src/shared/components/ExcelDataGrid/index.tsx`
