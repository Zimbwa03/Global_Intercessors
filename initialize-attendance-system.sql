
-- Initialize attendance system with proper structure and sample data
-- Run this in Supabase SQL Editor

-- 1. Ensure attendance_log table exists with proper structure
CREATE TABLE IF NOT EXISTS attendance_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    slot_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('attended', 'missed')),
    zoom_join_time TIMESTAMP WITH TIME ZONE,
    zoom_leave_time TIMESTAMP WITH TIME ZONE,
    zoom_meeting_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 2. Ensure zoom_meetings table exists
CREATE TABLE IF NOT EXISTS zoom_meetings (
    id SERIAL PRIMARY KEY,
    meeting_id TEXT UNIQUE NOT NULL,
    meeting_uuid TEXT,
    topic TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    participant_count INTEGER DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE,
    zoom_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_date ON attendance_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_status ON attendance_log(status);
CREATE INDEX IF NOT EXISTS idx_attendance_log_created_at ON attendance_log(created_at);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_processed ON zoom_meetings(processed);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_start_time ON zoom_meetings(start_time);

-- 4. Enable RLS
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for attendance_log
DROP POLICY IF EXISTS "Enable all for service role" ON attendance_log;
CREATE POLICY "Enable all for service role" ON attendance_log
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_log;
CREATE POLICY "Users can view their own attendance" ON attendance_log
    FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);

-- 6. Create RLS policies for zoom_meetings
DROP POLICY IF EXISTS "Enable all for service role" ON zoom_meetings;
CREATE POLICY "Enable all for service role" ON zoom_meetings
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read zoom meetings" ON zoom_meetings;
CREATE POLICY "Authenticated can read zoom meetings" ON zoom_meetings
    FOR SELECT TO authenticated USING (true);

-- 7. Grant permissions
GRANT ALL ON attendance_log TO authenticated, service_role;
GRANT ALL ON zoom_meetings TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 8. Create function to generate sample attendance data
CREATE OR REPLACE FUNCTION generate_sample_attendance(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prayer_slot_record RECORD;
    i INTEGER;
    attendance_date DATE;
    is_attended BOOLEAN;
    sample_count INTEGER := 0;
BEGIN
    -- Get user's prayer slot
    SELECT * INTO prayer_slot_record 
    FROM prayer_slots 
    WHERE user_id = p_user_id AND status = 'active' 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active prayer slot found for user %', p_user_id;
    END IF;
    
    -- Generate attendance records for the past p_days days
    FOR i IN 0..p_days-1 LOOP
        attendance_date := CURRENT_DATE - i;
        is_attended := random() > 0.15; -- 85% attendance rate
        
        INSERT INTO attendance_log (
            user_id,
            slot_id,
            date,
            status,
            zoom_join_time,
            zoom_leave_time,
            zoom_meeting_id,
            created_at
        ) VALUES (
            p_user_id,
            prayer_slot_record.id,
            attendance_date,
            CASE WHEN is_attended THEN 'attended' ELSE 'missed' END,
            CASE WHEN is_attended THEN attendance_date + INTERVAL '12 hours' + (random() * INTERVAL '2 hours') ELSE NULL END,
            CASE WHEN is_attended THEN attendance_date + INTERVAL '12 hours' + INTERVAL '30 minutes' + (random() * INTERVAL '20 minutes') ELSE NULL END,
            CASE WHEN is_attended THEN 'sample_meeting_' || extract(epoch from now())::bigint || '_' || i ELSE NULL END,
            attendance_date + INTERVAL '12 hours'
        )
        ON CONFLICT (user_id, date) DO NOTHING;
        
        sample_count := sample_count + 1;
    END LOOP;
    
    RETURN sample_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_sample_attendance(UUID, INTEGER) TO authenticated, service_role;

-- Completion message
SELECT 'Attendance system initialized successfully! Use the admin panel to generate sample data.' as message;
