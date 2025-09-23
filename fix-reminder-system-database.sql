-- ============================================
-- Fix Reminder System Database Relationships
-- ============================================

-- First, let's check and fix data type inconsistencies
-- The user_profiles table uses UUID for user_id, but prayer_slots uses text

-- 1. Add foreign key constraints and fix data types
-- ============================================

-- Check if prayer_slots needs user_id conversion from text to UUID
-- (Only run if prayer_slots.user_id is currently text)

-- Add a new UUID column if needed
ALTER TABLE prayer_slots 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- Add foreign key relationship from prayer_slots to user_profiles
-- (This will be added after we ensure data consistency)

-- Add foreign key relationship from whatsapp_bot_users to user_profiles
ALTER TABLE whatsapp_bot_users 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- 2. Create indexes for better performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_prayer_slots_user_id ON prayer_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_status ON prayer_slots(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_user_id ON whatsapp_bot_users(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_users_active ON whatsapp_bot_users(is_active);

-- 3. Create a view to simplify reminder system queries
-- ============================================

CREATE OR REPLACE VIEW prayer_slots_with_user_details AS
SELECT 
    ps.id,
    ps.user_id,
    ps.user_email,
    ps.slot_time,
    ps.status,
    ps.missed_count,
    ps.created_at,
    ps.updated_at,
    up.full_name,
    up.phone_number,
    up.timezone,
    up.notification_preferences,
    wb.whatsapp_number,
    wb.reminder_preferences,
    wb.personal_reminder_time,
    wb.is_active as whatsapp_active
FROM prayer_slots ps
LEFT JOIN user_profiles up ON ps.user_email = up.email
LEFT JOIN whatsapp_bot_users wb ON ps.user_id = wb.user_id
WHERE ps.status = 'active';

-- 4. Create functions to safely query reminder data
-- ============================================

-- Function to get active prayer slots with user details for reminders
CREATE OR REPLACE FUNCTION get_active_slots_for_reminders()
RETURNS TABLE(
    slot_id INTEGER,
    user_id TEXT,
    user_email TEXT,
    slot_time TEXT,
    full_name TEXT,
    phone_number TEXT,
    timezone TEXT,
    whatsapp_number TEXT,
    reminder_preferences TEXT,
    personal_reminder_time TEXT,
    notification_preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id::INTEGER as slot_id,
        ps.user_id::TEXT,
        ps.user_email::TEXT,
        ps.slot_time::TEXT,
        up.full_name::TEXT,
        up.phone_number::TEXT,
        up.timezone::TEXT,
        wb.whatsapp_number::TEXT,
        wb.reminder_preferences::TEXT,
        wb.personal_reminder_time::TEXT,
        up.notification_preferences
    FROM prayer_slots ps
    LEFT JOIN user_profiles up ON ps.user_email = up.email
    LEFT JOIN whatsapp_bot_users wb ON ps.user_id = wb.user_id
    WHERE ps.status = 'active' 
      AND wb.is_active = true 
      AND wb.whatsapp_number IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get WhatsApp users with prayer slots
CREATE OR REPLACE FUNCTION get_whatsapp_users_with_slots()
RETURNS TABLE(
    whatsapp_id INTEGER,
    user_id TEXT,
    whatsapp_number TEXT,
    reminder_preferences TEXT,
    personal_reminder_time TEXT,
    slot_time TEXT,
    full_name TEXT,
    timezone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wb.id::INTEGER as whatsapp_id,
        wb.user_id::TEXT,
        wb.whatsapp_number::TEXT,
        wb.reminder_preferences::TEXT,
        wb.personal_reminder_time::TEXT,
        ps.slot_time::TEXT,
        up.full_name::TEXT,
        up.timezone::TEXT
    FROM whatsapp_bot_users wb
    LEFT JOIN prayer_slots ps ON wb.user_id = ps.user_id AND ps.status = 'active'
    LEFT JOIN user_profiles up ON wb.user_id = up.user_id::TEXT OR ps.user_email = up.email
    WHERE wb.is_active = true 
      AND wb.whatsapp_number IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to maintain data consistency
-- ============================================

-- Function to sync user data when prayer slot is created/updated
CREATE OR REPLACE FUNCTION sync_prayer_slot_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user_profiles entry exists for this email
    INSERT INTO user_profiles (user_id, email, full_name)
    SELECT 
        gen_random_uuid(),
        NEW.user_email,
        COALESCE(split_part(NEW.user_email, '@', 1), 'Intercessor')
    WHERE NOT EXISTS (
        SELECT 1 FROM user_profiles WHERE email = NEW.user_email
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_user_data_on_prayer_slot ON prayer_slots;
CREATE TRIGGER sync_user_data_on_prayer_slot
    BEFORE INSERT OR UPDATE ON prayer_slots
    FOR EACH ROW
    EXECUTE FUNCTION sync_prayer_slot_user_data();

-- 6. Grant necessary permissions
-- ============================================

-- Grant permissions to service role (for API access)
GRANT SELECT ON prayer_slots_with_user_details TO service_role;
GRANT EXECUTE ON FUNCTION get_active_slots_for_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION get_whatsapp_users_with_slots() TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT ON prayer_slots_with_user_details TO authenticated;

-- 7. Sample queries for testing
-- ============================================

/*
-- Test the view
SELECT * FROM prayer_slots_with_user_details LIMIT 5;

-- Test the reminder function
SELECT * FROM get_active_slots_for_reminders() LIMIT 5;

-- Test WhatsApp users function
SELECT * FROM get_whatsapp_users_with_slots() LIMIT 5;
*/

-- ============================================
-- Data Migration (if needed)
-- ============================================

-- If you need to convert existing user_id values from text to UUID:
/*
-- Only run if prayer_slots.user_id contains UUID-formatted strings
UPDATE prayer_slots 
SET user_id_uuid = user_id::UUID 
WHERE user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE whatsapp_bot_users 
SET user_id_uuid = user_id::UUID 
WHERE user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
*/

COMMENT ON VIEW prayer_slots_with_user_details IS 'Unified view combining prayer slots with user profile and WhatsApp data for reminders';
COMMENT ON FUNCTION get_active_slots_for_reminders() IS 'Function to safely retrieve active prayer slots with user details for reminder system';
COMMENT ON FUNCTION get_whatsapp_users_with_slots() IS 'Function to retrieve WhatsApp users with their prayer slot information';


