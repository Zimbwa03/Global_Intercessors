-- =====================================================
-- FIX INTERCESSOR SCHEDULE RLS POLICIES
-- =====================================================
-- This script fixes Row Level Security policies for the intercessor schedule system
-- Run this in Supabase SQL Editor if you encounter RLS policy errors

-- =====================================================
-- 1. DROP EXISTING POLICIES
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own schedule" ON intercessor_schedules;
DROP POLICY IF EXISTS "Users can insert own schedule" ON intercessor_schedules;
DROP POLICY IF EXISTS "Users can update own schedule" ON intercessor_schedules;
DROP POLICY IF EXISTS "Users can delete own schedule" ON intercessor_schedules;

DROP POLICY IF EXISTS "Users can view own attendance" ON prayer_attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON prayer_attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON prayer_attendance;
DROP POLICY IF EXISTS "Users can delete own attendance" ON prayer_attendance;

-- =====================================================
-- 2. CREATE PERMISSIVE POLICIES FOR INTERCESSOR_SCHEDULES
-- =====================================================

-- Allow users to view their own schedule
CREATE POLICY "Enable read access for users on own schedule" ON intercessor_schedules
    FOR SELECT USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to insert their own schedule
CREATE POLICY "Enable insert for users on own schedule" ON intercessor_schedules
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to update their own schedule
CREATE POLICY "Enable update for users on own schedule" ON intercessor_schedules
    FOR UPDATE USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to delete their own schedule
CREATE POLICY "Enable delete for users on own schedule" ON intercessor_schedules
    FOR DELETE USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- =====================================================
-- 3. CREATE PERMISSIVE POLICIES FOR PRAYER_ATTENDANCE
-- =====================================================

-- Allow users to view their own attendance
CREATE POLICY "Enable read access for users on own attendance" ON prayer_attendance
    FOR SELECT USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to insert their own attendance
CREATE POLICY "Enable insert for users on own attendance" ON prayer_attendance
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to update their own attendance
CREATE POLICY "Enable update for users on own attendance" ON prayer_attendance
    FOR UPDATE USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- Allow users to delete their own attendance
CREATE POLICY "Enable delete for users on own attendance" ON prayer_attendance
    FOR DELETE USING (
        auth.uid()::text = user_id::text 
        OR 
        auth.uid() = user_id
    );

-- =====================================================
-- 4. GRANT ADDITIONAL PERMISSIONS FOR SERVICE ROLE
-- =====================================================

-- Grant all permissions to service_role (used by supabaseAdmin)
GRANT ALL ON intercessor_schedules TO service_role;
GRANT ALL ON prayer_attendance TO service_role;
GRANT SELECT ON user_attendance_metrics TO service_role;

-- Grant execute permissions on functions to service_role
GRANT EXECUTE ON FUNCTION calculate_current_streak(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_metrics(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_weekly_attendance(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_attendance(UUID, DATE, BOOLEAN, INTEGER, TEXT) TO service_role;

-- =====================================================
-- 5. DISABLE RLS FOR ADMIN OPERATIONS (OPTIONAL)
-- =====================================================
-- Uncomment these lines if you want to completely disable RLS for testing
-- This should only be used temporarily for troubleshooting

-- ALTER TABLE intercessor_schedules DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE prayer_attendance DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. VERIFY POLICIES
-- =====================================================

-- Check that policies are created
SELECT 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('intercessor_schedules', 'prayer_attendance')
ORDER BY tablename, policyname;

-- =====================================================
-- 7. TEST QUERY (Run as authenticated user)
-- =====================================================

-- Test inserting a schedule (replace with actual user ID)
-- INSERT INTO intercessor_schedules (user_id, active_days) 
-- VALUES ('your-user-id-here', ARRAY['monday', 'wednesday', 'friday'])
-- ON CONFLICT (user_id) DO UPDATE SET
--     active_days = EXCLUDED.active_days,
--     updated_at = NOW();

-- =====================================================
-- TROUBLESHOOTING NOTES
-- =====================================================
-- 
-- If you still get RLS errors:
-- 1. Make sure you're using the correct user_id format (UUID)
-- 2. Verify the user exists in auth.users table
-- 3. Check that auth.uid() returns the expected value
-- 4. Consider temporarily disabling RLS for testing
-- 5. Use supabaseAdmin client which bypasses RLS entirely
--
-- =====================================================