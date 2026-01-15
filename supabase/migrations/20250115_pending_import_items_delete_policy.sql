-- ============================================================================
-- Add DELETE policy for pending_import_items
-- ============================================================================
-- Users need to be able to delete/dismiss items from Triage
-- ============================================================================

-- Drop if exists (idempotent)
DROP POLICY IF EXISTS "pending_import_items_delete_policy" ON pending_import_items;

-- Create DELETE policy
CREATE POLICY "pending_import_items_delete_policy"
  ON pending_import_items 
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));

-- Also ensure UPDATE policy exists for status changes (dismissed)
DROP POLICY IF EXISTS "pending_import_items_update_policy" ON pending_import_items;

CREATE POLICY "pending_import_items_update_policy"
  ON pending_import_items 
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_roles WHERE user_id = auth.uid()
  ));
