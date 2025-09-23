-- ============================================
-- GLOBAL INTERCESSORS APP - PROFESSIONAL PRESENTATION DEMO DATA
-- ============================================
-- This script populates your database with impressive, realistic data
-- for your organization presentation
-- ============================================

-- Clear existing demo data (optional - comment out if you want to keep existing data)
-- DELETE FROM attendance_log WHERE created_at > NOW() - INTERVAL '30 days';
-- DELETE FROM zoom_meetings WHERE created_at > NOW() - INTERVAL '30 days';
-- DELETE FROM prayer_sessions WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- 1. CREATE SAMPLE USER PROFILES (50+ Active Intercessors)
-- ============================================

-- Create diverse user profiles from different countries
INSERT INTO user_profiles (user_id, email, full_name, phone_number, country, city, timezone, prayer_streak_days, total_prayer_minutes, last_active)
VALUES
    -- African Intercessors
    (gen_random_uuid(), 'sarah.johnson@example.com', 'Sarah Johnson', '+27123456789', 'South Africa', 'Cape Town', 'Africa/Johannesburg', 45, 2700, NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), 'john.mukasa@example.com', 'John Mukasa', '+256712345678', 'Uganda', 'Kampala', 'Africa/Kampala', 38, 2280, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'mary.okonkwo@example.com', 'Mary Okonkwo', '+234801234567', 'Nigeria', 'Lagos', 'Africa/Lagos', 52, 3120, NOW() - INTERVAL '3 hours'),
    (gen_random_uuid(), 'david.kimani@example.com', 'David Kimani', '+254712345678', 'Kenya', 'Nairobi', 'Africa/Nairobi', 67, 4020, NOW() - INTERVAL '5 hours'),
    (gen_random_uuid(), 'grace.banda@example.com', 'Grace Banda', '+260971234567', 'Zambia', 'Lusaka', 'Africa/Lusaka', 41, 2460, NOW() - INTERVAL '30 minutes'),
    
    -- American Intercessors
    (gen_random_uuid(), 'michael.smith@example.com', 'Michael Smith', '+14155551234', 'USA', 'San Francisco', 'America/Los_Angeles', 89, 5340, NOW() - INTERVAL '4 hours'),
    (gen_random_uuid(), 'jennifer.davis@example.com', 'Jennifer Davis', '+12125551234', 'USA', 'New York', 'America/New_York', 76, 4560, NOW() - INTERVAL '1 hour'),
    (gen_random_uuid(), 'carlos.rodriguez@example.com', 'Carlos Rodriguez', '+521551234567', 'Mexico', 'Mexico City', 'America/Mexico_City', 34, 2040, NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), 'ana.silva@example.com', 'Ana Silva', '+5511987654321', 'Brazil', 'São Paulo', 'America/Sao_Paulo', 58, 3480, NOW() - INTERVAL '6 hours'),
    
    -- European Intercessors
    (gen_random_uuid(), 'james.wilson@example.com', 'James Wilson', '+447700900123', 'UK', 'London', 'Europe/London', 93, 5580, NOW() - INTERVAL '45 minutes'),
    (gen_random_uuid(), 'marie.dubois@example.com', 'Marie Dubois', '+33612345678', 'France', 'Paris', 'Europe/Paris', 47, 2820, NOW() - INTERVAL '3 hours'),
    (gen_random_uuid(), 'hans.mueller@example.com', 'Hans Mueller', '+491701234567', 'Germany', 'Berlin', 'Europe/Berlin', 61, 3660, NOW() - INTERVAL '90 minutes'),
    
    -- Asian Intercessors
    (gen_random_uuid(), 'wang.wei@example.com', 'Wang Wei', '+8613812345678', 'China', 'Beijing', 'Asia/Shanghai', 72, 4320, NOW() - INTERVAL '4 hours'),
    (gen_random_uuid(), 'priya.sharma@example.com', 'Priya Sharma', '+919876543210', 'India', 'Mumbai', 'Asia/Kolkata', 84, 5040, NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), 'akiko.tanaka@example.com', 'Akiko Tanaka', '+819012345678', 'Japan', 'Tokyo', 'Asia/Tokyo', 91, 5460, NOW() - INTERVAL '1 hour'),
    
    -- More diverse intercessors
    (gen_random_uuid(), 'fatima.hassan@example.com', 'Fatima Hassan', '+201234567890', 'Egypt', 'Cairo', 'Africa/Cairo', 55, 3300, NOW() - INTERVAL '5 hours'),
    (gen_random_uuid(), 'peter.andersson@example.com', 'Peter Andersson', '+46701234567', 'Sweden', 'Stockholm', 'Europe/Stockholm', 44, 2640, NOW() - INTERVAL '8 hours'),
    (gen_random_uuid(), 'olivia.brown@example.com', 'Olivia Brown', '+61412345678', 'Australia', 'Sydney', 'Australia/Sydney', 68, 4080, NOW() - INTERVAL '30 minutes'),
    (gen_random_uuid(), 'mohamed.ali@example.com', 'Mohamed Ali', '+971501234567', 'UAE', 'Dubai', 'Asia/Dubai', 39, 2340, NOW() - INTERVAL '7 hours'),
    (gen_random_uuid(), 'rachel.cohen@example.com', 'Rachel Cohen', '+972501234567', 'Israel', 'Jerusalem', 'Asia/Jerusalem', 77, 4620, NOW())
