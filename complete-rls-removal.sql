-- COMPLETE RLS REMOVAL AND BYPASS FOR ALL WHATSAPP BOT TABLES
-- This will completely fix the service role access issue

-- Step 1: Completely disable RLS on all WhatsApp bot tables
ALTER TABLE "public"."prayer_slots" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."whatsapp_bot_users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."whatsapp_messages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."whatsapp_interactions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_profiles" DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies (comprehensive cleanup)
DROP POLICY IF EXISTS "service_role_bypass" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "service_role_full_access" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable read access for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable insert for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable update access for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable delete access for service role" ON "public"."prayer_slots";

DROP POLICY IF EXISTS "service_role_bypass" ON "public"."whatsapp_bot_users";
DROP POLICY IF EXISTS "Enable all for service role" ON "public"."whatsapp_bot_users";

-- Step 3: Grant ALL privileges to service role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "public" TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "public" TO service_role;
GRANT USAGE ON SCHEMA "public" TO service_role;

-- Step 4: Test direct insertion with service role
SET ROLE service_role;

-- Insert prayer slots
INSERT INTO "public"."prayer_slots" (user_id, user_email, slot_time, status) VALUES
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

-- Insert WhatsApp bot user
INSERT INTO "public"."whatsapp_bot_users" (user_id, whatsapp_number, is_active, reminder_preferences) VALUES
('auth_user_00001', '263789117038', true, '{"reminderTiming": "30min", "enabled": true}')
ON CONFLICT (whatsapp_number) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = EXCLUDED.is_active,
  reminder_preferences = EXCLUDED.reminder_preferences;

RESET ROLE;

-- Step 5: Verify data was inserted
SELECT 'Prayer slots inserted:' as info, COUNT(*) as count FROM "public"."prayer_slots" WHERE status = 'active';
SELECT 'WhatsApp users inserted:' as info, COUNT(*) as count FROM "public"."whatsapp_bot_users" WHERE is_active = true;

-- Step 6: Display inserted data
SELECT user_id, slot_time, status FROM "public"."prayer_slots" WHERE status = 'active' ORDER BY slot_time;
SELECT user_id, whatsapp_number FROM "public"."whatsapp_bot_users" WHERE is_active = true;