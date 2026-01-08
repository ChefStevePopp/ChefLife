-- Health Inspections Schema
-- Run in Supabase SQL Editor

-- ============================================================================
-- HEALTH INSPECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Inspection Details
  inspection_date DATE NOT NULL,
  time_start TIME,
  time_end TIME,
  
  -- Inspector Info
  inspector_name TEXT,
  inspector_title TEXT,
  inspector_organization TEXT,
  inspector_phone TEXT,
  inspector_email TEXT,
  
  -- Results
  result TEXT NOT NULL CHECK (result IN ('passed', 'failed', 'conditional', 'pending')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  grade TEXT, -- A, B, C, etc. (some jurisdictions use grades)
  
  -- Documentation
  notes TEXT,
  report_url TEXT,
  report_file_path TEXT,
  
  -- Next Inspection
  next_inspection_due DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- INSPECTION ACTION ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES health_inspections(id) ON DELETE CASCADE,
  
  -- Action Item Details
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  due_date DATE,
  
  -- Status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Notes
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- ============================================================================
-- HEALTH CERTIFICATES TABLE (separate from inspections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Certificate Details
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  
  -- Issuing Authority
  issuing_authority TEXT,
  jurisdiction TEXT, -- e.g., "Region of Niagara", "City of Hamilton"
  
  -- Document
  image_url TEXT,
  file_path TEXT,
  
  -- Status
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_health_inspections_org 
  ON health_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_health_inspections_date 
  ON health_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_action_items_inspection 
  ON inspection_action_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_action_items_completed 
  ON inspection_action_items(completed);
CREATE INDEX IF NOT EXISTS idx_health_certificates_org 
  ON health_certificates(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE health_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_certificates ENABLE ROW LEVEL SECURITY;

-- Policies for health_inspections
CREATE POLICY "Users can view their org inspections" ON health_inspections
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert inspections for their org" ON health_inspections
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org inspections" ON health_inspections
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org inspections" ON health_inspections
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for inspection_action_items (inherit from parent inspection)
CREATE POLICY "Users can view action items for their org" ON inspection_action_items
  FOR SELECT USING (
    inspection_id IN (
      SELECT id FROM health_inspections WHERE organization_id IN (
        SELECT organization_id FROM organization_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage action items for their org" ON inspection_action_items
  FOR ALL USING (
    inspection_id IN (
      SELECT id FROM health_inspections WHERE organization_id IN (
        SELECT organization_id FROM organization_team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for health_certificates
CREATE POLICY "Users can view their org certificates" ON health_certificates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their org certificates" ON health_certificates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_team_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_inspections_updated_at
  BEFORE UPDATE ON health_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inspection_action_items_updated_at
  BEFORE UPDATE ON inspection_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER health_certificates_updated_at
  BEFORE UPDATE ON health_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STORAGE BUCKET (run separately if needed)
-- ============================================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('health-inspections', 'health-inspections', true)
-- ON CONFLICT (id) DO NOTHING;
