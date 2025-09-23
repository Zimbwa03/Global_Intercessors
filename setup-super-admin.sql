-- Setup Super Admin System for Global Intercessors
-- This script creates the super admin user and enhances the admin system

-- First, let's enhance the admin_users table to support role hierarchy
DO $$
BEGIN
  -- Check if role column needs to be updated to support super_admin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%admin_users_role%' 
    AND check_clause LIKE '%super_admin%'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
    
    -- Add new constraint that includes super_admin role
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('admin', 'super_admin'));
    
    RAISE NOTICE '✅ Enhanced admin_users table to support super_admin role';
  END IF;
END
$$;

-- Add created_by column to track who created each admin (for audit trail)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE admin_users 
    ADD COLUMN created_by TEXT;
    
    RAISE NOTICE '✅ Added created_by column for admin audit trail';
  END IF;
END
$$;

-- Create the Super Admin user: neezykidngoni@gmail.com
INSERT INTO admin_users (email, role, is_active, created_at, created_by)
VALUES (
  'neezykidngoni@gmail.com', 
  'super_admin', 
  true, 
  NOW(),
  'SYSTEM_SETUP'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'super_admin',
  is_active = true,
  created_by = COALESCE(admin_users.created_by, 'SYSTEM_SETUP');

-- Verify the super admin was created
DO $$
DECLARE
  super_admin_record RECORD;
BEGIN
  SELECT * INTO super_admin_record 
  FROM admin_users 
  WHERE email = 'neezykidngoni@gmail.com';
  
  IF super_admin_record IS NOT NULL THEN
    RAISE NOTICE '🎉 SUCCESS: Super Admin created/updated successfully!';
    RAISE NOTICE '📧 Email: %', super_admin_record.email;
    RAISE NOTICE '👑 Role: %', super_admin_record.role;
    RAISE NOTICE '✅ Active: %', super_admin_record.is_active;
    RAISE NOTICE '📅 Created: %', super_admin_record.created_at;
  ELSE
    RAISE NOTICE '❌ ERROR: Failed to create Super Admin';
  END IF;
END
$$;

-- Create a function to check admin permissions
CREATE OR REPLACE FUNCTION can_create_admin(creator_email TEXT, target_role TEXT DEFAULT 'admin')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_role TEXT;
BEGIN
  -- Get the creator's role
  SELECT role INTO creator_role 
  FROM admin_users 
  WHERE email = creator_email AND is_active = true;
  
  -- Super admins can create any role
  IF creator_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Regular admins can only create other regular admins
  IF creator_role = 'admin' AND target_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- All other cases are denied
  RETURN false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_create_admin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_admin(TEXT, TEXT) TO service_role;

-- Show current admin users for verification
SELECT 
  id,
  email,
  role,
  is_active,
  created_at,
  created_by
FROM admin_users 
ORDER BY 
  CASE role 
    WHEN 'super_admin' THEN 1 
    WHEN 'admin' THEN 2 
    ELSE 3 
  END,
  created_at DESC;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '🚀 SUPER ADMIN SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Go to /admin/login';
  RAISE NOTICE '2. Login with: neezykidngoni@gmail.com';
  RAISE NOTICE '3. Password: Ngoni2003.';
  RAISE NOTICE '4. You will now have Super Admin access!';
  RAISE NOTICE '5. Use the Add Admin button in the dashboard to securely add other admins';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security: The /create-admin route will be secured to only allow existing admins';
END
$$;


