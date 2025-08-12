-- Create sample prayer slots to test WhatsApp bot functionality
-- Since the current database appears to be empty, let's add test data

-- First, insert some test user profiles
INSERT INTO user_profiles (user_id, email, full_name, region) VALUES
('test-user-1', 'intercessor1@example.com', 'Sarah Johnson', 'North America'),
('test-user-2', 'intercessor2@example.com', 'David Chen', 'Asia'),
('test-user-3', 'intercessor3@example.com', 'Maria Santos', 'South America'),
('test-user-4', 'intercessor4@example.com', 'Emmanuel Okafor', 'Africa'),
('test-user-5', 'intercessor5@example.com', 'Anna Kowalski', 'Europe'),
('test-user-6', 'intercessor6@example.com', 'John Smith', 'Oceania')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  region = EXCLUDED.region;

-- Insert 6 active prayer slots covering different time zones
INSERT INTO prayer_slots (user_id, slot_time, status, created_at, updated_at) VALUES
('test-user-1', '00:00', 'active', NOW(), NOW()),
('test-user-2', '04:00', 'active', NOW(), NOW()),
('test-user-3', '08:00', 'active', NOW(), NOW()),
('test-user-4', '12:00', 'active', NOW(), NOW()),
('test-user-5', '16:00', 'active', NOW(), NOW()),
('test-user-6', '20:00', 'active', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  slot_time = EXCLUDED.slot_time,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Insert corresponding WhatsApp bot user for testing
INSERT INTO whatsapp_bot_users (user_id, whatsapp_number, is_active, reminder_preferences) VALUES
('test-user-1', '263785494594', true, '{"reminderTiming": "30min", "enabled": true}')
ON CONFLICT (whatsapp_number) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active,
  reminder_preferences = EXCLUDED.reminder_preferences;

-- Verify the data was inserted
SELECT 'Prayer Slots Created:' as info, COUNT(*) as count FROM prayer_slots WHERE status = 'active';
SELECT 'User Profiles Created:' as info, COUNT(*) as count FROM user_profiles;
SELECT 'WhatsApp Users Created:' as info, COUNT(*) as count FROM whatsapp_bot_users WHERE is_active = true;

-- Test data for WhatsApp bot functionality
SELECT 
  ps.slot_time,
  ps.status,
  up.full_name,
  up.region,
  wbu.whatsapp_number
FROM prayer_slots ps
LEFT JOIN user_profiles up ON ps.user_id = up.user_id
LEFT JOIN whatsapp_bot_users wbu ON ps.user_id = wbu.user_id
WHERE ps.status = 'active'
ORDER BY ps.slot_time;