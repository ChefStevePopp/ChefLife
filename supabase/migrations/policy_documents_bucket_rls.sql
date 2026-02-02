-- =====================================================================
-- Policy Documents Bucket - Storage & RLS Policies
-- =====================================================================
-- Bucket: policy-documents
-- Purpose: Store HR policy PDF documents with organization-scoped access
-- Path Structure: {organizationId}/policies/{timestamp}_{filename}.pdf
-- =====================================================================

-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'policy-documents',
  'policy-documents',
  false,  -- Private bucket
  10485760,  -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- DROP EXISTING POLICIES (clean slate)
-- =====================================================================
DROP POLICY IF EXISTS "policy_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "policy_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "policy_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "policy_documents_delete" ON storage.objects;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================
-- Access Rules:
--   SELECT: Org members (any security level) + Omega (dev) users
--   INSERT: Alpha/Bravo (security_level <= 2) + Omega
--   UPDATE: Alpha/Bravo + Omega
--   DELETE: Alpha/Bravo + Omega
--
-- Note: security_level lives on organization_team_members
--       Link to auth.uid() via email match to auth.users
-- =====================================================================

-- Policy 1: SELECT (Read Access)
-- All organization members can view their org's policy documents
-- Omega users (developers) can view all policy documents
CREATE POLICY "policy_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND (
    -- Organization members can read their org's docs (any security level)
    (storage.foldername(name))[1] IN (
      SELECT otm.organization_id::text
      FROM organization_team_members otm
      INNER JOIN auth.users au ON au.email = otm.email
      WHERE au.id = auth.uid()
    )
    -- Omega users (dev) can read all
    OR (auth.jwt() ->> 'system_role' = 'dev')
    OR (auth.jwt() -> 'user_metadata' ->> 'system_role' = 'dev')
  )
);

-- Policy 2: INSERT (Upload Access)
-- Alpha/Bravo users (security_level <= 2) can upload to their organization's folder
-- Omega users can upload to any organization
CREATE POLICY "policy_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents'
  AND (
    -- Alpha/Bravo (security_level <= 2) can upload to their org
    (storage.foldername(name))[1] IN (
      SELECT otm.organization_id::text
      FROM organization_team_members otm
      INNER JOIN auth.users au ON au.email = otm.email
      WHERE au.id = auth.uid()
      AND otm.security_level <= 2
    )
    -- Omega users can upload anywhere
    OR (auth.jwt() ->> 'system_role' = 'dev')
    OR (auth.jwt() -> 'user_metadata' ->> 'system_role' = 'dev')
  )
);

-- Policy 3: UPDATE (Modify Access)
-- Alpha/Bravo users can update their organization's documents
-- Omega users can update any document
CREATE POLICY "policy_documents_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT otm.organization_id::text
      FROM organization_team_members otm
      INNER JOIN auth.users au ON au.email = otm.email
      WHERE au.id = auth.uid()
      AND otm.security_level <= 2
    )
    OR (auth.jwt() ->> 'system_role' = 'dev')
    OR (auth.jwt() -> 'user_metadata' ->> 'system_role' = 'dev')
  )
);

-- Policy 4: DELETE (Delete Access)
-- Alpha/Bravo users can delete from their organization's folder
-- Omega users can delete from any organization
CREATE POLICY "policy_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT otm.organization_id::text
      FROM organization_team_members otm
      INNER JOIN auth.users au ON au.email = otm.email
      WHERE au.id = auth.uid()
      AND otm.security_level <= 2
    )
    OR (auth.jwt() ->> 'system_role' = 'dev')
    OR (auth.jwt() -> 'user_metadata' ->> 'system_role' = 'dev')
  )
);
