-- CORRECTED SQL Script for Supabase - Fix RLS policies for updates table
-- Copy and paste this entire code into your Supabase SQL editor

-- First, disable RLS temporarily to make changes
ALTER TABLE public.updates DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.updates;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.updates;
DROP POLICY IF EXISTS "Allow service role full access" ON public.updates;
DROP POLICY IF EXISTS "Allow admin operations" ON public.updates;

-- Create new policies that allow proper access
-- 1. Allow anyone to read active updates (for user dashboard)
CREATE POLICY "Allow public read access" ON public.updates
    FOR SELECT USING (is_active = true);

-- 2. Allow service role (backend) to do everything
CREATE POLICY "Allow service role full access" ON public.updates
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Allow authenticated users to read all updates
CREATE POLICY "Allow authenticated read" ON public.updates
    FOR SELECT TO authenticated USING (true);

-- 4. Allow admin operations through service role
CREATE POLICY "Allow admin operations" ON public.updates
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Re-enable RLS
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

-- Create helper function for admin operations (works with integer ID)
CREATE OR REPLACE FUNCTION create_admin_update(
    p_title text,
    p_description text,
    p_type text DEFAULT 'general',
    p_priority text DEFAULT 'normal',
    p_schedule text DEFAULT 'immediate',
    p_expiry text DEFAULT 'never',
    p_send_notification boolean DEFAULT false,
    p_send_email boolean DEFAULT false,
    p_pin_to_top boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Insert the update (auto-generate integer ID)
    INSERT INTO public.updates (
        title, description, type, priority, schedule, expiry,
        send_notification, send_email, pin_to_top, is_active, date, created_at, updated_at
    ) VALUES (
        p_title, p_description, p_type, p_priority, p_schedule, p_expiry,
        p_send_notification, p_send_email, p_pin_to_top, true, now(), now(), now()
    )
    RETURNING row_to_json(updates.*) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_admin_update TO service_role;
GRANT EXECUTE ON FUNCTION create_admin_update TO authenticated;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='send_notification') THEN
        ALTER TABLE public.updates ADD COLUMN send_notification boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='send_email') THEN
        ALTER TABLE public.updates ADD COLUMN send_email boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='pin_to_top') THEN
        ALTER TABLE public.updates ADD COLUMN pin_to_top boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='type') THEN
        ALTER TABLE public.updates ADD COLUMN type text DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='priority') THEN
        ALTER TABLE public.updates ADD COLUMN priority text DEFAULT 'normal';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='schedule') THEN
        ALTER TABLE public.updates ADD COLUMN schedule text DEFAULT 'immediate';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='expiry') THEN
        ALTER TABLE public.updates ADD COLUMN expiry text DEFAULT 'never';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='updates' AND column_name='is_active') THEN
        ALTER TABLE public.updates ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END
$$;

-- Test the system with a sample update
SELECT create_admin_update(
    'Admin System Ready',
    'The global update posting system has been successfully configured and is ready for use.',
    'general',
    'high',
    'immediate',
    'never',
    false,
    false,
    true
);

-- Show final policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'updates';