-- Enhanced Fasting Program Management System
-- Run this in your Supabase SQL Editor for professional monthly fasting event management

-- Create enhanced fasting_program_details table
CREATE TABLE IF NOT EXISTS fasting_program_details (
  id SERIAL PRIMARY KEY,
  program_title TEXT NOT NULL DEFAULT '3 Days & 3 Nights Prayer & Fasting',
  program_subtitle TEXT DEFAULT 'Monthly Global Intercession Event',
  program_description TEXT DEFAULT 'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting. Seek God''s face together as we intercede for nations, families, and breakthrough.',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 days',
  registration_open_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_close_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 days',
  max_participants INTEGER DEFAULT 1000,
  current_participants INTEGER DEFAULT 0,
  program_status TEXT DEFAULT 'upcoming' CHECK (program_status IN ('upcoming', 'registration_open', 'active', 'completed', 'cancelled')),
  fasting_type TEXT DEFAULT 'complete' CHECK (fasting_type IN ('complete', 'daniel', 'partial', 'water_only')),
  special_instructions TEXT DEFAULT 'Prepare your heart through prayer. Fast according to your spiritual maturity and health condition. Stay hydrated and seek medical advice if needed.',
  contact_email TEXT DEFAULT 'neezykidngoni@gmail.com',
  contact_phone TEXT DEFAULT '+263785494594',
  location_details TEXT DEFAULT 'Global Event - Online participation via Zoom and local prayer centers',
  prayer_focus TEXT DEFAULT 'Revival, Breakthrough, National Healing, Family Restoration',
  daily_prayer_times TEXT[] DEFAULT ARRAY['06:00', '12:00', '18:00', '21:00'],
  zoom_meeting_link TEXT,
  youtube_stream_link TEXT,
  registration_fee DECIMAL(10,2) DEFAULT 0.00,
  requires_approval BOOLEAN DEFAULT false,
  send_reminders BOOLEAN DEFAULT true,
  reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('daily', 'twice_daily', 'hourly')),
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fasting event templates for quick setup
CREATE TABLE IF NOT EXISTS fasting_event_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  template_description TEXT,
  duration_days INTEGER DEFAULT 3,
  default_title TEXT NOT NULL,
  default_subtitle TEXT,
  default_description TEXT,
  default_prayer_focus TEXT,
  default_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates for common fasting events
INSERT INTO fasting_event_templates (
  template_name,
  template_description,
  duration_days,
  default_title,
  default_subtitle,
  default_description,
  default_prayer_focus,
  default_instructions
) VALUES
(
  'Monthly 3-Day Fast',
  'Standard monthly 3-day prayer and fasting event',
  3,
  '3 Days & 3 Nights Prayer & Fasting',
  'Monthly Global Intercession Event',
  'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting. Seek God''s face together as we intercede for breakthrough and revival.',
  'Revival, Breakthrough, National Healing, Family Restoration',
  'Prepare your heart through prayer. Fast according to your spiritual maturity and health condition. Stay hydrated and seek medical advice if needed.'
),
(
  'New Year Consecration',
  'Special New Year consecration and dedication fast',
  3,
  'New Year Consecration Fast',
  'Starting the Year in God''s Presence',
  'Begin the new year with consecration, prayer, and seeking God''s direction for the year ahead.',
  'Divine Direction, Fresh Anointing, New Beginnings, Breakthrough',
  'This is a time of consecration and seeking God''s face for the new year. Fast with expectation for fresh anointing and divine direction.'
),
(
  'Mid-Year Revival Fast',
  'Mid-year revival and renewal fasting event',
  3,
  'Mid-Year Revival Fast',
  'Renewing Our Passion for God',
  'Join us at mid-year for renewal, revival, and fresh passion for God. Reset your spiritual focus and seek fresh fire.',
  'Revival Fire, Spiritual Renewal, Fresh Anointing, Passion for God',
  'This is a time to reset and renew. Seek God for fresh fire and renewed passion for His presence and purposes.'
),
(
  'Harvest Season Fast',
  'End-of-year harvest and thanksgiving fast',
  3,
  'Harvest Season Prayer & Fasting',
  'Gathering the End-Time Harvest',
  'Join us for powerful intercession for the end-time harvest of souls and God''s kingdom purposes.',
  'Soul Harvest, Evangelism, Mission Breakthrough, Kingdom Purposes',
  'Focus on praying for the lost, for evangelism breakthrough, and for God''s kingdom purposes to be fulfilled.'
)
ON CONFLICT (template_name) DO UPDATE SET
  default_title = EXCLUDED.default_title,
  default_description = EXCLUDED.default_description,
  default_prayer_focus = EXCLUDED.default_prayer_focus,
  updated_at = NOW();

