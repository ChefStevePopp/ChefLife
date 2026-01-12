# Data Management Section Roadmap

> Master Ingredient List, Vendor Invoices (VIM), Food Inventory Review

---

## Current State (January 2026)

### Master Ingredient List ✅
- [x] Ingredient CRUD with full modal editor
- [x] Multi-vendor support (umbrella items)
- [x] Cost tracking per vendor
- [x] Unit conversions (purchase → recipe)
- [x] Category assignment (Group → Category → Sub-Category)
- [x] 21 standard allergens + 3 custom
- [x] Storage area tracking
- [x] L5 header with expandable info
- [x] Route-based detail page (replaced modal)
- [x] **L6 Navigation** — Filter-aware prev/next through filtered lists
- [x] **Guided mode** — Training tips for new users
- [x] Allergens tab with severity groupings
- [x] Import tab with wizard
- [x] Export tab with column selection
- [ ] **Import wizard polish** (column mapping UX)

### Vendor Invoice Manager (VIM) ✅
- [x] Two-stage processing (upload → review)
- [x] GFS invoice parsing
- [x] Flanagan Foodservice parsing
- [x] CSV/PDF/Photo import options
- [x] Date picker with L5 design
- [x] Price variance detection
- [x] Batch approval workflow
- [x] L5 header with expandable info
- [x] **Audit Trail System** — Enterprise-grade price tracking (Jan 10, 2026)
  - [x] Schema migrations for full audit chain
  - [x] vendor_invoices → vendor_invoice_items → vendor_price_history linkage
  - [x] Source file retention in Supabase storage (SHA256 hashed)
  - [x] Legacy data marked as `legacy_import` with cutoff documentation
  - [x] `vendor_price_audit_trail` view for comprehensive reporting
  - [x] `processInvoiceWithAuditTrail()` service for all imports
- [x] **Triage Tab** — Unified pending items view (Jan 10, 2026)
  - [x] Import → Triage → History tabbed workflow
  - [x] Shows skipped items (0% complete) + incomplete ingredients (partial %)
  - [x] StatBar with muted gray palette for contextual stats
  - [x] ExcelDataGrid standard with full L5 features
  - [x] Icon legend (Ghost=skipped, AlertTriangle=incomplete)
  - [x] Type icons (ShoppingCart=purchased, ChefHat=prep)
  - [x] Edit navigates to IngredientDetailPage with Triage context
  - [x] "Back to Triage" preserves workflow continuity
  - [x] **L5 Icon Badge Pattern** — `icon-badge-{color}` CSS classes (Jan 11)
  - [x] **filterType property** — Custom columns specify filter behavior independently
  - [x] **Center-aligned visual hierarchy** — Eliminates middle void
  - [x] **Canada theme badge** — Red/white triage count badge

### Food Inventory Review 🔄
- [x] Basic inventory list with DataTable
- [x] L5 header with context-switching
- [x] Review pipeline (database ready)
- [ ] Count sheets generation
- [ ] Variance reporting
- [ ] Par level management

### DataTable (formerly ExcelDataGrid) ✅
- [x] Global search
- [x] Column filtering
- [x] Column reordering (drag & drop)
- [x] Column visibility toggle
- [x] Pagination with L5 styling
- [x] Resizable columns
- [x] localStorage persistence
- [x] **`onFilteredDataChange` callback** — Exposes internal filtered data to parent
- [x] Cascading category filters (Major Group → Category → Sub Category)
- [x] **`align` column property** — "left" | "center" | "right" for headers and cells
- [x] **`type: "custom"` with render function** — Custom cell rendering for icons, progress bars, action buttons
- [x] **`filterType` property** — Custom columns specify filter UI independently of display type (Jan 11)
- [x] **`filterable` explicit override** — Force filterable on custom columns

---

## Immediate Priorities (January 2026)

