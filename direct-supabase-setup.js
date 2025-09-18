const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLDirect(sqlQuery) {
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });
        if (error) {
            throw error;
        }
        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function main() {
    console.log('🚀 Setting up Analytics System in Supabase...');
    
    try {
        // Read the complete SQL file
        const sqlContent = fs.readFileSync('complete-analytics-setup.sql', 'utf8');
        
        // Split into major sections and execute
        const sections = [
            {
                name: 'Core Tables',
                sql: sqlContent.split('-- 6. Create function to calculate current streak')[0]
            },
            {
                name: 'Current Streak Function',
                sql: sqlContent.split('-- 6. Create function to calculate current streak')[1].split('-- 7. Create weekly analytics function')[0]
            },
            {
                name: 'Weekly Analytics Function',
                sql: sqlContent.split('-- 7. Create weekly analytics function')[1].split('-- 8. Create get_realtime_analytics_data function')[0]
            },
            {
                name: 'Real-time Analytics Function',
                sql: sqlContent.split('-- 8. Create get_realtime_analytics_data function')[1].split('-- 9. Create get_weekly_analytics_data function')[0]
            },
            {
                name: 'Weekly Analytics Data Function',
                sql: sqlContent.split('-- 9. Create get_weekly_analytics_data function')[1].split('-- 10. Create get_user_analytics_data function')[0]
            },
            {
                name: 'User Analytics Data Function',
                sql: sqlContent.split('-- 10. Create get_user_analytics_data function')[1].split('-- 11. Create get_zoom_analytics_data function')[0]
            },
            {
                name: 'Zoom Analytics Data Function',
                sql: sqlContent.split('-- 11. Create get_zoom_analytics_data function')[1].split('-- 12. Create get_slot_analytics_data function')[0]
            },
            {
                name: 'Slot Analytics Data Function',
                sql: sqlContent.split('-- 12. Create get_slot_analytics_data function')[1].split('-- 13. Create get_performance_metrics function')[0]
            },
            {
                name: 'Performance Metrics Function',
                sql: sqlContent.split('-- 13. Create get_performance_metrics function')[1].split('-- 14. Create refresh_analytics_cache function')[0]
            },
            {
                name: 'Refresh Cache Function',
                sql: sqlContent.split('-- 14. Create refresh_analytics_cache function')[1].split('-- =====================================================')[0]
            },
            {
                name: 'Indexes and RLS',
                sql: sqlContent.split('-- =====================================================\n-- PART 3: CREATE INDEXES FOR PERFORMANCE')[1]
            }
        ];
        
        let totalSuccess = 0;
        let totalErrors = 0;
        
        for (const section of sections) {
            console.log(`\n🔄 Executing ${section.name}...`);
            
            const result = await executeSQLDirect(section.sql);
            if (result.success) {
                console.log(`✅ ${section.name} - Success`);
                totalSuccess++;
            } else {
                console.log(`❌ ${section.name} - Error: ${result.error}`);
                totalErrors++;
            }
        }
        
        console.log(`\n📊 Execution Summary:`);
        console.log(`   ✅ Successful: ${totalSuccess}`);
        console.log(`   ❌ Errors: ${totalErrors}`);
        
        if (totalSuccess > 0) {
            console.log('\n🎉 Analytics System Setup Complete!');
            console.log('Your admin dashboard should now have full analytics functionality.');
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    }
}

main().catch(console.error);


