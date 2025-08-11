-- Check current policies and completely reset prayer_slots RLS
-- This is a comprehensive fix for the WhatsApp bot access issue

-- First, check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prayer_slots';

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'prayer_slots';

-- Disable RLS temporarily to clear all policies
ALTER TABLE prayer_slots DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on prayer_slots table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'prayer_slots'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON prayer_slots';
    END LOOP;
END $$;

-- Grant full permissions to service_role
GRANT ALL PRIVILEGES ON prayer_slots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE prayer_slots_id_seq TO service_role;

-- Grant permissions to authenticated users (for webapp)
GRANT SELECT, INSERT, UPDATE, DELETE ON prayer_slots TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prayer_slots_id_seq TO authenticated;

-- Create new comprehensive policies
CREATE POLICY "service_role_full_access" ON prayer_slots
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_access" ON prayer_slots
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;

-- Verify the fix by checking policies again
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'prayer_slots';

-- Test query that the service role should be able to execute
SELECT COUNT(*) as total_prayer_slots FROM prayer_slots;
SELECT status, COUNT(*) as count FROM prayer_slots GROUP BY status;