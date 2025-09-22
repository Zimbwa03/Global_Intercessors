-- Simple Fasting Program Management (No Errors)
-- Run this in your Supabase SQL Editor

-- Create simple fasting_program_details table with all needed columns
CREATE TABLE IF NOT EXISTS fasting_program_details (
  id SERIAL PRIMARY KEY,
  program_title TEXT NOT NULL DEFAULT '3 Days & 3 Nights Prayer & Fasting',
  program_subtitle TEXT DEFAULT 'Monthly Global Intercession Event',
  program_description TEXT DEFAULT 'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting.',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 days',
  registration_open_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_close_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '6 days',
  max_participants INTEGER DEFAULT 1000,
  current_participants INTEGER DEFAULT 0,
  program_status TEXT DEFAULT 'upcoming',
  special_instructions TEXT DEFAULT 'Prepare your heart through prayer. Fast according to your ability.',
  contact_email TEXT DEFAULT 'neezykidngoni@gmail.com',
  contact_phone TEXT DEFAULT '+263785494594',
  location_details TEXT DEFAULT 'Global Event - Online via Zoom and local centers',
  prayer_focus TEXT DEFAULT 'Revival, Breakthrough, National Healing, Family Restoration',
  zoom_meeting_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial program only if table is empty
INSERT INTO fasting_program_details (
  program_title,
  program_subtitle,
  program_description,
  start_date,
  end_date,
  registration_close_date,
  prayer_focus,
  special_instructions
) 
SELECT 
  '3 Days & 3 Nights Prayer & Fasting',
  'October 2025 - Global Intercession Revival',
  'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting. Seek God''s face together as we intercede for breakthrough.',
  '2025-10-31 18:00:00+00'::timestamp with time zone,
  '2025-11-03 18:00:00+00'::timestamp with time zone,
  '2025-10-30 23:59:59+00'::timestamp with time zone,
  'Revival, Breakthrough, National Healing, Family Restoration',
  'Prepare your heart through prayer. Fast according to your spiritual maturity and health condition.'
WHERE NOT EXISTS (SELECT 1 FROM fasting_program_details WHERE is_active = true);

-- Simple function to get fasting program details
CREATE OR REPLACE FUNCTION get_active_fasting_program()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  program_details json;
  participant_count INTEGER;
BEGIN
  -- Get participant count safely
  SELECT COUNT(*) INTO participant_count
  FROM fasting_registrations
  WHERE created_at >= (SELECT registration_open_date FROM fasting_program_details WHERE is_active = true LIMIT 1);

  -- Update participant count
  UPDATE fasting_program_details 
  SET current_participants = participant_count
  WHERE is_active = true;

  -- Get program details with calculations
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
    'special_instructions', special_instructions,
    'contact_email', contact_email,
    'contact_phone', contact_phone,
    'location_details', location_details,
    'prayer_focus', prayer_focus,
    'zoom_meeting_link', zoom_meeting_link,
    'days_until_start', GREATEST(0, EXTRACT(DAY FROM (start_date - NOW()))),
    'days_until_registration_close', GREATEST(0, EXTRACT(DAY FROM (registration_close_date - NOW()))),
    'registration_is_open', (NOW() >= registration_open_date AND NOW() <= registration_close_date),
    'program_has_started', (NOW() >= start_date),
    'program_has_ended', (NOW() >= end_date),
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

-- Simple function to update fasting program details
CREATE OR REPLACE FUNCTION update_fasting_program_details(
  p_program_title TEXT DEFAULT NULL,
  p_program_subtitle TEXT DEFAULT NULL,
  p_program_description TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_registration_close_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_max_participants INTEGER DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_prayer_focus TEXT DEFAULT NULL,
  p_zoom_meeting_link TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_program json;
BEGIN
  -- Update the active program
  UPDATE fasting_program_details 
  SET 
    program_title = COALESCE(p_program_title, program_title),
    program_subtitle = COALESCE(p_program_subtitle, program_subtitle),
    program_description = COALESCE(p_program_description, program_description),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    registration_close_date = COALESCE(p_registration_close_date, registration_close_date),
    max_participants = COALESCE(p_max_participants, max_participants),
    special_instructions = COALESCE(p_special_instructions, special_instructions),
    prayer_focus = COALESCE(p_prayer_focus, prayer_focus),
    zoom_meeting_link = COALESCE(p_zoom_meeting_link, zoom_meeting_link),
    updated_at = NOW()
  WHERE is_active = true;
  
  -- Get updated details
  SELECT get_active_fasting_program() INTO updated_program;
  
  RETURN updated_program;
END;
$$;

-- Enable basic access
ALTER TABLE fasting_program_details ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Everyone can read active fasting programs" 
  ON fasting_program_details FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Service role can manage fasting programs" 
  ON fasting_program_details FOR ALL 
  USING (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_fasting_program() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_fasting_program_details(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Success message
SELECT 
  'Simple Fasting Program Management setup completed!' as status,
  'Admin can now edit program names and dates for monthly events' as feature_ready;
