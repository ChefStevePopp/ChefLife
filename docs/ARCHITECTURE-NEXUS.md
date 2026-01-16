# NEXUS Architecture

> **Priority:** HIGH  
> **Status:** PLANNING  
> **Created:** 2025-01-15  
> **Authors:** Steve, Claude

---

## Overview

NEXUS is ChefLife's **desktop**—the home screen where everything launches. It's not a passive dashboard; it's an active workspace of app launchers with live data badges. Every widget is an entry point into a feature.

**Core Paradigm:**
```
┌─────────┐
│  🌡️     │
│  38°F   │  ← Live badge
│  Temps  │  ← Tap = Launch HACCP
└─────────┘
```

**Core Principles:**
1. **Desktop, not dashboard** - Widgets are launchers, not displays
2. **Everything Publishes, Everything Subscribes** - Components communicate through NEXUS events
3. **Context-Aware Rendering** - Same widget, different preview density based on security
4. **Permission-Driven Display** - Security levels (0-5) control information density
5. **Scale-Agnostic** - Works for one food truck or 500 franchise locations

---

## The Launcher Grid

NEXUS presents as a responsive grid of launcher widgets:

```
Desktop (4 across):
┌─────────┬─────────┬─────────┬─────────┐
│  Temps  │  Price  │  Staff  │  Prep   │
│ Monitor │  Watch  │   On    │ Status  │
├─────────┼─────────┼─────────┼─────────┤
│  Tasks  │ Covers  │  Costs  │ Alerts  │
│ Pending │Forecast │ Trends  │ Summary │
└─────────┴─────────┴─────────┴─────────┘

Tablet (3 across):
┌─────────┬─────────┬─────────┐
│  Temps  │  Price  │  Staff  │
├─────────┼─────────┼─────────┤
│  Prep   │  Tasks  │ Covers  │
├─────────┼─────────┼─────────┤
│  Costs  │ Alerts  │         │
└─────────┴─────────┴─────────┘

Mobile (2 → 1):
┌─────────┬─────────┐
│  Temps  │  Alerts │
├─────────┼─────────┤
│  Prep   │  Tasks  │
└─────────┴─────────┘
```

---

## Widget Architecture

### Widget Definition

```typescript
// types/nexus.ts

export type SecurityLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type Surface = 'admin' | 'kitchen' | 'mobile';
export type Scope = 'location' | 'region' | 'organization';
export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2';

export interface WidgetContext {
  // WHO is viewing
  securityLevel: SecurityLevel;
  userId: string;
  
  // WHERE they're viewing
  surface: Surface;
  
  // WHAT scope they're viewing
  scope: Scope;
  organizationId: string;
  regionId?: string;
  locationId?: string;
}

export interface NexusWidget {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  
  // Permissions
  minSecurityLevel: SecurityLevel;
  allowedSurfaces: Surface[];
  allowedScopes: Scope[];
  
  // Layout
  defaultSize: WidgetSize;
  allowResize: boolean;
  defaultPosition: { row: number; col: number };
  
  // Component
  component: React.FC<{ context: WidgetContext }>;
  
  // Data dependencies (for prefetching)
  dataSources: string[];
}
```

### Widget Registry

