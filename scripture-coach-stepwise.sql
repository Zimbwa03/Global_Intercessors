-- Scripture Coach Setup - Step by Step (No Conflicts)
-- Run this in your Supabase SQL Editor

-- Step 1: Create tables without any conflicts
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT UNIQUE NOT NULL,
  username TEXT,
  tz TEXT DEFAULT 'Africa/Harare',
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  last_active_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  reference_list JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  current_day INTEGER DEFAULT 1,
  start_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Step 2: Insert plans one by one (simple inserts first time)
INSERT INTO plans (name, description, days) 
SELECT 'John 21', 'Journey through the Gospel of John in 21 transformative days', 21
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'John 21');

INSERT INTO plans (name, description, days) 
SELECT 'Proverbs 31', 'Gain wisdom for daily living by reading Proverbs', 31
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Proverbs 31');

INSERT INTO plans (name, description, days) 
SELECT 'Psalms 30', 'Find comfort and strength through selected Psalms', 30
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Psalms 30');

-- Step 3: Insert your user (simple insert)
INSERT INTO users (wa_id, username, tz) 
SELECT '263785494594', 'Ngonidzashe Zimbwa', 'Africa/Harare'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE wa_id = '263785494594');

-- Step 4: Get plan IDs and insert readings for John 21
DO $$
DECLARE
    john_plan_id UUID;
BEGIN
    SELECT id INTO john_plan_id FROM plans WHERE name = 'John 21';
    
    IF john_plan_id IS NOT NULL THEN
        -- Insert John readings only if they don't exist
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 1, '["John 1:1-18"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 1);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 2, '["John 1:19-34"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 2);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 3, '["John 1:35-51"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 3);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 4, '["John 2:1-25"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 4);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 5, '["John 3:1-21"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 5);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 6, '["John 3:22-36"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 6);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 7, '["John 4:1-26"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 7);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 8, '["John 4:27-54"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 8);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 9, '["John 5:1-24"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 9);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 10, '["John 5:25-47"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 10);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 11, '["John 6:1-21"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 11);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 12, '["John 6:22-44"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 12);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 13, '["John 6:45-71"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 13);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 14, '["John 7:1-24"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 14);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 15, '["John 7:25-53"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 15);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 16, '["John 8:1-30"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 16);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 17, '["John 8:31-59"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 17);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 18, '["John 9:1-41"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 18);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 19, '["John 10:1-21"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 19);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 20, '["John 10:22-42"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 20);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT john_plan_id, 21, '["John 11:1-57"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = john_plan_id AND day_number = 21);
    END IF;
END $$;

-- Step 5: Insert readings for Psalms 30
DO $$
DECLARE
    psalms_plan_id UUID;
BEGIN
    SELECT id INTO psalms_plan_id FROM plans WHERE name = 'Psalms 30';
    
    IF psalms_plan_id IS NOT NULL THEN
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 1, '["Psalm 1"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 1);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 2, '["Psalm 23"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 2);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 3, '["Psalm 27"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 3);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 4, '["Psalm 34"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 4);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 5, '["Psalm 37"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 5);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 6, '["Psalm 46"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 6);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 7, '["Psalm 51"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 7);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 8, '["Psalm 62"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 8);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 9, '["Psalm 73"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 9);
        
        INSERT INTO readings (plan_id, day_number, reference_list) 
        SELECT psalms_plan_id, 10, '["Psalm 84"]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = psalms_plan_id AND day_number = 10);
    END IF;
END $$;

-- Step 6: Insert readings for Proverbs 31 (first 5 days)
DO $$
DECLARE
    proverbs_plan_id UUID;
    i INTEGER;
BEGIN
    SELECT id INTO proverbs_plan_id FROM plans WHERE name = 'Proverbs 31';
    
    IF proverbs_plan_id IS NOT NULL THEN
        FOR i IN 1..5 LOOP
            INSERT INTO readings (plan_id, day_number, reference_list) 
            SELECT proverbs_plan_id, i, FORMAT('["Proverbs %s"]', i)::jsonb
            WHERE NOT EXISTS (SELECT 1 FROM readings WHERE plan_id = proverbs_plan_id AND day_number = i);
        END LOOP;
    END IF;
END $$;

-- Step 7: Enable RLS and create policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policies (safe approach)
DROP POLICY IF EXISTS "public_read_plans" ON plans;
CREATE POLICY "public_read_plans" ON plans FOR ALL USING (true);

DROP POLICY IF EXISTS "public_read_readings" ON readings;
CREATE POLICY "public_read_readings" ON readings FOR ALL USING (true);

DROP POLICY IF EXISTS "public_access_users" ON users;
CREATE POLICY "public_access_users" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "public_access_user_plans" ON user_plans;
CREATE POLICY "public_access_user_plans" ON user_plans FOR ALL USING (true);

-- Step 8: Final verification
SELECT 
  'Scripture Coach setup completed successfully!' as message,
  (SELECT COUNT(*) FROM plans) as reading_plans,
  (SELECT COUNT(*) FROM readings) as daily_readings,
  (SELECT COUNT(*) FROM users WHERE wa_id = '263785494594') as user_created;


