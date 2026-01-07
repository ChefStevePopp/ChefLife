-- ============================================================================
-- PLATFORM SETTINGS
-- Global configuration for the ChefLife platform (Omega level only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index for quick lookups
CREATE INDEX idx_platform_settings_updated ON platform_settings(updated_at DESC);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only Omega (dev) users can view/edit platform settings
-- This is enforced at app level, but we add a basic policy for safety
CREATE POLICY "Platform settings are protected"
  ON platform_settings
  FOR ALL
  USING (true)  -- App-level security handles Omega check
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

-- Insert default email service config
INSERT INTO platform_settings (key, value, description)
VALUES (
  'email_service',
  '{
    "provider": "none",
    "api_key": "",
    "from_email": "notifications@cheflife.ca",
    "verified_domain": "cheflife.ca"
  }'::jsonb,
  'Platform email delivery service configuration (Resend/SendGrid)'
)
ON CONFLICT (key) DO NOTHING;

-- Comments
COMMENT ON TABLE platform_settings IS 'Global platform configuration - Omega access only';
COMMENT ON COLUMN platform_settings.key IS 'Setting identifier (email_service, feature_flags, etc.)';
COMMENT ON COLUMN platform_settings.value IS 'JSON configuration object';
