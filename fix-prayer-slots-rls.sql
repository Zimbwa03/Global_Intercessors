-- Fix Row Level Security policies for prayer_slots table
-- This resolves the error: "new row violates row-level security policy for table prayer_slots"

-- First, check current policies and drop them if they exist
DROP POLICY IF EXISTS "Allow service role to read prayer_slots" ON prayer_slots;
DROP POLICY IF EXISTS "Allow service role to insert prayer_slots" ON prayer_slots;
DROP POLICY IF EXISTS "Allow service role to update prayer_slots" ON prayer_slots;
DROP POLICY IF EXISTS "Allow service role full access prayer_slots" ON prayer_slots;

-- Create comprehensive policy for service role to access prayer_slots
CREATE POLICY "Allow service role full access prayer_slots" ON prayer_slots
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Also create policy for authenticated users (for webapp access)
DROP POLICY IF EXISTS "Users can read prayer_slots" ON prayer_slots;
CREATE POLICY "Users can read prayer_slots" ON prayer_slots
FOR SELECT 
TO authenticated
USING (true);

-- Grant all necessary permissions to service_role
GRANT ALL ON prayer_slots TO service_role;
GRANT USAGE ON SEQUENCE prayer_slots_id_seq TO service_role;

-- Grant permissions to authenticated role for webapp
GRANT SELECT, INSERT, UPDATE ON prayer_slots TO authenticated;
GRANT USAGE ON SEQUENCE prayer_slots_id_seq TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;

-- Check if policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prayer_slots';