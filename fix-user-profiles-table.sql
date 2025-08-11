
-- Fix user profiles table with proper structure
-- Drop and recreate the table with all needed columns

DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    region TEXT,
    role TEXT DEFAULT 'intercessor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional profile fields
    profile_picture TEXT,
    gender TEXT,
    date_of_birth DATE,
    country TEXT,
    city TEXT,
    timezone TEXT DEFAULT 'UTC+0',
    bio TEXT,
    spiritual_gifts JSONB DEFAULT '[]',
    prayer_preferences TEXT,
    fcm_token TEXT,
    
    -- WhatsApp integration
    whatsapp_number TEXT,
    whatsapp_active BOOLEAN DEFAULT false,
    
    UNIQUE(email),
    UNIQUE(phone_number),
    UNIQUE(whatsapp_number)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON user_profiles;

-- Create RLS policies
CREATE POLICY "Service role can do everything" ON user_profiles
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR ALL USING (auth.uid()::text = id::text);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON user_profiles TO anon;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_whatsapp ON user_profiles(whatsapp_number);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data if needed
INSERT INTO user_profiles (id, email, full_name, phone_number, role) 
VALUES 
    ('eb399bac-8ae0-42fb-9ee8-ffb46f63a97f', 'test@example.com', 'Test User', '+1234567890', 'intercessor')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

