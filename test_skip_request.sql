-- Test inserting a skip request to see if the table works
-- First, let's check if there are any existing skip requests
SELECT COUNT(*) as total_skip_requests FROM skip_requests;

-- Check if the table structure is correct
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'skip_requests' 
ORDER BY ordinal_position;

-- Test inserting a sample skip request
INSERT INTO skip_requests (user_id, user_email, skip_days, reason, status, created_at)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  'test@example.com',
  5,
  'Test skip request for debugging',
  'pending',
  CURRENT_TIMESTAMP
);

-- Check if the insert worked
SELECT * FROM skip_requests ORDER BY created_at DESC LIMIT 5;