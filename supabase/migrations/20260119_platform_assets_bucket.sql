-- =============================================================================
-- PLATFORM ASSETS BUCKET
-- System-wide assets: logos, placeholders, icons
-- Run in Supabase SQL Editor
-- =============================================================================

-- Create platform-assets bucket for system-wide assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-assets',
  'platform-assets',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Anyone can read (public assets)
CREATE POLICY "Public read access for platform assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-assets');

-- RLS Policy: Only authenticated users can upload (dev team)
-- Note: Adjust this based on your auth setup - could restrict to specific roles
CREATE POLICY "Authenticated write access for platform assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'platform-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated update access for platform assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'platform-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated delete access for platform assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'platform-assets' 
  AND auth.role() = 'authenticated'
);
