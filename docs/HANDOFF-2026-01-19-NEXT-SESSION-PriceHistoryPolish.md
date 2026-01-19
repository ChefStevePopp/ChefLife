# Next Session: Price History Polish
## BOH Vitals + PriceWatchTicker + Ingredient Modal

---

## Session Goal

Complete the price history UX across three touchpoints:
1. **PriceWatchTicker** - Acknowledge + pagination
2. **BOH Vitals Tab** - CardCarousel with Price Watch card
3. **Ingredient Page** - Quick access to price history modal

---

## Context From Previous Session

### What's Already Built

| Component | Location | Status |
|-----------|----------|--------|
| `PriceHistoryDetailModal` | `VendorInvoice/components/PriceHistory/` | ✅ Complete with lookback selector |
| `CardCarousel` | `src/shared/components/CardCarousel/` | ✅ Zero-dep, CSS scroll-snap |
| `PriceWatchTickerInline` | `AdminDashboard/PriceWatchTickerInline.tsx` | ✅ Working, needs acknowledge |
| `ActivityFeedV2` | `src/features/admin/components/` | ✅ Has acknowledge pattern to mirror |
| `AdminDash_BOHVitalsTab` | `AdminDashboard/tabs/` | ✅ Placeholder, needs CardCarousel |

### Key Architecture

**NEXUS Dashboard Tabs** (7 tabs, color progression):
```
Kitchen → Team → BOH Vitals → FOH Vitals → Organization → System → Craft Perfected
primary   green    amber        rose        purple         lime       red
```

**3-Tier Data Entry Philosophy** (see `docs/DATA-ENTRY-PHILOSOPHY.md`):
- Manual entry is the foundation, never an afterthought
- Imports augment manual
- Integrations are convenience, not requirements

**Ingredient Tracking Flags** (in `master_ingredients`):
- `show_on_dashboard` - Item appears in dashboard Price Watch card
- `alert_price_change` - Item appears in ticker badge + critical list
- `priority_level` - Critical/High/Standard/Low

---

## Task 1: PriceWatchTicker Acknowledge + Pagination

**File:** `src/features/admin/components/AdminDashboard/PriceWatchTickerInline.tsx`

### 1A. Add Acknowledge Functionality

Mirror the `ActivityFeedV2` pattern:

```typescript
// State
const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(() => {
  const stored = localStorage.getItem('acknowledged_price_alerts');
  return stored ? new Set(JSON.parse(stored)) : new Set();
});

// Persist to localStorage
useEffect(() => {
  localStorage.setItem('acknowledged_price_alerts', 
    JSON.stringify([...acknowledgedAlerts])
  );
}, [acknowledgedAlerts]);

// Handler
const handleAcknowledge = (itemId: string) => {
  setAcknowledgedAlerts(prev => new Set([...prev, itemId]));
};
```

**UI Changes:**
- Add "✓ Acknowledge" button on each expanded item
- Badge count = critical items NOT in acknowledgedAlerts
- Acknowledged items gray out in expanded view
- Add "Show acknowledged" toggle (like ActivityFeedV2)

### 1B. Paginated Expanded View

Instead of showing all critical items at once:

```typescript
const [currentPage, setCurrentPage] = useState(0);
const itemsPerPage = 5;

const paginatedItems = sortedCritical.slice(
  currentPage * itemsPerPage,
  (currentPage + 1) * itemsPerPage
);

const totalPages = Math.ceil(sortedCritical.length / itemsPerPage);
```

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ PORK, SHOULDERS NY           +12.4%  [✓ Acknowledge]          │
│ BEEF, BRISKET                +7.2%   [✓ Acknowledge]          │
│ ... (3 more items)                                             │
├─────────────────────────────────────────────────────────────────┤
│                    ◀ 1 of 3 ▶                                  │
│               View All Price History →                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task 2: BOH Vitals Tab - CardCarousel

**File:** `src/features/admin/components/AdminDashboard/tabs/AdminDash_BOHVitalsTab.tsx`

### Replace current content with CardCarousel

```typescript
import { CardCarousel, CarouselCard } from "@/shared/components/CardCarousel";
import { PriceHistoryDetailModal } from "@/features/admin/components/sections/VendorInvoice/components/PriceHistory";

// 4 cards for BOH Vitals
<CardCarousel showDots showArrows>
  <CarouselCard title="Price Watch" icon={TrendingUp}>
    {/* Grid of watched ingredients */}
  </CarouselCard>
  
  <CarouselCard title="Cost Trends" icon={CircleDollarSign}>
    {/* Food cost %, margin - placeholder */}
  </CarouselCard>
  
  <CarouselCard title="Inventory Health" icon={Package}>
    {/* Stock levels - placeholder */}
  </CarouselCard>
  
  <CarouselCard title="Vendor Intelligence" icon={Truck}>
    {/* Vendor comparisons - placeholder */}
  </CarouselCard>
</CardCarousel>
```

