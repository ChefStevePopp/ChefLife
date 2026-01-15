-- ============================================================================
-- FIX: pending_import_items.vendor_id should be TEXT, not UUID
-- ============================================================================
-- The original migration referenced a 'vendors' table that doesn't exist.
-- Vendors in ChefLife are TEXT strings from operations_settings.vendors[]
-- The working ImportWorkspace code passes vendorId as TEXT (e.g., "HIGHLAND")
-- ============================================================================

-- Step 1: Drop any FK constraint that might exist on vendor_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'pending_import_items'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'vendor_id'
      AND tc.table_schema = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE pending_import_items DROP CONSTRAINT %I', r.constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', r.constraint_name;
  END LOOP;
END $$;

-- Step 2: Ensure vendor_id is TEXT type (not UUID)
-- This handles the case where it might already be text or needs conversion
ALTER TABLE pending_import_items 
  ALTER COLUMN vendor_id TYPE TEXT USING vendor_id::TEXT;

-- Step 3: Recreate the unique constraint (may already exist, so drop first)
ALTER TABLE pending_import_items 
  DROP CONSTRAINT IF EXISTS pending_import_items_organization_id_vendor_id_item_code_st_key;

ALTER TABLE pending_import_items 
  ADD CONSTRAINT pending_import_items_organization_id_vendor_id_item_code_st_key 
  UNIQUE(organization_id, vendor_id, item_code, status);

-- Step 4: Ensure index exists
DROP INDEX IF EXISTS idx_pending_import_items_vendor;
CREATE INDEX idx_pending_import_items_vendor ON pending_import_items(vendor_id, status);

-- ============================================================================
-- RESULT:
-- - vendor_id is TEXT storing vendor name (e.g., "HIGHLAND", "FLANAGANS")
-- - No FK reference to any table
-- - Matches how ImportWorkspace.tsx actually uses it
-- ============================================================================
