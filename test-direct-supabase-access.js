// Test direct Supabase access after RLS fix
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase access after RLS fix...');
console.log('URL:', supabaseUrl);
console.log('Service Role Key length:', supabaseServiceRoleKey?.length || 0);

// Create fresh client
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDirectAccess() {
  try {
    console.log('\n🔍 Testing prayer_slots access with fresh client...');
    
    // Test with different query methods
    console.log('\n1. Simple select count:');
    const { count: simpleCount, error: simpleError } = await supabase
      .from('prayer_slots')
      .select('*', { count: 'exact', head: true });
    console.log('Simple count result:', { count: simpleCount, error: simpleError?.message });
    
    console.log('\n2. Full select with count:');
    const { data: fullData, count: fullCount, error: fullError } = await supabase
      .from('prayer_slots')
      .select('*', { count: 'exact' });
    console.log('Full select result:', { 
      count: fullCount, 
      dataLength: fullData?.length || 0, 
      error: fullError?.message,
      firstRow: fullData?.[0]
    });
    
    console.log('\n3. Test without count:');
    const { data: dataOnly, error: dataError } = await supabase
      .from('prayer_slots')
      .select('*');
    console.log('Data only result:', { 
      dataLength: dataOnly?.length || 0, 
      error: dataError?.message,
      firstRow: dataOnly?.[0]
    });
    
    if (fullData && fullData.length > 0) {
      console.log('\n✅ SUCCESS! Prayer slots detected:');
      fullData.forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.user_id} at ${slot.slot_time} (${slot.status})`);
      });
    } else {
      console.log('\n❌ Still no data found - investigating further...');
      
      // Check if table exists and has data via raw SQL
      console.log('\n4. Raw table check:');
      const { data: rawData, error: rawError } = await supabase
        .rpc('get_prayer_slots_count') // This won't work but let's see error
        .single();
      console.log('Raw check error (expected):', rawError?.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectAccess();