# Custom Allergen Registry Roadmap

> From 3 free-text slots to unlimited organization-defined allergens.
> Scalable custom allergen management rooted in the Allergen Manager module.

**Created:** February 18, 2026
**Authors:** Steve Popp (Creator/Architect) & Claude (Architecture Partner)
**Status:** Phase 0 complete (AllergenBadge fallback rendering)
**Depends On:** ROADMAP-Allergen-Boolean-Migration.md (Phases 1-3 complete)
**Parent Module:** Allergen Manager (`/admin/allergens`)

---

## The Problem

Custom allergens are a first-class operational need that's currently hacked
with a last-class data model.

### What Exists Today

Master Ingredients have 3 free-text custom allergen slots:

```
allergen_custom1_name:  "Wine"       allergen_custom1_active: true
allergen_custom2_name:  "Corn"       allergen_custom2_active: true
allergen_custom3_name:  ""           allergen_custom3_active: false
```

### Why This Breaks at Scale

| Problem | Impact |
|---------|--------|
| **3-slot limit** | A bakery tracking grain subtypes is out of slots instantly |
| **Free-text inconsistency** | "Wine" vs "wine" vs "Wines" vs "Contains Wine" across ingredients |
| **No org-level registry** | Each ingredient defines customs independently — no shared palette |
| **No rendering metadata** | No icon, no color, no severity — AllergenBadge returns `null` |
| **No boolean column mapping** | Customs can't participate in indexed queries |
| **No cascade path** | `allergenArraysToBooleans()` only iterates `ALLERGEN_KEYS` — customs are dropped |
| **No change detection** | Version bumping doesn't see custom allergen additions/removals |
| **No audit trail** | Legal declaration records don't capture customs consistently |

### The 1000-Restaurant Question

A sushi restaurant needs: specific fish species, wasabi, nori.
A Mexican restaurant needs: corn, nightshades, annatto.
A molecular gastronomy place needs: transglutaminase, agar, methylcellulose.
A halal kitchen needs: alcohol, gelatin (porcine), animal rennet.

You can't hardcode all of these into `AllergenType`. But you *can* give each
organization a registry where they define exactly what matters to their operation,
with the same rendering quality and cascade behavior as the 21 standards.

---

## Architecture Decision

### Hybrid: Hardcoded Standards + Organization Custom Registry

**Standards (21 allergens):** Immutable. Regulatory. Boolean columns. Fast queries.
Health Canada says peanut is peanut — no org gets to change that.

**Customs (unlimited per org):** Dynamic. Operational. Registry table + junction
tables. Same rendering, same cascade, same audit weight.

The Allergen Manager module (`/admin/allergens`) is the home for the registry.
This is where the org defines their custom allergens — name, icon, color,
severity, description. Every downstream consumer reads from this registry.

---

## Target Schema

### organization_custom_allergens (The Registry)

```sql
CREATE TABLE organization_custom_allergens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  key             TEXT NOT NULL,           -- normalized: "wine", "corn", "nightshade"
  label           TEXT NOT NULL,           -- display: "Wine", "Corn", "Nightshades"
  
  -- Rendering metadata (same fields as ALLERGENS constant)
  icon            TEXT NOT NULL DEFAULT 'AlertTriangle',  -- lucide icon name
  color           TEXT NOT NULL DEFAULT 'violet',         -- tailwind color
  severity        TEXT NOT NULL DEFAULT 'medium'          -- high | medium | low
                  CHECK (severity IN ('high', 'medium', 'low')),
  description     TEXT DEFAULT '',         -- "Includes all wine-based ingredients"
  
  -- Organization
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(organization_id, key)
);

-- Index for lookups
CREATE INDEX idx_org_custom_allergens_org 
  ON organization_custom_allergens(organization_id) 
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE organization_custom_allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read" ON organization_custom_allergens
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));
CREATE POLICY "org_admins_write" ON organization_custom_allergens
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM organization_roles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### master_ingredient_custom_allergens (Per-Ingredient Junction)

```sql
CREATE TABLE master_ingredient_custom_allergens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_ingredient_id   UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
  custom_allergen_id     UUID NOT NULL REFERENCES organization_custom_allergens(id) ON DELETE CASCADE,
  tier                   TEXT NOT NULL DEFAULT 'contains'
                         CHECK (tier IN ('contains', 'may_contain')),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(master_ingredient_id, custom_allergen_id)
);

