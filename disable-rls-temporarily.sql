-- =====================================================
-- TEMPORARY RLS DISABLE FOR INTERCESSOR SCHEDULE SYSTEM
-- =====================================================
-- This script temporarily disables RLS to fix the immediate issue
-- Run this in Supabase SQL Editor

-- Disable RLS completely for these tables
ALTER TABLE intercessor_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_attendance DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to all roles
GRANT ALL PRIVILEGES ON intercessor_schedules TO public;
GRANT ALL PRIVILEGES ON prayer_attendance TO public;
GRANT SELECT ON user_attendance_metrics TO public;

-- Grant execute on functions to public
GRANT EXECUTE ON FUNCTION calculate_current_streak(UUID) TO public;
GRANT EXECUTE ON FUNCTION get_user_metrics(UUID) TO public;
GRANT EXECUTE ON FUNCTION get_weekly_attendance(UUID, DATE) TO public;
GRANT EXECUTE ON FUNCTION upsert_attendance(UUID, DATE, BOOLEAN, INTEGER, TEXT) TO public;

-- Test insert to verify it works
-- You can run this to test (replace with actual user ID)
-- INSERT INTO intercessor_schedules (user_id, active_days) 
-- VALUES ('03cad0dc-5f54-41fb-86e3-61800ced0e11', ARRAY['monday', 'wednesday', 'friday'])
-- ON CONFLICT (user_id) DO UPDATE SET
--     active_days = EXCLUDED.active_days,
--     updated_at = NOW();

SELECT 'RLS has been disabled for intercessor schedule system' as status;