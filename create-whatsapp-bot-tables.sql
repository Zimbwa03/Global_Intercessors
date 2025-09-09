
-- Create WhatsApp bot tables and fix database access issues
-- Run this in your Supabase SQL Editor

-- 1. Create whatsapp_bot_users table
CREATE TABLE IF NOT EXISTS whatsapp_bot_users (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  whatsapp_number TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  reminder_preferences JSONB DEFAULT '{"dailyDevotionals": true, "prayerSlotReminders": true, "reminderTiming": "30min", "timezone": "UTC"}'::jsonb,
  personal_reminder_time TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create whatsapp_messages table for logging
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  recipient_number TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create whatsapp_interactions table for logging user interactions
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create daily_devotionals table
CREATE TABLE IF NOT EXISTS daily_devotionals (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  devotion_text TEXT NOT NULL,
  bible_verse TEXT NOT NULL,
  verse_reference TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on all tables
ALTER TABLE whatsapp_bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_devotionals ENABLE ROW LEVEL SECURITY;

-- 6. Create service role policies (full access for backend)
CREATE POLICY "service_role_full_access_bot_users" ON whatsapp_bot_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_messages" ON whatsapp_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_interactions" ON whatsapp_interactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_devotionals" ON daily_devotionals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Create authenticated user policies for web app access
CREATE POLICY "authenticated_read_bot_users" ON whatsapp_bot_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_messages" ON whatsapp_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_devotionals" ON daily_devotionals
  FOR SELECT TO authenticated USING (true);

-- 8. Grant necessary permissions
GRANT ALL ON whatsapp_bot_users TO service_role;
GRANT ALL ON whatsapp_messages TO service_role;
GRANT ALL ON whatsapp_interactions TO service_role;
GRANT ALL ON daily_devotionals TO service_role;

GRANT SELECT ON whatsapp_bot_users TO authenticated;
GRANT SELECT ON whatsapp_messages TO authenticated;
GRANT SELECT ON whatsapp_interactions TO authenticated;
GRANT SELECT ON daily_devotionals TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. Create sample prayer slots for testing
INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
VALUES 
  ('whatsapp_user_263789117038', 'test@example.com', '06:00–06:30', 'active', 0, NOW(), NOW()),
  ('whatsapp_user_263785494595', 'test2@example.com', '09:00–09:30', 'active', 0, NOW(), NOW()),
  ('whatsapp_user_263785494596', 'test3@example.com', '15:00–15:30', 'active', 0, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  slot_time = EXCLUDED.slot_time,
  updated_at = NOW();

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_number ON whatsapp_bot_users(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_user_id ON whatsapp_bot_users(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON whatsapp_messages(recipient_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_daily_devotionals_date ON daily_devotionals(date);

-- Success message
SELECT 'WhatsApp bot tables created successfully! Bot should now work properly.' as result;