ON CONFLICT (email) DO UPDATE SET 
    last_active = EXCLUDED.last_active,
    prayer_streak_days = EXCLUDED.prayer_streak_days,
    total_prayer_minutes = EXCLUDED.total_prayer_minutes;

-- ============================================
-- 2. CREATE 24-HOUR PRAYER SLOT COVERAGE (IMPRESSIVE!)
-- ============================================

-- Create prayer slots covering all 48 half-hour slots (24/7 coverage)
DO $$
DECLARE
    hour_num INTEGER;
    min_num INTEGER;
    slot_time TEXT;
    user_emails TEXT[] := ARRAY[
        'sarah.johnson@example.com', 'john.mukasa@example.com', 'mary.okonkwo@example.com',
        'david.kimani@example.com', 'grace.banda@example.com', 'michael.smith@example.com',
        'jennifer.davis@example.com', 'carlos.rodriguez@example.com', 'ana.silva@example.com',
        'james.wilson@example.com', 'marie.dubois@example.com', 'hans.mueller@example.com',
        'wang.wei@example.com', 'priya.sharma@example.com', 'akiko.tanaka@example.com',
        'fatima.hassan@example.com', 'peter.andersson@example.com', 'olivia.brown@example.com',
        'mohamed.ali@example.com', 'rachel.cohen@example.com'
    ];
    user_index INTEGER := 1;
BEGIN
    FOR hour_num IN 0..23 LOOP
        FOR min_num IN 0..1 LOOP
            IF min_num = 0 THEN
                slot_time := LPAD(hour_num::TEXT, 2, '0') || ':00–' || LPAD(hour_num::TEXT, 2, '0') || ':30';
            ELSE
                slot_time := LPAD(hour_num::TEXT, 2, '0') || ':30–' || 
                            CASE WHEN hour_num = 23 THEN '00:00' 
                            ELSE LPAD((hour_num + 1)::TEXT, 2, '0') || ':00' 
                            END;
            END IF;
            
            INSERT INTO prayer_slots (
                user_id, 
                user_email, 
                slot_time, 
                status, 
                missed_count, 
                created_at,
                updated_at
            )
            SELECT 
                user_id::TEXT,
                email,
                slot_time,
                'active',
                FLOOR(RANDOM() * 2)::INTEGER, -- Mostly 0-1 misses (shows good attendance)
                NOW() - INTERVAL '60 days' + (RANDOM() * INTERVAL '30 days'),
                NOW()
            FROM user_profiles
            WHERE email = user_emails[user_index]
            ON CONFLICT DO NOTHING;
            
            user_index := user_index + 1;
            IF user_index > array_length(user_emails, 1) THEN
                user_index := 1;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 3. CREATE IMPRESSIVE ZOOM MEETING HISTORY (Past 30 days)
-- ============================================

-- Generate Zoom meetings for the past 30 days (3x daily prayer meetings)
DO $$
DECLARE
    day_offset INTEGER;
    meeting_time TIME;
    meeting_times TIME[] := ARRAY['06:00:00'::TIME, '14:00:00'::TIME, '22:00:00'::TIME];
    i INTEGER;
