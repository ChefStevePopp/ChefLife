-- =============================================================================
-- VIM INVOICE ITEMS: Order vs Delivery Tracking
-- =============================================================================
-- Migration: Add columns to track what was ordered vs what was delivered
-- Philosophy: "C-suite accounting masquerading as restaurant software"
-- Every discrepancy documented. Every claim defensible.
-- =============================================================================

-- Add order/delivery tracking columns to vendor_invoice_items
ALTER TABLE vendor_invoice_items
ADD COLUMN IF NOT EXISTS quantity_ordered numeric(10,3),
ADD COLUMN IF NOT EXISTS quantity_received numeric(10,3),
ADD COLUMN IF NOT EXISTS discrepancy_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS discrepancy_reason text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS credit_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS credit_status text DEFAULT 'none';

-- Migrate existing data: assume quantity = quantity_received (delivered)
UPDATE vendor_invoice_items 
SET quantity_ordered = quantity,
    quantity_received = quantity
WHERE quantity_ordered IS NULL;

-- Add constraint for discrepancy types
ALTER TABLE vendor_invoice_items
DROP CONSTRAINT IF EXISTS valid_discrepancy_type;

ALTER TABLE vendor_invoice_items
ADD CONSTRAINT valid_discrepancy_type 
CHECK (discrepancy_type IN ('none', 'short', 'over', 'damaged', 'substituted', 'rejected', 'other'));

-- Add constraint for credit status
ALTER TABLE vendor_invoice_items
DROP CONSTRAINT IF EXISTS valid_credit_status;

ALTER TABLE vendor_invoice_items
ADD CONSTRAINT valid_credit_status 
CHECK (credit_status IN ('none', 'requested', 'pending', 'approved', 'denied', 'received'));

-- =============================================================================
-- VENDOR CREDITS TABLE
-- =============================================================================
-- Track credits owed by vendors for shorts, damages, etc.
-- Links back to specific invoice items for audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendor_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id text NOT NULL,
  
  -- Source linkage (audit trail)
  invoice_id uuid REFERENCES vendor_invoices(id) ON DELETE SET NULL,
  invoice_item_id uuid REFERENCES vendor_invoice_items(id) ON DELETE SET NULL,
  
  -- Credit details
  credit_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL,
  reason text NOT NULL,
  discrepancy_type text NOT NULL DEFAULT 'short',
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  
  -- Resolution details
  approved_amount numeric(10,2),
  vendor_reference text,  -- Their credit memo number
  applied_to_invoice text,  -- Which invoice the credit was applied to
  
  -- Notes
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_credit_status CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'applied', 'written_off'))
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendor_credits_org_vendor ON vendor_credits(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_credits_status ON vendor_credits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_credits_invoice ON vendor_credits(invoice_id);

-- RLS
ALTER TABLE vendor_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's credits" ON vendor_credits;
CREATE POLICY "Users can view their organization's credits" ON vendor_credits
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can manage their organization's credits" ON vendor_credits;
CREATE POLICY "Users can manage their organization's credits" ON vendor_credits
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- VIEW: Invoice Items with Discrepancy Summary
-- =============================================================================

CREATE OR REPLACE VIEW vendor_invoice_items_with_discrepancy AS
SELECT 
  vii.*,
  COALESCE(vii.quantity_ordered, vii.quantity) as qty_ordered,
  COALESCE(vii.quantity_received, vii.quantity) as qty_received,
  COALESCE(vii.quantity_ordered, vii.quantity) - COALESCE(vii.quantity_received, vii.quantity) as qty_short,
  CASE 
    WHEN COALESCE(vii.quantity_received, vii.quantity) < COALESCE(vii.quantity_ordered, vii.quantity) THEN 'short'
    WHEN COALESCE(vii.quantity_received, vii.quantity) > COALESCE(vii.quantity_ordered, vii.quantity) THEN 'over'
    ELSE 'match'
  END as computed_discrepancy,
  (COALESCE(vii.quantity_ordered, vii.quantity) - COALESCE(vii.quantity_received, vii.quantity)) * vii.unit_price as short_value
FROM vendor_invoice_items vii;

-- =============================================================================
-- VIEW: Vendor Scorecard (Delivery Performance)
-- =============================================================================

CREATE OR REPLACE VIEW vendor_delivery_scorecard AS
SELECT 
  vi.organization_id,
  vi.vendor_id,
  COUNT(DISTINCT vi.id) as total_invoices,
  COUNT(vii.id) as total_line_items,
  COUNT(CASE WHEN vii.discrepancy_type != 'none' THEN 1 END) as items_with_discrepancy,
  ROUND(
    COUNT(CASE WHEN vii.discrepancy_type != 'none' THEN 1 END)::numeric / 
    NULLIF(COUNT(vii.id), 0) * 100, 
    2
  ) as discrepancy_rate_pct,
  SUM(CASE WHEN vii.discrepancy_type = 'short' 
      THEN (COALESCE(vii.quantity_ordered, vii.quantity) - COALESCE(vii.quantity_received, vii.quantity)) * vii.unit_price 
      ELSE 0 
  END) as total_short_value,
  COUNT(CASE WHEN vii.discrepancy_type = 'short' THEN 1 END) as short_count,
  COUNT(CASE WHEN vii.discrepancy_type = 'damaged' THEN 1 END) as damaged_count,
  COUNT(CASE WHEN vii.discrepancy_type = 'substituted' THEN 1 END) as substituted_count
FROM vendor_invoices vi
LEFT JOIN vendor_invoice_items vii ON vi.id = vii.invoice_id
GROUP BY vi.organization_id, vi.vendor_id;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN vendor_invoice_items.quantity_ordered IS 'Quantity shown on invoice/order';
COMMENT ON COLUMN vendor_invoice_items.quantity_received IS 'Actual quantity delivered (may differ from ordered)';
COMMENT ON COLUMN vendor_invoice_items.discrepancy_type IS 'Type of delivery discrepancy: none, short, over, damaged, substituted, rejected, other';
COMMENT ON COLUMN vendor_invoice_items.discrepancy_reason IS 'Detailed reason for discrepancy';
COMMENT ON COLUMN vendor_invoice_items.notes IS 'Free-text notes (e.g., "Thighs shorted", "Box damaged")';
COMMENT ON COLUMN vendor_invoice_items.credit_requested IS 'Whether a credit has been requested for this item';
COMMENT ON COLUMN vendor_invoice_items.credit_amount IS 'Amount of credit requested/received';
COMMENT ON COLUMN vendor_invoice_items.credit_status IS 'Status of credit: none, requested, pending, approved, denied, received';

COMMENT ON TABLE vendor_credits IS 'Tracks credits owed by vendors for delivery discrepancies. Links to invoice items for complete audit trail.';
COMMENT ON VIEW vendor_delivery_scorecard IS 'Aggregated vendor delivery performance metrics for scorecarding';
