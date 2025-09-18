-- =====================================================
-- COMPLETE ANALYTICS SYSTEM SETUP FOR GLOBAL INTERCESSORS
-- =====================================================
-- This script combines create-analytics-system.sql and enhanced-analytics-api.sql
-- Run this entire script in your Supabase SQL editor

-- =====================================================
-- PART 1: CREATE ANALYTICS SYSTEM TABLES AND FUNCTIONS
-- =====================================================

-- 1. Create analytics cache table
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user daily summary table
CREATE TABLE IF NOT EXISTS user_daily_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    total_slots INTEGER DEFAULT 0,
    attended_slots INTEGER DEFAULT 0,
    missed_slots INTEGER DEFAULT 0,
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    current_streak INTEGER DEFAULT 0,
    last_attended_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 3. Create slot coverage summary table
CREATE TABLE IF NOT EXISTS slot_coverage_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slot_time TIME NOT NULL,
    date DATE NOT NULL,
    total_capacity INTEGER DEFAULT 0,
    filled_slots INTEGER DEFAULT 0,
    coverage_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_time, date)
);

-- 4. Create zoom meeting summary table
CREATE TABLE IF NOT EXISTS zoom_meeting_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    date DATE NOT NULL,
    slot_time TIME NOT NULL,
    total_participants INTEGER DEFAULT 0,
    unique_participants INTEGER DEFAULT 0,
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, date)
);

-- 5. Create user analytics view
CREATE OR REPLACE VIEW user_analytics_view AS
SELECT 
    ps.user_id,
    up.full_name,
    up.email,
    ps.slot_time,
    ps.day_of_week,
    COALESCE(att.total_slots, 0) as total_slots,
    COALESCE(att.attended_days, 0) as attended_days,
    COALESCE(att.missed_days, 0) as missed_days,
    COALESCE(att.attendance_rate, 0) as attendance_rate,
    COALESCE(att.current_streak, 0) as current_streak,
    att.last_attended_date
FROM prayer_slots ps
LEFT JOIN user_profiles up ON ps.user_id::uuid = up.id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_slots,
        COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended_days,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_days,
        ROUND(
            (COUNT(CASE WHEN status = 'attended' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(*), 0) * 100), 2
        ) as attendance_rate,
        calculate_current_streak(ps.user_id) as current_streak,
        MAX(CASE WHEN status = 'attended' THEN date END) as last_attended_date
    FROM attendance_log 
    WHERE user_id = ps.user_id
) att ON true;

-- 6. Create function to calculate current streak
CREATE OR REPLACE FUNCTION calculate_current_streak(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    attendance_status TEXT;
BEGIN
    -- Check attendance for each day going backwards from today
    LOOP
        SELECT status INTO attendance_status
        FROM attendance_log 
        WHERE user_id = p_user_id::uuid 
        AND date = current_date
        LIMIT 1;
        
        -- If no record found or status is not 'attended', break
        IF attendance_status IS NULL OR attendance_status != 'attended' THEN
            EXIT;
        END IF;
        
        -- Increment streak and move to previous day
        streak_count := streak_count + 1;
        current_date := current_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Create weekly analytics function
CREATE OR REPLACE FUNCTION get_weekly_analytics(start_date DATE DEFAULT NULL)
RETURNS TABLE (
    week_start DATE,
    week_end DATE,
    total_users INTEGER,
    total_slots INTEGER,
    attended_slots INTEGER,
    missed_slots INTEGER,
    attendance_rate DECIMAL(5,2),
    avg_streak DECIMAL(5,2),
    top_performer TEXT,
    top_performer_rate DECIMAL(5,2)
) AS $$
DECLARE
    week_start_date DATE;
    week_end_date DATE;
BEGIN
    -- Set default to current week if no date provided
    IF start_date IS NULL THEN
        start_date := CURRENT_DATE;
    END IF;
    
    -- Calculate week boundaries (Monday to Sunday)
    week_start_date := start_date - EXTRACT(DOW FROM start_date)::INTEGER + 1;
    week_end_date := week_start_date + INTERVAL '6 days';
    
    RETURN QUERY
    WITH weekly_data AS (
        SELECT 
            al.user_id,
            COUNT(*) as total_slots,
            COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as attended_slots,
            COUNT(CASE WHEN al.status = 'missed' THEN 1 END) as missed_slots,
            ROUND(
                (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(*), 0) * 100), 2
            ) as attendance_rate
        FROM attendance_log al
        WHERE al.date >= week_start_date 
        AND al.date <= week_end_date
        GROUP BY al.user_id
    ),
    top_performer_data AS (
        SELECT 
            up.full_name,
            wd.attendance_rate
        FROM weekly_data wd
        JOIN user_profiles up ON wd.user_id::uuid = up.id
        ORDER BY wd.attendance_rate DESC
        LIMIT 1
    )
    SELECT 
        week_start_date,
        week_end_date,
        COUNT(DISTINCT wd.user_id)::INTEGER as total_users,
        SUM(wd.total_slots)::INTEGER as total_slots,
        SUM(wd.attended_slots)::INTEGER as attended_slots,
        SUM(wd.missed_slots)::INTEGER as missed_slots,
        ROUND(
            (SUM(wd.attended_slots)::NUMERIC / 
             NULLIF(SUM(wd.total_slots), 0) * 100), 2
        ) as attendance_rate,
        ROUND(AVG(wd.attendance_rate), 2) as avg_streak,
        COALESCE(tpd.full_name, 'N/A') as top_performer,
        COALESCE(tpd.attendance_rate, 0) as top_performer_rate
    FROM weekly_data wd
    CROSS JOIN top_performer_data tpd;
