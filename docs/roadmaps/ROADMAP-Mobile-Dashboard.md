# Mobile Dashboard Roadmap

> **"People, Place, Profit"** — Take care of your people, they take care of the place, profit follows.

*Created: January 11, 2026*
*Status: Design Complete, Ready to Build*

---

## Vision

This isn't a menu. This is a **launcher** — a personal command center that feels like native iOS/Android. Beautiful, fast, contextual. It replaces the cramped 6-button nav with a focused mobile experience that knows who you are, what shift you're on, and what needs attention.

**Design DNA:**
- Glassmorphism icons (our signature style)
- Expandable widget accordions with animated stats
- Swipeable pages with Newton's cradle dot animation
- Dark theme with L5 color progression
- Contextual hero content (time of day, shift status)
- Alert ticker for urgent items

---

## Architecture

### The Paradigm Shift

| Desktop Admin | Mobile Command |
|---------------|----------------|
| Complex data grids | Glanceable widgets |
| Deep navigation | Swipe pages |
| Mouse precision | Thumb-friendly targets |
| Information dense | Action focused |
| Sidebar + tabs | Launcher + icons |

Same data. Completely different experience.

### Three Pillars (Swipeable Pages)

```
         ○  ●  ○
      People|Place|Profit
```

| Page | Focus | Primary Actions |
|------|-------|-----------------|
| **People** | Team management | Schedule, messaging, who's on |
| **Place** | Operations | Temps, tasks, checklists, receiving |
| **Profit** | Money flow | Quick Invoice, revenue, counts |

Each page has:
- Contextual hero content
- Expandable widget accordions
- Glassmorphism icon cluster

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MobileShell                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                  AlertTicker                        │ │
│ │     "🔴 2 temps overdue │ GFS arriving 2pm"   ←→   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                  HeroContext                        │ │
│ │           "Evening, Chef Steve"                     │ │
│ │           LINE • 3hrs left                          │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              SwipeablePages                         │ │
│ │  ┌───────────────────────────────────────────────┐  │ │
│ │  │            WidgetAccordion                    │  │ │
│ │  │  ▼ Team Schedule                  5 on │ 1brk │  │ │
│ │  │  ┌─────────────────────────────────────────┐  │  │ │
│ │  │  │  ○ Emily  ○ Marcus  ○ Aaron  ○ +2      │  │  │ │
│ │  │  └─────────────────────────────────────────┘  │  │ │
│ │  └───────────────────────────────────────────────┘  │ │
│ │  ┌───────────────────────────────────────────────┐  │ │
│ │  │            IconCluster                        │  │ │
│ │  │   ┌──────┐ ┌──────┐ ┌──────┐                 │  │ │
│ │  │   │ 🌡️  │ │ 📝  │ │ 📦  │                 │  │ │
│ │  │   │Temps │ │Quick │ │Recv  │                 │  │ │
│ │  │   └──────┘ └──────┘ └──────┘                 │  │ │
│ │  └───────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                  PageDots                           │ │
│ │                   ○  ●  ○                           │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                  BottomNav                          │ │
│ │     🏠      📦      📖      ⏱️      ⚡             │ │
│ │    Home    Inv    Recipe   Prod   Command          │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `MobileShell` | `MobileShell.tsx` | Root wrapper, page state, swipe handling |
| `AlertTicker` | `AlertTicker.tsx` | Animated urgent notifications banner |
| `HeroContext` | `HeroContext.tsx` | Greeting, shift info, contextual imagery |
| `SwipeablePages` | `SwipeablePages.tsx` | Horizontal scroll-snap container |
| `WidgetAccordion` | `WidgetAccordion.tsx` | Expandable sections with animated stats |
| `IconCluster` | `IconCluster.tsx` | Glassmorphism action button grid |
| `PageDots` | `PageDots.tsx` | Newton's cradle navigation indicator |
| `BottomNav` | `MobileNav/index.tsx` | Updated 4+1 navigation |

---

## Signature Interactions

### Newton's Cradle Page Dots

Physics-based animation that transfers momentum between dots on page swipe.

```
Swipe right →

  Before:    ●  ○  ○
              
  Motion:    ●  ○   ○    ← right dot swings OUT
                    ↗
                    
  Settle:    ○  ●  ○     ← momentum transferred
```

**CSS Animation:**
```css
@keyframes cradle-swing-out {
  0%   { transform: rotate(0deg) translateX(0); }
  40%  { transform: rotate(25deg) translateX(6px); }
  70%  { transform: rotate(-8deg) translateX(-2px); }
  100% { transform: rotate(0deg) translateX(0); }
}

@keyframes cradle-receive {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.dot-swing { animation: cradle-swing-out 0.4s ease-out; }
.dot-active { animation: cradle-receive 0.3s ease-out 0.15s; } /* 0.15s delay = momentum transfer */
```

### Alert Ticker

Horizontal scrolling banner for urgent items. Like e-commerce BOGO bars but for ops.

```css
@keyframes ticker-scroll {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.ticker-content {
  animation: ticker-scroll 15s linear infinite;
}
```

**Content examples:**
- "🔴 2 temps overdue"
- "🚚 GFS delivery 2pm"
- "⚠️ Walk-in at 38°F"
- "✅ Opening checklist complete"

### Widget Accordions

Expandable info sections styled as widgets. Title on left, animated stats flow to right.

