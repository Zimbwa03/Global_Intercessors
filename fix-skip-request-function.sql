-- Create a function to update skip request status that bypasses RLS
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
  UPDATE skip_requests 
  SET 
    status = new_status,
    admin_comment = comment,
    processed_at = NOW()
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skip request with id % not found', request_id;
  END IF;
END;
$$;