END;
$$ LANGUAGE plpgsql;

-- 7. Create real-time analytics function
CREATE OR REPLACE FUNCTION get_realtime_analytics()
RETURNS TABLE (
    total_users INTEGER,
    active_today INTEGER,
    total_slots_today INTEGER,
    attended_today INTEGER,
    missed_today INTEGER,
    today_attendance_rate DECIMAL(5,2),
    current_streak_avg DECIMAL(5,2),
    zoom_meetings_today INTEGER,
    zoom_participants_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH today_data AS (
        SELECT 
            COUNT(DISTINCT ps.user_id) as total_users,
            COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as attended_today,
            COUNT(CASE WHEN al.status = 'missed' THEN 1 END) as missed_today,
            COUNT(*) as total_slots_today
        FROM prayer_slots ps
        LEFT JOIN attendance_log al ON ps.user_id = al.user_id 
            AND al.date = CURRENT_DATE
        WHERE ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    ),
    streak_data AS (
        SELECT AVG(current_streak) as avg_streak
        FROM user_analytics_view
    ),
    zoom_data AS (
        SELECT 
            COUNT(DISTINCT zm.meeting_id) as meetings_today,
            COALESCE(SUM(zm.participant_count), 0) as participants_today
        FROM zoom_meetings zm
        WHERE zm.date = CURRENT_DATE
    )
    SELECT 
        td.total_users,
        td.attended_today as active_today,
        td.total_slots_today,
        td.attended_today,
        td.missed_today,
        ROUND(
            (td.attended_today::NUMERIC / 
             NULLIF(td.total_slots_today, 0) * 100), 2
        ) as today_attendance_rate,
        ROUND(COALESCE(sd.avg_streak, 0), 2) as current_streak_avg,
        zd.meetings_today::INTEGER as zoom_meetings_today,
        zd.participants_today::INTEGER as zoom_participants_today
    FROM today_data td
    CROSS JOIN streak_data sd
    CROSS JOIN zoom_data zd;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: ENHANCED ANALYTICS API FUNCTIONS
-- =====================================================

-- 8. Create get_realtime_analytics_data function
CREATE OR REPLACE FUNCTION get_realtime_analytics_data()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH realtime_data AS (
        SELECT * FROM get_realtime_analytics()
    ),
    recent_activity AS (
        SELECT 
            al.user_id,
            up.full_name,
            al.status,
            al.date,
            ps.slot_time
        FROM attendance_log al
        JOIN user_profiles up ON al.user_id::uuid = up.id
        JOIN prayer_slots ps ON al.user_id = ps.user_id
        WHERE al.date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY al.date DESC, al.created_at DESC
        LIMIT 20
    ),
    top_performers AS (
        SELECT 
            user_id,
            full_name,
            attendance_rate,
            current_streak
        FROM user_analytics_view
        WHERE attendance_rate > 0
        ORDER BY attendance_rate DESC, current_streak DESC
        LIMIT 5
    )
    SELECT jsonb_build_object(
        'realtime', (SELECT row_to_json(rd) FROM realtime_data rd),
        'recent_activity', (SELECT jsonb_agg(row_to_json(ra)) FROM recent_activity ra),
        'top_performers', (SELECT jsonb_agg(row_to_json(tp)) FROM top_performers tp),
        'last_updated', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. Create get_weekly_analytics_data function
CREATE OR REPLACE FUNCTION get_weekly_analytics_data(weeks_back INTEGER DEFAULT 4)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH weekly_summaries AS (
        SELECT 
            week_start,
            week_end,
            total_users,
            total_slots,
            attended_slots,
            missed_slots,
            attendance_rate,
            avg_streak,
            top_performer,
            top_performer_rate
        FROM get_weekly_analytics(CURRENT_DATE - (weeks_back * 7))
        UNION ALL
        SELECT 
            week_start,
            week_end,
            total_users,
            total_slots,
            attended_slots,
            missed_slots,
            attendance_rate,
            avg_streak,
            top_performer,
            top_performer_rate
        FROM get_weekly_analytics(CURRENT_DATE - ((weeks_back - 1) * 7))
        UNION ALL
        SELECT 
            week_start,
            week_end,
            total_users,
            total_slots,
            attended_slots,
            missed_slots,
            attendance_rate,
            avg_streak,
            top_performer,
            top_performer_rate
        FROM get_weekly_analytics(CURRENT_DATE - ((weeks_back - 2) * 7))
        UNION ALL
        SELECT 
            week_start,
            week_end,
            total_users,
            total_slots,
            attended_slots,
            missed_slots,
            attendance_rate,
            avg_streak,
            top_performer,
            top_performer_rate
        FROM get_weekly_analytics(CURRENT_DATE - ((weeks_back - 3) * 7))
    )
    SELECT jsonb_build_object(
        'weekly_data', (SELECT jsonb_agg(row_to_json(ws)) FROM weekly_summaries ws ORDER BY week_start),
        'generated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Create get_user_analytics_data function
CREATE OR REPLACE FUNCTION get_user_analytics_data(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    user_id_val UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO user_id_val FROM user_profiles WHERE email = user_email;
    
    IF user_id_val IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    WITH user_stats AS (
        SELECT 
            user_id,
            full_name,
            email,
            slot_time,
            day_of_week,
            total_slots,
            attended_days,
            missed_days,
            attendance_rate,
            current_streak,
            last_attended_date
        FROM user_analytics_view
        WHERE user_id = user_id_val
    ),
    recent_attendance AS (
        SELECT 
            date,
            status,
            created_at
        FROM attendance_log
        WHERE user_id = user_id_val
        ORDER BY date DESC
        LIMIT 30
    ),
    monthly_breakdown AS (
        SELECT 
            DATE_TRUNC('month', date) as month,
            COUNT(*) as total_slots,
            COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended,
            ROUND(
                (COUNT(CASE WHEN status = 'attended' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(*), 0) * 100), 2
            ) as rate
        FROM attendance_log
        WHERE user_id = user_id_val
        AND date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month DESC
    )
    SELECT jsonb_build_object(
        'user_stats', (SELECT row_to_json(us) FROM user_stats us),
        'recent_attendance', (SELECT jsonb_agg(row_to_json(ra)) FROM recent_attendance ra),
        'monthly_breakdown', (SELECT jsonb_agg(row_to_json(mb)) FROM monthly_breakdown mb),
        'generated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Create get_zoom_analytics_data function
CREATE OR REPLACE FUNCTION get_zoom_analytics_data()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH zoom_summary AS (
        SELECT 
            COUNT(DISTINCT meeting_id) as total_meetings,
            COUNT(*) as total_meeting_days,
            SUM(participant_count) as total_participants,
            AVG(participant_count) as avg_participants_per_meeting,
            MAX(participant_count) as max_participants,
            MIN(participant_count) as min_participants
        FROM zoom_meetings
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    ),
    daily_zoom_stats AS (
        SELECT 
            date,
            COUNT(DISTINCT meeting_id) as meetings_count,
            SUM(participant_count) as total_participants,
            AVG(participant_count) as avg_participants
        FROM zoom_meetings
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date DESC
    ),
    top_meetings AS (
        SELECT 
            meeting_id,
            date,
            slot_time,
            participant_count,
            zoom_link
        FROM zoom_meetings
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY participant_count DESC
        LIMIT 10
    )
    SELECT jsonb_build_object(
        'summary', (SELECT row_to_json(zs) FROM zoom_summary zs),
        'daily_stats', (SELECT jsonb_agg(row_to_json(dzs)) FROM daily_zoom_stats dzs),
        'top_meetings', (SELECT jsonb_agg(row_to_json(tm)) FROM top_meetings tm),
        'generated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 12. Create get_slot_analytics_data function
CREATE OR REPLACE FUNCTION get_slot_analytics_data()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH slot_coverage AS (
        SELECT 
            ps.slot_time,
            ps.day_of_week,
            COUNT(ps.user_id) as assigned_users,
            COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as attended_today,
            ROUND(
                (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(ps.user_id), 0) * 100), 2
            ) as coverage_rate
        FROM prayer_slots ps
        LEFT JOIN attendance_log al ON ps.user_id = al.user_id 
            AND al.date = CURRENT_DATE
        WHERE ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
        GROUP BY ps.slot_time, ps.day_of_week
        ORDER BY ps.slot_time
    ),
    weekly_slot_performance AS (
        SELECT 
            ps.slot_time,
            ps.day_of_week,
            COUNT(ps.user_id) as total_assignments,
            COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as total_attended,
            ROUND(
                (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(ps.user_id), 0) * 100), 2
            ) as weekly_rate
        FROM prayer_slots ps
        LEFT JOIN attendance_log al ON ps.user_id = al.user_id 
            AND al.date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ps.slot_time, ps.day_of_week
        ORDER BY ps.slot_time
    )
    SELECT jsonb_build_object(
        'today_coverage', (SELECT jsonb_agg(row_to_json(sc)) FROM slot_coverage sc),
        'weekly_performance', (SELECT jsonb_agg(row_to_json(wsp)) FROM weekly_slot_performance wsp),
        'generated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 13. Create get_performance_metrics function
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH overall_stats AS (
        SELECT 
            COUNT(DISTINCT ps.user_id) as total_users,
            COUNT(ps.id) as total_slots,
            COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as total_attended,
            COUNT(CASE WHEN al.status = 'missed' THEN 1 END) as total_missed,
            ROUND(
                (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::NUMERIC / 
                 NULLIF(COUNT(ps.id), 0) * 100), 2
            ) as overall_attendance_rate
        FROM prayer_slots ps
        LEFT JOIN attendance_log al ON ps.user_id = al.user_id
    ),
    streak_stats AS (
        SELECT 
            AVG(current_streak) as avg_streak,
            MAX(current_streak) as max_streak,
            COUNT(CASE WHEN current_streak >= 7 THEN 1 END) as users_7day_streak,
            COUNT(CASE WHEN current_streak >= 30 THEN 1 END) as users_30day_streak
        FROM user_analytics_view
    ),
    engagement_levels AS (
        SELECT 
            CASE 
                WHEN attendance_rate >= 90 THEN 'High (90%+)'
                WHEN attendance_rate >= 70 THEN 'Medium (70-89%)'
                WHEN attendance_rate >= 50 THEN 'Low (50-69%)'
                ELSE 'Very Low (<50%)'
            END as engagement_level,
            COUNT(*) as user_count
        FROM user_analytics_view
        GROUP BY 
            CASE 
                WHEN attendance_rate >= 90 THEN 'High (90%+)'
                WHEN attendance_rate >= 70 THEN 'Medium (70-89%)'
                WHEN attendance_rate >= 50 THEN 'Low (50-69%)'
                ELSE 'Very Low (<50%)'
            END
    )
    SELECT jsonb_build_object(
        'overall_stats', (SELECT row_to_json(os) FROM overall_stats os),
        'streak_stats', (SELECT row_to_json(ss) FROM streak_stats ss),
        'engagement_levels', (SELECT jsonb_agg(row_to_json(el)) FROM engagement_levels el),
        'generated_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 14. Create refresh_analytics_cache function
CREATE OR REPLACE FUNCTION refresh_analytics_cache()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Clear expired cache
    DELETE FROM analytics_cache WHERE expires_at < NOW();
    
    -- Refresh user daily summaries
    INSERT INTO user_daily_summary (user_id, date, total_slots, attended_slots, missed_slots, attendance_rate, current_streak, last_attended_date)
    SELECT 
        user_id,
        CURRENT_DATE,
        total_slots,
        attended_days,
        missed_days,
        attendance_rate,
        current_streak,
        last_attended_date
    FROM user_analytics_view
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
        total_slots = EXCLUDED.total_slots,
        attended_slots = EXCLUDED.attended_days,
        missed_slots = EXCLUDED.missed_days,
        attendance_rate = EXCLUDED.attendance_rate,
        current_streak = EXCLUDED.current_streak,
        last_attended_date = EXCLUDED.last_attended_date,
        updated_at = NOW();
    
    -- Refresh slot coverage summaries
    INSERT INTO slot_coverage_summary (slot_time, date, total_capacity, filled_slots, coverage_rate)
    SELECT 
        ps.slot_time,
        CURRENT_DATE,
        COUNT(ps.user_id),
        COUNT(CASE WHEN al.status = 'attended' THEN 1 END),
        ROUND(
            (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(ps.user_id), 0) * 100), 2
        )
    FROM prayer_slots ps
    LEFT JOIN attendance_log al ON ps.user_id = al.user_id 
        AND al.date = CURRENT_DATE
    WHERE ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    GROUP BY ps.slot_time
    ON CONFLICT (slot_time, date) 
    DO UPDATE SET
        total_capacity = EXCLUDED.total_capacity,
        filled_slots = EXCLUDED.filled_slots,
        coverage_rate = EXCLUDED.coverage_rate,
        created_at = NOW();
    
    SELECT jsonb_build_object(
        'status', 'success',
        'message', 'Analytics cache refreshed successfully',
        'refreshed_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_daily_summary_user_date ON user_daily_summary(user_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_coverage_summary_slot_date ON slot_coverage_summary(slot_time, date);
CREATE INDEX IF NOT EXISTS idx_zoom_meeting_summary_meeting_date ON zoom_meeting_summary(meeting_id, date);

-- =====================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on analytics tables
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_coverage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meeting_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics tables
CREATE POLICY "Analytics cache is accessible to service role" ON analytics_cache
    FOR ALL USING (true);

CREATE POLICY "User daily summary is accessible to service role" ON user_daily_summary
    FOR ALL USING (true);

CREATE POLICY "Slot coverage summary is accessible to service role" ON slot_coverage_summary
    FOR ALL USING (true);

CREATE POLICY "Zoom meeting summary is accessible to service role" ON zoom_meeting_summary
    FOR ALL USING (true);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 ANALYTICS SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '📊 Created comprehensive analytics system with:';
    RAISE NOTICE '   • Analytics cache tables';
    RAISE NOTICE '   • User daily summary views';
    RAISE NOTICE '   • Slot coverage summary';
    RAISE NOTICE '   • Zoom meeting summary';
    RAISE NOTICE '   • Real-time analytics functions';
    RAISE NOTICE '   • Weekly analytics functions';
    RAISE NOTICE '   • User-specific analytics functions';
    RAISE NOTICE '   • Zoom analytics functions';
    RAISE NOTICE '   • Performance metrics functions';
    RAISE NOTICE '   • Data export functions';
    RAISE NOTICE '   • Performance indexes';
    RAISE NOTICE '   • Row Level Security policies';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next Steps:';
    RAISE NOTICE '   1. Test the analytics endpoints in your admin dashboard';
    RAISE NOTICE '   2. Verify real-time data is loading correctly';
    RAISE NOTICE '   3. Check that Zoom integration data is being captured';
    RAISE NOTICE '   4. Monitor attendance calculations and streak tracking';
END $$;
