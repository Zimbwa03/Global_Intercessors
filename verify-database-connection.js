// Verify which database the app is actually connecting to
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Database Connection Verification');
console.log('================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SERVICE_ROLE_KEY (first 20 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
console.log('PROJECT_ID from URL:', process.env.SUPABASE_URL?.split('.')[0]?.split('//')[1]);

// Create client
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY, 
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function verifyConnection() {
  try {
    console.log('\n🔍 Testing Basic Connection...');
    
    // Test 1: Check if we can access any table
    const { data: tableTest, error: tableError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    console.log('Basic connection test:', { 
      success: !tableError, 
      error: tableError?.message 
    });
    
    // Test 2: List all tables using information_schema
    console.log('\n📊 Checking Available Tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tables) {
      console.log('Available tables:', tables.map(t => t.table_name).sort());
    } else {
      console.log('Could not list tables:', tablesError?.message);
    }
    
    // Test 3: Direct prayer_slots check with error details
    console.log('\n🔍 Direct Prayer Slots Check...');
    const { data: prayerData, error: prayerError, count } = await supabase
      .from('prayer_slots')
      .select('*', { count: 'exact' });
    
    console.log('Prayer slots query:', {
      count: count,
      dataLength: prayerData?.length || 0,
      error: prayerError,
      hasData: !!prayerData?.length
    });
    
    if (prayerData?.length > 0) {
      console.log('Sample prayer slot:', prayerData[0]);
    }
    
    // Test 4: Check all other tables for any data
    console.log('\n📊 Checking Other Tables for Data...');
    const tablesToCheck = ['whatsapp_bot_users', 'user_profiles', 'admin_users'];
    
    for (const table of tablesToCheck) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`${table}: ${count || 0} rows`);
      } catch (e) {
        console.log(`${table}: Error - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyConnection();