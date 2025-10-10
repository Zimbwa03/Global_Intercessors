-- Fix skip request trigger to include date field in updates table
-- This resolves the NOT NULL constraint violation error

DROP TRIGGER IF EXISTS skip_request_notification_trigger ON skip_requests;
DROP FUNCTION IF EXISTS notify_skip_request_approval();

-- Create updated function to notify users of skip request approval with date field
CREATE OR REPLACE FUNCTION notify_skip_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification into updates table with proper date field
  INSERT INTO updates (
    title,
    description,
    date,
    type,
    priority,
    schedule,
    expiry,
    send_notification,
    send_email,
    pin_to_top,
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
    CURRENT_TIMESTAMP,  -- Add date field
    'skip_approval',
    'normal',
    'immediate',
    'never',
    false,
    false,
    false,
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
