-- ============================================
-- Global Intercessors User Profiles Table
-- ============================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    
    -- Location information
    country TEXT,
    city TEXT,
    timezone TEXT,
    coordinates POINT,
    
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
    }',
    
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

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
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

-- Function to create user profile automatically on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on user signup
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET last_active = NOW() 
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Function to increment prayer streak
CREATE OR REPLACE FUNCTION increment_prayer_streak(user_email TEXT, prayer_minutes INTEGER DEFAULT 30)
RETURNS VOID AS $$
DECLARE
    last_prayer_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    -- Get the last prayer date from prayer sessions or attendance
    SELECT MAX(DATE(created_at)) INTO last_prayer_date
    FROM prayer_sessions 
    WHERE user_email = increment_prayer_streak.user_email;
    
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert sample profile data (uncomment if needed for testing)
/*
INSERT INTO user_profiles (
    user_id,
    email,
    full_name,
    display_name,
    country,
    city,
    timezone,
    denomination,
    years_of_faith,
    spiritual_gifts,
    prayer_languages,
    preferred_prayer_time,
    prayer_duration_minutes
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
    'intercessor@example.com',
    'John Doe',
    'Brother John',
    'United States',
    'New York',
    'America/New_York',
    'Christian',
    10,
    ARRAY['intercession', 'prophecy', 'healing'],
    ARRAY['English', 'Spanish', 'tongues'],
    '06:00',
    30
);
*/

-- ============================================
-- Maintenance and Cleanup
-- ============================================

-- Function to clean up inactive profiles (older than 2 years with no activity)
CREATE OR REPLACE FUNCTION cleanup_inactive_profiles()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_profiles 
    WHERE 
        last_active < NOW() - INTERVAL '2 years'
        AND join_date < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup monthly (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-inactive-profiles', '0 0 1 * *', 'SELECT cleanup_inactive_profiles();');

COMMENT ON TABLE user_profiles IS 'Comprehensive user profiles for Global Intercessors platform with spiritual and prayer-related information';