-- Enhanced function to get current active fasting program with calculated fields
CREATE OR REPLACE FUNCTION get_active_fasting_program()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  program_details json;
  participant_count INTEGER;
BEGIN
  -- Get current participant count from registrations
  SELECT COUNT(*) INTO participant_count
  FROM fasting_registrations fr
  JOIN fasting_program_details fpd ON fpd.is_active = true
  WHERE fr.created_at >= fpd.registration_open_date
    AND fr.created_at <= fpd.registration_close_date;

  -- Update current participants count
  UPDATE fasting_program_details 
  SET current_participants = participant_count
  WHERE is_active = true;

  -- Get the enhanced program details
  SELECT json_build_object(
    'id', id,
    'program_title', program_title,
    'program_subtitle', program_subtitle,
    'program_description', program_description,
    'start_date', start_date,
    'end_date', end_date,
    'registration_open_date', registration_open_date,
    'registration_close_date', registration_close_date,
    'max_participants', max_participants,
    'current_participants', current_participants,
    'program_status', program_status,
    'fasting_type', fasting_type,
    'special_instructions', special_instructions,
    'contact_email', contact_email,
    'contact_phone', contact_phone,
    'location_details', location_details,
    'prayer_focus', prayer_focus,
    'daily_prayer_times', daily_prayer_times,
    'zoom_meeting_link', zoom_meeting_link,
    'youtube_stream_link', youtube_stream_link,
    'registration_fee', registration_fee,
    'requires_approval', requires_approval,
    'send_reminders', send_reminders,
    'reminder_frequency', reminder_frequency,
    'days_until_start', EXTRACT(DAY FROM (start_date - NOW())),
    'days_until_end', EXTRACT(DAY FROM (end_date - NOW())),
    'days_until_registration_close', EXTRACT(DAY FROM (registration_close_date - NOW())),
    'registration_is_open', (NOW() >= registration_open_date AND NOW() <= registration_close_date),
    'program_has_started', (NOW() >= start_date),
    'program_has_ended', (NOW() >= end_date),
    'registration_progress_percentage', ROUND((current_participants * 100.0 / max_participants), 2),
    'days_remaining', CASE 
      WHEN NOW() < start_date THEN EXTRACT(DAY FROM (start_date - NOW()))
      WHEN NOW() >= start_date AND NOW() <= end_date THEN EXTRACT(DAY FROM (end_date - NOW()))
      ELSE 0
    END,
    'current_phase', CASE 
      WHEN NOW() < registration_open_date THEN 'pre_registration'
      WHEN NOW() >= registration_open_date AND NOW() <= registration_close_date THEN 'registration_open'
      WHEN NOW() > registration_close_date AND NOW() < start_date THEN 'preparation'
      WHEN NOW() >= start_date AND NOW() <= end_date THEN 'active_fasting'
      WHEN NOW() > end_date THEN 'completed'
      ELSE 'unknown'
    END,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO program_details
  FROM fasting_program_details
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN program_details;
END;
$$;

-- Enhanced function to update fasting program details
CREATE OR REPLACE FUNCTION update_fasting_program_details(
  p_program_title TEXT DEFAULT NULL,
  p_program_subtitle TEXT DEFAULT NULL,
  p_program_description TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_registration_open_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_registration_close_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_max_participants INTEGER DEFAULT NULL,
  p_program_status TEXT DEFAULT NULL,
  p_fasting_type TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_location_details TEXT DEFAULT NULL,
  p_prayer_focus TEXT DEFAULT NULL,
  p_zoom_meeting_link TEXT DEFAULT NULL,
  p_youtube_stream_link TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_program json;
BEGIN
  -- Update the active program details
  UPDATE fasting_program_details 
  SET 
    program_title = COALESCE(p_program_title, program_title),
    program_subtitle = COALESCE(p_program_subtitle, program_subtitle),
    program_description = COALESCE(p_program_description, program_description),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    registration_open_date = COALESCE(p_registration_open_date, registration_open_date),
    registration_close_date = COALESCE(p_registration_close_date, registration_close_date),
    max_participants = COALESCE(p_max_participants, max_participants),
    program_status = COALESCE(p_program_status, program_status),
    fasting_type = COALESCE(p_fasting_type, fasting_type),
    special_instructions = COALESCE(p_special_instructions, special_instructions),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    location_details = COALESCE(p_location_details, location_details),
    prayer_focus = COALESCE(p_prayer_focus, prayer_focus),
    zoom_meeting_link = COALESCE(p_zoom_meeting_link, zoom_meeting_link),
    youtube_stream_link = COALESCE(p_youtube_stream_link, youtube_stream_link),
    updated_at = NOW()
  WHERE is_active = true;
  
  -- Return the updated details
  SELECT get_active_fasting_program() INTO updated_program;
  
  RETURN updated_program;
END;
$$;

-- Function to create new fasting event from template
CREATE OR REPLACE FUNCTION create_fasting_event_from_template(
  p_template_name TEXT,
  p_custom_title TEXT DEFAULT NULL,
  p_custom_subtitle TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_admin_email TEXT DEFAULT 'neezykidngoni@gmail.com'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_data fasting_event_templates;
  new_program json;
  calculated_end_date TIMESTAMP WITH TIME ZONE;
  calculated_reg_close TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get template data
  SELECT * INTO template_data
  FROM fasting_event_templates
  WHERE template_name = p_template_name AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template "%" not found', p_template_name;
  END IF;
  
  -- Calculate dates if not provided
  IF p_start_date IS NULL THEN
    p_start_date := date_trunc('day', NOW() + INTERVAL '7 days') + INTERVAL '18 hours'; -- Next week Friday 6 PM
  END IF;
  
  calculated_end_date := p_start_date + INTERVAL '%d days', template_data.duration_days;
  calculated_reg_close := p_start_date - INTERVAL '1 day'; -- Close registration 1 day before
  
  -- Deactivate previous programs
  UPDATE fasting_program_details SET is_active = false WHERE is_active = true;
  
  -- Create new program
  INSERT INTO fasting_program_details (
    program_title,
    program_subtitle,
    program_description,
    start_date,
    end_date,
    registration_open_date,
    registration_close_date,
    prayer_focus,
    special_instructions,
    contact_email,
    created_by
  ) VALUES (
    COALESCE(p_custom_title, template_data.default_title),
    COALESCE(p_custom_subtitle, template_data.default_subtitle || TO_CHAR(p_start_date, 'Month YYYY')),
    template_data.default_description,
    p_start_date,
    calculated_end_date,
    NOW(),
    calculated_reg_close,
    template_data.default_prayer_focus,
    template_data.default_instructions,
    p_admin_email,
    p_admin_email
  );
  
  -- Return the new program details
  SELECT get_active_fasting_program() INTO new_program;
  
  RETURN new_program;
END;
$$;

-- Function to automatically update program status based on dates
CREATE OR REPLACE FUNCTION update_program_status_auto()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE fasting_program_details
  SET 
    program_status = CASE
      WHEN NOW() < registration_open_date THEN 'upcoming'
      WHEN NOW() >= registration_open_date AND NOW() <= registration_close_date THEN 'registration_open'
      WHEN NOW() > registration_close_date AND NOW() < start_date THEN 'preparation'
      WHEN NOW() >= start_date AND NOW() <= end_date THEN 'active'
      WHEN NOW() > end_date THEN 'completed'
      ELSE program_status
    END,
    updated_at = NOW()
  WHERE is_active = true AND program_status != 'cancelled';
END;
$$;

-- Create trigger to auto-update status
CREATE OR REPLACE FUNCTION trigger_update_program_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_program_status_auto();
  RETURN NULL;
END;
$$;

-- Create scheduled status update trigger (every hour)
-- Note: This will be called by the application cron job
-- Schedule in your app: cron.schedule('0 * * * *', () => supabase.rpc('update_program_status_auto'))

-- Function to generate next month's fasting event automatically
CREATE OR REPLACE FUNCTION schedule_next_monthly_fast(
  p_month_offset INTEGER DEFAULT 1,
  p_admin_email TEXT DEFAULT 'neezykidngoni@gmail.com'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_month_date TIMESTAMP WITH TIME ZONE;
  next_month_name TEXT;
  new_event json;
BEGIN
  -- Calculate next month's date (last Friday of the month at 6 PM)
  next_month_date := date_trunc('month', NOW() + INTERVAL '%d months', p_month_offset) + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Find last Friday of that month
  WHILE EXTRACT(DOW FROM next_month_date) != 5 LOOP -- 5 = Friday
    next_month_date := next_month_date - INTERVAL '1 day';
  END LOOP;
  
  next_month_date := next_month_date + INTERVAL '18 hours'; -- 6 PM
  next_month_name := TO_CHAR(next_month_date, 'Month YYYY');
  
  -- Create the event using template
  SELECT create_fasting_event_from_template(
    'Monthly 3-Day Fast',
    '3 Days & 3 Nights Prayer & Fasting',
    next_month_name || ' - Global Intercession',
    next_month_date,
    p_admin_email
  ) INTO new_event;
  
  RETURN new_event;
END;
$$;

-- Insert initial fasting program if none exists
INSERT INTO fasting_program_details (
  program_title,
  program_subtitle,
  program_description,
  start_date,
  end_date,
  registration_open_date,
  registration_close_date,
  prayer_focus,
  special_instructions,
  contact_email,
  contact_phone
) 
SELECT 
  '3 Days & 3 Nights Prayer & Fasting',
  TO_CHAR(date_trunc('month', NOW()) + INTERVAL '1 month', 'Month YYYY') || ' - Global Intercession',
  'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting. Seek God''s face together as we intercede for nations, families, and breakthrough. This is our monthly gathering for intensive prayer and spiritual warfare.',
  date_trunc('month', NOW()) + INTERVAL '1 month' + INTERVAL '25 days' + INTERVAL '18 hours', -- Last Friday of next month, 6 PM
  date_trunc('month', NOW()) + INTERVAL '1 month' + INTERVAL '28 days' + INTERVAL '18 hours', -- Monday 6 PM (3 days later)
  NOW(), -- Registration open now
  date_trunc('month', NOW()) + INTERVAL '1 month' + INTERVAL '24 days' + INTERVAL '23 hours 59 minutes', -- Close day before
  'Revival, Breakthrough, National Healing, Family Restoration, Global Awakening',
  'Prepare your heart through prayer and meditation. Fast according to your spiritual maturity and health condition. Join our daily prayer calls at 6 AM, 12 PM, 6 PM, and 9 PM. Stay hydrated and seek medical advice if you have health concerns.',
  'neezykidngoni@gmail.com',
  '+263785494594'
WHERE NOT EXISTS (SELECT 1 FROM fasting_program_details WHERE is_active = true);

-- Enable RLS and create policies
ALTER TABLE fasting_program_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_event_templates ENABLE ROW LEVEL SECURITY;

-- Policies for public read access and admin write access
CREATE POLICY "Public read access to active fasting programs" 
  ON fasting_program_details FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admin full access to fasting programs" 
  ON fasting_program_details FOR ALL 
  USING (true); -- Adjust this based on your admin role system

CREATE POLICY "Public read access to fasting templates" 
  ON fasting_event_templates FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admin full access to fasting templates" 
  ON fasting_event_templates FOR ALL 
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_program_active ON fasting_program_details(is_active);
CREATE INDEX IF NOT EXISTS idx_fasting_program_status ON fasting_program_details(program_status);
CREATE INDEX IF NOT EXISTS idx_fasting_program_dates ON fasting_program_details(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fasting_templates_active ON fasting_event_templates(is_active);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_fasting_program() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_fasting_program_details(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_fasting_event_from_template(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION schedule_next_monthly_fast(INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_program_status_auto() TO anon, authenticated, service_role;

-- Final verification query
SELECT 
  'Enhanced Fasting Program Management setup completed!' as status,
  (SELECT COUNT(*) FROM fasting_program_details) as programs_count,
  (SELECT COUNT(*) FROM fasting_event_templates) as templates_count;

-- Example usage for admins:
-- 
-- 1. Create next month's fasting event:
-- SELECT schedule_next_monthly_fast(1, 'neezykidngoni@gmail.com');
--
-- 2. Update current program details:
-- SELECT update_fasting_program_details(
--   p_program_title := '3 Days & 3 Nights Prayer & Fasting',
--   p_program_subtitle := 'October 2025 - Harvest Revival',
--   p_start_date := '2025-10-31 18:00:00+00'::timestamp with time zone
-- );
--
-- 3. Get current program details:
-- SELECT get_active_fasting_program();
