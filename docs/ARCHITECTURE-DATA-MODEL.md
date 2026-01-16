# ChefLife Data Model Architecture

> **Priority:** HIGH  
> **Status:** APPROVED  
> **Created:** 2025-01-15  
> **Updated:** 2025-01-15  
> **Authors:** Steve, Claude

---

## Overview

ChefLife's data model is built for scale—from a single food truck to a multi-region franchise. The architecture introduces a clear hierarchy that enables permission scoping, data rollup, and regional management while remaining invisible to small operators.

**Design Principle:** Baked in, not bolted on. Multi-tenant from day one.

---

## The Hierarchy

```
ChefLife (Platform)
    │
    └── Organization ─────── The business entity (who pays the bill)
            │
            └── Region ─────── Division / Franchise Group / Geographic Area
                    │
                    └── Location ─── Physical property (the operational unit)
                            │
                            └── User ── Team member
```

**Location is the atomic operational unit.** One location = one kitchen = one P&L = one health permit.

---

## Target Market Fit

| Segment | Org | Regions | Locations |
|---------|-----|---------|-----------|
| Independent restaurant | 1 | 1 (hidden) | 1 |
| Growing family business | 1 | 1 | 2-5 |
| Regional franchise owner | 1 | 1-2 | 10-20 |
| Multi-region chain | 1 | 3-5 | 20-50 |

**Out of scope:** Hotels, casinos, multi-concept properties (Oracle territory).

---

## Real-World Examples

**Single Restaurant (Memphis Fire Today):**
```
Organization: "Memphis Fire BBQ Company"
    └── Region: "Primary" (auto-created, invisible in UI)
            └── Location: "Memphis Fire Winona"
                    ├── User: Steve (Echo)
                    ├── User: Lori (Echo)
                    └── User: Line Cook (Alpha)
```

**Growing Family Business:**
```
Organization: "Memphis Fire BBQ Company"
    └── Region: "Primary"
            ├── Location: "Memphis Fire Winona"
            └── Location: "Memphis Fire Hamilton" (future)
```

**Regional Franchise Owner:**
```
Organization: "Johnson Family Restaurants LLC"
    └── Region: "Greater Toronto"
            ├── Location: "Wings Express - Downtown"
            ├── Location: "Wings Express - Midtown"
            ├── Location: "Wings Express - Airport"
            └── ... (12 more)
```

**Multi-Region Chain:**
```
Organization: "Smokey's BBQ Holdings"
    ├── Region: "Ontario"
    │       ├── Location: "Smokey's Toronto"
    │       ├── Location: "Smokey's Hamilton"
    │       └── Location: "Smokey's Ottawa"
    │
    └── Region: "Quebec"
            ├── Location: "Smokey's Montreal"
            └── Location: "Smokey's Quebec City"
```

---

## Schema Design

### Core Tables

```sql
-- ============================================================================
-- ORGANIZATIONS (Top-level business entity - the customer)
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,                    -- 'memphis-fire-bbq'
  
  -- Billing & Subscription
  subscription_tier TEXT DEFAULT 'starter',  -- 'starter', 'pro', 'enterprise'
  stripe_customer_id TEXT,
  
  -- Settings (org-wide defaults)
  settings JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'America/Toronto',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- REGIONS (Division / Franchise Group / Geographic Area)
-- ============================================================================
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT,                           -- 'GTA', 'ONTARIO', 'EAST'
  description TEXT,
  
  -- Settings (regional overrides)
  settings JSONB DEFAULT '{}',
  
  -- For single-location orgs, auto-create a "Primary" region
  is_default BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

-- ============================================================================
-- LOCATIONS (Physical properties - the operational unit)
-- ============================================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,                  -- "Memphis Fire Winona"
  code TEXT,                           -- 'MFW', 'DT-01', 'MAIN'
  
  -- Physical Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CA',
  
  -- Contact
  phone TEXT,
  email TEXT,
  
  -- Operational
  timezone TEXT DEFAULT 'America/Toronto',
  
  -- Integrations
  pos_location_id TEXT,                -- Simphony property ID, Toast GUID, etc.
  
  -- Settings (location-specific overrides)
  settings JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

-- ============================================================================
-- LOCATION MEMBERS (User assignments with scoped permissions)
-- ============================================================================
CREATE TABLE location_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Permission level at this location (0-5: Omega → Echo)
  security_level INTEGER NOT NULL DEFAULT 1,
  
  -- User's primary/home location
  is_primary BOOLEAN DEFAULT true,
  
  -- Role at this specific location (optional)
  location_role TEXT,                  -- 'GM', 'KM', 'Line Cook', etc.
  
  -- Assignment dates
  started_at DATE DEFAULT CURRENT_DATE,
  ended_at DATE,                       -- NULL = currently active
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, location_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_regions_org ON regions(organization_id);
CREATE INDEX idx_locations_org ON locations(organization_id);
CREATE INDEX idx_locations_region ON locations(region_id);
CREATE INDEX idx_location_members_user ON location_members(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_location_members_location ON location_members(location_id) WHERE ended_at IS NULL;
```