BEGIN
    FOR day_offset IN 0..30 LOOP
        FOREACH meeting_time IN ARRAY meeting_times LOOP
            INSERT INTO zoom_meetings (
                meeting_id, 
                meeting_uuid, 
                topic,
                start_time,
                end_time,
                duration,
                participant_count,
                processed,
                created_at
            ) VALUES (
                '8392387599' || day_offset || EXTRACT(HOUR FROM meeting_time)::TEXT,
                gen_random_uuid()::TEXT,
                'Global Intercessors Prayer Meeting - ' || 
                    CASE EXTRACT(HOUR FROM meeting_time)::INTEGER
                        WHEN 6 THEN 'Morning Session'
                        WHEN 14 THEN 'Afternoon Session'
                        WHEN 22 THEN 'Night Watch'
                        ELSE 'Prayer Session'
                    END,
                (CURRENT_DATE - INTERVAL '1 day' * day_offset + meeting_time)::TIMESTAMP,
                (CURRENT_DATE - INTERVAL '1 day' * day_offset + meeting_time + INTERVAL '45 minutes')::TIMESTAMP,
                45 + FLOOR(RANDOM() * 15)::INTEGER, -- 45-60 minute meetings
                15 + FLOOR(RANDOM() * 35)::INTEGER, -- 15-50 participants
                true,
                CURRENT_DATE - INTERVAL '1 day' * day_offset
            )
            ON CONFLICT (meeting_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 4. CREATE ATTENDANCE RECORDS (High Attendance Rates!)
-- ============================================

-- Generate attendance records for the past 30 days
INSERT INTO attendance_log (user_id, slot_id, date, status, zoom_join_time, zoom_leave_time, zoom_meeting_id, created_at)
SELECT 
    ps.user_id,
    ps.id,
    (CURRENT_DATE - INTERVAL '1 day' * day_offset)::TEXT,
    CASE 
        WHEN RANDOM() < 0.85 THEN 'attended'  -- 85% attendance rate (impressive!)
        ELSE 'missed'
    END,
    CURRENT_DATE - INTERVAL '1 day' * day_offset + ps.slot_time::TIME - INTERVAL '2 minutes',
    CURRENT_DATE - INTERVAL '1 day' * day_offset + ps.slot_time::TIME + INTERVAL '28 minutes',
    '8392387599' || day_offset,
    CURRENT_DATE - INTERVAL '1 day' * day_offset
FROM prayer_slots ps
CROSS JOIN generate_series(0, 30) AS day_offset
WHERE ps.status = 'active'
    AND RANDOM() < 0.9  -- 90% of slots have attendance records
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. CREATE PRAYER SESSIONS WITH IMPRESSIVE STATS
-- ============================================

INSERT INTO prayer_sessions (user_id, slot_time, session_date, status, duration, created_at)
SELECT 
    ps.user_id,
    ps.slot_time,
    CURRENT_DATE - INTERVAL '1 day' * day_offset,
    CASE 
        WHEN RANDOM() < 0.88 THEN 'completed'  -- 88% completion rate
        WHEN RANDOM() < 0.5 THEN 'missed'
        ELSE 'skipped'
    END,
    25 + FLOOR(RANDOM() * 10)::INTEGER,  -- 25-35 minute sessions
    CURRENT_DATE - INTERVAL '1 day' * day_offset
FROM prayer_slots ps
CROSS JOIN generate_series(0, 30) AS day_offset
WHERE ps.status = 'active'
    AND RANDOM() < 0.92  -- 92% of slots have session records
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. CREATE FASTING PROGRAM REGISTRATIONS (100+ participants)
-- ============================================

INSERT INTO fasting_registrations (full_name, phone_number, email, region, travel_cost, days_committed, dietary_restrictions, emergency_contact, registration_status, created_at)
VALUES
    ('Sarah Johnson', '+27123456789', 'sarah.johnson@example.com', 'Southern Africa', '150', 40, 'None', '+27198765432', 'confirmed', NOW() - INTERVAL '15 days'),
    ('John Mukasa', '+256712345678', 'john.mukasa@example.com', 'East Africa', '200', 40, 'Vegetarian', '+256798765432', 'confirmed', NOW() - INTERVAL '14 days'),
    ('Mary Okonkwo', '+234801234567', 'mary.okonkwo@example.com', 'West Africa', '180', 21, 'None', '+234898765432', 'confirmed', NOW() - INTERVAL '13 days'),
    ('David Kimani', '+254712345678', 'david.kimani@example.com', 'East Africa', '170', 40, 'Diabetic considerations', '+254798765432', 'confirmed', NOW() - INTERVAL '12 days'),
    ('Grace Banda', '+260971234567', 'grace.banda@example.com', 'Southern Africa', '160', 21, 'None', '+260998765432', 'confirmed', NOW() - INTERVAL '11 days'),
    ('Michael Smith', '+14155551234', 'michael.smith@example.com', 'North America', '0', 40, 'Gluten-free', '+14155559876', 'confirmed', NOW() - INTERVAL '10 days'),
    ('Jennifer Davis', '+12125551234', 'jennifer.davis@example.com', 'North America', '0', 40, 'None', '+12125559876', 'confirmed', NOW() - INTERVAL '9 days'),
    ('James Wilson', '+447700900123', 'james.wilson@example.com', 'Europe', '100', 21, 'None', '+447700909876', 'confirmed', NOW() - INTERVAL '8 days'),
    ('Wang Wei', '+8613812345678', 'wang.wei@example.com', 'Asia', '120', 40, 'None', '+8613898765432', 'confirmed', NOW() - INTERVAL '7 days'),
    ('Priya Sharma', '+919876543210', 'priya.sharma@example.com', 'Asia', '80', 40, 'Vegetarian', '+919898765432', 'confirmed', NOW() - INTERVAL '6 days')
ON CONFLICT DO NOTHING;

-- Generate more fasting participants
DO $$
DECLARE
    i INTEGER;
    regions TEXT[] := ARRAY['Southern Africa', 'East Africa', 'West Africa', 'North Africa', 'North America', 'South America', 'Europe', 'Asia', 'Oceania'];
    first_names TEXT[] := ARRAY['Emmanuel', 'Blessing', 'Faith', 'Hope', 'Joy', 'Peace', 'Daniel', 'Ruth', 'Esther', 'Joshua', 'Deborah', 'Samuel', 'Hannah', 'Isaac', 'Rebecca'];
    last_names TEXT[] := ARRAY['Ndlovu', 'Mensah', 'Adeyemi', 'Mwangi', 'Santos', 'Garcia', 'Thompson', 'Anderson', 'Lee', 'Kumar', 'Mohamed', 'Ibrahim', 'Patel', 'Zhang', 'Yamamoto'];
BEGIN
    FOR i IN 1..90 LOOP
        INSERT INTO fasting_registrations (
            full_name, 
            phone_number, 
            email, 
            region, 
            travel_cost, 
            days_committed, 
            dietary_restrictions,
            emergency_contact,
            registration_status,
            created_at
        ) VALUES (
            first_names[1 + (i % array_length(first_names, 1))] || ' ' || 
            last_names[1 + (i % array_length(last_names, 1))],
            '+' || (10000000000 + FLOOR(RANDOM() * 89999999999))::TEXT,
            LOWER(first_names[1 + (i % array_length(first_names, 1))]) || '.' || 
            LOWER(last_names[1 + (i % array_length(last_names, 1))]) || i::TEXT || '@example.com',
            regions[1 + (i % array_length(regions, 1))],
            (FLOOR(RANDOM() * 300))::TEXT,
            CASE WHEN RANDOM() < 0.6 THEN 40 ELSE 21 END,
            CASE WHEN RANDOM() < 0.7 THEN 'None' 
                 WHEN RANDOM() < 0.5 THEN 'Vegetarian'
                 ELSE 'Other dietary needs' END,
            '+' || (10000000000 + FLOOR(RANDOM() * 89999999999))::TEXT,
            'confirmed',
            NOW() - (RANDOM() * INTERVAL '30 days')
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ============================================
-- 7. CREATE WEEKLY REPORT DATA (For Analytics)
-- ============================================

-- Create prayer points and reports for weekly analytics
INSERT INTO prayer_points (title, description, category, priority, created_by, created_at)
VALUES
    ('Revival in Africa', 'Pray for spiritual awakening across the African continent', 'Continental', 'high', 'admin@example.com', NOW() - INTERVAL '7 days'),
    ('Peace in Conflict Zones', 'Intercede for peace in areas of conflict worldwide', 'Global', 'critical', 'admin@example.com', NOW() - INTERVAL '6 days'),
    ('Church Unity', 'Pray for unity among churches and denominations globally', 'Church', 'high', 'admin@example.com', NOW() - INTERVAL '5 days'),
    ('Youth Revival', 'Pray for the younger generation to encounter God', 'Generational', 'high', 'admin@example.com', NOW() - INTERVAL '4 days'),
    ('Government Leaders', 'Pray for wisdom for government leaders worldwide', 'Governmental', 'medium', 'admin@example.com', NOW() - INTERVAL '3 days'),
    ('Economic Recovery', 'Pray for economic restoration and provision', 'Economic', 'medium', 'admin@example.com', NOW() - INTERVAL '2 days'),
    ('Family Restoration', 'Pray for healing and restoration in families', 'Family', 'high', 'admin@example.com', NOW() - INTERVAL '1 day'),
    ('Harvest of Souls', 'Pray for evangelism and salvation of the lost', 'Evangelism', 'critical', 'admin@example.com', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. CREATE ADMIN UPDATES (Recent Announcements)
-- ============================================

INSERT INTO updates (title, description, type, priority, created_at, updated_at)
VALUES
    ('🎉 New Record: 24-Hour Coverage Achieved!', 'Praise God! We have successfully achieved complete 24-hour prayer coverage with intercessors from 42 countries!', 'achievement', 'high', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('🙏 40-Day Fasting Program Launch', 'Join us for our global 40-day fasting and prayer program starting next week. Already 127 participants registered!', 'event', 'high', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('📱 WhatsApp Integration Live', 'Receive prayer reminders and daily devotionals directly on WhatsApp. Over 200 users already connected!', 'feature', 'medium', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    ('🌍 Global Prayer Focus: Middle East Peace', 'This week we are focusing our prayers on peace and revival in the Middle East region.', 'prayer_focus', 'high', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('📊 Monthly Report: 92% Attendance Rate', 'Our global attendance rate reached an impressive 92% last month. Thank you faithful intercessors!', 'report', 'medium', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. CREATE SKIP REQUESTS (Shows good management)
-- ============================================

INSERT INTO skip_requests (user_id, user_email, skip_days, reason, status, admin_comment, created_at, processed_at)
VALUES
    ('user-1', 'john.mukasa@example.com', 3, 'Traveling for ministry conference', 'approved', 'Approved. Safe travels!', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '2 hours'),
    ('user-2', 'mary.okonkwo@example.com', 2, 'Medical procedure', 'approved', 'Approved. Praying for quick recovery.', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '1 hour'),
    ('user-3', 'david.kimani@example.com', 1, 'Family emergency', 'approved', 'Approved. Praying for your family.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
    ('user-4', 'grace.banda@example.com', 7, 'Vacation request', 'pending', NULL, NOW() - INTERVAL '1 hour', NULL),
    ('user-5', 'michael.smith@example.com', 2, 'Work commitment', 'rejected', 'Please find a substitute intercessor.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. UPDATE STATISTICS FOR IMPRESSIVE DISPLAY
-- ============================================

-- Update prayer slot statistics to show good performance
UPDATE prayer_slots 
SET 
    missed_count = FLOOR(RANDOM() * 3)::INTEGER,  -- Max 2 misses (shows dedication)
    last_attended = NOW() - (RANDOM() * INTERVAL '2 days')
WHERE status = 'active';

-- Update user profiles with impressive stats
UPDATE user_profiles 
SET 
    prayer_streak_days = 30 + FLOOR(RANDOM() * 90)::INTEGER,  -- 30-120 day streaks
    total_prayer_minutes = 1800 + FLOOR(RANDOM() * 5400)::INTEGER,  -- 30-120 hours total
    last_active = NOW() - (RANDOM() * INTERVAL '24 hours')
WHERE email IN (SELECT DISTINCT user_email FROM prayer_slots WHERE status = 'active');

-- ============================================
-- FINAL SUMMARY QUERY - Run this to see your impressive stats!
-- ============================================

DO $$
DECLARE
    total_users INTEGER;
    total_slots INTEGER;
    active_slots INTEGER;
    total_meetings INTEGER;
    total_attendance INTEGER;
    attendance_rate NUMERIC;
    total_fasting INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    SELECT COUNT(*) INTO total_slots FROM prayer_slots;
    SELECT COUNT(*) INTO active_slots FROM prayer_slots WHERE status = 'active';
    SELECT COUNT(*) INTO total_meetings FROM zoom_meetings;
    SELECT COUNT(*) INTO total_attendance FROM attendance_log WHERE status = 'attended';
    SELECT COUNT(*) INTO total_fasting FROM fasting_registrations;
    
    SELECT 
        CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'attended')::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 END INTO attendance_rate
    FROM attendance_log;
    
    RAISE NOTICE E'\n===========================================';
    RAISE NOTICE 'GLOBAL INTERCESSORS - PRESENTATION DATA READY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total Intercessors: % users', total_users;
    RAISE NOTICE 'Prayer Slots: % total, % active', total_slots, active_slots;
    RAISE NOTICE 'Zoom Meetings: % sessions', total_meetings;
    RAISE NOTICE 'Attendance Rate: %% average', ROUND(attendance_rate, 1);
    RAISE NOTICE 'Fasting Participants: % registered', total_fasting;
    RAISE NOTICE E'===========================================\n';
    RAISE NOTICE '✅ Your app is ready for an impressive presentation!';
END $$;
