-- Complete ScriptureCoach Setup with Sample Data
-- This script sets up the full ScriptureCoach system with comprehensive reading plans

-- First, ensure all tables exist
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
    name TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS memory_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    reps INTEGER DEFAULT 0,
    interval INTEGER DEFAULT 1,
    ef REAL DEFAULT 2.5,
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    total_verses_memorized INTEGER DEFAULT 0,
    total_reading_days INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing data for fresh setup
DELETE FROM readings;
DELETE FROM user_plans;
DELETE FROM memory_cards;
DELETE FROM user_progress;
DELETE FROM plans;

-- Insert comprehensive reading plans
INSERT INTO plans (id, name, description, days) VALUES
    ('11111111-1111-1111-1111-111111111111', 'John 21', 'Read through the Gospel of John in 21 days', 21),
    ('22222222-2222-2222-2222-222222222222', 'Proverbs 31', 'Read through the Book of Proverbs in 31 days', 31),
    ('33333333-3333-3333-3333-333333333333', 'NT 90', 'Read through the New Testament in 90 days', 90),
    ('44444444-4444-4444-4444-444444444444', 'Psalms 30', 'Read through the Book of Psalms in 30 days', 30),
    ('55555555-5555-5555-5555-555555555555', 'Genesis 50', 'Read through the Book of Genesis in 50 days', 50),
    ('66666666-6666-6666-6666-666666666666', 'Bible in a Year', 'Complete Bible reading plan in 365 days', 365);

-- Insert John 21 readings (21 days)
INSERT INTO readings (plan_id, day_number, reference_list) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, '["John 1:1-18"]'),
    ('11111111-1111-1111-1111-111111111111', 2, '["John 1:19-34"]'),
    ('11111111-1111-1111-1111-111111111111', 3, '["John 1:35-51"]'),
    ('11111111-1111-1111-1111-111111111111', 4, '["John 2:1-12"]'),
    ('11111111-1111-1111-1111-111111111111', 5, '["John 2:13-25"]'),
    ('11111111-1111-1111-1111-111111111111', 6, '["John 3:1-21"]'),
    ('11111111-1111-1111-1111-111111111111', 7, '["John 3:22-36"]'),
    ('11111111-1111-1111-1111-111111111111', 8, '["John 4:1-26"]'),
    ('11111111-1111-1111-1111-111111111111', 9, '["John 4:27-42"]'),
    ('11111111-1111-1111-1111-111111111111', 10, '["John 4:43-54"]'),
    ('11111111-1111-1111-1111-111111111111', 11, '["John 5:1-15"]'),
    ('11111111-1111-1111-1111-111111111111', 12, '["John 5:16-30"]'),
    ('11111111-1111-1111-1111-111111111111', 13, '["John 5:31-47"]'),
    ('11111111-1111-1111-1111-111111111111', 14, '["John 6:1-15"]'),
    ('11111111-1111-1111-1111-111111111111', 15, '["John 6:16-24"]'),
    ('11111111-1111-1111-1111-111111111111', 16, '["John 6:25-40"]'),
    ('11111111-1111-1111-1111-111111111111', 17, '["John 6:41-59"]'),
    ('11111111-1111-1111-1111-111111111111', 18, '["John 6:60-71"]'),
    ('11111111-1111-1111-1111-111111111111', 19, '["John 7:1-24"]'),
    ('11111111-1111-1111-1111-111111111111', 20, '["John 7:25-44"]'),
    ('11111111-1111-1111-1111-111111111111', 21, '["John 7:45-53"]');

