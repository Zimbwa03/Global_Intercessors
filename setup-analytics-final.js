const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sqlQuery) {
    try {
        console.log('Executing SQL...');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });
        if (error) {
            console.error('SQL Error:', error);
            return false;
        }
        console.log('SQL executed successfully');
        return true;
    } catch (err) {
        console.error('Execution Error:', err.message);
        return false;
    }
}

async function main() {
    console.log('Starting Supabase Analytics Setup...');
    
    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync('complete-analytics-setup.sql', 'utf8');
        console.log('SQL file loaded, length:', sqlContent.length);
        
        // Execute the SQL
        const success = await executeSQL(sqlContent);
        
        if (success) {
            console.log('✅ Analytics system setup completed successfully!');
        } else {
            console.log('❌ Some errors occurred during setup');
        }
        
    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

main().catch(console.error);


