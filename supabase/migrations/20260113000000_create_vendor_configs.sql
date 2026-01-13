-- =============================================================================
-- VENDOR CONFIGS TABLE
-- =============================================================================
-- Stores vendor-level settings separate from templates
-- Templates (in vendor_templates) define HOW to parse files
-- Configs (here) define WHAT methods are enabled and vendor contact info
-- =============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS public.vendor_configs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  vendor_id TEXT NOT NULL,
  
  -- Display
  logo_url TEXT,
  
  -- Enabled invoice types
  csv_enabled BOOLEAN DEFAULT true,
  pdf_enabled BOOLEAN DEFAULT false,
  photo_enabled BOOLEAN DEFAULT false,
  manual_enabled BOOLEAN DEFAULT true,
  default_invoice_type TEXT DEFAULT 'manual',
  
  -- Vendor contact details
  account_number TEXT,
  rep_name TEXT,
  rep_email TEXT,
  rep_phone TEXT,
  
  -- Constraints
  CONSTRAINT vendor_configs_org_vendor_unique UNIQUE(organization_id, vendor_id),
  CONSTRAINT vendor_configs_invoice_type_check CHECK (
    default_invoice_type = ANY (ARRAY['csv', 'pdf', 'photo', 'manual'])
  )
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS vendor_configs_org_idx ON public.vendor_configs(organization_id);

-- Enable RLS
ALTER TABLE public.vendor_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their organization's vendor configs" ON vendor_configs;

-- Create policy using organization_roles (the correct auth table!)
CREATE POLICY "Users can manage their organization's vendor configs"
    ON vendor_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_roles
            WHERE organization_id = vendor_configs.organization_id
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND u.raw_user_meta_data->>'system_role' = 'dev'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_vendor_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendor_configs_updated_at ON vendor_configs;
CREATE TRIGGER vendor_configs_updated_at
  BEFORE UPDATE ON vendor_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_configs_updated_at();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_configs;

-- Comments
COMMENT ON TABLE vendor_configs IS 'Vendor-level settings for invoice import methods and contact info';
COMMENT ON COLUMN vendor_configs.csv_enabled IS 'Whether CSV invoice import is enabled for this vendor';
COMMENT ON COLUMN vendor_configs.pdf_enabled IS 'Whether PDF invoice import is enabled for this vendor';
COMMENT ON COLUMN vendor_configs.photo_enabled IS 'Whether photo/mobile invoice capture is enabled';
COMMENT ON COLUMN vendor_configs.manual_enabled IS 'Whether manual invoice entry is enabled';
COMMENT ON COLUMN vendor_configs.default_invoice_type IS 'Default method when adding invoice from this vendor';