-- Insert Proverbs 31 readings (31 days)
INSERT INTO readings (plan_id, day_number, reference_list) VALUES
    ('22222222-2222-2222-2222-222222222222', 1, '["Proverbs 1:1-7"]'),
    ('22222222-2222-2222-2222-222222222222', 2, '["Proverbs 1:8-33"]'),
    ('22222222-2222-2222-2222-222222222222', 3, '["Proverbs 2:1-22"]'),
    ('22222222-2222-2222-2222-222222222222', 4, '["Proverbs 3:1-12"]'),
    ('22222222-2222-2222-2222-222222222222', 5, '["Proverbs 3:13-35"]'),
    ('22222222-2222-2222-2222-222222222222', 6, '["Proverbs 4:1-27"]'),
    ('22222222-2222-2222-2222-222222222222', 7, '["Proverbs 5:1-23"]'),
    ('22222222-2222-2222-2222-222222222222', 8, '["Proverbs 6:1-19"]'),
    ('22222222-2222-2222-2222-222222222222', 9, '["Proverbs 6:20-35"]'),
    ('22222222-2222-2222-2222-222222222222', 10, '["Proverbs 7:1-27"]'),
    ('22222222-2222-2222-2222-222222222222', 11, '["Proverbs 8:1-36"]'),
    ('22222222-2222-2222-2222-222222222222', 12, '["Proverbs 9:1-18"]'),
    ('22222222-2222-2222-2222-222222222222', 13, '["Proverbs 10:1-32"]'),
    ('22222222-2222-2222-2222-222222222222', 14, '["Proverbs 11:1-31"]'),
    ('22222222-2222-2222-2222-222222222222', 15, '["Proverbs 12:1-28"]'),
    ('22222222-2222-2222-2222-222222222222', 16, '["Proverbs 13:1-25"]'),
    ('22222222-2222-2222-2222-222222222222', 17, '["Proverbs 14:1-35"]'),
    ('22222222-2222-2222-2222-222222222222', 18, '["Proverbs 15:1-33"]'),
    ('22222222-2222-2222-2222-222222222222', 19, '["Proverbs 16:1-33"]'),
    ('22222222-2222-2222-2222-222222222222', 20, '["Proverbs 17:1-28"]'),
    ('22222222-2222-2222-2222-222222222222', 21, '["Proverbs 18:1-24"]'),
    ('22222222-2222-2222-2222-222222222222', 22, '["Proverbs 19:1-29"]'),
    ('22222222-2222-2222-2222-222222222222', 23, '["Proverbs 20:1-30"]'),
    ('22222222-2222-2222-2222-222222222222', 24, '["Proverbs 21:1-31"]'),
    ('22222222-2222-2222-2222-222222222222', 25, '["Proverbs 22:1-29"]'),
    ('22222222-2222-2222-2222-222222222222', 26, '["Proverbs 23:1-35"]'),
    ('22222222-2222-2222-2222-222222222222', 27, '["Proverbs 24:1-34"]'),
    ('22222222-2222-2222-2222-222222222222', 28, '["Proverbs 25:1-28"]'),
    ('22222222-2222-2222-2222-222222222222', 29, '["Proverbs 26:1-28"]'),
    ('22222222-2222-2222-2222-222222222222', 30, '["Proverbs 27:1-27"]'),
    ('22222222-2222-2222-2222-222222222222', 31, '["Proverbs 28:1-28", "Proverbs 29:1-27", "Proverbs 30:1-33", "Proverbs 31:1-31"]');

-- Insert NT 90 readings (first 10 days as sample)
INSERT INTO readings (plan_id, day_number, reference_list) VALUES
    ('33333333-3333-3333-3333-333333333333', 1, '["Matthew 1:1-17", "Matthew 1:18-25"]'),
    ('33333333-3333-3333-3333-333333333333', 2, '["Matthew 2:1-12", "Matthew 2:13-23"]'),
    ('33333333-3333-3333-3333-333333333333', 3, '["Matthew 3:1-12", "Matthew 3:13-17"]'),
    ('33333333-3333-3333-3333-333333333333', 4, '["Matthew 4:1-11", "Matthew 4:12-25"]'),
    ('33333333-3333-3333-3333-333333333333', 5, '["Matthew 5:1-12", "Matthew 5:13-20"]'),
    ('33333333-3333-3333-3333-333333333333', 6, '["Matthew 5:21-32", "Matthew 5:33-48"]'),
    ('33333333-3333-3333-3333-333333333333', 7, '["Matthew 6:1-18", "Matthew 6:19-34"]'),
    ('33333333-3333-3333-3333-333333333333', 8, '["Matthew 7:1-14", "Matthew 7:15-29"]'),
    ('33333333-3333-3333-3333-333333333333', 9, '["Matthew 8:1-17", "Matthew 8:18-34"]'),
    ('33333333-3333-3333-3333-333333333333', 10, '["Matthew 9:1-17", "Matthew 9:18-38"]');

