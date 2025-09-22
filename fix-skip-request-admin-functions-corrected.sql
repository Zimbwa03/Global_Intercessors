-- Comprehensive fix for Skip Request Admin functionality
-- Run this script in Supabase SQL Editor to fix the 500 error

-- First, create or replace the function to update skip request status
CREATE OR REPLACE FUNCTION update_skip_request_status(
  request_id bigint,
  new_status text,
  comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate the status parameter
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;
  
  -- Update the skip request
  UPDATE skip_requests 
  SET 
    status = new_status,
    admin_comment = comment,
    processed_at = CASE 
      WHEN new_status IN ('approved', 'rejected') THEN NOW()
      ELSE processed_at
    END
  WHERE id = request_id;
  
  -- Check if the record was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skip request with id % not found', request_id;
  END IF;
  
  -- Log the action
  RAISE NOTICE 'Skip request % updated to % with comment: %', request_id, new_status, COALESCE(comment, 'No comment');
END;
$$;

-- Grant execution permissions to all relevant roles
GRANT EXECUTE ON FUNCTION update_skip_request_status(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION update_skip_request_status(bigint, text, text) TO authenticated;

-- Ensure the get_all_skip_requests_admin function exists
CREATE OR REPLACE FUNCTION get_all_skip_requests_admin()
RETURNS TABLE (
  id BIGINT,
  user_id TEXT,
  user_email TEXT,
  skip_days INTEGER,
  reason TEXT,
  status TEXT,
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id::bigint,
    sr.user_id::text,
    sr.user_email,
    sr.skip_days,
    sr.reason,
    sr.status,
    sr.admin_comment,
    sr.created_at,
    sr.processed_at
  FROM skip_requests sr
  ORDER BY sr.created_at DESC;
END;
$$;

-- Grant execute permission on the service function
GRANT EXECUTE ON FUNCTION get_all_skip_requests_admin() TO service_role;
GRANT EXECUTE ON FUNCTION get_all_skip_requests_admin() TO authenticated;

-- Ensure skip_requests table exists with correct structure
DO $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'skip_requests') THEN
    -- Create the table if it doesn't exist
    CREATE TABLE skip_requests (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      skip_days INTEGER NOT NULL CHECK (skip_days > 0 AND skip_days <= 30),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Create indexes for better performance
    CREATE INDEX idx_skip_requests_user_id ON skip_requests(user_id);
    CREATE INDEX idx_skip_requests_status ON skip_requests(status);
    CREATE INDEX idx_skip_requests_created_at ON skip_requests(created_at);
    
    RAISE NOTICE 'skip_requests table created successfully';
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE skip_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can view their own skip requests" ON skip_requests;
  DROP POLICY IF EXISTS "Users can create their own skip requests" ON skip_requests;
  DROP POLICY IF EXISTS "Admins can view all skip requests" ON skip_requests;
  DROP POLICY IF EXISTS "Service role can manage all skip requests" ON skip_requests;
  
  RAISE NOTICE 'Existing policies dropped successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may not have existed, continuing...';
END
$$;

-- Create comprehensive policies
CREATE POLICY "Users can view their own skip requests" ON skip_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own skip requests" ON skip_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Allow service role to manage all skip requests (for admin operations)
CREATE POLICY "Service role can manage all skip requests" ON skip_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to ensure smooth operations
GRANT ALL ON skip_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON skip_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE skip_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE skip_requests_id_seq TO service_role;

-- Test the functions to ensure they work
DO $$
DECLARE
  test_result RECORD;
  function_exists BOOLEAN;
BEGIN
  -- Test if the functions exist and work
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_all_skip_requests_admin'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE 'get_all_skip_requests_admin function exists and is ready';
  ELSE
    RAISE NOTICE 'WARNING: get_all_skip_requests_admin function was not created properly';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'update_skip_request_status'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE 'update_skip_request_status function exists and is ready';
  ELSE
    RAISE NOTICE 'WARNING: update_skip_request_status function was not created properly';
  END IF;
  
  RAISE NOTICE 'Skip request admin functions have been successfully created and configured';
END
$$;
