import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalyticsSetup() {
    console.log('🧪 Testing Analytics System Setup...');
    
    try {
        // Test if the analytics functions exist
        console.log('🔄 Testing get_realtime_analytics_data function...');
        const { data: realtimeData, error: realtimeError } = await supabase.rpc('get_realtime_analytics_data');
        
        if (realtimeError) {
            console.log('❌ get_realtime_analytics_data error:', realtimeError.message);
        } else {
            console.log('✅ get_realtime_analytics_data function exists and works!');
            console.log('📊 Real-time data:', realtimeData);
        }
        
        // Test if the analytics tables exist
        console.log('\n🔄 Testing analytics tables...');
        const { data: tables, error: tablesError } = await supabase
            .from('analytics_cache')
            .select('*')
            .limit(1);
        
        if (tablesError) {
            console.log('❌ analytics_cache table error:', tablesError.message);
        } else {
            console.log('✅ analytics_cache table exists!');
        }
        
        // Test user analytics view
        console.log('\n🔄 Testing user_analytics_view...');
        const { data: viewData, error: viewError } = await supabase
            .from('user_analytics_view')
            .select('*')
            .limit(1);
        
        if (viewError) {
            console.log('❌ user_analytics_view error:', viewError.message);
        } else {
            console.log('✅ user_analytics_view exists!');
        }
        
        console.log('\n🎉 Analytics system test completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testAnalyticsSetup();


