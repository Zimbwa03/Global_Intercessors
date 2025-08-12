-- Remove the trigger that creates notifications when skip requests are updated
DROP TRIGGER IF EXISTS notify_skip_request_status ON skip_requests;
DROP FUNCTION IF EXISTS notify_skip_request_status_change();

-- Optional: If you want to see what triggers exist
-- SELECT * FROM information_schema.triggers WHERE event_object_table = 'skip_requests';