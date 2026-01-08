# ChefLife Product Roadmap

> The comprehensive guide to ChefLife's architecture and feature development.

---

## Product Vision

ChefLife is a restaurant management platform that respects operators' time while giving them enterprise-grade tools. We prioritize:

- **Sensible defaults** over endless configuration
- **Progressive disclosure** over feature overwhelm
- **Independent modules** over monolithic dependencies
- **Day 1 functionality** over setup gatekeeping

---

## Section Roadmaps

Detailed roadmaps are maintained per section. See the `/docs/roadmaps/` folder:

| Section | Roadmap | Key Features |
|---------|---------|--------------|
| **Organization** | [ROADMAP-Organization.md](roadmaps/ROADMAP-Organization.md) | Company Settings, Operations, Modules, Integrations |
| **Kitchen** | [ROADMAP-Kitchen.md](roadmaps/ROADMAP-Kitchen.md) | Recipe Manager, HACCP, Task Manager, Checks & Specs |
| **Team** | [ROADMAP-Team.md](roadmaps/ROADMAP-Team.md) | Team Performance, Communications, App Access, Roster |
| **Data** | [ROADMAP-Data.md](roadmaps/ROADMAP-Data.md) | Ingredients, Vendor Invoices, Inventory |
| **Communications** | [ROADMAP-Communications.md](roadmaps/ROADMAP-Communications.md) | Templates, Merge Fields, Triggers |

---

## System Architecture

### The Admin Lifecycle

The Organization section follows a natural progression:

```
ORGANIZATION
│
├── 1. Company Settings      "Who you are"
│   └── Name, industry, location, timezone, branding
│
├── 2. Operations            "Your language"
│   └── Measurements, storage, vendors, food categories
│
├── 3. Modules               "What you need"
│   └── Enable/configure feature packs
│
├── 4. Integrations          "Who you connect with"
│   └── 7shifts, Square, external services
│
└── 5. Activity Log          "What's happening"
    └── NEXUS audit trail
```

This is a **journey, not a checklist**. Users can skip ahead and return.

---

### Module Hierarchy

##### Core Modules (Always Available)

| Module | Purpose | Status |
|--------|---------|--------|
| **Recipe Manager** | The kitchen brain — recipes, ingredients, costing | ✅ Active |
| **Print Manager** | Output configuration — printers, labels, documents | 🔜 Planned |

Core modules can't be disabled. They're foundational.

##### Optional Modules (Enable When Ready)

| Module | Purpose | Status |
|--------|---------|--------|
| **Team Performance** | Points, tiers, coaching, attendance | ✅ Active |
| **Communications** | Email templates, broadcasts, notifications | ✅ Active |
| **HACCP** | Food safety tracking, temperature logs | ✅ Active |
| **Reports & Insights** | Cross-module analytics, trends, BI | 🔜 Planned |
| **Scheduling** | Shift management (currently via 7shifts) | 🔄 Integration |

Each module works independently. No module requires another module.

---

## Quarterly Overview

### Q1 2026
- [ ] Organization: Smart Tax ID validation (CA/US formats)
- [ ] Kitchen: Recipe versioning, HACCP completion
- [ ] Team: Weekly report automation, Communications triggers
- [ ] Data: Sysco/US Foods invoice support

### Q2 2026
- [ ] Organization: Square POS, QuickBooks integrations
- [ ] Kitchen: Task Manager build, Checks & Specs
- [ ] Team: Native scheduling, Policies module
- [ ] Data: Waste tracking, Ordering integration

### Q3 2026
- [ ] Organization: International address support (UK/EU)
- [ ] Kitchen: KDS, Production planning
- [ ] Team: Employee self-service, Enhanced app access
- [ ] Data: Advanced analytics, Perpetual inventory

---

## Regional Support

### Phase 1: Canada/US (Current)

| Region | Tax ID | Address Format | Currency |
|--------|--------|----------------|----------|
| 🇨🇦 Canada | Business Number (123456789 RT0001) | Province, Postal Code | CAD |
| 🇺🇸 USA | EIN (12-3456789) | State, ZIP Code | USD |

### Phase 2: UK/EU (Future)

| Region | Tax ID | Address Format | Currency |
|--------|--------|----------------|----------|
| 🇬🇧 UK | VAT (GB123456789) | Postcode only | GBP |
| 🇪🇺 EU | Various | Country-specific | EUR |

*See [ROADMAP-Organization.md](roadmaps/ROADMAP-Organization.md) for full international support details.*

---

## Technical Standards

### L5 Design System

All features follow the 6-phase L5 build process:

1. **Foundation** — Routes, structure, loading states
2. **Card Design** — Visual rhythm, status pills
3. **Search & Filter** — Find things fast
4. **Pagination** — Handle scale
5. **Core Feature** — Main functionality
6. **Polish** — Keyboard shortcuts, animations, diagnostics

Reference: `docs/L5-BUILD-STRATEGY.md`

### File Organization

```
src/features/admin/components/sections/
├── Operations/                    # Admin lifecycle step 2
│   ├── Operations.tsx             # Tabbed orchestrator
│   └── components/
├── Communications/                # Optional module
│   ├── Communications.tsx         # Tabbed orchestrator
│   └── components/
└── [Module]/
    ├── [Module].tsx               # ~300 lines, orchestration only
    └── components/
```

### Tabbed Interface Pattern

Standard for modules with multiple concerns:

```tsx
// URL-synced tabs
/admin/operations              → Variables tab (default)
/admin/operations?tab=relationships → Food Relationships tab
```

---

## Success Metrics

### User Experience
- Setup completion in < 10 minutes
- Zero required configuration beyond name/timezone
- Any feature usable within 30 seconds of enabling

### Technical Quality
- All features at L5 polish level
- < 500ms page load times
- Mobile-responsive throughout
- Keyboard accessible

### Business Impact
- Operator time saved per week
- Reduction in food cost variance
- Team communication engagement
- Compliance documentation completeness

---

## References

- `ONBOARDING-PHILOSOPHY.md` — First-run UX principles
- `L5-BUILD-STRATEGY.md` — Design system and build process
- `UTILS.md` — Utility function reference
- `roadmaps/` — Section-specific roadmaps

---

*Last updated: January 8, 2026*
*Roadmap structure reorganized: January 8, 2026*
