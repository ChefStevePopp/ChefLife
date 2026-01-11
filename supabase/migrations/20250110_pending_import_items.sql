-- ============================================================================
-- PENDING IMPORT ITEMS TABLE - Stage 2 VIM Import Flow
-- ============================================================================

-- Create the table (if not exists)
CREATE TABLE IF NOT EXISTS pending_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_import_id UUID REFERENCES vendor_imports(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price DECIMAL(10,4),
  unit_of_measure TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  completed_ingredient_id UUID REFERENCES master_ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id)
);

-- Constraints and indexes
ALTER TABLE pending_import_items DROP CONSTRAINT IF EXISTS pending_import_items_organization_id_vendor_id_item_code_st_key;
ALTER TABLE pending_import_items ADD CONSTRAINT pending_import_items_organization_id_vendor_id_item_code_st_key 
  UNIQUE(organization_id, vendor_id, item_code, status);

CREATE INDEX IF NOT EXISTS idx_pending_import_items_org_status ON pending_import_items(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_import_items_vendor ON pending_import_items(vendor_id, status);

-- RLS
ALTER TABLE pending_import_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_import_items_select_policy" ON pending_import_items;
DROP POLICY IF EXISTS "pending_import_items_insert_policy" ON pending_import_items;
DROP POLICY IF EXISTS "pending_import_items_update_policy" ON pending_import_items;

CREATE POLICY "pending_import_items_select_policy"
  ON pending_import_items FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "pending_import_items_insert_policy"
  ON pending_import_items FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "pending_import_items_update_policy"
  ON pending_import_items FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS pending_import_items_updated_at ON pending_import_items;
DROP FUNCTION IF EXISTS update_pending_import_items_updated_at();

CREATE FUNCTION update_pending_import_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_import_items_updated_at
  BEFORE UPDATE ON pending_import_items
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_import_items_updated_at();
