-- =============================================================================
-- VENDOR CONFIGS: Rename photo_enabled to mobile_enabled
-- =============================================================================
-- Photo and Manual were redundant - photos are for audit trail, not a method
-- Mobile = quick mobile workflow (pick vendor → see items → tap qty/price → done)
-- =============================================================================

-- 1. Rename the column
ALTER TABLE public.vendor_configs 
  RENAME COLUMN photo_enabled TO mobile_enabled;

-- 2. Drop old check constraint
ALTER TABLE public.vendor_configs 
  DROP CONSTRAINT IF EXISTS vendor_configs_invoice_type_check;

-- 3. Add new check constraint with 'mobile' instead of 'photo'
ALTER TABLE public.vendor_configs 
  ADD CONSTRAINT vendor_configs_invoice_type_check CHECK (
    default_invoice_type = ANY (ARRAY['csv', 'pdf', 'manual', 'mobile'])
  );

-- 4. Update any existing 'photo' values to 'mobile'
UPDATE public.vendor_configs 
  SET default_invoice_type = 'mobile' 
  WHERE default_invoice_type = 'photo';

-- 5. Update comments
COMMENT ON COLUMN vendor_configs.mobile_enabled IS 'Whether mobile quick-entry workflow is enabled for this vendor';
