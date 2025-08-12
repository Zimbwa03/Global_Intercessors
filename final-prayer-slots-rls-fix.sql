-- FINAL FIX: Complete WhatsApp bot database integration
-- Fix missing WhatsApp users and user profiles table structure

-- Step 1: Insert WhatsApp bot users with proper structure
INSERT INTO "public"."whatsapp_bot_users" (user_id, whatsapp_number, is_active, reminder_preferences) VALUES
('auth_user_00001', '263785494594', true, '{"reminderTiming": "30min", "enabled": true}'),
('auth_user_00002', '263785494595', true, '{"reminderTiming": "30min", "enabled": true}'),
('auth_user_00003', '263785494596', true, '{"reminderTiming": "30min", "enabled": true}')
ON CONFLICT (whatsapp_number) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active,
  reminder_preferences = EXCLUDED.reminder_preferences;

-- Step 2: Fix user_profiles table structure if needed
ALTER TABLE "public"."user_profiles" ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE "public"."user_profiles" ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE "public"."user_profiles" ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE "public"."user_profiles" ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 3: Insert user profiles for prayer slot users
INSERT INTO "public"."user_profiles" (user_id, first_name, last_name, email) VALUES
('auth_user_00001', 'Sarah', 'Johnson', 'sarah.johnson@globalintercessors.org'),
('auth_user_00002', 'David', 'Chen', 'david.chen@globalintercessors.org'),
('auth_user_00003', 'Maria', 'Santos', 'maria.santos@globalintercessors.org'),
('auth_user_00004', 'Emmanuel', 'Okafor', 'emmanuel.okafor@globalintercessors.org'),
('auth_user_00005', 'Anna', 'Kowalski', 'anna.kowalski@globalintercessors.org'),
('auth_user_00006', 'John', 'Smith', 'john.smith@globalintercessors.org')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

-- Step 4: Grant all permissions to service role for these tables
GRANT ALL PRIVILEGES ON TABLE "public"."whatsapp_bot_users" TO service_role;
GRANT ALL PRIVILEGES ON TABLE "public"."user_profiles" TO service_role;

-- Step 5: Verify all data is properly inserted
SELECT 'Prayer slots count:' as info, COUNT(*) as count FROM "public"."prayer_slots" WHERE status = 'active';
SELECT 'WhatsApp users count:' as info, COUNT(*) as count FROM "public"."whatsapp_bot_users" WHERE is_active = true;
SELECT 'User profiles count:' as info, COUNT(*) as count FROM "public"."user_profiles";

-- Step 6: Display sample data
SELECT 'PRAYER SLOTS:' as section;
SELECT user_id, slot_time, status FROM "public"."prayer_slots" WHERE status = 'active' ORDER BY slot_time LIMIT 6;

SELECT 'WHATSAPP USERS:' as section;
SELECT user_id, whatsapp_number, is_active FROM "public"."whatsapp_bot_users";

SELECT 'USER PROFILES:' as section;
SELECT user_id, first_name, last_name FROM "public"."user_profiles";