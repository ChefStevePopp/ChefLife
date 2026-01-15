# ROADMAP: Umbrella Ingredients

> **Status:** Active Development  
> **Last Updated:** January 2025  
> **L7 Promise:** We learn from your data to protect your cost analysis

---

## Overview

Umbrella Ingredients aggregate costs across multiple vendors for the same logical ingredient. When you buy "Beef Brisket" from GFS, Flanagan's, and Highland, you want to see ONE cost trend—not three separate lines that fragment your analysis.

---

## Core Concept

### The Problem
- Same ingredient, different vendors, different `vendor_description`
- GFS: "CARGIL BEEF BRISKET AA FRESH"  
- Flanagan's: "BEEF BRISKET CHOICE"
- Highland: "BRISKET FLAT AAA"

Without umbrella linking, your recipe costs bounce around based on which vendor you happened to order from last.

### The Solution
**Common Name** is the user-defined bridge that links vendor-specific descriptions:

| Vendor | vendor_description (→ product) | common_name |
|--------|-------------------------------|-------------|
| GFS | CARGIL BEEF BRISKET AA FRESH | Beef Brisket |
| Flanagan's | BEEF BRISKET CHOICE | Beef Brisket |
| Highland | BRISKET FLAT AAA | Beef Brisket |

The umbrella "Beef Brisket" now aggregates ALL price history across vendors.

---

## Data Model

```
master_ingredients
├── product          → Exact vendor_description from invoice (for matching)
├── common_name      → User-defined term (for umbrella linking)
├── item_code        → Vendor's SKU
└── vendor           → Source vendor

umbrella_ingredients
├── common_name      → Links to master_ingredients.common_name
├── preferred_vendor → Default for costing
└── pricing_strategy → 'lowest' | 'average' | 'preferred'
```

---

## Matching Logic

1. **Invoice arrives** with `vendor_description`
2. **Exact match** on `product` + `vendor` + `item_code` → Update price
3. **No exact match** → Triage (ghost item)
4. **User sets `common_name`** → Links to umbrella family
5. **Umbrella calculates** unified cost based on pricing_strategy

---

## L7 Promise: Data Learning & Protection

> "We learn from your vendor data to make you smarter, not to lose your history."

### What We Protect:
- **Price trends stay continuous** even when vendor codes change
- **Cross-vendor analysis** shows true ingredient cost, not vendor noise
- **Historical data** never lost—superseded invoices archived, not deleted

### What We Learn:
- Common description patterns across organizations (future)
- Vendor code change patterns (future AI matching)
- Seasonal price trends (future alerts)

---

## Implementation Status

- [x] `common_name` field in master_ingredients
- [x] Triage flow captures unmatched items
- [ ] UmbrellaIngredientManager UI
- [ ] Pricing strategy selection
- [ ] Recipe costing pulls from umbrella
- [ ] Cross-vendor price comparison dashboard

---

## User Flow

1. Import invoice → Unmatched items go to Triage
2. Review ghost items in Triage
3. Create/link ingredient → Set `common_name`
4. System auto-links to umbrella family
5. Recipe costs reflect unified umbrella price

---

## Related Docs
- [ROADMAP-CodeGroups.md](./ROADMAP-CodeGroups.md) - Same vendor, code changes
- [L7-DATA-PROMISE.md](../L7-DATA-PROMISE.md) - User trust & data protection
