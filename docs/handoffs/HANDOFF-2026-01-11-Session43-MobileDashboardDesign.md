# HANDOFF: Session 44 — VIM Import Completion & Mobile Testing

**Date:** January 11, 2026  
**Previous Session:** 43  
**Context:** Mobile Dashboard architecture designed, now back to VIM completion

---

## Steve's Starter Pack (Read This First Every Session)

Things Steve always has to remind Claude about:

### Visual Patterns
| Pattern | Key Details | Reference |
|---------|-------------|----------|
| **L5 Header** | Icon box (10x10, rounded-lg, color/20 bg) + Title + Subtitle + Expandable Info | `TeamPerformance/index.tsx`, `Operations.tsx` |
| **Icon Sizes** | Inline: 4x4, Card headers: 5x5, Empty states: 8x8-12x12, Header boxes: 5x5 | L5-BUILD-STRATEGY.md |
| **Expandable Info** | `.expandable-info-section` + `.expanded` toggle | `src/index.css` |
| **Floating Action Bar** | Glowing bar for unsaved changes, bulk actions | `src/index.css` → "FLOATING ACTION BAR" |
| **Tab Colors** | primary → green → amber → rose → purple → lime → red → cyan | L5-BUILD-STRATEGY.md |
| **Card Backgrounds** | `bg-gray-800/50` — NEUTRAL, never colored backgrounds | |
| **StatBar** | Muted gray stats row above data grids | `StatBar.tsx` |

### Design Philosophy
- **"We build L5 from the start — no MVP"** — don't scaffold junk to polish later
- **"Let the color of the headline draw the eye"** — subtle, not garish
- **"It's not quite the vibe until it's subtle"** — restraint over flash
- **Lucide icons ONLY** — no mixing icon libraries
- **No bullet points in prose** — write naturally, lists only when explicitly needed

### Standard Components
| Component | Use For | Location |
|-----------|---------|----------|
| **ExcelDataGrid** | Any list/table view | `src/components/ExcelDataGrid` |
| **ConfirmDialog** | Destructive action confirmations | `src/components/ui/ConfirmDialog` |
| **LoadingLogo** | Full-page loading states | `src/features/shared/components` |
| **Toast** | Notifications (react-hot-toast) | Configured in `App.tsx` |

### Always Check
- [ ] Read the **transcript** if context is unclear
- [ ] Check **existing patterns** before creating new ones
- [ ] **NEXUS logging** for significant actions
- [ ] **Security levels** (Omega sees file paths, dev tools)
- [ ] **Promises docs** — does this feature serve a promise?

### Security Levels Quick Reference
| Level | Code | Access |
|-------|------|--------|
| Omega | 0 | Everything + Dev tools + File paths |
| Alpha | 1 | Full admin |
| Beta | 2 | Manager |
| Gamma | 3 | Shift lead |
| Delta | 4 | Senior staff |
| Echo | 5 | Standard user |

---

## Session 43 Summary

Started with MobileInvoice query bugs, ended up designing the entire mobile UX paradigm:

- **People, Place, Profit** — Three-pillar mobile architecture
- **MobileShell** — Launcher-style command center (not a menu)
- **Newton's Cradle** — Physics-based page dot animation
- **Glassmorphism Icons** — Signature visual style
- **Widget Accordions** — Expandable sections with animated stats

**Key Decision:** MobileInvoice removed from VIM desktop flow. Mobile workflows belong in Mobile Command Center, not crammed into desktop patterns.

---

## Tasks for Session 44

### 1. 🔧 Quick Mobile Testing Hook
**Goal:** Temporarily expose MobileInvoice for testing without full MobileShell build

**Action:** Add temporary route or button to test MobileInvoice.tsx
- Option A: Add to MobileNav bottom bar temporarily
- Option B: Create `/admin/mobile-test` route
- MobileInvoice.tsx location: `src/features/admin/components/sections/VendorInvoice/components/MobileInvoice.tsx`

**Why:** Need to verify the L5 queries work before building full Mobile Command Center

---

### 2. 📄 PDF Import in VIM
**Goal:** Complete PDF invoice import (currently commented out)

**Files to examine:**
- `src/features/admin/components/sections/VendorInvoice/VendorInvoiceManager.tsx`
- `src/features/admin/components/sections/VendorInvoice/components/VendorSelector.tsx`
- Check for existing PDF parsing code or skill files

**Considerations:**
- PDF parsing approach (pdf.js? server-side?)
- OCR vs structured PDF extraction
- Match CSV import flow for consistency
- User has test invoices ready

---

### 3. ✏️ Manual Entry = Desktop Mobile
**Goal:** Align Manual entry with Mobile flow for consistent audit trail

**Principle:** Same data capture, same audit trail, different interface
- Desktop Manual: Form-based entry with full MIL access
- Mobile Quick Invoice: Tap-based entry optimized for speed
- Both create identical `vendor_invoices` + `vendor_invoice_items` records

**Check:**
- Manual entry component location
- Compare data structure with MobileInvoice
- Ensure NEXUS logging matches

---

### 4. 🎨 L5/L6 Design Verification
**Goal:** Audit VIM against 6-phase L5 build strategy

**L5 Phases Checklist:**
- [ ] Phase 1: Foundation (routes, header, loading, empty states)
- [ ] Phase 1.2: Card Design (consistent structure)
- [ ] Phase 2: Search & Filter
- [ ] Phase 3: Pagination
- [ ] Phase 4: Sorting
- [ ] Phase 5: Core Feature (import flows)
- [ ] Phase 6: Polish (keyboard, animations, error handling)

**L6 Opportunities:**
- Filter-aware navigation in History tab?
- Context preservation across imports?
- Smart defaults based on vendor history?

---

