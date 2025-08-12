-- Corrected SQL to create sample prayer slots based on actual table schemas
-- prayer_slots table uses: user_id, user_email, slot_time, status
-- Need to check user_profiles table structure first

-- Let's first check what columns exist in user_profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- Also check prayer_slots table structure (we know this one)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prayer_slots' 
AND table_schema = 'public';

-- Check whatsapp_bot_users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_bot_users' 
AND table_schema = 'public';