CREATE INDEX idx_mi_custom_allergens_mi 
  ON master_ingredient_custom_allergens(master_ingredient_id);
CREATE INDEX idx_mi_custom_allergens_allergen 
  ON master_ingredient_custom_allergens(custom_allergen_id);
```

### recipe_custom_allergens (Per-Recipe, Written by Cascade)

```sql
CREATE TABLE recipe_custom_allergens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id              UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  custom_allergen_id     UUID NOT NULL REFERENCES organization_custom_allergens(id) ON DELETE CASCADE,
  tier                   TEXT NOT NULL DEFAULT 'contains'
                         CHECK (tier IN ('contains', 'may_contain', 'environment')),
  source                 TEXT NOT NULL DEFAULT 'auto'
                         CHECK (source IN ('auto', 'manual')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(recipe_id, custom_allergen_id, tier)
);

CREATE INDEX idx_recipe_custom_allergens_recipe 
  ON recipe_custom_allergens(recipe_id);
CREATE INDEX idx_recipe_custom_allergens_allergen 
  ON recipe_custom_allergens(custom_allergen_id);

-- Query: "Which recipes contain [custom allergen]?" — instant with index
-- SELECT r.name FROM recipes r
-- JOIN recipe_custom_allergens rca ON r.id = rca.recipe_id
-- WHERE rca.custom_allergen_id = $1 AND rca.tier = 'contains';
```

---

## Phase Plan

### Phase 0: Badge Fallback (COMPLETE — Session 129)

**Scope:** AllergenBadge renders unknown allergen types instead of returning null.

**What was done:**
- AllergenBadge checks `ALLERGENS[type]` — if missing, renders fallback badge
- Fallback uses violet color, AlertTriangle icon, title-cased type as label
- Tooltip shows "custom" tag to distinguish from standards
- Custom allergens now visible in AutoDetectedPanel and DeclarationPanel

**Limitation:** This is a stopgap. Fallback has no org-defined metadata —
just a guess at the label from the raw key string. The registry replaces this.

---

### Phase 1: Registry Table + Allergen Manager UI

**Scope:** Database table + CRUD interface in Allergen Manager accordion.
**Sessions:** 1-2
**Depends On:** Nothing — can start any session.

**Database:**
- Create `organization_custom_allergens` table (schema above)
- RLS policies for org-scoped read/write
- Seed migration: scan existing MIL `allergen_custom1/2/3_name` fields,
  deduplicate by org, normalize casing, insert as registry entries

**Allergen Manager UI (`/admin/allergens`):**
- New accordion section: "Organization Custom Allergens" (between Custom Icons 
  and Station Allergens in the section order)
- Registry management interface:
  - List existing custom allergens with badge preview
  - Add new: key (auto-generated from label), label, icon picker (Lucide 
    subset), color picker (Tailwind palette), severity, description
  - Edit existing (label, icon, color, severity, description — key is immutable)
  - Deactivate (soft delete — `is_active = false`, preserves history)
  - Sort order drag-and-drop or manual number
- Stat pill in accordion header: "{n} custom allergens defined"

**Store:**
- `useCustomAllergenStore` — fetches org's custom allergens, caches in memory
- Loaded on app init alongside operations settings
- Provides `getCustomAllergen(key)` for badge rendering

**Badge integration:**
- AllergenBadge checks store before falling back to generic
- Org-defined icon, color, label used instead of guessed fallback

**Key decision — Icon picker scope:**
The icon picker for custom allergens uses the Lucide icon set (same as the rest 
of the app). This is NOT the white-label icon upload system described in 
ALLERGEN-MANAGER.md Phase 3. That system is for custom SVG uploads for 
customer-facing portals. The registry icon picker is for internal operational 
rendering — selecting from existing Lucide icons like Grape, Wine, Flame, Leaf, 
Bean, Droplet, etc. These are two separate features serving different audiences
(kitchen operators vs. restaurant customers).

---

### Phase 2: MIL Integration

**Scope:** Replace 3 free-text custom slots with registry-backed multi-select.
**Sessions:** 1-2
**Depends On:** Phase 1 (registry must exist)

**Database:**
- Create `master_ingredient_custom_allergens` junction table (schema above)
- Data migration script:
  1. For each MIL row with `allergen_custom1_name` (non-empty, active):
     - Find matching registry entry by org + normalized key
     - If no match: create registry entry (shouldn't happen if Phase 1 
       seed ran, but defensive)
     - Insert junction row with appropriate tier
  2. Repeat for custom2, custom3
  3. Verify: junction row count matches active custom slot count
  4. DO NOT drop the old columns yet — dual-read period

**MIL AllergenSection UI:**
- Replace 3 fixed custom slots with dynamic multi-select
- Dropdown reads from org's custom allergen registry
- Each selected custom gets a tier toggle (Contains / May Contain)
- Optional notes field per custom allergen
- Badge preview uses registry metadata (icon, color, label)
- "Manage Custom Allergens" link → opens Allergen Manager in new tab

**Extraction utility update:**
- `extractFromMasterIngredient()` reads BOTH:
  - Legacy custom slots (backward compat during transition)
  - Junction table rows (new source of truth)
- Deduplicates if same allergen appears in both sources

---

### Phase 3: Recipe Cascade Integration

**Scope:** Custom allergens flow through the cascade and persist per-recipe.
**Sessions:** 1-2
**Depends On:** Phase 2 (MIL must write to junction table)

**Database:**
- Create `recipe_custom_allergens` junction table (schema above)

**useAllergenAutoSync update:**
- Current flow: reads MIL booleans → computes standards → writes recipe booleans
- New flow: reads MIL booleans + MIL junction rows → computes standards + customs
  → writes recipe booleans (standards) + recipe junction rows (customs)
- Manual overrides for customs: stored in `recipe_custom_allergens` with 
  `source = 'manual'`

**useAllergenCascade update:**
- Merge custom allergens into the `autoDetected` and `declaration` outputs
- `allergensWithContext` includes customs with source traceability

**AllergenControl update:**
- AutoDetectedPanel: renders customs alongside standards (badge from registry)
- ManualOverrides: can add customs from the registry (same UI pattern)
- DeclarationPanel: includes customs in the legal declaration

**Change detection update:**
- `useRecipeChangeDetection` compares recipe junction rows vs baseline
- Custom allergen add/remove triggers appropriate version bump tier:
  - CONTAINS custom added/removed → MAJOR (same as standard CONTAINS)
  - MAY CONTAIN custom added/removed → MINOR
  - Environment custom added/removed → MINOR

**Allergen review gate:**
- `needsAllergenReview` checks custom junction diffs alongside boolean diffs
- Same gate behavior — operator must explicitly confirm

---

### Phase 4: Audit Trail + Declaration Integration

**Scope:** Custom allergens get the same legal weight as standards.
**Sessions:** 1
**Depends On:** Phase 3

**Declaration records:**
- `recipe_allergen_declarations` table gains:
  - `custom_contains: jsonb` — array of `{key, label, custom_allergen_id}`
  - `custom_may_contain: jsonb` — same structure
  - `custom_contains_added: jsonb` / `custom_contains_removed: jsonb`
- Legal receipt includes customs alongside standards

**NEXUS events:**
- `recipe_allergen_changed` events include custom allergen diffs
- `recipe_allergen_declared` events include customs in the declaration snapshot

**Version history:**
- Change notes include custom allergen names (from registry label)
- Version entries show custom adds/removes with same formatting as standards

---

### Phase 5: Cleanup + MIL Column Deprecation

**Scope:** Remove legacy 3-slot custom columns from MIL.
**Sessions:** 0.5
**Depends On:** Phase 4 + validation period (2+ weeks)

**Database:**
- Drop columns: `allergen_custom1_name`, `allergen_custom1_active`, 
  `allergen_custom1_may_contain` (×3)
- Drop recipe columns: `allergen_custom1_name`, `allergen_custom1_contains`,
  `allergen_custom1_may_contain`, `allergen_custom1_environment` (×3)

**Code cleanup:**
- Remove legacy custom slot reading from `extractFromMasterIngredient()`
- Remove dual-read logic from Phase 2
- Remove `allergen_customN_*` from TypeScript types

**Only after:** All reads confirmed on junction tables for 2+ weeks.

---

## What Changes Per Component

| Component | Current | Target | Phase |
|---|---|---|---|
| **Allergen Manager** | 3 accordion sections (Icons stubbed, Stations built, Portal stubbed) | + Custom Allergen Registry section with full CRUD | Phase 1 |
| **AllergenBadge** | Returns null for unknown types (Phase 0: fallback) | Reads from registry store for org customs | Phase 1 |
| **MIL AllergenSection** | 3 fixed free-text custom slots | Registry-backed multi-select, unlimited customs | Phase 2 |
| **extractFromMasterIngredient** | Reads `allergen_custom1/2/3_*` columns | Reads junction table rows | Phase 2 |
| **useAllergenAutoSync** | Writes recipe booleans (standards only) | Writes booleans + junction rows (standards + customs) | Phase 3 |
| **useAllergenCascade** | Merges standards + manual overrides | Merges standards + customs + manual overrides | Phase 3 |
| **AutoDetectedPanel** | Shows standards only (customs render via fallback) | Shows standards + customs with registry metadata | Phase 3 |
| **DeclarationPanel** | Includes customs as raw text | Includes customs with proper badges and labels | Phase 3 |
| **useRecipeChangeDetection** | Compares boolean columns only | Compares booleans + junction rows | Phase 3 |
| **needsAllergenReview** | Checks boolean diffs only | Checks boolean + junction diffs | Phase 3 |
| **recipe_allergen_declarations** | Standards only in legal record | Standards + customs in legal record | Phase 4 |
| **NEXUS events** | Standards only in change events | Standards + customs in change events | Phase 4 |

---

## Data Migration Strategy

### Phase 1 Seed: Existing Custom Slots → Registry

```sql
-- Extract unique custom allergen names per org from MIL
-- Normalize casing, deduplicate, insert as registry entries

