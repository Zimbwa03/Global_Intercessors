-- Setup Prayer Slot Reminder Test Data
-- This script creates sample prayer slots and WhatsApp users for testing the reminder system

-- First, ensure all required tables exist
CREATE TABLE IF NOT EXISTS prayer_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    slot_time VARCHAR(20) NOT NULL,
    slot_day VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    zoom_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_bot_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'Africa/Harare',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample user profiles
INSERT INTO user_profiles (id, email, full_name, phone_number) VALUES
    ('11111111-1111-1111-1111-111111111111', 'test1@example.com', 'John Intercessor', '+263771234567'),
    ('22222222-2222-2222-2222-222222222222', 'test2@example.com', 'Mary Prayer Warrior', '+263772345678'),
    ('33333333-3333-3333-3333-333333333333', 'test3@example.com', 'David Faithful', '+263773456789'),
    ('44444444-4444-4444-4444-444444444444', 'test4@example.com', 'Sarah Devoted', '+263774567890'),
    ('55555555-5555-5555-5555-555555555555', 'test5@example.com', 'Peter Steadfast', '+263775678901')
ON CONFLICT (email) DO NOTHING;

-- Insert sample WhatsApp bot users
INSERT INTO whatsapp_bot_users (user_id, whatsapp_number, is_active, timezone) VALUES
    ('11111111-1111-1111-1111-111111111111', '263771234567', true, 'Africa/Harare'),
    ('22222222-2222-2222-2222-222222222222', '263772345678', true, 'Africa/Harare'),
    ('33333333-3333-3333-3333-333333333333', '263773456789', true, 'Africa/Harare'),
    ('44444444-4444-4444-4444-444444444444', '263774567890', true, 'Africa/Harare'),
    ('55555555-5555-5555-5555-555555555555', '263775678901', true, 'Africa/Harare')
ON CONFLICT (user_id) DO NOTHING;

-- Clear existing prayer slots for clean testing
DELETE FROM prayer_slots;

-- Insert sample prayer slots with different times for testing
-- These times are set to trigger reminders at different intervals
INSERT INTO prayer_slots (user_id, slot_time, slot_day, status, zoom_link) VALUES
    -- Early morning slots (6:00 AM - 8:00 AM)
    ('11111111-1111-1111-1111-111111111111', '06:00–06:30', 'Monday', 'active', 'https://zoom.us/j/1234567890'),
    ('22222222-2222-2222-2222-222222222222', '06:30–07:00', 'Monday', 'active', 'https://zoom.us/j/1234567891'),
    ('33333333-3333-3333-3333-333333333333', '07:00–07:30', 'Monday', 'active', 'https://zoom.us/j/1234567892'),
    ('44444444-4444-4444-4444-444444444444', '07:30–08:00', 'Monday', 'active', 'https://zoom.us/j/1234567893'),
    
    -- Morning slots (8:00 AM - 12:00 PM)
    ('55555555-5555-5555-5555-555555555555', '08:00–08:30', 'Monday', 'active', 'https://zoom.us/j/1234567894'),
    ('11111111-1111-1111-1111-111111111111', '09:00–09:30', 'Monday', 'active', 'https://zoom.us/j/1234567895'),
    ('22222222-2222-2222-2222-222222222222', '10:00–10:30', 'Monday', 'active', 'https://zoom.us/j/1234567896'),
    ('33333333-3333-3333-3333-333333333333', '11:00–11:30', 'Monday', 'active', 'https://zoom.us/j/1234567897'),
    
    -- Afternoon slots (12:00 PM - 6:00 PM)
    ('44444444-4444-4444-4444-444444444444', '12:00–12:30', 'Monday', 'active', 'https://zoom.us/j/1234567898'),
    ('55555555-5555-5555-5555-555555555555', '13:00–13:30', 'Monday', 'active', 'https://zoom.us/j/1234567899'),
    ('11111111-1111-1111-1111-111111111111', '14:00–14:30', 'Monday', 'active', 'https://zoom.us/j/1234567900'),
    ('22222222-2222-2222-2222-222222222222', '15:00–15:30', 'Monday', 'active', 'https://zoom.us/j/1234567901'),
    ('33333333-3333-3333-3333-333333333333', '16:00–16:30', 'Monday', 'active', 'https://zoom.us/j/1234567902'),
    ('44444444-4444-4444-4444-444444444444', '17:00–17:30', 'Monday', 'active', 'https://zoom.us/j/1234567903'),
    
    -- Evening slots (6:00 PM - 10:00 PM)
    ('55555555-5555-5555-5555-555555555555', '18:00–18:30', 'Monday', 'active', 'https://zoom.us/j/1234567904'),
    ('11111111-1111-1111-1111-111111111111', '19:00–19:30', 'Monday', 'active', 'https://zoom.us/j/1234567905'),
    ('22222222-2222-2222-2222-222222222222', '20:00–20:30', 'Monday', 'active', 'https://zoom.us/j/1234567906'),
    ('33333333-3333-3333-3333-333333333333', '21:00–21:30', 'Monday', 'active', 'https://zoom.us/j/1234567907'),
    
    -- Night slots (10:00 PM - 12:00 AM)
    ('44444444-4444-4444-4444-444444444444', '22:00–22:30', 'Monday', 'active', 'https://zoom.us/j/1234567908'),
    ('55555555-5555-5555-5555-555555555555', '23:00–23:30', 'Monday', 'active', 'https://zoom.us/j/1234567909'),
    
    -- Late night/early morning slots (12:00 AM - 6:00 AM)
    ('11111111-1111-1111-1111-111111111111', '00:00–00:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567910'),
    ('22222222-2222-2222-2222-222222222222', '01:00–01:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567911'),
    ('33333333-3333-3333-3333-333333333333', '02:00–02:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567912'),
    ('44444444-4444-4444-4444-444444444444', '03:00–03:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567913'),
    ('55555555-5555-5555-5555-555555555555', '04:00–04:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567914'),
    ('11111111-1111-1111-1111-111111111111', '05:00–05:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567915');

