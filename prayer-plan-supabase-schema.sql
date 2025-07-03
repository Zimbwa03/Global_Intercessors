ray for your children''s spiritual development, protection from negative influences, and for them to develop a genuine relationship with God.",
                "category": "family",
                "scripture_reference": "Deuteronomy 6:6-7",
                "scripture_text": "These commandments that I give you today are to be on your hearts. Impress them on your children. Talk about them when you sit at home and when you walk along the road.",
                "estimated_duration": 10,
                "priority_level": "high"
            },
            {
                "title": "Extended Family Relationships",
                "content": "Pray for parents, siblings, and extended family members. Ask for healing in broken relationships and for opportunities to share Gods love.",
                "category": "family",
                "scripture_reference": "1 John 4:7",
                "scripture_text": "Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God.",
                "estimated_duration": 5,
                "priority_level": "normal"
            },
            {
                "title": "Household Peace and Provision",
                "content": "Pray for peace in your home, financial provision for your family''s needs, and for your home to be a place of Gods presence.",
                "category": "family",
                "scripture_reference": "Joshua 24:15",
                "scripture_text": "But as for me and my household, we will serve the Lord.",
                "estimated_duration": 7,
                "priority_level": "normal"
            }
        ]
    }',
    true,
    NULL
),
(
    'National and Government Intercession',
    'Comprehensive prayers for national leadership, policies, and societal transformation',
    'nation',
    '{
        "points": [
            {
                "title": "National Leaders",
                "content": "Pray for your nations president, prime minister, and top government officials. Ask for wisdom in their decisions and for them to seek Gods guidance.",
                "category": "nation",
                "scripture_reference": "1 Timothy 2:1-2",
                "scripture_text": "I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people—for kings and all those in authority, that we may live peaceful and quiet lives in all godliness and holiness.",
                "estimated_duration": 8,
                "priority_level": "high"
            },
            {
                "title": "Justice System",
                "content": "Pray for judges, lawyers, and law enforcement. Ask for justice to prevail and for corruption to be exposed and dealt with appropriately.",
                "category": "nation",
                "scripture_reference": "Isaiah 1:17",
                "scripture_text": "Learn to do right; seek justice. Defend the oppressed. Take up the cause of the fatherless; plead the case of the widow.",
                "estimated_duration": 6,
                "priority_level": "high"
            },
            {
                "title": "Economic Stability",
                "content": "Pray for your nations economy, for job creation, fair wages, and for Gods blessing on honest business practices.",
                "category": "nation",
                "scripture_reference": "Jeremiah 29:7",
                "scripture_text": "Also, seek the peace and prosperity of the city to which I have carried you into exile. Pray to the Lord for it, because if it prospers, you too will prosper.",
                "estimated_duration": 5,
                "priority_level": "normal"
            },
            {
                "title": "Moral and Spiritual Revival",
                "content": "Pray for a return to biblical values in society, for the protection of religious freedom, and for spiritual awakening across the nation.",
                "category": "revival",
                "scripture_reference": "2 Chronicles 7:14",
                "scripture_text": "If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land.",
                "estimated_duration": 10,
                "priority_level": "high"
            }
        ]
    }',
    true,
    NULL
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- USEFUL FUNCTIONS FOR PRAYER PLAN MANAGEMENT
-- =====================================================

-- Function to create a prayer plan from template
CREATE OR REPLACE FUNCTION create_prayer_plan_from_template(
    p_user_id UUID,
    p_template_id UUID,
    p_plan_date DATE,
    p_custom_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_rec record;
    new_plan_id UUID;
    point_data jsonb;
    point_record jsonb;
BEGIN
    -- Get template data
    SELECT * INTO template_rec FROM prayer_templates WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Create new prayer plan
    INSERT INTO prayer_plans (user_id, title, description, plan_date, category)
    VALUES (
        p_user_id,
        COALESCE(p_custom_title, template_rec.name),
        template_rec.description,
        p_plan_date,
        template_rec.category
    )
    RETURNING id INTO new_plan_id;
    
    -- Create prayer points from template
    FOR point_record IN SELECT * FROM jsonb_array_elements(template_rec.template_data->'points')
    LOOP
        INSERT INTO prayer_points (
            prayer_plan_id,
            title,
            content,
            category,
            scripture_reference,
            scripture_text,
            estimated_duration,
            priority_level,
            order_position
        ) VALUES (
            new_plan_id,
            point_record->>'title',
            point_record->>'content',
            point_record->>'category',
            point_record->>'scripture_reference',
            point_record->>'scripture_text',
            COALESCE((point_record->>'estimated_duration')::integer, 5),
            COALESCE(point_record->>'priority_level', 'normal'),
            (SELECT COALESCE(MAX(order_position), 0) + 1 FROM prayer_points WHERE prayer_plan_id = new_plan_id)
        );
    END LOOP;
    
    -- Update template usage count
    UPDATE prayer_templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
    
    RETURN new_plan_id;
END;
$$;

-- Function to get user's prayer plan for a specific date
CREATE OR REPLACE FUNCTION get_user_prayer_plan(
    p_user_id UUID,
    p_date DATE
)
RETURNS TABLE(
    plan_id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    status VARCHAR,
    total_points INTEGER,
    completed_points INTEGER,
    prayer_points JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.total_points,
        pp.completed_points,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', pt.id,
                    'title', pt.title,
                    'content', pt.content,
                    'notes', pt.notes,
                    'category', pt.category,
                    'scripture_reference', pt.scripture_reference,
                    'scripture_text', pt.scripture_text,
                    'is_completed', pt.is_completed,
                    'order_position', pt.order_position,
                    'estimated_duration', pt.estimated_duration,
                    'priority_level', pt.priority_level
                ) ORDER BY pt.order_position
            )
            FROM prayer_points pt
            WHERE pt.prayer_plan_id = pp.id), '[]'::jsonb
        ) as prayer_points
    FROM prayer_plans pp
    WHERE pp.user_id = p_user_id 
    AND pp.plan_date = p_date
    AND pp.status = 'active'
    ORDER BY pp.created_at DESC
    LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_prayer_plan_from_template(UUID, UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_prayer_plan_from_template(UUID, UUID, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_prayer_plan(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_prayer_plan(UUID, DATE) TO service_role;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON prayer_plans TO authenticated, service_role;
GRANT ALL ON prayer_points TO authenticated, service_role;
GRANT ALL ON prayer_categories TO authenticated, service_role;
GRANT ALL ON prayer_templates TO authenticated, service_role;
GRANT ALL ON prayer_sessions TO authenticated, service_role;
GRANT ALL ON ai_prayer_assistance TO authenticated, service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- Prayer Plan database schema created successfully!
-- This includes:
-- - prayer_plans: Main prayer plan records
-- - prayer_points: Individual prayer items within plans
-- - prayer_categories: Categories for organizing prayers
-- - prayer_templates: Reusable prayer plan templates
-- - prayer_sessions: Records of completed prayer sessions
-- - ai_prayer_assistance: Log of AI-generated prayer assistance
-- 
-- Key features:
-- ✅ Full RLS security implementation
-- ✅ Automatic counting triggers
-- ✅ Sample categories and templates
-- ✅ Helper functions for template usage
-- ✅ Comprehensive indexing for performance
-- ✅ All necessary relationships and constraints
