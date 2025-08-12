-- Check the actual structure of all tables before inserting data

-- Check user_profiles table structure
SELECT 'user_profiles' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check prayer_slots table structure
SELECT 'prayer_slots' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'prayer_slots' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check whatsapp_bot_users table structure
SELECT 'whatsapp_bot_users' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_bot_users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- List all tables in the public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;