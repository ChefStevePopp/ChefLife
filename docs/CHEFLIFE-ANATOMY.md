# ChefLife Anatomy
## A Living Restaurant System

**Document Created:** January 8, 2026
**Last Updated:** February 6, 2026
**Authors:** Steve Popp (Creator) & Claude (Architecture Partner)
**Version:** 2.2 - Supersession Pattern + Recipe Versioning

---

## The Insight

ChefLife is not a collection of features. It's not a restaurant management "platform."

**ChefLife is a living system.** An organism. A body.

Every restaurant is alive - it breathes, it moves, it grows, it can get sick, it can heal. ChefLife is the nervous system, the circulatory system, the voice, the skin, and the heart that keeps that body healthy.

This document captures the anatomy of that system.

---

## The Body

```
                              ┌─────────────────┐
                              │  ORGANIZATION   │
                              │                 │
                              │      BRAIN      │
                              │                 │
                              │  Identity       │
                              │  Memory         │
                              │  Decisions      │
                              └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │     COMMS       │
                              │                 │
                              │     VOICE       │
                              │                 │
                              │  Speaks to      │
                              │  the team       │
                              └────────┬────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
    ┌─────────┐                 ┌─────────────┐                ┌──────────┐
    │  TEAMS  │                 │   RECIPES   │                │   DATA   │
    │         │                 │             │                │   MGMT   │
    │  SKIN   │                 │  HEART OF   │                │          │
    │         │◄───────────────►│  THE HOUSE  │◄──────────────►│  HEART   │
    │         │                 │             │                │          │
    │ Touch   │                 │  Purpose    │                │  Pumps   │
    │ point   │                 │  & Craft    │                │  value   │
    │ with    │                 │             │                │  through │
    │ world   │                 │             │                │  system  │
    └────┬────┘                 └──────┬──────┘                └────┬─────┘
         │                             │                             │
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │     NEXUS       │
                              │                 │
                              │   CIRCULATORY   │
                              │     SYSTEM      │
                              │                 │
                              │  Moves events   │
                              │  & data to      │
                              │  where needed   │
                              └─────────────────┘
                                       │
                              ┌────────┴────────┐
                              │   OPERATIONS    │
                              │                 │
                              │    SKELETON     │
                              │                 │
                              │  Structure      │
                              │  Configuration  │
                              │  The bones      │
                              └─────────────────┘
```

---

## The Organs

### 🧠 ORGANIZATION — The Brain
**Location:** Organization Settings  
**Function:** Identity, memory, and decisions

The brain holds everything the restaurant knows about itself:
- Who are we? (Company profile, branding, values)
- Where are we? (Locations, timezone, contact)
- What do we believe? (Policies, procedures, culture)
- What have we learned? (Health inspections, certifications, history)

Without the brain, there's no identity. No decisions. No direction.

---

### 🗣️ COMMUNICATIONS — The Voice
**Location:** Communications Module  
**Function:** How the body speaks to its cells

The voice carries messages throughout the organization:
- Weekly performance digests
- Coaching letters and recognition
- Policy updates and announcements
- Onboarding and training communications

A silent voice means confused cells. Bad coordination. Missed signals.

---

### 👥 TEAMS — The Skin
**Location:** Team Management, Schedule Manager, Performance  
**Function:** The boundary between inside and outside

The skin is where the restaurant touches the world:
- The people who greet guests
- The hands that prepare food
- The faces that represent the brand
- The boundary that protects the interior

Healthy skin means good service, happy guests, protected operations.  
Damaged skin means vulnerability, poor experience, exposure.

The skin also senses - performance tracking, attendance, feedback loops.

---

### ❤️ RECIPES — Heart of the House
**Location:** Recipe Manager (`/admin/recipes`, `/admin/recipes/:id`)  
**Function:** The purpose. The craft. Why we exist.

This is the soul of the restaurant:
- The dishes that define the brand
- The techniques passed down and refined
- The standards that ensure consistency
- The creativity that keeps guests coming back

The heart of the house is WHY the restaurant exists.  
Not to make money - to feed people, to create experiences, to share craft.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RECIPE MODULE STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RecipeDetailPage (11-Tab Editor)                                          │
│  ═══════════════════════════════                                           │
│  ├── Recipe Info    → Name, type, category, ingredients, costing          │
│  ├── Instructions   → Steps, stages, timing                                │
│  ├── Production     → Prep/cook/rest times, yield, temps                  │
│  ├── Labels         → Label requirements, printer config                   │
│  ├── Storage        → Storage areas, shelf life, temps                     │
│  ├── Stations       → Kitchen stations, equipment                          │
│  ├── Quality        → Visual/texture/taste/aroma standards                │
│  ├── Allergens      → Allergen tracking, cross-contact                     │
│  ├── Media          → Photos, videos, plating references                   │
│  ├── Training       → Skill levels, certifications, safety                │
│  └── Versions       → Version history, MAJOR.MINOR.PATCH, comm tiers      │
│                                                                             │
│  KEY FEATURES                                                              │
│  ════════════                                                              │
│  • Tab-level change tracking (amber indicators show unsaved sections)     │
│  • Dynamic Recipe Type from Food Relationships taxonomy                   │
│  • Floating action bar shows exactly which tabs have changes              │
│  • Responsive layout via .admin-container                                 │
│  • MAJOR.MINOR.PATCH versioning with communication tiers                  │
│  • Retire & Reissue via Supersession Pattern (no history deletion)        │
│                                                                             │
│  RECIPE TYPES (from Food Relationships)                                    │
│  ══════════════════════════════════════                                    │
│  Major Groups with is_recipe_type = true become tabs in Recipe Manager:   │
│  • Prepared Items (mis en place, sauces, rubs)                            │
│  • Final Goods (menu items, retail)                                       │
│  • Custom types as configured                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🛡️ ALLERGEN MANAGER — The Immune System
**Location:** Allergen Manager (`/admin/allergens`)
**Function:** Protection. Compliance. Trust.