```typescript
// config/nexus-widgets.ts

import { 
  ThermometerSnowflake, 
  DollarSign, 
  Users, 
  ClipboardList,
  CheckSquare,
  CalendarDays,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export const NEXUS_WIDGETS: NexusWidget[] = [
  {
    id: 'temperature-monitor',
    name: 'Temperature Monitor',
    description: 'Real-time fridge and freezer monitoring via SensorPush',
    icon: ThermometerSnowflake,
    minSecurityLevel: 2,        // Bravo+
    allowedSurfaces: ['admin', 'kitchen', 'mobile'],
    allowedScopes: ['location', 'region', 'organization'],
    defaultSize: '1x1',
    allowResize: true,
    defaultPosition: { row: 0, col: 0 },
    component: TemperatureWidget,
    dataSources: ['sensorpush', 'haccp_equipment'],
  },
  {
    id: 'price-watch',
    name: 'Price Watch',
    description: 'Ingredient price changes from recent invoices',
    icon: DollarSign,
    minSecurityLevel: 4,        // Delta+
    allowedSurfaces: ['admin'],
    allowedScopes: ['location', 'region', 'organization'],
    defaultSize: '2x1',
    allowResize: true,
    defaultPosition: { row: 0, col: 1 },
    component: PriceWatchWidget,
    dataSources: ['vendor_invoices', 'master_ingredients'],
  },
  {
    id: 'staff-on-duty',
    name: 'Staff On Duty',
    description: 'Who\'s clocked in right now',
    icon: Users,
    minSecurityLevel: 2,        // Bravo+
    allowedSurfaces: ['admin', 'kitchen'],
    allowedScopes: ['location'],
    defaultSize: '1x1',
    allowResize: false,
    defaultPosition: { row: 0, col: 3 },
    component: StaffOnDutyWidget,
    dataSources: ['schedules', 'time_entries'],
  },
  {
    id: 'prep-status',
    name: 'Prep Status',
    description: 'Today\'s prep completion',
    icon: ClipboardList,
    minSecurityLevel: 1,        // Alpha+
    allowedSurfaces: ['admin', 'kitchen', 'mobile'],
    allowedScopes: ['location'],
    defaultSize: '1x1',
    allowResize: true,
    defaultPosition: { row: 1, col: 0 },
    component: PrepStatusWidget,
    dataSources: ['prep_lists', 'prep_completions'],
  },
  {
    id: 'tasks-pending',
    name: 'Tasks Pending',
    description: 'Open tasks requiring attention',
    icon: CheckSquare,
    minSecurityLevel: 1,        // Alpha+
    allowedSurfaces: ['admin', 'kitchen', 'mobile'],
    allowedScopes: ['location', 'region'],
    defaultSize: '1x1',
    allowResize: true,
    defaultPosition: { row: 1, col: 1 },
    component: TasksWidget,
    dataSources: ['tasks'],
  },
  {
    id: 'cover-forecast',
    name: 'Cover Forecast',
    description: 'Expected covers from reservations + historical',
    icon: CalendarDays,
    minSecurityLevel: 3,        // Charlie+
    allowedSurfaces: ['admin', 'kitchen'],
    allowedScopes: ['location', 'region'],
    defaultSize: '1x1',
    allowResize: true,
    defaultPosition: { row: 1, col: 2 },
    component: CoverForecastWidget,
    dataSources: ['reservations', 'sales_history'],
  },
  {
    id: 'cost-trends',
    name: 'Cost Trends',
    description: 'Food and labor cost tracking',
    icon: TrendingUp,
    minSecurityLevel: 5,        // Echo only
    allowedSurfaces: ['admin'],
    allowedScopes: ['location', 'region', 'organization'],
    defaultSize: '2x1',
    allowResize: true,
    defaultPosition: { row: 1, col: 3 },
    component: CostTrendsWidget,
    dataSources: ['invoices', 'sales', 'labor'],
  },
  {
    id: 'alerts-summary',
    name: 'Alerts',
    description: 'System alerts and notifications',
    icon: AlertTriangle,
    minSecurityLevel: 2,        // Bravo+
    allowedSurfaces: ['admin', 'kitchen', 'mobile'],
    allowedScopes: ['location', 'region', 'organization'],
    defaultSize: '1x1',
    allowResize: true,
    defaultPosition: { row: 0, col: 3 },
    component: AlertsWidget,
    dataSources: ['activity_logs', 'nexus_events'],
  },
];
```

---

## Security-Level Widget Visibility

| Widget | Omega (0) | Alpha (1) | Bravo (2) | Charlie (3) | Delta (4) | Echo (5) |
|--------|:---------:|:---------:|:---------:|:-----------:|:---------:|:--------:|
| Prep Status | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tasks | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Temperature | — | — | ✓ | ✓ | ✓ | ✓ |
| Staff On Duty | — | — | ✓ | ✓ | ✓ | ✓ |
| Alerts | — | — | ✓ | ✓ | ✓ | ✓ |
| Cover Forecast | — | — | — | ✓ | ✓ | ✓ |
| Price Watch | — | — | — | — | ✓ | ✓ |
| Cost Trends | — | — | — | — | — | ✓ |

---

## Context-Aware Rendering

The same widget renders differently based on context:

### Temperature Widget Examples

```typescript
// Same component, different renders based on context

// Echo @ Organization scope
<TemperatureWidget context={{ 
  securityLevel: 5, 
  scope: 'organization',
  surface: 'admin'
}} />
// Shows: "47 sensors across 12 locations | 2 critical alerts"
// Click: Drill to region → location → equipment

// Delta @ Region scope  
<TemperatureWidget context={{ 
  securityLevel: 4,
  scope: 'region',
  regionId: 'ontario',
  surface: 'admin'
}} />
// Shows: "18 sensors across 5 Ontario locations | 1 warning"
// Click: Drill to location → equipment

// Bravo @ Location scope  
<TemperatureWidget context={{ 
  securityLevel: 2,
  scope: 'location',
  locationId: 'memphis-fire-winona',
  surface: 'kitchen'
}} />
// Shows: Cycles through 6 fridges/freezers at this location
// Click: Opens logging modal
```

