# ROADMAP: NEXUS

> **The Intelligence Layer** — Where data becomes decisions

---

## Vision

NEXUS is ChefLife's central nervous system. It connects the 4 blocks (Purchases, Prep, POS, Labor) and surfaces actionable insights. NEXUS doesn't just show you what happened — it helps you decide what to do next.

---

## Core Principle

**Informed guesses, not hail marys.**

Every recommendation comes with the reasoning. Operators see the math, add their intuition, make better decisions.

---

## Feature Roadmap

### Phase 1: Foundation ✅
*Status: In Progress*

| Feature | Description | Status |
|---------|-------------|--------|
| Price History | Track vendor price changes over time | ✅ Live |
| Price Alerts | Flag significant changes on watched items | ✅ Live |
| Watch List | MIL items with `alert_price_change` enabled | ✅ Live |
| Vendor Insights | "Most Active" vendor detection | ✅ Live |

---

### Phase 2: Guest Intelligence
*Status: Planned Q2 2026*

#### OpenTable Integration (Guest Count Tracking)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Reservation Sync** | Pull reservation counts by date/time | High |
| **Cover Forecasting** | Historical patterns → expected covers | High |
| **No-Show Rates** | Factor in typical no-show % by day | Medium |
| **Party Size Trends** | Average covers per reservation | Medium |
| **Walk-In Estimation** | Reservations + historical walk-in ratio | Medium |

**Data Flow:**
```
OpenTable API → Reservation Data → Cover Forecast
                                        ↓
                            Guest Count Dashboard Widget
```

**Use Case:**
> "Saturday has 42 reservations (avg 2.3 covers) + 15% walk-ins = ~113 expected covers"

---

### Phase 3: Sales Intelligence
*Status: Planned Q2-Q3 2026*

#### POS Report Consolidation

| Feature | Description | Priority |
|---------|-------------|----------|
| **Sales by Item** | Daily/weekly/monthly item sales | High |
| **Attachment Rates** | % of guests ordering each item | High |
| **Daypart Analysis** | Lunch vs dinner item mix | Medium |
| **Modifier Tracking** | Size/add-on preferences | Medium |
| **Comp/Void Analysis** | Waste from POS side | Low |

**Supported POS Systems (Planned):**
- Square (Priority — Memphis Fire uses this)
- Toast
- Clover
- TouchBistro

**Data Flow:**
```
POS Export/API → Sales Data → Item Demand Model
                                    ↓
                          Attachment Rate Database
```

**Use Case:**
> "Pulled Pork attachment rate: 23% of covers (±3% seasonal variance)"

---

### Phase 4: Prep Forecast ("What to Put On")
*Status: Planned Q3 2026*

The culmination of Phases 2 & 3. Demand-driven prep planning.

#### Algorithm Inputs

| Source | Data | Purpose |
|--------|------|---------|
| **OpenTable** | Expected covers | Demand baseline |
| **POS History** | Attachment rates | Item-level demand |
| **MIL** | Yield rates, portions | Unit conversion |
| **Inventory** | Current prepped stock | What's already done |
| **Calendar** | Events, holidays, weather | Demand modifiers |

#### Output: Prep Recommendation

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SATURDAY JAN 18: PREP FORECAST                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PULLED PORK SHOULDER                                                   │
│  ─────────────────────────────────────────────────────────────────────  │
│  Expected covers:        185                                            │
│  Attachment rate:        23%                                            │
│  Expected portions:      43                                             │
│  Current inventory:      12 portions                                    │
│  ─────────────────────────────────────────────────────────────────────  │
│  Need:                   31 portions                                    │
│  Raw equivalent:         2.9 shoulders (@ 65% yield, 6oz portions)     │
│  Buffer (+15%):          3.4 shoulders                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  RECOMMENDATION:         PUT ON 4 SHOULDERS                             │
│                                                                         │
│  [Accept] [Adjust: ___] [Override with note: ________________]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Operator Override

The operator is ALWAYS in control:
- **Accept** — Use recommendation as-is
- **Adjust** — Change number with optional note
- **Override** — Full manual with reason logged

Override reasons become training data:
> "Wedding next door (+2)" → System learns: nearby events = +X%

---

### Phase 5: Yield Variance Tracking
*Status: Planned Q4 2026*

Track value through every state transition. Detect shrink spikes.

#### The Ingredient Lifecycle

