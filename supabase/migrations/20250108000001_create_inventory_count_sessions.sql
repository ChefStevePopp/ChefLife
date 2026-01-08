-- ============================================================================
-- INVENTORY COUNT SESSIONS
-- ============================================================================
-- Groups individual counts into logical inventory events (full physical, 
-- station prep, receiving, spot checks). Provides workflow control for
-- counts that require review/approval before affecting COGS.
-- ============================================================================

-- Create the sessions table
CREATE TABLE IF NOT EXISTS inventory_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What kind of count session is this?
  session_type TEXT NOT NULL CHECK (session_type IN (
    'full_physical',    -- Sunday night full inventory (requires review)
    'station_prep',     -- Line cook station check (no review needed)
    'receiving',        -- Delivery verification (links to invoice)
    'spot_check',       -- Variance investigation
    'cycle_count'       -- Rotating partial inventory
  )),
  
  -- Human-readable name for this session
  name TEXT,
  description TEXT,
  
  -- Scope (optional filtering for what to count)
  scope_categories UUID[],        -- Which food categories to count
  scope_locations TEXT[],         -- Which storage areas
  scope_vendor UUID,              -- For receiving: which vendor delivery
  scope_invoice_id UUID,          -- For receiving: link to vendor invoice
  
  -- Lifecycle
  started_at TIMESTAMPTZ DEFAULT now(),
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Review workflow (for sessions that require approval)
  requires_review BOOLEAN DEFAULT false,
  status TEXT NOT NULL CHECK (status IN (
    'in_progress',      -- Still counting
    'pending_review',   -- Submitted, awaiting approval
    'approved',         -- Approved by reviewer
    'rejected',         -- Sent back for recount
    'cancelled'         -- Abandoned
  )) DEFAULT 'in_progress',
  
  -- Review audit trail
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Variance summary (calculated on completion)
  total_items_counted INTEGER DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  total_variance_value DECIMAL(12,2) DEFAULT 0,
  items_with_variance INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_count_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View inventory sessions"
  ON inventory_count_sessions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organizationId')::uuid 
      FROM auth.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'system_role' = 'dev'
    )
  );

CREATE POLICY "Manage inventory sessions"
  ON inventory_count_sessions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organizationId')::uuid 
      FROM auth.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'system_role' = 'dev'
    )
  );

-- Indexes
CREATE INDEX idx_inventory_sessions_org_id ON inventory_count_sessions(organization_id);
CREATE INDEX idx_inventory_sessions_status ON inventory_count_sessions(status);
CREATE INDEX idx_inventory_sessions_type ON inventory_count_sessions(session_type);
CREATE INDEX idx_inventory_sessions_started ON inventory_count_sessions(started_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_inventory_count_sessions_updated_at
  BEFORE UPDATE ON inventory_count_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE inventory_count_sessions IS 'Groups inventory counts into logical sessions with workflow control';
COMMENT ON COLUMN inventory_count_sessions.session_type IS 'Type of inventory session - determines workflow and review requirements';
COMMENT ON COLUMN inventory_count_sessions.requires_review IS 'If true, session must be approved before counts affect COGS';
COMMENT ON COLUMN inventory_count_sessions.status IS 'Workflow status: in_progress → pending_review → approved/rejected';

-- Grant permissions
GRANT ALL ON inventory_count_sessions TO authenticated;
GRANT SELECT ON inventory_count_sessions TO anon;
