-- Corrected SQL using Supabase authentication IDs for prayer slots
-- This will create 6 active prayer slots with proper auth user IDs

-- Insert 6 active prayer slots using authentication IDs
INSERT INTO prayer_slots (user_id, user_email, slot_time, status) VALUES
('auth_user_00001', 'sarah.johnson@globalintercessors.org', '00:00', 'active'),
('auth_user_00002', 'david.chen@globalintercessors.org', '04:00', 'active'),
('auth_user_00003', 'maria.santos@globalintercessors.org', '08:00', 'active'),
('auth_user_00004', 'emmanuel.okafor@globalintercessors.org', '12:00', 'active'),
('auth_user_00005', 'anna.kowalski@globalintercessors.org', '16:00', 'active'),
('auth_user_00006', 'john.smith@globalintercessors.org', '20:00', 'active')
ON CONFLICT (user_id) DO UPDATE SET
  slot_time = EXCLUDED.slot_time,
  status = EXCLUDED.status,
  user_email = EXCLUDED.user_email,
  updated_at = NOW();

-- Insert corresponding WhatsApp bot users with authentication IDs
INSERT INTO whatsapp_bot_users (user_id, whatsapp_number, is_active, reminder_preferences) VALUES
('auth_user_00001', '263789117038', true, '{"reminderTiming": "30min", "enabled": true}'),
('auth_user_00002', '263785494595', true, '{"reminderTiming": "30min", "enabled": true}'),
('auth_user_00003', '263785494596', true, '{"reminderTiming": "30min", "enabled": true}')
ON CONFLICT (whatsapp_number) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active,
  reminder_preferences = EXCLUDED.reminder_preferences;

-- Verify the data was inserted successfully
SELECT 'Active Prayer Slots:' as info, COUNT(*) as count FROM prayer_slots WHERE status = 'active';
SELECT 'WhatsApp Bot Users:' as info, COUNT(*) as count FROM whatsapp_bot_users WHERE is_active = true;

-- Display the created prayer slots for verification
SELECT 
  user_id,
  user_email,
  slot_time,
  status,
  created_at
FROM prayer_slots 
WHERE status = 'active'
ORDER BY slot_time;

-- Display WhatsApp bot users for verification
SELECT 
  user_id,
  whatsapp_number,
  is_active,
  reminder_preferences
FROM whatsapp_bot_users 
WHERE is_active = true
ORDER BY user_id;