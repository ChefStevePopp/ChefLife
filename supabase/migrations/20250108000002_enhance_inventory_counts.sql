-- ============================================================================
-- ENHANCE INVENTORY COUNTS
-- ============================================================================
-- Adds session linkage, count type, expected/previous quantities for variance
-- calculation, and review audit columns to the existing inventory_counts table.
-- ============================================================================

-- Add session reference
ALTER TABLE inventory_counts 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES inventory_count_sessions(id) ON DELETE SET NULL;

-- Add count type for categorization
ALTER TABLE inventory_counts 
  ADD COLUMN IF NOT EXISTS count_type TEXT CHECK (count_type IN (
    'physical',      -- Standard physical count
    'prep',          -- Prepared item count
    'receiving',     -- Delivery/receiving count
    'spot_check',    -- Variance investigation
    'adjustment'     -- Manager adjustment (with reason)
  )) DEFAULT 'physical';

-- Add expected and previous quantities for variance calculation
ALTER TABLE inventory_counts 
  ADD COLUMN IF NOT EXISTS expected_quantity DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL(10,2);

-- Add review audit trail
ALTER TABLE inventory_counts 
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Add who created the count (different from counted_by in some workflows)
ALTER TABLE inventory_counts 
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Update status constraint to include all workflow states
-- First drop existing constraint, then add new one
DO $$ 
BEGIN
  ALTER TABLE inventory_counts DROP CONSTRAINT IF EXISTS inventory_counts_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE inventory_counts 
  ADD CONSTRAINT inventory_counts_status_check 
    CHECK (status IN ('pending', 'verified', 'approved', 'flagged', 'adjusted', 'completed'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_inventory_counts_session_id ON inventory_counts(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_count_type ON inventory_counts(count_type);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_reviewed ON inventory_counts(reviewed_at) WHERE reviewed_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN inventory_counts.session_id IS 'Links count to a session for grouped inventory events';
COMMENT ON COLUMN inventory_counts.count_type IS 'Type of count: physical, prep, receiving, spot_check, adjustment';
COMMENT ON COLUMN inventory_counts.expected_quantity IS 'Expected quantity based on previous count + purchases - theoretical usage';
COMMENT ON COLUMN inventory_counts.previous_quantity IS 'Quantity from previous count for variance calculation';
COMMENT ON COLUMN inventory_counts.reviewed_by IS 'User who reviewed/approved this count';
COMMENT ON COLUMN inventory_counts.reviewed_at IS 'When this count was reviewed';
COMMENT ON COLUMN inventory_counts.adjustment_reason IS 'Required reason when count is adjusted by reviewer';

-- ============================================================================
-- VIEWS FOR DIFFERENT CONTEXTS
-- ============================================================================

-- View: Pending reviews with variance analysis
CREATE OR REPLACE VIEW inventory_pending_reviews AS
SELECT 
  s.id as session_id,
  s.organization_id,
  s.session_type,
  s.name as session_name,
  s.started_at,
  s.completed_at,
  u_start.raw_user_meta_data->>'name' as started_by_name,
  s.status,
  COUNT(c.id) as total_counts,
  SUM(c.total_value) as total_value,
  SUM(CASE WHEN c.quantity != COALESCE(c.expected_quantity, c.quantity) THEN 1 ELSE 0 END) as items_with_variance,
  SUM((c.quantity - COALESCE(c.expected_quantity, c.quantity)) * c.unit_cost) as variance_value,
  CASE 
    WHEN SUM(c.total_value) > 0 
    THEN ROUND((SUM((c.quantity - COALESCE(c.expected_quantity, c.quantity)) * c.unit_cost) / SUM(c.total_value)) * 100, 2)
    ELSE 0 
  END as variance_percent
FROM inventory_count_sessions s
LEFT JOIN inventory_counts c ON c.session_id = s.id
LEFT JOIN auth.users u_start ON u_start.id = s.started_by
WHERE s.requires_review = true
GROUP BY s.id, s.organization_id, s.session_type, s.name, s.started_at, s.completed_at, 
         u_start.raw_user_meta_data->>'name', s.status;

-- View: Current on-hand quantities (latest approved counts per ingredient)
CREATE OR REPLACE VIEW inventory_current_on_hand AS
SELECT DISTINCT ON (organization_id, master_ingredient_id)
  organization_id,
  master_ingredient_id,
  quantity as on_hand_quantity,
  unit_cost as last_unit_cost,
  total_value,
  count_date as last_counted,
  location,
  status
FROM inventory_counts
WHERE status IN ('approved', 'verified', 'completed')
ORDER BY organization_id, master_ingredient_id, count_date DESC, updated_at DESC;

-- View: Counts ready for review (individual line items in pending sessions)
CREATE OR REPLACE VIEW inventory_counts_for_review AS
SELECT 
  c.id as count_id,
  c.session_id,
  c.organization_id,
  c.master_ingredient_id,
  mi.product,
  mi.item_code,
  fcg.name as major_group,
  fc.name as category,
  fsc.name as sub_category,
  c.location as storage_area,
  mi.unit_of_measure,
  c.previous_quantity,
  c.quantity as current_count,
  c.expected_quantity,
  c.quantity - COALESCE(c.expected_quantity, c.quantity) as variance,
  CASE 
    WHEN COALESCE(c.expected_quantity, 0) > 0 
    THEN ROUND(((c.quantity - c.expected_quantity) / c.expected_quantity) * 100, 2)
    ELSE 0 
  END as variance_percent,
  c.unit_cost,
  c.total_value,
  c.status,
  c.count_date,
  c.counted_by,
  u.raw_user_meta_data->>'name' as counted_by_name,
  c.notes
FROM inventory_counts c
JOIN master_ingredients mi ON mi.id = c.master_ingredient_id
LEFT JOIN food_category_groups fcg ON fcg.id = mi.major_group
LEFT JOIN food_categories fc ON fc.id = mi.category
LEFT JOIN food_sub_categories fsc ON fsc.id = mi.sub_category
LEFT JOIN auth.users u ON u.id = c.counted_by
WHERE c.session_id IN (
  SELECT id FROM inventory_count_sessions WHERE status = 'pending_review'
);

-- Grant permissions on views
GRANT SELECT ON inventory_pending_reviews TO authenticated;
GRANT SELECT ON inventory_current_on_hand TO authenticated;
GRANT SELECT ON inventory_counts_for_review TO authenticated;

COMMENT ON VIEW inventory_pending_reviews IS 'Sessions awaiting approval with aggregated variance data';
COMMENT ON VIEW inventory_current_on_hand IS 'Latest approved on-hand quantity per ingredient';
COMMENT ON VIEW inventory_counts_for_review IS 'Individual counts in pending sessions for review UI';
