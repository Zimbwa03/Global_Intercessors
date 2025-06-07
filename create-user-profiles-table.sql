


-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'intercessor',
    phone_number VARCHAR(50),
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable all for service role" ON user_profiles;

-- Create RLS policies for user_profiles
-- Allow service role to do everything (for server-side operations)
CREATE POLICY "Enable all for service role" ON user_profiles
    FOR ALL USING (current_setting('role') = 'service_role' OR auth.jwt() ->> 'role' = 'service_role');

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert profiles
CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update prayer_slots RLS policies as well
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own prayer slots" ON prayer_slots;
DROP POLICY IF EXISTS "Users can insert their own prayer slots" ON prayer_slots;
DROP POLICY IF EXISTS "Users can update their own prayer slots" ON prayer_slots;
DROP POLICY IF EXISTS "Enable all for service role" ON prayer_slots;

-- Create RLS policies for prayer_slots
-- Allow service role to do everything (for server-side operations)
CREATE POLICY "Enable all for service role" ON prayer_slots
    FOR ALL USING (current_setting('role') = 'service_role' OR auth.jwt() ->> 'role' = 'service_role');

-- Allow users to view their own prayer slots
CREATE POLICY "Users can view their own prayer slots" ON prayer_slots
    FOR SELECT USING (user_id = auth.uid()::text);

-- Allow users to insert their own prayer slots
CREATE POLICY "Users can insert their own prayer slots" ON prayer_slots
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Allow users to update their own prayer slots
CREATE POLICY "Users can update their own prayer slots" ON prayer_slots
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Create trigger
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);


