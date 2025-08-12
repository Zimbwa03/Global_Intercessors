-- =====================================================
-- GLOBAL INTERCESSORS PRAYER SCHEDULE SYSTEM ACTIVATION
-- =====================================================
-- This SQL script activates the complete intercessor prayer schedule system
-- Run this in your Supabase SQL Editor to enable all scheduling features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. INTERCESSOR SCHEDULES TABLE
-- =====================================================
-- Store user prayer day preferences and schedule settings
CREATE TABLE IF NOT EXISTS intercessor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    active_days TEXT[] DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{"5min": true, "15min": true, "1hour": false}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intercessor_schedules_user_id ON intercessor_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_intercessor_schedules_active ON intercessor_schedules(is_active);

-- =====================================================
-- 2. PRAYER ATTENDANCE TABLE
-- =====================================================
-- Track daily prayer attendance for intercessors
CREATE TABLE IF NOT EXISTS prayer_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prayer_date DATE NOT NULL,
    scheduled_day_of_week INTEGER NOT NULL CHECK (scheduled_day_of_week >= 0 AND scheduled_day_of_week <= 6),
    is_attended BOOLEAN NOT NULL,
    attended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, prayer_date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_user_date ON prayer_attendance(user_id, prayer_date);
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_date ON prayer_attendance(prayer_date);
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_dow ON prayer_attendance(scheduled_day_of_week);

-- =====================================================
-- 3. ATTENDANCE METRICS VIEW
-- =====================================================
-- Create a view for easy attendance metrics calculation
CREATE OR REPLACE VIEW user_attendance_metrics AS
SELECT 
    pa.user_id,
    COUNT(*) as total_scheduled_days,
    COUNT(CASE WHEN pa.is_attended THEN 1 END) as days_attended,
    COUNT(CASE WHEN NOT pa.is_attended THEN 1 END) as days_missed,
    ROUND(
        (COUNT(CASE WHEN pa.is_attended THEN 1 END)::FLOAT / 
         NULLIF(COUNT(*), 0) * 100), 2
    ) as attendance_rate,
    MAX(pa.prayer_date) as last_prayer_date,
    MIN(pa.prayer_date) as first_prayer_date
FROM prayer_attendance pa
GROUP BY pa.user_id;

-- =====================================================
-- 4. STREAK CALCULATION FUNCTION
-- =====================================================
-- Function to calculate current prayer streak for a user
CREATE OR REPLACE FUNCTION calculate_current_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    max_check_days INTEGER := 365; -- Prevent infinite loops
    days_checked INTEGER := 0;
    attendance_record RECORD;
    user_schedule RECORD;
BEGIN
    -- Get user's active days
    SELECT active_days INTO user_schedule
    FROM intercessor_schedules 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- If no schedule found, return 0
    IF user_schedule.active_days IS NULL OR array_length(user_schedule.active_days, 1) = 0 THEN
        RETURN 0;
    END IF;
    
    -- Check attendance going backwards from today
    WHILE days_checked < max_check_days LOOP
        -- Get day of week (0 = Sunday, 1 = Monday, etc.)
        DECLARE
            day_name TEXT;
            is_scheduled_day BOOLEAN := false;
        BEGIN
            -- Convert day of week number to day name
            day_name := CASE EXTRACT(DOW FROM check_date)
                WHEN 0 THEN 'sunday'
                WHEN 1 THEN 'monday'
                WHEN 2 THEN 'tuesday'
                WHEN 3 THEN 'wednesday'
                WHEN 4 THEN 'thursday'
                WHEN 5 THEN 'friday'
                WHEN 6 THEN 'saturday'
            END;
            
            -- Check if this day is in user's active schedule
            is_scheduled_day := day_name = ANY(user_schedule.active_days);
            
            -- Only check attendance for scheduled days
            IF is_scheduled_day THEN
                SELECT * INTO attendance_record
                FROM prayer_attendance 
                WHERE user_id = p_user_id AND prayer_date = check_date;
                
                -- If no record found or attendance was missed, break streak
                IF attendance_record IS NULL OR NOT attendance_record.is_attended THEN
                    EXIT;
                END IF;
                
                -- If attended, increment streak
                current_streak := current_streak + 1;
            END IF;
            
            -- Move to previous day
            check_date := check_date - INTERVAL '1 day';
            days_checked := days_checked + 1;
        END;
    END LOOP;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. USER METRICS FUNCTION
-- =====================================================
-- Function to get comprehensive user metrics
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id UUID)
RETURNS TABLE(
    current_streak INTEGER,
    attendance_rate NUMERIC,
    days_attended BIGINT,
    total_active_days INTEGER,
    longest_streak INTEGER,
    last_attendance_date DATE
) AS $$
DECLARE
    user_schedule RECORD;
BEGIN
    -- Get user's schedule info
    SELECT active_days INTO user_schedule
    FROM intercessor_schedules 
    WHERE user_id = p_user_id AND is_active = true;
    
    RETURN QUERY
    SELECT 
        calculate_current_streak(p_user_id) as current_streak,
        COALESCE(uam.attendance_rate, 0) as attendance_rate,
        COALESCE(uam.days_attended, 0) as days_attended,
        COALESCE(array_length(user_schedule.active_days, 1), 0) as total_active_days,
        -- Calculate longest streak (simplified version)
        COALESCE(uam.days_attended, 0) as longest_streak,
        uam.last_prayer_date as last_attendance_date
    FROM user_attendance_metrics uam
    WHERE uam.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_intercessor_schedules_updated_at ON intercessor_schedules;
