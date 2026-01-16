# NEXUS + Data Model Implementation Roadmap

> **Priority:** HIGH  
> **Status:** ACTIVE  
> **Created:** 2025-01-15

---

## Overview

This roadmap covers the implementation of:
1. **ARCHITECTURE-DATA-MODEL.md** - Enterprise → Region → Unit → User hierarchy
2. **ARCHITECTURE-NEXUS.md** - Widget-based dashboard with security-aware rendering

---

## Immediate Actions (This Sprint)

### 1. Rebrand Admin Dashboard → NEXUS

```
Current: /admin → AdminDashboard.tsx
Target:  /admin → Nexus/index.tsx
```

**Tasks:**
- [ ] Create `src/features/admin/components/Nexus/` directory
- [ ] Create `NexusGrid.tsx` - responsive widget grid
- [ ] Create `WidgetCard.tsx` - standard widget container
- [ ] Move Temperature widget to Nexus widgets folder
- [ ] Move PriceWatch ticker to Nexus widgets folder
- [ ] Create `useNexusContext` hook for scope/surface awareness
- [ ] Update AdminRoutes to use Nexus at index
- [ ] Update sidebar: "Dashboard" → "NEXUS"

### 2. Widget Security Filtering

**Tasks:**
- [ ] Create `config/nexus-widgets.ts` registry
- [ ] Add `minSecurityLevel` to each widget definition
- [ ] Filter visible widgets based on user's security level
- [ ] Test with different security levels (create test users if needed)

### 3. Vertical Widget Cards

**Tasks:**
- [ ] Update Temperature widget to vertical layout
- [ ] Create consistent WidgetCard component pattern
- [ ] Responsive: 4 → 3 → 2 → 1 column grid

---

## Phase 2: Data Model (Next Sprint)

### Database Schema

**Tasks:**
- [ ] Create migration: `20250116_add_regions_locations.sql`
  - [ ] Create `regions` table  
  - [ ] Create `locations` table
  - [ ] Create `location_members` table
- [ ] Create migration: `20250116_migrate_orgs_to_hierarchy.sql`
  - [ ] Create default regions for existing orgs
  - [ ] Create default locations for existing orgs
  - [ ] Migrate team members → location_members
- [ ] Create migration: `20250116_add_location_id_to_operational.sql`
  - [ ] Add `location_id` to haccp_equipment
  - [ ] Add `location_id` to inventory tables
  - [ ] Add `location_id` to schedules
  - [ ] Backfill from organization_id

### Application Updates

**Tasks:**
- [ ] Update `useAuth` hook to include location context
- [ ] Update `supabase` queries to filter by location_id
- [ ] Add location switcher component (for multi-location users)
- [ ] Update RLS policies for location-scoped access

---

## Phase 3: NEXUS Event Bus (Sprint +2)

### Core Event System

**Tasks:**
- [ ] Create `lib/nexus-events.ts`
- [ ] Implement `nexus.emit()` 
- [ ] Implement `nexus.on()` / `nexus.off()`
- [ ] Add Supabase realtime channel for cross-tab sync
- [ ] Create event type definitions

### Widget Communication

**Tasks:**
- [ ] Temperature widget publishes temp events
- [ ] Alerts widget subscribes to all events
- [ ] Prep widget subscribes to equipment events
- [ ] Test cross-widget reactivity

---

## Phase 4: Additional Widgets (Sprint +3)

### Core Widgets to Build

| Widget | Priority | Complexity | Dependencies |
|--------|----------|------------|--------------|
| Staff On Duty | High | Medium | 7shifts or schedule data |
| Prep Status | High | Medium | Prep lists feature |
| Tasks Pending | High | Low | Tasks feature |
| Alerts Summary | High | Low | Activity logs |
| Cover Forecast | Medium | High | OpenTable integration |
| Cost Trends | Medium | High | Invoice + sales data |

---

## File Structure Target

```
src/features/admin/components/
├── Nexus/
│   ├── index.tsx              # Main NEXUS page
│   ├── NexusGrid.tsx          # Responsive widget grid
│   ├── NexusHeader.tsx        # Header with scope switcher
│   ├── WidgetCard.tsx         # Standard widget container
│   └── widgets/
│       ├── TemperatureWidget.tsx
│       ├── PriceWatchWidget.tsx
│       ├── StaffOnDutyWidget.tsx
│       ├── PrepStatusWidget.tsx
│       ├── TasksWidget.tsx
│       ├── AlertsWidget.tsx
│       └── index.ts
├── AdminLayout.tsx
└── ... (other sections)

src/config/
├── nexus-widgets.ts           # Widget registry
└── security.ts                # Existing security levels

src/hooks/
├── useNexusContext.ts         # Scope/surface context
└── useNexusEvents.ts          # Event bus subscriptions

src/lib/
├── nexus-events.ts            # Event bus implementation
└── nexus.ts                   # Existing nexus() logger (keep)
```

---

## Success Metrics

### Phase 1 Complete When:
- [ ] Admin landing shows NEXUS grid instead of old dashboard
- [ ] Temperature widget displays in grid
- [ ] Grid is responsive (4 → 3 → 2 → 1)
- [ ] Widgets filter by security level

### Phase 2 Complete When:
- [ ] `locations` table exists and has Memphis Fire data
- [ ] All operational queries filter by `location_id`
- [ ] Multi-location user can switch between locations

### Phase 3 Complete When:
- [ ] Temperature critical event triggers Alerts widget update
- [ ] Events persist to activity_logs via nexus
- [ ] Real-time sync works across browser tabs

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Security levels (0-5) | ✅ Done | `config/security.ts` |
| SensorPush integration | ✅ Done | `useSensorPush` hook |
| Activity logging | ✅ Done | `nexus()` function |
| Price Watch ticker | ✅ Done | Dashboard component |
| Temperature widget | ✅ Done | Just needs grid placement |

---

## Questions to Resolve

1. **Widget Persistence:** Store user's widget arrangement in user preferences or separate table?
2. **Mobile Surface:** Does mobile get NEXUS or a simplified view?
3. **Kitchen Display:** Same widgets or purpose-built KDS?
4. **Event Retention:** How long to keep nexus events? 7 days? 30 days?

---

## References

- `docs/ARCHITECTURE-DATA-MODEL.md` - Org → Region → Location hierarchy
- `docs/ARCHITECTURE-NEXUS.md` - Event bus and NEXUS page structure  
- `docs/ARCHITECTURE-WIDGETS.md` - Widget context, info density, surface adaptation
- `docs/DESIGN-SYSTEM.md` - L5/L6 component patterns
