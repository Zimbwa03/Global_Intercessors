
-- Global Intercessors Database Setup Script
-- Run this in your Supabase SQL Editor

-- Drop existing triggers first to avoid dependency errors
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Drop existing functions and tables to avoid conflicts
DROP FUNCTION IF EXISTS create_prayer_slot_service(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_prayer_slot_service(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_user_profile_exists(UUID);
DROP FUNCTION IF EXISTS create_user_profile_service(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_prayer_slot_service(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_prayer_slot(TEXT);
DROP FUNCTION IF EXISTS change_prayer_slot(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS prayer_slots CASCADE;
DROP TABLE IF EXISTS available_slots CASCADE;
DROP TABLE IF EXISTS prayer_sessions CASCADE;
DROP TABLE IF EXISTS attendance_log CASCADE;
DROP TABLE IF EXISTS zoom_meetings CASCADE;
DROP TABLE IF EXISTS audio_bible_progress CASCADE;
DROP TABLE IF EXISTS fasting_registrations CASCADE;
DROP TABLE IF EXISTS updates CASCADE;

-- Create user_profiles table (must be first due to dependencies)
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

-- Create admin_users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create prayer_slots table
CREATE TABLE prayer_slots (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  missed_count INTEGER NOT NULL DEFAULT 0,
  skip_start_date TIMESTAMP,
  skip_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create available_slots table
CREATE TABLE available_slots (
  id SERIAL PRIMARY KEY,
  slot_time TEXT NOT NULL UNIQUE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

-- Create prayer_sessions table
CREATE TABLE prayer_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  session_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create attendance_log table
CREATE TABLE attendance_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_id INTEGER,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  zoom_join_time TIMESTAMP,
  zoom_leave_time TIMESTAMP,
  zoom_meeting_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create zoom_meetings table
CREATE TABLE zoom_meetings (
  id SERIAL PRIMARY KEY,
  meeting_id TEXT NOT NULL UNIQUE,
  meeting_uuid TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER,
  participant_count INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create audio_bible_progress table
CREATE TABLE audio_bible_progress (
  id SERIAL PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER DEFAULT 1,
  last_played TIMESTAMP DEFAULT NOW() NOT NULL,
  total_books INTEGER DEFAULT 66,
  total_chapters INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  slot_time TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create fasting_registrations table
CREATE TABLE fasting_registrations (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  region TEXT NOT NULL,
  travel_cost TEXT DEFAULT '0',
  gps_latitude TEXT,
  gps_longitude TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create updates table for admin announcements
CREATE TABLE updates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  schedule TEXT NOT NULL DEFAULT 'immediate',
  expiry TEXT NOT NULL DEFAULT 'never',
  send_notification BOOLEAN DEFAULT false,
  send_email BOOLEAN DEFAULT false,
  pin_to_top BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert sample available prayer slots (24-hour coverage)
INSERT INTO available_slots (slot_time, is_available) VALUES 
  ('00:00–00:30', true),
  ('00:30–01:00', true),
  ('01:00–01:30', true),
  ('01:30–02:00', true),
  ('02:00–02:30', true),
  ('02:30–03:00', true),
  ('03:00–03:30', true),
  ('03:30–04:00', true),
  ('04:00–04:30', true),
  ('04:30–05:00', true),
  ('05:00–05:30', true),
  ('05:30–06:00', true),
  ('06:00–06:30', true),
  ('06:30–07:00', true),
  ('07:00–07:30', true),
  ('07:30–08:00', true),
  ('08:00–08:30', true),
  ('08:30–09:00', true),
  ('09:00–09:30', true),
  ('09:30–10:00', true),
  ('10:00–10:30', true),
  ('10:30–11:00', true),
  ('11:00–11:30', true),
  ('11:30–12:00', true),
  ('12:00–12:30', true),
  ('12:30–13:00', true),
  ('13:00–13:30', true),
  ('13:30–14:00', true),
  ('14:00–14:30', true),
  ('14:30–15:00', true),
  ('15:00–15:30', true),
  ('15:30–16:00', true),
  ('16:00–16:30', true),
  ('16:30–17:00', true),
  ('17:00–17:30', true),
  ('17:30–18:00', true),
  ('18:00–18:30', true),
  ('18:30–19:00', true),
  ('19:00–19:30', true),
  ('19:30–20:00', true),
  ('20:00–20:30', true),
  ('20:30–21:00', true),
  ('21:00–21:30', true),
  ('21:30–22:00', true),
  ('22:00–22:30', true),
  ('22:30–23:00', true),
  ('23:00–23:30', true),
  ('23:30–00:00', true)
ON CONFLICT (slot_time) DO NOTHING;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_bible_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for service role" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON admin_users;
DROP POLICY IF EXISTS "Enable insert for admin creation" ON admin_users;
DROP POLICY IF EXISTS "Enable update for admins" ON admin_users;
DROP POLICY IF EXISTS "Enable all for service role" ON prayer_slots;
DROP POLICY IF EXISTS "Users can view their own prayer slots" ON prayer_slots;
DROP POLICY IF EXISTS "Users can insert their own prayer slots" ON prayer_slots;
DROP POLICY IF EXISTS "Users can update their own prayer slots" ON prayer_slots;

-- Create RLS policies for user_profiles
CREATE POLICY "Enable all for service role" ON user_profiles
    FOR ALL USING (current_setting('role') = 'service_role' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for admin_users table
CREATE POLICY "Enable read access for all users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Enable insert for admin creation" ON admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for admins" ON admin_users FOR UPDATE USING (true);

-- Create RLS policies for prayer_slots
CREATE POLICY "Enable all for service role" ON prayer_slots
    FOR ALL USING (current_setting('role') = 'service_role' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own prayer slots" ON prayer_slots
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own prayer slots" ON prayer_slots
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own prayer slots" ON prayer_slots
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Create policies for available_slots table
CREATE POLICY "Enable read access for all users" ON available_slots FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users" ON available_slots FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for prayer_sessions table
CREATE POLICY "Users can view their own sessions" ON prayer_sessions FOR SELECT USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert their own sessions" ON prayer_sessions FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Create policies for attendance_log table
CREATE POLICY "Users can view their own attendance" ON attendance_log FOR SELECT USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Enable all for authenticated users" ON attendance_log FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for zoom_meetings table
CREATE POLICY "Enable read access for authenticated users" ON zoom_meetings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON zoom_meetings FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for audio_bible_progress table
CREATE POLICY "Enable read access for authenticated users" ON audio_bible_progress FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON audio_bible_progress FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for fasting_registrations table
CREATE POLICY "Enable read access for all users" ON fasting_registrations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON fasting_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON fasting_registrations FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for updates table
CREATE POLICY "Enable read access for all users" ON updates FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON updates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON updates FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Service role functions to bypass RLS policies

-- Function to check if user profile exists
CREATE OR REPLACE FUNCTION check_user_profile_exists(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id
  );
END;
$$;

-- Function to create user profile with service role privileges
CREATE OR REPLACE FUNCTION create_user_profile_service(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT '',
  user_role TEXT DEFAULT 'intercessor'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    user_full_name,
    user_role,
    true,
    NOW(),
    NOW()
  );
END;
$$;

-- Function to create prayer slot with service role privileges
CREATE OR REPLACE FUNCTION create_prayer_slot_service(
  p_user_id TEXT,
  p_user_email TEXT,
  p_slot_time TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_slot_id INTEGER;
  result json;
BEGIN
  -- Check if user already has a slot
  IF EXISTS (SELECT 1 FROM prayer_slots WHERE user_id = p_user_id) THEN
    -- Update existing slot instead of creating new one
    UPDATE prayer_slots 
    SET 
      slot_time = p_slot_time,
      user_email = p_user_email,
      status = p_status,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO new_slot_id;
  ELSE
    -- Create new slot
    INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
    VALUES (
      p_user_id,
      p_user_email,
      p_slot_time,
      p_status,
      0,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_slot_id;
  END IF;
  
  -- Return the slot data
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE id = new_slot_id;
  
  RETURN result;
END;
$$;

-- Function to update prayer slot with service role privileges
CREATE OR REPLACE FUNCTION update_prayer_slot_service(
  p_user_id TEXT,
  p_slot_time TEXT,
  p_status TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Update existing prayer slot bypassing RLS
  UPDATE prayer_slots 
  SET 
    slot_time = CASE WHEN p_slot_time IS NOT NULL AND p_slot_time != '' THEN p_slot_time ELSE slot_time END,
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return the updated slot
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$;

-- Function to get user's prayer slot (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_prayer_slot(p_user_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Get the most recent prayer slot for the user
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'skip_start_date', skip_start_date,
    'skip_end_date', skip_end_date,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Updated change_prayer_slot function to handle retrieval mode
CREATE OR REPLACE FUNCTION change_prayer_slot(
  p_user_id TEXT,
  p_slot_time TEXT,
  p_user_email TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  user_email_to_use TEXT;
BEGIN
  -- If parameters are null, just return existing slot (retrieval mode)
  IF p_slot_time IS NULL AND p_user_email IS NULL THEN
    SELECT json_build_object(
      'id', id,
      'user_id', user_id,
      'user_email', user_email,
      'slot_time', slot_time,
      'status', status,
      'missed_count', missed_count,
      'skip_start_date', skip_start_date,
      'skip_end_date', skip_end_date,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO result
    FROM prayer_slots
    WHERE user_id = p_user_id
    ORDER BY updated_at DESC
    LIMIT 1;
    
    RETURN result;
  END IF;

  -- Determine email to use
  user_email_to_use := COALESCE(p_user_email, '');

  -- Check if user already has a slot
  IF EXISTS (SELECT 1 FROM prayer_slots WHERE user_id = p_user_id) THEN
    -- Update existing slot
    UPDATE prayer_slots 
    SET 
      slot_time = p_slot_time,
      user_email = user_email_to_use,
      status = 'active',
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Create new slot
    INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
    VALUES (
      p_user_id,
      user_email_to_use,
      p_slot_time,
      'active',
      0,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Return the updated/created slot
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'skip_start_date', skip_start_date,
    'skip_end_date', skip_end_date,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION check_user_profile_exists(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile_service(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_prayer_slot_service(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_prayer_slot_service(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_prayer_slot(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION change_prayer_slot(TEXT, TEXT, TEXT) TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_user_id ON prayer_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_user_email ON prayer_slots(user_email);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_slot_time ON prayer_slots(slot_time);
