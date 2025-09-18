import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Direct Supabase connection
const supabaseUrl = 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU2NzQ4MCwiZXhwIjoyMDUwMTQzNDgwfQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🚀 Executing Analytics Setup in Supabase...');
    
    try {
        // Read the SQL file
        const sqlContent = readFileSync('complete-analytics-setup.sql', 'utf8');
        console.log(`📖 SQL file loaded (${sqlContent.length} characters)`);
        
        // Execute the SQL
        console.log('🔄 Executing SQL...');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
        
        if (error) {
            console.error('❌ SQL Error:', error.message);
            console.error('Error details:', error);
            return;
        }
        
        console.log('✅ SQL executed successfully!');
        console.log('📊 Analytics system created in Supabase');
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    }
}

main();


