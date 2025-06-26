
-- Insert test skip request data
-- First, temporarily disable RLS to insert test data
ALTER TABLE skip_requests DISABLE ROW LEVEL SECURITY;

-- Insert test data
INSERT INTO skip_requests (user_id, user_email, skip_days, reason, status, created_at)
VALUES 
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'test1@example.com', 3, 'Family emergency requiring time off from prayer commitments', 'pending', CURRENT_TIMESTAMP),
  ('223e4567-e89b-12d3-a456-426614174001'::uuid, 'test2@example.com', 7, 'Medical appointment and recovery period', 'approved', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('323e4567-e89b-12d3-a456-426614174002'::uuid, 'test3@example.com', 2, 'Travel for work commitments', 'rejected', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Re-enable RLS
ALTER TABLE skip_requests ENABLE ROW LEVEL SECURITY;

-- Verify the data was inserted
SELECT COUNT(*) as total_records FROM skip_requests;
SELECT * FROM skip_requests ORDER BY created_at DESC;
