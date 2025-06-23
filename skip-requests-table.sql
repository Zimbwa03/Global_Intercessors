
-- Check if skip_requests table exists and add missing columns if needed
DO $$
BEGIN
    -- Create the table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'skip_requests') THEN
        CREATE TABLE skip_requests (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            user_email TEXT NOT NULL,
            skip_days INTEGER NOT NULL CHECK (skip_days > 0 AND skip_days <= 30),
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            admin_comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP WITH TIME ZONE
        );
    ELSE
        -- Add missing columns if table exists but columns don't
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='user_id') THEN
            ALTER TABLE skip_requests ADD COLUMN user_id UUID NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='user_email') THEN
            ALTER TABLE skip_requests ADD COLUMN user_email TEXT NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='skip_days') THEN
            ALTER TABLE skip_requests ADD COLUMN skip_days INTEGER NOT NULL CHECK (skip_days > 0 AND skip_days <= 30);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='reason') THEN
            ALTER TABLE skip_requests ADD COLUMN reason TEXT NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='status') THEN
            ALTER TABLE skip_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='admin_comment') THEN
            ALTER TABLE skip_requests ADD COLUMN admin_comment TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='created_at') THEN
            ALTER TABLE skip_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='skip_requests' AND column_name='processed_at') THEN
            ALTER TABLE skip_requests ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- Create indexes separately (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_skip_requests_user_id ON skip_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_skip_requests_status ON skip_requests(status);
CREATE INDEX IF NOT EXISTS idx_skip_requests_created_at ON skip_requests(created_at);

-- Enable Row Level Security
ALTER TABLE skip_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own skip requests" ON skip_requests;
DROP POLICY IF EXISTS "Users can create their own skip requests" ON skip_requests;
DROP POLICY IF EXISTS "Admins can view all skip requests" ON skip_requests;

-- Create policies for skip_requests table
CREATE POLICY "Users can view their own skip requests" ON skip_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own skip requests" ON skip_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Admin policies (replace with actual admin user IDs or use admin_users table)
CREATE POLICY "Admins can view all skip requests" ON skip_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

-- Grant permissions
GRANT ALL ON skip_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE skip_requests_id_seq TO authenticated;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS skip_request_notification_trigger ON skip_requests;
DROP FUNCTION IF EXISTS notify_skip_request_approval();

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
