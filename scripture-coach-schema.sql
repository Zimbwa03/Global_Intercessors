-- ScriptureCoach Supabase Schema Migration
-- This replaces the old Bible quiz system with a comprehensive Scripture learning platform

-- Drop old Bible quiz related tables if they exist
DROP TABLE IF EXISTS bible_quiz_sessions CASCADE;
DROP TABLE IF EXISTS bible_quiz_questions CASCADE;
DROP TABLE IF EXISTS bible_quiz_answers CASCADE;

-- Create new ScriptureCoach tables

-- Users table for WhatsApp bot users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id TEXT UNIQUE NOT NULL, -- WhatsApp phone number
    username TEXT,
    tz TEXT DEFAULT 'Africa/Harare',
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bible reading plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily readings for each plan
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    reference_list JSONB NOT NULL, -- e.g. ["John 1:1-18","John 1:19-34"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, day_number)
);

-- User plan subscriptions
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    current_day INTEGER DEFAULT 1,
    start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_id)
);

-- Memory cards for verse memorization (SM-2 algorithm)
CREATE TABLE IF NOT EXISTS memory_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reference TEXT NOT NULL, -- verse reference, fetch text from Bible API
    reps INTEGER DEFAULT 0, -- number of successful repetitions
    interval INTEGER DEFAULT 1, -- days until next review
    ef FLOAT DEFAULT 2.5, -- easiness factor
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz sessions for different learning modes
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL, -- 'cloze', 'first_letter', 'type_verse', 'ref_to_text', 'text_to_ref'
    state JSONB, -- session state and progress
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_id, day_number)
);

-- Memory review sessions
CREATE TABLE IF NOT EXISTS memory_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES memory_cards(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL, -- 0=Again, 3=Hard, 4=Good, 5=Easy
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wa_id ON users(wa_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_date);
CREATE INDEX IF NOT EXISTS idx_memory_cards_user_due ON memory_cards(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_user_plans_active ON user_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_readings_plan_day ON readings(plan_id, day_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_cards_updated_at BEFORE UPDATE ON memory_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default reading plans
INSERT INTO plans (name, description, days) VALUES
('John 21', 'Read through the Gospel of John in 21 days', 21),
('Proverbs 31', 'Read through the Book of Proverbs in 31 days', 31),
('NT 90', 'Read through the New Testament in 90 days', 90)
ON CONFLICT DO NOTHING;

-- Insert John 21 plan readings
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["John 1:1-18"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["John 1:19-34"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 3, '["John 1:35-51"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 4, '["John 2:1-25"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 5, '["John 3:1-21"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 6, '["John 3:22-36"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 7, '["John 4:1-26"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 8, '["John 4:27-54"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 9, '["John 5:1-30"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 10, '["John 5:31-47"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 11, '["John 6:1-21"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 12, '["John 6:22-40"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 13, '["John 6:41-71"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 14, '["John 7:1-24"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 15, '["John 7:25-52"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 16, '["John 8:1-30"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 17, '["John 8:31-59"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 18, '["John 9:1-41"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 19, '["John 10:1-21"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 20, '["John 10:22-42"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 21, '["John 11:1-57"]'
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

-- Insert Proverbs 31 plan (31 chapters, 1 per day)
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["Proverbs 1"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["Proverbs 2"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 3, '["Proverbs 3"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 4, '["Proverbs 4"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 5, '["Proverbs 5"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

-- Continue for all 31 chapters...
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 31, '["Proverbs 31"]'
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

-- Insert NT 90 plan (representative sample - you'll want to add all 90 days)
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["Matthew 1:1-17", "Matthew 1:18-25"]'
FROM plans p WHERE p.name = 'NT 90'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["Matthew 2:1-12", "Matthew 2:13-23"]'
FROM plans p WHERE p.name = 'NT 90'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 3, '["Matthew 3:1-12", "Matthew 3:13-17"]'
FROM plans p WHERE p.name = 'NT 90'
ON CONFLICT DO NOTHING;

-- Continue for all 90 days...

-- Create a function to get today's reading for a user
CREATE OR REPLACE FUNCTION get_todays_reading(user_uuid UUID)
RETURNS TABLE(
    plan_name TEXT,
    day_number INTEGER,
    reference_list JSONB,
    total_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        up.current_day,
        r.reference_list,
        p.days
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    JOIN readings r ON p.id = r.plan_id AND up.current_day = r.day_number
    WHERE up.user_id = user_uuid AND up.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get due memory cards for a user
CREATE OR REPLACE FUNCTION get_due_memory_cards(user_uuid UUID)
RETURNS TABLE(
    card_id UUID,
    reference TEXT,
    reps INTEGER,
    interval INTEGER,
    ef FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.reference,
        mc.reps,
        mc.interval,
        mc.ef
    FROM memory_cards mc
    WHERE mc.user_id = user_uuid AND mc.due_date <= CURRENT_DATE
    ORDER BY mc.due_date ASC, mc.ef ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = wa_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = wa_id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = wa_id);

CREATE POLICY "Plans are viewable by all" ON plans FOR SELECT USING (true);
CREATE POLICY "Readings are viewable by all" ON readings FOR SELECT USING (true);

CREATE POLICY "Users can manage own plans" ON user_plans FOR ALL USING (auth.uid()::text = (SELECT wa_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own memory cards" ON memory_cards FOR ALL USING (auth.uid()::text = (SELECT wa_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own quiz sessions" ON quiz_sessions FOR ALL USING (auth.uid()::text = (SELECT wa_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own progress" ON user_progress FOR ALL USING (auth.uid()::text = (SELECT wa_id FROM users WHERE id = user_id));
CREATE POLICY "Users can manage own reviews" ON memory_reviews FOR ALL USING (auth.uid()::text = (SELECT wa_id FROM users WHERE id = user_id));

COMMENT ON TABLE users IS 'WhatsApp bot users with prayer streaks and activity tracking';
COMMENT ON TABLE plans IS 'Bible reading plans (John 21, Proverbs 31, NT 90)';
COMMENT ON TABLE readings IS 'Daily readings for each plan with verse references';
COMMENT ON TABLE user_plans IS 'User subscriptions to reading plans';
COMMENT ON TABLE memory_cards IS 'Verse memorization cards using SM-2 spaced repetition';
COMMENT ON TABLE quiz_sessions IS 'Active quiz sessions for different learning modes';
COMMENT ON TABLE user_progress IS 'User completion tracking for reading plans';
COMMENT ON TABLE memory_reviews IS 'Memory card review history and quality ratings';
