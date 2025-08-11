-- Fix Row Level Security policy for prayer_slots table to allow service role access
-- This enables the WhatsApp bot to read prayer slot data for reminders

-- Create policy to allow service role to read all prayer_slots
CREATE POLICY "Allow service role to read prayer_slots" ON prayer_slots
FOR SELECT 
TO service_role
USING (true);

-- Create policy to allow service role to insert prayer_slots (for testing)
CREATE POLICY "Allow service role to insert prayer_slots" ON prayer_slots
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Create policy to allow service role to update prayer_slots
CREATE POLICY "Allow service role to update prayer_slots" ON prayer_slots
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled (it should already be enabled)
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service_role
GRANT SELECT, INSERT, UPDATE ON prayer_slots TO service_role;