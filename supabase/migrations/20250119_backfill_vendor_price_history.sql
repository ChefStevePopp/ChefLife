-- =============================================================================
-- BACKFILL VENDOR PRICE HISTORY
-- =============================================================================
-- Issue: Ingredients created via Triage flow (and some legacy imports) 
-- never got vendor_price_history records created.
-- 
-- This backfills initial price records for any ingredient that:
-- 1. Has a current_price > 0
-- 2. Has no existing vendor_price_history records
-- =============================================================================

INSERT INTO vendor_price_history (
  organization_id,
  master_ingredient_id,
  vendor_id,
  price,
  previous_price,
  effective_date,
  source_type,
  notes,
  created_at
)
SELECT 
  mi.organization_id,
  mi.id AS master_ingredient_id,
  COALESCE(mi.vendor, 'UNKNOWN') AS vendor_id,
  mi.current_price AS price,
  NULL AS previous_price,  -- First record, no previous
  COALESCE(mi.updated_at, mi.created_at, NOW()) AS effective_date,
  'legacy_import' AS source_type,
  'Backfilled from existing ingredient - no original price history' AS notes,
  NOW() AS created_at
FROM master_ingredients mi
WHERE mi.current_price > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM vendor_price_history vph 
    WHERE vph.master_ingredient_id = mi.id
  );

-- Log how many were backfilled
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM vendor_price_history
  WHERE source_type = 'legacy_import'
    AND notes LIKE 'Backfilled from existing ingredient%'
    AND created_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Backfilled % ingredients with initial price history records', backfill_count;
END $$;
