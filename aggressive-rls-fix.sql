-- AGGRESSIVE RLS FIX: Complete bypass for service role
-- This will completely remove RLS blocking for WhatsApp bot access

-- Step 1: Completely disable RLS on prayer_slots table
ALTER TABLE "public"."prayer_slots" DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant ALL privileges to service role (including sequence)
GRANT ALL PRIVILEGES ON TABLE "public"."prayer_slots" TO service_role;
GRANT ALL PRIVILEGES ON SEQUENCE "public"."prayer_slots_id_seq" TO service_role;

-- Step 3: Grant usage on schema
GRANT USAGE ON SCHEMA "public" TO service_role;

-- Step 4: Test that service role can now access data
SET ROLE service_role;
SELECT 'Service role test:' as info, COUNT(*) as count FROM "public"."prayer_slots";
SELECT user_id, slot_time, status FROM "public"."prayer_slots" WHERE status = 'active' LIMIT 3;
RESET ROLE;

-- Step 5: If you want RLS back on, re-enable with service role bypass
ALTER TABLE "public"."prayer_slots" ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policy that allows service role to bypass RLS completely  
CREATE POLICY "service_role_bypass" ON "public"."prayer_slots"
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 7: Final verification
SELECT 'Final count:' as info, COUNT(*) as total_slots FROM "public"."prayer_slots";
SELECT 'Active count:' as info, COUNT(*) as active_slots FROM "public"."prayer_slots" WHERE status = 'active';