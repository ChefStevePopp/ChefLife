-- =============================================================================
-- MIGRATION: Add allergen boolean columns to recipes table
-- =============================================================================
-- Phase 1 of Allergen Boolean Migration
-- See: docs/roadmaps/ROADMAP-Allergen-Boolean-Migration.md
--
-- Purpose: Bring recipes to the same boolean column pattern as master_ingredients.
-- This is ADDITIVE ONLY — zero risk, no existing functionality affected.
-- Existing "allergenInfo" JSONB continues to work. New columns sit alongside it.
--
-- What's added:
--   - 63 standard allergen booleans (21 allergens × 3 tiers: contains, may_contain, environment)
--   - 12 custom allergen columns (3 slots × name + 3 tiers)
--   - 1 timestamp: allergen_declared_at (freshness signal for card display)
--   - 21 partial indexes on _contains columns (the critical tier for queries)
--   - 1 composite index for platform-wide "any allergen" queries
--
-- Column naming matches MIL pattern:
--   MIL:     allergen_peanut (contains), allergen_peanut_may_contain
--   Recipe:  allergen_peanut_contains, allergen_peanut_may_contain, allergen_peanut_environment
--   (Recipes add _contains suffix because they have 3 tiers vs MIL's 2)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Add boolean columns + timestamp
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE recipes

  -- Peanut
  ADD COLUMN IF NOT EXISTS allergen_peanut_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_peanut_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_peanut_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Crustacean
  ADD COLUMN IF NOT EXISTS allergen_crustacean_contains      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_crustacean_may_contain   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_crustacean_environment   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Tree Nut
  ADD COLUMN IF NOT EXISTS allergen_treenut_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_treenut_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_treenut_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Shellfish
  ADD COLUMN IF NOT EXISTS allergen_shellfish_contains       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_shellfish_may_contain    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_shellfish_environment    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sesame
  ADD COLUMN IF NOT EXISTS allergen_sesame_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sesame_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sesame_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Soy
  ADD COLUMN IF NOT EXISTS allergen_soy_contains             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_soy_may_contain          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_soy_environment          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Fish
  ADD COLUMN IF NOT EXISTS allergen_fish_contains            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_fish_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_fish_environment         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Wheat
  ADD COLUMN IF NOT EXISTS allergen_wheat_contains           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_wheat_may_contain        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_wheat_environment        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Milk
  ADD COLUMN IF NOT EXISTS allergen_milk_contains            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_milk_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_milk_environment         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sulphite
  ADD COLUMN IF NOT EXISTS allergen_sulphite_contains        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sulphite_may_contain     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_sulphite_environment     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Egg
  ADD COLUMN IF NOT EXISTS allergen_egg_contains             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_egg_may_contain          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_egg_environment          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Gluten
  ADD COLUMN IF NOT EXISTS allergen_gluten_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_gluten_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_gluten_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Mustard
  ADD COLUMN IF NOT EXISTS allergen_mustard_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mustard_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mustard_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Celery
  ADD COLUMN IF NOT EXISTS allergen_celery_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_celery_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_celery_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Garlic
  ADD COLUMN IF NOT EXISTS allergen_garlic_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_garlic_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_garlic_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Onion
  ADD COLUMN IF NOT EXISTS allergen_onion_contains           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_onion_may_contain        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_onion_environment        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Nitrite
  ADD COLUMN IF NOT EXISTS allergen_nitrite_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_nitrite_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_nitrite_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Mushroom
  ADD COLUMN IF NOT EXISTS allergen_mushroom_contains        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mushroom_may_contain     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_mushroom_environment     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Hot Pepper
  ADD COLUMN IF NOT EXISTS allergen_hot_pepper_contains      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_hot_pepper_may_contain   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_hot_pepper_environment   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Citrus
  ADD COLUMN IF NOT EXISTS allergen_citrus_contains          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_citrus_may_contain       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_citrus_environment       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Pork
  ADD COLUMN IF NOT EXISTS allergen_pork_contains            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_pork_may_contain         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_pork_environment         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Custom allergens (3 slots — matches MIL pattern)
  ADD COLUMN IF NOT EXISTS allergen_custom1_name             TEXT,
  ADD COLUMN IF NOT EXISTS allergen_custom1_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom1_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom1_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  ADD COLUMN IF NOT EXISTS allergen_custom2_name             TEXT,
  ADD COLUMN IF NOT EXISTS allergen_custom2_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom2_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom2_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  ADD COLUMN IF NOT EXISTS allergen_custom3_name             TEXT,
  ADD COLUMN IF NOT EXISTS allergen_custom3_contains         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom3_may_contain      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allergen_custom3_environment      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Freshness timestamp — set when allergens are reviewed and saved
  -- Card displays: "current to MM/DD/YYYY"
  -- Operator's professional judgment handles freshness
  ADD COLUMN IF NOT EXISTS allergen_declared_at              TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Backfill from existing "allergenInfo" JSONB
-- ─────────────────────────────────────────────────────────────────────────────
-- The JSONB structure is: { "contains": ["peanut","garlic"], "mayContain": ["milk"], "crossContactRisk": [] }
-- String keys in the arrays match column suffixes exactly.
-- Environment tier starts as FALSE (new capability, no existing data).
-- allergen_declared_at set to updated_at (best approximation for existing data).

DO $$
DECLARE
  allergen_key TEXT;
  allergen_keys TEXT[] := ARRAY[
    'peanut', 'crustacean', 'treenut', 'shellfish', 'sesame',
    'soy', 'fish', 'wheat', 'milk', 'sulphite', 'egg',
    'gluten', 'mustard', 'celery', 'garlic', 'onion',
    'nitrite', 'mushroom', 'hot_pepper', 'citrus', 'pork'
  ];
BEGIN
  -- For each standard allergen, set _contains and _may_contain from JSONB arrays
  FOREACH allergen_key IN ARRAY allergen_keys
  LOOP
    EXECUTE format(
      'UPDATE recipes SET
        allergen_%s_contains = COALESCE(
          "allergenInfo"->''contains'' ? %L, FALSE
        ),
        allergen_%s_may_contain = COALESCE(
          "allergenInfo"->''mayContain'' ? %L, FALSE
        )
      WHERE "allergenInfo" IS NOT NULL
        AND "allergenInfo" != ''null''::jsonb',
      allergen_key, allergen_key,
      allergen_key, allergen_key
    );
  END LOOP;

  -- Set allergen_declared_at to updated_at for all recipes that have allergen data
  UPDATE recipes
  SET allergen_declared_at = updated_at
  WHERE "allergenInfo" IS NOT NULL
    AND "allergenInfo" != 'null'::jsonb
    AND (
      jsonb_array_length(COALESCE("allergenInfo"->'contains', '[]'::jsonb)) > 0
      OR jsonb_array_length(COALESCE("allergenInfo"->'mayContain', '[]'::jsonb)) > 0
    );

  RAISE NOTICE 'Allergen boolean backfill complete';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Create partial indexes on _contains columns
-- ─────────────────────────────────────────────────────────────────────────────
-- Partial indexes: only index rows WHERE the boolean is TRUE.
-- Extremely efficient for "which recipes contain X?" queries at platform scale.

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_peanut_contains
  ON recipes (organization_id) WHERE allergen_peanut_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_crustacean_contains
  ON recipes (organization_id) WHERE allergen_crustacean_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_treenut_contains
  ON recipes (organization_id) WHERE allergen_treenut_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_shellfish_contains
  ON recipes (organization_id) WHERE allergen_shellfish_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_sesame_contains
  ON recipes (organization_id) WHERE allergen_sesame_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_soy_contains
  ON recipes (organization_id) WHERE allergen_soy_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_fish_contains
  ON recipes (organization_id) WHERE allergen_fish_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_wheat_contains
  ON recipes (organization_id) WHERE allergen_wheat_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_milk_contains
  ON recipes (organization_id) WHERE allergen_milk_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_sulphite_contains
  ON recipes (organization_id) WHERE allergen_sulphite_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_egg_contains
  ON recipes (organization_id) WHERE allergen_egg_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_gluten_contains
  ON recipes (organization_id) WHERE allergen_gluten_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_mustard_contains
  ON recipes (organization_id) WHERE allergen_mustard_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_celery_contains
  ON recipes (organization_id) WHERE allergen_celery_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_garlic_contains
  ON recipes (organization_id) WHERE allergen_garlic_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_onion_contains
  ON recipes (organization_id) WHERE allergen_onion_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_nitrite_contains
  ON recipes (organization_id) WHERE allergen_nitrite_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_mushroom_contains
  ON recipes (organization_id) WHERE allergen_mushroom_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_hot_pepper_contains
  ON recipes (organization_id) WHERE allergen_hot_pepper_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_citrus_contains
  ON recipes (organization_id) WHERE allergen_citrus_contains = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipes_allergen_pork_contains
  ON recipes (organization_id) WHERE allergen_pork_contains = TRUE;

-- Composite index: "does this recipe contain ANY of the Big 9 priority allergens?"
CREATE INDEX IF NOT EXISTS idx_recipes_allergen_priority_any
  ON recipes (organization_id)
  WHERE allergen_peanut_contains
     OR allergen_milk_contains
     OR allergen_egg_contains
     OR allergen_wheat_contains
     OR allergen_soy_contains
     OR allergen_treenut_contains
     OR allergen_fish_contains
     OR allergen_shellfish_contains
     OR allergen_sesame_contains;

-- Freshness index: recipes with stale allergen declarations
CREATE INDEX IF NOT EXISTS idx_recipes_allergen_declared_at
  ON recipes (organization_id, allergen_declared_at)
  WHERE allergen_declared_at IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN recipes.allergen_peanut_contains IS 'Recipe contains peanut allergen (auto-cascaded from ingredients + manual overrides)';
COMMENT ON COLUMN recipes.allergen_peanut_may_contain IS 'Recipe may contain peanut (supplier cross-contamination warnings)';
COMMENT ON COLUMN recipes.allergen_peanut_environment IS 'Recipe has peanut cross-contact risk from kitchen environment/station';
COMMENT ON COLUMN recipes.allergen_declared_at IS 'When allergens were last reviewed and confirmed. Card displays: current to MM/DD/YYYY';