---

## Data Scoping

### Organization Level (Shared Across All Locations)
- **Recipes** - Menu consistency
- **Master Ingredient List** - Centralized vendor pricing
- **Vendors** - Corporate purchasing agreements
- **Team Members** - People can work at multiple locations
- **Document Templates** - Standardized forms

### Location Level (Operational Data)
- **Inventory Counts** - Each location has different stock
- **Equipment** - Each kitchen is physically different
- **Schedules** - Local staffing needs
- **Temperature Logs** - HACCP is per-location
- **Prep Lists** - Based on local pars/forecasts
- **Activity Logs** - Track where events occurred

```sql
-- Operational tables get location_id
ALTER TABLE haccp_equipment ADD COLUMN location_id UUID REFERENCES locations(id);
ALTER TABLE inventory_counts ADD COLUMN location_id UUID REFERENCES locations(id);
ALTER TABLE haccp_temperature_logs ADD COLUMN location_id UUID REFERENCES locations(id);
ALTER TABLE schedules ADD COLUMN location_id UUID REFERENCES locations(id);
ALTER TABLE prep_lists ADD COLUMN location_id UUID REFERENCES locations(id);
ALTER TABLE activity_logs ADD COLUMN location_id UUID REFERENCES locations(id);
```

---

## Permission Scoping

Security levels (0-5) combine with hierarchy scope:

```typescript
interface UserContext {
  userId: string;
  organizationId: string;
  
  // What this user can access
  scope: {
    level: 'location' | 'region' | 'organization';
    locationIds: string[];     // Specific locations
    regionIds?: string[];      // If region-scoped
  };
  
  // Their highest security level (may vary by location)
  maxSecurityLevel: 0 | 1 | 2 | 3 | 4 | 5;
}
```

### Example Permission Patterns

```typescript
// Line cook at one location
{
  scope: { level: 'location', locationIds: ['memphis-fire-winona'] },
  maxSecurityLevel: 1
}

// Manager floating between 2 locations
{
  scope: { level: 'location', locationIds: ['loc-1', 'loc-2'] },
  maxSecurityLevel: 4
}

// Regional director over GTA
{
  scope: { level: 'region', regionIds: ['gta'], locationIds: [...all GTA locations] },
  maxSecurityLevel: 4
}

// Owner - full organization access
{
  scope: { level: 'organization', locationIds: [...all locations] },
  maxSecurityLevel: 5
}
```

---

## Row-Level Security

```sql
-- Users can only see locations they're assigned to
CREATE POLICY location_member_access ON inventory_counts
  FOR ALL
  USING (
    location_id IN (
      SELECT location_id FROM location_members 
      WHERE user_id = auth.uid() 
      AND ended_at IS NULL
    )
  );

-- Organization-level data visible to all org members
CREATE POLICY org_member_access ON recipes
  FOR ALL
  USING (
    organization_id IN (
      SELECT DISTINCT l.organization_id 
      FROM locations l
      JOIN location_members lm ON lm.location_id = l.id
      WHERE lm.user_id = auth.uid()
      AND lm.ended_at IS NULL
    )
  );
```

