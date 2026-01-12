-- =============================================================================
-- Migration: Import Version Control
-- =============================================================================
-- Adds versioning support to vendor_imports for audit-compliant corrections
-- Old imports are never deleted, just superseded by newer versions
-- Enables invoice recall flow for edits after confirmation
-- =============================================================================

-- STEP 1: Drop any existing constraint (safety)
ALTER TABLE vendor_imports DROP CONSTRAINT IF EXISTS vendor_imports_status_check;

-- STEP 2: Add versioning columns to vendor_imports
ALTER TABLE vendor_imports 
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES vendor_imports(id),
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invoice_number text; -- Link imports of same invoice

-- STEP 3: Add status constraint with 'superseded'
ALTER TABLE vendor_imports ADD CONSTRAINT vendor_imports_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'superseded'));

-- STEP 4: Create indexes
-- Quick lookup of current (non-superseded) imports for an invoice
CREATE INDEX IF NOT EXISTS idx_vendor_imports_current 
  ON vendor_imports(organization_id, vendor_id, invoice_number) 
  WHERE status != 'superseded' AND invoice_number IS NOT NULL;

-- Version chain traversal
CREATE INDEX IF NOT EXISTS idx_vendor_imports_supersedes 
  ON vendor_imports(supersedes_id) 
  WHERE supersedes_id IS NOT NULL;

-- STEP 5: Documentation
COMMENT ON COLUMN vendor_imports.version IS 'Version number, increments with each correction';
COMMENT ON COLUMN vendor_imports.supersedes_id IS 'Points to the previous version of this import';
COMMENT ON COLUMN vendor_imports.superseded_at IS 'When this import was replaced by a newer version';
COMMENT ON COLUMN vendor_imports.superseded_by IS 'User who created the correcting import';
COMMENT ON COLUMN vendor_imports.invoice_number IS 'Invoice number for grouping versions (from parsed invoice or manual entry)';
