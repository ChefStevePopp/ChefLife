# Umbrella Items

## The Problem

Restaurants purchase the same ingredient from multiple vendors. Each vendor has their own:
- Product name ("Brisket, Beef, AA, Fresh, Canadian Roundtable for Sustainable Beef")
- Item code (1378676)
- Pricing structure
- Pack size

But in the kitchen, it's all just **BRISKET**.

When you need to:
- Compare prices across vendors
- Track total usage of an ingredient
- Find substitutions when one vendor is out of stock
- Generate consolidated reports

...you need a way to group these equivalent items together.

---

## The Solution: Umbrella Groups

An **Umbrella Group** is a collection of Master Ingredient List items that share the same `common_name`. The common name acts as your kitchen's standardized identifier.

```
☂️ BRISKET (Umbrella Group)
│
├── GFS #1378676: Brisket, Beef, AA, Fresh, Canadian Roundtable...
│   └── $14.98 / KG
│
├── Flanagan #8847201: Beef Brisket AAA Choice Grade
│   └── $15.25 / KG
│
└── Sysco #4492881: Brisket Flat Cut Premium Select
    └── $14.75 / KG
```

All three are different products with different vendor codes—but they're all **BRISKET** in your kitchen.

---

## Database Structure

### Master Ingredients Table

| Field | Description |
|-------|-------------|
| `id` | UUID (primary key) |
| `product` | Vendor's product description |
| `item_code` | Vendor's SKU/item code |
| `vendor` | Vendor name (GFS, Flanagan, Sysco, etc.) |
| `common_name` | **Your standardized name** (the umbrella identifier) |
| `current_price` | Current price from vendor |
| `cost_per_recipe_unit` | Calculated cost per recipe unit |
| ... | Other ingredient fields |

### How Umbrella Groups Form

Items are grouped when they share the same `common_name`:

```sql
-- Find all items in the BRISKET umbrella
SELECT * FROM master_ingredients 
WHERE common_name = 'BRISKET'
ORDER BY cost_per_recipe_unit ASC;
```

---

## Visual Indicators

### Icon States

| Icon | Color | Meaning |
|------|-------|---------|
| ☂️ `Umbrella` | Green (`text-emerald-400`) | **Confirmed** - Item belongs to an umbrella group with 2+ members |
| ☂️ `Umbrella` | Amber (`text-amber-400`, `opacity-60`) | **Suggested** - System detected a possible umbrella match |
| — | — | No umbrella association |

### Where Indicators Appear

1. **Import Review Screen** - Shows umbrella status of matched items
2. **Master Ingredient List** - Column or badge showing umbrella membership
3. **Ingredient Detail Page** - Section showing umbrella group members
4. **Triage Panel** - Visual indicator when item could join an umbrella

---

## User Workflows

### 1. Viewing Umbrella Groups

From the Master Ingredient List:
- Filter by umbrella group
- See all items sharing a common name
- Compare prices across vendors at a glance

### 2. Creating an Umbrella Group

**Option A: Manual Assignment**
1. Open an ingredient
2. Set the `common_name` field (e.g., "BRISKET")
3. Any other item with the same common_name automatically joins the group

**Option B: Accept Suggestion**
1. During import or triage, system detects possible matches
2. Shows amber umbrella icon with suggestion
3. User clicks to accept → common_name is set

### 3. Price Comparison

When viewing an umbrella group:
```
☂️ BRISKET
├── GFS:      $14.98/KG  ← Best Price
├── Flanagan: $15.25/KG  (+1.8%)
└── Sysco:    $14.75/KG  (-1.5%)
```

### 4. Substitution Awareness

When a vendor is out of stock or discontinued:
- System knows other items in the umbrella group
- Can suggest alternatives with pricing comparison

---

## Umbrella Naming Conventions

### Best Practices

| ✅ Good | ❌ Avoid |
|---------|----------|
| `BRISKET` | `Brisket, Beef` |
| `CHEDDAR, SHRED` | `Cheese, Old Shredded Cheddar` |
| `MILK, 2%` | `Milk, 2 Percent Liters` |
| `FRIES, 1/2"` | `Fries, Fresh 1/2In Oil Blanch With Skin` |

### Guidelines

1. **SHORT** - Kitchen callouts, not vendor descriptions
2. **UPPERCASE** - Visual distinction from product names
3. **CONSISTENT** - Use the same format across all items
4. **SPECIFIC ENOUGH** - "CHEDDAR, SHRED" vs just "CHEESE"

