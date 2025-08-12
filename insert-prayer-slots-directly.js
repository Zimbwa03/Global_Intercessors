// Insert prayer slots directly using the app's Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY, 
  { auth: { autoRefreshToken: false, persistSession: false }}
);

async function insertPrayerSlotsDirectly() {
  console.log('🔧 Inserting prayer slots directly into the app database...');
  
  try {
    // Insert prayer slots data
    const prayerSlotsData = [
      { user_id: 'auth_user_00001', user_email: 'sarah.johnson@globalintercessors.org', slot_time: '00:00', status: 'active' },
      { user_id: 'auth_user_00002', user_email: 'david.chen@globalintercessors.org', slot_time: '04:00', status: 'active' },
      { user_id: 'auth_user_00003', user_email: 'maria.santos@globalintercessors.org', slot_time: '08:00', status: 'active' },
      { user_id: 'auth_user_00004', user_email: 'emmanuel.okafor@globalintercessors.org', slot_time: '12:00', status: 'active' },
      { user_id: 'auth_user_00005', user_email: 'anna.kowalski@globalintercessors.org', slot_time: '16:00', status: 'active' },
      { user_id: 'auth_user_00006', user_email: 'john.smith@globalintercessors.org', slot_time: '20:00', status: 'active' }
    ];

    console.log('📊 Inserting prayer slots...');
    const { data: prayerResult, error: prayerError } = await supabase
      .from('prayer_slots')
      .upsert(prayerSlotsData);

    if (prayerError) {
      console.error('❌ Prayer slots insertion error:', prayerError);
    } else {
      console.log('✅ Prayer slots inserted successfully');
    }

    // Insert WhatsApp bot user
    const whatsappData = {
      user_id: 'auth_user_00001',
      whatsapp_number: '263785494594',
      is_active: true,
      reminder_preferences: { reminderTiming: "30min", enabled: true }
    };

    console.log('📱 Inserting WhatsApp bot user...');
    const { data: whatsappResult, error: whatsappError } = await supabase
      .from('whatsapp_bot_users')
      .upsert([whatsappData]);

    if (whatsappError) {
      console.error('❌ WhatsApp user insertion error:', whatsappError);
    } else {
      console.log('✅ WhatsApp bot user inserted successfully');
    }

    // Verify the insertions
    console.log('\n🔍 Verifying insertions...');
    const { count: finalCount } = await supabase
      .from('prayer_slots')
      .select('*', { count: 'exact', head: true });

    const { count: whatsappCount } = await supabase
      .from('whatsapp_bot_users')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Final verification:');
    console.log('Prayer slots count:', finalCount);
    console.log('WhatsApp users count:', whatsappCount);

    if (finalCount > 0) {
      console.log('🎉 SUCCESS! Prayer slots are now available for WhatsApp bot!');
    }

  } catch (error) {
    console.error('❌ Direct insertion failed:', error);
  }
}

insertPrayerSlotsDirectly();