---

## Migration Strategy

### Phase 1: Schema Creation (Non-Breaking)

```sql
-- 1. Regions table (new)
CREATE TABLE regions (...);

-- 2. Locations table (new)  
CREATE TABLE locations (...);

-- 3. Location members table (new)
CREATE TABLE location_members (...);
```

### Phase 2: Data Migration

```sql
-- For each existing organization, create:
-- 1. A default region
INSERT INTO regions (organization_id, name, code, is_default)
SELECT id, 'Primary', 'PRIMARY', true FROM organizations;

-- 2. A default location (using org name/address)
INSERT INTO locations (organization_id, region_id, name, code, timezone, ...)
SELECT 
  o.id,
  r.id,
  o.name,
  'MAIN',
  o.timezone,
  ...
FROM organizations o
JOIN regions r ON r.organization_id = o.id AND r.is_default = true;

-- 3. Migrate team members to location_members
INSERT INTO location_members (user_id, location_id, security_level, is_primary)
SELECT 
  otm.user_id,
  l.id,
  COALESCE(otm.security_level, 1),
  true
FROM organization_team_members otm
JOIN organizations o ON o.id = otm.organization_id
JOIN regions r ON r.organization_id = o.id AND r.is_default = true
JOIN locations l ON l.region_id = r.id;
```

### Phase 3: Backfill location_id

```sql
-- Add location_id to operational tables
ALTER TABLE haccp_equipment ADD COLUMN location_id UUID REFERENCES locations(id);
-- ... etc

-- Backfill from organization_id
UPDATE haccp_equipment he
SET location_id = (
  SELECT l.id FROM locations l
  JOIN regions r ON l.region_id = r.id
  WHERE r.organization_id = he.organization_id
  AND r.is_default = true
  LIMIT 1
);
```

### Phase 4: Application Updates

1. Update `useAuth` to include location context
2. Add location switcher UI (for multi-location users)
3. Update queries to filter by `location_id`
4. Update NEXUS widgets to accept location scope

---

## UI Implications

### Single Location (Default Experience)
- No location switcher shown
- Location context implicit
- Clean, simple UI

### Multi-Location Users
```
┌─────────────────────────────────┐
│ 📍 Memphis Fire Winona    ▼    │
├─────────────────────────────────┤
│   Memphis Fire Winona     ✓    │
│   Memphis Fire Hamilton        │
└─────────────────────────────────┘
```

### Regional/Org Scope (NEXUS)
```
┌─────────────────────────────────┐
│ Viewing: All Locations    ▼    │
├─────────────────────────────────┤
│   All Locations (5)       ✓    │
│   ─────────────────────────    │
│   Ontario Region (3)           │
│   Quebec Region (2)            │
│   ─────────────────────────    │
│   Specific Location...         │
└─────────────────────────────────┘
```

---

## NEXUS Integration

The data model enables NEXUS widgets to be scope-aware:

```typescript
interface WidgetContext {
  // WHO
  securityLevel: SecurityLevel;
  userId: string;
  
  // WHERE (display surface)
  surface: 'admin' | 'kitchen' | 'mobile';
  
  // WHAT (data scope)
  scope: 'location' | 'region' | 'organization';
  organizationId: string;
  regionId?: string;
  locationId?: string;
}
```

Same widget, different scope:
- **Location scope:** "Walk-in #2 is at 38°F"
- **Region scope:** "3 of 12 locations have temp warnings"
- **Org scope:** "47 sensors monitored across 5 regions"

---

## Summary

```
ChefLife (Platform)
    │
    └── Organization ─── Who pays, shared recipes/vendors
            │
            └── Region ─── Grouping layer (franchise, geography)
                    │
                    └── Location ─── THE operational unit
                            │         - Inventory
                            │         - Equipment  
                            │         - Schedules
                            │         - HACCP
                            │         - P&L
                            │
                            └── User ─── Assigned with security level
```

**Baked in. Not bolted on. Ready to scale.**
