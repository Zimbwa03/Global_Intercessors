-- Create Comprehensive Analytics System for Global Intercessors
-- This SQL script creates all necessary tables, functions, and views for real-time analytics

-- 1. Create analytics summary table for caching
CREATE TABLE IF NOT EXISTS analytics_summary (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, metric_type)
);

-- 2. Create real-time attendance metrics view
CREATE OR REPLACE VIEW attendance_metrics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_attendance_records,
    COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended_count,
    COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_count,
    ROUND(
        (COUNT(CASE WHEN status = 'attended' THEN 1 END)::FLOAT / 
         NULLIF(COUNT(*), 0) * 100), 2
    ) as attendance_rate,
    AVG(EXTRACT(EPOCH FROM (zoom_leave_time - zoom_join_time))/60) as avg_duration_minutes
FROM attendance_log 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 3. Create prayer slot coverage view
CREATE OR REPLACE VIEW slot_coverage_metrics AS
SELECT 
    DATE(created_at) as date,
    slot_time,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_slots,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_slots,
    ROUND(
        (COUNT(CASE WHEN status = 'active' THEN 1 END)::FLOAT / 
         NULLIF(COUNT(*), 0) * 100), 2
    ) as coverage_rate
FROM prayer_slots 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), slot_time
ORDER BY date DESC, slot_time;

-- 4. Create Zoom meeting analytics view
CREATE OR REPLACE VIEW zoom_meeting_analytics AS
SELECT 
    DATE(start_time) as date,
    COUNT(*) as total_meetings,
    SUM(participant_count) as total_participants,
    AVG(participant_count) as avg_participants_per_meeting,
    AVG(duration) as avg_duration_minutes,
    COUNT(CASE WHEN processed = true THEN 1 END) as processed_meetings,
    COUNT(CASE WHEN processed = false THEN 1 END) as unprocessed_meetings
FROM zoom_meetings 
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- 5. Create user performance analytics view
CREATE OR REPLACE VIEW user_performance_analytics AS
SELECT 
    ps.user_id,
    ps.user_email,
    ps.slot_time,
    ps.status as slot_status,
    ps.missed_count,
    COALESCE(att.total_days, 0) as total_attendance_days,
    COALESCE(att.attended_days, 0) as attended_days,
    COALESCE(att.missed_days, 0) as missed_days,
    COALESCE(att.attendance_rate, 0) as attendance_rate,
    COALESCE(att.current_streak, 0) as current_streak,
    COALESCE(att.last_attended_date, NULL) as last_attended_date,
    ps.created_at as slot_created_at,
    ps.updated_at as slot_updated_at
FROM prayer_slots ps
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended_days,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_days,
        ROUND(
            (COUNT(CASE WHEN status = 'attended' THEN 1 END)::FLOAT / 
             NULLIF(COUNT(*), 0) * 100), 2
        ) as attendance_rate,
        COALESCE((
            SELECT COUNT(*)
            FROM (
                SELECT date, status,
                    ROW_NUMBER() OVER (ORDER BY date DESC) as rn
                FROM attendance_log 
                WHERE user_id = ps.user_id 
                ORDER BY date DESC
            ) ranked
            WHERE status = 'attended' 
            AND rn <= (
                SELECT COALESCE((
                    SELECT rn FROM (
                        SELECT date, status,
                            ROW_NUMBER() OVER (ORDER BY date DESC) as rn
                        FROM attendance_log 
                        WHERE user_id = ps.user_id 
                        ORDER BY date DESC
                    ) ranked2
                    WHERE status != 'attended'
                    LIMIT 1
                ), 999)
            )
        ), 0) as current_streak,
        MAX(CASE WHEN status = 'attended' THEN date END) as last_attended_date
    FROM attendance_log 
    WHERE user_id = ps.user_id
) att ON true;

