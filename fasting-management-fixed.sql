-- Enhanced Fasting Program Management System (FIXED)
-- Run this in your Supabase SQL Editor

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
  special_instructions TEXT DEFAULT 'Prepare your heart through prayer. Fast according to your spiritual maturity and health condition. Stay hydrated and seek medical advice if needed.',
  contact_email TEXT DEFAULT 'neezykidngoni@gmail.com',
  contact_phone TEXT DEFAULT '+263785494594',
  location_details TEXT DEFAULT 'Global Event - Online participation via Zoom and local prayer centers',
  prayer_focus TEXT DEFAULT 'Revival, Breakthrough, National Healing, Family Restoration',
  zoom_meeting_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  'October 2025 - Global Intercession Revival',
  'Join Global Intercessors worldwide for 3 days of powerful prayer and fasting. Seek God''s face together as we intercede for nations, families, and breakthrough. This is our monthly gathering for intensive prayer and spiritual warfare.',
  '2025-10-31 18:00:00+00'::timestamp with time zone, -- Last Friday of October, 6 PM
  '2025-11-03 18:00:00+00'::timestamp with time zone, -- Monday 6 PM (3 days later)
  NOW(), -- Registration open now
  '2025-10-30 23:59:59+00'::timestamp with time zone, -- Close day before
  'Revival, Breakthrough, National Healing, Family Restoration, Global Awakening',
  'Prepare your heart through prayer and meditation. Fast according to your spiritual maturity and health condition. Stay hydrated and seek medical advice if you have health concerns.',
  'neezykidngoni@gmail.com',
  '+263785494594'
WHERE NOT EXISTS (SELECT 1 FROM fasting_program_details WHERE is_active = true);

-- Enhanced function to get current active fasting program
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
  WHERE EXISTS (
    SELECT 1 FROM fasting_program_details fpd 
    WHERE fpd.is_active = true 
    AND fr.created_at >= fpd.registration_open_date
    AND fr.created_at <= fpd.registration_close_date
  );

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
    'special_instructions', special_instructions,
    'contact_email', contact_email,
    'contact_phone', contact_phone,
    'location_details', location_details,
    'prayer_focus', prayer_focus,
    'zoom_meeting_link', zoom_meeting_link,
    'days_until_start', EXTRACT(DAY FROM (start_date - NOW())),
    'days_until_end', EXTRACT(DAY FROM (end_date - NOW())),
    'days_until_registration_close', EXTRACT(DAY FROM (registration_close_date - NOW())),
    'registration_is_open', (NOW() >= registration_open_date AND NOW() <= registration_close_date),
    'program_has_started', (NOW() >= start_date),
    'program_has_ended', (NOW() >= end_date),
    'registration_progress_percentage', ROUND((current_participants * 100.0 / GREATEST(max_participants, 1)), 2),
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
  p_special_instructions TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_location_details TEXT DEFAULT NULL,
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
    special_instructions = COALESCE(p_special_instructions, special_instructions),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    location_details = COALESCE(p_location_details, location_details),
    prayer_focus = COALESCE(p_prayer_focus, prayer_focus),
    zoom_meeting_link = COALESCE(p_zoom_meeting_link, zoom_meeting_link),
    updated_at = NOW()
  WHERE is_active = true;
  
  -- Return the updated details
  SELECT get_active_fasting_program() INTO updated_program;
  
  RETURN updated_program;
END;
$$;

-- Enable RLS and create policies
ALTER TABLE fasting_program_details ENABLE ROW LEVEL SECURITY;

-- Policies for public read access and admin write access
CREATE POLICY "Public read access to active fasting programs" 
  ON fasting_program_details FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admin full access to fasting programs" 
  ON fasting_program_details FOR ALL 
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_program_active ON fasting_program_details(is_active);
CREATE INDEX IF NOT EXISTS idx_fasting_program_status ON fasting_program_details(program_status);
CREATE INDEX IF NOT EXISTS idx_fasting_program_dates ON fasting_program_details(start_date, end_date);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_fasting_program() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_fasting_program_details(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Trigger function to create automatic announcements when program is updated
CREATE OR REPLACE FUNCTION create_fasting_update_announcement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create announcement if significant fields changed
  IF (OLD.program_title IS DISTINCT FROM NEW.program_title) OR 
     (OLD.program_subtitle IS DISTINCT FROM NEW.program_subtitle) OR
     (OLD.start_date IS DISTINCT FROM NEW.start_date) OR 
     (OLD.end_date IS DISTINCT FROM NEW.end_date) OR 
     (OLD.registration_close_date IS DISTINCT FROM NEW.registration_close_date) THEN
    
    INSERT INTO updates (
      title,
      description,
      type,
      priority,
      pin_to_top,
      is_active,
      send_notification,
      created_at,
      updated_at
    ) VALUES (
      'Fasting Program Updated: ' || NEW.program_title,
      'Program details have been updated. ' || 
      CASE 
        WHEN OLD.program_subtitle IS DISTINCT FROM NEW.program_subtitle THEN 
          'Event: ' || NEW.program_subtitle || '. '
        ELSE ''
      END ||
      CASE 
        WHEN OLD.start_date IS DISTINCT FROM NEW.start_date THEN 
          'New start date: ' || TO_CHAR(NEW.start_date, 'Month DD, YYYY at HH24:MI UTC') || '. '
        ELSE ''
      END ||
      CASE 
        WHEN OLD.registration_close_date IS DISTINCT FROM NEW.registration_close_date THEN 
          'Registration closes: ' || TO_CHAR(NEW.registration_close_date, 'Month DD, YYYY at HH24:MI UTC') || '. '
        ELSE ''
      END ||
      'Please check the Global Intercessors app for complete details.',
      'announcement',
      'high',
      true,
      true,
      true, -- Enable automatic WhatsApp notification
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic announcements
DROP TRIGGER IF EXISTS fasting_update_announcement ON fasting_program_details;
CREATE TRIGGER fasting_update_announcement
  AFTER UPDATE ON fasting_program_details
  FOR EACH ROW
  EXECUTE FUNCTION create_fasting_update_announcement();

-- Final verification and status message
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Fasting Program Management setup completed successfully!';
  RAISE NOTICE 'Created tables: fasting_program_details';
  RAISE NOTICE 'Created functions: get_active_fasting_program, update_fasting_program_details';
  RAISE NOTICE 'Set up automatic announcements when program details change';
  RAISE NOTICE 'Admin can now edit program name, dates, and all details for monthly events';
END $$;

-- Example usage for admins:
-- 
-- Get current program details:
-- SELECT get_active_fasting_program();
--
-- Update program for next month:
-- SELECT update_fasting_program_details(
--   p_program_title := '3 Days & 3 Nights Prayer & Fasting',
--   p_program_subtitle := 'November 2025 - Thanksgiving Revival',
--   p_start_date := '2025-11-28 18:00:00+00'::timestamp with time zone,
--   p_end_date := '2025-12-01 18:00:00+00'::timestamp with time zone,
--   p_registration_close_date := '2025-11-27 23:59:59+00'::timestamp with time zone
-- );
