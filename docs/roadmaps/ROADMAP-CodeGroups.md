# ROADMAP: Code Groups (Vendor Code Change Detection)

> **Status:** Active Development  
> **Last Updated:** January 2025  
> **L7 Promise:** When your vendor changes their codes, we don't lose your price history

---

## Overview

Vendors periodically change their item codes. Without proper handling, this breaks your price history—suddenly you have two "products" that are actually the same thing, and your trend analysis is fragmented.

**Code Groups** detect and handle this automatically.

---

## Core Concept

### The Problem
GFS decides to renumber their catalog. Your beloved Beef Brisket goes from:
- Old: `195439` → "CARGIL BEEF BRISKET AA FRESH"
- New: `287654` → "CARGIL BEEF BRISKET AA FRESH"

Without code group handling:
- System creates a NEW ingredient
- Price history splits in two
- Recipe costs reference the OLD (now stale) ingredient
- Trend analysis shows a gap

### The Solution
**Same vendor_description + same vendor = code change detected**

When we see:
- Same vendor
- Same `vendor_description` (exact match)
- Different `item_code`

We don't create a new ingredient. We update the existing one's code and **preserve the entire price history chain**.

---

## Data Model

```
vendor_codes (historical tracking)
├── master_ingredient_id  → Links to ingredient
├── vendor_id             → Which vendor
├── item_code             → The vendor's SKU
├── vendor_description    → Exact text from invoice
├── effective_date        → When this code was active
├── superseded_date       → When it was replaced
├── superseded_by         → New code that replaced it
└── is_current            → Boolean flag

master_ingredients
├── item_code             → CURRENT vendor code
├── product               → Current vendor_description
└── vendor                → Primary vendor
```

---

## Detection Logic

```
On Invoice Import:
1. For each line item:
   a. Try exact match: vendor + item_code + vendor_description
   b. If no match, try: vendor + vendor_description (code change?)
      - If found: CODE CHANGE DETECTED
        → Update master_ingredient.item_code
        → Archive old code in vendor_codes
        → Link new code to same ingredient
        → Price history CONTINUES (not split)
   c. If still no match: → Triage (ghost item)
```

---

## L7 Promise: Trend Protection

> "Your price trends tell a story. We don't let vendor admin decisions rewrite that story."

### What We Protect:
- **Continuous price history** through code changes
- **Recipe costs** stay linked to the ingredient, not the code
- **Audit trail** shows the code change event

### What We Track:
- Code change events logged to NEXUS
- Historical codes preserved in `vendor_codes`
- Supersession chain maintained for audit

---

## Implementation Status

- [x] `vendor_codes` table exists
- [x] Basic matching on item_code
- [ ] Code change detection (vendor_description match)
- [ ] Auto-update item_code on detection
- [ ] NEXUS logging for code changes
- [ ] Code Groups UI for manual linking
- [ ] Historical code viewer in ingredient detail

---

## User Flow

### Automatic (Preferred)
1. Import invoice with new code
2. System detects same `vendor_description`
3. Automatic code update + notification
4. Price history continues seamlessly

### Manual (Fallback)
1. New code appears in Triage as ghost
2. User recognizes it's an existing ingredient
3. Uses Code Groups UI to link
4. System merges and archives old code

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Vendor changes description AND code | Goes to Triage (can't auto-detect) |
| Two ingredients with same description | User disambiguation in Triage |
| Code reused for different product | vendor_description mismatch prevents false link |

---

## Related Docs
- [ROADMAP-Umbrella.md](./ROADMAP-Umbrella.md) - Cross-vendor aggregation
- [L7-DATA-PROMISE.md](../L7-DATA-PROMISE.md) - User trust & data protection
