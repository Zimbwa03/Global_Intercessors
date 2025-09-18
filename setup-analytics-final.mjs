import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sqlQuery) {
    try {
        console.log('🔄 Executing SQL in Supabase...');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });
        if (error) {
            console.error('❌ SQL Error:', error.message);
            return false;
        }
        console.log('✅ SQL executed successfully');
        return true;
    } catch (err) {
        console.error('❌ Execution Error:', err.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting Supabase Analytics Setup...');
    console.log('📊 Setting up complete analytics system...');
    
    try {
        // Read the SQL file
        console.log('📖 Reading complete-analytics-setup.sql...');
        const sqlContent = readFileSync('complete-analytics-setup.sql', 'utf8');
        console.log(`✅ SQL file loaded (${sqlContent.length} characters)`);
        
        // Execute the SQL
        console.log('🔄 Executing analytics setup...');
        const success = await executeSQL(sqlContent);
        
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
            
            console.log('\n🔧 Your admin dashboard now has full analytics functionality!');
            console.log('   • Real-time attendance tracking');
            console.log('   • Zoom integration analytics');
            console.log('   • User performance monitoring');
            console.log('   • Weekly performance reports');
            
        } else {
            console.log('❌ Some errors occurred during setup');
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    }
}

main().catch(console.error);


