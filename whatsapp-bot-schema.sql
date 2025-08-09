-- WhatsApp Prayer Bot Database Schema
-- Execute this manually in your Supabase SQL editor

-- Create WhatsApp bot users table
CREATE TABLE IF NOT EXISTS whatsapp_bot_users (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    reminder_preferences TEXT,
    personal_reminder_time TEXT,
    personal_reminder_days TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    recipient_number TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'reminder', 'devotional', 'admin_update', 'custom'
    message_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create daily devotionals table
CREATE TABLE IF NOT EXISTS daily_devotionals (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD format
    devotion_text TEXT NOT NULL,
    bible_verse TEXT NOT NULL,
    verse_reference TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_user_id ON whatsapp_bot_users(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_active ON whatsapp_bot_users(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_type ON whatsapp_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_daily_devotionals_date ON daily_devotionals(date);

-- Enable Row Level Security (RLS)
ALTER TABLE whatsapp_bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_devotionals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for WhatsApp bot users
CREATE POLICY "Users can view their own WhatsApp settings" ON whatsapp_bot_users
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own WhatsApp settings" ON whatsapp_bot_users
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all WhatsApp users" ON whatsapp_bot_users
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for WhatsApp messages
CREATE POLICY "Users can view their own WhatsApp messages" ON whatsapp_messages
    FOR SELECT USING (
        recipient_number IN (
            SELECT whatsapp_number FROM whatsapp_bot_users WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Service role can manage all WhatsApp messages" ON whatsapp_messages
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for daily devotionals
CREATE POLICY "Anyone can view daily devotionals" ON daily_devotionals
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage daily devotionals" ON daily_devotionals
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for WhatsApp bot users table
DROP TRIGGER IF EXISTS update_whatsapp_bot_users_updated_at ON whatsapp_bot_users;
CREATE TRIGGER update_whatsapp_bot_users_updated_at
    BEFORE UPDATE ON whatsapp_bot_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample devotional for testing
INSERT INTO daily_devotionals (date, devotion_text, bible_verse, verse_reference)
VALUES (
    CURRENT_DATE::text,
    'Begin each day with prayer and end it with gratitude. God''s mercies are new every morning, and His faithfulness never fails.',
    'Because of the Lord''s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
    'Lamentations 3:22-23'
) ON CONFLICT (date) DO NOTHING;

COMMENT ON TABLE whatsapp_bot_users IS 'WhatsApp bot user registrations and preferences';
COMMENT ON TABLE whatsapp_messages IS 'Log of all WhatsApp messages sent by the bot';
COMMENT ON TABLE daily_devotionals IS 'AI-generated daily devotional content';