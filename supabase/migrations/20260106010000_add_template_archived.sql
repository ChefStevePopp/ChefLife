-- Add is_archived column to email_templates
-- Allows archiving templates without deleting them

ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Index for filtering archived templates
CREATE INDEX IF NOT EXISTS idx_email_templates_archived 
  ON email_templates(organization_id, is_archived);

COMMENT ON COLUMN email_templates.is_archived IS 'Soft delete - archived templates are hidden but not deleted';