The immune system protects guests and the business:
- **Environmental Tracking** — Allergens present at kitchen stations (flour dust, nut contamination)
- **Ingredient-Level** — Three-state system (Contains | May Contain | None) for each ingredient
- **Recipe Cascading** — Station allergens automatically flow to recipes assigned to that station
- **Customer Disclosure** — Chain: Ingredients → Recipes → Menu Items → Customer Portal
- **Regulatory Compliance** — Supports Natasha's Law (UK), Health Canada, FDA Big 9 (US), FSANZ (AU/NZ)
- **White-Label Customization** — Upload custom allergen icons to match your brand identity

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ALLERGEN MANAGER STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ALLERGEN DATA FLOW                                                         │
│  ═══════════════════                                                        │
│  Layer 0: Master Ingredients                                                │
│  ├── Allergen presence (Contains, May Contain, None)                        │
│  ├── Supplier warnings (cross-contamination risk)                           │
│  └── Custom allergen fields (3 slots for jurisdiction-specific needs)       │
│                                                                             │
│  Layer 1: Kitchen Stations (Environmental)                                  │
│  ├── Station allergen configuration (flour aerosolization, nut dust, etc.)  │
│  ├── Cross-contact risk areas                                               │
│  └── Automatically cascades to recipes assigned to that station             │
│                                                                             │
│  Layer 2: Recipes                                                           │
│  ├── Inherits ingredient allergens                                          │
│  ├── Inherits station environmental allergens                               │
│  └── Can override/add manual declarations                                   │
│                                                                             │
│  Layer 3: Customer Portal (Future)                                          │
│  ├── Public-facing allergen information                                     │
│  ├── QR codes for table tents                                               │
│  ├── Embeddable widget for website                                          │
│  └── White-label custom allergen icons                                      │
│                                                                             │
│  WHITE-LABEL CUSTOMIZATION (Planned)                                        │
│  ═══════════════════════════════                                            │
│  • Icon Pack Selection (Modern, Classic, Minimal, Medical)                  │
│  • Per-Allergen Custom SVG Upload                                           │
│  • Fallback to system defaults if no custom icon provided                   │
│  • Preview system before applying changes                                   │
│  • Multi-jurisdiction support (swap icon sets by region)                    │
│                                                                             │
│  COMPLIANCE SUPPORT                                                         │
│  ══════════════════                                                         │
│  • Natasha's Law (UK) — Full ingredient/allergen disclosure                 │
│  • Health Canada — Enhanced labeling requirements                           │
│  • FDA Big 9 (US) — Major food allergen labeling                            │
│  • FSANZ (AU/NZ) — Food Standards Australia New Zealand                     │
│  • Three-state system for nuanced risk communication                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why Allergen Manager is Core:**

