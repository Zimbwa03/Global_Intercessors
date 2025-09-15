-- Enhanced Analytics API Endpoints
-- This SQL script creates additional functions for comprehensive analytics

-- 1. Create detailed user analytics function
CREATE OR REPLACE FUNCTION get_user_analytics_detailed(user_email_param TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_summary', (
            SELECT jsonb_build_object(
                'user_id', ps.user_id,
                'user_email', ps.user_email,
                'slot_time', ps.slot_time,
                'slot_status', ps.status,
                'missed_count', ps.missed_count,
                'slot_created_at', ps.created_at,
                'slot_updated_at', ps.updated_at
            )
            FROM prayer_slots ps
            WHERE (user_email_param IS NULL OR ps.user_email = user_email_param)
            ORDER BY ps.created_at DESC
            LIMIT 1
        ),
        'attendance_history', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', al.date,
                    'status', al.status,
                    'join_time', al.zoom_join_time,
                    'leave_time', al.zoom_leave_time,
                    'duration_minutes', EXTRACT(EPOCH FROM (al.zoom_leave_time - al.zoom_join_time))/60,
                    'meeting_id', al.zoom_meeting_id
                )
            )
            FROM attendance_log al
            JOIN prayer_slots ps ON al.user_id = ps.user_id
            WHERE (user_email_param IS NULL OR ps.user_email = user_email_param)
            ORDER BY al.date DESC
            LIMIT 30
        ),
        'performance_metrics', (
            SELECT jsonb_build_object(
                'total_days', COUNT(*),
                'attended_days', COUNT(CASE WHEN al.status = 'attended' THEN 1 END),
                'missed_days', COUNT(CASE WHEN al.status = 'missed' THEN 1 END),
                'attendance_rate', ROUND(
                    (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                ),
                'current_streak', COALESCE((
                    WITH RECURSIVE streak_calc AS (
                        SELECT date, status, 1 as streak
                        FROM attendance_log al2
                        JOIN prayer_slots ps2 ON al2.user_id = ps2.user_id
                        WHERE (user_email_param IS NULL OR ps2.user_email = user_email_param)
                        ORDER BY al2.date DESC 
                        LIMIT 1
                        
                        UNION ALL
                        
                        SELECT al2.date, al2.status, 
                            CASE WHEN al2.status = 'attended' THEN sc.streak + 1 ELSE 0 END
                        FROM attendance_log al2
                        JOIN prayer_slots ps2 ON al2.user_id = ps2.user_id
                        JOIN streak_calc sc ON al2.date = sc.date - INTERVAL '1 day'
                        WHERE (user_email_param IS NULL OR ps2.user_email = user_email_param)
                    )
                    SELECT MAX(streak) FROM streak_calc WHERE status = 'attended'
                ), 0),
                'last_attended', MAX(CASE WHEN al.status = 'attended' THEN al.date END),
                'avg_duration_minutes', AVG(EXTRACT(EPOCH FROM (al.zoom_leave_time - al.zoom_join_time))/60)
            )
            FROM attendance_log al
            JOIN prayer_slots ps ON al.user_id = ps.user_id
            WHERE (user_email_param IS NULL OR ps.user_email = user_email_param)
        ),
        'weekly_breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'week_start', week_start,
                    'week_end', week_end,
                    'attended_days', attended_days,
                    'missed_days', missed_days,
                    'attendance_rate', attendance_rate
                )
            )
            FROM (
                SELECT 
                    DATE_TRUNC('week', al.date)::DATE as week_start,
                    (DATE_TRUNC('week', al.date) + INTERVAL '6 days')::DATE as week_end,
                    COUNT(CASE WHEN al.status = 'attended' THEN 1 END) as attended_days,
                    COUNT(CASE WHEN al.status = 'missed' THEN 1 END) as missed_days,
                    ROUND(
                        (COUNT(CASE WHEN al.status = 'attended' THEN 1 END)::FLOAT / 
                         NULLIF(COUNT(*), 0) * 100), 2
                    ) as attendance_rate
                FROM attendance_log al
                JOIN prayer_slots ps ON al.user_id = ps.user_id
                WHERE (user_email_param IS NULL OR ps.user_email = user_email_param)
                AND al.date >= CURRENT_DATE - INTERVAL '12 weeks'
                GROUP BY DATE_TRUNC('week', al.date)
                ORDER BY week_start DESC
            ) weekly_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Create Zoom meeting detailed analytics
