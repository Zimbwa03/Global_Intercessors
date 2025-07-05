-- ============================================
-- Global Intercessors User Profiles Table (Supabase Compatible)
-- ============================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    
    -- Location information
    country TEXT,
    city TEXT,
    timezone TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    
    -- Spiritual profile
    denomination TEXT,
    years_of_faith INTEGER,
    spiritual_gifts TEXT[],
    prayer_languages TEXT[],
    
    -- Prayer preferences
    preferred_prayer_time TEXT,
    prayer_duration_minutes INTEGER DEFAULT 30,
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "prayer_reminders": true,
        "community_updates": true,
        "fasting_alerts": true
    }'::jsonb,
    
    -- Profile settings
    profile_visibility TEXT DEFAULT 'community' CHECK (profile_visibility IN ('public', 'community', 'private')),
    allow_prayer_requests BOOLEAN DEFAULT true,
    allow_mentoring BOOLEAN DEFAULT false,
    
    -- Activity tracking
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE,
    prayer_streak_days INTEGER DEFAULT 0,
    total_prayer_minutes INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Community members can view public and community profiles
CREATE POLICY "Community can view public profiles" ON user_profiles
    FOR SELECT USING (
        profile_visibility = 'public' OR 
        (profile_visibility = 'community' AND auth.uid() IS NOT NULL)
    );

-- ============================================
-- Functions for Profile Management
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_updated_at();

-- Function to create user profile manually
CREATE OR REPLACE FUNCTION create_user_profile_manual(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    INSERT INTO user_profiles (user_id, email, full_name)
    VALUES (
        p_user_id,
        p_email,
        COALESCE(p_full_name, p_email)
    )
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET last_active = NOW() 
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment prayer streak
CREATE OR REPLACE FUNCTION increment_prayer_streak(user_email TEXT, prayer_minutes INTEGER DEFAULT 30)
RETURNS VOID AS $$
DECLARE
    last_prayer_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    -- Get the last prayer date from the user's activity
    SELECT MAX(DATE(last_active)) INTO last_prayer_date
    FROM user_profiles 
    WHERE email = increment_prayer_streak.user_email;
    
    -- Update prayer streak and total minutes
    UPDATE user_profiles 
    SET 
        prayer_streak_days = CASE 
            WHEN last_prayer_date = today - INTERVAL '1 day' OR last_prayer_date = today THEN 
                prayer_streak_days + 1
            ELSE 
                1
        END,
        total_prayer_minutes = total_prayer_minutes + prayer_minutes,
        last_active = NOW()
    WHERE email = increment_prayer_streak.user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with computed fields
CREATE OR REPLACE FUNCTION get_user_profile_with_stats(user_email TEXT)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    country TEXT,
    city TEXT,
    timezone TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    denomination TEXT,
    years_of_faith INTEGER,
    spiritual_gifts TEXT[],
    prayer_languages TEXT[],
    preferred_prayer_time TEXT,
    prayer_duration_minutes INTEGER,
    notification_preferences JSONB,
    profile_visibility TEXT,
    allow_prayer_requests BOOLEAN,
    allow_mentoring BOOLEAN,
    join_date TIMESTAMP WITH TIME ZONE,
    last_active TIMESTAMP WITH TIME ZONE,
    prayer_streak_days INTEGER,
    total_prayer_minutes INTEGER,
    days_since_join INTEGER,
    prayer_consistency_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.user_id,
        up.email,
        up.full_name,
        up.display_name,
        up.avatar_url,
        up.phone_number,
        up.country,
        up.city,
        up.timezone,
        up.latitude,
        up.longitude,
        up.denomination,
        up.years_of_faith,
        up.spiritual_gifts,
        up.prayer_languages,
        up.preferred_prayer_time,
        up.prayer_duration_minutes,
        up.notification_preferences,
        up.profile_visibility,
        up.allow_prayer_requests,
        up.allow_mentoring,
        up.join_date,
        up.last_active,
        up.prayer_streak_days,
        up.total_prayer_minutes,
        EXTRACT(DAY FROM NOW() - up.join_date)::INTEGER as days_since_join,
        CASE 
            WHEN EXTRACT(DAY FROM NOW() - up.join_date) > 0 THEN
                ROUND((up.prayer_streak_days::NUMERIC / EXTRACT(DAY FROM NOW() - up.join_date)::NUMERIC) * 100, 2)
            ELSE 0
        END as prayer_consistency_percentage
    FROM user_profiles up
    WHERE up.email = get_user_profile_with_stats.user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Sample usage after user signup
-- ============================================

/*
-- After a user signs up, call this to create their profile:
SELECT create_user_profile_manual(
    'user-uuid-here',
    'user@example.com',
    'User Full Name'
);

-- To update user activity:
SELECT update_user_last_active('user@example.com');

-- To track prayer session:
SELECT increment_prayer_streak('user@example.com', 30);

-- To get full profile with stats:
SELECT * FROM get_user_profile_with_stats('user@example.com');
*/

COMMENT ON TABLE user_profiles IS 'User profiles for Global Intercessors platform with spiritual and prayer tracking';