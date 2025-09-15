-- Test Attendance Calculation Functions
-- Run this in your Supabase SQL Editor to test the attendance calculation system

-- 1. Test creating sample prayer slot
INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
VALUES 
    ('test-user-123', 'test@example.com', '22:00–22:30', 'active', 0, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- 2. Test creating sample attendance records
INSERT INTO attendance_log (user_id, slot_id, date, status, zoom_join_time, zoom_leave_time, zoom_meeting_id, created_at)
VALUES 
    ('test-user-123', 1, CURRENT_DATE, 'attended', NOW(), NOW() + INTERVAL '30 minutes', 'test-meeting-1', NOW()),
    ('test-user-123', 1, CURRENT_DATE - INTERVAL '1 day', 'attended', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 'test-meeting-2', NOW() - INTERVAL '1 day'),
    ('test-user-123', 1, CURRENT_DATE - INTERVAL '2 days', 'missed', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
    ('test-user-123', 1, CURRENT_DATE - INTERVAL '3 days', 'attended', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '25 minutes', 'test-meeting-3', NOW() - INTERVAL '3 days'),
    ('test-user-123', 1, CURRENT_DATE - INTERVAL '4 days', 'attended', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '35 minutes', 'test-meeting-4', NOW() - INTERVAL '4 days')
ON CONFLICT (user_id, date) DO NOTHING;

-- 3. Test creating sample zoom meeting
INSERT INTO zoom_meetings (meeting_id, meeting_uuid, topic, start_time, end_time, duration, participant_count, processed, zoom_link, created_at)
VALUES 
    ('test-meeting-1', 'test-uuid-1', 'Test Prayer Session', NOW(), NOW() + INTERVAL '1 hour', 60, 5, false, 'https://zoom.us/j/test-meeting-1', NOW())
ON CONFLICT (meeting_id) DO NOTHING;

-- 4. Test attendance rate calculation manually
SELECT 
    'Manual Attendance Calculation' as test_type,
    user_id,
    COUNT(*) as total_days,
    COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended_days,
    COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_days,
    ROUND(
        (COUNT(CASE WHEN status = 'attended' THEN 1 END)::FLOAT / 
         NULLIF(COUNT(*), 0) * 100), 2
    ) as attendance_rate
FROM attendance_log 
WHERE user_id = 'test-user-123'
GROUP BY user_id;

-- 5. Test current streak calculation
WITH attendance_ordered AS (
    SELECT 
        user_id,
        date,
        status,
        ROW_NUMBER() OVER (ORDER BY date DESC) as day_rank
    FROM attendance_log 
    WHERE user_id = 'test-user-123'
    ORDER BY date DESC
),
streak_calculation AS (
    SELECT 
        user_id,
        COUNT(CASE WHEN status = 'attended' AND day_rank <= (
            SELECT MIN(day_rank) 
            FROM attendance_ordered ao2 
            WHERE ao2.user_id = attendance_ordered.user_id 
            AND ao2.status = 'missed'
        ) THEN 1 END) as current_streak
    FROM attendance_ordered
    GROUP BY user_id
)
SELECT 
    'Current Streak Calculation' as test_type,
    user_id,
    COALESCE(current_streak, 0) as current_streak
FROM streak_calculation;

-- 6. Test the get_user_attendance_summary function
SELECT 
    'Function Test' as test_type,
    *
FROM get_user_attendance_summary('test-user-123'::UUID);

-- 7. Test log_zoom_attendance function
SELECT 
    'Log Attendance Test' as test_type,
    log_zoom_attendance(
        'test-user-123'::UUID,
        'test@example.com',
        'test-meeting-5',
        'test-uuid-5',
        '22:00–22:30',
        CURRENT_DATE + INTERVAL '1 day',
        NOW(),
        NOW() + INTERVAL '30 minutes',
        30,
        'manual'
    ) as attendance_id;

-- 8. Test process_zoom_meeting function
SELECT 
    'Process Meeting Test' as test_type,
    process_zoom_meeting(
        'test-meeting-6',
        'test-uuid-6',
        'Another Test Prayer Session',
        NOW(),
        NOW() + INTERVAL '1 hour',
        60,
        8
    ) as meeting_id;

-- 9. Test skip request functionality
INSERT INTO skip_requests (user_id, user_email, skip_days, reason, status, created_at)
VALUES 
    ('test-user-123'::UUID, 'test@example.com', 3, 'Family emergency', 'pending', NOW())
ON CONFLICT DO NOTHING;

-- 10. Final verification - check all data
SELECT 
    'Final Verification' as test_type,
    'prayer_slots' as table_name,
    COUNT(*) as record_count
FROM prayer_slots 
WHERE user_id = 'test-user-123'

UNION ALL

SELECT 
    'Final Verification' as test_type,
    'attendance_log' as table_name,
    COUNT(*) as record_count
FROM attendance_log 
WHERE user_id = 'test-user-123'

UNION ALL

SELECT 
    'Final Verification' as test_type,
    'zoom_meetings' as table_name,
    COUNT(*) as record_count
FROM zoom_meetings 
WHERE meeting_id LIKE 'test-meeting-%'

UNION ALL

SELECT 
    'Final Verification' as test_type,
    'skip_requests' as table_name,
    COUNT(*) as record_count
FROM skip_requests 
WHERE user_id = 'test-user-123'::UUID;

-- 11. Clean up test data (optional - uncomment to clean up)
-- DELETE FROM skip_requests WHERE user_id = 'test-user-123'::UUID;
-- DELETE FROM attendance_log WHERE user_id = 'test-user-123';
-- DELETE FROM zoom_meetings WHERE meeting_id LIKE 'test-meeting-%';
-- DELETE FROM prayer_slots WHERE user_id = 'test-user-123';

