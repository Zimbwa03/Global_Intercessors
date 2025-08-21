-- ScriptureCoach Database Schema
-- This migration creates the tables needed for the ScriptureCoach system

-- Drop old quiz-related tables if they exist
DROP TABLE IF EXISTS bible_quiz_sessions CASCADE;
DROP TABLE IF EXISTS bible_quiz_questions CASCADE;
DROP TABLE IF EXISTS bible_quiz_answers CASCADE;
DROP TABLE IF EXISTS bible_quiz_progress CASCADE;

-- Create users table for ScriptureCoach
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

-- Create reading plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create readings table for daily passages
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    reference_list JSONB NOT NULL, -- e.g., ["John 1:1-18", "John 1:19-34"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_plans table to track user progress
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    current_day INTEGER DEFAULT 1,
    start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memory_cards table for spaced repetition
CREATE TABLE IF NOT EXISTS memory_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reference TEXT NOT NULL, -- verse reference, fetch text from Bible API
    reps INTEGER DEFAULT 0, -- repetitions
    interval INTEGER DEFAULT 1, -- interval in days
    ef REAL DEFAULT 2.5, -- easiness factor
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL, -- cloze, first_letters, type_verse, etc.
    state JSONB, -- session state and progress
    started_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_progress table for tracking streaks and stats
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

-- Create memory_reviews table for tracking review history
CREATE TABLE IF NOT EXISTS memory_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_card_id UUID REFERENCES memory_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL, -- 0-5 rating
    review_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wa_id ON users(wa_id);
CREATE INDEX IF NOT EXISTS idx_memory_cards_user_due ON memory_cards(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_active ON user_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_readings_plan_day ON readings(plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_mode ON quiz_sessions(user_id, mode);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_readings_updated_at BEFORE UPDATE ON readings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON user_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memory_cards_updated_at BEFORE UPDATE ON memory_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON quiz_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
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

CREATE OR REPLACE FUNCTION get_due_memory_cards(user_uuid UUID)
RETURNS TABLE(
    card_id UUID,
    reference TEXT,
    reps INTEGER,
    interval INTEGER,
    ef REAL
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
    ORDER BY mc.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert initial reading plans
INSERT INTO plans (name, description, days) VALUES
('John 21', 'Read through the Gospel of John in 21 days', 21),
('Proverbs 31', 'Read through the Book of Proverbs in 31 days', 31),
('NT 90', 'Read through the New Testament in 90 days', 90)
ON CONFLICT DO NOTHING;

-- Insert sample readings for John 21 plan
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["John 1:1-18"]'::jsonb
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["John 1:19-34"]'::jsonb
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 3, '["John 1:35-51"]'::jsonb
FROM plans p WHERE p.name = 'John 21'
ON CONFLICT DO NOTHING;

-- Insert sample readings for Proverbs 31 plan
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["Proverbs 1:1-7"]'::jsonb
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["Proverbs 1:8-33"]'::jsonb
FROM plans p WHERE p.name = 'Proverbs 31'
ON CONFLICT DO NOTHING;

-- Insert sample readings for NT 90 plan
INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 1, '["Matthew 1:1-17", "Matthew 1:18-25"]'::jsonb
FROM plans p WHERE p.name = 'NT 90'
ON CONFLICT DO NOTHING;

INSERT INTO readings (plan_id, day_number, reference_list) 
SELECT p.id, 2, '["Matthew 2:1-12", "Matthew 2:13-23"]'::jsonb
FROM plans p WHERE p.name = 'NT 90'
ON CONFLICT DO NOTHING;

-- Add RLS policies for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_reviews ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (id = auth.uid()::text::uuid);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (id = auth.uid()::text::uuid);

-- Plans are public for reading
CREATE POLICY "Plans are viewable by all" ON plans FOR SELECT USING (true);

-- Readings are public for reading
CREATE POLICY "Readings are viewable by all" ON readings FOR SELECT USING (true);

-- User plans are private
CREATE POLICY "Users can view own plans" ON user_plans FOR SELECT USING (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can insert own plans" ON user_plans FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can update own plans" ON user_plans FOR UPDATE USING (user_id = auth.uid()::text::uuid);

-- Memory cards are private
CREATE POLICY "Users can view own memory cards" ON memory_cards FOR SELECT USING (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can insert own memory cards" ON memory_cards FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can update own memory cards" ON memory_cards FOR UPDATE USING (user_id = auth.uid()::text::uuid);

-- Quiz sessions are private
CREATE POLICY "Users can view own quiz sessions" ON quiz_sessions FOR SELECT USING (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can insert own quiz sessions" ON quiz_sessions FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can update own quiz sessions" ON quiz_sessions FOR UPDATE USING (user_id = auth.uid()::text::uuid);

-- User progress is private
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (user_id = auth.uid()::text::uuid);

-- Memory reviews are private
CREATE POLICY "Users can view own memory reviews" ON memory_reviews FOR SELECT USING (user_id = auth.uid()::text::uuid);
CREATE POLICY "Users can insert own memory reviews" ON memory_reviews FOR INSERT WITH CHECK (user_id = auth.uid()::text::uuid);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_todays_reading(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_memory_cards(UUID) TO authenticated;

COMMIT;
