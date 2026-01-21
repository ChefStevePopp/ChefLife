# ChefLife Anatomy
## A Living Restaurant System

**Document Created:** January 8, 2026  
**Last Updated:** January 11, 2026  
**Authors:** Steve Popp (Creator) & Claude (Architecture Partner)  
**Version:** 1.5 - L6 Mobile Invoice Example

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
**Location:** Recipe Manager  
**Function:** The purpose. The craft. Why we exist.

This is the soul of the restaurant:
- The dishes that define the brand
- The techniques passed down and refined
- The standards that ensure consistency
- The creativity that keeps guests coming back

The heart of the house is WHY the restaurant exists.  
Not to make money - to feed people, to create experiences, to share craft.

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

**Document Version:** 1.8  
**Status:** Living Document  
**Last Update:** January 21, 2026 - Food Relationships (Taxonomy/DNA)  
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
