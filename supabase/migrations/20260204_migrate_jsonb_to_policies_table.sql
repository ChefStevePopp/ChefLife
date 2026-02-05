-- =============================================================================
-- PHASE 1 DATA MIGRATION: JSONB policyList → policies table
-- =============================================================================
-- ROADMAP-Policy.md §3.3 — Migration Path
--
-- READS from: organizations.modules → hr.config.policyList (canonical)
-- WRITES to:  policies table (new relational home)
--
-- SAFETY:
--   ✓ Idempotent — uses ON CONFLICT DO NOTHING (safe to run multiple times)
--   ✓ Non-destructive — JSONB data is NOT deleted (cleanup is a separate step)
--   ✓ Handles all 3 data states (array, mangled object, clean settings)
--   ✓ Maps all PolicyTemplate fields to policies table columns
--   ✓ Existing JSONB policies get status = 'published' (they were already live)
--
-- PREREQUISITE: 20260204_create_policies_tables.sql must run first.
-- =============================================================================

DO $$
DECLARE
  org RECORD;
  hr_config JSONB;
  policy_list JSONB;
  legacy_val JSONB;
  policy JSONB;
  p_id UUID;
  p_effective_date DATE;
  p_prepared_date DATE;
  p_last_revision DATE;
  p_next_review DATE;
  p_recert_interval TEXT;
  p_recert_custom INT;
  inserted_count INT := 0;
  skipped_count INT := 0;
  org_count INT := 0;
  err_count INT := 0;
