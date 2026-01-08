-- Enhance existing health_inspections table
-- Run in Supabase SQL Editor

-- ============================================================================
-- ADD MISSING COLUMNS TO health_inspections
-- ============================================================================

-- Result tracking
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS result TEXT DEFAULT 'passed'
CHECK (result IN ('passed', 'failed', 'conditional', 'pending'));

-- Score and grade
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100);

ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Inspector details
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS inspector_title TEXT;

ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS inspector_organization TEXT;

ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS inspector_phone TEXT;

ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS inspector_email TEXT;

-- Next inspection tracking
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS next_inspection_due DATE;

-- Report document (primary report, separate from documents array)
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS report_url TEXT;

-- Created by user
ALTER TABLE health_inspections 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- HEALTH CERTIFICATES TABLE (if not exists)
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
  jurisdiction TEXT,
  
  -- Document
  image_url TEXT,
  file_path TEXT,
  
  -- Status
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one current certificate per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_certificates_org_current 
  ON health_certificates(organization_id) 
  WHERE is_current = TRUE;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_health_certificates_org 
  ON health_certificates(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY FOR CERTIFICATES
-- ============================================================================
ALTER TABLE health_certificates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view their org certificates" ON health_certificates;
DROP POLICY IF EXISTS "Users can manage their org certificates" ON health_certificates;

CREATE POLICY "Users can view their org certificates" ON health_certificates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their org certificates" ON health_certificates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE TRIGGER FOR CERTIFICATES
-- ============================================================================
CREATE OR REPLACE FUNCTION update_health_certificate_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_certificates_updated_at ON health_certificates;
CREATE TRIGGER health_certificates_updated_at
  BEFORE UPDATE ON health_certificates
  FOR EACH ROW EXECUTE FUNCTION update_health_certificate_timestamp();

-- ============================================================================
-- VERIFY STORAGE BUCKET EXISTS
-- ============================================================================
-- Run this separately if bucket doesn't exist:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('health-inspections', 'health-inspections', true)
-- ON CONFLICT (id) DO NOTHING;
