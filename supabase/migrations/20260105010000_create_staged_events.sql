-- ============================================================================
-- STAGED EVENTS TABLE
-- Holds events from CSV import pending approval in Team tab
-- ============================================================================

-- Create staged_events table
CREATE TABLE IF NOT EXISTS staged_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES organization_team_members(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  suggested_points INTEGER NOT NULL,
  description TEXT NOT NULL,
  
  -- Shift context
  event_date DATE NOT NULL,
  role TEXT,
  scheduled_in TIMESTAMPTZ,
  scheduled_out TIMESTAMPTZ,
  worked_in TIMESTAMPTZ,
  worked_out TIMESTAMPTZ,
  start_variance INTEGER, -- minutes
  end_variance INTEGER,   -- minutes
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'import', -- 'import' or 'manual'
  import_batch_id UUID, -- groups events from same import session
  external_employee_id TEXT, -- original ID from CSV for reference
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staged_events_org ON staged_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_staged_events_member ON staged_events(team_member_id);
CREATE INDEX IF NOT EXISTS idx_staged_events_batch ON staged_events(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_staged_events_date ON staged_events(event_date);

-- RLS
ALTER TABLE staged_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see staged events for their organization
CREATE POLICY "Users can view own org staged events"
  ON staged_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert staged events for their organization
CREATE POLICY "Users can insert own org staged events"
  ON staged_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update staged events for their organization
CREATE POLICY "Users can update own org staged events"
  ON staged_events FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete staged events for their organization
CREATE POLICY "Users can delete own org staged events"
  ON staged_events FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE staged_events IS 'Pending attendance events from CSV import awaiting approval';
COMMENT ON COLUMN staged_events.import_batch_id IS 'Groups events from the same import session';
COMMENT ON COLUMN staged_events.external_employee_id IS 'Original employee ID from source system (e.g. 7shifts)';
