# HANDOFF — Session 130 (Continuation of 129)
## Regionalization Strategy Discussion + Employment Records
**Date:** February 19, 2026
**Session:** 130 (short session — context exhaustion from reading core docs)
**Transcript:** `/mnt/transcripts/2026-02-19-23-01-22-employment-records-7shifts-roadmap.txt`

---

## What Happened This Session

Session 129's Employment Records design surfaced a critical architectural question:
we'd baked Ontario ESA assumptions into the Proof of Employment spec. Steve correctly
asked: **"We're offering this to North America, Europe/UK, and Australia/New Zealand —
do we need to regionalize?"**

Claude read both CHEFLIFE-ANATOMY.md and L5-BUILD-STRATEGY.md in full to assess
where regionalization belongs. Session ended at context limit before edits could
be made, but the full assessment is captured below.

---

## The Regionalization Question

### Steve's Question
> "What are your thoughts about updating CHEFLIFE-ANATOMY and/or L5-BUILD-STRATEGY
> to incorporate our scope to those regions, including Australia/New Zealand? These
> regions matter more in the decision making right? Like each of our Configs should
> be regionalized? Or at least configurable by users in those regions?"

### Target Regions
- **Canada** — Provincial variation (Ontario 44hr OT, others differ)
- **United States** — Federal FLSA (40hr OT) + state variation (California daily OT)
- **United Kingdom** — Working Time Regulations (48hr cap), Employment Rights Act 1996
- **European Union** — Member state variation, GDPR umbrella
- **Australia** — Fair Work Act, National Employment Standards
- **New Zealand** — Employment Relations Act, Holidays Act

---

## Claude's Assessment: What Needs Updating

### 1. CHEFLIFE-ANATOMY.md — YES, Needs a New Cross-Cutting Section

