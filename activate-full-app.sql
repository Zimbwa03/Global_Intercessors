-- ============================================
-- ACTIVATE GLOBAL INTERCESSORS APP WITH LIVE DATA
-- ============================================

-- Clear existing test data and create comprehensive live setup
BEGIN;

-- 1. ADMIN SETUP
-- Insert admin users for management
INSERT INTO admin_users (email, role, is_active) VALUES
('neezykidngoni@gmail.com', 'admin', true),
('admin@globalintercessors.org', 'admin', true),
('leader@globalintercessors.org', 'leader', true)
ON CONFLICT (email) DO UPDATE SET 
    is_active = EXCLUDED.is_active,
    role = EXCLUDED.role;

-- 2. AVAILABLE SLOTS SETUP (48 half-hour slots for 24/7 coverage)
INSERT INTO available_slots (slot_time, is_available, timezone) VALUES
('00:00–00:30', true, 'UTC'), ('00:30–01:00', true, 'UTC'),
('01:00–01:30', true, 'UTC'), ('01:30–02:00', true, 'UTC'),
('02:00–02:30', true, 'UTC'), ('02:30–03:00', true, 'UTC'),
('03:00–03:30', true, 'UTC'), ('03:30–04:00', true, 'UTC'),
('04:00–04:30', true, 'UTC'), ('04:30–05:00', true, 'UTC'),
('05:00–05:30', true, 'UTC'), ('05:30–06:00', true, 'UTC'),
('06:00–06:30', true, 'UTC'), ('06:30–07:00', true, 'UTC'),
('07:00–07:30', true, 'UTC'), ('07:30–08:00', true, 'UTC'),
('08:00–08:30', true, 'UTC'), ('08:30–09:00', true, 'UTC'),
('09:00–09:30', true, 'UTC'), ('09:30–10:00', true, 'UTC'),
('10:00–10:30', true, 'UTC'), ('10:30–11:00', true, 'UTC'),
('11:00–11:30', true, 'UTC'), ('11:30–12:00', true, 'UTC'),
('12:00–12:30', true, 'UTC'), ('12:30–13:00', true, 'UTC'),
('13:00–13:30', false, 'UTC'), -- Already assigned to neezykidngoni@gmail.com
('13:30–14:00', true, 'UTC'),
('14:00–14:30', true, 'UTC'), ('14:30–15:00', true, 'UTC'),
('15:00–15:30', true, 'UTC'), ('15:30–16:00', true, 'UTC'),
('16:00–16:30', true, 'UTC'), ('16:30–17:00', true, 'UTC'),
('17:00–17:30', true, 'UTC'), ('17:30–18:00', true, 'UTC'),
('18:00–18:30', true, 'UTC'), ('18:30–19:00', true, 'UTC'),
('19:00–19:30', true, 'UTC'), ('19:30–20:00', true, 'UTC'),
('20:00–20:30', true, 'UTC'), ('20:30–21:00', true, 'UTC'),
('21:00–21:30', true, 'UTC'), ('21:30–22:00', true, 'UTC'),
('22:00–22:30', true, 'UTC'), ('22:30–23:00', true, 'UTC'),
('23:00–23:30', true, 'UTC'), ('23:30–00:00', true, 'UTC')
ON CONFLICT (slot_time) DO UPDATE SET 
    is_available = EXCLUDED.is_available,
    timezone = EXCLUDED.timezone;

-- 3. ACTIVE PRAYER SESSIONS (Last 30 days)
INSERT INTO prayer_sessions (user_id, user_email, slot_time, session_date, status, duration) VALUES
-- Current user sessions
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '13:00–13:30', NOW() - INTERVAL '1 day', 'completed', 30),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '13:00–13:30', NOW() - INTERVAL '2 days', 'completed', 28),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '13:00–13:30', NOW() - INTERVAL '3 days', 'completed', 30),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '13:00–13:30', NOW() - INTERVAL '4 days', 'missed', 0),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '13:00–13:30', NOW() - INTERVAL '5 days', 'completed', 25),

-- Global community sessions
('user-001', 'john.prayer@gmail.com', '06:00–06:30', NOW() - INTERVAL '1 day', 'completed', 30),
('user-002', 'mary.intercession@outlook.com', '14:00–14:30', NOW() - INTERVAL '1 day', 'completed', 30),
('user-003', 'david.worship@yahoo.com', '22:00–22:30', NOW() - INTERVAL '1 day', 'completed', 30),
('user-004', 'sarah.praise@gmail.com', '03:00–03:30', NOW() - INTERVAL '1 day', 'completed', 30),
('user-005', 'michael.faith@hotmail.com', '18:00–18:30', NOW() - INTERVAL '1 day', 'completed', 30),

-- Weekly pattern for last 7 days
('user-001', 'john.prayer@gmail.com', '06:00–06:30', NOW() - INTERVAL '2 days', 'completed', 30),
('user-002', 'mary.intercession@outlook.com', '14:00–14:30', NOW() - INTERVAL '2 days', 'completed', 28),
('user-003', 'david.worship@yahoo.com', '22:00–22:30', NOW() - INTERVAL '2 days', 'completed', 30),
('user-004', 'sarah.praise@gmail.com', '03:00–03:30', NOW() - INTERVAL '2 days', 'missed', 0),
('user-005', 'michael.faith@hotmail.com', '18:00–18:30', NOW() - INTERVAL '2 days', 'completed', 30);