CREATE OR REPLACE FUNCTION get_zoom_meeting_analytics_detailed()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'meeting_summary', (
            SELECT jsonb_build_object(
                'total_meetings', COUNT(*),
                'total_participants', SUM(participant_count),
                'avg_participants_per_meeting', ROUND(AVG(participant_count), 2),
                'avg_duration_minutes', ROUND(AVG(duration), 2),
                'processed_meetings', COUNT(CASE WHEN processed = true THEN 1 END),
                'unprocessed_meetings', COUNT(CASE WHEN processed = false THEN 1 END),
                'processing_rate', ROUND(
                    (COUNT(CASE WHEN processed = true THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                )
            )
            FROM zoom_meetings 
            WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'daily_meetings', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', meeting_date,
                    'meetings_count', meetings_count,
                    'total_participants', total_participants,
                    'avg_participants', avg_participants,
                    'avg_duration', avg_duration,
                    'processed_count', processed_count
                )
            )
            FROM (
                SELECT 
                    start_time::DATE as meeting_date,
                    COUNT(*) as meetings_count,
                    SUM(participant_count) as total_participants,
                    ROUND(AVG(participant_count), 2) as avg_participants,
                    ROUND(AVG(duration), 2) as avg_duration,
                    COUNT(CASE WHEN processed = true THEN 1 END) as processed_count
                FROM zoom_meetings 
                WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY start_time::DATE
                ORDER BY meeting_date DESC
            ) daily_meetings
        ),
        'recent_meetings', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'meeting_id', meeting_id,
                    'topic', topic,
                    'start_time', start_time,
                    'end_time', end_time,
                    'duration', duration,
                    'participant_count', participant_count,
                    'processed', processed,
                    'zoom_link', zoom_link
                )
            )
            FROM zoom_meetings 
            WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY start_time DESC
            LIMIT 20
        ),
        'hourly_distribution', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'hour', hour,
                    'meetings_count', meetings_count,
                    'total_participants', total_participants
                )
            )
            FROM (
                SELECT 
                    EXTRACT(HOUR FROM start_time) as hour,
                    COUNT(*) as meetings_count,
                    SUM(participant_count) as total_participants
                FROM zoom_meetings 
                WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY EXTRACT(HOUR FROM start_time)
                ORDER BY hour
            ) hourly_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Create prayer slot coverage analytics
