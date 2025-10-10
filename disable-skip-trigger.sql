-- Disable the problematic skip request trigger temporarily
-- This allows approve/reject to work while we fix the notification system

DROP TRIGGER IF EXISTS skip_request_notification_trigger ON skip_requests;
DROP FUNCTION IF EXISTS notify_skip_request_approval();

-- Log that the trigger has been removed
SELECT 'Skip request trigger has been disabled - approve/reject will now work' AS status;