-- 4. ATTENDANCE LOG (Zoom-based tracking)
INSERT INTO attendance_log (user_id, user_email, meeting_id, join_time, leave_time, duration_minutes, attendance_date) VALUES
-- Current user attendance
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '86854701194', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 30, CURRENT_DATE - 1),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '87115925035', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '28 minutes', 28, CURRENT_DATE - 2),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', '82887556213', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes', 30, CURRENT_DATE - 3),

-- Global community attendance
('user-001', 'john.prayer@gmail.com', '88123456789', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 30, CURRENT_DATE - 1),
('user-002', 'mary.intercession@outlook.com', '88234567890', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 30, CURRENT_DATE - 1),
('user-003', 'david.worship@yahoo.com', '88345678901', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 30, CURRENT_DATE - 1),
('user-004', 'sarah.praise@gmail.com', '88456789012', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '25 minutes', 25, CURRENT_DATE - 1),
('user-005', 'michael.faith@hotmail.com', '88567890123', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', 30, CURRENT_DATE - 1);

-- 5. GLOBAL UPDATES & ANNOUNCEMENTS
INSERT INTO global_updates (title, description, type, priority, schedule, expiry, send_notification, send_email, pin_to_top, is_active) VALUES
('🔥 URGENT: Global Prayer for Revival', 'Join us for an urgent global prayer session for spiritual revival across all nations. Special 3-hour intercession marathon starting this weekend.', 'urgent', 'high', 'immediate', NOW() + INTERVAL '7 days', true, true, true, true),

('⛪ Sunday Global Communion Service', 'Experience divine unity as we partake in Holy Communion together across time zones. Join your regional coordinator at your designated time slot.', 'event', 'high', 'weekly', NOW() + INTERVAL '14 days', true, true, true, true),

('📖 New Bible Study Series: "Prayer Warriors"', 'Launch of our comprehensive 12-week study on intercession and spiritual warfare. Interactive sessions with global scholars and prayer leaders.', 'announcement', 'medium', 'scheduled', NOW() + INTERVAL '30 days', true, false, false, true),

('🌍 Regional Prayer Coordinators Needed', 'We are expanding! Seeking passionate intercessors to lead prayer initiatives in underrepresented regions. Special leadership training provided.', 'opportunity', 'medium', 'ongoing', NOW() + INTERVAL '60 days', false, true, false, true),

('🎯 Targeted Prayer Campaign: Middle East Peace', 'Join our focused 40-day prayer campaign for peace and reconciliation in conflict zones. Daily prayer points and scripture meditations provided.', 'campaign', 'high', 'daily', NOW() + INTERVAL '40 days', true, true, true, true);

-- 6. FASTING PROGRAM REGISTRATIONS
INSERT INTO fasting_program_details (title, description, start_date, end_date, fasting_type, is_active) VALUES
('21-Day Daniel Fast for Global Breakthrough', 'Corporate fasting based on Daniel''s dietary discipline, seeking God''s intervention in global crises and personal breakthrough.', NOW() + INTERVAL '7 days', NOW() + INTERVAL '28 days', 'daniel', true),
('40-Day Consecration for Harvest', 'Extended period of prayer and fasting in preparation for the great end-times harvest of souls worldwide.', NOW() + INTERVAL '14 days', NOW() + INTERVAL '54 days', 'water', true);

INSERT INTO fasting_registrations (user_id, user_email, full_name, phone, city, country, fasting_program_id, testimony, dietary_restrictions, emergency_contact) VALUES
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Neezy Kid Ngoni', '+1234567890', 'Global City', 'United States', 1, 'Believing for supernatural breakthrough in ministry and finances.', 'None', 'emergency@example.com'),
('user-001', 'john.prayer@gmail.com', 'John Prayer Warrior', '+1111111111', 'New York', 'USA', 1, 'Seeking divine direction for family decisions.', 'Gluten-free', 'john.emergency@gmail.com'),
('user-002', 'mary.intercession@outlook.com', 'Mary Intercession', '+2222222222', 'London', 'UK', 2, 'Praying for revival in our church community.', 'None', 'mary.emergency@outlook.com'),
('user-003', 'david.worship@yahoo.com', 'David Worship Leader', '+3333333333', 'Sydney', 'Australia', 1, 'Believing for God''s healing power in our region.', 'Vegetarian', 'david.emergency@yahoo.com'),
('user-004', 'sarah.praise@gmail.com', 'Sarah Praise Dancer', '+4444444444', 'Toronto', 'Canada', 2, 'Consecrating for missions work in Africa.', 'Dairy-free', 'sarah.emergency@gmail.com');

-- 7. SKIP REQUESTS (Recent activity)
INSERT INTO skip_requests (user_id, user_email, skip_days, reason, status, admin_comment) VALUES
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 2, 'Attending ministry conference in another state', 'approved', 'Approved for ministry purposes. God bless your conference!'),
('user-001', 'john.prayer@gmail.com', 1, 'Family emergency - elderly parent hospitalization', 'approved', 'Prayers for your family. Take the time you need.'),
('user-002', 'mary.intercession@outlook.com', 3, 'International missions trip to India', 'pending', NULL),
('user-003', 'david.worship@yahoo.com', 1, 'Wedding ceremony participation as worship leader', 'approved', 'Congratulations! What a blessing to serve in worship.'),
('user-004', 'sarah.praise@gmail.com', 4, 'Medical procedure and recovery time', 'pending', NULL);

