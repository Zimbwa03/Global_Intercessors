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
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
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
    console.log('🚀 Starting Analytics System Setup...');
    console.log('📊 Setting up comprehensive analytics system for Global Intercessors');
    
    try {
        // Read the SQL files
        console.log('\n📖 Reading SQL files...');
        const analyticsSystemSQL = fs.readFileSync('create-analytics-system.sql', 'utf8');
        const enhancedAnalyticsSQL = fs.readFileSync('enhanced-analytics-api.sql', 'utf8');
        
        console.log('✅ SQL files read successfully');
        
        // Execute create-analytics-system.sql
        const analyticsSuccess = await executeSQL(analyticsSystemSQL, 'Creating Analytics System Tables and Functions');
        
        if (!analyticsSuccess) {
            console.error('❌ Failed to create analytics system. Stopping execution.');
            return;
        }
        
        // Execute enhanced-analytics-api.sql
        const enhancedSuccess = await executeSQL(enhancedAnalyticsSQL, 'Creating Enhanced Analytics API Functions');
        
        if (!enhancedSuccess) {
            console.error('❌ Failed to create enhanced analytics API. Stopping execution.');
            return;
        }
        
        console.log('\n🎉 Analytics System Setup Complete!');
        console.log('📊 The following components have been created:');
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
        
    } catch (error) {
        console.error('❌ Fatal error during setup:', error.message);
    }
}

main().catch(console.error);
