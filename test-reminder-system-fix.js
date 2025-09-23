// Test script to verify reminder system database fixes
// Run with: node test-reminder-system-fix.js

const { createClient } = require('@supabase/supabase-js');

class ReminderSystemTester {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );
  }

  async testDatabaseFunctions() {
    console.log('🧪 Testing Reminder System Database Fixes...\n');

    try {
      // Test 1: Test the database functions exist and work
      console.log('📋 Test 1: Testing database functions...');
      
      // Test get_active_slots_for_reminders function
      console.log('🔍 Testing get_active_slots_for_reminders()...');
      const { data: slotsData, error: slotsError } = await this.supabase
        .rpc('get_active_slots_for_reminders');

      if (slotsError) {
        console.error('❌ Error calling get_active_slots_for_reminders:', slotsError);
        if (slotsError.code === '42883') {
          console.log('💡 The function does not exist. Run fix-reminder-system-database.sql first!');
        }
      } else {
        console.log(`✅ get_active_slots_for_reminders returned ${slotsData?.length || 0} slots`);
        if (slotsData && slotsData.length > 0) {
          console.log('📄 Sample slot data:', JSON.stringify(slotsData[0], null, 2));
        }
      }

      // Test get_whatsapp_users_with_slots function
      console.log('\n🔍 Testing get_whatsapp_users_with_slots()...');
      const { data: whatsappData, error: whatsappError } = await this.supabase
        .rpc('get_whatsapp_users_with_slots');

      if (whatsappError) {
        console.error('❌ Error calling get_whatsapp_users_with_slots:', whatsappError);
        if (whatsappError.code === '42883') {
          console.log('💡 The function does not exist. Run fix-reminder-system-database.sql first!');
        }
      } else {
        console.log(`✅ get_whatsapp_users_with_slots returned ${whatsappData?.length || 0} records`);
        if (whatsappData && whatsappData.length > 0) {
          console.log('📄 Sample WhatsApp data:', JSON.stringify(whatsappData[0], null, 2));
        }
      }

      // Test 2: Test the view exists and works
      console.log('\n📋 Test 2: Testing prayer_slots_with_user_details view...');
      const { data: viewData, error: viewError } = await this.supabase
        .from('prayer_slots_with_user_details')
        .select('*')
        .limit(5);

      if (viewError) {
        console.error('❌ Error querying view:', viewError);
        if (viewError.code === '42P01') {
          console.log('💡 The view does not exist. Run fix-reminder-system-database.sql first!');
        }
      } else {
        console.log(`✅ prayer_slots_with_user_details view returned ${viewData?.length || 0} records`);
        if (viewData && viewData.length > 0) {
          console.log('📄 Sample view data:', JSON.stringify(viewData[0], null, 2));
        }
      }

      // Test 3: Check individual table queries
      console.log('\n📋 Test 3: Testing individual table access...');
      
      const { data: slots, error: slotsErr } = await this.supabase
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active')
        .limit(3);

      console.log(`🎯 Prayer slots: ${slots?.length || 0} records, Error: ${slotsErr?.message || 'None'}`);

      const { data: profiles, error: profilesErr } = await this.supabase
        .from('user_profiles')
        .select('*')
        .limit(3);

      console.log(`👥 User profiles: ${profiles?.length || 0} records, Error: ${profilesErr?.message || 'None'}`);

      const { data: whatsapp, error: whatsappErr } = await this.supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('is_active', true)
        .limit(3);

      console.log(`📱 WhatsApp users: ${whatsapp?.length || 0} records, Error: ${whatsappErr?.message || 'None'}`);

      // Test 4: Test the old problematic join queries that should now fail gracefully
      console.log('\n📋 Test 4: Testing old problematic join queries (should fail)...');
      
      const { data: badJoinData, error: badJoinError } = await this.supabase
        .from('prayer_slots')
        .select(`
          *,
          user_profiles!inner(full_name, phone_number)
        `)
        .eq('status', 'active')
        .limit(1);

      if (badJoinError) {
        console.log('✅ Old join query properly failed with error:', badJoinError.message);
        console.log('💡 This confirms the reminder system won\'t use broken joins anymore');
      } else {
        console.log('⚠️ Old join query unexpectedly succeeded');
        console.log('🔧 This might indicate foreign keys were properly created');
      }

      console.log('\n🎯 Summary:');
      console.log('- Database functions:', slotsError ? '❌' : '✅');
      console.log('- View access:', viewError ? '❌' : '✅');
      console.log('- Individual table access:', (slotsErr || profilesErr || whatsappErr) ? '❌' : '✅');
      
      if (!slotsError && !whatsappError && !viewError) {
        console.log('\n🎉 All tests passed! Reminder system should work properly now.');
      } else {
        console.log('\n⚠️ Some tests failed. Please run fix-reminder-system-database.sql');
      }

    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error);
    }
  }

  async testReminderLogic() {
    console.log('\n🧪 Testing Reminder Logic...\n');

    try {
      // Simulate what the reminder system does
      const { data: activeSlots, error } = await this.supabase
        .rpc('get_active_slots_for_reminders');

      if (error) {
        console.error('❌ Cannot test reminder logic - database function failed');
        return;
      }

      console.log(`📊 Found ${activeSlots?.length || 0} slots for reminder processing`);

      if (activeSlots && activeSlots.length > 0) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        
        console.log(`⏰ Current time: ${currentTime}`);
        
        for (const slot of activeSlots.slice(0, 3)) { // Test first 3 slots
          console.log(`\n🎯 Processing slot: ${slot.user_email} at ${slot.slot_time}`);
          
          // Parse slot time
          const slotTimeStr = slot.slot_time?.split('–')[0] || slot.slot_time;
          if (slotTimeStr) {
            const [slotHour, slotMinute] = slotTimeStr.split(':').map(Number);
            
            // Calculate 30-minute reminder time
            const reminderTime = new Date();
            reminderTime.setHours(slotHour, slotMinute - 30, 0, 0);
            
            console.log(`  📅 Slot time: ${slotTimeStr}`);
            console.log(`  ⏰ Reminder time: ${reminderTime.toTimeString().slice(0, 5)}`);
            console.log(`  📱 WhatsApp: ${slot.whatsapp_number || 'Not available'}`);
            console.log(`  👤 User: ${slot.full_name || 'Anonymous'}`);
            
            // Check if it's reminder time
            const reminderTimeStr = reminderTime.toTimeString().slice(0, 5);
            if (currentTime === reminderTimeStr) {
              console.log(`  🔔 REMINDER DUE NOW for ${slot.full_name}!`);
            } else {
              console.log(`  ⏳ Next reminder in: ${this.calculateTimeDiff(currentTime, reminderTimeStr)} minutes`);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Reminder logic test failed:', error);
    }
  }

  calculateTimeDiff(currentTime, targetTime) {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [targetHour, targetMin] = targetTime.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMin;
    const targetMinutes = targetHour * 60 + targetMin;
    
    let diff = targetMinutes - currentMinutes;
    if (diff < 0) diff += 1440; // Next day
    
    return diff;
  }

  async runAllTests() {
    console.log('🚀 Starting Reminder System Fix Tests...\n');
    
    await this.testDatabaseFunctions();
    await this.testReminderLogic();
    
    console.log('\n✨ Testing complete!');
  }
}

// Check if environment variables are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.log('❌ Missing environment variables:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_ANON_KEY');
  console.log('\nPlease set these before running tests.');
  process.exit(1);
}

// Run the tests
const tester = new ReminderSystemTester();
tester.runAllTests();


