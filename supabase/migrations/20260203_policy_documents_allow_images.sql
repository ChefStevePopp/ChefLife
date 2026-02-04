-- =============================================================================
-- Update policy-documents bucket to support category cover images
-- =============================================================================
-- The bucket was created for PDF-only storage. CategoryManager now needs to
-- upload optimized WebP cover images for policy categories.
--
-- Changes:
--   1. Allow image MIME types alongside PDFs
--   2. Ensure bucket is public (category images need public URLs for UI display)
--
-- Path Structure:
--   {orgId}/policies/{timestamp}_{filename}.pdf      (existing - policy PDFs)
--   {orgId}/policy-categories/{categoryId}.webp      (new - category covers)
-- =============================================================================

UPDATE storage.buckets
SET
  public = true,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/gif'
  ]
WHERE id = 'policy-documents';
