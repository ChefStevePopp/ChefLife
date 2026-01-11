-- Run this FIRST to clean up existing policies
-- Copy and paste into Supabase SQL editor

-- List all policies on the table first (run this SELECT to see them)
SELECT policyname FROM pg_policies WHERE tablename = 'pending_import_items';

-- Then drop them all by running this:
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'pending_import_items'
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON pending_import_items';
  END LOOP;
END $$;