### ✅ Completed This Sprint
- [x] Route-based Ingredient Detail Page (replaced modal)
- [x] L6 filter-aware navigation with prev/next
- [x] Guided mode for training new users
- [x] ExcelDataGrid `onFilteredDataChange` callback
- [x] Allergens tab with severity-based groupings
- [x] Import/Export tabs integrated into MasterIngredientList
- [x] **Triage Panel L5 Refactor** — Custom table → ExcelDataGrid standard
- [x] **ExcelColumn `align` property** — Header/cell alignment support
- [x] **Custom render functions** — `type: "custom"` for icon columns
- [x] **Mobile Quick Invoice** — L6 fast entry component built, parked for Mobile Admin (Jan 11)

### Import Wizard L5 Refresh
- [ ] Column mapping UI (user maps their columns → our fields)
- [ ] Preview with actual DataTable component
- [ ] Duplicate detection (by item_code or product name)
- [ ] Merge vs Replace options
- [ ] Progress indicator for large imports

### 🎯 Next Up: VIM Import Workflow Enhancement
- [ ] **"Review Later" queue** — Don't block imports for new items
- [ ] **Code Group suggestions** — Fuzzy match on vendor + product name
- [ ] **MIL "Needs Attention" filter** — Surface items pending review
- [ ] **One-click Code Group linking** — Quick action during review

### 📱 Mobile Quick Invoice (L6 Priority) ✅ → Mobile Admin
> *"Fast entry beats photo gymnastics"* — See [Promise](../promises/PROMISE-Fast-Entry-Not-Photo-Gymnastics.md)
>
> **Note:** Component built (`MobileInvoice.tsx`) but moved to future Mobile Admin section.
> Separates mobile-context workflows from desktop VIM to avoid user friction.

- [x] **Mobile-first invoice entry** — Vendor picker → filtered MIL items → qty/price → save
- [x] **Recent vendors** — One-tap access to frequent suppliers (sorted by last invoice)
- [x] **Vendor-filtered MIL** — Show only that vendor's products (via vendor + invoice history)
- [x] **Photo audit trail** — Attach receipt photo as proof (not OCR source)
- [x] **Frequent items per vendor** — Shows top 6 most-purchased items as quick-add chips
- [x] **Three-step flow** — Vendor → Items (with cart) → Review & Submit
- [x] **Running total** — Cart summary with item count and total
- [x] **Price entry modal** — Mobile-friendly qty/price entry with +/- buttons
- [ ] **Mobile Admin integration** — Separate sidebar section for mobile-context tasks
- [ ] **Draft status** — `vendor_invoices.status = 'draft'` for photo-captured, not-yet-entered (future)

### 🎯 Code Groups: The Magic in the Walls
> **The Problem:** Vendors like GFS, Sysco, and US Foods change product codes every 18-24 months on commodity items. Private label "rebrands" reset price history, making it impossible to track true cost trends.
>
> **The Solution:** Code Groups maintain product continuity across code changes. When GFS changes your chicken thighs from code 1402739 to 1408821 to 1415567, ChefLife sees it as the same product with 3+ years of unbroken price history.
>
> **Why It Matters:** This is how vendors hide cumulative price increases from large chains. ChefLife exposes the true cost trajectory.

- [ ] **Import-time suggestions** — "This new code might belong to Code Group: Chicken Thighs BLS"
- [ ] **Code Group price trend chart** — Continuous history across all codes
- [ ] **Active/Inactive code tracking** — Clear status on which code is current
- [ ] **Rebrand detection** — Flag products with multiple code changes
- [ ] **Vendor negotiation report** — "This product has increased 34% over 3 years despite 2 'new product' claims"

### Component Rename (Deferred)
- [ ] Rename `ExcelDataGrid` → `DataTable`
- [ ] Update all imports across codebase
- [ ] Document in L5-BUILD-STRATEGY.md

---

## Q1 2026

