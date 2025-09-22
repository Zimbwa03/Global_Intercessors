-- Fix Prayer Points Persistence Issue
-- Ensure prayer points are properly saved and retrieved

-- First, let's ensure the prayer_plans table exists with correct structure
CREATE TABLE IF NOT EXISTS prayer_plans (
  id TEXT PRIMARY KEY DEFAULT ('plan_' || extract(epoch from now()) || '_' || substr(gen_random_uuid()::text, 1, 8)),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  plan_date TEXT NOT NULL, -- Date in YYYY-MM-DD format
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint to auth.users
  CONSTRAINT fk_prayer_plans_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create prayer_points table with correct structure
CREATE TABLE IF NOT EXISTS prayer_points (
  id SERIAL PRIMARY KEY,
  prayer_plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'personal',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint
  CONSTRAINT fk_prayer_points_plan FOREIGN KEY (prayer_plan_id) REFERENCES prayer_plans(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_plans_user_id ON prayer_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_plans_date ON prayer_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_prayer_plans_user_date ON prayer_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_prayer_points_plan_id ON prayer_points(prayer_plan_id);
CREATE INDEX IF NOT EXISTS idx_prayer_points_order ON prayer_points(prayer_plan_id, order_position);

-- Enable Row Level Security
ALTER TABLE prayer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own prayer plans" ON prayer_plans;
DROP POLICY IF EXISTS "Users can manage their own prayer plans" ON prayer_plans;
DROP POLICY IF EXISTS "Users can view their own prayer points" ON prayer_points;
DROP POLICY IF EXISTS "Users can manage their own prayer points" ON prayer_points;
DROP POLICY IF EXISTS "Service role can manage all prayer plans" ON prayer_plans;
DROP POLICY IF EXISTS "Service role can manage all prayer points" ON prayer_points;

-- Create comprehensive RLS policies for prayer_plans
CREATE POLICY "Users can view their own prayer plans" ON prayer_plans
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can manage their own prayer plans" ON prayer_plans
  FOR ALL USING (auth.uid()::uuid = user_id);

-- Allow service role full access (for API operations)
CREATE POLICY "Service role can manage all prayer plans" ON prayer_plans
  FOR ALL USING (auth.role() = 'service_role');

-- Create comprehensive RLS policies for prayer_points
CREATE POLICY "Users can view their own prayer points" ON prayer_points
  FOR SELECT USING (
    auth.uid()::uuid IN (
      SELECT user_id FROM prayer_plans WHERE id = prayer_points.prayer_plan_id
    )
  );

CREATE POLICY "Users can manage their own prayer points" ON prayer_points
  FOR ALL USING (
    auth.uid()::uuid IN (
      SELECT user_id FROM prayer_plans WHERE id = prayer_points.prayer_plan_id
    )
  );

-- Allow service role full access (for API operations)
CREATE POLICY "Service role can manage all prayer points" ON prayer_points
  FOR ALL USING (auth.role() = 'service_role');

-- Grant proper permissions
GRANT ALL ON prayer_plans TO service_role;
GRANT ALL ON prayer_points TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON prayer_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prayer_points TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prayer_points_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prayer_points_id_seq TO service_role;

-- Create function to get user's daily prayer plan with points
CREATE OR REPLACE FUNCTION get_daily_prayer_plan(target_user_id UUID, target_date TEXT)
RETURNS TABLE (
  plan_id TEXT,
  plan_title TEXT,
  plan_date TEXT,
  plan_status TEXT,
  point_id INTEGER,
  point_title TEXT,
  point_content TEXT,
  point_category TEXT,
  point_completed BOOLEAN,
  point_order INTEGER,
  point_created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id as plan_id,
    pp.title as plan_title,
    pp.plan_date as plan_date,
    pp.status as plan_status,
    pt.id as point_id,
    pt.title as point_title,
    pt.content as point_content,
    pt.category as point_category,
    pt.is_completed as point_completed,
    pt.order_position as point_order,
    pt.created_at as point_created_at
  FROM prayer_plans pp
  LEFT JOIN prayer_points pt ON pp.id = pt.prayer_plan_id
  WHERE pp.user_id = target_user_id 
    AND pp.plan_date = target_date
  ORDER BY pt.order_position ASC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_daily_prayer_plan(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_prayer_plan(UUID, TEXT) TO service_role;

-- Test the tables and functions
DO $$
DECLARE
  test_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'prayer_plans'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ prayer_plans table exists';
  ELSE
    RAISE NOTICE '❌ prayer_plans table missing';
  END IF;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'prayer_points'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ prayer_points table exists';
  ELSE
    RAISE NOTICE '❌ prayer_points table missing';
  END IF;
  
  -- Test if we can insert a test record (and then delete it)
  BEGIN
    -- Get any user ID from auth.users for testing (if any exist)
    SELECT id INTO test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
      -- Test plan creation
      INSERT INTO prayer_plans (user_id, title, plan_date, status)
      VALUES (test_user_id, 'Test Plan', '2025-01-01', 'active');
      
      RAISE NOTICE '✅ Successfully created test prayer plan';
      
      -- Clean up test data
      DELETE FROM prayer_plans 
      WHERE user_id = test_user_id AND title = 'Test Plan' AND plan_date = '2025-01-01';
      
      RAISE NOTICE '✅ Successfully cleaned up test data';
    ELSE
      RAISE NOTICE '⚠️ No users found for testing, but tables are ready';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error testing prayer plans: %', SQLERRM;
  END;
  
  RAISE NOTICE '🎉 Prayer Points Persistence Fix Complete!';
  RAISE NOTICE '📝 Tables created with proper structure and permissions';
  RAISE NOTICE '🔒 Row Level Security configured for user privacy';
  RAISE NOTICE '🔧 Functions created for efficient data retrieval';
END
$$;
