import { readFileSync } from 'fs';

// Import the server's database connection
import { createClient } from '@supabase/supabase-js';

// Supabase connection using the same setup as the server
const supabaseUrl = process.env.SUPABASE_URL || 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeAnalyticsSetup() {
    try {
        console.log('🚀 Starting Analytics System Setup...');
        console.log('📊 Executing complete analytics system in Supabase...');
        
        // Read the SQL file
        const sqlContent = readFileSync('complete-analytics-setup.sql', 'utf8');
        console.log(`✅ SQL file loaded (${sqlContent.length} characters)`);
        
        // Execute the SQL directly
        console.log('🔄 Executing analytics setup...');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
        
        if (error) {
            console.error('❌ Error executing SQL:', error.message);
            return false;
        }
        
        console.log('✅ SQL executed successfully');
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
        
        return true;
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        return false;
    }
}

// Run the setup
executeAnalyticsSetup().then(success => {
    if (success) {
        console.log('\n✅ Analytics setup completed successfully!');
        process.exit(0);
    } else {
        console.log('\n❌ Analytics setup failed!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});