-- ============================================================================
-- ORGANIZATION COMMUNICATIONS TABLE
-- Stores Nexus broadcast configuration per organization
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS organization_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Event configuration stored as JSONB for flexibility
  -- Structure: { "event_type": { enabled: bool, channels: [], audience: string } }
  broadcast_config JSONB NOT NULL DEFAULT '{}',
  
  -- Global settings
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Delivery preferences
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME,   -- e.g., '07:00'
  timezone TEXT DEFAULT 'America/Toronto',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- One config per organization
  CONSTRAINT unique_org_communications UNIQUE (organization_id)
);

-- Enable RLS
ALTER TABLE organization_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's communications config"
  ON organization_communications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization's communications config"
  ON organization_communications FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organization_team_members otm ON otm.organization_id = om.organization_id 
        AND otm.user_id = om.user_id
      WHERE om.user_id = auth.uid()
        AND otm.security_level <= 1  -- Omega (0) or Alpha (1) only
    )
  );

CREATE POLICY "Admins can insert their organization's communications config"
  ON organization_communications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organization_team_members otm ON otm.organization_id = om.organization_id 
        AND otm.user_id = om.user_id
      WHERE om.user_id = auth.uid()
        AND otm.security_level <= 1  -- Omega (0) or Alpha (1) only
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_organization_communications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_communications_timestamp
  BEFORE UPDATE ON organization_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_communications_timestamp();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_org_communications_org_id 
  ON organization_communications(organization_id);

-- Comment
COMMENT ON TABLE organization_communications IS 'Nexus broadcast configuration - controls what activity events get broadcast to team members and through which channels';
