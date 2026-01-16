# Widget Architecture

## Overview

ChefLife widgets are reusable, context-aware components that adapt their information density based on the viewer's security level. **Build once, use everywhere.**

## The Three Dimensions

Every widget receives a `WidgetContext` with three dimensions:

| Dimension | Controls | Options |
|-----------|----------|---------|
| **SecurityLevel** | Information density | Omega (0) → Echo (5) |
| **Scope** | Data breadth | location / region / organization |
| **Surface** | Interaction style | admin / kitchen / mobile |

## The Three Layers

Every widget has up to three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   LAUNCHER (5%)         REVIEW SPACE (80%)      FULL FEATURE   │
│   Status at glance      Workspace               Configuration  │
│                                                                 │
│   ┌─────────┐          ┌─────────────────┐     ┌────────────┐  │
│   │  🌡️     │   tap    │ Temperature     │     │   HACCP    │  │
│   │  38°F   │   ───►   │ Walk-in  38°F ✓ │ ──► │  Manager   │  │
│   │  Temps  │          │ [Log] [History] │     │            │  │
│   └─────────┘          └─────────────────┘     └────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1: Launcher (5% of interactions)
- Status at a glance
- Single tap to open Review Space
- "Are we OK?" indicator

### Layer 2: Review Space (80% of interactions)
- **This is where work happens**
- View data, take actions, complete tasks
- No navigation required for most workflows
- NOT a preview - it's a workspace

### Layer 3: Full Feature (15% of interactions)
- Configuration, reports, compliance
- Behind admin wall (security gated)
- Navigate only when necessary

## Security Level Density

**Lower number = Higher clearance = More information**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPERATURE WIDGET                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ECHO (5):    🟢 38°F                                           │
│               Team Member - status + temp only                   │
│                                                                  │
│  DELTA (4):   Walk-in: 38°F 🟢  [Log]                           │
│               Shift Lead - + name, + actions                     │
│                                                                  │
│  CHARLIE (3): Walk-in: 38°F 🟢  ↓2° today                       │
│               Supervisor - + trends, + history                   │
│                                                                  │
│  BRAVO (2):   Walk-in: 38°F 🟢  | 6/6 OK                        │
│               Manager - + thresholds, + fleet status             │
│                                                                  │
│  ALPHA (1):   Walk-in: 38°F 🟢  | 6/6 OK | $0 risk              │
│               Owner - + cost impact, + compliance                │
│                                                                  │
│  OMEGA (0):   [Full diagnostics + all data]                     │
│               Developer - everything + debug info                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Same widget. Same position. Information unfolds with clearance.**

## File Structure

```
src/widgets/
├── index.ts                          # Main exports
├── types.ts                          # Widget system types
│
└── temperature/                      # WATERSHED TEST
    ├── index.tsx                     # Main widget (3 layers)
    ├── visibility.ts                 # Security level → info density
    └── useTemperatureData.ts         # Data hook
```

## A/B Testing Integration

Widgets support A/B testing via the `useVariantTesting` hook:

| Test | Variants | Purpose |
|------|----------|---------|
| `TemperatureWidget-Architecture` | legacy, widget | Compare old stat card vs new 3-layer widget |
| `TemperatureWidget-Security` | omega → echo | Test info density by security level |

## How to Test

1. **Enable diagnostics:** Dev Management → Show Diagnostics
2. **Go to Admin Dashboard**
3. **Toggle "Temp Widget":** Legacy Card ↔ New Widget
4. **Toggle "Security Level":** Omega ↔ Alpha ↔ Bravo ↔ Charlie ↔ Delta ↔ Echo
5. **Verify:**
   - Launcher shows correct density per level
   - Review Space opens on click
   - Actions are gated by security level
   - Full Feature link only shows for Bravo+

## Core Types

```typescript
// Security levels: lower = more access
type SecurityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Context passed to every widget
interface WidgetContext {
  securityLevel: SecurityLevel;   // WHO → info density
  userId: string;
  scope: Scope;                   // WHAT → data breadth
  organizationId: string;
  regionId?: string;
  locationId?: string;
  surface: Surface;               // WHERE → interaction style
}

// Visibility config per widget
interface WidgetVisibility {
  showX: boolean;                 // level <= N
  canDoY: boolean;                // level <= M
}
```

## The Rule

**The wall is between Review Space and Full Feature.**

```
Alpha sees:     Launcher → Review Space → [WALL - no access to Full Feature]
Omega sees:     Launcher → Review Space → Full Feature

Same widget. Same three layers. The wall decides who configures.
```

## Future Widgets

Following this same architecture:

- [ ] Prep Forecast Widget
- [ ] Cover Forecast Widget (OpenTable)
- [ ] Cost Trends Widget
- [ ] Yield Alerts Widget
- [ ] Staff Status Widget