---

## Suggestion Engine (Future)

The system can suggest umbrella matches based on:

1. **First-word matching** - "Brisket, Beef..." → suggests "BRISKET"
2. **Category + keyword** - Items in BEEF category containing "brisket"
3. **Historical patterns** - If you've grouped similar items before
4. **Machine learning** - Trained on your naming patterns

### Suggestion Display

```
┌─────────────────────────────────────────────────────────┐
│ 🌂 Possible Umbrella Match                              │
│                                                         │
│ "Brisket, Beef, AA, Fresh..." could join:               │
│                                                         │
│ ☂️ BRISKET (2 existing items)                           │
│                                                         │
│ [Accept]  [Ignore]  [Create New Umbrella]              │
└─────────────────────────────────────────────────────────┘
```

---

## Benefits

### 1. Price Intelligence
- Instant price comparison across vendors
- Track price changes per ingredient, not just per SKU
- Identify best-value vendors for each ingredient type

### 2. Usage Tracking
- "How much BRISKET did we use this month?" (all vendors combined)
- Accurate cost of goods calculations
- Menu item costing uses umbrella average or best price

### 3. Vendor Flexibility
- Switch vendors without losing history
- Know you have substitutes available
- Negotiate with data ("Flanagan is 5% cheaper on brisket")

### 4. Inventory Clarity
- Consolidated view of equivalent items
- Cross-vendor inventory totals
- Smarter par level calculations

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] `common_name` field in master_ingredients
- [x] Manual assignment in Ingredient Detail Page
- [ ] Visual indicator (green umbrella) in lists

### Phase 2: Awareness
- [ ] Umbrella column/badge in Master Ingredient List
- [ ] Umbrella indicator on Import Review screen
- [ ] Umbrella section in Ingredient Detail Page

### Phase 3: Intelligence
- [ ] Suggestion engine for possible matches
- [ ] Amber umbrella indicator for suggestions
- [ ] One-click accept/reject for suggestions

### Phase 4: Analytics
- [ ] Price comparison view per umbrella group
- [ ] Usage reports aggregated by common_name
- [ ] Vendor recommendation engine

---

## Technical Notes

### Query Patterns

```sql
-- Get all umbrella groups with member counts
SELECT 
  common_name,
  COUNT(*) as member_count,
  MIN(cost_per_recipe_unit) as best_price,
  MAX(cost_per_recipe_unit) as worst_price
FROM master_ingredients
WHERE common_name IS NOT NULL
GROUP BY common_name
HAVING COUNT(*) > 1
ORDER BY common_name;

-- Find items that could join existing umbrellas
SELECT 
  mi.product,
  mi.vendor,
  suggested.common_name as suggested_umbrella,
  suggested.member_count
FROM master_ingredients mi
CROSS JOIN LATERAL (
  SELECT common_name, COUNT(*) as member_count
  FROM master_ingredients
  WHERE common_name IS NOT NULL
    AND LOWER(mi.product) LIKE LOWER(common_name) || '%'
  GROUP BY common_name
  LIMIT 1
) suggested
WHERE mi.common_name IS NULL;
```

### Component Integration

```tsx
// UmbrellaIndicator.tsx
import { Umbrella } from 'lucide-react';

interface UmbrellaIndicatorProps {
  status: 'confirmed' | 'suggested' | 'none';
  groupName?: string;
  memberCount?: number;
}

export const UmbrellaIndicator: React.FC<UmbrellaIndicatorProps> = ({
  status,
  groupName,
  memberCount,
}) => {
  if (status === 'none') return null;

  const isConfirmed = status === 'confirmed';

  return (
    <div className="group relative inline-flex items-center">
      <Umbrella
        className={`w-4 h-4 ${
          isConfirmed 
            ? 'text-emerald-400' 
            : 'text-amber-400 opacity-60'
        }`}
      />
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                      px-2 py-1 bg-gray-800 rounded text-xs whitespace-nowrap
                      opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {isConfirmed 
          ? `${groupName} (${memberCount} items)` 
          : `Possible match: ${groupName}`
        }
      </div>
    </div>
  );
};
```

---

## Related Documentation

- [Master Ingredient List](../features/MIL.md)
- [Vendor Invoice Import](../features/VIM-IMPORT.md)
- [Triage Workflow](../features/VIM-TRIAGE.md)
- [L5 Design Strategy](../L5-BUILD-STRATEGY.md)

---

*Last updated: January 2026*
