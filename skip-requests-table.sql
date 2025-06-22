
-- Create skip_requests table for prayer slot skip approval system
CREATE TABLE IF NOT EXISTS skip_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  skip_days INTEGER NOT NULL CHECK (skip_days > 0 AND skip_days <= 30),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Add indexes for better performance
  INDEX idx_skip_requests_user_id ON skip_requests(user_id),
  INDEX idx_skip_requests_status ON skip_requests(status),
  INDEX idx_skip_requests_created_at ON skip_requests(created_at)
);

-- Enable Row Level Security
ALTER TABLE skip_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for skip_requests table
CREATE POLICY "Users can view their own skip requests" ON skip_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own skip requests" ON skip_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Admin policies (replace with actual admin user IDs)
CREATE POLICY "Admins can view all skip requests" ON skip_requests
  FOR ALL USING (
    auth.uid()::text IN (
      'admin-user-id-1',
      'admin-user-id-2'
    )
  );

-- Grant permissions
GRANT ALL ON skip_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE skip_requests_id_seq TO authenticated;

-- Create function to notify users of skip request approval
CREATE OR REPLACE FUNCTION notify_skip_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to send notifications when skip requests are approved/rejected
  -- For now, it just logs the action
  INSERT INTO updates (
    title,
    description,
    type,
    priority,
    is_active,
    created_at
  ) VALUES (
    CASE 
      WHEN NEW.status = 'approved' THEN 'Skip Request Approved'
      ELSE 'Skip Request Update'
    END,
    CASE 
      WHEN NEW.status = 'approved' THEN 'Your ' || NEW.skip_days || '-day skip request has been approved!'
      WHEN NEW.status = 'rejected' THEN 'Your skip request has been reviewed. Please check for details.'
      ELSE 'Your skip request status has been updated.'
    END,
    'skip_approval',
    'normal',
    true,
    CURRENT_TIMESTAMP
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for skip request notifications
CREATE TRIGGER skip_request_notification_trigger
  AFTER UPDATE OF status ON skip_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION notify_skip_request_approval();