This isn't optional. One allergic reaction can:
- Hospitalize a guest
- Destroy your reputation
- Close your doors permanently
- Result in criminal charges (Natasha's Law precedent)

The immune system MUST be healthy. ChefLife treats allergen management with the same importance as COGS tracking — it's mission-critical to survival.

---

### 💰 DATA MANAGEMENT — The Heart (COGS Engine)
**Location:** Master Ingredients, Vendor Invoices, Inventory  
**Function:** Pumps VALUE through the entire system

This is the financial heart - the COGS Engine:

```
    BUY (Purchases)
         │
         ▼
    MAKE (Production)
         │
         ▼
    SELL (Revenue)
         │
         ▼
    COGS = Cost ÷ Sales
```

Every ingredient has a cost.  
Every recipe consumes ingredients.  
Every sale generates revenue.  
The heart pumps value from purchase to plate to profit.

**When the heart is weak, the restaurant dies.**  
Bad COGS data → bad pricing → bad margins → no payroll → closed doors.

**When the heart is strong, everything thrives.**  
$96,000 saved in one year at Memphis Fire BBQ. That's a strong heart.

---

### 🔄 NEXUS — The Circulatory System
**Location:** Activity Log, Event System  
**Function:** Moves events and data to where they're needed

NEXUS is the blood flow:
- Every action logged
- Every change tracked
- Every event routed to the right place
- Every system connected

When circulation stops, parts start dying:
- No accountability
- No visibility
- No audit trail
- Isolated systems that can't talk

NEXUS keeps everything flowing, everything connected, everything alive.

---

### 🦴 OPERATIONS — The Skeleton
**Location:** Operations Manager  
**Function:** The structure everything hangs on

The skeleton provides:
- Measurements and units
- Storage locations and containers
- Kitchen stations and departments
- Revenue channels and vendors
- Labels and printing

Without bones, the body is just a pile of organs.  
Operations gives ChefLife its STRUCTURE - the configuration that makes everything else possible.

---

### 🌳 FOOD RELATIONSHIPS — The Taxonomy (DNA)
**Location:** Admin → Organization → Operations → Food Relationships Tab  
**Function:** The genetic code that classifies everything

Food Relationships is the **taxonomy** — the classification system that tells ChefLife what everything IS:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FOOD RELATIONSHIPS HIERARCHY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MAJOR GROUPS (Top-level buckets)                                          │
│  ═══════════════════════════════                                           │
│  ├── 🍖 FOOD              → Raw ingredients you cook                       │
│  ├── 🍺 ALCOHOL           → Beverages for bar                              │
│  ├── 🧑‍🍳 MIS EN PLACE      → Prepared items (sauces, rubs, stocks)         │
│  ├── 📦 FINAL GOODS       → Ready-to-sell items (retail, desserts)        │
│  └── 📋 RECEIVING         → Operational supplies (paper, chemicals)        │
│                                                                             │
│  CATEGORIES (Subdivisions)                                                 │
│  ═════════════════════════                                                 │
│  FOOD → Proteins, Produce, Dairy, Dry Goods, Frozen, Bakery                │
│  ALCOHOL → Beer, Wine, Spirits, Mixers                                     │
│  MIS EN PLACE → Sauces, Rubs, Marinades, Stocks                            │
│                                                                             │
│  SUB-CATEGORIES (Finest detail)                                            │
│  ══════════════════════════════                                            │
│  Proteins → Beef, Pork, Chicken, Seafood, Game                             │
│  Produce → Vegetables, Fruits, Herbs, Lettuces                             │
│                                                                             │
│  WHY IT MATTERS                                                            │
│  ═══════════════                                                           │
│  • Recipe Manager tabs come from Major Groups (is_recipe_type flag)        │
│  • Food cost reports break down by Sub-Category                            │
│  • Inventory counts filter by Category                                     │
│  • Vendor analysis groups by taxonomy                                      │
│  • Every ingredient references this hierarchy                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**System Groups (🔒):** Some groups are protected — they can be archived but not deleted because other parts of ChefLife depend on them.

**Recipe Type Groups:** Major Groups marked as `is_recipe_type` drive the Recipe Manager tabs dynamically. Change the taxonomy, change the tabs.

Without taxonomy, there's no organization. No reports. No filters. No meaning.  
Food Relationships is the DNA that gives everything its identity.

---

## The Flows

### The Value Flow (COGS Engine)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE VALUE FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 0: BUY                                                               │
│  ══════════════                                                             │
│  Master Ingredients (things we purchase)                                    │
│  ├── Pork Shoulder.........$2.50/lb                                        │
│  ├── Bourbon...............$28.00/bottle                                   │
│  ├── Romaine...............$24.00/case                                     │
│  └── T-shirts..............$8.00/each                                      │
│                    │                                                        │
│                    ▼                                                        │
│  LAYER 1: MAKE                                                              │
│  ══════════════                                                             │
│  Prepared Recipes (things we transform)                                     │
│  ├── Pulled Pork..........consumes Pork Shoulder, Rub, Wood                │
│  ├── Coleslaw.............consumes Cabbage, Mayo, Vinegar                  │
│  ├── Simple Syrup.........consumes Sugar, Water                            │
│  └── House BBQ Sauce......consumes 12 ingredients                          │
│                    │                                                        │
│                    ▼                                                        │
│  LAYER 2: SELL                                                              │
│  ══════════════                                                             │
│  Final Recipes (things we sell) — organized by Revenue Channel             │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  DINE-IN    │ │   BAR       │ │  CATERING   │ │   RETAIL    │          │
│  │             │ │             │ │             │ │             │          │
│  │ Brisket     │ │ Old         │ │ BBQ Box     │ │ T-Shirt     │          │
│  │ Platter     │ │ Fashioned   │ │ Lunch       │ │             │          │
│  │             │ │             │ │             │ │ Bottle of   │          │
│  │ Pulled Pork │ │ Margarita   │ │ Corporate   │ │ House Sauce │          │
│  │ Sandwich    │ │             │ │ Tray        │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                    │                                                        │
│                    ▼                                                        │
│  THE NUMBER                                                                 │
│  ══════════════                                                             │
│                                                                             │
│         COGS = Total Cost of Goods Sold ÷ Total Revenue                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Channel    │   COGS    │  Revenue   │  COGS %  │  Target  │ Status │   │
│  ├─────────────┼───────────┼────────────┼──────────┼──────────┼────────┤   │
│  │  Dine-In    │  $28,400  │  $92,000   │  30.9%   │   30%    │   ⚠️   │   │
│  │  Take-Out   │   $8,200  │  $31,000   │  26.5%   │   28%    │   ✅   │   │
│  │  Catering   │  $12,100  │  $45,000   │  26.9%   │   28%    │   ✅   │   │
│  │  Bar        │   $4,800  │  $22,000   │  21.8%   │   22%    │   ✅   │   │
│  │  Retail     │   $2,400  │   $8,000   │  30.0%   │   35%    │   ✅   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### The Quantity Flow (Par System)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE QUANTITY FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MASTER INGREDIENTS                                                         │
│  ══════════════════                                                         │
│  Each ingredient has:                                                       │
│  ├── on_hand_method: 'counted' | 'par'                                     │
│  ├── par_level: Target quantity to keep                                    │
│  └── current_on_hand: What we have (or think we have)                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Item              │ Method  │  Par  │ On Hand │  Need  │  Action   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Brisket           │ Counted │  80lb │   25lb  │  55lb  │  ORDER    │   │
│  │  Pork Shoulder     │ Counted │  60lb │   45lb  │  15lb  │  ORDER    │   │
│  │  Fryer Oil         │ Par     │  4jug │   1jug  │  3jug  │  ORDER    │   │
│  │  Romaine           │ Par     │  6cas │   4cas  │  2cas  │  ORDER    │   │
│  │  Napkins           │ Par     │  2cas │   2cas  │   0    │    ✓      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                    │                                                        │
│                    ▼                                                        │
│                                                                             │
│  FILL LIST (Raw Ingredients)                                               │
│  ═══════════════════════════                                               │
│  Par - On Hand = ORDER QUANTITY                                            │
│  Grouped by Vendor → ORDER GUIDE                                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GFS ORDER                           │  FLANAGAN ORDER              │   │
│  │  ─────────────                       │  ───────────────             │   │
│  │  Fryer Oil (3 jug).......$45.00     │  Brisket (55 lb)....$247.50 │   │
│  │  Napkins (0)..............$0.00     │  Pork (15 lb)........$37.50 │   │
│  │  ─────────────────────────────       │  ─────────────────────────── │   │
│  │  TOTAL: $45.00                       │  TOTAL: $285.00              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                                             │
│  PREPARED ITEMS                                                            │
│  ═══════════════                                                           │
│  Same logic, different action:                                             │
│  Par - On Hand = PREP QUANTITY                                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Prep Item         │ Method  │  Par  │ On Hand │  Need  │  Action   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Pulled Pork       │ Par     │  15lb │   5lb   │  10lb  │  PREP     │   │
│  │  Coleslaw          │ Par     │  8qt  │   3qt   │  5qt   │  PREP     │   │
│  │  House Rub         │ Counted │  2gal │   1gal  │  1gal  │  PREP     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                    │                                                        │
│                    ▼                                                        │
│                                                                             │
│  PREP LIST                                                                  │
│  ═════════                                                                  │
│  Need = What to make                                                       │
│  Which CONSUMES raw ingredients                                            │
│  Which AFFECTS the Fill List                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### The Information Flow (NEXUS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE INFORMATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Every action in ChefLife generates an event:                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  TEAMS ───────► "Jane clocked in at 2:03pm"                        │   │
│  │                        │                                            │   │
│  │  RECIPES ─────► "Pulled Pork recipe updated by Chef Steve"         │   │
│  │                        │                                            │   │
│  │  DATA ────────► "GFS invoice imported: 47 items, $1,234.56"        │   │
│  │                        │                                            │   │
│  │  COMMS ───────► "Weekly digest sent to 12 team members"            │   │
│  │                        │                                            │   │
│  │                        ▼                                            │   │
│  │                   ┌─────────┐                                       │   │
│  │                   │  NEXUS  │                                       │   │
│  │                   │         │                                       │   │
│  │                   │  Logs   │                                       │   │
│  │                   │  Routes │                                       │   │
│  │                   │  Alerts │                                       │   │
│  │                   └────┬────┘                                       │   │
│  │                        │                                            │   │
│  │                        ▼                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                    ACTIVITY LOG                              │  │   │
│  │  │                                                              │  │   │
│  │  │  2:03pm  Jane Smith clocked in (3 min late)     [TEAMS]     │  │   │
│  │  │  2:15pm  GFS Invoice imported                   [DATA]      │  │   │
│  │  │  2:15pm  ⚠️ Brisket price increased 8.5%        [DATA]      │  │   │
│  │  │  2:30pm  Pulled Pork recipe v1.3 approved       [RECIPES]   │  │   │
│  │  │  6:00pm  Weekly digest sent (12 recipients)     [COMMS]     │  │   │
│  │  │                                                              │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Health Indicators

Like any body, ChefLife can show signs of health or illness:

### Healthy Signs ✅
- COGS within target ranges
- Team attendance above 95%
- Recipes up-to-date and approved
- Invoices processed within 24 hours
- Communications sent on schedule
- Activity log showing regular engagement

### Warning Signs ⚠️
- COGS creeping above targets
- Attendance dropping
- Recipes stuck in draft status
- Invoice backlog growing
- Communications bouncing/failing
- Activity gaps (silence in the system)

### Critical Signs 🚨
- COGS out of control (5%+ over target)
- High turnover / attendance crisis
- No recipe standards (everything "in someone's head")
- No price tracking (flying blind)
- Team not receiving communications
- No activity logged (system abandoned)

---

### 📋 HR & POLICIES — The Compliance Shield
**Location:** HR Settings, Policies Manager, Policy Upload Form  
**Function:** Protects the body from regulatory harm. Ensures the team knows the rules.

Every restaurant operates under layers of regulation — food safety, workplace conduct, employment law, accessibility. The Compliance Shield ensures:
- Every policy is documented, versioned, and tracked
- Every team member reads what they need to read
- Every acknowledgment is a legal receipt
- Every update flows to the right people at the right urgency

**Without the shield:** One missed WHMIS update, one unsigned harassment policy, one expired food handler certification — and the body is exposed. Fines. Lawsuits. Shutdowns.

**With the shield:** The restaurant can prove — to inspectors, to lawyers, to insurance companies — that the right people read the right document at the right time.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HR & POLICIES — THE COMPLIANCE SHIELD                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  POLICY LIFECYCLE                                                           │
│  ════════════════                                                           │
│  Draft → Published → Acknowledged → Recertified → Archived                 │
│                                                                             │
│  VERSIONING — COMMUNICATION HIERARCHY                                       │
│  ════════════════════════════════════                                       │
│  Same MAJOR.MINOR.PATCH pattern used for both Policies and Recipes.        │
│                                                                             │
│  Patch  (1.0.0 → 1.0.1)  "Note on the board"                              │
│  ─────────────────────────────────────────────                              │
│  Typo fix, formatting correction. Nobody re-reads.                         │
│  Same row updated. No notification. Trust management.                      │
│                                                                             │
│  Minor  (1.0.x → 1.1.0)  "Pre-shift mention"                              │
│  ─────────────────────────────────────────────                              │
│  New section, updated info. Worth a read.                                  │
│  NEXUS flags it for the team. Optional review broadcast.                   │
│                                                                             │
│  Major  (1.x.x → 2.0.0)  "All-hands meeting"                              │
│  ─────────────────────────────────────────────                              │
│  New regulations, changed procedures. Everyone re-reads, everyone signs.   │
│  Archives old version. Creates new draft. Re-acknowledgment required.      │
│                                                                             │
│                                                                             │
│  ACKNOWLEDGMENT FLOW (Phase 3)                                              │
│  ═════════════════════════════                                              │
│  Admin publishes policy                                                     │
│       │                                                                     │
│       ▼                                                                     │
│  NEXUS routes `policy_ack_required` to applicable team members             │
│       │                                                                     │
│       ▼                                                                     │
│  Team member opens policy in ChefLife (PDF viewer)                         │
│       │                                                                     │
│       ▼                                                                     │
│  Reads, scrolls, taps "I have read and understand"                         │
│       │                                                                     │
│       ▼                                                                     │
│  `policy_acknowledgments` row created — legal receipt:                     │
│  ├── Who (team_member_id)                                                   │
│  ├── What (policy_id + policy_version)                                     │
│  ├── When (acknowledged_at timestamp)                                      │
│  ├── Where (ip_address + user_agent)                                       │
│  └── Proof (optional digital signature)                                    │
│       │                                                                     │
│       ▼                                                                     │
│  NEXUS logs `policy_ack_completed`                                         │
│  Admin dashboard updates compliance counts in real time                    │
│                                                                             │
│                                                                             │
│  CATEGORY SYSTEM                                                            │
│  ═══════════════                                                            │
│  User-configurable categories (not hardcoded):                             │
│  Health & Safety │ Employment & HR │ Food Safety/HACCP │ Operations        │
│  Workplace Conduct │ Technology & Privacy │ Training │ General             │
│                                                                             │
│  Each category has: icon, color, cover image, sort order                   │
│  CategoryManager: L5/L6 CRUD with drag-reorder and image upload            │
│                                                                             │
│                                                                             │
│  APPLICABILITY (who must acknowledge)                                      │
│  ════════════════════════════════════                                       │
│  Three filters — empty means "everyone":                                   │
│  ├── Departments (Front of House, Kitchen, Bar, Management)                │
│  ├── Scheduled Roles (Line Cook, Server, Dishwasher, etc.)                 │
│  └── Kitchen Stations (Grill, Fry, Prep, etc.)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why the Shield is Core:**

Insurance companies ask: "Can you prove your team was trained?"  
Labour boards ask: "Can you prove they acknowledged the policy?"  
Health inspectors ask: "Can you prove the food handler cert is current?"  

The answer should always be: "Yes. Here's the timestamped receipt."

---

### 🏗️ The Type System — Built for 1,000 Organizations

ChefLife is architected for scale from day one. Not MVP. Not "we'll fix it later." The type system reflects a deliberate discipline: **one source of truth per domain, documented migration paths, and no duplicate definitions.**

This matters because when you sell to 1,000 restaurants, a type mismatch doesn't crash one app — it corrupts 1,000 databases.

**The Rule: Every domain gets one canonical types file.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TYPE SYSTEM ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CANONICAL SOURCE FILES (single source of truth)                           │
│  ═══════════════════════════════════════════════                            │
│  types/policies.ts      → Policy, PolicyAcknowledgment, versioning         │
│  types/modules.ts       → Module configs, base patterns, HR config         │
│  types/ingredients.ts   → MasterIngredient, Triangle Model types           │
│  types/recipes.ts       → Recipe, RecipeIngredient, production             │
│                                                                             │
│                                                                             │
│  THE PATTERN: DB → Types → Service → Hook → Component                      │
│  ════════════════════════════════════════════════════                       │
│                                                                             │
│  ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐        │
│  │   Postgres      │     │  types/*.ts       │     │  lib/*-service │        │
│  │   (snake_case)  │────►│  (snake_case)     │────►│  (typed CRUD)  │        │
│  │                 │     │  Single source    │     │                │        │
│  └────────────────┘     └──────────────────┘     └───────┬────────┘        │
│                                                           │                 │
│                                                           ▼                 │
│                          ┌────────────────┐     ┌────────────────┐          │
│                          │  components     │◄────│  hooks         │          │
│                          │  (consume type) │     │  (state mgmt)  │          │
│                          └────────────────┘     └────────────────┘          │
│                                                                             │
│                                                                             │
│  NAMING CONVENTION                                                          │
│  ════════════════                                                           │
│  Database columns:    snake_case  (effective_date, category_id)             │
│  TypeScript types:    snake_case  (matches DB — no mapping layer)          │
│  Component props:     camelCase   (React convention)                       │
│                                                                             │
│  Why snake_case in types? Because Supabase returns snake_case from         │
│  .select() queries. Mapping between cases is a bug factory. If the         │
│  type matches the wire format, there is zero serialization risk.           │
│                                                                             │
│                                                                             │
│  MIGRATION DISCIPLINE                                                       │
│  ═══════════════════                                                        │
│  When a domain migrates (e.g., JSONB → relational table):                  │
│                                                                             │
│  1. New canonical type created in domain file (e.g., Policy)               │
│  2. Old type marked @deprecated with migration path comment                │
│  3. Shared enums centralized in new file, re-exported from old file        │
│  4. Bridge hook maps old shape ↔ new shape during transition               │
│  5. Once all consumers migrate, bridge + old type removed                  │
│                                                                             │
│  Example: Policy migration (Session 71)                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  BEFORE (JSONB era)              AFTER (Relational era)             │   │
│  │  ────────────────────            ─────────────────────              │   │
│  │  PolicyTemplate (camelCase)  →   Policy (snake_case) ← canonical   │   │
│  │  in modules.ts                   in policies.ts                     │   │
│  │                                                                     │   │
│  │  RecertificationInterval     →   RecertificationInterval            │   │
│  │  in modules.ts                   in policies.ts ← canonical         │   │
│  │                                  re-exported from modules.ts        │   │
│  │                                                                     │   │
│  │  PolicyRow (duplicate)       →   export type PolicyRow = Policy     │   │
│  │  in usePolicies.ts               (alias, will be removed)           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                                             │
│  SHARED ENUMS RULE                                                          │
│  ════════════════                                                           │
│  If two modules share an enum (e.g., ReviewSchedule used by both           │
│  Policies and Recipes), it lives in the module that owns the DB table.     │
│  Other modules import from there.                                          │
│                                                                             │
│  ReviewSchedule          → owned by policies.ts (policies table)           │
│  RecertificationInterval → owned by policies.ts (policies table)           │
│  VersionBumpType         → owned by policies.ts (used by recipes too)      │
│                                                                             │
│                                                                             │
│  THE "NO WHAT-THE-HELL" TEST                                               │
│  ═══════════════════════════                                                │
│  A developer opening the codebase for the first time should be able to:    │
│  1. Find the canonical type for any domain in under 30 seconds             │
│  2. See @deprecated markers with migration paths on any legacy type        │
│  3. Understand WHY something was done, not just WHAT was done              │
│  4. Never encounter two definitions of the same thing without              │
│     a clear comment explaining which one is canonical                      │
│                                                                             │
│  If a future developer says "What the hell?" — we failed.                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this discipline matters:**

ChefLife is not built by a team of 50 engineers who can tap each other on the shoulder. It's built in conversation sessions — asynchronous, context-switching, sometimes weeks apart. The type system is the institutional memory that survives between sessions. If it's wrong, every session starts by untangling the last one's mess. If it's right, every session builds on solid ground.

---

### 🔗 The Supersession Pattern — Nothing Is Ever Silently Erased

Across every module, ChefLife follows one architectural rule: **records are never deleted, only superseded.**

When something is replaced — an invoice, an allergen declaration, a recipe version, a policy — the old record survives. Grayed out, linked forward to its replacement, linked backward to its origin. Always visible in history. Always auditable.

**The Pattern Shape:**
```
superseded_at     TIMESTAMPTZ     -- NULL = active
superseded_by     UUID/FK         -- Forward link to replacement
supersedes_id     UUID/FK         -- Backward link to original
```

**Rules:**
- `superseded_at IS NULL` → active record
- `superseded_at IS NOT NULL` → replaced, grayed, never deleted
- Both directions always set — no orphaned links
- Constraint: one active per entity

**Implementations:**

| Module | What Gets Superseded | Why It Matters |
|--------|---------------------|----------------|
| Vendor Invoices | Price corrections, re-imports | Financial audit trail |
| Allergen Declarations | Pinned to recipe versions | Natasha's Promise — broken chains kill |
| Recipe Reissue | "Start fresh" without destroying history | Operational continuity |
| Policies | Regulatory updates | ESA compliance proof |

**UI Treatment:**
- Active: normal rendering
- Superseded: grayed (`text-gray-500`, `opacity-60`), "Superseded" badge
- Forward link: "Superseded by [Name]" — clickable
- Backward link: "Reissued from [Name] vX.Y.Z" — clickable
- Always visible in history/audit views, never deletable

**The Promise:** "No record in ChefLife is ever silently erased. If it existed, it still exists — superseded, linked, and preserved."

**The Build Rule:** "If someone needs to prove what was here before, can they? If the answer is no, the feature isn't done."

See: [PATTERN-Supersession.md](patterns/PATTERN-Supersession.md), [PROMISE-Nothing-Erased.md](promises/PROMISE-Nothing-Erased.md)

---

## The Philosophy

### People Over Profit
ChefLife exists to help restaurants thrive - not just survive. The COGS engine doesn't exist to squeeze every penny. It exists to ensure the restaurant can:
- Pay people fairly
- Maintain quality
- Stay in business
- Grow sustainably

### Smiles Over Savings
Efficiency matters, but not at the cost of humanity. Every feature should ask: "Does this help create better experiences for guests AND team members?"

### Compassion Over Commerce
Independent restaurants are communities. They're someone's dream. They're the third place between home and work. ChefLife is built to protect that dream, not exploit it.

### L6 — Respect the User's Time

Beyond L5 polish, there's L6: features that respect operators' time by preserving context.

> "L5 respects the user's craft. L6 respects their time."

When a user filters 522 ingredients down to 6 butter items, edits one, and needs to move to the next — do they re-filter? Re-search? Start over?

**L5 Answer:** They navigate back, filters are preserved, they click the next item.  
**L6 Answer:** They press → and stay in their butter context. No re-filtering. No lost work. The system remembers what they were doing.

L6 is the difference between software that makes you work and software that works *for you*.

**Another L6 Example: Mobile Invoice Entry**

Other apps promise "just snap a photo!" for receipt capture. Reality: contort your phone for a flat shot, wait for OCR, verify line-by-line, fix the errors anyway. 3+ minutes of frustration.

**L6 Answer:** Pick vendor → see their items → tap qty/price → done. 30 seconds. No photo gymnastics, no robot homework to audit. Your time matters more than a gimmick.

---

## The Vision

### Restaurants 2.0

The restaurant industry is broken:
- 60% fail in the first year
- Operators work 80-hour weeks
- Data is scattered across 12 systems
- Knowledge lives in people's heads
- Margins are razor-thin

**ChefLife is the operating system for Restaurants 2.0:**
- One system that thinks like a restaurant
- Data flows like blood through a body
- Knowledge is captured and shared
- Operators work smarter, not harder
- Margins are protected by the COGS engine

### The $96K Story

Memphis Fire BBQ saved $96,000 in one year using the ChefLife COGS engine. That's not a sales pitch. That's proof that when you can SEE where your money goes, you can control it.

Every independent restaurant deserves that visibility.

---

## The Triangle Model (Ingredient Architecture)

Every ingredient exists in THREE dimensions - how you buy it, how you count it, and how you use it:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE INGREDIENT TRIANGLE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           PURCHASE UNIT                                     │
│                          (How you BUY it)                                   │
│                               ▲                                             │
│                              /│\                                            │
│                             / │ \                                           │
│                            /  │  \                                          │
│                           /   │   \                                         │
│           $30.96         /    │    \        $30.96                          │
│           ───────       /     │     \       ───────                         │
│           5 LB         /      │      \      176.37 OZ                       │
│           = $6.19/LB  /       │       \     = $0.1755/OZ                    │
│                      /        │        \                                    │
│                     /         │         \                                   │
│                    ▼          │          ▼                                  │
│            INVENTORY UNIT     │      RECIPE UNIT                            │
│           (How you COUNT it)  │     (How you USE it)                        │
│                               │                                             │
│                               │                                             │
│  EXAMPLE: MOLASSES (1 x 5LB JUG @ $30.96)                                  │
│  ═══════════════════════════════════════════                               │
│                                                                             │
│  ┌─────────────────┬─────────────────┬─────────────────┐                   │
│  │  PURCHASE       │  INVENTORY      │  RECIPE         │                   │
│  ├─────────────────┼─────────────────┼─────────────────┤                   │
│  │  Unit: 5LB JUG  │  Unit: LB       │  Unit: OZ       │                   │
│  │  Price: $30.96  │  Units/Purch: 5 │  Units/Purch:   │                   │
│  │                 │  Cost: $6.19/LB │  176.37         │                   │
│  │                 │                 │  Cost: $0.1755  │                   │
│  │                 │  Par: 3 LB      │                 │                   │
│  │                 │  Reorder: 1 LB  │  Yield: 100%    │                   │
│  └─────────────────┴─────────────────┴─────────────────┘                   │
│                                                                             │
│  WHY THREE UNITS?                                                          │
│  ─────────────────                                                         │
│  • You BUY a 5LB jug (that's what the invoice says)                       │
│  • You COUNT by the pound ("we have about 3 LB left")                     │
│  • You USE by the ounce (recipe calls for 4 OZ molasses)                  │
│                                                                             │
│  Each perspective serves a different business function.                    │
│  ChefLife tracks all three and auto-converts between them.                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Cascade System (Automatic Cost Propagation)

When a price changes, EVERYTHING downstream updates automatically:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE PRICE CASCADE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VENDOR INVOICE UPLOADED                                                    │
│  ══════════════════════                                                     │
│  GFS Invoice: Brisket now $4.75/lb (was $4.50/lb)                          │
│                          │                                                  │
│                          ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRIGGER 1: Update Master Ingredient                                │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  master_ingredients.current_price = $4.75                           │   │
│  │  master_ingredients.cost_per_recipe_unit = $4.75 ÷ 16 = $0.297/OZ  │   │
│  │  master_ingredients.inventory_unit_cost = $4.75/LB                  │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRIGGER 2: Cascade to Recipe Ingredients                           │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  UPDATE recipe_ingredients                                          │   │
│  │  SET unit_cost = $0.297, total_cost = qty × $0.297                  │   │
│  │  WHERE ingredient_id = [brisket]                                    │   │
│  │                                                                     │   │
│  │  47 recipes updated automatically                                   │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRIGGER 3: Roll Up Recipe Costs [FUTURE]                           │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  recipes.total_cost = SUM(recipe_ingredients.total_cost)            │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRIGGER 4: Update Menu Item Margins [FUTURE]                       │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  menu_items.food_cost = recipes.total_cost                          │
│  │  menu_items.margin = (price - food_cost) ÷ price                    │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DASHBOARD ALERT                                                    │   │
│  │  ─────────────────                                                  │   │
│  │  ⚠️ "Brisket Sandwich margin dropped: 68% → 62%"                   │   │
│  │  ⚠️ "5 menu items now below target margin"                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  THE PHILOSOPHY                                                            │
│  ══════════════                                                            │
│  "When a price changes, EVERYTHING downstream updates automatically.      │
│   No spreadsheet refresh. No manual recalculation. Just truth."           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Inventory Tracking System

### Priority Levels
Not all ingredients are equal. ChefLife tracks priority for reporting:

| Priority | Use Case | Dashboard Visibility |
|----------|----------|---------------------|
| **Critical** | High-value proteins, signature items | Always visible, daily tracking |
| **High** | Key ingredients, frequent use | Weekly focus, prominent display |
| **Standard** | Normal ingredients | Standard tracking |
| **Low** | Stable dry goods, rare use | Minimal tracking |

### Inventory Schedules
Ingredients can participate in multiple count schedules:

| Schedule | Frequency | Typical Items |
|----------|-----------|---------------|
| **Daily** | Every day | Proteins, high-value items, perishables |
| **Weekly** | Once per week | Standard full inventory |
| **Monthly** | Once per month | Stable dry goods, paper products |
| **Spot Check** | Random audits | Variance investigation, theft prevention |

### The Count Sheet Query
```sql
-- Generate today's count sheet (daily items)
SELECT * FROM master_ingredients 
WHERE inventory_schedule @> ARRAY['daily']
ORDER BY storage_area, product;

-- Critical items for dashboard
SELECT * FROM master_ingredients 
WHERE priority_level = 'critical' 
AND show_on_dashboard = true;
```

---

## The Mobile Paradigm: People, Place, Profit

ChefLife has two distinct experiences:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DESKTOP vs MOBILE EXPERIENCE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DESKTOP ADMIN                         MOBILE COMMAND CENTER                │
│  ═════════════                         ═════════════════════                │
│                                                                             │
│  Complex data grids                    Glanceable widgets                   │
│  Deep navigation                       Swipe pages                          │
│  Mouse precision                       Thumb-friendly targets               │
│  Information dense                     Action focused                       │
│  Sidebar + tabs                        Launcher + icons                     │
│                                                                             │
│  Same data. Completely different experience.                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Three Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PEOPLE • PLACE • PROFIT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  This isn't random. It's restaurant philosophy:                            │
│                                                                             │
│  "If you don't have the people, you don't have a place for guests.         │
│   No guests, no profit. Take care of 1 and 2 — 3 follows if you're         │
│   not daft."                                                               │
│                                           — Steve Popp                      │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │     PEOPLE      │  │      PLACE      │  │     PROFIT      │             │
│  │                 │  │                 │  │                 │             │
│  │  Team schedule  │  │  Temp logs      │  │  Quick Invoice  │             │
│  │  Who's on       │  │  Task lists     │  │  Inventory      │             │
│  │  Messaging      │  │  Receiving      │  │  Revenue        │             │
│  │  Coaching       │  │  Checklists     │  │  Admin access   │             │
│  │                 │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│          ←─────────── SWIPE ───────────→                                   │
│                                                                             │
│                        ○  ●  ○                                             │
│                     (Newton's cradle)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Mobile Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MOBILE COMMAND CENTER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 2 temps overdue │ GFS arriving 2pm                         ←→   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         ▲ Alert Ticker (scrolling urgents)                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │         Evening, Chef Steve                                         │   │
│  │         LINE • 3hrs left on shift                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         ▲ Hero Context (shift-aware)                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ▼ Team Schedule                                       5 on │ 1 brk │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │  ○ Emily   ○ Marcus   ○ Aaron   +2                             │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         ▲ Widget Accordion (expandable)                    │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                  │
│  │   🌡️    │  │   📝    │  │   📦    │                                  │
│  │  Temps   │  │ Invoice  │  │ Receive  │  ← Glassmorphism Icons          │
│  └──────────┘  └──────────┘  └──────────┘                                  │
│                                                                             │
│                        ○  ●  ○                                             │
│                    ▲ Page Dots (Newton's cradle physics)                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │   🏠      📦      📖      ⏱️      ⚡                               │   │
│  │  Home    Inv    Recipe   Prod   Command                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         ▲ Bottom Nav (4 + Command)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Role-Based Visibility

If you can't use it, you don't see it. No greyed-out buttons taunting line cooks.

| Role | People | Place | Profit |
|------|--------|-------|--------|
| **Line Cook** | My Profile, Schedule | Temps, Tasks | — |
| **Shift Lead** | + Full Team | + Receive | Invoice, Counts |
| **Manager** | All | All | All + Admin |

---

## Technical Foundation

### Database Core
- **master_ingredients** — Layer 0: Things we buy
- **recipes** — Layer 1 & 2: Things we make and sell
- **inventory_counts** — Point-in-time quantity snapshots
- **operations_settings** — The skeleton configuration
- **organization settings** — The brain's memory

### Key Relationships
```
organizations
    └── master_ingredients (what we buy)
            └── recipe.ingredients (what recipes consume)
                    └── recipes[type='prepared'] (what we make)
                            └── recipes[type='final'] (what we sell)
                                    └── revenue_channels (how we sell it)
```

### Ingredient Types: Purchased vs Prep

```
┌─────────────────────────────────────────────────────────────────┐
│  PURCHASED INGREDIENTS              PREP INGREDIENTS            │
│  (From Vendor)                      (Made In-House)             │
├─────────────────────────────────────────────────────────────────┤
│  item_code: "1410441"               item_code: "Xk9mR2pQ"       │
│  ingredient_type: 'purchased'       ingredient_type: 'prep'     │
│  source_recipe_id: null             source_recipe_id: UUID      │
│                                                                 │
│  Cost: Vendor price                 Cost: Calculated from       │
│        (VIM import)                       sub-recipe            │
└─────────────────────────────────────────────────────────────────┘
```

**Friendly ID System:** Prep items use Base58-encoded UUIDs as item codes:
- UUID: `7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c` (36 chars)
- Friendly: `Xk9mR2pQ` (8 chars)
- Deterministic, reversible, URL-safe

### Triage Workflow: The Cleanup Queue

VIM import creates items that need attention. Triage surfaces them:

```
┌─────────────────────────────────────────────────────────────────┐
│  VIM IMPORT → TRIAGE → COMPLETE → MIL                          │
├─────────────────────────────────────────────────────────────────┤
│  SKIPPED (👻 Ghost)        - 0% complete, parked during import │
│  INCOMPLETE (⚠️ Alert)     - Partial %, needs required fields  │
├─────────────────────────────────────────────────────────────────┤
│  PURCHASED (🛒 Cart)       - From vendor (numeric item_code)   │
│  PREP (👨‍🍳 ChefHat)         - Made in kitchen (no vendor code)  │
└─────────────────────────────────────────────────────────────────┘
```

Location: VIM → Triage tab (cyan, between Import and History)

### The Par System (To Be Built)
```sql
-- Added to master_ingredients:
on_hand_method      -- 'counted' | 'par'
par_level           -- target quantity
current_on_hand     -- what we have
reorder_point       -- alert threshold

-- Added to recipes:
revenue_channel     -- links final recipes to revenue channels
```

---

## Conclusion

ChefLife is not software. It's not a platform. It's not a tool.

**ChefLife is a body.**

And like any body, it needs all its organs working together. The heart pumping value. The voice communicating clearly. The skin protecting and sensing. The blood flowing through every part.

When the body is healthy, the restaurant thrives.

That's the vision. That's the mission. That's ChefLife.

---

*"Keep communication consistent, keep commerce kind, and keep your culture cool and comfortable, my friends."*

— Steve Popp, Creator of ChefLife

---

**Document Version:** 2.2
**Status:** Living Document
**Last Update:** February 6, 2026 - Supersession Pattern + Recipe Versioning
**Next Update:** As the body grows

---

## Version History

| Version | Date | Changes |
|---------|------|--------|
| 1.0 | Jan 8, 2026 | Initial creation - The Revelation |
| 1.1 | Jan 9, 2026 | Added Triangle Model (Purchase/Inventory/Recipe units), Cascade System (automatic cost propagation), Inventory Tracking (priorities & schedules) |
| 1.2 | Jan 10, 2026 | Added L6 Philosophy - "Respect the User's Time" - filter-aware navigation that preserves context |
| 1.3 | Jan 10, 2026 | Added Triage Workflow, Ingredient Types (purchased/prep), Friendly ID system |
| 1.4 | Jan 10, 2026 | Triage Panel L5 Refactor - ExcelDataGrid standard, StatBar, custom render |
| 1.5 | Jan 11, 2026 | Added L6 Mobile Invoice Entry example - "fast entry beats photo gymnastics" |
| 1.6 | Jan 11, 2026 | **Mobile Paradigm** - People, Place, Profit architecture, MobileShell design, Newton's cradle dots |
| 1.7 | Jan 16, 2026 | **Nexus Dashboard** - MRI screen for vital signs, Premium Animation System (AnimatedNumber, MorphingText) |
| 1.8 | Jan 21, 2026 | **Food Relationships** - The Taxonomy/DNA organ. Major Groups → Categories → Sub-Categories hierarchy. L5 build with Guided Mode, character counters, empty state management. |
| 1.9 | Jan 22, 2026 | **Recipe Module Architecture** - 11-tab editor detail, tab-level change tracking, dynamic Recipe Type from taxonomy, admin-container responsive layout. |
| 2.0 | Feb 1, 2026 | **Allergen Manager Core Module** - 5th core module extracted from Recipe Settings. Three-state allergen system (Contains/May Contain/None), environmental tracking at stations, L5 Vitals Page accordion pattern, white-label icon customization (planned), multi-jurisdiction compliance (Natasha's Law, FDA, Health Canada, FSANZ). The Immune System organ. |
| 2.1 | Feb 5, 2026 | **HR & Policies (The Compliance Shield)** + **Type System Architecture**. Policy lifecycle (draft/published/archived), MAJOR.MINOR.PATCH versioning with restaurant communication hierarchy, acknowledgment flow design, configurable categories. Type system discipline documented: single source of truth per domain, snake_case convention, migration discipline, shared enum ownership rules, the "No What-The-Hell" test. Built for 1,000 organizations. |
| 2.2 | Feb 6, 2026 | **Supersession Pattern + Recipe Versioning**. Platform-wide Supersession Pattern documented (superseded_at/superseded_by/supersedes_id). MAJOR.MINOR.PATCH with communication tiers implemented in Recipe VersionHistory (Patch=silent, Minor=broadcast, Major=mandatory meeting). Retire & Reissue architecture for recipes. bumpType stored per version for NEXUS integration. Nothing-Erased promise: no record silently deleted, all superseded with bidirectional links. |
