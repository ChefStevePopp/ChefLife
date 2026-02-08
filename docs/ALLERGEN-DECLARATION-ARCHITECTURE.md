# Allergen Declaration & Recipe Versioning Architecture

> **Status:** Auto-versioning + NEXUS events LIVE (Session 77)  
> **Phase:** Core versioning complete, declaration pinning pending (Post Auth Bridge)  
> **Last updated:** 2026-02-07  
> **Decision makers:** Steve (Chef/Owner/Architect)

---

## Implementation Status (Session 77)

### What's LIVE

| Feature | Status | File |
|---|---|---|
| Auto-version bump on save | ✅ | RecipeDetailPage/index.tsx |
| useRecipeChangeDetection hook | ✅ | RecipeEditor/useRecipeChangeDetection.ts |
| NEXUS events for all 3 tiers | ✅ | lib/nexus/index.ts + events.ts |
| Allergen review gate (save interceptor) | ✅ | RecipeDetailPage/index.tsx |
| Allergen auto-sync from ingredients | ✅ | RecipeEditor/useAllergenAutoSync.ts |
| VersionHistory Pending Changes panel | ✅ | RecipeEditor/VersionHistory.tsx |
| Safety floor enforcement (MAJOR lock) | ✅ | useRecipeChangeDetection.ts |
| Manual version bump (Versions tab) | ✅ | VersionHistory.tsx |
| Structured change audit trail | ✅ | Stored in versions[].changes array |

### Two Paths to Version Bump

```
PATH 1 — AUTO (any tab → Save)
  Edit → Save → saveDetection.hasChanges? → auto-bump at suggestedTier
  Guard: only fires when formData.version === originalData.version
  Notes: auto-generated from detection.changes[].description

PATH 2 — MANUAL (Versions tab)
  Edit → Versions tab → Pending Changes panel → pick tier + write notes
  → "Create vX.Y.Z" → formData.version updated → Save
  Guard: auto-bump skipped because version already differs

BOTH PATHS → NEXUS fires recipe_version_{patch|minor|major}
```

### NEXUS Events Fired on Save

| Event | When | Severity | Channels |
|---|---|---|---|
| recipe_version_patch | Any PATCH bump | info | in_app |
| recipe_version_minor | Any MINOR bump | warning | in_app, email |
| recipe_version_major | Any MAJOR bump | critical | in_app, email, sms |
| recipe_allergen_changed | CONTAINS/MAY CONTAIN diff | critical | in_app, email |
| recipe_allergen_declared | Operator clicked Confirm | info | in_app |

### Pending

| Feature | Depends On |
|---|---|
| Ingredient hash tripwire (Layer 4) | Nothing — can build now |
| NEXUS card badges from activity_logs (Layer 5) | Nothing — can build now |
| Declaration pinning table (Layer 7) | Auth Identity Bridge |
| Team re-acknowledgment for MAJOR | Auth Identity Bridge |
| Email/SMS routing | Notification service |

---

## Core Principle: ChefLife is a Mirror, Not an Oracle

ChefLife does **not** detect allergens. It **reflects** the allergen data that the
operator entered in the Master Ingredient List. The cascade is:

```
Vendor Label/Abstract → MIL Entry (operator) → Recipe Ingredient → Declaration
```

