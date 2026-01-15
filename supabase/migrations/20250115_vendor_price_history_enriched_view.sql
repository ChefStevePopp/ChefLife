-- ============================================================================
-- ENHANCE VENDOR PRICE HISTORY VIEW
-- ============================================================================
-- Adds:
-- 1. previous_effective_date - when was the old price from?
-- 2. vendor logo_url - for visual identification
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS vendor_price_history_enriched;

-- Create enhanced view with previous date and logo
CREATE OR REPLACE VIEW vendor_price_history_enriched AS
SELECT 
  vph.id,
  vph.organization_id,
  vph.master_ingredient_id,
  vph.vendor_id,
  vph.price as new_price,
  vph.previous_price as old_price,
  vph.effective_date,
  vph.source_type,
  vph.created_at,
  -- Calculate previous date using LAG
  LAG(vph.effective_date) OVER (
    PARTITION BY vph.master_ingredient_id, vph.vendor_id 
    ORDER BY vph.effective_date
  ) as previous_effective_date,
  -- Calculate change percent
  CASE 
    WHEN vph.previous_price > 0 
    THEN ROUND(((vph.price - vph.previous_price) / vph.previous_price * 100)::numeric, 2)
    ELSE 0 
  END as change_percent,
  -- Ingredient details
  mi.product as product_name,
  mi.item_code,
  -- Vendor logo from configs
  vc.logo_url as vendor_logo_url
FROM vendor_price_history vph
JOIN master_ingredients mi ON vph.master_ingredient_id = mi.id
LEFT JOIN vendor_configs vc ON vph.vendor_id = vc.vendor_id 
  AND vph.organization_id = vc.organization_id
WHERE vph.previous_price IS NOT NULL 
  AND vph.previous_price != vph.price;

-- Add comment
COMMENT ON VIEW vendor_price_history_enriched IS 
'Price history with previous date, change calculations, and vendor logos for display';

-- Grant access (inherits from base table RLS)
GRANT SELECT ON vendor_price_history_enriched TO authenticated;
