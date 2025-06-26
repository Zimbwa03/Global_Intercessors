
-- Fix RLS policies for zoom_meetings table to allow admin operations
-- Copy and paste this entire code into your Supabase SQL editor

-- First, disable RLS temporarily to make changes
ALTER TABLE zoom_meetings DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON zoom_meetings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON zoom_meetings;
DROP POLICY IF EXISTS "Enable all for service role" ON zoom_meetings;
DROP POLICY IF EXISTS "Allow service role full access" ON zoom_meetings;
DROP POLICY IF EXISTS "Allow admin operations" ON zoom_meetings;

-- Create new policies that allow proper access
-- 1. Allow service role (backend) to do everything
CREATE POLICY "Allow service role full access" ON zoom_meetings
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON zoom_meetings
    FOR SELECT TO authenticated USING (true);

-- 3. Allow authenticated users to insert (for admin operations)
CREATE POLICY "Allow authenticated insert" ON zoom_meetings
    FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON zoom_meetings
    FOR UPDATE TO authenticated USING (true);

-- Re-enable RLS
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON zoom_meetings TO authenticated;
GRANT ALL ON zoom_meetings TO service_role;
GRANT ALL ON zoom_meetings TO anon;