Every step is **the operator's data, the operator's responsibility**. ChefLife is
the conduit, never the source. This distinction is not cosmetic — it's the
difference between "your software missed an allergen" (ChefLife's liability) and
"your ingredient data didn't include it" (operator's liability).

### Language Rules (enforced in UI)

| ❌ Never say | ✅ Always say |
|---|---|
| "Auto-detected" | "From your ingredient data" |
| "We found" | "Your MIL entries show" |
| "ChefLife detected" | "Populated from your Master Ingredient List" |
| "System-identified" | "Cascaded from your ingredients" |

---

## Declaration = Notary Stamp on a Recipe Version

The allergen declaration doesn't get its own version number. It gets **pinned**
to a recipe version. Think notary stamp:

- The **document** (recipe v1.2.0) exists
- The **stamp** (declaration) says "I reviewed this document at this version and
  attest to its allergen accuracy on this date"
- If the document changes, the stamp is void — new declaration required

---

## Allergen Changes Drive Recipe Version Bumps

Same MAJOR.MINOR.PATCH schema as recipes and policies. Same communication
hierarchy. The version number tells the team exactly what changed and how
urgently they need to act.

### Version Bump Matrix

| What Changed | Bump | Communication Tier | Rationale |
|---|---|---|---|
| Cross-contact note edited | **PATCH** (v1.0.x) | Trust mgmt — silent | Operational detail, no profile change |
| Manual override note updated | **PATCH** (v1.0.x) | Trust mgmt — silent | Documentation, not exposure |
| New "may contain" added | **MINOR** (v1.x.0) | Broadcast review — team notified | Potential exposure, awareness needed |
| Cross-contact note added (new risk) | **MINOR** (v1.x.0) | Broadcast review — team notified | New risk vector |
| **New CONTAINS added** | **MAJOR** (vX.0.0) | Mandatory meeting + re-ack | **Customer safety. Full stop.** |
| **CONTAINS removed** | **MAJOR** (vX.0.0) | Mandatory meeting + re-ack | False confidence kills too |
| May contain → promoted to contains | **MAJOR** (vX.0.0) | Mandatory meeting + re-ack | Tier escalation |

> A CONTAINS change is the single most critical MAJOR bump in the system.
> More than price. More than yield. It's the one that sends someone to the hospital.

---

## Ingredient Hash — The Tripwire

Every declaration captures a SHA hash of the recipe's ingredient list at the
moment of signing. This is the safety net between versions:

```
Recipe v1.0.0 saved → Declaration made → ingredient_hash captured
Chef adds soy sauce → ingredient_hash changes → ⚠ STALE FLAG
UI shows: "Ingredients changed since last declaration"
Chef saves → v2.0.0 (new CONTAINS: soy) → old declaration superseded
New declaration required → team notified via MAJOR bump rules
```

The hash catches the gap between "something changed" and "nobody re-declared."

---

## Future Table: `recipe_allergen_declarations`

```sql
CREATE TABLE recipe_allergen_declarations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL REFERENCES recipes(id),
  recipe_version  TEXT NOT NULL,                    -- pinned: "2.1.0"
  ingredient_hash TEXT NOT NULL,                    -- SHA of ingredient list
  contains        TEXT[] NOT NULL DEFAULT '{}',
  may_contain     TEXT[] NOT NULL DEFAULT '{}',
  cross_contact   TEXT[] NOT NULL DEFAULT '{}',
  declared_by     UUID NOT NULL REFERENCES auth.users(id),  -- auth identity bridge
  declared_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  declared_from   TEXT,                              -- device/IP context
  superseded_at   TIMESTAMPTZ,                       -- NULL = current
  superseded_by   UUID REFERENCES recipe_allergen_declarations(id),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  
  CONSTRAINT one_active_per_recipe UNIQUE (recipe_id) WHERE (superseded_at IS NULL)
);

-- RLS: Only org members can read, only authenticated users can declare
ALTER TABLE recipe_allergen_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read" ON recipe_allergen_declarations
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');

CREATE POLICY "auth_declare" ON recipe_allergen_declarations
  FOR INSERT WITH CHECK (
    declared_by = auth.uid() AND
    org_id = auth.jwt()->>'org_id'
  );

-- Public read for customer-facing portal (allergen QR codes)
CREATE POLICY "public_active_declarations" ON recipe_allergen_declarations
  FOR SELECT USING (superseded_at IS NULL)
  TO anon;
```

---

## Declaration Lifecycle

```
1. Recipe v1.0.0 created
   └─ Chef edits allergen tab → onChange flows to parent
   └─ Parent save → allergenInfo persisted + version pinned
   └─ Declaration row created: recipe_version="1.0.0", ingredient_hash="abc123"

2. Someone adds soy sauce ingredient
   └─ ingredient_hash changes → UI: "⚠ Declaration may be stale"
   └─ Allergen cascade recalculates → Soy now in CONTAINS
   └─ Save → version bumps to v2.0.0 (MAJOR — new CONTAINS)
   └─ Old declaration: superseded_at = now()
   └─ New declaration required → MAJOR communication tier triggered

3. Chef reviews and saves allergen tab
   └─ New declaration row: recipe_version="2.0.0", ingredient_hash="def456"
   └─ Team gets mandatory meeting notification
   └─ NEXUS logs: DECLARATION_UPDATED event

4. Customer scans QR code
   └─ Public route: /allergens/{org}/{recipe_id}
   └─ Shows: active declaration (superseded_at IS NULL)
   └─ Displays: allergens, version, declared_at date
   └─ Identity: UUID only — no names, no emails
```

---

## Public Declaration Portal

The declaration panel in the recipe editor is a **preview** of the public document.
Left side (workbench) is never exposed. Only the right side (declaration) crosses
the legal boundary.

### Endpoints (TBA)

| Route | Auth | Purpose |
|---|---|---|
| `/allergens/{org_slug}/{recipe_id}` | None (public) | Customer-facing declaration |
| `/api/v1/allergens/{recipe_id}` | None (public) | JSON for menu integrations |
| `/allergens/{org_slug}` | None (public) | Full menu allergen index |
| Embeddable via iframe | None (public) | Online ordering platforms |

### QR Code Flow

The existing ShareButton generates a link to the public declaration route.
Physical QR codes on menus or labels link directly to the versioned declaration.
The customer sees: what allergens, when declared, recipe version, UUID (not person).

---

## Identity: UUID Only — No Doxxing

The declaration shows the auth.uid() of the declarant. Never a name, never an
email. This prevents doxxing while maintaining cryptographic traceability.

If legal proceedings require identifying the declarant, the organization resolves
the UUID through their own internal records. ChefLife's public surface never
exposes personal information.

---

## Boolean Migration (Non-Negotiable for Scale)

> **Decision:** February 7, 2026 — JSONB allergen storage on recipes will be
> replaced with boolean columns matching the MIL pattern. See
> [ROADMAP-Allergen-Boolean-Migration.md](./roadmaps/ROADMAP-Allergen-Boolean-Migration.md)

The current `allergenInfo` JSONB field cannot scale to 1000+ restaurants.
Recipes will move to `allergen_{type}_contains`, `allergen_{type}_may_contain`,
and `allergen_{type}_environment` boolean columns (75 total). This eliminates
the JSON parsing round-trip that causes stale data bugs between the Declaration
Panel and RecipeCardL5, and enables indexed queries across the entire platform.

The `recipe_allergen_declarations` table (below) may also move from `TEXT[]`
arrays to boolean columns for consistency, pending final decision during
implementation.

---

## Dependencies

This architecture requires the **Auth Identity Bridge** (see CHEFLIFE-ANATOMY.md):

1. `user_id` column on `organization_team_members` (FK → auth.users)
2. Team member invitation flow (email → Supabase auth account)
3. `recipe_allergen_declarations` table (above)
4. NEXUS event logging for declaration lifecycle
5. Public route with anon RLS policy

Until the auth bridge is built, the allergen tab works exactly as it does now:
data flows through parent onChange, saves via the unified tab pattern, and the
declaration panel shows the UUID of the current logged-in user. The data shape
is ready for the future table — no migration required on the frontend.

---

## Natasha's Promise

In 2016, Natasha Ednan-Laperouse died from an allergic reaction to sesame in a
sandwich that wasn't labeled. Her death led to Natasha's Law in the UK, requiring
full allergen labeling.

This system honors her memory. The chain never breaks:

```
Vendor → MIL → Recipe → Version → Declaration → Customer
```

Every link is auditable. Every change is versioned. Every declaration is signed.
That's Natasha's Promise with a version number on it.