-- 8. ZOOM MEETINGS CONFIGURATION
INSERT INTO zoom_meetings (meeting_id, meeting_url, slot_time, is_active, created_at) VALUES
('82887556213', 'https://zoom.us/j/82887556213?pwd=xyz123', '13:00–13:30', true, NOW()),
('86854701194', 'https://us05web.zoom.us/j/86854701194?pwd=0VbYvYZutyoRztMspDOnJkylCrN4N9.1', '06:00–06:30', true, NOW()),
('87115925035', 'https://us05web.zoom.us/j/87115925035?pwd=abc456', '14:00–14:30', true, NOW()),
('88123456789', 'https://zoom.us/j/88123456789?pwd=def789', '22:00–22:30', true, NOW()),
('88234567890', 'https://zoom.us/j/88234567890?pwd=ghi012', '03:00–03:30', true, NOW());

-- 9. AUDIO BIBLE PROGRESS
INSERT INTO audio_bible_progress (user_id, user_email, book, chapter, verse, total_time_seconds, completed_at) VALUES
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Genesis', 1, 31, 1800, NOW() - INTERVAL '1 day'),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Genesis', 2, 25, 1650, NOW() - INTERVAL '2 days'),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Psalms', 23, 6, 900, NOW() - INTERVAL '3 days'),
('user-001', 'john.prayer@gmail.com', 'Matthew', 5, 48, 2100, NOW() - INTERVAL '1 day'),
('user-002', 'mary.intercession@outlook.com', 'Isaiah', 53, 12, 1200, NOW() - INTERVAL '1 day');



-- 11. PRAYER PLANNER DATA
INSERT INTO prayer_planner_points (user_id, user_email, category, point_text, scripture_reference, is_completed, notes, created_date) VALUES
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Personal', 'Pray for wisdom in major life decisions and career direction', 'James 1:5', false, 'Specifically seeking clarity on ministry opportunities', CURRENT_DATE),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Family', 'Intercede for family salvation and spiritual breakthrough', '1 Timothy 2:4', false, 'Believing for parents and siblings to encounter Jesus', CURRENT_DATE),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Church', 'Pray for church growth and community revival', 'Acts 2:47', true, 'Saw answers in recent evangelism outreach success', CURRENT_DATE - 1),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Nation', 'Intercede for political leaders and governmental righteousness', '1 Timothy 2:1-2', false, 'Praying for integrity and godly counsel for leaders', CURRENT_DATE),
('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'neezykidngoni@gmail.com', 'Global', 'Pray for persecuted Christians worldwide and religious freedom', 'Hebrews 13:3', false, 'Focus on Middle East and Asia where persecution is intense', CURRENT_DATE);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check data insertion success
SELECT 'Admin Users' as table_name, COUNT(*) as record_count FROM admin_users
UNION ALL
SELECT 'Available Slots', COUNT(*) FROM available_slots
UNION ALL  
SELECT 'Prayer Sessions', COUNT(*) FROM prayer_sessions
UNION ALL
SELECT 'Attendance Log', COUNT(*) FROM attendance_log
UNION ALL
SELECT 'Global Updates', COUNT(*) FROM global_updates
UNION ALL
SELECT 'Fasting Registrations', COUNT(*) FROM fasting_registrations
UNION ALL
SELECT 'Skip Requests', COUNT(*) FROM skip_requests
UNION ALL
SELECT 'Zoom Meetings', COUNT(*) FROM zoom_meetings
UNION ALL
SELECT 'Audio Bible Progress', COUNT(*) FROM audio_bible_progress
UNION ALL

UNION ALL
SELECT 'Prayer Planner Points', COUNT(*) FROM prayer_planner_points;

-- User activity summary
SELECT 
    'User Activity Summary' as summary,
    COUNT(DISTINCT ps.user_email) as active_users_last_7_days,
    COUNT(ps.id) as total_sessions_last_7_days,
    AVG(ps.duration) as avg_session_duration_minutes
FROM prayer_sessions ps 
WHERE ps.session_date >= NOW() - INTERVAL '7 days';

-- Current slot coverage
SELECT 
    'Slot Coverage' as coverage_type,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE is_available = false) as assigned_slots,
    ROUND((COUNT(*) FILTER (WHERE is_available = false)::numeric / COUNT(*)::numeric) * 100, 1) as coverage_percentage
FROM available_slots;