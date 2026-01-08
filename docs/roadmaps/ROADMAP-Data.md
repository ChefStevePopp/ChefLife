# Data Management Section Roadmap

> Master Ingredient List, Vendor Invoices (VIM), Food Inventory Review

---

## Current State (January 2026)

### Master Ingredient List ✅
- [x] Ingredient CRUD
- [x] Multi-vendor support (umbrella items)
- [x] Cost tracking per vendor
- [x] Unit conversions
- [x] Category assignment

### Vendor Invoice Manager (VIM) ✅
- [x] Two-stage processing (upload → review)
- [x] GFS invoice parsing
- [x] Flanagan Foodservice parsing
- [x] Date picker with L5 design
- [x] Price variance detection
- [x] Batch approval workflow

### Food Inventory Review 🔄
- [x] Basic inventory list
- [ ] Count sheets
- [ ] Variance reporting
- [ ] Par level management

---

## Q1 2026

### VIM Enhancements
- [ ] Additional vendor formats (Sysco, US Foods)
- [ ] OCR for scanned invoices
- [ ] Price trend graphs per ingredient
- [ ] Anomaly detection (unusual prices)
- [ ] Credit memo handling

### Inventory Counting
- [ ] Mobile-friendly count interface
- [ ] Category-based count sheets
- [ ] Blind counting option
- [ ] Count history comparison
- [ ] Storage location tracking

---

## Q2 2026

### Waste Tracking
- [ ] Waste log entry
- [ ] Reason codes (spoilage, over-prep, returns)
- [ ] Waste cost reporting
- [ ] Trend analysis
- [ ] Reduction goal tracking

### Ordering Integration
- [ ] Par-based order suggestions
- [ ] Order history
- [ ] Supplier portal links
- [ ] Order confirmation tracking

---

## Q3 2026

### Advanced Analytics
- [ ] Food cost trending
- [ ] Actual vs theoretical usage
- [ ] Menu item profitability
- [ ] Supplier price comparison
- [ ] Seasonal price patterns

### Perpetual Inventory
- [ ] Real-time inventory updates
- [ ] Recipe usage deduction
- [ ] Waste auto-deduction
- [ ] Receiving auto-addition
- [ ] Variance alerts

---

## Vendor Format Support

### Currently Supported
| Vendor | Format | Status |
|--------|--------|--------|
| GFS (Gordon Food Service) | CSV | ✅ |
| Flanagan Foodservice | CSV | ✅ |

### Planned Support
| Vendor | Format | Priority |
|--------|--------|----------|
| Sysco | CSV/EDI | Q1 2026 |
| US Foods | CSV | Q1 2026 |
| Costco Business | PDF | Q2 2026 |
| Restaurant Depot | CSV | Q2 2026 |
| Local vendors | Manual entry | Ongoing |

---

## Technical Debt & Polish

- [ ] L5 design audit on Excel Imports page
- [ ] Bulk ingredient update
- [ ] CSV export for all lists
- [ ] Historical price data retention policy
- [ ] Archive old invoices

---

## References

- `src/features/inventory/` - Inventory feature modules
- `src/features/admin/components/sections/ExcelImports/`

---

*Created: January 8, 2026*
*Section: Data Management*
