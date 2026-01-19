-- =============================================================================
-- PRICE HISTORY DATA INTEGRITY DIAGNOSTICS
-- =============================================================================
-- Run these queries against your Alpha database to identify data quality issues
-- Created: January 19, 2026
-- Context: After discovering $0.00 prices polluting price history
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SUSPICIOUS PRICES: Find $0.00 or negative prices in history
-- -----------------------------------------------------------------------------
-- These should NOT exist - they indicate shorted/damaged items that weren't flagged
SELECT 
  vph.id,
  vph.effective_date,
  vph.price as new_price,
  vph.previous_price,
  mi.item_code,
  mi.product,
  v.name as vendor_name
FROM vendor_price_history vph
LEFT JOIN master_ingredients mi ON mi.id = vph.master_ingredient_id
LEFT JOIN vendors v ON v.id = vph.vendor_id
WHERE vph.price <= 0 
   OR vph.price IS NULL
ORDER BY vph.effective_date DESC;

-- Count of suspicious records
SELECT 
  COUNT(*) as suspicious_price_count,
  COUNT(CASE WHEN price = 0 THEN 1 END) as zero_prices,
  COUNT(CASE WHEN price < 0 THEN 1 END) as negative_prices,
  COUNT(CASE WHEN price IS NULL THEN 1 END) as null_prices
FROM vendor_price_history
WHERE price <= 0 OR price IS NULL;


-- -----------------------------------------------------------------------------
-- 2. ORPHAN RECORDS: Price history without valid audit trail links
-- -----------------------------------------------------------------------------
-- Every price change should link back to an invoice line item
SELECT 
  vph.id,
  vph.effective_date,
  vph.price,
  vph.invoice_item_id,
  vph.vendor_import_id,
  mi.item_code,
  mi.product
FROM vendor_price_history vph
LEFT JOIN master_ingredients mi ON mi.id = vph.master_ingredient_id
WHERE vph.invoice_item_id IS NULL
   OR vph.vendor_import_id IS NULL
ORDER BY vph.effective_date DESC;

-- Count orphan records
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN invoice_item_id IS NULL THEN 1 END) as missing_invoice_item,
  COUNT(CASE WHEN vendor_import_id IS NULL THEN 1 END) as missing_import_link,
  COUNT(CASE WHEN invoice_item_id IS NULL AND vendor_import_id IS NULL THEN 1 END) as completely_orphaned
FROM vendor_price_history;


-- -----------------------------------------------------------------------------
-- 3. DUPLICATE DATES: Same ingredient, same vendor, same date = problem
-- -----------------------------------------------------------------------------
-- Should only have ONE price per ingredient per vendor per day
SELECT 
  master_ingredient_id,
  vendor_id,
  DATE(effective_date) as invoice_date,
  COUNT(*) as record_count,
  ARRAY_AGG(price ORDER BY created_at) as prices,
  ARRAY_AGG(id ORDER BY created_at) as record_ids
FROM vendor_price_history
GROUP BY master_ingredient_id, vendor_id, DATE(effective_date)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, invoice_date DESC;

-- Summary of duplicates
SELECT 
  COUNT(*) as duplicate_date_groups,
  SUM(record_count - 1) as extra_records_to_remove
FROM (
  SELECT 
    master_ingredient_id,
    vendor_id,
    DATE(effective_date) as invoice_date,
    COUNT(*) as record_count
  FROM vendor_price_history
  GROUP BY master_ingredient_id, vendor_id, DATE(effective_date)
  HAVING COUNT(*) > 1
) duplicates;


-- -----------------------------------------------------------------------------
-- 4. EXTREME PRICE CHANGES: Potentially bad data (>100% change)
-- -----------------------------------------------------------------------------
-- Large swings might be legitimate, but worth reviewing
SELECT 
  vph.id,
  vph.effective_date,
  vph.previous_price,
  vph.price as new_price,
  ROUND(((vph.price - vph.previous_price) / NULLIF(vph.previous_price, 0) * 100)::numeric, 1) as change_pct,
  mi.item_code,
  mi.product,
  v.name as vendor_name
FROM vendor_price_history vph
LEFT JOIN master_ingredients mi ON mi.id = vph.master_ingredient_id
LEFT JOIN vendors v ON v.id = vph.vendor_id
WHERE vph.previous_price > 0 
  AND ABS((vph.price - vph.previous_price) / vph.previous_price * 100) > 100
ORDER BY ABS((vph.price - vph.previous_price) / vph.previous_price) DESC
LIMIT 50;


