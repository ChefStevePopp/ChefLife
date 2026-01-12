-- =============================================================================
-- CLEANUP: Remove stuck test imports from Highland Packers
-- =============================================================================
-- These are test records stuck in "processing" status from development
-- They never completed and have no real data attached
-- Safe to delete as they're not part of the audit trail
-- =============================================================================

-- First, let's see what we're deleting
SELECT vi.id as import_id, vi.vendor_id, vi.file_name, vi.status, vi.version, vi.created_at,
       vinv.id as invoice_id
FROM vendor_imports vi
LEFT JOIN vendor_invoices vinv ON vinv.import_id = vi.id
WHERE vi.vendor_id = 'HIGHLAND PACKERS'
  AND vi.status = 'processing';

-- Step 1: Delete vendor_invoice_items linked to these invoices
DELETE FROM vendor_invoice_items
WHERE invoice_id IN (
  SELECT vinv.id 
  FROM vendor_invoices vinv
  JOIN vendor_imports vi ON vinv.import_id = vi.id
  WHERE vi.vendor_id = 'HIGHLAND PACKERS'
    AND vi.status = 'processing'
);

-- Step 2: Delete vendor_price_history linked to these imports
DELETE FROM vendor_price_history
WHERE vendor_import_id IN (
  SELECT id FROM vendor_imports
  WHERE vendor_id = 'HIGHLAND PACKERS'
    AND status = 'processing'
);

-- Step 3: Delete vendor_invoices linked to these imports
DELETE FROM vendor_invoices
WHERE import_id IN (
  SELECT id FROM vendor_imports
  WHERE vendor_id = 'HIGHLAND PACKERS'
    AND status = 'processing'
);

-- Step 4: Finally delete the stuck import records
DELETE FROM vendor_imports
WHERE vendor_id = 'HIGHLAND PACKERS'
  AND status = 'processing';

-- Verify cleanup
SELECT COUNT(*) as remaining_highland_packers
FROM vendor_imports
WHERE vendor_id = 'HIGHLAND PACKERS';