### Implementation Pattern

```typescript
// components/widgets/TemperatureWidget.tsx

export const TemperatureWidget: React.FC<{ context: WidgetContext }> = ({ context }) => {
  const { securityLevel, scope, surface, locationId, regionId, organizationId } = context;
  
  // Fetch data based on scope
  const { data, isLoading } = useTemperatureData({
    scope,
    organizationId,
    regionId,
    locationId,
  });
  
  // Determine interaction level
  const canEdit = securityLevel >= 3;
  const canDrillDown = scope !== 'location' && securityLevel >= 3;
  const canLog = surface === 'kitchen' && securityLevel >= 2;
  
  // Render appropriate view
  if (scope === 'organization') {
    return <OrgTemperatureView data={data} canDrillDown={canDrillDown} />;
  }
  
  if (scope === 'region') {
    return <RegionTemperatureView data={data} canDrillDown={canDrillDown} />;
  }
  
  // Default: Location scope
  return (
    <LocationTemperatureView 
      data={data}
      canEdit={canEdit}
      canLog={canLog}
      surface={surface}
    />
  );
};
```

---

## The NEXUS Event Bus

NEXUS isn't just display—it's the central event bus for the entire system.

### Event Architecture

```typescript
// lib/nexus-events.ts

type NexusEventType = 
  | 'equipment:temp_normal'
  | 'equipment:temp_warning'
  | 'equipment:temp_critical'
  | 'prep:item_completed'
  | 'prep:item_overdue'
  | 'inventory:low_stock'
  | 'inventory:count_completed'
  | 'labor:clock_in'
  | 'labor:clock_out'
  | 'task:created'
  | 'task:completed'
  | 'invoice:processed'
  | 'invoice:price_change'
  // ... etc

interface NexusEvent {
  type: NexusEventType;
  timestamp: string;
  organizationId: string;
  regionId?: string;
  locationId: string;
  userId?: string;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

// Publishing events
nexus.emit('equipment:temp_critical', {
  locationId: 'memphis-fire-winona',
  equipmentId: 'walk-in-2',
  temperature: 44.2,
  threshold: 40,
});

// Subscribing to events
nexus.on('equipment:temp_critical', (event) => {
  // Prep widget: Flag affected items
  // Labor widget: Alert on-duty manager
  // Alerts widget: Log and display
  // Mobile: Push notification
});

// Wildcard subscriptions
nexus.on('equipment:*', handleAllEquipmentEvents);
nexus.on('*:critical', handleAllCriticalEvents);
```

### Event Flow Example

```
┌─────────────────────────────────────────────────────────────────┐
│ SensorPush reads 44.2°F from Walk-in #2                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ NEXUS receives: equipment:temp_critical                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   Temp   │   │   Prep   │   │  Alerts  │   │  Mobile  │
    │  Widget  │   │  Widget  │   │  Widget  │   │   Push   │
    └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    Shows red      Flags items     Logs event     Push to
    indicator      in walk-in      with action    manager
                   as at-risk      required       on duty
```

### Cross-Widget Communication

```typescript
// Prep widget subscribes to temperature events
useEffect(() => {
  const unsubscribe = nexus.on('equipment:temp_critical', (event) => {
    const affectedItems = prepItems.filter(
      item => item.storageLocation === event.data.equipmentId
    );
    setAtRiskItems(affectedItems);
  });
  
  return unsubscribe;
}, [prepItems]);

// Labor widget subscribes to determine who should respond
useEffect(() => {
  const unsubscribe = nexus.on('equipment:temp_critical', (event) => {
    const onDutyManager = getOnDutyManager(event.locationId);
    if (onDutyManager) {
      sendAlert(onDutyManager, event);
    }
  });
  
  return unsubscribe;
}, []);
```

---

## NEXUS Page Component

### Route Change

```typescript
// Admin Dashboard → NEXUS
// /admin → /admin (same route, new component)

// routes/AdminRoutes.tsx
import { Nexus } from '../components/Nexus';

<Route index element={<Nexus />} />
```

### Main Component