**Current state:** Already mentions multi-jurisdiction in Allergen Manager
(Natasha's Law UK, FDA US, Health Canada, FSANZ AU/NZ) but treats it as an
allergen-only concern. It's not. Jurisdiction affects FIVE organs:

| Organ | What Jurisdiction Affects |
|-------|--------------------------|
| 🧠 **Brain** (Organization) | Jurisdiction config, timezone, currency, date format |
| 🛡️ **Immune System** (Allergens) | Which allergens are regulated, labeling requirements |
| 📋 **Compliance Shield** (HR/Policies) | Employment law, overtime rules, record retention, letter templates |
| 💰 **Heart** (COGS/Data) | Currency, tax handling, measurement preferences (metric vs imperial) |
| 🗣️ **Voice** (Communications) | Template language, compliance disclaimers, privacy notices |

**Recommendation:** Add a new section — **"The DNA — Jurisdiction Awareness"** —
as a cross-cutting concern that flows through all organs. This is like how the
Supersession Pattern is documented as a cross-cutting pattern, not an organ.

**Proposed content for ANATOMY:**
```markdown
## The DNA — Jurisdiction Awareness

ChefLife serves restaurants across North America, Europe/UK, and Australia/New Zealand.
Every restaurant exists within a legal jurisdiction that affects how the body operates.

Jurisdiction is NOT a feature toggle. It's DNA — it's woven into every organ:

- **The Brain** knows where it lives (country, region, timezone, currency)
- **The Immune System** knows which allergens are legally mandated in its region
- **The Compliance Shield** knows which employment laws apply
- **The Heart** pumps value in the right currency with the right tax rules
- **The Voice** speaks in the right language with the right legal disclaimers

### The Principle: Universal Data, Regional Interpretation

The data model is jurisdiction-agnostic. Hours are hours. Allergens are allergens.
Prices are prices. What changes is how that data gets:
- **Interpreted** (44hr vs 40hr overtime threshold)
- **Formatted** (CAD vs USD vs GBP, DD/MM vs MM/DD)
- **Retained** (3 years Canada, 6 years UK, varies EU)
- **Disclosed** (Natasha's Law vs FDA Big 9 vs FSANZ)

### Organization Jurisdiction Config

Every organization declares its jurisdiction at setup:

| Field | Example | Affects |
|-------|---------|---------|
| country | CA, US, GB, AU, NZ | Currency, privacy framework, allergen standard |
| region | ON, CA-US, Scotland | Overtime threshold, provincial employment law |
| overtime_weekly_threshold | 44 (ON), 40 (US), 48 (UK) | Hours summary classification |
| overtime_daily_threshold | null (ON), 8 (CA-US) | Daily OT calculation |
| retention_years | 3 (CA), 3 (US), 6 (UK) | Data retention policies |
| currency | CAD, USD, GBP, EUR, AUD, NZD | All financial displays |
| date_format | YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY | All date displays |
| measurement_preference | imperial, metric | Default units |
| privacy_framework | PIPEDA, CCPA, GDPR, Privacy Act (AU) | Consent, data handling |
| allergen_standard | health_canada, fda_big9, natasha_law, fsanz | Which allergens required |
| employment_letter_template | ca_on, us_federal, uk_era1996, au_fwa | Proof of Employment format |
```

### 2. L5-BUILD-STRATEGY.md — SMALL Addition

**Current state:** All about UI patterns, phases, CSS. Has no mention of
region-aware rendering.

**Recommendation:** Add a small "Region-Aware Component Pattern" section in the
Phase 5 or Database Patterns area. Not a big section — just the principle:

```markdown
### Region-Aware Component Pattern

Components that display jurisdiction-sensitive data read from organization config:

```tsx
// Access jurisdiction from org settings
const { organization } = useOrganizationStore();
const jurisdiction = organization?.jurisdiction_config;

// Currency formatting
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat(jurisdiction?.locale || 'en-CA', {
    style: 'currency',
    currency: jurisdiction?.currency || 'CAD'
  }).format(amount);

// Date formatting
const formatDate = (date: string) =>
  new Intl.DateTimeFormat(jurisdiction?.locale || 'en-CA').format(new Date(date));

// Overtime threshold
const isOvertime = (weeklyHours: number) =>
  weeklyHours > (jurisdiction?.overtime_weekly_threshold || 44);
```

**The Rule:** Never hardcode jurisdiction-specific values. Always read from config.
Default to Canadian/Ontario only as a fallback, never as an assumption.
```

### 3. NEW DOCUMENT — REGIONALIZATION-STRATEGY.md

**This is the big one.** Neither ANATOMY nor L5 is the right place for the full
jurisdiction matrix. A dedicated strategy document should contain:

- Full jurisdiction comparison matrix (overtime, retention, privacy, allergens)
- Database schema for jurisdiction config
- Region-specific template variations
- Compliance checklist per region
- Onboarding flow for jurisdiction selection
- Testing strategy (how to verify region-specific behavior)

**Proposed location:** `docs/REGIONALIZATION-STRATEGY.md`

---

## What Varies By Region — The Matrix

### Employment / Labour Law

| Concern | Canada (ON) | USA (Federal) | USA (CA) | UK | EU (varies) | Australia | New Zealand |
|---------|-------------|---------------|----------|-----|-------------|-----------|-------------|
| OT weekly threshold | 44 hrs | 40 hrs | 40 hrs | 48 hrs (cap) | 35-48 hrs | 38 hrs | 40 hrs |
| OT daily threshold | None | None | 8 hrs | None | Varies | None | None |
| Record retention | 3 years | 3 years payroll, 2 years time | 4 years (CA) | 6 years | Varies + GDPR | 7 years | 7 years |
| Employment letter | No mandated format | No requirement most states | No requirement | Statutory right (ERA 1996) | Varies | Fair Work Statement | Must provide if asked |
| Minimum wage | Provincial | Federal + state | $16.00+ | National + age bands | Member state | National + age | National |

### Privacy Framework

| Region | Framework | Key Requirement |
|--------|-----------|-----------------|
| Canada | PIPEDA (federal) + provincial | Consent for collection, access rights |
| USA | Patchwork (CCPA, state laws) | Varies by state, opt-out models |
| UK | UK GDPR + DPA 2018 | Consent, right to erasure, data minimization |
| EU | GDPR | Strongest consent requirements, DPO needed |
| Australia | Privacy Act 1988 + APPs | Australian Privacy Principles |
| New Zealand | Privacy Act 2020 | 13 Information Privacy Principles |

### Allergen Standards

| Region | Standard | Required Allergens |
|--------|----------|-------------------|
| Canada | Health Canada Enhanced Labeling | Priority allergens (11+) |
| USA | FDA FASTER Act | Big 9 (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame) |
| UK | Natasha's Law + FSA 14 | 14 allergens with full ingredient disclosure |
| EU | Regulation 1169/2011 | 14 allergens (same as UK) |
| Australia/NZ | FSANZ Standard 1.2.3 | FSANZ allergens (similar to FDA + additions like lupin) |

### Currency & Formatting

| Region | Currency | Date Format | Measurement |
|--------|----------|-------------|-------------|
| Canada | CAD | YYYY-MM-DD (official) | Metric (but imperial in kitchens) |
| USA | USD | MM/DD/YYYY | Imperial |
| UK | GBP | DD/MM/YYYY | Metric |
| EU | EUR (mostly) | DD/MM/YYYY | Metric |
| Australia | AUD | DD/MM/YYYY | Metric |
| New Zealand | NZD | DD/MM/YYYY | Metric |

---

## Database Design for Jurisdiction

### Option A: Flat Config Fields on Organizations (Recommended for Now)

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  jurisdiction_country TEXT DEFAULT 'CA',
  jurisdiction_region TEXT DEFAULT 'ON',
  jurisdiction_currency TEXT DEFAULT 'CAD',
  jurisdiction_date_format TEXT DEFAULT 'YYYY-MM-DD',
  jurisdiction_locale TEXT DEFAULT 'en-CA',
  jurisdiction_overtime_weekly INTEGER DEFAULT 44,
  jurisdiction_overtime_daily INTEGER,  -- NULL = no daily OT
  jurisdiction_retention_years INTEGER DEFAULT 3,
  jurisdiction_measurement TEXT DEFAULT 'imperial' CHECK (jurisdiction_measurement IN ('imperial', 'metric')),
  jurisdiction_privacy_framework TEXT DEFAULT 'PIPEDA',
  jurisdiction_allergen_standard TEXT DEFAULT 'health_canada';
```

### Option B: JSONB Config (More Flexible, Harder to Query)

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  jurisdiction_config JSONB DEFAULT '{
    "country": "CA",
    "region": "ON",
    "currency": "CAD",
    "locale": "en-CA",
    "overtime_weekly_threshold": 44,
    "overtime_daily_threshold": null,
    "retention_years": 3,
    "measurement": "imperial",
    "privacy_framework": "PIPEDA",
    "allergen_standard": "health_canada"
  }'::jsonb;
```

### Recommendation: Start with Option A (flat columns)

- Easier to query, index, and validate
- RLS can reference directly
- Can always migrate to JSONB later if complexity demands it
- Flat fields are more explicit — "No What-The-Hell Test" passes easily

---

## Implementation Priority

**Don't build a jurisdiction engine right now.** Build it incrementally:

### Phase 1: Jurisdiction Config (1 session)
- Add jurisdiction columns to organizations table
- Add jurisdiction selector to Organization Settings (Country → Region dropdown)
- Auto-populate sensible defaults from country/region selection
- Store in org settings, expose via `useOrganizationStore`

### Phase 2: Currency & Formatting (woven into existing work)
- Replace hardcoded `$` with `Intl.NumberFormat` using jurisdiction currency
- Replace hardcoded date formats with `Intl.DateTimeFormat`
- This happens naturally as features are built/touched

### Phase 3: Employment Records Regionalization (with Employment Records feature)
- Overtime thresholds read from jurisdiction config (not hardcoded 44)
- Employment letter templates per jurisdiction
- Record retention awareness

### Phase 4: Allergen Standard Regionalization (with Custom Allergen Registry)
- Allergen standard determines which allergens are "required" vs "optional"
- Already partially done (ANATOMY lists Natasha's Law, FDA, FSANZ)
- Custom Allergen Registry Phase 1 is the right time to formalize this

### Phase 5: Privacy & Consent (with Employee Self-Service)
- Privacy framework determines consent language
- Right-to-erasure handling (GDPR/UK GDPR)
- Data retention automation (auto-flag records past retention period)

---

## Carry-Forward from Session 129

Everything from Session 129's handoff is still queued:

### Priority 1: Verify TeamSettings (30 min)
- Toggle pipeline, label alignment, configPath fix

### Priority 2: The Roster — 7shifts User Enrichment (1-2 sessions)
- `get_users` expansion, role/department assignments

### Priority 3: The Schedule — Sync Config (1-2 sessions)
- Frequency dropdown, stream tiering, CRON setup

### Priority 4: Employment Records (3 steps)
- Step 1: Historical hours import
- Step 2: TeamSettings Employment tab
- Step 3: Proof of Employment template
- **NOW:** With jurisdiction-aware overtime and template selection

### Priority 5: Custom Allergen Registry (5 phases)
- Phase 1: Registry table + Allergen Manager UI
- **NOW:** With jurisdiction-aware allergen standards

---

## Recommended Next Session Actions

1. **Create `REGIONALIZATION-STRATEGY.md`** — Expand the matrix from this handoff into a proper strategy document
2. **Update CHEFLIFE-ANATOMY.md** — Add "The DNA — Jurisdiction Awareness" cross-cutting section
3. **Update L5-BUILD-STRATEGY.md** — Add "Region-Aware Component Pattern" to build patterns
4. **Add jurisdiction columns to organizations** — Migration + org settings UI
5. **Then proceed with 7shifts/Employment Records work** — now jurisdiction-aware from the start

---

## Key Files
```
docs/CHEFLIFE-ANATOMY.md                           — Needs jurisdiction section
docs/L5-BUILD-STRATEGY.md                          — Needs region-aware pattern
docs/roadmaps/ROADMAP-Team.md                      — Employment Records spec
docs/ARCHITECTURE-7SHIFTS-FULL-INTEGRATION.md      — Integration architecture
docs/handoffs/HANDOFF-2026-02-18-Session129-*.md   — Previous session handoff
```

---

## Session Stats
- Files modified: 0 (assessment-only session)
- Files created: 1 (this handoff)
- Architecture decisions: 1 (three-document regionalization approach)
- Documents read in full: 2 (CHEFLIFE-ANATOMY.md, L5-BUILD-STRATEGY.md)

---

*"A restaurant in London and a restaurant in Toronto buy the same pork shoulder.
The data is the same. The rules are different. ChefLife knows the difference."*
