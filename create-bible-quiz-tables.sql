-- =============================================================================
-- BIBLE QUIZ DATABASE SCHEMA FOR SUPABASE
-- =============================================================================
-- This script creates all necessary tables for the Bible Quiz functionality
-- Run this in your Supabase SQL editor to activate Bible Quiz features
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. BIBLE QUESTIONS TABLE
-- Stores all Bible quiz questions with multiple choice answers
-- =============================================================================
CREATE TABLE IF NOT EXISTS bible_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    verse_reference TEXT,
    difficulty VARCHAR(10) NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category VARCHAR(50) DEFAULT 'general',
    topic VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. USER QUIZ PROGRESS TABLE
-- Tracks overall quiz progress for each user
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_quiz_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    phone_number VARCHAR(20),
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    average_response_time DECIMAL(5,2) DEFAULT 0,
    preferred_difficulty VARCHAR(10) DEFAULT 'easy' CHECK (preferred_difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(phone_number)
);

-- =============================================================================
-- 3. QUIZ SESSIONS TABLE
-- Records individual quiz sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('daily_challenge', 'smart_quiz', 'topic_quiz')),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic VARCHAR(100),
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. USER QUESTION HISTORY TABLE
-- Tracks individual question attempts
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_question_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_id UUID,
    question_id UUID,
    user_answer CHAR(1) CHECK (user_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    response_time_seconds INTEGER,
    points_earned INTEGER DEFAULT 0,
    difficulty VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES bible_questions(id) ON DELETE SET NULL
);

-- =============================================================================
-- 5. QUIZ ACHIEVEMENTS TABLE
-- Defines available achievements
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    criteria JSONB, -- Stores achievement criteria as JSON
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. USER ACHIEVEMENTS TABLE
-- Tracks which achievements users have earned
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (achievement_id) REFERENCES quiz_achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
);

