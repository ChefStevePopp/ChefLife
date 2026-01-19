-- ============================================================================
-- RENAME REPORTING & TRACKING COLUMNS FOR CLARITY
-- ============================================================================
-- 
-- Context:
-- The original column names were ambiguous about WHERE and WHY they're used.
-- This migration clarifies the semantic purpose of each column.
--
-- Changes:
--   show_on_dashboard → show_in_price_ticker
--     - Explicit: this controls visibility in the Price Watch Ticker
--     - Not some generic "dashboard" concept
--
--   priority_level → vitals_tier  
--     - This is about operational criticality for BOH Vitals monitoring
--     - User thinks: "How critical is this ingredient to my operation?"
--     - Values: 'standard', 'elevated', 'critical'
--
-- Unchanged (already clear):
--   alert_price_change - triggers NEXUS notifications on price changes
--   alert_low_stock    - triggers NEXUS notifications on low inventory
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename columns in master_ingredients
-- ============================================================================

ALTER TABLE master_ingredients 
  RENAME COLUMN show_on_dashboard TO show_in_price_ticker;

ALTER TABLE master_ingredients 
  RENAME COLUMN priority_level TO vitals_tier;

-- ============================================================================
-- STEP 2: Update indexes (drop old, create new with correct names)
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_master_ingredients_priority;
DROP INDEX IF EXISTS idx_master_ingredients_dashboard;

-- Create new indexes with updated names
CREATE INDEX idx_master_ingredients_vitals_tier 
  ON master_ingredients (vitals_tier) 
  WHERE vitals_tier IN ('critical', 'elevated');

CREATE INDEX idx_master_ingredients_price_ticker 
  ON master_ingredients (show_in_price_ticker) 
  WHERE show_in_price_ticker = true;

-- ============================================================================
-- STEP 3: Recreate vendor_price_history_all view
-- ============================================================================

DROP VIEW IF EXISTS vendor_price_history_all;

CREATE VIEW vendor_price_history_all AS
SELECT
  vph.id,
  vph.organization_id,
  vph.master_ingredient_id,
  vph.vendor_id,
  vph.price AS new_price,
  vph.previous_price AS old_price,
  vph.effective_date,
  vph.source_type,
  vph.created_at,
  LAG(vph.effective_date) OVER (
    PARTITION BY vph.master_ingredient_id, vph.vendor_id
    ORDER BY vph.effective_date
  ) AS previous_effective_date,
  CASE
    WHEN vph.previous_price > 0 
    THEN ROUND((vph.price - vph.previous_price) / vph.previous_price * 100, 2)
    ELSE 0
  END AS change_percent,
  (vph.previous_price IS NOT NULL AND vph.previous_price <> vph.price) AS is_price_change,
  -- Ingredient details
  mi.product AS product_name,
  mi.item_code,
  -- Reporting flags (renamed)
  COALESCE(mi.alert_price_change, false) AS alert_price_change,
  COALESCE(mi.show_in_price_ticker, false) AS show_in_price_ticker,
  COALESCE(mi.vitals_tier, 'standard') AS vitals_tier,
  -- Vendor logo
  vc.logo_url AS vendor_logo_url
FROM vendor_price_history vph
JOIN master_ingredients mi ON vph.master_ingredient_id = mi.id
LEFT JOIN vendor_configs vc ON vph.vendor_id = vc.vendor_id
  AND vph.organization_id = vc.organization_id;

COMMENT ON VIEW vendor_price_history_all IS 
'All price history records with ingredient metadata, reporting flags, and vendor logos. Use for charting full history including stable prices.';

-- ============================================================================
-- STEP 4: Recreate vendor_price_history_enriched view
-- ============================================================================

DROP VIEW IF EXISTS vendor_price_history_enriched;

CREATE VIEW vendor_price_history_enriched AS
SELECT
  vph.id,
  vph.organization_id,
  vph.master_ingredient_id,
  vph.vendor_id,
  vph.price AS new_price,
  vph.previous_price AS old_price,
  vph.effective_date,
  vph.source_type,
  vph.created_at,
  -- Calculate previous date using LAG
  LAG(vph.effective_date) OVER (
    PARTITION BY vph.master_ingredient_id, vph.vendor_id
    ORDER BY vph.effective_date
  ) AS previous_effective_date,
  -- Calculate change percent
  CASE
    WHEN vph.previous_price > 0 
    THEN ROUND((vph.price - vph.previous_price) / vph.previous_price * 100, 2)
    ELSE 0
  END AS change_percent,
  -- Ingredient details
  mi.product AS product_name,
  mi.item_code,
  -- Reporting flags (renamed)
  COALESCE(mi.alert_price_change, false) AS alert_price_change,
  COALESCE(mi.show_in_price_ticker, false) AS show_in_price_ticker,
  COALESCE(mi.vitals_tier, 'standard') AS vitals_tier,
  -- Vendor logo
  vc.logo_url AS vendor_logo_url
FROM vendor_price_history vph
JOIN master_ingredients mi ON vph.master_ingredient_id = mi.id
LEFT JOIN vendor_configs vc ON vph.vendor_id = vc.vendor_id
  AND vph.organization_id = vc.organization_id
WHERE vph.previous_price IS NOT NULL
  AND vph.previous_price <> vph.price;

COMMENT ON VIEW vendor_price_history_enriched IS 
'Price history filtered to only records where price changed. Includes reporting flags and vendor logos. Use for alerts, ticker, and comparisons.';

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT SELECT ON vendor_price_history_all TO authenticated;
GRANT SELECT ON vendor_price_history_enriched TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
--
-- Column Reference (master_ingredients):
--
-- ┌─────────────────────────┬────────────────────────────────────────────────┐
-- │ Column                  │ Purpose                                        │
-- ├─────────────────────────┼────────────────────────────────────────────────┤
-- │ show_in_price_ticker    │ Display in Price Watch Ticker (visibility)     │
-- │ alert_price_change      │ NEXUS notification on price changes            │
-- │ alert_low_stock         │ NEXUS notification on low inventory            │
-- │ vitals_tier             │ BOH Vitals criticality (standard/elevated/     │
-- │                         │ critical) - determines if shown in Vitals      │
-- └─────────────────────────┴────────────────────────────────────────────────┘
--
-- Feature Mapping:
--
-- ┌─────────────────────────┬─────────────────────────┬──────────────────────┐
-- │ Feature                 │ Column                  │ Where It Shows       │
-- ├─────────────────────────┼─────────────────────────┼──────────────────────┤
-- │ Price Watch Ticker      │ show_in_price_ticker    │ Admin Dashboard      │
-- │ Price Change Alerts     │ alert_price_change      │ NEXUS → Activity Log │
-- │ Low Stock Alerts        │ alert_low_stock         │ NEXUS → Activity Log │
-- │ BOH Vitals Cards        │ vitals_tier             │ BOH Vitals Tab       │
-- └─────────────────────────┴─────────────────────────┴──────────────────────┘
--
-- ============================================================================
