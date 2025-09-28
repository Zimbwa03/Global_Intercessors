-- Bible Chat History System with 7-Day Data Retention
-- Professional chat history management for Global Intercessors

-- Create bible_chat_history table
CREATE TABLE IF NOT EXISTS bible_chat_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
  message_content TEXT NOT NULL,
  
  -- AI Response specific fields
  scripture_reference TEXT,
  scripture_text TEXT,
  scripture_version TEXT DEFAULT 'KJV',
  ai_explanation TEXT,
  prayer_point TEXT,
  
  -- Metadata
  session_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Indexing for performance
  CONSTRAINT fk_bible_chat_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bible_chat_user_id ON bible_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_chat_created_at ON bible_chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_bible_chat_expires_at ON bible_chat_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_bible_chat_session_id ON bible_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_bible_chat_user_recent ON bible_chat_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE bible_chat_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chat history" ON bible_chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON bible_chat_history;
DROP POLICY IF EXISTS "Service role can manage all chat history" ON bible_chat_history;

-- Create RLS policies
CREATE POLICY "Users can view their own chat history" ON bible_chat_history
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert their own chat messages" ON bible_chat_history
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

-- Allow service role to manage all chat history (for cleanup and admin operations)
CREATE POLICY "Service role can manage all chat history" ON bible_chat_history
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT ON bible_chat_history TO authenticated;
GRANT ALL ON bible_chat_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE bible_chat_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bible_chat_history_id_seq TO service_role;

-- Create function to get user's recent chat history (last 7 days)
CREATE OR REPLACE FUNCTION get_user_chat_history(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id BIGINT,
  message_type TEXT,
  message_content TEXT,
  scripture_reference TEXT,
  scripture_text TEXT,
  scripture_version TEXT,
  ai_explanation TEXT,
  prayer_point TEXT,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bch.id,
    bch.message_type,
    bch.message_content,
    bch.scripture_reference,
    bch.scripture_text,
    bch.scripture_version,
    bch.ai_explanation,
    bch.prayer_point,
    bch.session_id,
    bch.created_at
  FROM bible_chat_history bch
  WHERE bch.user_id = target_user_id
    AND bch.created_at >= (NOW() - INTERVAL '7 days')
  ORDER BY bch.created_at ASC;
END;
$$;

-- Create function to get chat sessions grouped by day
CREATE OR REPLACE FUNCTION get_user_chat_sessions(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  chat_date DATE,
  session_count BIGINT,
  message_count BIGINT,
  first_message_time TIMESTAMP WITH TIME ZONE,
  last_message_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bch.created_at::DATE as chat_date,
    COUNT(DISTINCT bch.session_id) as session_count,
    COUNT(*) as message_count,
    MIN(bch.created_at) as first_message_time,
    MAX(bch.created_at) as last_message_time
  FROM bible_chat_history bch
  WHERE bch.user_id = target_user_id
    AND bch.created_at >= (NOW() - INTERVAL '7 days')
  GROUP BY bch.created_at::DATE
  ORDER BY chat_date DESC;
END;
$$;

-- Create function to automatically clean up expired chat history
CREATE OR REPLACE FUNCTION cleanup_expired_chat_history()
RETURNS TABLE (deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_rows BIGINT;
BEGIN
  -- Delete messages older than 7 days
  DELETE FROM bible_chat_history 
  WHERE expires_at < NOW() OR created_at < (NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_rows;
  
  -- Log the cleanup action
  RAISE NOTICE 'Bible chat cleanup completed. Deleted % expired messages.', deleted_rows;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_chat_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_chat_history(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_chat_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_chat_sessions(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_chat_history() TO service_role;

-- Create a trigger to automatically set expires_at when inserting new messages
CREATE OR REPLACE FUNCTION set_chat_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_chat_expiry
  BEFORE INSERT ON bible_chat_history
  FOR EACH ROW
  EXECUTE FUNCTION set_chat_expiry();

-- Create a scheduled cleanup job (requires pg_cron extension)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You can also run this manually or set up a cron job in your server
-- SELECT cron.schedule('chat-cleanup', '0 2 * * *', 'SELECT cleanup_expired_chat_history();');

-- Test the functions
DO $$
DECLARE
  test_user_id UUID;
  function_exists BOOLEAN;
BEGIN
  -- Test if functions exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_user_chat_history'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ get_user_chat_history function created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create get_user_chat_history function';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'cleanup_expired_chat_history'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ cleanup_expired_chat_history function created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create cleanup_expired_chat_history function';
  END IF;
  
  RAISE NOTICE '🎉 Bible Chat History System setup complete!';
  RAISE NOTICE '📅 Chat messages will automatically expire after 7 days';
  RAISE NOTICE '🔒 Row Level Security is enabled for user privacy';
  RAISE NOTICE '🧹 Automatic cleanup function is ready for scheduling';
END
$$;











