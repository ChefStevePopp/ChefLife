-- =============================================================================
-- VIM IMPORT ENHANCEMENT: Common Name + Pending Queue + ML Training
-- =============================================================================
-- Date: January 10, 2026
-- Purpose: Enable ML-driven import workflow with Common Name as the linking key
-- =============================================================================

-- =============================================================================
-- PHASE 0: Enable required extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- PHASE 1: Add common_name to master_ingredients
-- =============================================================================
-- Common Name is the kitchen/user language that connects:
-- - Code Groups (same vendor, different codes over time)
-- - Umbrella Groups (same ingredient, different vendors)  
-- - ML training (vendor description → common name mapping)

ALTER TABLE master_ingredients 
ADD COLUMN IF NOT EXISTS common_name TEXT;

-- Index for fast lookups and autocomplete
CREATE INDEX IF NOT EXISTS idx_master_ingredients_common_name 
ON master_ingredients(organization_id, common_name);

-- Index for finding all items with same common name
CREATE INDEX IF NOT EXISTS idx_master_ingredients_common_name_lower 
ON master_ingredients(organization_id, LOWER(common_name));

COMMENT ON COLUMN master_ingredients.common_name IS 
'Kitchen/user language name for the ingredient. Links Code Groups and Umbrella Groups. 
Example: Vendor says "Pork Back Ribs 32-38oz Membrane Off", common_name is "Back Ribs".';

-- =============================================================================
-- PHASE 2: Create pending_import_items table
-- =============================================================================
-- Items flagged during import for later review in MIL
-- Enables non-blocking import workflow ("Skip for Now")

CREATE TABLE IF NOT EXISTS pending_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source tracking
  vendor_id TEXT NOT NULL,
  source_invoice_id UUID REFERENCES vendor_invoices(id) ON DELETE SET NULL,
  import_batch_id UUID REFERENCES vendor_imports(id) ON DELETE SET NULL,
  
  -- Item data from import
  item_code TEXT NOT NULL,
  vendor_description TEXT NOT NULL,
  unit_price NUMERIC(10,4),
  unit_of_measure TEXT,
  
  -- ML suggestions
  suggested_common_name TEXT,
  suggested_category_id UUID REFERENCES food_categories(id),
  suggestion_confidence NUMERIC(3,2), -- 0.00 to 1.00
  similar_items_count INTEGER DEFAULT 0,
  
  -- Resolution tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'created', 'linked', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- If resolved by linking to existing
  linked_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE SET NULL,
  
  -- If resolved by creating new
  created_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicates in same org
  UNIQUE (organization_id, vendor_id, item_code, source_invoice_id)
);

-- Enable RLS
ALTER TABLE pending_import_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's pending items"
  ON pending_import_items FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pending items for their organization"
  ON pending_import_items FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's pending items"
  ON pending_import_items FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their organization's pending items"
  ON pending_import_items FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_pending_import_items_org_status 
ON pending_import_items(organization_id, status);

CREATE INDEX idx_pending_import_items_vendor 
ON pending_import_items(organization_id, vendor_id, status);

-- Updated_at trigger
CREATE TRIGGER update_pending_import_items_updated_at
  BEFORE UPDATE ON pending_import_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE pending_import_items IS 
'Items flagged during VIM import for later review. Enables non-blocking imports.';

-- =============================================================================
-- PHASE 3: Create ML training tables
-- =============================================================================
-- Captures every categorization decision for ML training
-- "Teach it once, never again"

CREATE TABLE IF NOT EXISTS ml_training_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Input (what vendor provides)
  vendor_id TEXT NOT NULL,
  vendor_description TEXT NOT NULL,
  
  -- Output (what user maps to)
  common_name TEXT NOT NULL,
  major_group_id UUID REFERENCES food_category_groups(id),
  category_id UUID REFERENCES food_categories(id),
  sub_category_id UUID REFERENCES food_sub_categories(id),
  
  -- Tracking
  confidence NUMERIC(3,2) NOT NULL DEFAULT 1.00, -- Human-verified = 1.00
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Source reference (which ingredient was this learned from)
  source_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE ml_training_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read access across org for suggestions)