WITH custom_names AS (
  SELECT DISTINCT
    mi.organization_id,
    LOWER(TRIM(name)) as key,
    TRIM(name) as raw_name
  FROM master_ingredients mi
  CROSS JOIN LATERAL (
    VALUES 
      (mi.allergen_custom1_name, mi.allergen_custom1_active),
      (mi.allergen_custom2_name, mi.allergen_custom2_active),
      (mi.allergen_custom3_name, mi.allergen_custom3_active)
  ) AS customs(name, active)
  WHERE name IS NOT NULL 
    AND TRIM(name) != ''
    AND active = TRUE
)
INSERT INTO organization_custom_allergens (organization_id, key, label)
SELECT 
  organization_id,
  key,
  -- Use the first raw_name encountered as the label (preserves casing)
  (ARRAY_AGG(raw_name ORDER BY raw_name))[1] as label
FROM custom_names
GROUP BY organization_id, key
ON CONFLICT (organization_id, key) DO NOTHING;
```

### Phase 2 Migration: Custom Slots → Junction Rows

```sql
-- For each MIL row with active custom slots, create junction rows

INSERT INTO master_ingredient_custom_allergens 
  (master_ingredient_id, custom_allergen_id, tier)
SELECT 
  mi.id,
  oca.id,
  CASE WHEN customs.may_contain THEN 'may_contain' ELSE 'contains' END