```
┌─────────────────────────────────────────────────────┐
│ ▼ Team Schedule                         5 on │ 1brk │
├─────────────────────────────────────────────────────┤
│  ○ Emily (EXPO)    10:00 AM - 8:00 PM              │
│  ○ Marcus (LINE)    3:00 PM - 9:30 PM              │
│  ○ Aaron (LINE)     3:00 PM - 9:30 PM              │
│  +2 more                                            │
└─────────────────────────────────────────────────────┘
```

**Collapsed state:**
```
┌─────────────────────────────────────────────────────┐
│ ▶ Prep List                               12 items │
└─────────────────────────────────────────────────────┘
```

Stats animate with count-up effect on expand.

### Glassmorphism Icons

Our signature style. Frosted glass effect with subtle glow.

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

.glass-icon:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.08);
}
```

---

## Page Content

### People Page

**Hero:** Team photo collage or shift roster visualization

**Widgets:**
- Team Schedule (who's on, breaks, coverage)
- Messages (unread count, quick reply)

**Icons:**
| Icon | Label | Action |
|------|-------|--------|
| 👤 | My Profile | View/edit profile |
| 👥 | Full Team | Team roster |
| 💬 | Message | Team chat |
| 📅 | Schedule | Full schedule view |

### Place Page

**Hero:** Kitchen status visualization or weather/time context

**Widgets:**
- Temp Log Status (due count, alerts)
- Task Progress (checklist completion %)

**Icons:**
| Icon | Label | Action |
|------|-------|--------|
| 🌡️ | Temps | Log temperatures |
| ✅ | Tasks | Daily checklist |
| 📦 | Receive | Receiving verification |
| 🔍 | Allergen | Quick allergen lookup |

### Profit Page

**Hero:** Daily revenue snapshot or trend spark line

**Widgets:**
- Quick Invoice (recent vendors)
- Inventory Alerts (low stock count)

**Icons:**
| Icon | Label | Action |
|------|-------|--------|
| 📝 | Invoice | **MobileInvoice** ← lives here! |
| 📊 | Counts | Inventory walk |
| 💰 | Revenue | Daily numbers |
| ⚙️ | Admin | Full admin (managers only) |

---

## Role-Based Access

| Role | People | Place | Profit |
|------|--------|-------|--------|
| **Line Cook** | My Profile, Schedule, Message | Temps, Tasks | — |
| **Shift Lead** | + Full Team | + Receive | Invoice, Counts |
| **Manager** | All | All | All + Admin |
| **Owner** | All | All | All + Admin |

Lower roles see fewer icons, simpler experience. No disabled states — if you can't use it, you don't see it.

---

## Technical Implementation

### CSS-First Approach

No animation libraries. Pure CSS for:
- `scroll-snap-type: x mandatory` — page swiping
- `@keyframes` — all animations
- `backdrop-filter: blur()` — glassmorphism
- CSS Grid — responsive icon clusters
- `transition` — interactive feedback

### Responsive Behavior

```css
/* Mobile shell only renders below lg breakpoint */
@media (min-width: 1024px) {
  .mobile-shell { display: none; }
}
```

Desktop gets full AdminLayout. Mobile gets MobileShell. Same routes, different experience.

### State Management

```typescript
interface MobileShellState {
  activePage: 'people' | 'place' | 'profit';
  expandedWidgets: string[];
  alerts: Alert[];
  shiftContext: ShiftContext | null;
}
```

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
├── styles/
│   └── mobile.css
└── index.ts
```

---

## Migration Path

### Phase 1: Shell + Navigation
- [ ] Create `MobileShell` wrapper
- [ ] Update `BottomNav` to 4+1 pattern
- [ ] Implement `PageDots` with Newton's cradle
- [ ] Basic `SwipeablePages` with scroll-snap

### Phase 2: Core Components
- [ ] `AlertTicker` with animation
- [ ] `HeroContext` with shift awareness
- [ ] `WidgetAccordion` with animated stats
- [ ] `IconCluster` with glassmorphism

### Phase 3: Page Content
- [ ] People page (schedule widget, team icons)
- [ ] Place page (temps widget, task icons)
- [ ] Profit page (invoice widget, **MobileInvoice integration**)

### Phase 4: Polish
- [ ] Role-based icon visibility
- [ ] Haptic feedback (where supported)
- [ ] Pull-to-refresh
- [ ] Gesture refinements

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to Quick Invoice | < 3 taps from Home |
| Temp log completion | +25% vs current |
| Mobile session duration | +40% |
| "Feels native" survey | 8+/10 |

---

## Dependencies

- `MobileInvoice.tsx` — Already built, waiting for integration
- Shift data — useScheduleStore
- Team data — useTeamStore
- Alert system — needs new hook or store

---

## Design Inspiration

- **iOS Home Screen** — Launcher feel, icon clusters
- **Android Widgets** — Glanceable info, expandable
- **Smart Home Apps** — Status at a glance, quick actions
- **7shifts** — What to improve upon (flat list → rich command center)

---

## Promise

> **"Your phone is your command center, not a cramped menu."**
> 
> Every restaurant manager checks their phone 100+ times per shift. Most apps make that painful — tiny buttons, endless navigation, desktop interfaces crammed onto mobile.
> 
> ChefLife Mobile respects that your hands might be wet, you're probably walking, and you need information NOW. Three swipes. Beautiful. Fast. Done.

---

*This document represents the complete design specification for ChefLife Mobile Dashboard. Ready to build.*
