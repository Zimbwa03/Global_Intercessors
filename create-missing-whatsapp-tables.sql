-- Create missing WhatsApp bot tables in Supabase
-- This fixes the "relation does not exist" errors

-- Create whatsapp_bot_users table
CREATE TABLE IF NOT EXISTS whatsapp_bot_users (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    reminder_preferences TEXT, -- JSON string for custom preferences
    personal_reminder_time TEXT, -- e.g., "07:00"
    personal_reminder_days TEXT, -- e.g., "Mon,Wed,Fri" or "Everyday"
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    recipient_number TEXT NOT NULL,
    message_type TEXT NOT NULL, -- "reminder", "devotional", "admin_update", "custom"
    message_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- "pending", "sent", "delivered", "failed"
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create whatsapp_interactions table
CREATE TABLE IF NOT EXISTS whatsapp_interactions (
    id SERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    interaction_type TEXT NOT NULL, -- "command", "button_click", "list_selection", "feature_use"
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create daily_devotionals table
CREATE TABLE IF NOT EXISTS daily_devotionals (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD format
    devotion_text TEXT NOT NULL,
    bible_verse TEXT NOT NULL,
    verse_reference TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Grant permissions to service_role for all WhatsApp tables
GRANT ALL PRIVILEGES ON whatsapp_bot_users TO service_role;
GRANT ALL PRIVILEGES ON whatsapp_messages TO service_role;
GRANT ALL PRIVILEGES ON whatsapp_interactions TO service_role;
GRANT ALL PRIVILEGES ON daily_devotionals TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create RLS policies for WhatsApp tables (allow service role full access)
ALTER TABLE whatsapp_bot_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_whatsapp_bot_users" ON whatsapp_bot_users
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_whatsapp_messages" ON whatsapp_messages
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_whatsapp_interactions" ON whatsapp_interactions
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

ALTER TABLE daily_devotionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_daily_devotionals" ON daily_devotionals
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Insert sample WhatsApp bot user for testing
INSERT INTO whatsapp_bot_users (user_id, whatsapp_number, reminder_preferences) 
VALUES ('test-user-001', '263789117038', '{"reminderTiming": "30min", "enabled": true}')
ON CONFLICT (whatsapp_number) DO NOTHING;

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%whatsapp%' OR table_name = 'daily_devotionals';

-- Test query prayer_slots to ensure it's accessible
SELECT COUNT(*) as prayer_slots_count FROM prayer_slots;
SELECT status, COUNT(*) as count FROM prayer_slots GROUP BY status;