FROM master_ingredients mi
CROSS JOIN LATERAL (
  VALUES 
    (mi.allergen_custom1_name, mi.allergen_custom1_active, mi.allergen_custom1_may_contain),
    (mi.allergen_custom2_name, mi.allergen_custom2_active, mi.allergen_custom2_may_contain),
    (mi.allergen_custom3_name, mi.allergen_custom3_active, mi.allergen_custom3_may_contain)
) AS customs(name, active, may_contain)
JOIN organization_custom_allergens oca 
  ON oca.organization_id = mi.organization_id 
  AND oca.key = LOWER(TRIM(customs.name))
WHERE customs.name IS NOT NULL 
  AND TRIM(customs.name) != ''
  AND customs.active = TRUE
ON CONFLICT (master_ingredient_id, custom_allergen_id) DO NOTHING;
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-text dedup creates wrong matches | Low | Medium | Manual review step after seed migration; show count to operator |
| Org defines 50+ custom allergens | Low | Low | No hard limit, but UI paginates after 20; sort order keeps it manageable |
| Badge icon picker overwhelms operator | Medium | Low | Curated subset of ~30 food-relevant Lucide icons, not full set |
| Junction table joins slow down cascade | Low | Medium | Indexed on both FKs; typical recipe has 0-5 custom allergens |
| Phase 2 MIL migration loses data | Medium | High | Dual-read during transition; old columns preserved until Phase 5 |
| Custom allergen deleted while recipes reference it | Medium | High | Soft delete only (`is_active = false`); FK prevents hard delete |