-- Insert Psalms 30 readings (first 10 days as sample)
INSERT INTO readings (plan_id, day_number, reference_list) VALUES
    ('44444444-4444-4444-4444-444444444444', 1, '["Psalm 1", "Psalm 2"]'),
    ('44444444-4444-4444-4444-444444444444', 2, '["Psalm 3", "Psalm 4"]'),
    ('44444444-4444-4444-4444-444444444444', 3, '["Psalm 5", "Psalm 6"]'),
    ('44444444-4444-4444-4444-444444444444', 4, '["Psalm 7", "Psalm 8"]'),
    ('44444444-4444-4444-4444-444444444444', 5, '["Psalm 9", "Psalm 10"]'),
    ('44444444-4444-4444-4444-444444444444', 6, '["Psalm 11", "Psalm 12"]'),
    ('44444444-4444-4444-4444-444444444444', 7, '["Psalm 13", "Psalm 14"]'),
    ('44444444-4444-4444-4444-444444444444', 8, '["Psalm 15", "Psalm 16"]'),
    ('44444444-4444-4444-4444-444444444444', 9, '["Psalm 17", "Psalm 18"]'),
    ('44444444-4444-4444-4444-444444444444', 10, '["Psalm 19", "Psalm 20"]');

-- Insert Genesis 50 readings (first 10 days as sample)
INSERT INTO readings (plan_id, day_number, reference_list) VALUES
    ('55555555-5555-5555-5555-555555555555', 1, '["Genesis 1:1-31"]'),
    ('55555555-5555-5555-5555-555555555555', 2, '["Genesis 2:1-25"]'),
    ('55555555-5555-5555-5555-555555555555', 3, '["Genesis 3:1-24"]'),
    ('55555555-5555-5555-5555-555555555555', 4, '["Genesis 4:1-26"]'),
    ('55555555-5555-5555-5555-555555555555', 5, '["Genesis 5:1-32"]'),
    ('55555555-5555-5555-5555-555555555555', 6, '["Genesis 6:1-22"]'),
    ('55555555-5555-5555-5555-555555555555', 7, '["Genesis 7:1-24"]'),
    ('55555555-5555-5555-5555-555555555555', 8, '["Genesis 8:1-22"]'),
    ('55555555-5555-5555-5555-555555555555', 9, '["Genesis 9:1-29"]'),
    ('55555555-5555-5555-5555-555555555555', 10, '["Genesis 10:1-32"]');

-- Create helper functions
CREATE OR REPLACE FUNCTION get_todays_reading(user_uuid UUID)
RETURNS TABLE(
    plan_name TEXT,
    day_number INTEGER,
    total_days INTEGER,
    references TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        up.current_day,
        p.days,
        r.reference_list::TEXT[]
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    JOIN readings r ON p.id = r.plan_id AND up.current_day = r.day_number
    WHERE up.user_id = user_uuid AND up.is_active = true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_reading_plans(user_uuid UUID)
RETURNS TABLE(
    plan_id UUID,
    plan_name TEXT,
    description TEXT,
    days INTEGER,
    current_day INTEGER,
    start_date DATE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.days,
        up.current_day,
        up.start_date,
        up.is_active
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = user_uuid
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wa_id ON users(wa_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_active ON user_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_readings_plan_day ON readings(plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_memory_cards_user_due ON memory_cards(user_id, due_date);

-- Disable RLS for now to allow easier testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE memory_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;

-- Display summary
SELECT 
    'Plans' as table_name,
    COUNT(*) as total_count
FROM plans
UNION ALL
SELECT 
    'Readings' as table_name,
    COUNT(*) as total_count
FROM readings
UNION ALL
SELECT 
    'Users' as table_name,
    COUNT(*) as total_count
FROM users;

-- Display sample plans
SELECT 
    name,
    description,
    days,
    (SELECT COUNT(*) FROM readings WHERE plan_id = p.id) as reading_count
FROM plans p
ORDER BY days;

SELECT 'ScriptureCoach setup complete! Ready for testing.' as status;







