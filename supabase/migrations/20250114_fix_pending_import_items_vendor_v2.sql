-- ============================================================================
-- FIX: pending_import_items vendor_id should be TEXT, not UUID
-- ============================================================================
-- Vendors in ChefLife are stored as text[] in operations_settings.vendors
-- There is no vendors table - vendor_id should store the vendor NAME directly
-- ============================================================================

-- Step 1: Drop the view that depends on vendor_id
DROP VIEW IF EXISTS pending_import_items_detail;

-- Step 2: Drop the invalid FK constraint (references non-existent vendors table)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find any FK constraint on vendor_id
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'pending_import_items'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'vendor_id'
    AND tc.table_schema = 'public';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE pending_import_items DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No FK constraint found on vendor_id';
  END IF;
END $$;

-- Step 3: Drop the unique constraint that uses vendor_id
ALTER TABLE pending_import_items 
  DROP CONSTRAINT IF EXISTS pending_import_items_organization_id_vendor_id_item_code_st_key;

-- Step 4: Drop the index that uses vendor_id
DROP INDEX IF EXISTS idx_pending_import_items_vendor;

-- Step 5: Change vendor_id from UUID to TEXT
ALTER TABLE pending_import_items 
  ALTER COLUMN vendor_id TYPE TEXT USING vendor_id::TEXT;

-- Step 6: Rename column to be clearer about what it stores
ALTER TABLE pending_import_items 
  RENAME COLUMN vendor_id TO vendor_name;

-- Step 7: Recreate the unique constraint with new column name
ALTER TABLE pending_import_items 
  ADD CONSTRAINT pending_import_items_org_vendor_item_status_key 
  UNIQUE(organization_id, vendor_name, item_code, status);

-- Step 8: Recreate index with new column name
CREATE INDEX idx_pending_import_items_vendor ON pending_import_items(vendor_name, status);

-- Step 9: Recreate the view with the new column name (vendor_name instead of vendor_id)
CREATE OR REPLACE VIEW pending_import_items_detail AS
SELECT 
    p.id,
    p.organization_id,
    p.vendor_name,  -- Changed from vendor_id
    p.source_invoice_id,
    p.import_batch_id,
    p.item_code,
    p.vendor_description,
    p.unit_price,
    p.unit_of_measure,
    p.suggested_common_name,
    p.suggested_category_id,
    p.suggestion_confidence,
    p.similar_items_count,
    p.status,
    p.resolved_by,
    p.resolved_at,
    p.resolution_notes,
    p.linked_ingredient_id,
    p.created_ingredient_id,
    p.created_at,
    p.updated_at,
    vi.invoice_number,
    vi.invoice_date,
    vim.file_name AS import_file_name
FROM ((pending_import_items p
    LEFT JOIN vendor_invoices vi ON ((p.source_invoice_id = vi.id)))
    LEFT JOIN vendor_imports vim ON ((p.import_batch_id = vim.id)));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After this migration:
-- - vendor_name is TEXT containing the vendor name (e.g., "FLANAGANS")
-- - No FK relationship needed - vendors are text strings from operations_settings
-- - View recreated with vendor_name instead of vendor_id
-- ============================================================================