---

## Relationship to Other Roadmaps

**ROADMAP-Allergen-Boolean-Migration.md:**
- Phase 4 (Drop JSONB) can proceed independently — customs use junction tables,
  not JSONB or boolean columns
- The boolean system handles standards; the junction system handles customs
- They coexist without interference

**ALLERGEN-MANAGER.md:**
- Phase 3 (White-Label Customization) is for customer-facing SVG icon uploads
- The Custom Allergen Registry icon picker (Lucide subset) is a separate feature
  for internal operational rendering
- Both live in the Allergen Manager module but serve different audiences

**ROADMAP-Kitchen.md:**
- Recipe allergens tab benefits from customs flowing through the cascade
- No changes needed to the tab structure — customs appear alongside standards

---

## Session Estimates

| Phase | Sessions | Notes |
|---|---|---|
| Phase 0: Badge fallback | ✅ Done | Session 129 — AllergenBadge renders unknowns |
| Phase 1: Registry table + Allergen Manager UI | 1-2 | Table + CRUD + store + badge integration |
| Phase 2: MIL integration | 1-2 | Junction table + multi-select UI + data migration |
| Phase 3: Recipe cascade integration | 1-2 | Auto-sync + cascade + change detection + review gate |
| Phase 4: Audit trail + declarations | 1 | Legal records + NEXUS + version history |
| Phase 5: Column cleanup | 0.5 | Drop legacy columns after validation |
| **Total** | **5-8 sessions** | Can be interleaved with other work |

---

## Decision Log

| Date | Decision | Who |
|---|---|---|
| 2026-02-18 | Custom allergens need a proper registry, not free-text slots | Steve + Claude |
| 2026-02-18 | Registry lives in Allergen Manager module config | Steve |
| 2026-02-18 | Hybrid architecture: hardcoded standards + org-defined customs | Claude (confirmed Steve) |
| 2026-02-18 | Standards are immutable regulatory constants; customs are org-defined extensions | Steve + Claude |
| 2026-02-18 | Icon picker uses Lucide subset (not white-label SVG upload — that's separate) | Steve + Claude |
| 2026-02-18 | AllergenBadge fallback implemented as Phase 0 stopgap | Session 129 |

---

## References

- [ROADMAP-Allergen-Boolean-Migration.md](./ROADMAP-Allergen-Boolean-Migration.md) — Standard allergen boolean columns (Phases 1-3 complete)
- [ALLERGEN-MANAGER.md](../ALLERGEN-MANAGER.md) — Module architecture, three-state system, white-label plans
- [ALLERGEN-DATA-FLOW-REVIEW.md](../ALLERGEN-DATA-FLOW-REVIEW.md) — Full data flow trace
- [ALLERGEN-DECLARATION-ARCHITECTURE.md](../ALLERGEN-DECLARATION-ARCHITECTURE.md) — Versioning, NEXUS, declaration lifecycle

---

*"21 standard allergens protect against regulation. Unlimited custom allergens
protect against reality. Every kitchen has its own hazards — the system should
reflect that, not constrain it."*

---

**Document Version:** 1.0
**Last Update:** February 18, 2026
**Next Review:** When Phase 1 is scheduled
