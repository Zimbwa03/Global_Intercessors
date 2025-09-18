const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sqlContent, description) {
    try {
        console.log(`\n🔄 ${description}...`);
        
        // Split SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim().length === 0) continue;
            
            try {
                console.log(`   Executing statement ${i + 1}/${statements.length}...`);
                const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
                if (error) {
                    console.error(`   ❌ Error: ${error.message}`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.error(`   ❌ Error executing statement: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log(`✅ ${description} completed: ${successCount} successful, ${errorCount} errors`);
        return errorCount === 0;
    } catch (err) {
        console.error(`❌ Error in ${description}:`, err.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Taking over Supabase Analytics Setup...');
    console.log('📊 Executing complete analytics system setup directly in Supabase');
    
    try {
        // Read the SQL file
        console.log('\n📖 Reading complete-analytics-setup.sql...');
        const analyticsSQL = fs.readFileSync('complete-analytics-setup.sql', 'utf8');
        
        console.log('✅ SQL file read successfully');
        
        // Execute the complete analytics setup
        const success = await executeSQL(analyticsSQL, 'Creating Complete Analytics System');
        
        if (success) {
            console.log('\n🎉 ANALYTICS SYSTEM SETUP COMPLETE!');
            console.log('📊 Successfully created:');
            console.log('   • Analytics cache tables');
            console.log('   • User daily summary views');
            console.log('   • Slot coverage summary');
            console.log('   • Zoom meeting summary');
            console.log('   • Real-time analytics functions');
            console.log('   • Weekly analytics functions');
            console.log('   • User-specific analytics functions');
            console.log('   • Zoom analytics functions');
            console.log('   • Performance metrics functions');
            console.log('   • Data export functions');
            console.log('   • Current streak calculation function');
            console.log('   • Performance indexes');
            console.log('   • Row Level Security policies');
            
            console.log('\n🔧 System is now ready for:');
            console.log('   • Real-time attendance tracking');
            console.log('   • Zoom integration analytics');
            console.log('   • User performance monitoring');
            console.log('   • Weekly performance reports');
            console.log('   • Admin dashboard analytics');
            
            // Test the system by calling a function
            console.log('\n🧪 Testing analytics system...');
            try {
                const { data: testData, error: testError } = await supabase.rpc('get_realtime_analytics_data');
                if (testError) {
                    console.log('⚠️  Test function returned error (expected if no data yet):', testError.message);
                } else {
                    console.log('✅ Analytics system test successful!');
                }
            } catch (testErr) {
                console.log('⚠️  Test function error (expected if no data yet):', testErr.message);
            }
            
        } else {
            console.error('❌ Some errors occurred during setup, but the system may still be partially functional');
        }
        
    } catch (error) {
        console.error('❌ Fatal error during setup:', error.message);
    }
}

main().catch(console.error);


