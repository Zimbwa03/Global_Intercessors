-- Diagnostic SQL script to test Skip Request functionality
-- Run this in Supabase SQL Editor to verify database setup

-- 1. Check if skip_requests table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'skip_requests' 
ORDER BY ordinal_position;

-- 2. Check if any skip requests exist
SELECT 
  id,
  user_id,
  user_email,
  skip_days,
  reason,
  status,
  admin_comment,
  created_at,
  processed_at
FROM skip_requests 
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check RLS policies on skip_requests table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'skip_requests';

-- 4. Test if we can directly update a skip request (simulating admin action)
-- NOTE: Replace ID 5 with an actual pending skip request ID from step 2
DO $$
DECLARE
  test_id INTEGER := 5; -- Change this to an actual pending request ID
  test_record RECORD;
BEGIN
  -- Check if the record exists and is pending
  SELECT * INTO test_record FROM skip_requests WHERE id = test_id AND status = 'pending';
  
  IF test_record IS NULL THEN
    RAISE NOTICE 'DIAGNOSTIC: No pending skip request found with ID %. Please check step 2 results and update test_id variable.', test_id;
  ELSE
    RAISE NOTICE 'DIAGNOSTIC: Found pending skip request ID % for user %', test_id, test_record.user_id;
    
    -- Test the update (this simulates what the API does)
    UPDATE skip_requests 
    SET 
      status = 'approved',
      admin_comment = 'Diagnostic test approval',
      processed_at = NOW()
    WHERE id = test_id;
    
    RAISE NOTICE 'DIAGNOSTIC: Successfully updated skip request % to approved status', test_id;
    
    -- Revert the change for safety
    UPDATE skip_requests 
    SET 
      status = 'pending',
      admin_comment = NULL,
      processed_at = NULL
    WHERE id = test_id;
    
    RAISE NOTICE 'DIAGNOSTIC: Reverted skip request % back to pending status for safety', test_id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'DIAGNOSTIC ERROR: Failed to update skip request - %', SQLERRM;
END
$$;

-- 5. Check prayer_slots table structure (needed for approval workflow)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'prayer_slots' 
  AND column_name IN ('user_id', 'status', 'skip_start_date', 'skip_end_date', 'updated_at')
ORDER BY ordinal_position;

-- 6. Test prayer slot query for the user (simulating approval workflow)
-- This checks if we can find and update prayer slots
SELECT 
  id,
  user_id,
  user_email,
  slot_time,
  status,
  skip_start_date,
  skip_end_date
FROM prayer_slots 
WHERE user_id IN (
  SELECT DISTINCT user_id FROM skip_requests WHERE status = 'pending' LIMIT 3
)
ORDER BY user_id
LIMIT 3;

-- 7. Check service role permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'skip_requests' 
  AND grantee IN ('service_role', 'authenticated', 'anon');

-- Summary message
DO $$
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC COMPLETE ===';
  RAISE NOTICE 'Review the results above:';
  RAISE NOTICE '1. Table structure should show all required columns';
  RAISE NOTICE '2. Skip requests should show existing data';
  RAISE NOTICE '3. RLS policies should show service_role permissions';
  RAISE NOTICE '4. Update test should show success/failure';
  RAISE NOTICE '5. Prayer slots should show required columns';
  RAISE NOTICE '6. Prayer slot data should show user records';
  RAISE NOTICE '7. Permissions should show service_role access';
END
$$;