-- -----------------------------------------------------------------------------
-- 5. RECORD COUNT BY INGREDIENT (180 days) - The Canary Check
-- -----------------------------------------------------------------------------
-- Healthy items should have regular price records
-- 0 records = never tracked (might be new)
-- 1-2 records = sparse data
-- 6-12 records = healthy (roughly weekly/biweekly over 6 months)
-- 20+ records = suspicious (too many updates?)
WITH ingredient_counts AS (
  SELECT 
    vph.master_ingredient_id,
    COUNT(*) as record_count_180d,
    MIN(vph.effective_date) as oldest_record,
    MAX(vph.effective_date) as newest_record
  FROM vendor_price_history vph
  WHERE vph.effective_date >= CURRENT_DATE - INTERVAL '180 days'
  GROUP BY vph.master_ingredient_id
)
SELECT 
  mi.item_code,
  mi.product,
  v.name as vendor_name,
  COALESCE(ic.record_count_180d, 0) as record_count_180d,
  ic.oldest_record,
  ic.newest_record,
  mi.current_price
FROM master_ingredients mi
LEFT JOIN ingredient_counts ic ON ic.master_ingredient_id = mi.id
LEFT JOIN vendors v ON v.id = mi.vendor
WHERE mi.current_price > 0  -- Only items with prices
ORDER BY COALESCE(ic.record_count_180d, 0) DESC;

-- Distribution summary
SELECT 
  CASE 
    WHEN record_count_180d = 0 THEN '0 (no history)'
    WHEN record_count_180d BETWEEN 1 AND 2 THEN '1-2 (sparse)'
    WHEN record_count_180d BETWEEN 3 AND 6 THEN '3-6 (light)'
    WHEN record_count_180d BETWEEN 7 AND 12 THEN '7-12 (healthy)'
    WHEN record_count_180d BETWEEN 13 AND 20 THEN '13-20 (frequent)'
    ELSE '20+ (suspicious)'
  END as frequency_bucket,
  COUNT(*) as ingredient_count
FROM (
  SELECT 
    mi.id,
    COALESCE(ic.cnt, 0) as record_count_180d
  FROM master_ingredients mi
  LEFT JOIN (
    SELECT master_ingredient_id, COUNT(*) as cnt
    FROM vendor_price_history
    WHERE effective_date >= CURRENT_DATE - INTERVAL '180 days'
    GROUP BY master_ingredient_id
  ) ic ON ic.master_ingredient_id = mi.id
  WHERE mi.current_price > 0
) counts
GROUP BY 1
ORDER BY 1;


-- -----------------------------------------------------------------------------
-- 6. VENDOR INVOICE ITEMS WITH $0.00 (Source of pollution)
-- -----------------------------------------------------------------------------
-- These are the actual invoice line items that caused bad history
SELECT 
  vii.id,
  vii.created_at,
  vii.unit_price,
  vii.vendor_code,
  vii.original_description,
  vii.match_status,
  vii.discrepancy_type,
  vi.invoice_date,
  v.name as vendor_name
FROM vendor_invoice_items vii
JOIN vendor_invoices vi ON vi.id = vii.invoice_id
LEFT JOIN vendors v ON v.id = vi.vendor_id
WHERE vii.unit_price <= 0
ORDER BY vii.created_at DESC;


-- -----------------------------------------------------------------------------
-- 7. HEALTH SUMMARY: Overall data quality score
-- -----------------------------------------------------------------------------
SELECT 
  (SELECT COUNT(*) FROM vendor_price_history) as total_price_records,
  (SELECT COUNT(*) FROM vendor_price_history WHERE price <= 0) as bad_prices,
  (SELECT COUNT(*) FROM vendor_price_history WHERE invoice_item_id IS NULL) as orphan_records,
  (SELECT COUNT(*) FROM (
    SELECT master_ingredient_id, vendor_id, DATE(effective_date)
    FROM vendor_price_history
    GROUP BY 1, 2, 3
    HAVING COUNT(*) > 1
  ) d) as duplicate_date_groups,
  ROUND(
    (1 - (
      (SELECT COUNT(*) FROM vendor_price_history WHERE price <= 0)::float / 
      NULLIF((SELECT COUNT(*) FROM vendor_price_history), 0)
    )) * 100, 
    1
  ) as data_quality_score_pct;


-- =============================================================================
-- CLEANUP QUERIES (USE WITH CAUTION - BACKUP FIRST!)
-- =============================================================================

-- Delete $0.00 price records (UNCOMMENT TO RUN)
-- DELETE FROM vendor_price_history WHERE price <= 0;

-- Delete duplicate records keeping oldest (UNCOMMENT TO RUN)
-- WITH duplicates AS (
--   SELECT id, ROW_NUMBER() OVER (
--     PARTITION BY master_ingredient_id, vendor_id, DATE(effective_date) 
--     ORDER BY created_at
--   ) as rn
--   FROM vendor_price_history
-- )
-- DELETE FROM vendor_price_history 
-- WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