-- 6. Create weekly analytics function
CREATE OR REPLACE FUNCTION get_weekly_analytics(start_date DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    week_start DATE;
    week_end DATE;
    result JSONB;
BEGIN
    -- Default to current week if no date provided
    IF start_date IS NULL THEN
        week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        week_start := DATE_TRUNC('week', start_date)::DATE;
    END IF;
    
    week_end := week_start + INTERVAL '6 days';
    
    -- Get comprehensive weekly data
    SELECT jsonb_build_object(
        'week_start', week_start,
        'week_end', week_end,
        'attendance_summary', (
            SELECT jsonb_build_object(
                'total_records', COUNT(*),
                'attended_count', COUNT(CASE WHEN status = 'attended' THEN 1 END),
                'missed_count', COUNT(CASE WHEN status = 'missed' THEN 1 END),
                'attendance_rate', ROUND(
                    (COUNT(CASE WHEN status = 'attended' THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                ),
                'avg_duration_minutes', AVG(EXTRACT(EPOCH FROM (zoom_leave_time - zoom_join_time))/60)
            )
            FROM attendance_log 
            WHERE date BETWEEN week_start AND week_end
        ),
        'slot_coverage', (
            SELECT jsonb_build_object(
                'total_slots', COUNT(*),
                'active_slots', COUNT(CASE WHEN status = 'active' THEN 1 END),
                'inactive_slots', COUNT(CASE WHEN status = 'inactive' THEN 1 END),
                'coverage_rate', ROUND(
                    (COUNT(CASE WHEN status = 'active' THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                )
            )
            FROM prayer_slots 
            WHERE created_at::DATE BETWEEN week_start AND week_end
        ),
        'zoom_meetings', (
            SELECT jsonb_build_object(
                'total_meetings', COUNT(*),
                'total_participants', SUM(participant_count),
                'avg_participants', AVG(participant_count),
                'avg_duration', AVG(duration),
                'processed_meetings', COUNT(CASE WHEN processed = true THEN 1 END),
                'unprocessed_meetings', COUNT(CASE WHEN processed = false THEN 1 END)
            )
            FROM zoom_meetings 
            WHERE start_time::DATE BETWEEN week_start AND week_end
        ),
        'daily_breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', daily_data.date,
                    'attendance_count', daily_data.attendance_count,
                    'attended_count', daily_data.attended_count,
                    'missed_count', daily_data.missed_count,
                    'attendance_rate', daily_data.attendance_rate,
                    'zoom_meetings', daily_data.zoom_meetings,
                    'total_participants', daily_data.total_participants
                )
            )
            FROM (
                SELECT 
                    al.date,
                    COUNT(al.*) as attendance_count,
                    COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as attended_count,
                    COUNT(CASE WHEN al.status = 'missed' THEN 1 END) as missed_count,
                    ROUND(
                        (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::FLOAT / 
                         NULLIF(COUNT(al.*), 0) * 100), 2
                    ) as attendance_rate,
                    COALESCE(zm.zoom_meetings, 0) as zoom_meetings,
                    COALESCE(zm.total_participants, 0) as total_participants
                FROM attendance_log al
                LEFT JOIN (
                    SELECT 
                        start_time::DATE as date,
                        COUNT(*) as zoom_meetings,
                        SUM(participant_count) as total_participants
                    FROM zoom_meetings 
                    WHERE start_time::DATE BETWEEN week_start AND week_end
                    GROUP BY start_time::DATE
                ) zm ON al.date = zm.date
                WHERE al.date BETWEEN week_start AND week_end
                GROUP BY al.date, zm.zoom_meetings, zm.total_participants
                ORDER BY al.date
            ) daily_data
        ),
        'top_performers', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', user_id,
                    'user_email', user_email,
                    'slot_time', slot_time,
                    'attendance_rate', attendance_rate,
                    'current_streak', current_streak,
                    'total_attendance_days', total_attendance_days
                )
            )
            FROM user_performance_analytics
            WHERE attendance_rate > 0
            ORDER BY attendance_rate DESC, current_streak DESC
            LIMIT 10
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Create real-time dashboard data function
CREATE OR REPLACE FUNCTION get_realtime_dashboard_data()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'current_time', NOW(),
        'today_attendance', (
            SELECT jsonb_build_object(
                'total_records', COUNT(*),
                'attended_count', COUNT(CASE WHEN status = 'attended' THEN 1 END),
                'missed_count', COUNT(CASE WHEN status = 'missed' THEN 1 END),
                'attendance_rate', ROUND(
                    (COUNT(CASE WHEN status = 'attended' THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                )
            )
            FROM attendance_log 
            WHERE date = CURRENT_DATE
        ),
        'active_slots_today', (
            SELECT COUNT(*)
            FROM prayer_slots 
            WHERE status = 'active' 
            AND created_at::DATE <= CURRENT_DATE
        ),
        'zoom_meetings_today', (
            SELECT jsonb_build_object(
                'total_meetings', COUNT(*),
                'total_participants', SUM(participant_count),
                'active_meetings', COUNT(CASE WHEN start_time <= NOW() AND end_time >= NOW() THEN 1 END)
            )
            FROM zoom_meetings 
            WHERE start_time::DATE = CURRENT_DATE
        ),
        'weekly_summary', get_weekly_analytics(),
        'recent_activity', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'type', 'attendance',
                    'user_email', al.user_email,
                    'status', al.status,
                    'timestamp', al.created_at,
                    'slot_time', ps.slot_time
                )
            )
            FROM attendance_log al
            LEFT JOIN prayer_slots ps ON al.user_id = ps.user_id
            WHERE al.created_at >= NOW() - INTERVAL '1 hour'
            ORDER BY al.created_at DESC
            LIMIT 20
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Create analytics cache refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_cache()
RETURNS VOID AS $$
BEGIN
    -- Clear old cache entries (older than 1 hour)
    DELETE FROM analytics_summary 
    WHERE created_at < NOW() - INTERVAL '1 hour';
    
    -- Insert current analytics data
    INSERT INTO analytics_summary (date, metric_type, metric_value)
    VALUES 
        (CURRENT_DATE, 'realtime_dashboard', get_realtime_dashboard_data()),
        (CURRENT_DATE, 'weekly_analytics', get_weekly_analytics()),
        (CURRENT_DATE, 'attendance_metrics', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', date,
                    'total_records', total_attendance_records,
                    'attended_count', attended_count,
                    'missed_count', missed_count,
                    'attendance_rate', attendance_rate,
                    'avg_duration_minutes', avg_duration_minutes
                )
            )
            FROM attendance_metrics 
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        ))
    ON CONFLICT (date, metric_type) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_log_date ON attendance_log(date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_id ON attendance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_log_status ON attendance_log(status);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_status ON prayer_slots(status);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_created_at ON prayer_slots(created_at);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_start_time ON zoom_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_processed ON zoom_meetings(processed);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_metric_type ON analytics_summary(metric_type);

-- 10. Create RLS policies for analytics tables
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all analytics data
CREATE POLICY "Service role can access analytics_summary" ON analytics_summary
    FOR ALL USING (true);

-- Allow authenticated users to read analytics data
CREATE POLICY "Authenticated users can read analytics_summary" ON analytics_summary
    FOR SELECT USING (auth.role() = 'authenticated');

-- 11. Create trigger to auto-refresh analytics cache
CREATE OR REPLACE FUNCTION trigger_analytics_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh cache when attendance or prayer slots change
    PERFORM refresh_analytics_cache();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-refresh
DROP TRIGGER IF EXISTS attendance_log_analytics_trigger ON attendance_log;
CREATE TRIGGER attendance_log_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance_log
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_analytics_refresh();

DROP TRIGGER IF EXISTS prayer_slots_analytics_trigger ON prayer_slots;
CREATE TRIGGER prayer_slots_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON prayer_slots
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_analytics_refresh();

DROP TRIGGER IF EXISTS zoom_meetings_analytics_trigger ON zoom_meetings;
CREATE TRIGGER zoom_meetings_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON zoom_meetings
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_analytics_refresh();

-- 12. Initial cache refresh
SELECT refresh_analytics_cache();

-- 13. Create sample data for testing (optional)
INSERT INTO analytics_summary (date, metric_type, metric_value)
VALUES 
    (CURRENT_DATE, 'sample_data', jsonb_build_object(
        'message', 'Analytics system initialized successfully',
        'features', jsonb_build_array(
            'Real-time attendance tracking',
            'Zoom meeting analytics',
            'Prayer slot coverage metrics',
            'User performance analytics',
            'Weekly reporting',
            'Automated cache refresh'
        )
    ))
ON CONFLICT (date, metric_type) DO NOTHING;

-- Success message
SELECT 'Analytics system created successfully! All functions, views, and triggers are ready.' as status;

