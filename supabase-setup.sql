-- Global Intercessors Database Setup Script
-- Run this in your Supabase SQL Editor

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create prayer_slots table
CREATE TABLE IF NOT EXISTS prayer_slots (
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
CREATE TABLE IF NOT EXISTS available_slots (
  id SERIAL PRIMARY KEY,
  slot_time TEXT NOT NULL UNIQUE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

-- Create prayer_sessions table
CREATE TABLE IF NOT EXISTS prayer_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  session_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create attendance_log table
CREATE TABLE IF NOT EXISTS attendance_log (
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
CREATE TABLE IF NOT EXISTS zoom_meetings (
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
CREATE TABLE IF NOT EXISTS audio_bible_progress (
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
CREATE TABLE IF NOT EXISTS fasting_registrations (
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
CREATE TABLE IF NOT EXISTS updates (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
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
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_bible_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users table
CREATE POLICY "Enable read access for all users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON admin_users FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for prayer_slots table
CREATE POLICY "Users can view their own prayer slots" ON prayer_slots FOR SELECT USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Users can insert their own prayer slots" ON prayer_slots FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update their own prayer slots" ON prayer_slots FOR UPDATE USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email'));

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