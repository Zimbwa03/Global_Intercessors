
-- Create reminder_logs table to track all sent reminders
CREATE TABLE IF NOT EXISTS reminder_logs (
    id SERIAL PRIMARY KEY,
    slot_id INTEGER REFERENCES prayer_slots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 'slot_reminder', 'morning_message', 'custom'
    minutes_before INTEGER, -- NULL for morning messages
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    message_content TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add reminder_time column to prayer_slots table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prayer_slots' AND column_name='reminder_time') THEN
        ALTER TABLE prayer_slots ADD COLUMN reminder_time INTEGER DEFAULT 30; -- Default 30 minutes
    END IF;
END $$;

-- Add custom_reminders column to prayer_slots table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prayer_slots' AND column_name='custom_reminders') THEN
        ALTER TABLE prayer_slots ADD COLUMN custom_reminders BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_logs_slot_id ON reminder_logs(slot_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_type ON reminder_logs(reminder_type);

CREATE INDEX IF NOT EXISTS idx_prayer_slots_reminder_time ON prayer_slots(reminder_time);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_status_reminder ON prayer_slots(status, reminder_time);

-- Enable RLS on reminder_logs table
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminder_logs
CREATE POLICY "Users can view their own reminder logs" ON reminder_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all reminder logs" ON reminder_logs
    FOR ALL USING (current_setting('role') = 'service_role');

-- Grant permissions
GRANT ALL ON reminder_logs TO authenticated;
GRANT ALL ON reminder_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE reminder_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reminder_logs_id_seq TO service_role;

-- Insert sample reminder preferences for existing users
INSERT INTO reminder_logs (slot_id, user_id, reminder_type, sent_at, status, message_content)
SELECT 
    id,
    user_id,
    'system_initialization',
    CURRENT_TIMESTAMP,
    'info',
    'Advanced reminder system initialized for your prayer slot'
FROM prayer_slots 
WHERE status = 'active'
ON CONFLICT DO NOTHING;

SELECT 'Advanced Reminder System tables created successfully!' as status;
