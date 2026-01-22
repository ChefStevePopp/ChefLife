# Admin Area Layout Strategy

> **Created:** 2026-01-22 (Session 68)  
> **Purpose:** Consistent responsive layouts across all admin routes

---

## Design Principles

### Target Devices (Admin Side)

| Device | Screen Width | Priority |
|--------|--------------|----------|
| Tablet (landscape) | 1024px | Minimum supported |
| Laptop | 1366-1440px | Primary target |
| Desktop | 1920px | Common |
| Large/Ultrawide | 2560px+ | Supported (not optimized) |

> **Note:** User-facing views (menus, ordering, etc.) will have separate mobile-first strategy.

### Philosophy

1. **Content-first:** Don't stretch content to fill space - maintain readable line lengths
2. **Breathe on big screens:** Center content with comfortable margins
3. **Compact on tablets:** Use available space efficiently without horizontal scroll
4. **Consistent patterns:** Same container behavior across all admin routes

---

## Responsive Container Pattern

### Tailwind Utility Classes

```tsx
// Standard admin content container
className="w-[95%] max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto"
```

| Breakpoint | Width Behavior |
|------------|----------------|
| < 1024px | 95% of viewport (tablet) |
| lg (1024px+) | max 1152px |
| xl (1280px+) | max 1280px |
| 2xl (1536px+) | max 1600px |

### CSS Custom Property (Alternative)

Add to `src/index.css`:

```css
:root {
  --admin-content-width: 95%;
  --admin-max-width: 64rem; /* 1024px default */
}

@media (min-width: 1024px) {
  :root { --admin-max-width: 72rem; } /* 1152px */
}

@media (min-width: 1280px) {
  :root { --admin-max-width: 80rem; } /* 1280px */
}

@media (min-width: 1536px) {
  :root { --admin-max-width: 100rem; } /* 1600px */
}

.admin-container {
  width: var(--admin-content-width);
  max-width: var(--admin-max-width);
  margin-inline: auto;
}
```

---

## Component Patterns

### Page Containers

**Simple page (single column):**
```tsx
<div className="admin-container pb-24">
  {/* Page content */}
</div>
```

**Page with floating action bar:**
```tsx
<div className="admin-container pb-24">
  {/* Page content */}
  
  {/* Floating bar - full width, content constrained */}
  <div className="floating-action-bar">
    <div className="admin-container">
      {/* Bar content */}
    </div>
  </div>
</div>
```

### Grid Layouts

**2-column forms (responsive):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Fields stack on tablet, side-by-side on desktop */}
</div>
```

**3-column cards (responsive):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  {/* 1 col tablet, 2 col laptop, 3 col desktop */}
</div>
```

### Tab Navigation

**Wrap on overflow (preferred approach):**
```tsx
<div className="flex flex-wrap gap-1 pb-2">
  {tabs.map(tab => (
    <button className="px-4 py-2.5 rounded-lg whitespace-nowrap">
      {tab.label}
    </button>
  ))}
</div>
```

---

## Routes to Retrofit

| Route | Component | Current | Status |
|-------|-----------|---------|--------|
| `/admin` | AdminDashboard | `max-w-7xl` | ⬜ Review |
| `/admin/recipes` | RecipeManager | `space-y-6` (no max) | ⬜ Update |
| `/admin/recipes/:id` | RecipeDetailPage | `max-w-5xl` | ✅ Updated |
| `/admin/data/ingredients` | MasterIngredientList | `space-y-6` | ⬜ Update |
| `/admin/data/ingredients/:id` | IngredientDetailPage | `max-w-3xl` | ⬜ Update |
| `/admin/data/invoices` | VendorInvoiceManager | varies | ⬜ Review |
| `/admin/team` | TeamManagement | ? | ⬜ Review |
| `/admin/schedule` | ScheduleManager | ? | ⬜ Review |
| `/admin/operations` | Operations | ? | ⬜ Review |
| `/admin/modules` | ModulesManager | ? | ⬜ Review |

---

## Implementation Plan

### Phase 1: Establish Pattern
1. ✅ Create this strategy document
2. ✅ Add `.admin-container` to `src/index.css`
3. ✅ Update RecipeDetailPage as reference implementation

### Phase 2: Core Data Routes
4. ⬜ RecipeManager
5. ⬜ IngredientDetailPage
6. ⬜ MasterIngredientList
7. ⬜ VendorInvoiceManager

### Phase 3: Secondary Routes
8. ⬜ AdminDashboard
9. ⬜ TeamManagement
10. ⬜ Operations
11. ⬜ ModulesManager
12. ⬜ Others as encountered

---

## Testing Checklist

When updating a route, verify at these widths:

- [ ] 1024px (tablet landscape / small laptop)
- [ ] 1366px (common laptop)
- [ ] 1920px (common desktop)
- [ ] 2560px (large/ultrawide)

Check for:
- [ ] No horizontal scroll
- [ ] Readable line lengths (not too wide)
- [ ] Tabs visible (wrap if needed)
- [ ] Forms usable
- [ ] Cards/grids responsive

---

*Updated: Session 68*
