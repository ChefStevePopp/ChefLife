# Session Prompt: Price History Polish

Hey Claude - we're continuing work on ChefLife, a restaurant management application. This session is focused on completing the price history UX across three touchpoints.

## What We're Doing

We've got price history data flowing through the system from vendor invoices. Now we need to make it accessible and actionable in three places:

1. **PriceWatchTicker** - The scrolling ticker in the NEXUS dashboard header that shows recent price changes. It works, but needs an acknowledge feature (so users can clear alerts they've seen) and pagination in the expanded view (currently dumps everything at once).

2. **BOH Vitals Tab** - One of 7 tabs in the NEXUS dashboard. Currently a placeholder. Needs to use our CardCarousel component with a "Price Watch" card showing ingredients the user has flagged for monitoring. Click an ingredient → opens the price history modal.

3. **Ingredient Page (MIL)** - The Master Ingredients List. Users should be able to click a button on any ingredient to see its price history in a modal. The modal already exists and works great.

## Key Context

- **PriceHistoryDetailModal** is already built with a lookback period selector (30d to 2yr). We just need to wire it up in more places.

- **CardCarousel** is built - zero dependencies, CSS scroll-snap, works great.

- **ActivityFeedV2** has the acknowledge pattern we want to mirror - it uses a "Show acknowledged" toggle that defaults to hidden (inbox zero approach).

- Ingredients have flags: `show_on_dashboard` (appears in Price Watch card) and `alert_price_change` (appears in ticker critical list).

## Files to Focus On

```
PriceWatchTickerInline.tsx    → Add acknowledge + pagination
AdminDash_BOHVitalsTab.tsx    → Wire up CardCarousel
MasterIngredientsList/        → Add price history button
```

## Reference

Full technical details are in:
- `docs/HANDOFF-2026-01-19-NEXT-SESSION-PriceHistoryPolish.md`

The ActivityFeedV2 component (`src/features/admin/components/ActivityFeedV2.tsx`) has the acknowledge pattern to copy.

## Start With

PriceWatchTicker is the meatiest task - start there. The other two are mostly wiring up components that already exist.

Let's go! 🔥
