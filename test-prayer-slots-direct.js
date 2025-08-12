// Direct test of prayer_slots access using service role
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing direct prayer_slots access...');
console.log('URL:', supabaseUrl);
console.log('Service Role Key exists:', !!supabaseServiceRoleKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPrayerSlotsAccess() {
  try {
    console.log('\n📊 Testing prayer_slots table access...');
    
    const { data, error, count } = await supabaseAdmin
      .from('prayer_slots')
      .select('*', { count: 'exact' });
    
    console.log('\n✅ Prayer Slots Results:');
    console.log('Count:', count);
    console.log('Data length:', data?.length || 0);
    console.log('Error:', error);
    console.log('Sample data:', data?.[0]);
    
    // Also check what tables exist
    console.log('\n🔍 Checking all tables in database...');
    const { data: userProfiles } = await supabaseAdmin.from('user_profiles').select('*').limit(3);
    const { data: whatsappUsers } = await supabaseAdmin.from('whatsapp_bot_users').select('*').limit(3);
    
    console.log('User profiles found:', userProfiles?.length || 0);
    console.log('WhatsApp bot users found:', whatsappUsers?.length || 0);
    
    // Try alternative table names
    console.log('\n🔍 Checking for alternative table names...');
    try {
      const { data: prayerSessions } = await supabaseAdmin.from('prayer_sessions').select('*').limit(3);
      console.log('Prayer sessions found:', prayerSessions?.length || 0);
    } catch (e) {
      console.log('No prayer_sessions table');
    }
    
    try {
      const { data: intercessionSlots } = await supabaseAdmin.from('intercession_slots').select('*').limit(3);
      console.log('Intercession slots found:', intercessionSlots?.length || 0);
    } catch (e) {
      console.log('No intercession_slots table');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPrayerSlotsAccess();