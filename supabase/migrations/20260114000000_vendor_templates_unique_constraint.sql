-- Add unique constraint for vendor_templates upsert
-- Allows one template per org + vendor + file_type combination

ALTER TABLE vendor_templates
ADD CONSTRAINT vendor_templates_org_vendor_type_unique
UNIQUE (organization_id, vendor_id, file_type);