CREATE OR REPLACE FUNCTION get_prayer_slot_coverage_analytics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'coverage_summary', (
            SELECT jsonb_build_object(
                'total_slots', COUNT(*),
                'active_slots', COUNT(CASE WHEN status = 'active' THEN 1 END),
                'inactive_slots', COUNT(CASE WHEN status = 'inactive' THEN 1 END),
                'coverage_rate', ROUND(
                    (COUNT(CASE WHEN status = 'active' THEN 1 END)::FLOAT / 
                     NULLIF(COUNT(*), 0) * 100), 2
                ),
                'avg_missed_count', ROUND(AVG(missed_count), 2)
            )
            FROM prayer_slots
        ),
        'slot_time_distribution', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'slot_time', slot_time,
                    'total_slots', total_slots,
                    'active_slots', active_slots,
                    'inactive_slots', inactive_slots,
                    'coverage_rate', coverage_rate,
                    'avg_missed_count', avg_missed_count
                )
            )
            FROM (
                SELECT 
                    slot_time,
                    COUNT(*) as total_slots,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_slots,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_slots,
                    ROUND(
                        (COUNT(CASE WHEN status = 'active' THEN 1 END)::FLOAT / 
                         NULLIF(COUNT(*), 0) * 100), 2
                    ) as coverage_rate,
                    ROUND(AVG(missed_count), 2) as avg_missed_count
                FROM prayer_slots
                GROUP BY slot_time
                ORDER BY slot_time
            ) slot_distribution
        ),
        'daily_coverage', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', coverage_date,
                    'total_slots', total_slots,
                    'active_slots', active_slots,
                    'coverage_rate', coverage_rate
                )
            )
            FROM (
                SELECT 
                    created_at::DATE as coverage_date,
                    COUNT(*) as total_slots,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_slots,
                    ROUND(
                        (COUNT(CASE WHEN status = 'active' THEN 1 END)::FLOAT / 
                         NULLIF(COUNT(*), 0) * 100), 2
                    ) as coverage_rate
                FROM prayer_slots
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY created_at::DATE
                ORDER BY coverage_date DESC
            ) daily_coverage
        ),
        'user_slot_assignments', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_email', user_email,
                    'slot_time', slot_time,
                    'status', status,
                    'missed_count', missed_count,
                    'created_at', created_at,
                    'last_attended', last_attended
                )
            )
            FROM (
                SELECT 
                    ps.user_email,
                    ps.slot_time,
                    ps.status,
                    ps.missed_count,
                    ps.created_at,
                    MAX(CASE WHEN al.status = 'attended' THEN al.date END) as last_attended
                FROM prayer_slots ps
                LEFT JOIN attendance_log al ON ps.user_id = al.user_id
                GROUP BY ps.user_email, ps.slot_time, ps.status, ps.missed_count, ps.created_at
                ORDER BY ps.created_at DESC
            ) user_assignments
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Create comprehensive analytics dashboard function
CREATE OR REPLACE FUNCTION get_comprehensive_analytics_dashboard()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'realtime_data', get_realtime_dashboard_data(),
        'weekly_analytics', get_weekly_analytics(),
        'user_analytics', get_user_analytics_detailed(),
        'zoom_analytics', get_zoom_meeting_analytics_detailed(),
        'slot_coverage', get_prayer_slot_coverage_analytics(),
        'system_health', (
            SELECT jsonb_build_object(
                'database_size', pg_size_pretty(pg_database_size(current_database())),
                'attendance_records_count', (SELECT COUNT(*) FROM attendance_log),
                'prayer_slots_count', (SELECT COUNT(*) FROM prayer_slots),
                'zoom_meetings_count', (SELECT COUNT(*) FROM zoom_meetings),
                'last_analytics_refresh', (
                    SELECT MAX(updated_at) 
                    FROM analytics_summary 
                    WHERE metric_type = 'realtime_dashboard'
                ),
                'cache_status', (
                    SELECT jsonb_build_object(
                        'cached_metrics', COUNT(*),
                        'oldest_cache', MIN(created_at),
                        'newest_cache', MAX(created_at)
                    )
                    FROM analytics_summary
                )
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Create analytics export function
CREATE OR REPLACE FUNCTION export_analytics_data(export_type TEXT DEFAULT 'all')
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    CASE export_type
        WHEN 'attendance' THEN
            SELECT jsonb_build_object(
                'export_type', 'attendance',
                'timestamp', NOW(),
                'data', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'user_id', al.user_id,
                            'user_email', ps.user_email,
                            'date', al.date,
                            'status', al.status,
                            'join_time', al.zoom_join_time,
                            'leave_time', al.zoom_leave_time,
                            'duration_minutes', EXTRACT(EPOCH FROM (al.zoom_leave_time - al.zoom_join_time))/60,
                            'meeting_id', al.zoom_meeting_id,
                            'created_at', al.created_at
                        )
                    )
                    FROM attendance_log al
                    LEFT JOIN prayer_slots ps ON al.user_id = ps.user_id
                    ORDER BY al.created_at DESC
                )
            ) INTO result;
            
        WHEN 'zoom_meetings' THEN
            SELECT jsonb_build_object(
                'export_type', 'zoom_meetings',
                'timestamp', NOW(),
                'data', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'meeting_id', meeting_id,
                            'meeting_uuid', meeting_uuid,
                            'topic', topic,
                            'start_time', start_time,
                            'end_time', end_time,
                            'duration', duration,
                            'participant_count', participant_count,
                            'processed', processed,
                            'zoom_link', zoom_link,
                            'created_at', created_at
                        )
                    )
                    FROM zoom_meetings
                    ORDER BY start_time DESC
                )
            ) INTO result;
            
        WHEN 'prayer_slots' THEN
            SELECT jsonb_build_object(
                'export_type', 'prayer_slots',
                'timestamp', NOW(),
                'data', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'user_id', user_id,
                            'user_email', user_email,
                            'slot_time', slot_time,
                            'status', status,
                            'missed_count', missed_count,
                            'created_at', created_at,
                            'updated_at', updated_at
                        )
                    )
                    FROM prayer_slots
                    ORDER BY created_at DESC
                )
            ) INTO result;
            
        ELSE
            SELECT get_comprehensive_analytics_dashboard() INTO result;
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Create analytics performance monitoring function
CREATE OR REPLACE FUNCTION get_analytics_performance_metrics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'performance_metrics', (
            SELECT jsonb_build_object(
                'query_performance', jsonb_build_object(
                    'attendance_query_time', 'N/A', -- Would need to measure actual query time
                    'zoom_query_time', 'N/A',
                    'slots_query_time', 'N/A'
                ),
                'cache_performance', (
                    SELECT jsonb_build_object(
                        'cache_hit_rate', 'N/A', -- Would need cache hit tracking
                        'cache_size_mb', ROUND(pg_total_relation_size('analytics_summary') / 1024.0 / 1024.0, 2),
                        'cache_entries', COUNT(*)
                    )
                    FROM analytics_summary
                ),
                'database_metrics', (
                    SELECT jsonb_build_object(
                        'total_size_mb', ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2),
                        'connection_count', (
                            SELECT count(*) 
                            FROM pg_stat_activity 
                            WHERE state = 'active'
                        ),
                        'last_vacuum', (
                            SELECT last_vacuum 
                            FROM pg_stat_user_tables 
                            WHERE relname = 'attendance_log'
                        ),
                        'last_analyze', (
                            SELECT last_analyze 
                            FROM pg_stat_user_tables 
                            WHERE relname = 'attendance_log'
                        )
                    )
                )
            )
        ),
        'system_status', jsonb_build_object(
            'analytics_system', 'operational',
            'cache_system', 'operational',
            'real_time_updates', 'enabled',
            'last_refresh', (
                SELECT MAX(updated_at) 
                FROM analytics_summary
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Enhanced analytics API functions created successfully!' as status;

