-- Migration: Add purchase_unit_measures to operations_settings
-- Date: 2025-01-11
-- Description: Adds purchase unit measures for vendor invoice entry
--              (Case, Each, kg, lb, Box, Bag, etc.)

ALTER TABLE public.operations_settings
ADD COLUMN IF NOT EXISTS purchase_unit_measures text[] NULL DEFAULT '{}'::text[];

-- Add some sensible defaults for existing organizations
UPDATE public.operations_settings
SET purchase_unit_measures = ARRAY['Case', 'Each', 'kg', 'lb', 'Box', 'Bag', 'Pack', 'Dozen', 'Flat', 'Pail']
WHERE purchase_unit_measures IS NULL OR purchase_unit_measures = '{}';

COMMENT ON COLUMN public.operations_settings.purchase_unit_measures IS 'Unit measures for vendor invoice line items (Case, kg, lb, etc.)';