CREATE TRIGGER update_intercessor_schedules_updated_at
    BEFORE UPDATE ON intercessor_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prayer_attendance_updated_at ON prayer_attendance;
CREATE TRIGGER update_prayer_attendance_updated_at
    BEFORE UPDATE ON prayer_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on tables
ALTER TABLE intercessor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for intercessor_schedules
DROP POLICY IF EXISTS "Users can view own schedule" ON intercessor_schedules;
CREATE POLICY "Users can view own schedule" ON intercessor_schedules
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own schedule" ON intercessor_schedules;
CREATE POLICY "Users can insert own schedule" ON intercessor_schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own schedule" ON intercessor_schedules;
CREATE POLICY "Users can update own schedule" ON intercessor_schedules
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own schedule" ON intercessor_schedules;
CREATE POLICY "Users can delete own schedule" ON intercessor_schedules
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for prayer_attendance
DROP POLICY IF EXISTS "Users can view own attendance" ON prayer_attendance;
CREATE POLICY "Users can view own attendance" ON prayer_attendance
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attendance" ON prayer_attendance;
CREATE POLICY "Users can insert own attendance" ON prayer_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own attendance" ON prayer_attendance;
CREATE POLICY "Users can update own attendance" ON prayer_attendance
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own attendance" ON prayer_attendance;
CREATE POLICY "Users can delete own attendance" ON prayer_attendance
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. SAMPLE DATA INSERTION
-- =====================================================
-- Insert sample schedule for demonstration (optional)
-- You can remove this section if you don't want sample data

-- Sample intercessor schedule
INSERT INTO intercessor_schedules (user_id, active_days, timezone) 
SELECT 
    auth.uid(),
    ARRAY['monday', 'wednesday', 'friday'],
    'UTC'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 9. HELPER FUNCTIONS FOR API ENDPOINTS
-- =====================================================

-- Function to get weekly attendance for a user
CREATE OR REPLACE FUNCTION get_weekly_attendance(
    p_user_id UUID,
    p_week_start DATE DEFAULT NULL
)
RETURNS TABLE(
    prayer_date DATE,
    scheduled_day_of_week INTEGER,
    is_attended BOOLEAN,
    attended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
DECLARE
    week_start DATE;
BEGIN
    -- Use provided week_start or calculate current week start (Sunday)
    week_start := COALESCE(p_week_start, DATE_TRUNC('week', CURRENT_DATE));
    
    RETURN QUERY
    SELECT 
        pa.prayer_date,
        pa.scheduled_day_of_week,
        pa.is_attended,
        pa.attended_at,
        pa.notes
    FROM prayer_attendance pa
    WHERE pa.user_id = p_user_id
    AND pa.prayer_date >= week_start
    AND pa.prayer_date < week_start + INTERVAL '7 days'
    ORDER BY pa.prayer_date;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert attendance record
CREATE OR REPLACE FUNCTION upsert_attendance(
    p_user_id UUID,
    p_prayer_date DATE,
    p_is_attended BOOLEAN,
    p_scheduled_day_of_week INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    attendance_id UUID;
BEGIN
    INSERT INTO prayer_attendance (
        user_id, 
        prayer_date, 
        scheduled_day_of_week, 
        is_attended, 
        attended_at,
        notes
    ) VALUES (
        p_user_id,
        p_prayer_date,
        p_scheduled_day_of_week,
        p_is_attended,
        CASE WHEN p_is_attended THEN NOW() ELSE NULL END,
        p_notes
    )
    ON CONFLICT (user_id, prayer_date) 
    DO UPDATE SET
        is_attended = EXCLUDED.is_attended,
        attended_at = CASE WHEN EXCLUDED.is_attended THEN NOW() ELSE NULL END,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    RETURNING id INTO attendance_id;
    
    RETURN attendance_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================
-- Grant necessary permissions for authenticated users

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON intercessor_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prayer_attendance TO authenticated;
GRANT SELECT ON user_attendance_metrics TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_current_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_attendance(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_attendance(UUID, DATE, BOOLEAN, INTEGER, TEXT) TO authenticated;

-- =====================================================
-- 11. VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the setup

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('intercessor_schedules', 'prayer_attendance');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_current_streak', 'get_user_metrics', 'get_weekly_attendance', 'upsert_attendance');

-- Check if view exists
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'user_attendance_metrics';

-- =====================================================
-- INSTALLATION COMPLETE
-- =====================================================
-- Your Global Intercessors Prayer Schedule System is now active!
-- 
-- Tables created:
-- 1. intercessor_schedules - User prayer day preferences
-- 2. prayer_attendance - Daily attendance tracking
--
-- Views created:
-- 1. user_attendance_metrics - Aggregated attendance statistics
--
-- Functions created:
-- 1. calculate_current_streak() - Calculate prayer streaks
-- 2. get_user_metrics() - Get comprehensive user metrics
-- 3. get_weekly_attendance() - Get weekly attendance data
-- 4. upsert_attendance() - Insert/update attendance records
--
-- Security features:
-- - Row Level Security enabled
-- - User-specific data access policies
-- - Automatic timestamp updates
--
-- Next steps:
-- 1. Test the API endpoints in your application
-- 2. Verify user can set prayer schedules
-- 3. Test attendance tracking functionality
-- 4. Monitor performance and adjust indexes if needed
--
-- =====================================================