
-- Service role functions to bypass RLS policies
-- Run this in your Supabase SQL Editor

-- Function to check if user profile exists
CREATE OR REPLACE FUNCTION check_user_profile_exists(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id
  );
END;
$$;

-- Function to create user profile with service role privileges
CREATE OR REPLACE FUNCTION create_user_profile_service(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT '',
  user_role TEXT DEFAULT 'intercessor'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    user_full_name,
    user_role,
    true,
    NOW(),
    NOW()
  );
END;
$$;

-- Function to create prayer slot with service role privileges
CREATE OR REPLACE FUNCTION create_prayer_slot_service(
  user_id TEXT,
  user_email TEXT,
  slot_time TEXT,
  slot_status TEXT DEFAULT 'active'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_slot_id INTEGER;
BEGIN
  INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    slot_time,
    slot_status,
    0,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_slot_id;
  
  RETURN new_slot_id;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION check_user_profile_exists(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile_service(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_prayer_slot_service(TEXT, TEXT, TEXT, TEXT) TO service_role;
