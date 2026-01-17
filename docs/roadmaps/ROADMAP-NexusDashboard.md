# Nexus Dashboard (Admin) Roadmap

> **Priority:** HIGH  
> **Status:** ACTIVE - Phase 1 Complete  
> **Created:** 2026-01-16  
> **Updated:** 2026-01-16

---

## Overview

The Nexus Dashboard is the "MRI screen" - the visual display showing your restaurant's vital signs. It consumes data from NEXUS (the circulatory event system) but is a separate UI concern.

**Not to be confused with:** `ROADMAP-NEXUS.md` which covers the event bus architecture.

**Philosophy:** People → Place → Profit
- Take care of your people (Today's Team)
- Take care of your place (HACCP temps, alerts)
- And profit takes care of itself

---

## ✅ Phase 1: COMPLETE (Jan 16, 2026)

### Header Redesign
- [x] L5 Header Card with org logo (uploaded via Company Settings)
- [x] Ghost logo watermark (bleeds off left edge, 7% opacity, 15° rotation, grayscale)
- [x] Active Staff pill (live count from 7shifts schedule)
- [x] Refresh button placeholder
- [x] Expandable "About Nexus" info section
- [x] ChefBot placeholder when no logo uploaded

### Price Watch Ticker
- [x] Moved inside header card (below info section)
- [x] `PriceWatchTickerInline` - no outer card wrapper
- [x] Expandable critical alerts list
- [x] Desktop: scrolling ticker | Mobile: cycling single item

### Stat Cards (3-column grid)
- [x] Temperature Monitor with premium morph animation
- [x] Pending Tasks (static placeholder)
- [x] Prep Completion (static placeholder)

### Today's Team Carousel
- [x] 2-up stacked layout (2 members per column)
- [x] Responsive: 4 cols desktop → 3 tablet → 2 mobile
- [x] Touch swipe on mobile/tablet
- [x] Arrow navigation + page indicator ("1 / 2")
- [x] Dot pagination indicators
- [x] Real avatars from team store
- [x] Role badges (LINE, PIES, AM DISH, etc.)
- [x] Shift times in compact format (10a-6p)
- [x] Green "online" dots on avatars

### Premium Animation System
- [x] `AnimatedNumber` component - 60fps number interpolation
- [x] `MorphingText` component - blur/slide text transitions
- [x] Shared location: `@/shared/components/AnimatedNumber/`
- [x] CSS classes: `.morph-text`, `.animated-number`, `.premium-fade`
- [x] Documented in L5-BUILD-STRATEGY.md + UTILS.md

### Organization Logo Uploader
- [x] Added to Company Settings → Organization tab
- [x] Uses `ImageUploadModal` component
- [x] Stores in Supabase Storage: `Logos/{orgId}/logo.{ext}`
- [x] Saves URL to `organization.settings.branding.logo_url`

---

## 🔲 Phase 2: Live Data Connections

### Wire Up Static Cards
- [ ] Pending Tasks → Connect to tasks system (when built)
- [ ] Prep Completion → Connect to prep lists (when built)
- [ ] Refresh button → Actually refresh all widget data

### Today's Team Enhancements
- [ ] Click card → Navigate to team member profile
- [ ] Show "late" indicator if past shift start and not clocked in
- [ ] Break indicator for team members on break

### Activity Feed
- [ ] Connect to NEXUS event stream
- [ ] Filter by severity/category
- [ ] Click to navigate to source

### Alerts List
- [ ] Connect to real alert sources
- [ ] Dismissable alerts
- [ ] Priority sorting

---

## 🔲 Phase 3: Additional Widgets

| Widget | Priority | Data Source | Status |
|--------|----------|-------------|--------|
| Staff On Duty | ✅ Done | 7shifts schedule | Complete |
| Temperature | ✅ Done | SensorPush | Complete |
| Price Watch | ✅ Done | VIM price changes | Complete |
| Prep Status | High | Prep lists | Not started |
| Tasks Pending | High | Tasks system | Not started |
| Cover Forecast | Medium | OpenTable/Resy | Not started |
| Cost Trends | Medium | VIM analytics | Not started |
| Weather | Low | Weather API | Not started |

---

## 🔲 Phase 4: Role-Based Widgets

### Security Level Filtering
- [ ] Define `minSecurityLevel` per widget
- [ ] Filter visible widgets based on user's level
- [ ] Kitchen users see kitchen-relevant widgets only
- [ ] Owners see financial widgets

### Widget Personalization
- [ ] User can reorder widgets (drag & drop)
- [ ] User can hide/show widgets
- [ ] Persist preferences to user settings

---

## File Structure

```
src/features/admin/components/
├── AdminDashboard.tsx              # Main Nexus Dashboard
├── AdminDashboard/
│   ├── PriceWatchTicker.tsx        # Standalone ticker (legacy)
│   ├── PriceWatchTickerInline.tsx  # Header-embedded ticker
│   ├── TemperatureStatCard.tsx     # Premium morph animation
│   ├── TemperatureWidgetWrapper.tsx
│   ├── TodaysTeamCarousel.tsx      # 2-up swipeable cards
│   └── TodaysTeam.tsx              # Original compact version
├── StatsCard.tsx                   # Generic stat card
├── ActivityFeed.tsx
└── AlertsList.tsx

src/shared/components/
└── AnimatedNumber/
    ├── AnimatedNumber.tsx          # 60fps number morph
    ├── MorphingText.tsx            # Blur/slide text morph
    └── index.ts
```

---

## Design Decisions

### Ghost Logo Watermark
- Position: Bleeds off left edge of viewport
- Size: 400x400px
- Offset: -256px (left)
- Opacity: 7%
- Filter: grayscale
- Rotation: 15°
- Purpose: Subtle brand presence without distraction

### Premium Animation Timing
- Display time: 8 seconds per item
- Morph duration: 2 seconds
- Easing: ease-out cubic (decelerates like luxury gauge)
- Philosophy: "So smooth you're not sure if it moved"

### Today's Team Layout
- 2-up stacked (not single cards) for density
- 8 people visible at once on desktop
- Horizontal swipe matches mobile UX patterns

---

## References

- `ROADMAP-NEXUS.md` - Event bus architecture (circulatory system)
- `CHEFLIFE-ANATOMY.md` - Medical chart metaphor
- `L5-BUILD-STRATEGY.md` - Premium Interaction Patterns section
- `UTILS.md` - AnimatedNumber component docs