### Price Watch Card Content

Query ingredients where `show_on_dashboard = true`:

```typescript
const { data: watchedIngredients } = await supabase
  .from('master_ingredients')
  .select('id, print_name, current_price, last_price, unit_of_measure')
  .eq('organization_id', orgId)
  .eq('show_on_dashboard', true)
  .order('print_name');
```

Display as grid with mini price indicators. Click → opens `PriceHistoryDetailModal`.

---

## Task 3: Ingredient Page - Price Modal Access

**Files to check:**
- `src/features/admin/components/sections/MasterIngredientsList/` (main list)
- Individual ingredient detail/edit components

### Add "View Price History" Button

On ingredient row or detail panel:

```typescript
import { PriceHistoryDetailModal } from "@/features/admin/components/sections/VendorInvoice/components/PriceHistory";

const [priceHistoryModal, setPriceHistoryModal] = useState<{
  open: boolean;
  ingredientId: string | null;
  ingredientName: string;
}>({ open: false, ingredientId: null, ingredientName: '' });

// Button
<button
  onClick={() => setPriceHistoryModal({
    open: true,
    ingredientId: ingredient.id,
    ingredientName: ingredient.print_name
  })}
  className="btn-ghost-amber"
  title="View price history"
>
  <TrendingUp className="w-4 h-4" />
</button>

// Modal
<PriceHistoryDetailModal
  isOpen={priceHistoryModal.open}
  onClose={() => setPriceHistoryModal({ open: false, ingredientId: null, ingredientName: '' })}
  ingredientId={priceHistoryModal.ingredientId}
  ingredientName={priceHistoryModal.ingredientName}
/>
```

---

## Reference: Key Patterns

### ActivityFeedV2 Acknowledge Pattern
**File:** `src/features/admin/components/ActivityFeedV2.tsx`

- Uses `acknowledged_by` array (user IDs) in database
- "Mark as Read" button on each item
- "Show acknowledged" toggle (defaults to hidden)
- Inbox zero state when all items acknowledged

### CardCarousel Props
```typescript
CardCarousel: {
  children,
  showDots?: boolean,
  showArrows?: boolean,
  keyboardNav?: boolean,
  gap?: number,
  cardsPerView?: { mobile: number, tablet: number, desktop: number },
  onSlideChange?: (index: number) => void,
  title?: string,
  autoPlay?: boolean,
  pauseOnHover?: boolean
}

CarouselCard: {
  children,
  title?: string,
  icon?: React.ElementType,
  headerActions?: React.ReactNode,
  fillHeight?: boolean,
  className?: string,
  onClick?: () => void
}
```

### PriceHistoryDetailModal Props
```typescript
interface PriceHistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientId: string | null;
  ingredientName: string;
}
```
- Has lookback period selector (30d, 60d, 90d, 180d, 1yr, 2yr)
- Shows price chart + stats
- Uses `vendor_price_history_all` view

---

## File Locations

```
src/features/admin/components/
├── AdminDashboard/
│   ├── PriceWatchTickerInline.tsx    ← Task 1
│   └── tabs/
│       └── AdminDash_BOHVitalsTab.tsx ← Task 2
├── ActivityFeedV2.tsx                 ← Reference pattern
└── sections/
    ├── MasterIngredientsList/         ← Task 3
    └── VendorInvoice/
        └── components/
            └── PriceHistory/
                └── PriceHistoryDetailModal.tsx ← Already built

src/shared/components/
└── CardCarousel/
    └── index.tsx                      ← Already built
```

---

## Testing Checklist

- [ ] PriceWatchTicker: Acknowledge button works
- [ ] PriceWatchTicker: Badge decrements when acknowledged
- [ ] PriceWatchTicker: "Show acknowledged" toggle works
- [ ] PriceWatchTicker: Pagination shows 5 items per page
- [ ] BOH Vitals: CardCarousel renders 4 cards
- [ ] BOH Vitals: Price Watch card shows watched ingredients
- [ ] BOH Vitals: Click ingredient opens PriceHistoryDetailModal
- [ ] Ingredient Page: "View Price History" button visible
- [ ] Ingredient Page: Modal opens with correct ingredient data
- [ ] Modal: Lookback selector works across all entry points

---

## Quick Start

1. Start with PriceWatchTicker (Task 1) - most complex
2. Then BOH Vitals CardCarousel (Task 2) - reuses modal
3. Finally ingredient page button (Task 3) - simple wiring

All three share the same `PriceHistoryDetailModal` - consistency FTW.