## Essential Reads

### Architecture & Philosophy
| Document | Location | Why |
|----------|----------|-----|
| **L5-BUILD-STRATEGY.md** | `docs/L5-BUILD-STRATEGY.md` | 6-phase build process, L6 patterns, Mobile-First section |
| **CHEFLIFE-ANATOMY.md** | `docs/CHEFLIFE-ANATOMY.md` | Mobile Paradigm section, People/Place/Profit |
| **ROADMAP-Mobile-Dashboard.md** | `docs/roadmaps/ROADMAP-Mobile-Dashboard.md` | Full mobile design spec |

### VIM Specific
| Document | Location | Why |
|----------|----------|-----|
| **ROADMAP-Data.md** | `docs/roadmaps/ROADMAP-Data.md` | VIM roadmap, import flows |
| **VIM-L5-REVIEW.md** | `docs/reviews/VIM-L5-REVIEW.md` | Previous L5 audit |

### Promises
| Document | Location | Why |
|----------|----------|-----|
| **PROMISE-Fast-Entry-Not-Photo-Gymnastics.md** | `docs/promises/PROMISE-Fast-Entry-Not-Photo-Gymnastics.md` | Why we don't do OCR-first |
| **PROMISE-Phone-Command-Center.md** | `docs/promises/PROMISE-Phone-Command-Center.md` | Mobile philosophy |

---

## Key File Locations

### Styling & Components
| What | Location |
|------|----------|
| **CSS Component Library** | `src/index.css` |
| **Floating Action Bar** | `src/index.css` → search "FLOATING ACTION BAR" |
| **Tab Colors** | `src/index.css` → search ".tab" |
| **Color Hierarchy** | L5-BUILD-STRATEGY.md → "Tab Color Progression" section |

### Tab Color Progression (Quick Reference)
| Position | Color | Class | Hex |
|----------|-------|-------|-----|
| 1st | Blue | `.primary` | #38bdf8 |
| 2nd | Green | `.green` | #4ade80 |
| 3rd | Amber | `.amber` | #fbbf24 |
| 4th | Rose | `.rose` | #fb7185 |
| 5th | Purple | `.purple` | #c084fc |
| 6th | Lime | `.lime` | #84cc16 |
| 7th | Red | `.red` | #f87171 |
| 8th | Cyan | `.cyan` | #22d3ee |

### VIM Components
| Component | Location |
|-----------|----------|
| VendorInvoiceManager | `src/features/admin/components/sections/VendorInvoice/VendorInvoiceManager.tsx` |
| VendorSelector | `src/features/admin/components/sections/VendorInvoice/components/VendorSelector.tsx` |
| MobileInvoice | `src/features/admin/components/sections/VendorInvoice/components/MobileInvoice.tsx` |
| ImportTab | `src/features/admin/components/sections/VendorInvoice/components/ImportTab.tsx` |

### Database Schema
| Table | Purpose |
|-------|---------|
| `vendor_invoices` | Invoice headers (vendor, date, total, source) |
| `vendor_invoice_items` | Line items with MIL links |
| `master_ingredients` | Ingredient database |
| `master_ingredients_with_categories` | View with category names |
| `operations_settings.vendors` | Vendor list (text array) |

---

## Schema Reminders (from Session 43 debugging)

**Vendors:** Stored as text array in `operations_settings.vendors`, NOT a separate table

**Ingredients by vendor:**
```typescript
// Direct vendor assignment
.from("master_ingredients_with_categories")
.eq("vendor", vendorId)
.eq("ingredient_type", "purchased")

// Historical from invoices (two-step)
.from("vendor_invoice_items")
.select("master_ingredient_id, vendor_invoices!inner (vendor_id)")
.eq("vendor_invoices.vendor_id", vendorId)
```

---

## Session 43 Files Modified

| File | Changes |
|------|---------|
| `MobileInvoice.tsx` | Fixed vendor/ingredient queries for operations_settings schema |
| `VendorSelector.tsx` | Removed Mobile button (moved to future Mobile Admin) |
| `VendorInvoiceManager.tsx` | Removed MobileInvoice import/rendering |
| `ROADMAP-Data.md` | Updated Mobile Quick Invoice section |
| `ROADMAP-Mobile-Dashboard.md` | **Created** — Full mobile design spec |
| `PROMISE-Phone-Command-Center.md` | **Created** — Mobile philosophy |
| `promises/README.md` | Added new promise |
| `L5-BUILD-STRATEGY.md` | Added Mobile-First Design section |
| `CHEFLIFE-ANATOMY.md` | Added Mobile Paradigm section (v1.6) |

---

## Transcript Location

Full conversation transcript:
```
/mnt/transcripts/2026-01-11-21-57-50-mobile-invoice-architecture-decision.txt
```

---

## Questions for Session 44

1. **PDF Strategy:** Server-side parsing or client-side pdf.js?
2. **Mobile Testing:** Temporary route or MobileNav button?
3. **Manual Entry:** Where is the current Manual entry component?
4. **L6 Push:** What context preservation would help VIM users most?

---

## The Big Picture

We're building toward a unified data entry experience:

```
┌─────────────────────────────────────────────────────────────┐
│                    INVOICE ENTRY PATHS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DESKTOP (VIM)                    MOBILE (Command Center)   │
│  ═══════════                      ═══════════════════════   │
│                                                             │
│  CSV Import ────┐                                           │
│  PDF Import ────┼──► vendor_invoices ◄──── Quick Invoice   │
│  Manual Entry ──┘    vendor_invoice_items                   │
│                                                             │
│  Same audit trail. Same data. Different interfaces.        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*"Keep communication consistent, keep commerce kind, and keep your culture cool and comfortable, my friends."*

Ready for Session 44! 🔥
