-- Scripture Coach Setup - Fixed SQL (No Syntax Errors)
-- Copy and paste this into your Supabase SQL Editor

-- Create Scripture Coach tables
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
  created_at TIMESTAMPZ DEFAULT NOW(),
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

-- Insert reading plans (safe)
INSERT INTO plans (name, description, days) VALUES
('John 21', 'Journey through the Gospel of John in 21 transformative days', 21),
('Proverbs 31', 'Gain wisdom for daily living by reading Proverbs', 31),
('Psalms 30', 'Find comfort and strength through selected Psalms', 30)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Insert readings for John 21
WITH john_plan AS (SELECT id FROM plans WHERE name = 'John 21')
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT john_plan.id, vals.day_num, vals.refs::jsonb 
FROM john_plan, (VALUES 
  (1, '["John 1:1-18"]'),
  (2, '["John 1:19-34"]'),
  (3, '["John 1:35-51"]'),
  (4, '["John 2:1-25"]'),
  (5, '["John 3:1-21"]'),
  (6, '["John 3:22-36"]'),
  (7, '["John 4:1-26"]'),
  (8, '["John 4:27-54"]'),
  (9, '["John 5:1-24"]'),
  (10, '["John 5:25-47"]'),
  (11, '["John 6:1-21"]'),
  (12, '["John 6:22-44"]'),
  (13, '["John 6:45-71"]'),
  (14, '["John 7:1-24"]'),
  (15, '["John 7:25-53"]'),
  (16, '["John 8:1-30"]'),
  (17, '["John 8:31-59"]'),
  (18, '["John 9:1-41"]'),
  (19, '["John 10:1-21"]'),
  (20, '["John 10:22-42"]'),
  (21, '["John 11:1-57"]')
) AS vals(day_num, refs)
ON CONFLICT (plan_id, day_number) DO NOTHING;

-- Insert readings for Psalms 30
WITH psalms_plan AS (SELECT id FROM plans WHERE name = 'Psalms 30')
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT psalms_plan.id, vals.day_num, vals.refs::jsonb 
FROM psalms_plan, (VALUES 
  (1, '["Psalm 1"]'),
  (2, '["Psalm 23"]'),
  (3, '["Psalm 27"]'),
  (4, '["Psalm 91"]'),
  (5, '["Psalm 100"]'),
  (6, '["Psalm 103"]'),
  (7, '["Psalm 119:1-32"]'),
  (8, '["Psalm 119:33-64"]'),
  (9, '["Psalm 119:65-96"]'),
  (10, '["Psalm 139"]')
) AS vals(day_num, refs)
ON CONFLICT (plan_id, day_number) DO NOTHING;

-- Insert readings for Proverbs 31 (first 10 days)
WITH proverbs_plan AS (SELECT id FROM plans WHERE name = 'Proverbs 31')
INSERT INTO readings (plan_id, day_number, reference_list)
SELECT proverbs_plan.id, generate_series(1, 10), FORMAT('["Proverbs %s"]', generate_series(1, 10))::jsonb
FROM proverbs_plan
ON CONFLICT (plan_id, day_number) DO NOTHING;

-- Create your user
INSERT INTO users (wa_id, username, tz) VALUES
('263785494594', 'Ngonidzashe Zimbwa', 'Africa/Harare')
ON CONFLICT (wa_id) DO UPDATE SET username = EXCLUDED.username;

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policies (PostgreSQL correct syntax)
DROP POLICY IF EXISTS "public_read_plans" ON plans;
CREATE POLICY "public_read_plans" ON plans FOR ALL USING (true);

DROP POLICY IF EXISTS "public_read_readings" ON readings;
CREATE POLICY "public_read_readings" ON readings FOR ALL USING (true);

DROP POLICY IF EXISTS "public_access_users" ON users;
CREATE POLICY "public_access_users" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "public_access_user_plans" ON user_plans;
CREATE POLICY "public_access_user_plans" ON user_plans FOR ALL USING (true);

-- Verification query
SELECT 
  'Scripture Coach setup completed successfully!' as status,
  (SELECT COUNT(*) FROM plans) as reading_plans_created,
  (SELECT COUNT(*) FROM readings) as daily_readings_created,
  (SELECT COUNT(*) FROM users WHERE wa_id = '263785494594') as user_account_ready;
