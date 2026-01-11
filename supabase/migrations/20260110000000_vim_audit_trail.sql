-- ============================================================================
-- VIM AUDIT TRAIL MIGRATION
-- ============================================================================
-- Purpose: Establish accounting-grade audit trail for all price changes
-- Principle: Every dollar traceable to a source document
-- ============================================================================

-- ============================================================================
-- PHASE 1: ENHANCE vendor_invoices (Source Documents)
-- ============================================================================

-- Add document storage and verification tracking
ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS document_file_path text,
ADD COLUMN IF NOT EXISTS document_hash text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES vendor_imports(id),
ADD COLUMN IF NOT EXISTS notes text;

-- Add comments for documentation
COMMENT ON COLUMN vendor_invoices.document_file_path IS 'Path to source document in Supabase storage';
COMMENT ON COLUMN vendor_invoices.document_hash IS 'SHA256 hash of source document for integrity verification';
COMMENT ON COLUMN vendor_invoices.created_by IS 'User who imported/created this invoice record';
COMMENT ON COLUMN vendor_invoices.verified_by IS 'User who verified this invoice';
COMMENT ON COLUMN vendor_invoices.verified_at IS 'Timestamp when invoice was verified';
COMMENT ON COLUMN vendor_invoices.import_id IS 'Link to vendor_imports batch record';

-- ============================================================================
-- PHASE 2: ENHANCE vendor_invoice_items (Line Items)
-- ============================================================================

-- Add OCR confidence tracking for automated imports
ALTER TABLE vendor_invoice_items
ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'matched',
ADD COLUMN IF NOT EXISTS match_confidence numeric(5,2),
ADD COLUMN IF NOT EXISTS original_description text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add constraint for match_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_invoice_items_match_status_check'
  ) THEN
    ALTER TABLE vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_match_status_check 
    CHECK (match_status IN ('matched', 'unmatched', 'new_item', 'disputed', 'manual'));
  END IF;
END $$;

COMMENT ON COLUMN vendor_invoice_items.match_status IS 'How this line item was matched to master_ingredients';
COMMENT ON COLUMN vendor_invoice_items.match_confidence IS 'OCR confidence score (0-100) for automated imports';
COMMENT ON COLUMN vendor_invoice_items.original_description IS 'Original description from source document before matching';

-- ============================================================================
-- PHASE 3: ENHANCE vendor_price_history (Audit Trail)
-- ============================================================================

-- Add the critical audit link and source tracking (NO CONSTRAINT YET)
ALTER TABLE vendor_price_history 
ADD COLUMN IF NOT EXISTS invoice_item_id uuid REFERENCES vendor_invoice_items(id),
ADD COLUMN IF NOT EXISTS vendor_import_id uuid REFERENCES vendor_imports(id),
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS previous_price numeric(10,2);

COMMENT ON COLUMN vendor_price_history.invoice_item_id IS 'FK to specific line item - THE AUDIT LINK';
COMMENT ON COLUMN vendor_price_history.vendor_import_id IS 'FK to import batch for legacy data';
COMMENT ON COLUMN vendor_price_history.source_type IS 'Type of source documentation';
COMMENT ON COLUMN vendor_price_history.previous_price IS 'Price before this change';

-- ============================================================================
-- PHASE 4: BACKFILL LEGACY DATA (BEFORE ADDING CONSTRAINT)
-- ============================================================================

-- Mark ALL existing price history as legacy_import first
UPDATE vendor_price_history 
SET source_type = 'legacy_import'
WHERE source_type IS NULL OR source_type NOT IN (
  'legacy_import', 'csv_import', 'pdf_import', 'photo_import', 
  'manual_entry', 'credit_memo', 'system_adjustment'
);

-- Attempt to link legacy records to import batches by date/vendor match
UPDATE vendor_price_history vph
SET vendor_import_id = vi.id
FROM vendor_imports vi
WHERE vph.vendor_id = vi.vendor_id
  AND vph.organization_id = vi.organization_id
  AND DATE(vph.effective_date) = DATE(vi.created_at)
  AND vph.source_type = 'legacy_import'
  AND vph.vendor_import_id IS NULL;

-- ============================================================================
-- PHASE 5: NOW ADD THE CONSTRAINT (after data is clean)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_price_history_source_type_check'
  ) THEN
    ALTER TABLE vendor_price_history
    ADD CONSTRAINT vendor_price_history_source_type_check 
    CHECK (source_type IN (
      'legacy_import',
      'csv_import',
      'pdf_import',
      'photo_import',
      'manual_entry',
      'credit_memo',
      'system_adjustment'
    ));
  END IF;
