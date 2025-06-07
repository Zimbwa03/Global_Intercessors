

-- Service role functions to bypass RLS policies
-- Run this in your Supabase SQL Editor

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS create_prayer_slot_service(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_prayer_slot_service(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_user_profile_exists(UUID);
DROP FUNCTION IF EXISTS create_user_profile_service(UUID, TEXT, TEXT, TEXT);

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
-- Fixed parameter order to match the calling code
CREATE OR REPLACE FUNCTION create_prayer_slot_service(
  p_user_id TEXT,
  p_user_email TEXT,
  p_slot_time TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_slot_id INTEGER;
  result json;
BEGIN
  -- Check if user already has a slot
  IF EXISTS (SELECT 1 FROM prayer_slots WHERE user_id = p_user_id) THEN
    -- Update existing slot instead of creating new one
    UPDATE prayer_slots 
    SET 
      slot_time = p_slot_time,
      user_email = p_user_email,
      status = p_status,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO new_slot_id;
  ELSE
    -- Create new slot
    INSERT INTO prayer_slots (user_id, user_email, slot_time, status, missed_count, created_at, updated_at)
    VALUES (
      p_user_id,
      p_user_email,
      p_slot_time,
      p_status,
      0,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_slot_id;
  END IF;
  
  -- Return the slot data
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE id = new_slot_id;
  
  RETURN result;
END;
$$;

-- Function to update prayer slot with service role privileges
CREATE OR REPLACE FUNCTION update_prayer_slot_service(
  p_user_id TEXT,
  p_slot_time TEXT,
  p_status TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Update existing prayer slot bypassing RLS (only update non-empty values)
  UPDATE prayer_slots 
  SET 
    slot_time = CASE WHEN p_slot_time IS NOT NULL AND p_slot_time != '' THEN p_slot_time ELSE slot_time END,
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return the updated slot
  SELECT json_build_object(
    'id', id,
    'user_id', user_id,
    'user_email', user_email,
    'slot_time', slot_time,
    'status', status,
    'missed_count', missed_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM prayer_slots
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION check_user_profile_exists(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile_service(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_prayer_slot_service(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_prayer_slot_service(TEXT, TEXT, TEXT) TO service_role;

