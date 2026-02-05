-- =============================================================================
-- CLEANUP: Drop partially-applied Phase 1 objects (safe to run if nothing exists)
-- Run this FIRST, then run the corrected 20260204_create_policies_tables.sql
-- =============================================================================

-- Drop RLS policies (may or may not exist from partial run)
DROP POLICY IF EXISTS "View policies" ON policies;
DROP POLICY IF EXISTS "Manage policies" ON policies;
DROP POLICY IF EXISTS "View policy_acknowledgments" ON policy_acknowledgments;
DROP POLICY IF EXISTS "Manage policy_acknowledgments" ON policy_acknowledgments;
DROP POLICY IF EXISTS "Self acknowledge policies" ON policy_acknowledgments;

-- Drop triggers
DROP TRIGGER IF EXISTS policies_updated_at ON policies;
DROP TRIGGER IF EXISTS policy_acknowledgments_updated_at ON policy_acknowledgments;

-- Drop function
DROP FUNCTION IF EXISTS update_policies_updated_at();

-- Drop tables (acknowledgments first — FK dependency)
DROP TABLE IF EXISTS policy_acknowledgments;
DROP TABLE IF EXISTS policies;

-- Verify clean
DO $$
BEGIN
  RAISE NOTICE '✓ Cleanup complete — ready for corrected migration';
END $$;