### VIM Enhancements
- [ ] Additional vendor formats (Sysco, US Foods)
- [ ] ~~OCR improvements for scanned invoices~~ **DEPRIORITIZED** — See [Promise: Fast Entry, Not Photo Gymnastics](../promises/PROMISE-Fast-Entry-Not-Photo-Gymnastics.md)
- [ ] Price trend graphs per ingredient
- [ ] Anomaly detection (unusual price spikes)
- [ ] Credit memo handling

### Inventory Counting
- [ ] Mobile-friendly count interface (UserInventory)
- [ ] Category-based count sheets
- [ ] Blind counting option
- [ ] Count history comparison
- [ ] Storage location grouping

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

## White Glove Onboarding (Future)

### The Vision

Getting a restaurant's ingredient database into ChefLife is **the #1 barrier to adoption**. Nobody's going to manually enter 300-500 ingredients.

**What restaurants actually have:**
- Vendor invoices (GFS, Sysco, Flanagan CSVs/PDFs)
- Their own messy Excel tracking
- POS item lists (if they're lucky)
- Nothing organized (most common)

### Proposed Hybrid Model

#### Self-Service Path
```
Customer uploads CSV/Excel → Column mapping wizard → Preview → Import
```
- Good for: Tech-savvy operators, small ingredient lists
- Friction points: Column mapping confusion, category assignment

#### White Glove Path
```
Customer uploads anything → ChefLife processes → Customer reviews → Done
```

**Step 1: Intake Portal**
- "Upload your last 3 months of vendor invoices (any format)"
- Accept: CSV, Excel, PDF, photos
- Support: GFS, Sysco, Flanagan, US Foods, local vendors

**Step 2: ChefLife Processing**
- Extract unique products across all invoices
- Deduplicate (same product, different vendors)
- Auto-categorize using AI + Memphis Fire category structure
- Flag items needing attention (ambiguous categories, missing data)

**Step 3: Customer Review**
- Present clean list: "Here are your 347 ingredients"
- Customer confirms categories, storage areas
- One-click approve
- Export to their ChefLife account

**Step 4: Ongoing**
- New items from future invoice imports auto-suggest
- Customer just approves additions

### Technical Components Needed

| Component | Status | Work |
|-----------|--------|------|
| CSV column mapping | ✅ Exists (VIM) | Reuse patterns |
| PDF/OCR extraction | ✅ Exists (VIM) | Reuse |
| Master Ingredient import | 🔄 Exists, needs work | L5 refresh |
| Duplicate detection | ❌ Missing | Build |
| Auto-categorization | ❌ Missing | AI-assisted |
| Intake portal | ❌ Missing | Build |
| Review/approval UI | ❌ Missing | Build |

### Revenue Model Consideration

White glove onboarding could be:
- **Included** for annual subscribers
- **Add-on service** ($199-499 one-time)
- **Partner opportunity** for consultants

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

- [x] L5 design audit on MasterIngredientList
- [x] L5 design audit on VendorInvoiceManager  
- [x] L5 design audit on InventoryManagement
- [x] L5 design audit on DataTable component
- [ ] Rename ExcelDataGrid → DataTable
- [ ] Delete legacy features/shared/components/ExcelDataGrid
- [ ] Bulk ingredient update
- [ ] CSV export for all lists
- [ ] Historical price data retention policy
- [ ] Archive old invoices

---

## File References

```
src/features/admin/components/sections/
├── recipe/MasterIngredientList/     # Ingredient database
├── VendorInvoice/                   # VIM module
├── InventoryManagement/             # Inventory & review
└── ExcelImports.tsx                 # DEPRECATED - delete

src/features/admin/components/
└── ImportExcelModal/                # Import wizard

src/shared/components/
└── ExcelDataGrid/                   # DataTable (to rename)
    ├── index.tsx
    ├── PaginationControls.tsx
    ├── ResizableHeader.tsx
    └── ColumnFilter.tsx
```

---

*Created: January 8, 2026*
*Updated: January 11, 2026 - Mobile Quick Invoice built, parked for Mobile Admin section*
*Section: Data Management*
