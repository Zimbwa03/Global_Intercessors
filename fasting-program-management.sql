
-- Global Intercessors - Fasting Program Management Functions
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create fasting_program_details table to store editable program information
CREATE TABLE IF NOT EXISTS fasting_program_details (
  id SERIAL PRIMARY KEY,
  program_title TEXT NOT NULL DEFAULT '3 Days & 3 Nights Fasting Program',
  program_subtitle TEXT DEFAULT 'August 2025',
  program_description TEXT DEFAULT 'Join us for a powerful time of prayer and fasting',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 days',
  registration_open_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_close_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  max_participants INTEGER DEFAULT 1000,
  current_participants INTEGER DEFAULT 0,
  program_status TEXT DEFAULT 'upcoming' CHECK (program_status IN ('upcoming', 'active', 'completed', 'cancelled')),
  special_instructions TEXT DEFAULT 'Please prepare your heart through prayer',
  contact_email TEXT DEFAULT 'info@globalintercessors.org',
  location_details TEXT DEFAULT 'Online and Regional Centers',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default program details if table is empty
INSERT INTO fasting_program_details (
  program_title,
  program_subtitle,
  program_description,
  start_date,
  end_date,
  registration_open_date,
  registration_close_date,
  special_instructions,
  location_details
) 
SELECT 
  '3 Days & 3 Nights Fasting Program',
  'August 2025',
  'Join us for a powerful time of prayer and fasting as we seek God''s face together. This is a global gathering of intercessors united in purpose.',
  '2025-08-28 18:00:00+00'::timestamp with time zone,
  '2025-08-31 18:00:00+00'::timestamp with time zone,
  '2025-08-01 00:00:00+00'::timestamp with time zone,
  '2025-08-27 23:59:59+00'::timestamp with time zone,
  'Begin with prayer and preparation. Fast according to your ability - whether complete, Daniel fast, or partial. Stay hydrated and listen to your body.',
  'Online via Zoom and at Regional Prayer Centers worldwide'
WHERE NOT EXISTS (SELECT 1 FROM fasting_program_details);

-- Enable RLS for the table
ALTER TABLE fasting_program_details ENABLE ROW LEVEL SECURITY;

-- Create policies for the table
CREATE POLICY "Enable read access for all users" ON fasting_program_details FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users" ON fasting_program_details FOR ALL USING (auth.role() = 'authenticated');

-- Function to get current active fasting program details
CREATE OR REPLACE FUNCTION get_active_fasting_program()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  program_details json;
BEGIN
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
    'location_details', location_details,
    'days_until_start', EXTRACT(DAY FROM (start_date - NOW())),
    'days_until_registration_close', EXTRACT(DAY FROM (registration_close_date - NOW())),
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

-- Function to update fasting program details (Admin only)
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
  p_location_details TEXT DEFAULT NULL
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
    location_details = COALESCE(p_location_details, location_details),
    updated_at = NOW()
  WHERE is_active = true;
  
  -- Return the updated details
  SELECT get_active_fasting_program() INTO updated_program;
  
  RETURN updated_program;
END;
$$;

-- Function to update participant count when someone registers
CREATE OR REPLACE FUNCTION increment_participant_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE fasting_program_details 
  SET 
    current_participants = current_participants + 1,
    updated_at = NOW()
  WHERE is_active = true;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update participant count
DROP TRIGGER IF EXISTS update_participant_count ON fasting_registrations;
CREATE TRIGGER update_participant_count
  AFTER INSERT ON fasting_registrations
  FOR EACH ROW
  EXECUTE FUNCTION increment_participant_count();

-- Function to create automatic announcement when program details are updated
CREATE OR REPLACE FUNCTION create_program_update_announcement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create announcement if significant fields changed
  IF (OLD.program_title IS DISTINCT FROM NEW.program_title) OR 
     (OLD.start_date IS DISTINCT FROM NEW.start_date) OR 
     (OLD.end_date IS DISTINCT FROM NEW.end_date) OR 
     (OLD.registration_close_date IS DISTINCT FROM NEW.registration_close_date) OR
     (OLD.program_description IS DISTINCT FROM NEW.program_description) THEN
    
    INSERT INTO updates (
      title,
      description,
      type,
      priority,
      pin_to_top,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      'Fasting Program Updated: ' || NEW.program_title,
      'Program details have been updated. ' || 
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
      NEW.program_description,
      'announcement',
      'high',
      true,
      true,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic announcements
DROP TRIGGER IF EXISTS program_update_announcement ON fasting_program_details;
CREATE TRIGGER program_update_announcement
  AFTER UPDATE ON fasting_program_details
  FOR EACH ROW
  EXECUTE FUNCTION create_program_update_announcement();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_fasting_program() TO service_role;
GRANT EXECUTE ON FUNCTION update_fasting_program_details(TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_participant_count() TO service_role;
GRANT EXECUTE ON FUNCTION create_program_update_announcement() TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_program_details_active ON fasting_program_details(is_active);
CREATE INDEX IF NOT EXISTS idx_fasting_program_details_status ON fasting_program_details(program_status);
CREATE INDEX IF NOT EXISTS idx_fasting_program_details_dates ON fasting_program_details(start_date, end_date);

-- Example usage queries (for testing):

-- Get current program details
-- SELECT get_active_fasting_program();

-- Update program details (example)
-- SELECT update_fasting_program_details(
--   p_program_title := '3 Days & 3 Nights Fasting Program',
--   p_program_subtitle := 'July 2025 - Special Edition',
--   p_start_date := '2025-07-15 18:00:00+00'::timestamp with time zone,
--   p_registration_close_date := '2025-07-14 23:59:59+00'::timestamp with time zone
-- );
