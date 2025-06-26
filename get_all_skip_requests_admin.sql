-- Create a service function to get all skip requests for admin (bypasses RLS)
CREATE OR REPLACE FUNCTION get_all_skip_requests_admin()
RETURNS TABLE (
  id INTEGER,
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
    sr.id,
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