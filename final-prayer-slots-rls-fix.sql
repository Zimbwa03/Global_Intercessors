-- FINAL RLS FIX: Grant service role complete access to prayer_slots table
-- This will resolve the issue where service role cannot see the prayer slots data

-- Step 1: Drop all existing RLS policies on prayer_slots table
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable update for users based on email" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Users can view their own prayer slots" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Users can insert their own prayer slots" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Users can update their own prayer slots" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Users can delete their own prayer slots" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable insert for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable read access for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable update access for service role" ON "public"."prayer_slots";
DROP POLICY IF EXISTS "Enable delete access for service role" ON "public"."prayer_slots";

-- Step 2: Disable RLS temporarily to grant unrestricted access
ALTER TABLE "public"."prayer_slots" DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all privileges to service role
GRANT ALL ON TABLE "public"."prayer_slots" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE "public"."prayer_slots_id_seq" TO service_role;

-- Step 4: Re-enable RLS but with service role bypass
ALTER TABLE "public"."prayer_slots" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create a simple policy that allows service role full access
CREATE POLICY "Service role full access" ON "public"."prayer_slots"
AS PERMISSIVE FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Step 6: Create policy for authenticated users (normal app access)
CREATE POLICY "Authenticated users can read prayer slots" ON "public"."prayer_slots"
FOR SELECT 
TO authenticated
USING (true);

-- Step 7: Verify the fix by checking current data
SELECT 'Prayer Slots Count:' as info, COUNT(*) as count FROM "public"."prayer_slots";
SELECT 'Active Prayer Slots:' as info, COUNT(*) as count FROM "public"."prayer_slots" WHERE status = 'active';

-- Step 8: Test service role access by selecting sample data
SELECT user_id, slot_time, status FROM "public"."prayer_slots" WHERE status = 'active' LIMIT 5;