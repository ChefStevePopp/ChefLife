# Allergen Manager
## The Immune System - Protecting Guests & Business

**Document Created:** February 1, 2026
**Last Updated:** February 1, 2026
**Authors:** Steve Popp (Creator) & Claude (Architecture Partner)
**Status:** Core Module (5th)
**Location:** `/admin/allergens`

---

## Overview

Allergen Manager is ChefLife's **immune system** - protecting guests from allergic reactions and protecting the business from liability, lawsuits, and regulatory violations.

One allergic reaction can:
- Hospitalize or kill a guest
- Destroy your reputation permanently
- Close your doors (criminal charges under Natasha's Law)
- Result in massive lawsuits

**This module is mission-critical.**

---

## Why Allergen Manager is a Core Module

Originally part of Recipe Settings, Allergen Manager was elevated to core module status on Feb 1, 2026 due to:

1. **Cross-Cutting Concerns** - Touches ingredients, stations, recipes, menu items, and customer portal
2. **Regulatory Compliance** - Multi-jurisdiction requirements (UK, Canada, US, Australia)
3. **Food Safety** - Equal importance to HACCP and COGS tracking
4. **White-Label Customization** - Branding requirements for customer-facing allergen displays
5. **Legal Liability** - Natasha's Law precedent (Natasha Ednan-Laperouse, 2016)

---

## The Three-State Allergen System

Every allergen can be in one of three states:

| State | Icon | Meaning | Use Case |
|-------|------|---------|----------|
| **Contains** | ✓ (Rose) | Ingredient IS the allergen | Milk in butter, peanuts in peanut butter |
| **May Contain** | ⚠️ (Amber) | Supplier cross-contamination warning | "May contain traces of nuts" |
| **None** | — (Gray) | Not present, not a risk | Default state |

**Why Three States?**

Binary (yes/no) is insufficient for allergen risk:
- A dish with peanut butter **contains** peanuts
- A dish made on equipment that processes nuts **may contain** traces
- A dish with no exposure has **none**

Guests with severe allergies need this nuance to make informed decisions.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ALLERGEN DATA CASCADE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 0: MASTER INGREDIENTS (Supplier Level)                              │
│  ════════════════════════════════════════════                              │
│  Each ingredient tracks 27+ standard allergens + 3 custom slots:           │
│  ├── allergen_[type]: boolean — "Contains this allergen"                   │
│  ├── allergen_[type]_may_contain: boolean — "Supplier warning"             │
│  ├── allergen_notes: text — "Additional documentation"                     │
│  └── allergen_custom1/2/3_name, _active, _may_contain                      │
│                                                                             │
│  Examples:                                                                 │
│  • Butter: allergen_milk = true (contains)                                 │
│  • Chocolate: allergen_milk_may_contain = true (traces)                    │
│  • Flour: allergen_gluten = true (contains)                                │
│                           │                                                 │
│                           ▼                                                 │
│  LAYER 1: KITCHEN STATIONS (Environmental Level)                           │
│  ═══════════════════════════════════════════════                           │
│  Each kitchen station tracks environmental allergens:                      │
│  ├── station_allergens: Record<AllergenType, AllergenEnvironmentalState>   │
│  ├── notes: string — "Flour aerosolized during breading"                   │
│  └── Automatically cascades to all recipes assigned to that station        │
│                                                                             │
│  Examples:                                                                 │
│  • Breading Station: gluten="contains", shellfish="may_contain"            │
│  • Dessert Station: treenut="may_contain" (nut dust from pastry work)      │
│  • Grill Station: none (isolated from allergen work)                       │
│                           │                                                 │
│                           ▼                                                 │
│  LAYER 2: RECIPES (Combined Level)                                         │
│  ══════════════════════════                                                │
│  Recipes inherit allergens from:                                           │
│  ├── All ingredients used in the recipe (from Layer 0)                     │
│  ├── Station assignment (from Layer 1)                                     │
│  └── Manual overrides (chef can add context)                               │
│                                                                             │
│  Example: Pulled Pork Sandwich                                             │
│  • Pork (none), Bun (gluten), Coleslaw (egg in mayo)                       │
│  • Made at Sandwich Station (may_contain shellfish from shrimp prep)       │
│  • Final: Contains gluten, egg | May contain shellfish                     │
│                           │                                                 │
│                           ▼                                                 │
│  LAYER 3: CUSTOMER PORTAL (Public-Facing) [FUTURE]                         │
│  ══════════════════════════════════════════════════                        │
│  ├── Embeddable allergen widget for website                                │
│  ├── QR code generation for table tents                                    │
│  ├── Menu item → allergen linking                                          │
│  ├── Disclaimer text customization                                         │
│  └── White-label custom allergen icons                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
src/features/admin/components/sections/AllergenManager/
├── index.tsx                           # Main module component
├── types.ts                            # Type definitions
└── components/
    ├── CustomIconsContent.tsx         # White-label icon uploader (stubbed)
    └── StationAllergensContent.tsx    # Environmental allergen configuration
```

### Key Files

**index.tsx** - Main module using L5 Vitals Page accordion pattern:
- 3 accordion sections (Custom Icons, Station Allergens, Portal Config)
- localStorage persistence for expanded state
- Stat pills showing configuration counts
- Regulatory compliance messaging

**types.ts** - Core type definitions:
```typescript
export type AllergenEnvironmentalState = "contains" | "may_contain" | "none";
export type AllergenSectionId = "custom_icons" | "station_allergens" | "portal_config";
export interface StationAllergenData {
  environmentalAllergens: Record<AllergenType, AllergenEnvironmentalState>;
  notes?: string;
}
```

**StationAllergensContent.tsx** - Full environmental allergen UI:
- Two-button toggle pattern (Check icon for Contains, AlertTriangle for May Contain)
- Responsive grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- AllergenBadge integration
- Station notes for documentation

---

## White-Label Customization (Future)

### Icon Pack System

Restaurants need custom allergen icons to match their brand identity, especially for:
- Customer-facing allergen portals
- Menu boards and table tents
- Website embeds
- QR code allergen lookups

**Planned Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WHITE-LABEL ICON CUSTOMIZATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  APPROACH 1: Icon Pack Selection                                           │
│  ═══════════════════════════════                                           │
│  Pre-designed icon sets for different brand styles:                        │
│  ├── Modern (flat, minimal, colorful)                                      │
│  ├── Classic (traditional, detailed, muted)                                │
│  ├── Medical (clinical, informational, grayscale)                          │
│  └── Minimal (line art, monochrome, simple)                                │
│                                                                             │
│  Selection stored in: operations_settings.allergen_icon_pack               │
│                                                                             │
│  APPROACH 2: Per-Allergen Custom Upload                                    │
│  ═══════════════════════════════════════                                   │
│  Upload custom SVG for each allergen:                                      │
│  ├── Upload via drag-drop or file picker                                   │
│  ├── SVG validation (dimensions, file size, security)                      │
│  ├── Stored in Supabase Storage: allergen-icons/[org]/[allergen].svg       │
│  └── Fallback to system default if no custom icon                          │
│                                                                             │
│  URL Structure: /storage/v1/object/public/allergen-icons/[org]/peanut.svg  │
│                                                                             │
│  APPROACH 3: Hybrid (Recommended)                                          │
│  ═══════════════════════════════                                           │
│  ├── Start with icon pack selection (covers 90% of needs)                  │
│  ├── Allow per-allergen overrides for specific branding                    │
│  ├── Preview system before applying changes                                │
│  └── Revert to pack default option                                         │
│                                                                             │
│  Configuration UI:                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Icon Pack: [Modern ▼]                                    [Preview All]│ │
│  │                                                                       │ │
│  │ Custom Overrides (Optional):                                         │ │
│  │ ┌─────────┬────────────┬─────────────┬─────────┐                     │ │
│  │ │ Peanut  │ [📸 Icon]  │ [Upload]    │ [Reset] │                     │ │
│  │ │ Treenut │ [Default]  │ [Upload]    │   —     │                     │ │
│  │ │ Milk    │ [📸 Icon]  │ [Upload]    │ [Reset] │                     │ │
│  │ └─────────┴────────────┴─────────────┴─────────┘                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Jurisdiction Support

Different countries require different allergen lists:

| Jurisdiction | Standard | Allergen Count |
|--------------|----------|----------------|
| **USA** | FDA Big 9 | 9 major allergens |
| **Canada** | Health Canada | 11 priority allergens |
| **UK/EU** | Natasha's Law / EU 1169/2011 | 14 allergens |
| **AU/NZ** | FSANZ | 10 allergens |

**Planned Feature:** Jurisdiction selector that:
- Shows/hides allergens based on regulatory requirements
- Swaps icon packs if region-specific designs exist
- Adjusts disclaimer text for local compliance
- Supports multiple jurisdictions simultaneously (international chains)

---

## Regulatory Compliance

### Natasha's Law (UK)

> **Named after:** Natasha Ednan-Laperouse (1997-2016)
> **Incident:** Died from allergic reaction to sesame in Pret A Manger baguette
> **Law:** Pre-packaged food must have full ingredient labeling (October 2021)
> **Impact:** Criminal charges possible for non-compliance

ChefLife supports Natasha's Law by:
- Full allergen disclosure at ingredient, recipe, and menu levels
- Three-state system for nuanced risk communication
- Audit trail of allergen data changes via NEXUS
- Customer-facing allergen information (future)

### FDA Big 9 (USA)

The 9 major food allergens that account for 90% of reactions:
1. Milk
2. Eggs
3. Fish
4. Crustacean shellfish
5. Tree nuts
6. Peanuts
7. Wheat
8. Soybeans
9. Sesame (added 2023)

### Health Canada Priority Allergens

11 priority allergens requiring declaration:
- All FDA Big 9, plus:
- Mustard
- Sulphites (if ≥10 ppm)

### FSANZ (Australia/New Zealand)

10 allergens requiring declaration:
- Similar to FDA but includes lupin and excludes soy from mandatory list

---

## Future Roadmap

### Phase 1: Core Infrastructure ✅ (Completed Feb 1, 2026)
- [x] Extract from Recipe Settings into dedicated module
- [x] Three-state allergen system (Contains/May Contain/None)
- [x] Environmental allergen tracking at kitchen stations
- [x] L5 Vitals Page accordion pattern
- [x] LocalStorage persistence
- [x] Responsive grid layouts
- [x] Integration with ModulesManager and routing

### Phase 2: Customer Portal (Q2 2026)
- [ ] Public-facing allergen information page
- [ ] QR code generation for table tents
- [ ] Embeddable widget for restaurant websites
- [ ] Menu item → allergen linking
- [ ] Disclaimer text customization
- [ ] Print-friendly allergen cards

### Phase 3: White-Label Customization (Q3 2026)
- [ ] Icon pack selection system
- [ ] Custom SVG upload per allergen
- [ ] Preview system before applying changes
- [ ] Supabase Storage integration
- [ ] Icon management UI in CustomIconsContent

### Phase 4: Multi-Jurisdiction Support (Q4 2026)
- [ ] Jurisdiction selector (USA, Canada, UK/EU, AU/NZ)
- [ ] Region-specific allergen lists
- [ ] Localized disclaimer templates
- [ ] Multi-jurisdiction simultaneous support
- [ ] Compliance documentation exports

### Phase 5: Advanced Features (2027)
- [ ] Allergen risk scoring (severity × prevalence)
- [ ] Supplier allergen data import (automated)
- [ ] Guest allergen profiles (save preferences)
- [ ] Allergen substitution suggestions
- [ ] Cross-contact risk visualization
- [ ] Compliance audit reports

---

## Integration Points

### With Other Modules

**Recipe Manager** (`/admin/recipes`)
- Recipes display all allergens from ingredients and station
- Allergens tab in 11-tab editor
- Visual allergen badges in recipe cards

**Data Management** (`/admin/data/ingredients`)
- Master Ingredient allergen configuration
- AllergenSection component in ingredient detail page
- Supplier allergen import via VIM

**Operations** (`/admin/operations`)
- Kitchen station configuration
- Station → allergen mapping stored in operations_settings
- Environmental risk documentation

**HACCP** (`/admin/haccp`)
- Cross-contact prevention protocols
- Allergen control critical control points (CCPs)
- Food safety compliance documentation

**Communications** (`/admin/modules/communications`)
- Allergen alert templates
- Guest allergen inquiry responses
- Supplier allergen update notifications

---

## Database Schema

### operations_settings Table

```sql
-- Allergen configuration stored in operations_settings
kitchen_station_allergens: {
  "[Station Name]": {
    environmentalAllergens: {
      [allergen_type]: "contains" | "may_contain" | "none"
    },
    notes: string
  }
}

-- Example:
{
  "Breading Station": {
    "environmentalAllergens": {
      "gluten": "contains",
      "shellfish": "may_contain",
      "egg": "contains"
    },
    "notes": "Flour aerosolized during breading. Shrimp prepped on adjacent station."
  }
}
```

### master_ingredients Table

```sql
-- Standard allergens (27 types)
allergen_peanut: boolean
allergen_peanut_may_contain: boolean
allergen_treenut: boolean
allergen_treenut_may_contain: boolean
-- ... (all 27 allergens follow this pattern)

-- Custom allergens (3 slots for jurisdiction-specific needs)
allergen_custom1_name: text
allergen_custom1_active: boolean
allergen_custom1_may_contain: boolean
-- ... (custom2, custom3)

-- Notes
allergen_notes: text
```

### recipes Table (Future)

```sql
-- Allergen overrides (when recipe needs manual declaration)
allergen_declarations: jsonb
allergen_overrides: jsonb
allergen_customer_notes: text
```

---

## UI Components

### AllergenBadge

**Location:** `src/features/allergens/components/AllergenBadge.tsx`

Displays allergen with emoji icon and tooltip:
```tsx
<AllergenBadge type="peanut" size="sm" disableTooltip />
```

**Sizes:** `sm`, `md`, `lg`

### Two-Button Toggle Pattern

Standard UI for three-state allergen selection:
```tsx
<div className="flex items-center gap-1">
  {/* Contains Button */}
  <button
    className={contains
      ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
      : "bg-gray-800/30 text-gray-600"
    }
  >
    <Check className="w-3.5 h-3.5" />
  </button>

  {/* May Contain Button */}
  <button
    className={mayContain
      ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
      : "bg-gray-800/30 text-gray-600"
    }
  >
    <AlertTriangle className="w-3.5 h-3.5" />
  </button>
</div>
```

**Color Coding:**
- Rose (🔴) - Contains
- Amber (🟡) - May Contain
- Gray (⚫) - None

---

## Security Considerations

### Data Validation

1. **Allergen State Validation**
   - Only accept: "contains", "may_contain", "none"
   - Reject any other values

2. **SVG Upload Security** (Future)
   - Validate SVG file structure
   - Strip JavaScript and external references
   - Limit file size (max 50KB per icon)
   - Scan for embedded malicious code

3. **Access Control**
   - Only managers and admins can modify allergen data
   - Audit trail via NEXUS for all allergen changes
   - Customer portal is read-only

### Liability Protection

1. **Audit Trail**
   - All allergen data changes logged via NEXUS
   - Track who changed what and when
   - Immutable history for legal defense

2. **Version Control**
   - Recipe allergen declarations versioned with recipe
   - Historical allergen data preserved
   - Ability to prove what was displayed to customers

3. **Disclaimer Management**
   - Customizable legal disclaimers
   - "Always inform staff of allergies"
   - "Cross-contact may occur despite precautions"
   - Jurisdiction-specific compliance language

---

## Testing Checklist

### Core Functionality
- [ ] Three-state allergen system works (Contains/May Contain/None)
- [ ] Station allergen configuration saves to operations_settings
- [ ] Station allergens cascade to recipes assigned to that station
- [ ] AllergenBadge displays correctly at all sizes
- [ ] Responsive grid layout works on mobile/tablet/desktop
- [ ] localStorage persistence maintains expanded accordion state

### Data Integrity
- [ ] Allergen state changes propagate to all affected recipes
- [ ] Deleting a station clears its allergen configuration
- [ ] Renaming a station preserves allergen data
- [ ] Invalid allergen states are rejected

### UI/UX
- [ ] Two-button toggle provides clear visual feedback
- [ ] Stat pills show accurate counts
- [ ] Accordion sections expand/collapse smoothly
- [ ] Mobile layout is thumb-friendly
- [ ] Loading states display during async operations

### Edge Cases
- [ ] Zero kitchen stations (empty state)
- [ ] All allergens set to "none" (no warnings)
- [ ] All allergens set to "contains" (everything is a risk)
- [ ] Custom allergen names with special characters
- [ ] Very long station notes (textarea overflow)

---

## Performance Considerations

### LocalStorage Usage

Expanded accordion state stored in localStorage:
```typescript
const STORAGE_KEY = "cheflife-allergen-manager-expanded";
```

**Size:** ~100 bytes (negligible)

### Database Queries

Station allergen data stored in single JSONB column:
- Single read on page load
- Single write on save
- No N+1 query issues

### Future Optimization (Customer Portal)

When allergen portal goes public-facing:
- Cache allergen data in Redis
- CDN delivery for allergen icons
- Lazy load allergen details on demand
- Minimize payload size for QR code lookups

---

## Handoff Notes

### For Frontend Developers

1. **L5 Patterns Used**
   - Vitals Page accordion structure
   - Two-button toggle for three-state selection
   - Stat pills with AnimatedNumber (future)
   - Responsive grid layouts
   - localStorage persistence

2. **Key Dependencies**
   - AllergenBadge component
   - ALLERGENS constant (emoji + label mapping)
   - useOperationsStore (for station allergen data)
   - toast notifications (react-hot-toast)

3. **Future Work**
   - CustomIconsContent needs full implementation
   - Portal config accordion section (coming soon)
   - Customer-facing allergen portal

### For Backend Developers

1. **Database Schema**
   - `operations_settings.kitchen_station_allergens` (JSONB)
   - `master_ingredients.allergen_*` (27 standard + 3 custom)
   - Future: `recipes.allergen_declarations` (JSONB)

2. **API Endpoints Needed** (Future)
   - GET `/api/allergens/stations` - Fetch all station allergen configs
   - POST `/api/allergens/stations` - Update station allergen config
   - GET `/api/allergens/portal` - Public customer portal data
   - POST `/api/allergens/icons/upload` - Custom icon upload

3. **Supabase Storage** (Future)
   - Bucket: `allergen-icons`
   - Path: `[organization_id]/[allergen_type].svg`
   - Public access for customer portal
   - Size limit: 50KB per icon

### For Product/Business

1. **Compliance Value Prop**
   - Supports 4 major jurisdictions (US, Canada, UK, AU/NZ)
   - Protects against Natasha's Law violations
   - Audit trail for legal defense
   - White-label customization for brand consistency

2. **Competitive Differentiators**
   - Three-state allergen system (nuanced vs binary)
   - Environmental allergen tracking (station-level)
   - Multi-jurisdiction support (international chains)
   - Customer-facing portal (future)

3. **Pricing Potential**
   - Core allergen tracking: Free (safety is not optional)
   - White-label customization: Premium tier ($49/mo)
   - Multi-jurisdiction support: Enterprise tier ($199/mo)
   - Advanced features (risk scoring, supplier integration): Enterprise

---

## Conclusion

Allergen Manager is not a feature — it's a **life-safety system**.

One oversight, one mislabeled ingredient, one failure to communicate can:
- End a life
- End a business
- End a career

ChefLife treats allergen management with the gravity it deserves. This module protects:
- **Guests** from allergic reactions
- **Staff** from making dangerous mistakes
- **Owners** from lawsuits and criminal charges
- **The business** from closure

The immune system must be healthy. We don't compromise on this.

---

**Module Status:** ✅ Core Module (5th)
**Production Ready:** Yes (Phase 1 complete)
**Next Phase:** Customer Portal (Q2 2026)
**Documentation:** Living Document

---

*"If you don't protect your guests, you don't deserve to have them."*

— Steve Popp, Creator of ChefLife

---

**Document Version:** 1.0
**Last Update:** February 1, 2026
**Next Review:** April 1, 2026 (or when Phase 2 begins)