-- Add some slots for other days of the week
INSERT INTO prayer_slots (user_id, slot_time, slot_day, status, zoom_link) VALUES
    -- Tuesday slots
    ('22222222-2222-2222-2222-222222222222', '06:00–06:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567916'),
    ('33333333-3333-3333-3333-333333333333', '12:00–12:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567917'),
    ('44444444-4444-4444-4444-444444444444', '18:00–18:30', 'Tuesday', 'active', 'https://zoom.us/j/1234567918'),
    
    -- Wednesday slots
    ('55555555-5555-5555-5555-555555555555', '06:00–06:30', 'Wednesday', 'active', 'https://zoom.us/j/1234567919'),
    ('11111111-1111-1111-1111-111111111111', '12:00–12:30', 'Wednesday', 'active', 'https://zoom.us/j/1234567920'),
    ('22222222-2222-2222-2222-222222222222', '18:00–18:30', 'Wednesday', 'active', 'https://zoom.us/j/1234567921'),
    
    -- Thursday slots
    ('33333333-3333-3333-3333-333333333333', '06:00–06:30', 'Thursday', 'active', 'https://zoom.us/j/1234567922'),
    ('44444444-4444-4444-4444-444444444444', '12:00–12:30', 'Thursday', 'active', 'https://zoom.us/j/1234567923'),
    ('55555555-5555-5555-5555-555555555555', '18:00–18:30', 'Thursday', 'active', 'https://zoom.us/j/1234567924'),
    
    -- Friday slots
    ('11111111-1111-1111-1111-111111111111', '06:00–06:30', 'Friday', 'active', 'https://zoom.us/j/1234567925'),
    ('22222222-2222-2222-2222-222222222222', '12:00–12:30', 'Friday', 'active', 'https://zoom.us/j/1234567926'),
    ('33333333-3333-3333-3333-333333333333', '18:00–18:30', 'Friday', 'active', 'https://zoom.us/j/1234567927'),
    
    -- Weekend slots
    ('44444444-4444-4444-4444-444444444444', '08:00–08:30', 'Saturday', 'active', 'https://zoom.us/j/1234567928'),
    ('55555555-5555-5555-5555-555555555555', '14:00–14:30', 'Saturday', 'active', 'https://zoom.us/j/1234567929'),
    ('11111111-1111-1111-1111-111111111111', '20:00–20:30', 'Saturday', 'active', 'https://zoom.us/j/1234567930'),
    
    ('22222222-2222-2222-2222-222222222222', '09:00–09:30', 'Sunday', 'active', 'https://zoom.us/j/1234567931'),
    ('33333333-3333-3333-3333-333333333333', '15:00–15:30', 'Sunday', 'active', 'https://zoom.us/j/1234567932'),
    ('44444444-4444-4444-4444-444444444444', '21:00–21:30', 'Sunday', 'active', 'https://zoom.us/j/1234567933');

-- Create a view to easily see all active prayer slots with user details
CREATE OR REPLACE VIEW active_prayer_slots_with_users AS
SELECT 
    ps.id as slot_id,
    ps.slot_time,
    ps.slot_day,
    ps.status,
    ps.zoom_link,
    up.full_name,
    up.email,
    wbu.whatsapp_number,
    wbu.timezone,
    ps.created_at
FROM prayer_slots ps
JOIN user_profiles up ON ps.user_id = up.id
JOIN whatsapp_bot_users wbu ON ps.user_id = wbu.user_id
WHERE ps.status = 'active' AND wbu.is_active = true
ORDER BY ps.slot_time, ps.slot_day;

-- Display summary of created data
SELECT 
    'Prayer Slots' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM prayer_slots
UNION ALL
SELECT 
    'WhatsApp Users' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM whatsapp_bot_users
UNION ALL
SELECT 
    'User Profiles' as table_name,
    COUNT(*) as total_count,
    COUNT(*) as active_count
FROM user_profiles;

-- Display sample of active prayer slots
SELECT 
    slot_time,
    slot_day,
    full_name,
    whatsapp_number,
    timezone
FROM active_prayer_slots_with_users
ORDER BY slot_time
LIMIT 10;

-- Instructions for testing
SELECT 'SETUP COMPLETE!' as status,
'To test the reminder system:' as instruction_1,
'1. Start your server: npm run dev' as instruction_2,
'2. Test manually: POST /api/test-reminders' as instruction_3,
'3. Check server logs for reminder activity' as instruction_4,
'4. Reminders will be sent 30, 15, and 5 minutes before each slot' as instruction_5;
