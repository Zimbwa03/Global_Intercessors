
-- Prayer Plan Management System - Supabase SQL Schema
-- This creates all tables needed for the Prayer Planner feature

-- =====================================================
-- 1. PRAYER PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan_date DATE NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    total_points INTEGER DEFAULT 0,
    completed_points INTEGER DEFAULT 0,
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. PRAYER POINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prayer_plan_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notes TEXT,
    category VARCHAR(100) NOT NULL,
    scripture_reference VARCHAR(100),
    scripture_text TEXT,
    is_completed BOOLEAN DEFAULT false,
    order_position INTEGER NOT NULL DEFAULT 1,
    estimated_duration INTEGER DEFAULT 5, -- minutes
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing prayer_points table
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='prayer_plan_id') THEN
        ALTER TABLE prayer_points ADD COLUMN prayer_plan_id UUID NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='title') THEN
        ALTER TABLE prayer_points ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Untitled Prayer Point';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='content') THEN
        ALTER TABLE prayer_points ADD COLUMN content TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='notes') THEN
        ALTER TABLE prayer_points ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='category') THEN
        ALTER TABLE prayer_points ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='scripture_reference') THEN
        ALTER TABLE prayer_points ADD COLUMN scripture_reference VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='scripture_text') THEN
        ALTER TABLE prayer_points ADD COLUMN scripture_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='is_completed') THEN
        ALTER TABLE prayer_points ADD COLUMN is_completed BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='order_position') THEN
        ALTER TABLE prayer_points ADD COLUMN order_position INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='estimated_duration') THEN
        ALTER TABLE prayer_points ADD COLUMN estimated_duration INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='priority_level') THEN
        ALTER TABLE prayer_points ADD COLUMN priority_level VARCHAR(20) DEFAULT 'normal';
        
        -- Add constraint after column is created
        ALTER TABLE prayer_points ADD CONSTRAINT prayer_points_priority_level_check 
        CHECK (priority_level IN ('low', 'normal', 'high', 'urgent'));
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='created_at') THEN
        ALTER TABLE prayer_points ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='prayer_points' AND column_name='updated_at') THEN
        ALTER TABLE prayer_points ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, continue
        NULL;
END $$;

