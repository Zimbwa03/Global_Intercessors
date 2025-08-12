-- FINAL FIX: Complete RLS policy reset for prayer_slots table
-- This will resolve the persistent service role access issue

-- Step 1: Completely disable RLS temporarily
ALTER TABLE prayer_slots DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies for prayer_slots and drop them
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE tablename = 'prayer_slots'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON ' || quote_ident(policy_record.schemaname) || '.' || quote_ident(policy_record.tablename);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Grant complete permissions to service_role
GRANT ALL PRIVILEGES ON TABLE prayer_slots TO service_role;
GRANT ALL PRIVILEGES ON SEQUENCE prayer_slots_id_seq TO service_role;

-- Step 4: Grant permissions to authenticated role (for webapp)  
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE prayer_slots TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prayer_slots_id_seq TO authenticated;

-- Step 5: Create simple, permissive policies
CREATE POLICY "service_role_bypass_all" ON prayer_slots
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON prayer_slots  
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 6: Re-enable RLS with new policies
ALTER TABLE prayer_slots ENABLE ROW LEVEL SECURITY;

-- Step 7: Test queries to verify access works
-- Test service role access
SET ROLE service_role;
SELECT COUNT(*) as service_role_count FROM prayer_slots;
SELECT status, COUNT(*) as count FROM prayer_slots GROUP BY status;
RESET ROLE;

-- Test authenticated access  
SET ROLE authenticated;
SELECT COUNT(*) as authenticated_count FROM prayer_slots;
RESET ROLE;

-- Step 8: Verify all policies are correctly set
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'prayer_slots'
ORDER BY policyname;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE 'Prayer slots RLS policies completely reset and configured for service role access';
    RAISE NOTICE 'Service role and authenticated users now have full access to prayer_slots table';
END $$;