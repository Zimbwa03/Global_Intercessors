// Debug script to test prayer slots access with exact same credentials as WhatsApp bot
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debug prayer slots access...');
console.log('URL:', supabaseUrl);
console.log('Service Role Key exists:', !!supabaseServiceRoleKey);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugPrayerSlotsAccess() {
  try {
    console.log('\n🔍 Testing exact query from WhatsApp bot...');
    
    // Exact same query as in the WhatsApp bot
    const { data, error, count } = await supabase
      .from('prayer_slots')
      .select('*', { count: 'exact' });
    
    console.log('\n📊 Query Results:');
    console.log('Count:', count);
    console.log('Data length:', data?.length || 0);
    console.log('Error:', error);
    
    if (data && data.length > 0) {
      console.log('\n✅ Prayer slots found:');
      data.forEach((slot, index) => {
        console.log(`  ${index + 1}. User: ${slot.user_id}, Time: ${slot.slot_time}, Status: ${slot.status}`);
      });
    } else {
      console.log('\n❌ No prayer slots found - investigating...');
      
      // Test table existence
      console.log('\n🔍 Testing table access...');
      const { data: testData, error: testError } = await supabase
        .from('prayer_slots')
        .select('user_id')
        .limit(1);
      
      console.log('Table access test:', { success: !testError, error: testError?.message });
      
      // Check RLS policies
      console.log('\n🔍 Checking RLS status...');
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('pg_tables_info'); // This might not work, just a test
      
      console.log('RLS check:', { error: rlsError?.message });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPrayerSlotsAccess();