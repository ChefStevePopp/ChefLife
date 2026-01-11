# PROMISE: Your Vendor's Code Change Doesn't Erase History

> *"ChefLife remembers."*

---

## The Problem

Major food distributors (GFS, Sysco, US Foods) routinely change product codes on commodity items every 18-24 months. These "rebrands" are often marketed as:

- "New improved formula"
- "Refreshed packaging"
- "Updated specifications"

**But the product is the same.** Same chicken thighs. Same back ribs. Same cooking oil.

When the code changes, most restaurant software treats it as a brand new item. Price history starts over at zero. The cumulative cost increases disappear.

### Real Example: GFS Chicken Thighs

```
2022: Code 1402739 - $74.00
2023: Code 1402739 - $82.00 (+10.8%)
      → "NEW IMPROVED!" Code 1408821 - $85.00 ← History reset
2024: Code 1408821 - $92.00 (+8.2%)
      → "REFRESHED!" Code 1415567 - $96.00 ← History reset again
```

**What the buyer sees:** Three separate products with modest annual increases.

**Reality:** 29.7% cumulative increase over 4 years on the same product.

---

## Why Existing Solutions Fail

### Traditional Restaurant Software
- Each vendor code = separate inventory item
- Code change = new item, no history
- No concept of "same product, different code"
- Analytics limited to single-code lifespan

### Enterprise ERPs
- Designed for manufacturing, not food service
- Requires IT team to manually link codes
- Cost prohibitive for independents
- Nobody actually does the maintenance

### Manual Tracking
- Spreadsheets lose continuity
- Staff turnover = knowledge loss
- "That was before my time"
- Impossible to prove patterns

### The Vendor's Advantage
This system **benefits distributors**. Large chains don't connect the dots. When questioned:
- "That was a different SKU"
- "Prices reflect market conditions"
- "The old product was discontinued"

**Plausible deniability is built into the system.**

---

## The ChefLife Way

### Code Groups

ChefLife maintains **product continuity** across code changes through Code Groups:

```
Code Group: "Chicken Thighs BLS" (GFS)
├── 1402739 (inactive since 2023)
├── 1408821 (inactive since 2025)
└── 1415567 (active)

Price History: CONTINUOUS from 2022 → present
Total Tracked Increase: 29.7%
Code Changes: 2
```

### How It Works

1. **During Import:** New codes are flagged with suggestions
   - "This new code might belong to Code Group: Chicken Thighs BLS"
   
2. **One-Click Linking:** Add new code to existing group
   - Old code marked inactive
   - Price history continues unbroken
   
3. **Automatic Umbrella Integration:** If product is in an Umbrella Group (multi-vendor), new code is automatically included in aggregated costs

4. **Rebrand Detection:** System flags products with multiple code changes
   - "This product has been 'rebranded' 3 times in 4 years"

---

## The Benefit

### For Daily Operations
- Import invoices without disruption when codes change
- Price variance alerts work across code changes
- Accurate food cost calculations using correct current price

### For Vendor Negotiations
- **Ammunition.** Walk into your GFS meeting with:
  - "Your chicken thighs have increased 34% over 3 years"
  - "Despite 2 'new product' launches"
  - "Here's the chart showing continuous price trajectory"

### For Financial Planning
- True cost trends for budgeting
- Accurate year-over-year comparisons
- Pattern recognition: "Commodity items rebrand every 18-24 months"

### For Business Value
- Due diligence documentation for buyers
- Audit-ready price history
- Institutional memory that survives staff turnover

---

## The Proof

### Memphis Fire Case Study
- 15 years of GFS invoice data
- Multiple code changes tracked
- Demonstrable vendor negotiation leverage
- Quantifiable cost savings from informed purchasing

### Demo Scenario
Show prospect:
1. Single-code view (how competitors see it): 3 separate products
2. Code Group view (how ChefLife sees it): One product, 4-year trend
3. "Which view would you rather have in your vendor meeting?"

### Metrics
- Time saved: Eliminate manual code-change research
- Cost visibility: Track true commodity inflation
- Negotiation leverage: Document cumulative increases

---

## Connected Features

| Feature | Contribution |
|---------|--------------|
| **Code Groups** (VIM) | Product continuity across codes |
| **Audit Trail** (VIM) | Every price traceable to source document |
| **Umbrella Groups** (VIM) | Multi-vendor aggregation includes all codes |
| **Price History** (VIM) | Visualize trends across code changes |
| **Import Flow** (VIM) | Suggest Code Group matches for new codes |
| **MIL Integration** | Common Name linking for cross-reference |

---

## The Tagline

> **"Your vendor's code change doesn't erase history. ChefLife remembers."**

---

## Competitive Positioning

| Capability | ChefLife | Traditional POS | Restaurant ERP |
|------------|----------|-----------------|----------------|
| Code Group tracking | ✅ Built-in | ❌ Not possible | ⚠️ Manual IT work |
| Continuous price history | ✅ Automatic | ❌ Resets on code change | ⚠️ If maintained |
| Rebrand detection | ✅ Flagged | ❌ No concept | ❌ No concept |
| Vendor negotiation reports | ✅ One-click | ❌ Manual research | ⚠️ Custom reports |
| Indie operator accessible | ✅ No IT needed | N/A | ❌ Enterprise only |

---

## The Bottom Line

**This is protection.** 

Independent operators don't have procurement departments. They don't have analysts tracking vendor pricing patterns. They're running the line, managing staff, and trying to stay profitable.

ChefLife acts as their institutional memory. When a vendor tries to hide a 30% price increase behind three "product launches," ChefLife sees through it.

**The magic is in the walls.**

---

*Promise Documented: January 10, 2026*
*Category: 🛡️ Protection*
*Connected Roadmap: ROADMAP-Data.md*