END $$;

-- Set default for future records
ALTER TABLE vendor_price_history 
ALTER COLUMN source_type SET DEFAULT 'csv_import';

-- ============================================================================
-- PHASE 6: CREATE AUDIT VIEW
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS vendor_price_audit_trail;

-- Create comprehensive audit trail view
CREATE VIEW vendor_price_audit_trail AS
SELECT 
  vph.id as price_history_id,
  vph.organization_id,
  mi.product as ingredient_name,
  mi.item_code,
  vph.vendor_id,
  vph.previous_price,
  vph.price as new_price,
  CASE 
    WHEN vph.previous_price > 0 
    THEN ROUND(((vph.price - vph.previous_price) / vph.previous_price * 100)::numeric, 2)
    ELSE NULL 
  END as price_change_percent,
  vph.effective_date,
  vph.source_type,
  vph.notes as price_notes,
  -- Invoice details (if linked)
  vi.invoice_number,
  vi.invoice_date,
  vi.document_file_path,
  vi.document_hash,
  vi.status as invoice_status,
  vi.verified_at,
  -- Line item details (if linked)
  vii.quantity,
  vii.unit_price as invoice_unit_price,
  vii.match_status,
  vii.match_confidence,
  -- Import batch details (for legacy tracking)
  vim.file_name as import_file_name,
  vim.import_type,
  vim.created_at as import_date,
  -- User tracking
  creator.email as created_by_email,
  verifier.email as verified_by_email,
  -- Audit status
  CASE 
    WHEN vph.invoice_item_id IS NOT NULL THEN 'fully_documented'
    WHEN vph.vendor_import_id IS NOT NULL THEN 'batch_linked'
    ELSE 'legacy_unlinked'
  END as audit_status
FROM vendor_price_history vph
JOIN master_ingredients mi ON vph.master_ingredient_id = mi.id
LEFT JOIN vendor_invoice_items vii ON vph.invoice_item_id = vii.id
LEFT JOIN vendor_invoices vi ON vii.invoice_id = vi.id
LEFT JOIN vendor_imports vim ON vph.vendor_import_id = vim.id
LEFT JOIN auth.users creator ON vi.created_by = creator.id
LEFT JOIN auth.users verifier ON vi.verified_by = verifier.id;

-- Add RLS policy for the view
ALTER VIEW vendor_price_audit_trail OWNER TO postgres;

COMMENT ON VIEW vendor_price_audit_trail IS 'Comprehensive audit trail for all price changes with source documentation';

-- ============================================================================
-- PHASE 7: CREATE AUDIT SUMMARY FUNCTION
-- ============================================================================

-- Function to get audit trail summary for an organization
CREATE OR REPLACE FUNCTION get_price_audit_summary(org_id uuid)
RETURNS TABLE (
  total_price_records bigint,
  fully_documented bigint,
  batch_linked bigint,
  legacy_unlinked bigint,
  documentation_rate numeric
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*) as total_price_records,
    COUNT(*) FILTER (WHERE invoice_item_id IS NOT NULL) as fully_documented,
    COUNT(*) FILTER (WHERE invoice_item_id IS NULL AND vendor_import_id IS NOT NULL) as batch_linked,
    COUNT(*) FILTER (WHERE invoice_item_id IS NULL AND vendor_import_id IS NULL) as legacy_unlinked,
    ROUND(
      (COUNT(*) FILTER (WHERE invoice_item_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100),
      2
    ) as documentation_rate
  FROM vendor_price_history
  WHERE organization_id = org_id;
$$;

COMMENT ON FUNCTION get_price_audit_summary IS 'Returns audit trail coverage statistics for an organization';

-- ============================================================================
-- PHASE 8: INDEX FOR PERFORMANCE
-- ============================================================================

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_vendor_price_history_invoice_item 
ON vendor_price_history(invoice_item_id) WHERE invoice_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_price_history_import 
ON vendor_price_history(vendor_import_id) WHERE vendor_import_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_price_history_source_type 
ON vendor_price_history(source_type);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_import 
ON vendor_invoices(import_id) WHERE import_id IS NOT NULL;

-- ============================================================================
-- DONE
-- ============================================================================
-- Migration complete. Next steps:
-- 1. Update import pipeline to create proper invoice/line item records
-- 2. Configure file retention in Supabase storage
-- 3. Add NOT NULL constraint on invoice_item_id after pipeline is updated
-- ============================================================================