-- =============================================================================
-- 7. DAILY CHALLENGES TABLE
-- Stores daily challenge configurations
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_date DATE NOT NULL UNIQUE,
    title VARCHAR(200),
    description TEXT,
    xp_bonus INTEGER DEFAULT 50,
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 8. USER DAILY CHALLENGES TABLE
-- Tracks user participation in daily challenges
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    challenge_id UUID NOT NULL,
    session_id UUID,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    completion_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE SET NULL,
    UNIQUE(user_id, challenge_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_bible_questions_difficulty ON bible_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_bible_questions_category ON bible_questions(category);
CREATE INDEX IF NOT EXISTS idx_bible_questions_topic ON bible_questions(topic);
CREATE INDEX IF NOT EXISTS idx_user_quiz_progress_user_id ON user_quiz_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_progress_phone ON user_quiz_progress(phone_number);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_type ON quiz_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_user_question_history_user_id ON user_question_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_session ON user_question_history(session_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user_id ON user_daily_challenges(user_id);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_bible_questions_updated_at ON bible_questions;
CREATE TRIGGER update_bible_questions_updated_at
    BEFORE UPDATE ON bible_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_quiz_progress_updated_at ON user_quiz_progress;
CREATE TRIGGER update_user_quiz_progress_updated_at
    BEFORE UPDATE ON user_quiz_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE bible_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Bible questions are readable by all authenticated users
CREATE POLICY "Bible questions are readable by authenticated users"
ON bible_questions FOR SELECT
TO authenticated
USING (true);

-- Users can only access their own quiz data
CREATE POLICY "Users can view their own quiz progress"
ON user_quiz_progress FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own quiz sessions"
ON quiz_sessions FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own question history"
ON user_question_history FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Achievements are readable by all, but user achievements are private
CREATE POLICY "Achievements are readable by authenticated users"
ON quiz_achievements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view their own achievements"
ON user_achievements FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Daily challenges are readable by all authenticated users
CREATE POLICY "Daily challenges are readable by authenticated users"
ON daily_challenges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own daily challenge progress"
ON user_daily_challenges FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

-- =============================================================================
-- SAMPLE DATA INSERTION
-- =============================================================================

-- Insert sample Bible questions
INSERT INTO bible_questions (question, option_a, option_b, option_c, option_d, correct_answer, explanation, verse_reference, difficulty, category, topic) VALUES
('Who led the Israelites out of Egypt?', 'Abraham', 'Moses', 'David', 'Noah', 'B', 'Moses was chosen by God to lead the Israelites out of slavery in Egypt.', 'Exodus 3:10', 'easy', 'Old Testament', 'Exodus'),
('How many days and nights did Jesus fast in the wilderness?', '30', '40', '50', '60', 'B', 'Jesus fasted for 40 days and 40 nights in the wilderness before being tempted by Satan.', 'Matthew 4:2', 'easy', 'New Testament', 'Life of Jesus'),
('What was the name of the garden where Adam and Eve lived?', 'Garden of Gethsemane', 'Garden of Eden', 'Garden of Olives', 'Garden of Paradise', 'B', 'God placed Adam and Eve in the Garden of Eden.', 'Genesis 2:8', 'easy', 'Old Testament', 'Creation'),
('Who betrayed Jesus for 30 pieces of silver?', 'Peter', 'John', 'Judas Iscariot', 'Thomas', 'C', 'Judas Iscariot betrayed Jesus to the chief priests for thirty pieces of silver.', 'Matthew 26:15', 'easy', 'New Testament', 'Life of Jesus'),
('What is the shortest verse in the Bible?', 'God is love', 'Jesus wept', 'Be still', 'Pray always', 'B', 'Jesus wept is the shortest verse in the Bible, showing Jesus compassion.', 'John 11:35', 'medium', 'New Testament', 'Life of Jesus'),
('How many books are in the New Testament?', '24', '25', '26', '27', 'D', 'The New Testament contains 27 books, from Matthew to Revelation.', 'N/A', 'medium', 'Bible Knowledge', 'Scripture'),
('Who was the first king of Israel?', 'David', 'Solomon', 'Saul', 'Samuel', 'C', 'Saul was anointed as the first king of Israel by the prophet Samuel.', '1 Samuel 10:1', 'medium', 'Old Testament', 'Kings'),
('In which city was Jesus born?', 'Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum', 'C', 'Jesus was born in Bethlehem, fulfilling the prophecy of Micah.', 'Matthew 2:1', 'easy', 'New Testament', 'Life of Jesus'),
('What was the name of the mountain where Moses received the Ten Commandments?', 'Mount Ararat', 'Mount Sinai', 'Mount Carmel', 'Mount Hermon', 'B', 'Moses received the Ten Commandments from God on Mount Sinai.', 'Exodus 19:20', 'medium', 'Old Testament', 'Law'),
('Who was thrown into the lions den?', 'Daniel', 'David', 'Jeremiah', 'Ezekiel', 'A', 'Daniel was thrown into the lions den but God protected him.', 'Daniel 6:16', 'easy', 'Old Testament', 'Prophets');

-- Insert default achievements
INSERT INTO quiz_achievements (name, description, icon, criteria, xp_reward) VALUES
('First Steps', 'Complete your first Bible quiz', '🎯', '{"questions_answered": 1}', 25),
('Bible Scholar', 'Answer 100 questions correctly', '📚', '{"correct_answers": 100}', 100),
('Streak Master', 'Get 10 questions correct in a row', '🔥', '{"streak": 10}', 75),
('Daily Devotion', 'Complete 7 daily challenges', '⭐', '{"daily_challenges": 7}', 150),
('Speed Reader', 'Answer a question in under 5 seconds', '⚡', '{"response_time": 5}', 50),
('Knowledge Seeker', 'Reach level 10', '🏆', '{"level": 10}', 200),
('Testament Explorer', 'Answer questions from both Old and New Testament', '📖', '{"testament_coverage": 2}', 100);

-- Create today's daily challenge
INSERT INTO daily_challenges (challenge_date, title, description, xp_bonus, difficulty, topic) VALUES
(CURRENT_DATE, 'Daily Bible Knowledge Challenge', 'Test your biblical knowledge with todays specially curated questions!', 50, 'medium', 'general')
ON CONFLICT (challenge_date) DO NOTHING;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get user quiz statistics
CREATE OR REPLACE FUNCTION get_user_quiz_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', p_user_id,
        'total_xp', COALESCE(total_xp, 0),
        'current_level', COALESCE(current_level, 1),
        'total_questions', COALESCE(total_questions_answered, 0),
        'correct_answers', COALESCE(total_correct_answers, 0),
        'accuracy_rate', 
            CASE 
                WHEN total_questions_answered > 0 
                THEN ROUND((total_correct_answers::DECIMAL / total_questions_answered) * 100, 2)
                ELSE 0 
            END,
        'longest_streak', COALESCE(longest_streak, 0),
        'current_streak', COALESCE(current_streak, 0),
        'achievements_count', (
            SELECT COUNT(*) 
            FROM user_achievements 
            WHERE user_id = p_user_id
        )
    )
    INTO result
    FROM user_quiz_progress
    WHERE user_id = p_user_id;
    
    -- If no progress record exists, return default values
    IF result IS NULL THEN
        result := json_build_object(
            'user_id', p_user_id,
            'total_xp', 0,
            'current_level', 1,
            'total_questions', 0,
            'correct_answers', 0,
            'accuracy_rate', 0,
            'longest_streak', 0,
            'current_streak', 0,
            'achievements_count', 0
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user progress after quiz completion
CREATE OR REPLACE FUNCTION update_user_quiz_progress(
    p_user_id UUID,
    p_questions_answered INTEGER,
    p_correct_answers INTEGER,
    p_xp_earned INTEGER,
    p_new_streak INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_quiz_progress (
        user_id, 
        total_questions_answered, 
        total_correct_answers, 
        total_xp,
        current_streak,
        longest_streak
    ) VALUES (
        p_user_id, 
        p_questions_answered, 
        p_correct_answers, 
        p_xp_earned,
        COALESCE(p_new_streak, 0),
        COALESCE(p_new_streak, 0)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_questions_answered = user_quiz_progress.total_questions_answered + p_questions_answered,
        total_correct_answers = user_quiz_progress.total_correct_answers + p_correct_answers,
        total_xp = user_quiz_progress.total_xp + p_xp_earned,
        current_streak = COALESCE(p_new_streak, user_quiz_progress.current_streak),
        longest_streak = GREATEST(user_quiz_progress.longest_streak, COALESCE(p_new_streak, user_quiz_progress.current_streak)),
        current_level = GREATEST(1, (user_quiz_progress.total_xp + p_xp_earned) / 100),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BIBLE QUIZ DATABASE SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Created Tables:';
    RAISE NOTICE '- bible_questions (% rows)', (SELECT COUNT(*) FROM bible_questions);
    RAISE NOTICE '- user_quiz_progress';
    RAISE NOTICE '- quiz_sessions';
    RAISE NOTICE '- user_question_history';
    RAISE NOTICE '- quiz_achievements (% rows)', (SELECT COUNT(*) FROM quiz_achievements);
    RAISE NOTICE '- user_achievements';
    RAISE NOTICE '- daily_challenges (% rows)', (SELECT COUNT(*) FROM daily_challenges);
    RAISE NOTICE '- user_daily_challenges';
    RAISE NOTICE '';
    RAISE NOTICE 'Features Activated:';
    RAISE NOTICE '✓ Row Level Security (RLS) policies';
    RAISE NOTICE '✓ Performance indexes';
    RAISE NOTICE '✓ Automatic timestamps';
    RAISE NOTICE '✓ Sample Bible questions';
    RAISE NOTICE '✓ Achievement system';
    RAISE NOTICE '✓ Daily challenges';
    RAISE NOTICE '✓ Utility functions';
    RAISE NOTICE '';
    RAISE NOTICE 'Your Bible Quiz is now ready for use!';
    RAISE NOTICE '=============================================================================';
END $$;