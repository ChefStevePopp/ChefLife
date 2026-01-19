# Data Entry Philosophy: The 3-Tier Principle

**Created:** January 19, 2026  
**Status:** Core Architecture Principle

---

## The Golden Rule

> **Manual is never an afterthought. It's the foundation everything else builds on.**

Every feature in ChefLife must support three robust data entry paths. No exceptions.

---

## The 3 Tiers

| Tier | Who Uses It | How It Works | Priority |
|------|-------------|--------------|----------|
| **Manual** | Small operators, solo chefs, anyone | Hand entry forms | **Always first** |
| **Import** | Growing restaurants, batch operations | File uploads, CSV/Excel processing | Augments manual |
| **Integration** | Scaled operations, multi-unit | Live API sync, real-time feeds | Convenience layer |

---

## Why This Matters

### 1. Respect the Journey
Not everyone starts with a POS system, scheduling software, or automated sensors. A solo chef opening their first food truck shouldn't feel like a second-class citizen because they're entering sales by hand.

### 2. Resilience
APIs go down. Integrations break. Import files get corrupted. Manual entry is always the fallback. If it's clunky, users are stuck.

### 3. Understanding Before Automation
Users who start manual understand their data. When they graduate to imports or integrations, they know what to expect and can spot problems.

### 4. Trust Building
When manual entry works beautifully, users trust the system with their data. That trust extends to automated features later.

---

## Implementation Rules

### Manual Entry Must Be:
- **Fast** — Minimize clicks, smart defaults, keyboard navigation
- **Pleasant** — Good UX, not a chore
- **Complete** — Every field the system needs, no hidden requirements
- **Forgiving** — Easy corrections, undo support, draft states

### Imports Must:
- **Mirror manual** — Same data model, same validation
- **Provide feedback** — Show what worked, what failed, why
- **Allow correction** — Don't force re-import for small fixes
- **Never orphan** — If import breaks, manual still works

### Integrations Must:
- **Be optional** — Never required for core functionality
- **Fail gracefully** — Errors don't cascade
- **Allow override** — Manual corrections take precedence
- **Show source** — User knows where data came from

---

## Applied to ChefLife Features

### BOH Vitals (Costs & Vendors)

| Tier | Implementation | Status |
|------|----------------|--------|
| Manual | Edit ingredient price directly in MIL | ✅ Working |
| Import | VIM invoice upload (GFS, Flanagan) | ✅ Working |
| Integration | Vendor EDI, automated price feeds | 🔜 Future |

### FOH Vitals (Revenue & Sales)

| Tier | Implementation | Status |
|------|----------------|--------|
| Manual | Enter daily sales, covers, item counts | 🔜 Build |
| Import | POS CSV export upload | 🔜 Build |
| Integration | Live POS API (Toast, Square, etc.) | 🔜 Future |

### Team (Scheduling & Labor)

| Tier | Implementation | Status |
|------|----------------|--------|
| Manual | Schedule builder, manual time entry | ✅ Working |
| Import | Shift CSV import | ✅ Working |
| Integration | 7shifts live sync | ✅ Working |

### Kitchen (Temps & Food Safety)

| Tier | Implementation | Status |
|------|----------------|--------|
| Manual | Manual temp log entry | ✅ Working |
| Import | — (not applicable) | — |
| Integration | SensorPush real-time | ✅ Working |

### Inventory

| Tier | Implementation | Status |
|------|----------------|--------|
| Manual | Count entry forms | ✅ Working (needs polish) |
| Import | Count sheet upload | 🔜 Build |
| Integration | Inventory system API | 🔜 Future |

---

## UI Patterns

### Data Source Indicator
When displaying data, show where it came from:

```
Last updated: Jan 19, 2026 at 2:34 PM
Source: Manual entry by Steve
        ─────────────────────
Source: VIM Import (Invoice #12345)
        ─────────────────────
Source: 7shifts sync (auto)
```

### Entry Mode Selector
For features with multiple tiers, make it clear:

```
┌─────────────────────────────────────────┐
│ Add Sales Data                          │
├─────────────────────────────────────────┤
│ ○ Enter manually                        │
│ ○ Import from file                      │
│ ○ Pull from POS (connected)             │
└─────────────────────────────────────────┘
```

### Override Indicator
When manual corrections override imported/synced data:

```
Brisket price: $4.85/lb
  ⚠️ Manual override (was $4.52 from GFS invoice)
  [Revert to imported value]
```

---

## Testing Checklist

Before shipping any data-driven feature, verify:

- [ ] Can a user with NO integrations complete this task?
- [ ] Is manual entry as polished as the automated path?
- [ ] Does import failure leave manual intact?
- [ ] Can manual corrections override automated data?
- [ ] Is the data source visible to users?
- [ ] Does the feature degrade gracefully without connectivity?

---

## The Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    INTEGRATION                          │
│                  (Convenience Layer)                    │
│    Live sync, real-time feeds, automated updates       │
├─────────────────────────────────────────────────────────┤
│                      IMPORT                             │
│                 (Batch Processing)                      │
│      File uploads, CSV processing, bulk entry          │
├─────────────────────────────────────────────────────────┤
│                      MANUAL                             │
│                   (Foundation)                          │
│        Hand entry, always works, always first          │
│                                                         │
│   ★ THIS IS WHERE WE START. THIS IS WHAT WE POLISH. ★  │
└─────────────────────────────────────────────────────────┘
```

---

## Remember

> "We need to build for all 3 — all 3 need to be robust."

A restaurant using manual entry should have the same confidence in their data as one with full integrations. The experience should feel complete at every tier, not like a stepping stone to something better.

**Manual is not training wheels. It's the bike.**