```typescript
// components/Nexus/index.tsx

import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNexusContext } from '@/hooks/useNexusContext';
import { NEXUS_WIDGETS } from '@/config/nexus-widgets';
import { NexusGrid } from './NexusGrid';
import { NexusHeader } from './NexusHeader';
import { ScopeSwitcher } from './ScopeSwitcher';

export const Nexus: React.FC = () => {
  const { user, securityLevel } = useAuth();
  const { context, setScope, setLocation, setRegion } = useNexusContext();
  
  // Filter widgets based on user's security level and current context
  const visibleWidgets = useMemo(() => {
    return NEXUS_WIDGETS.filter(widget => {
      // Check security level
      if (securityLevel < widget.minSecurityLevel) return false;
      
      // Check surface
      if (!widget.allowedSurfaces.includes(context.surface)) return false;
      
      // Check scope
      if (!widget.allowedScopes.includes(context.scope)) return false;
      
      return true;
    });
  }, [securityLevel, context]);
  
  return (
    <div className="space-y-6">
      <NexusHeader />
      
      {/* Scope switcher for multi-unit users */}
      {securityLevel >= 4 && (
        <ScopeSwitcher
          currentScope={context.scope}
          onScopeChange={setScope}
          onUnitChange={setUnit}
          onRegionChange={setRegion}
        />
      )}
      
      <NexusGrid 
        widgets={visibleWidgets} 
        context={context}
      />
    </div>
  );
};
```

### Responsive Grid

```typescript
// components/Nexus/NexusGrid.tsx

export const NexusGrid: React.FC<{
  widgets: NexusWidget[];
  context: WidgetContext;
}> = ({ widgets, context }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {widgets.map(widget => {
        const Widget = widget.component;
        return (
          <div 
            key={widget.id}
            className={getWidgetSizeClasses(widget.defaultSize)}
          >
            <Widget context={context} />
          </div>
        );
      })}
    </div>
  );
};

const getWidgetSizeClasses = (size: WidgetSize): string => {
  switch (size) {
    case '2x1': return 'col-span-1 sm:col-span-2';
    case '1x2': return 'row-span-2';
    case '2x2': return 'col-span-1 sm:col-span-2 row-span-2';
    default: return '';
  }
};
```

---

## Widget Card Component (L5 Pattern)

```typescript
// components/Nexus/WidgetCard.tsx

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;  // 'primary' | 'blue-700' | 'emerald' etc.
  onClick?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColorClass = 'primary',
  onClick,
  children,
  footer,
}) => {
  const bgClass = `bg-${iconColorClass}-500/20`;
  const textClass = `text-${iconColorClass}-400`;
  
  return (
    <div
      className={`
        card p-4 flex flex-col h-full
        ${onClick ? 'cursor-pointer hover:bg-gray-700/30' : ''}
        transition-all duration-200
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${textClass}`} />
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          {footer}
        </div>
      )}
    </div>
  );
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Current Sprint)
- [x] Temperature Monitor widget
- [x] Price Watch ticker
- [ ] Convert AdminDashboard to Nexus
- [ ] Create WidgetCard component
- [ ] Create NexusGrid with responsive layout
- [ ] Add widget visibility filtering by security level

### Phase 2: Core Widgets
- [ ] Staff On Duty widget
- [ ] Prep Status widget
- [ ] Tasks Pending widget
- [ ] Alerts Summary widget

### Phase 3: Event Bus
- [ ] Implement nexus.emit() / nexus.on()
- [ ] Cross-widget communication
- [ ] Real-time subscriptions via Supabase

### Phase 4: Multi-Scope
- [ ] Scope switcher UI
- [ ] Enterprise rollup views
- [ ] Region aggregation

### Phase 5: Personalization
- [ ] User widget arrangement preferences
- [ ] Widget pinning/hiding
- [ ] Custom layouts per role

---

## Future Widgets (Roadmap)

| Widget | Target | Security | Notes |
|--------|--------|----------|-------|
| Cover Forecast | Q2 2026 | Charlie+ | OpenTable integration |
| Today's Prep | Q2 2026 | Alpha+ | Prep list from forecast |
| Yield Alerts | Q3 2026 | Charlie+ | Variance tracking |
| Cost Trends | Q2 2026 | Echo | MIL + Invoice history |
| Weather Impact | Q3 2026 | Delta+ | Weather → covers correlation |
| Team Pulse | Q4 2026 | Delta+ | Team performance summary |

---

## References

- See: `ARCHITECTURE-DATA-MODEL.md` for Enterprise → Region → Unit hierarchy
- See: `DESIGN-SYSTEM.md` for L5/L6 card patterns
- See: `config/security.ts` for Omega → Echo level definitions