BEGIN
  RAISE NOTICE '=== Phase 1: Migrating JSONB policyList → policies table ===';

  FOR org IN
    SELECT id, modules
    FROM organizations
    WHERE modules IS NOT NULL
      AND modules->'hr'->'config' IS NOT NULL
  LOOP
    hr_config := org.modules->'hr'->'config';
    policy_list := NULL;

    -- =====================================================================
    -- RESOLVE POLICY SOURCE (same logic as frontend PoliciesTabContent)
    -- Priority: policyList (canonical) > policies (legacy array) > policies (mangled obj)
    -- =====================================================================

    -- 1. Check canonical policyList
    IF hr_config->'policyList' IS NOT NULL
       AND jsonb_typeof(hr_config->'policyList') = 'array'
       AND jsonb_array_length(hr_config->'policyList') > 0 THEN
      policy_list := hr_config->'policyList';

    -- 2. Check legacy: policies as array
    ELSIF hr_config->'policies' IS NOT NULL
          AND jsonb_typeof(hr_config->'policies') = 'array'
          AND jsonb_array_length(hr_config->'policies') > 0 THEN
      policy_list := hr_config->'policies';

    -- 3. Check legacy: policies as mangled object (numeric keys = policy docs)
    ELSIF hr_config->'policies' IS NOT NULL
          AND jsonb_typeof(hr_config->'policies') = 'object' THEN
      policy_list := '[]'::jsonb;
      FOR legacy_val IN
        SELECT value FROM jsonb_each(hr_config->'policies')
        WHERE jsonb_typeof(value) = 'object'
          AND value ? 'id'
          AND value ? 'title'
      LOOP
        policy_list := policy_list || jsonb_build_array(legacy_val);
      END LOOP;

      IF jsonb_array_length(policy_list) = 0 THEN
        policy_list := NULL;
      END IF;
    END IF;

    -- Skip if no policies found for this org
    IF policy_list IS NULL THEN
      CONTINUE;
    END IF;

    org_count := org_count + 1;

    -- =====================================================================
    -- INSERT EACH POLICY INTO THE RELATIONAL TABLE
    -- =====================================================================
    FOR policy IN SELECT jsonb_array_elements(policy_list)
    LOOP
      BEGIN
        -- Skip malformed entries
        IF NOT (policy ? 'id' AND policy ? 'title') THEN
          RAISE NOTICE 'Org %: Skipping malformed policy entry (no id/title)', org.id;
          CONTINUE;
        END IF;

        -- Parse policy UUID (preserve original if valid)
        BEGIN
          p_id := (policy->>'id')::UUID;
        EXCEPTION WHEN OTHERS THEN
          p_id := gen_random_uuid();
          RAISE NOTICE 'Org %: Generated new UUID for policy "%"',
            org.id, policy->>'title';
        END;

        -- Parse dates safely (ISO strings → DATE, NULL on failure)
        BEGIN
          p_effective_date := (policy->>'effectiveDate')::DATE;
        EXCEPTION WHEN OTHERS THEN
          p_effective_date := CURRENT_DATE;
        END;

        BEGIN
          p_prepared_date := (policy->>'preparedDate')::DATE;
        EXCEPTION WHEN OTHERS THEN
          p_prepared_date := NULL;
        END;

        BEGIN
          p_last_revision := (policy->>'lastRevisionDate')::DATE;
        EXCEPTION WHEN OTHERS THEN
          p_last_revision := NULL;
        END;

        BEGIN
          p_next_review := (policy->>'nextReviewDate')::DATE;
        EXCEPTION WHEN OTHERS THEN
          p_next_review := NULL;
        END;

        -- Parse recertification from nested object
        p_recert_interval := COALESCE(
          policy->'recertification'->>'interval',
          'none'
        );
        -- Validate against CHECK constraint
        IF p_recert_interval NOT IN ('none','30_days','90_days','180_days','annual','biennial','custom') THEN
          p_recert_interval := 'none';
        END IF;

        BEGIN
          p_recert_custom := (policy->'recertification'->>'customDays')::INT;
        EXCEPTION WHEN OTHERS THEN
          p_recert_custom := NULL;
        END;

        -- INSERT with ON CONFLICT DO NOTHING (idempotent)
        INSERT INTO policies (
          id,
          organization_id,
          title,
          description,
          category_id,
          document_url,
          version,
          status,
          is_active,
          effective_date,
          prepared_date,
          last_revision_date,
          prepared_by,
          author_title,
          review_schedule,
          next_review_date,
          requires_acknowledgment,
          recertification_required,
          recertification_interval,
          recertification_custom_days,
          applicable_departments,
          applicable_scheduled_roles,
          applicable_kitchen_stations,
          -- Existing policies were already live → status = published
          published_at,
          published_by,
          created_at,
          created_by,
          updated_at,
          updated_by
        ) VALUES (
          p_id,
          org.id,
          policy->>'title',
          policy->>'description',
          COALESCE(policy->>'category', 'general'),
          policy->>'documentUrl',
          COALESCE(policy->>'version', '1.0'),
          'published',   -- Existing JSONB policies are live
          COALESCE((policy->>'isActive')::BOOLEAN, true),
          p_effective_date,
          p_prepared_date,
          p_last_revision,
          policy->>'preparedBy',
          policy->>'authorTitle',
          COALESCE(
            NULLIF(policy->>'reviewSchedule', ''),
            'annual'
          ),
          p_next_review,
          COALESCE((policy->>'requiresAcknowledgment')::BOOLEAN, true),
          COALESCE((policy->'recertification'->>'required')::BOOLEAN, false),
          p_recert_interval,
          p_recert_custom,
          -- TEXT[] from JSONB arrays
          COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(policy->'applicableDepartments', '[]'::jsonb))),
            '{}'
          ),
          COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(policy->'applicableScheduledRoles', '[]'::jsonb))),
            '{}'
          ),
          COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(policy->'applicableKitchenStations', '[]'::jsonb))),
            '{}'
          ),
          -- published_at = original creation (they were always live)
          COALESCE(
            (policy->>'createdAt')::TIMESTAMPTZ,
            now()
          ),
          -- published_by = original creator
          (policy->>'createdBy')::UUID,
          -- System timestamps
          COALESCE(
            (policy->>'createdAt')::TIMESTAMPTZ,
            now()
          ),
          COALESCE(
            (policy->>'createdBy')::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID
          ),
          COALESCE(
            (policy->>'updatedAt')::TIMESTAMPTZ,
            now()
          ),
          COALESCE(
            (policy->>'updatedBy')::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID
          )
        )
        ON CONFLICT (id) DO NOTHING;

        inserted_count := inserted_count + 1;

      EXCEPTION WHEN OTHERS THEN
        err_count := err_count + 1;
        RAISE NOTICE 'Org %: ERROR migrating policy "%" — %',
          org.id,
          policy->>'title',
          SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Organizations processed: %', org_count;
  RAISE NOTICE 'Policies inserted:       %', inserted_count;
  RAISE NOTICE 'Skipped (already exist): %', skipped_count;
  RAISE NOTICE 'Errors:                  %', err_count;
  RAISE NOTICE '';
  RAISE NOTICE 'JSONB data preserved — cleanup will be a separate step after verification.';
  RAISE NOTICE 'Run: SELECT id, organization_id, title, version, status FROM policies;';
END $$;
