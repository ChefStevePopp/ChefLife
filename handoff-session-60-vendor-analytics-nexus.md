# Session 60 Handoff: VendorAnalytics + NEXUS Integration

**Date:** January 17, 2026  
**Focus:** VendorAnalytics section architecture redesign + NEXUS event integration  
**Next Priority:** ActivityFeed component redesign

---

## COMPLETED THIS SESSION

### 1. VendorAnalytics Section Restructure
**File:** `src/features/admin/components/sections/VendorInvoice/components/VendorAnalytics.tsx`

Restructured from 4 generic sections to a **story-driven flow**:

| # | Section | Icon | Question It Answers |
|---|---------|------|---------------------|
| 1 | **Vendor Performance** | Truck (green) | "How are my vendors behaving?" |
| 2 | **Category Trends** | Layers (amber) | "Is this market or vendor?" |
| 3 | **Risk Exposure** | ShieldAlert (rose) | "Where am I vulnerable?" |
| 4 | **Action Items** | Lightbulb (primary) | "What do I do about it?" |

**Key Features:**
- Collapsible sections (all collapsed by default)
- Section nav icons in subheader
- Date range controls with quick presets (7d, 30d, 90d, 6mo, 1yr)
- Guided mode with educational tips
- "Run Analysis" button that fires NEXUS events

### 2. NEXUS Analytics Events
**Files Modified:**
- `src/lib/nexus/index.ts` - Added 7 new event types
- `src/lib/nexus/events.ts` - Added ANALYTICS_EVENTS category

**New Event Types:**

| Event | Severity | Trigger |
|-------|----------|---------|
| `vendor_creep_detected` | warning | Vendor +5% over period |
| `vendor_creep_critical` | critical | Vendor +10% over period |
| `price_spike_alert` | warning | Single item +15% |
| `single_source_risk` | info | Ingredient from 1 vendor only |
| `market_divergence` | warning | Vendor vs Umbrella average |
| `margin_erosion_warning` | critical | Recipe food cost trending high |
| `category_volatility_alert` | info | Category swing >10% monthly |

**Thresholds (configurable):**
```typescript
const THRESHOLDS = {
  VENDOR_CREEP_WARNING: 5,    // %
  VENDOR_CREEP_CRITICAL: 10,  // %
  PRICE_SPIKE: 15,            // %
  CATEGORY_VOLATILITY: 10,    // %
};
```

### 3. Run Analysis Function
Added `runAnalysis()` callback that:
1. Scans `vendorStats` for creep patterns
2. Scans `priceTrends` for price spikes
3. Fires NEXUS events for anything exceeding thresholds
4. Shows toast with count of alerts generated
5. Logs to `activity_logs` table → appears in ActivityFeed

---

## PENDING / NEXT SESSION

### Priority 1: ActivityFeed Redesign
**File:** `src/features/admin/components/ActivityFeed.tsx`

**6-Phase Audit Summary:**
- Phase 1 (Foundation): ⚠️ Missing error display
- Phase 2 (Data): ⚠️ Message formatting broken - shows UUIDs/JSON
- Phase 3 (Search/Filter): ❌ No filtering by type/severity
- Phase 4 (Display): ❌ Cards too large, no severity visual hierarchy
- Phase 5 (Actions): ⚠️ Acknowledge works but dismiss is local-only
- Phase 6 (Polish): ❌ No skeletons, no keyboard nav

**Critical Bugs:**
1. `formatActivityDetails()` dumps raw JSON/UUIDs to user
2. No visual difference between critical/warning/info
3. 260x320px cards are too large for notification inbox
4. Horizontal slider hides content count

**Proposed Redesign:**
- Switch from horizontal card slider to vertical grouped list
- Group by urgency: "Needs Attention" vs "Recent"
- One-line items that expand for details
- Clear severity indicators (🚨 critical, ⚠️ warning, ℹ️ info)
- Use NEXUS toast messages (already human-readable)
- Add click-through to related pages

### Priority 2: Wire Remaining Analytics Events
These need data connections to fire:
- `single_source_risk` - needs vendor-ingredient mapping query
- `margin_erosion_warning` - needs recipe food cost calculation
- `market_divergence` - needs Umbrella Items feature

### Priority 3: Category Trends Section
Currently placeholder. Needs:
- Query ingredients by Major Group / Category / Sub-Category
- Calculate average price change per category
- Show Umbrella Items comparison when available

### Priority 4: Risk Exposure Section  
Currently placeholder. Needs:
- Single-source dependency detection
- Recipe → ingredient → vendor mapping
- Projected food cost calculation

---

## FILES MODIFIED THIS SESSION

```
src/features/admin/components/sections/VendorInvoice/components/VendorAnalytics.tsx
  - Complete restructure with 4 story-driven sections
  - Added NEXUS integration with runAnalysis()
  - Added Guided mode educational content

src/lib/nexus/index.ts
  - Added 7 analytics event types to ActivityType union
  - Added category mappings (all → 'alerts')
  - Added toast configurations with emoji icons

src/lib/nexus/events.ts
  - Added ANALYTICS_EVENTS category
  - Defined event definitions with severity/audience/channels
  - Added to MODULE_EVENT_CATEGORIES array
```

---

## UMBRELLA ITEMS INSIGHT

Key strategic realization from this session:

**Enterprise pays for:**
- USDA market reports, IRI/Nielsen data, commodity futures

**ChefLife independent operator gets:**
- Their OWN multi-vendor purchasing = personal market index
- When Umbrella Items ship, Category Trends will show:
  ```
  Umbrella: Beef Brisket
  ├─ Highland:  $4.82/lb  ↑ 12%  ← Outlier
  ├─ Flanagan:  $4.41/lb  ↑ 6%   ← Market baseline
  └─ GFS:       $4.65/lb  ↑ 9%
  
  → If ALL rise: market move
  → If ONE rises: vendor move (negotiate!)
  ```

This is the "market vs vendor" insight that enterprises pay consultants for.

---

## QUICK START NEXT SESSION

```bash
# 1. Open the files
code src/features/admin/components/ActivityFeed.tsx
code src/features/admin/components/sections/VendorInvoice/components/VendorAnalytics.tsx

# 2. Test current state
# - Navigate to VIM → Analytics tab
# - Click "Run Analysis" button
# - Check Dashboard → ActivityFeed for events

# 3. Start with message formatting fix in ActivityFeed
# - Find formatActivityDetails() function
# - It needs to use NEXUS message field, not raw details
```

---

## DESIGN DECISIONS MADE

1. **Price History stays as separate tab** - not redundant, it's the drill-down
2. **4 sections tell a story:** Data → Context → Impact → Action
3. **Analytics events go to 'alerts' category** in NEXUS
4. **Run Analysis is manual** for now - auto-run on invoice import later
5. **Thresholds are hardcoded** - will move to org settings eventually

---

## TRANSCRIPT LOCATION

Full conversation saved to:
`/mnt/transcripts/2026-01-17-00-24-46-vendor-analytics-guided-mode-sections.txt`

Previous session context:
`/mnt/transcripts/2026-01-16-23-33-12-session-59-vim-analytics-l5-subheader.txt`
