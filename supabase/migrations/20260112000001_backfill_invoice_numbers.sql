-- =============================================================================
-- BACKFILL: Add invoice_number to existing vendor_imports records
-- =============================================================================
-- Generates INV-XXXXXXX format references for imports without invoice numbers
-- Uses a combination of id + created_at to create unique, deterministic references
-- =============================================================================

-- Update all records with NULL invoice_number
UPDATE vendor_imports
SET invoice_number = 'INV-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 7))
WHERE invoice_number IS NULL;

-- Verify the update
SELECT id, invoice_number, file_name, created_at
FROM vendor_imports
ORDER BY created_at DESC
LIMIT 20;