-- =====================================================
-- 3. PRAYER CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color_hex VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'heart',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PRAYER TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    template_data JSONB NOT NULL, -- Contains the prayer points structure
    is_public BOOLEAN DEFAULT false,
    created_by UUID,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PRAYER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prayer_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    prayer_plan_id UUID REFERENCES prayer_plans(id) ON DELETE SET NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER,
    completed_points INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    session_notes TEXT,
    spiritual_insights TEXT,
    answered_prayers TEXT,
    prayer_requests TEXT,
    session_rating INTEGER CHECK (session_rating >= 1 AND session_rating <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. AI PRAYER ASSISTANCE LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_prayer_assistance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    category VARCHAR(100),
    ai_response JSONB NOT NULL,
    was_helpful BOOLEAN,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (After all tables are created)
-- =====================================================
-- Add foreign key constraint for prayer_points -> prayer_plans
DO $$
BEGIN
    -- Check if foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_prayer_points_plan_id' 
        AND table_name = 'prayer_points'
    ) THEN
        ALTER TABLE prayer_points 
        ADD CONSTRAINT fk_prayer_points_plan_id 
        FOREIGN KEY (prayer_plan_id) REFERENCES prayer_plans(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_prayer_plans_user_id ON prayer_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_plans_date ON prayer_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_prayer_plans_category ON prayer_plans(category);
CREATE INDEX IF NOT EXISTS idx_prayer_plans_status ON prayer_plans(status);

CREATE INDEX IF NOT EXISTS idx_prayer_points_plan_id ON prayer_points(prayer_plan_id);
CREATE INDEX IF NOT EXISTS idx_prayer_points_category ON prayer_points(category);
CREATE INDEX IF NOT EXISTS idx_prayer_points_order ON prayer_points(order_position);
CREATE INDEX IF NOT EXISTS idx_prayer_points_completed ON prayer_points(is_completed);

CREATE INDEX IF NOT EXISTS idx_prayer_sessions_user_id ON prayer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_sessions_date ON prayer_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_prayer_sessions_plan_id ON prayer_sessions(prayer_plan_id);

CREATE INDEX IF NOT EXISTS idx_prayer_categories_active ON prayer_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_prayer_categories_order ON prayer_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_prayer_templates_public ON prayer_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_prayer_templates_category ON prayer_templates(category);

CREATE INDEX IF NOT EXISTS idx_ai_assistance_user_id ON ai_prayer_assistance(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistance_date ON ai_prayer_assistance(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE prayer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prayer_assistance ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Prayer Plans Policies
DROP POLICY IF EXISTS "Users can manage their own prayer plans" ON prayer_plans;
CREATE POLICY "Users can manage their own prayer plans" ON prayer_plans
    FOR ALL USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service role can manage all prayer plans" ON prayer_plans;
CREATE POLICY "Service role can manage all prayer plans" ON prayer_plans
    FOR ALL USING (current_setting('role') = 'service_role');

-- Prayer Points Policies
DROP POLICY IF EXISTS "Users can manage prayer points for their plans" ON prayer_points;
CREATE POLICY "Users can manage prayer points for their plans" ON prayer_points
    FOR ALL USING (
        prayer_plan_id IN (
            SELECT id FROM prayer_plans WHERE user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Service role can manage all prayer points" ON prayer_points;
CREATE POLICY "Service role can manage all prayer points" ON prayer_points
    FOR ALL USING (current_setting('role') = 'service_role');

-- Prayer Categories Policies (Public read, admin write)
DROP POLICY IF EXISTS "Anyone can view prayer categories" ON prayer_categories;
CREATE POLICY "Anyone can view prayer categories" ON prayer_categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage prayer categories" ON prayer_categories;
CREATE POLICY "Service role can manage prayer categories" ON prayer_categories
    FOR ALL USING (current_setting('role') = 'service_role');

-- Prayer Templates Policies
DROP POLICY IF EXISTS "Users can view public templates and manage their own" ON prayer_templates;
CREATE POLICY "Users can view public templates and manage their own" ON prayer_templates
    FOR SELECT USING (is_public = true OR created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create their own templates" ON prayer_templates;
CREATE POLICY "Users can create their own templates" ON prayer_templates
    FOR INSERT WITH CHECK (created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own templates" ON prayer_templates;
CREATE POLICY "Users can update their own templates" ON prayer_templates
    FOR UPDATE USING (created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service role can manage all templates" ON prayer_templates;
CREATE POLICY "Service role can manage all templates" ON prayer_templates
    FOR ALL USING (current_setting('role') = 'service_role');

-- Prayer Sessions Policies
DROP POLICY IF EXISTS "Users can manage their own prayer sessions" ON prayer_sessions;
CREATE POLICY "Users can manage their own prayer sessions" ON prayer_sessions
    FOR ALL USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service role can manage all prayer sessions" ON prayer_sessions;
CREATE POLICY "Service role can manage all prayer sessions" ON prayer_sessions
    FOR ALL USING (current_setting('role') = 'service_role');

-- AI Prayer Assistance Policies
DROP POLICY IF EXISTS "Users can manage their own AI assistance logs" ON ai_prayer_assistance;
CREATE POLICY "Users can manage their own AI assistance logs" ON ai_prayer_assistance
    FOR ALL USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service role can manage all AI assistance logs" ON ai_prayer_assistance;
CREATE POLICY "Service role can manage all AI assistance logs" ON ai_prayer_assistance
    FOR ALL USING (current_setting('role') = 'service_role');

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_prayer_plans_updated_at ON prayer_plans;
DROP TRIGGER IF EXISTS update_prayer_points_updated_at ON prayer_points;
DROP TRIGGER IF EXISTS update_prayer_templates_updated_at ON prayer_templates;

-- Create triggers
CREATE TRIGGER update_prayer_plans_updated_at 
    BEFORE UPDATE ON prayer_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_points_updated_at 
    BEFORE UPDATE ON prayer_points 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_templates_updated_at 
    BEFORE UPDATE ON prayer_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER TO UPDATE PRAYER PLAN COUNTS
-- =====================================================
CREATE OR REPLACE FUNCTION update_prayer_plan_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the total_points and completed_points in prayer_plans
    UPDATE prayer_plans 
    SET 
        total_points = (
            SELECT COUNT(*) 
            FROM prayer_points 
            WHERE prayer_plan_id = COALESCE(NEW.prayer_plan_id, OLD.prayer_plan_id)
        ),
        completed_points = (
            SELECT COUNT(*) 
            FROM prayer_points 
            WHERE prayer_plan_id = COALESCE(NEW.prayer_plan_id, OLD.prayer_plan_id)
            AND is_completed = true
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.prayer_plan_id, OLD.prayer_plan_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_plan_counts_trigger ON prayer_points;

-- Create trigger for prayer points changes
CREATE TRIGGER update_plan_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON prayer_points
    FOR EACH ROW EXECUTE FUNCTION update_prayer_plan_counts();

-- =====================================================
-- INSERT DEFAULT PRAYER CATEGORIES
-- =====================================================
INSERT INTO prayer_categories (name, display_name, description, color_hex, icon, sort_order) VALUES
('personal', 'Personal Growth', 'Prayers for personal spiritual development and relationship with God', '#8B5CF6', 'user', 1),
('family', 'Family & Relationships', 'Prayers for family members, relationships, and household harmony', '#F59E0B', 'users', 2),
('healing', 'Healing & Health', 'Prayers for physical, emotional, and spiritual healing', '#10B981', 'heart', 3),
('nation', 'Nation & Government', 'Prayers for national leaders, policies, and societal transformation', '#3B82F6', 'flag', 4),
('church', 'Church & Ministry', 'Prayers for local church, pastors, and ministry effectiveness', '#8B5CF6', 'church', 5),
('missions', 'Missions & Evangelism', 'Prayers for global missions, unreached peoples, and evangelistic efforts', '#F59E0B', 'globe', 6),
('revival', 'Revival & Awakening', 'Prayers for spiritual awakening and revival in communities', '#EF4444', 'zap', 7),
('protection', 'Protection & Safety', 'Prayers for divine protection and safety from harm', '#6366F1', 'shield', 8),
('wisdom', 'Wisdom & Guidance', 'Prayers for divine wisdom and clear direction', '#84CC16', 'lightbulb', 9),
('finance', 'Financial Breakthrough', 'Prayers for financial provision and breakthrough', '#059669', 'dollar-sign', 10),
('deliverance', 'Deliverance & Freedom', 'Prayers for freedom from bondages and spiritual warfare', '#DC2626', 'unlock', 11),
('thanksgiving', 'Thanksgiving & Praise', 'Prayers of gratitude and praise to God', '#F97316', 'heart-handshake', 12)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- INSERT SAMPLE PRAYER TEMPLATES
-- =====================================================
INSERT INTO prayer_templates (name, description, category, template_data, is_public, created_by) VALUES
(
    'Morning Spiritual Foundation',
    'A comprehensive morning prayer template covering personal growth and spiritual foundation',
    'personal',
    '{
        "points": [
            {
                "title": "Gratitude and Praise",
                "content": "Begin by thanking God for His faithfulness through the night and for the gift of a new day. Praise Him for His character - His love, mercy, and grace.",
                "category": "thanksgiving",
                "scripture_reference": "Lamentations 3:22-23",
                "scripture_text": "Because of the Lords great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
                "estimated_duration": 5,
                "priority_level": "high"
            },
            {
                "title": "Personal Surrender",
                "content": "Surrender your day, plans, and desires to God. Ask for His will to be done in your life and for strength to walk in obedience.",
                "category": "personal",
                "scripture_reference": "Proverbs 3:5-6",
                "scripture_text": "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
                "estimated_duration": 7,
                "priority_level": "high"
            },
            {
                "title": "Wisdom for Decisions",
                "content": "Ask God for wisdom in all decisions you will face today. Pray for discernment and clarity in your choices.",
                "category": "wisdom",
                "scripture_reference": "James 1:5",
                "scripture_text": "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.",
                "estimated_duration": 5,
                "priority_level": "normal"
            },
            {
                "title": "Protection and Guidance",
                "content": "Ask for Gods protection over your day and for His guidance in all your interactions and responsibilities.",
                "category": "protection",
                "scripture_reference": "Psalm 91:1-2",
                "scripture_text": "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, He is my refuge and my fortress, my God, in whom I trust.",
                "estimated_duration": 3,
                "priority_level": "normal"
            }
        ]
    }',
    true,
    NULL
),
(
    'Family Blessing and Unity',
    'Focused prayers for family relationships, children, and household harmony',
    'family',
    '{
        "points": [
            {
                "title": "Spouse Relationship",
                "content": "Pray for your marriage relationship - for love, understanding, patience, and unity. Ask God to strengthen your bond and help you serve each other with Christ-like love.",
                "category": "family",
                "scripture_reference": "Ephesians 5:25",
                "scripture_text": "Husbands, love your wives, just as Christ loved the church and gave himself up for her.",
                "estimated_duration": 8,
                "priority_level": "high"
            },
            {
                "title": "Children''s Spiritual Growth",
                "content": "Pray for your children''s spiritual development, protection from negative influences, and for them to develop a genuine relationship with God.",
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