```
STATE 1: PURCHASED     20 lb @ $4.50/lb = $90
            ↓ (Prep Loss: trim, fat cap)
STATE 2: PREPPED       18 lb @ $5.00/lb effective
            ↓ (Cook Yield: 65%)
STATE 3: COOKED        11.7 lb @ $7.69/lb effective
            ↓ (Portioned: 6oz)
STATE 4: PORTIONABLE   31 portions theoretical
            ↓ (POS Reality)
STATE 5: SOLD          28 portions actual

THE GAP: 3 portions = $8.70 shrink
```

#### Variance Detection

| Metric | Formula | Alert Threshold |
|--------|---------|-----------------|
| **Prep Yield** | Prepped ÷ Raw | < 85% of expected |
| **Cook Yield** | Cooked ÷ Prepped | < 90% of expected |
| **Portion Yield** | Sold ÷ Portionable | < 90% of expected |
| **Total Yield** | Sold Value ÷ Purchase Cost | < 80% of expected |

**Priority Level Integration:**
- **Critical items**: Tracked at EVERY state transition
- **High items**: Daily reconciliation
- **Standard items**: Weekly spot-check
- **Low items**: Monthly audit only

---

## Integration Dependencies

| Integration | Required For | Status |
|-------------|--------------|--------|
| **OpenTable** | Guest Count Tracking, Cover Forecasting | 🔜 Planned |
| **Square POS** | Sales Data, Attachment Rates | 🔜 Planned |
| **7shifts** | Labor correlation (covers per labor hour) | ✅ Active |
| **Vendor APIs** | Real-time price updates | 🔜 Planned |

---

## Admin Dashboard Widgets

NEXUS powers the Admin Dashboard with actionable widgets:

| Widget | Data Source | Status |
|--------|-------------|--------|
| **Price Watch** | Price History + Alerts | 🔜 Q1 2026 |
| **Today's Prep** | Prep Forecast | 🔜 Q3 2026 |
| **Cover Forecast** | OpenTable + History | 🔜 Q2 2026 |
| **Yield Alerts** | Variance Tracking | 🔜 Q4 2026 |
| **Cost Trends** | MIL + Invoice History | 🔜 Q2 2026 |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Forecast Accuracy** | ±10% of actual | Recommended vs used |
| **Override Rate** | < 20% | How often operators adjust |
| **Shrink Reduction** | -15% | Yield variance over time |
| **Prep Waste** | -25% | Over-prep reduction |
| **Time Saved** | 30 min/day | Prep planning time |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NEXUS ENGINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    │
│   │  BLOCK 1  │    │  BLOCK 2  │    │  BLOCK 3  │    │  BLOCK 4  │    │
│   │ Purchases │    │ Inventory │    │   Prep    │    │    POS    │    │
│   │           │    │           │    │           │    │           │    │
│   │ • Invoices│    │ • Counts  │    │ • Recipes │    │ • Sales   │    │
│   │ • Prices  │    │ • Par     │    │ • Yields  │    │ • Covers  │    │
│   │ • Vendors │    │ • Waste   │    │ • Portions│    │ • Modifiers│   │
│   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    │
│         │                │                │                │          │
│         └────────────────┴────────────────┴────────────────┘          │
│                                   │                                    │
│                                   ▼                                    │
│                    ┌─────────────────────────────┐                     │
│                    │      INTELLIGENCE LAYER     │                     │
│                    │                             │                     │
│                    │  • Demand Forecasting       │                     │
│                    │  • Variance Detection       │                     │
│                    │  • Trend Analysis           │                     │
│                    │  • Anomaly Alerts           │                     │
│                    └──────────────┬──────────────┘                     │
│                                   │                                    │
│                                   ▼                                    │
│                    ┌─────────────────────────────┐                     │
│                    │     DECISION SUPPORT        │                     │
│                    │                             │                     │
│                    │  • Prep Recommendations     │                     │
│                    │  • Order Suggestions        │                     │
│                    │  • Price Alerts             │                     │
│                    │  • Yield Warnings           │                     │
│                    └─────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## References

- `DESIGN-SYSTEM.md` — L5/L6 patterns
- `ROADMAP-Data.md` — MIL, Vendor Invoices
- `ROADMAP-Kitchen.md` — Recipes, Prep
- `ROADMAP-Organization.md` — Integrations

---

*Created: January 15, 2026*
*Vision: Informed guesses, not hail marys.*
