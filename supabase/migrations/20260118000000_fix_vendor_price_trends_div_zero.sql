-- Fix division by zero in vendor_price_trends view
-- When previous_price is 0, we get a division by zero error
-- Using NULLIF to handle this case gracefully

CREATE OR REPLACE VIEW public.vendor_price_trends AS
SELECT
  vph.master_ingredient_id,
  mi.product AS ingredient_name,
  vph.vendor_id,
  vph.price,
  vph.effective_date,
  vph.organization_id,
  LAG(vph.price) OVER (
    PARTITION BY vph.master_ingredient_id, vph.vendor_id
    ORDER BY vph.effective_date
  ) AS previous_price,
  CASE
    WHEN LAG(vph.price) OVER (
      PARTITION BY vph.master_ingredient_id, vph.vendor_id
      ORDER BY vph.effective_date
    ) IS NOT NULL THEN
      -- Use NULLIF to prevent division by zero when previous_price is 0
      COALESCE(
        (vph.price - LAG(vph.price) OVER (
          PARTITION BY vph.master_ingredient_id, vph.vendor_id
          ORDER BY vph.effective_date
        )) / NULLIF(LAG(vph.price) OVER (
          PARTITION BY vph.master_ingredient_id, vph.vendor_id
          ORDER BY vph.effective_date
        ), 0) * 100::numeric,
        -- If previous_price was 0 and current price > 0, return NULL (or we could return a large number)
        NULL
      )
    ELSE 0::numeric
  END AS price_change_percent
FROM
  vendor_price_history vph
  JOIN master_ingredients mi ON vph.master_ingredient_id = mi.id
ORDER BY
  vph.master_ingredient_id,
  vph.vendor_id,
  vph.effective_date DESC;

-- Add comment explaining the fix
COMMENT ON VIEW public.vendor_price_trends IS 'Price trends with percentage change calculation. Returns NULL for price_change_percent when previous price was 0 to avoid division by zero.';