CREATE POLICY "Users can view their organization's ML mappings"
  ON ml_training_mappings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert ML mappings for their organization"
  ON ml_training_mappings FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

-- Indexes for ML queries
CREATE INDEX idx_ml_mappings_vendor_desc 
ON ml_training_mappings(organization_id, vendor_id, LOWER(vendor_description));

CREATE INDEX idx_ml_mappings_common_name 
ON ml_training_mappings(organization_id, LOWER(common_name));

-- Full text search on vendor descriptions
CREATE INDEX idx_ml_mappings_desc_trgm 
ON ml_training_mappings 
USING gin (vendor_description gin_trgm_ops);

COMMENT ON TABLE ml_training_mappings IS 
'ML training data: vendor descriptions mapped to common names and categories.
Every user categorization decision is captured here for future suggestions.';

-- =============================================================================
-- PHASE 4: Create ML feedback table
-- =============================================================================
-- Tracks when suggestions are accepted or corrected

CREATE TABLE IF NOT EXISTS ml_training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- The suggestion that was made
  vendor_description TEXT NOT NULL,
  suggested_common_name TEXT NOT NULL,
  suggested_confidence NUMERIC(3,2),
  
  -- The outcome
  accepted BOOLEAN NOT NULL,
  corrected_common_name TEXT, -- Only if not accepted
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ml_training_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's ML feedback"
  ON ml_training_feedback FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert ML feedback for their organization"
  ON ml_training_feedback FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

COMMENT ON TABLE ml_training_feedback IS 
'Tracks ML suggestion acceptance/rejection for model improvement.';

-- =============================================================================
-- PHASE 5: Helper functions
-- =============================================================================

-- Function to get ML suggestion for a vendor description
CREATE OR REPLACE FUNCTION get_ml_suggestion(
  p_org_id UUID,
  p_vendor_id TEXT,
  p_description TEXT
)
RETURNS TABLE (
  common_name TEXT,
  category_id UUID,
  confidence NUMERIC,
  similar_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.common_name,
    m.category_id,
    AVG(m.confidence)::NUMERIC(3,2) as avg_confidence,
    COUNT(*) as similar_count
  FROM ml_training_mappings m
  WHERE m.organization_id = p_org_id
    AND m.vendor_id = p_vendor_id
    AND similarity(LOWER(m.vendor_description), LOWER(p_description)) > 0.3
  GROUP BY m.common_name, m.category_id
  ORDER BY similar_count DESC, avg_confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get common name suggestions for autocomplete
CREATE OR REPLACE FUNCTION get_common_name_suggestions(
  p_org_id UUID,
  p_search TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  common_name TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.common_name,
    COUNT(*) as usage_count
  FROM master_ingredients mi
  WHERE mi.organization_id = p_org_id
    AND mi.common_name IS NOT NULL
    AND mi.common_name ILIKE '%' || p_search || '%'
  GROUP BY mi.common_name
  ORDER BY usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending item count for MIL badge
CREATE OR REPLACE FUNCTION get_pending_import_count(p_org_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM pending_import_items 
  WHERE organization_id = p_org_id 
    AND status = 'pending';
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- PHASE 6: Update views
-- =============================================================================

-- Add common_name to master_ingredients_with_categories view
-- (View may need recreation depending on existing structure)

-- Create a view for pending items with full details
CREATE OR REPLACE VIEW pending_import_items_detail AS
SELECT 
  p.*,
  vi.invoice_number,
  vi.invoice_date,
  vim.file_name as import_file_name
FROM pending_import_items p
LEFT JOIN vendor_invoices vi ON p.source_invoice_id = vi.id
LEFT JOIN vendor_imports vim ON p.import_batch_id = vim.id;

-- =============================================================================
-- DONE
-- =============================================================================
-- Next steps:
-- 1. Update MIL UI to show common_name field
-- 2. Update VIM import to capture common_name on new items
-- 3. Update VIM import to allow "Skip for Now" → pending_import_items
-- 4. Add pending items indicator to MIL
-- 5. Build inline quick-add component for efficient categorization
-- =============================================================================
