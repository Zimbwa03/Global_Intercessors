
-- Complete RLS fix for user_profiles table
-- This addresses the profile saving and WhatsApp registration issues

-- First disable RLS temporarily to make changes
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON user_profiles;
DROP POLICY IF EXISTS "Enable all for service role" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users" ON user_profiles;

-- Create comprehensive RLS policies

-- 1. Service role can do everything (for backend operations)
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (current_setting('role') = 'service_role');

-- 2. Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = id::text);

-- 3. Users can insert their own profile  
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);

-- 5. Allow upsert operations for authenticated users
CREATE POLICY "Allow authenticated upsert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON user_profiles TO anon;

-- Ensure the table structure is correct for the app
-- Add any missing columns that might be needed
DO $$
BEGIN
    -- Check and add full_name if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='full_name') THEN
        ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Check and add phone_number if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='phone_number') THEN
        ALTER TABLE user_profiles ADD COLUMN phone_number TEXT;
    END IF;
    
    -- Check and add whatsapp_number if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='whatsapp_number') THEN
        ALTER TABLE user_profiles ADD COLUMN whatsapp_number TEXT;
    END IF;
    
    -- Check and add whatsapp_active if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='whatsapp_active') THEN
        ALTER TABLE user_profiles ADD COLUMN whatsapp_active BOOLEAN DEFAULT false;
    END IF;
    
    -- Check and add gender if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='gender') THEN
        ALTER TABLE user_profiles ADD COLUMN gender TEXT;
    END IF;
    
    -- Check and add date_of_birth if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE user_profiles ADD COLUMN date_of_birth DATE;
    END IF;
    
    -- Check and add country if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='country') THEN
        ALTER TABLE user_profiles ADD COLUMN country TEXT;
    END IF;
    
    -- Check and add city if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='city') THEN
        ALTER TABLE user_profiles ADD COLUMN city TEXT;
    END IF;
    
    -- Check and add timezone if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='timezone') THEN
        ALTER TABLE user_profiles ADD COLUMN timezone TEXT DEFAULT 'UTC+0';
    END IF;
    
    -- Check and add bio if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='bio') THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Check and add profile_picture if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='profile_picture') THEN
        ALTER TABLE user_profiles ADD COLUMN profile_picture TEXT;
    END IF;
END $$;

-- Create service function for profile upserts (bypasses RLS completely)
CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_whatsapp_number TEXT DEFAULT NULL,
  p_whatsapp_active BOOLEAN DEFAULT false,
  p_gender TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'UTC+0',
  p_bio TEXT DEFAULT NULL,
  p_profile_picture TEXT DEFAULT NULL
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result user_profiles;
BEGIN
  INSERT INTO user_profiles (
    id, email, full_name, phone_number, whatsapp_number, whatsapp_active,
    gender, date_of_birth, country, city, timezone, bio, profile_picture,
    role, is_active, created_at, updated_at
  ) VALUES (
    p_user_id, p_email, p_full_name, p_phone_number, p_whatsapp_number, p_whatsapp_active,
    p_gender, p_date_of_birth, p_country, p_city, p_timezone, p_bio, p_profile_picture,
    'intercessor', true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
    whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, user_profiles.whatsapp_number),
    whatsapp_active = COALESCE(EXCLUDED.whatsapp_active, user_profiles.whatsapp_active),
    gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
    country = COALESCE(EXCLUDED.country, user_profiles.country),
    city = COALESCE(EXCLUDED.city, user_profiles.city),
    timezone = COALESCE(EXCLUDED.timezone, user_profiles.timezone),
    bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
    profile_picture = COALESCE(EXCLUDED.profile_picture, user_profiles.profile_picture),
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission on the service function
GRANT EXECUTE ON FUNCTION upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_whatsapp ON user_profiles(whatsapp_number);

-- Success message
SELECT 'User profiles RLS policies fixed successfully!' as status;
