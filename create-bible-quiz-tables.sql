
-- Create Bible Quiz tables for WhatsApp bot functionality

-- Bible Quiz Progress table
CREATE TABLE IF NOT EXISTS bible_quiz_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bible Quiz Sessions table
CREATE TABLE IF NOT EXISTS bible_quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'general',
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    current_question_number INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    final_score INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    topic VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bible_quiz_progress_user_id ON bible_quiz_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_quiz_sessions_user_id ON bible_quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_quiz_sessions_active ON bible_quiz_sessions(is_active);

-- Enable RLS
ALTER TABLE bible_quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their quiz progress" ON bible_quiz_progress
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can manage their quiz sessions" ON bible_quiz_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON bible_quiz_progress TO authenticated;
GRANT ALL ON bible_quiz_progress TO service_role;
GRANT ALL ON bible_quiz_sessions TO authenticated;
GRANT ALL ON bible_quiz_sessions TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE bible_quiz_progress_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bible_quiz_progress_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE bible_quiz_sessions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bible_quiz_sessions_id_seq TO service_role;
