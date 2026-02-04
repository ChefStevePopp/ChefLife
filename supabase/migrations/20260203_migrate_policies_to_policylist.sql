-- =============================================================================
-- MIGRATION: Move policy documents from modules.hr.config.policies to
--            modules.hr.config.policyList
-- =============================================================================
-- 
-- PROBLEM:
--   The "policies" key was supposed to hold settings:
--     {enabled, policyCategories, defaultRecertificationInterval, ...}
--   But PolicyUploadForm was saving the actual policy documents there too:
--     [{id, title, category, documentUrl, ...}]
--   When Settings saved categories, it spread the array into an object:
--     {"0": {policy}, "policyCategories": [...], "enabled": true}
--   This mangled state caused policies to disappear on subsequent reads.
--
-- FIX:
--   1. Extract PolicyTemplate objects → write to policyList (new canonical key)
--   2. Clean policies key back to settings-only
--   3. Skip orgs where policyList already exists and has data
--
-- HANDLES THREE DATA STATES:
--   A) policies is an array → all entries are PolicyTemplates
--   B) policies is a mangled object → numeric keys are policies, named keys are settings
--   C) policies is a clean settings object → nothing to migrate
--
-- SAFE: Idempotent. Will not overwrite existing policyList data.
-- =============================================================================

DO $$
DECLARE
  org RECORD;
  hr_config JSONB;
  policies_val JSONB;
  existing_policy_list JSONB;
  policy_list JSONB;
  settings_obj JSONB;
  default_settings JSONB;
  key TEXT;
  val JSONB;
  migrated_count INT := 0;
  skipped_count INT := 0;
BEGIN
  RAISE NOTICE '=== HR Policy Migration: policies → policyList ===';

  -- Default settings object for reconstruction
  default_settings := jsonb_build_object(
    'enabled', true,
    'policyCategories', '[]'::jsonb,
    'defaultRecertificationInterval', 'annual',
    'defaultReviewSchedule', 'annual',
    'reminderDaysBefore', '[30, 14, 7, 1]'::jsonb,
    'digitalSignaturesEnabled', true
  );

  FOR org IN
    SELECT id, modules
    FROM organizations
    WHERE modules IS NOT NULL
      AND modules->'hr'->'config' IS NOT NULL
  LOOP
    hr_config := org.modules->'hr'->'config';
    policies_val := hr_config->'policies';
    existing_policy_list := hr_config->'policyList';

    -- GUARD: Skip if policyList already exists with data
    IF existing_policy_list IS NOT NULL
       AND jsonb_typeof(existing_policy_list) = 'array'
       AND jsonb_array_length(existing_policy_list) > 0 THEN
      RAISE NOTICE 'Org %: policyList already has % entries — skipping',
        org.id, jsonb_array_length(existing_policy_list);
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    -- Skip if no policies key at all
    IF policies_val IS NULL THEN
      CONTINUE;
    END IF;

    policy_list := '[]'::jsonb;
    settings_obj := '{}'::jsonb;

    -- =========================================================================
    -- CASE A: policies is a JSON array → all entries are PolicyTemplate docs
    -- =========================================================================
    IF jsonb_typeof(policies_val) = 'array' THEN
      -- Every element that looks like a policy goes to policyList
      FOR val IN SELECT jsonb_array_elements(policies_val)
      LOOP
        IF jsonb_typeof(val) = 'object'
           AND val ? 'id'
           AND val ? 'title' THEN
          policy_list := policy_list || jsonb_build_array(val);
        END IF;
      END LOOP;

      -- Reconstruct settings from defaults (original settings were overwritten)
      settings_obj := default_settings;

    -- =========================================================================
    -- CASE B: policies is a JSON object → may be mangled (mixed policies + settings)
    -- =========================================================================
    ELSIF jsonb_typeof(policies_val) = 'object' THEN
      FOR key, val IN SELECT * FROM jsonb_each(policies_val)
      LOOP
        -- If value is an object with 'id' AND 'title', it's a PolicyTemplate
        IF jsonb_typeof(val) = 'object'
           AND val ? 'id'
           AND val ? 'title' THEN
          policy_list := policy_list || jsonb_build_array(val);
        ELSE
          -- It's a settings key — preserve it
          settings_obj := settings_obj || jsonb_build_object(key, val);
        END IF;
      END LOOP;

      -- Backfill any missing settings keys with defaults
      IF NOT settings_obj ? 'enabled' THEN
        settings_obj := settings_obj || '{"enabled": true}'::jsonb;
      END IF;
      IF NOT settings_obj ? 'defaultRecertificationInterval' THEN
        settings_obj := settings_obj || '{"defaultRecertificationInterval": "annual"}'::jsonb;
      END IF;
      IF NOT settings_obj ? 'defaultReviewSchedule' THEN
        settings_obj := settings_obj || '{"defaultReviewSchedule": "annual"}'::jsonb;
      END IF;
      IF NOT settings_obj ? 'reminderDaysBefore' THEN
        settings_obj := settings_obj || '{"reminderDaysBefore": [30, 14, 7, 1]}'::jsonb;
      END IF;
      IF NOT settings_obj ? 'digitalSignaturesEnabled' THEN
        settings_obj := settings_obj || '{"digitalSignaturesEnabled": true}'::jsonb;
      END IF;
    END IF;

    -- Only write if we found actual policies to migrate
    IF jsonb_array_length(policy_list) > 0 THEN
      UPDATE organizations
      SET
        modules = jsonb_set(
          jsonb_set(
            org.modules,
            '{hr,config,policyList}',
            policy_list
          ),
          '{hr,config,policies}',
          settings_obj
        ),
        updated_at = NOW()
      WHERE id = org.id;

      migrated_count := migrated_count + 1;
      RAISE NOTICE 'Org %: Migrated % policy doc(s) to policyList',
        org.id, jsonb_array_length(policy_list);
    END IF;
  END LOOP;

  RAISE NOTICE '=== Migration complete: % org(s) migrated, % skipped ===',
    migrated_count, skipped_count;
END $$;
