// Test Ngonidzashe Zimbwa's user data retrieval
import { supabase } from './server/supabase.js';

async function testNgoniData() {
  console.log('🎯 TESTING NGONIDZASHE ZIMBWA DATA RETRIEVAL');
  console.log('===========================================');
  
  const phoneNumber = '263785494594';
  const userId = 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f';
  
  try {
    // 1. Get user profile directly by user_id
    console.log('\n👤 1. Getting Ngonidzashe profile by user_id...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profile) {
      console.log('✅ Profile found:');
      console.log(`  Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`  Email: ${profile.email}`);
      console.log(`  Phone: ${profile.phone}`);
      console.log(`  User ID: ${profile.user_id}`);
    } else {
      console.log('❌ Profile not found:', profileError?.message);
    }
    
    // 2. Get prayer slot for this user
    console.log('\n🕊️ 2. Getting prayer slot for Ngonidzashe...');
    const { data: slot, error: slotError } = await supabase
      .from('prayer_slots')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (slot) {
      console.log('✅ Prayer slot found:');
      console.log(`  Slot Time: ${slot.slot_time}`);
      console.log(`  Status: ${slot.status}`);
      console.log(`  Email: ${slot.user_email}`);
    } else {
      console.log('❌ Prayer slot not found:', slotError?.message);
    }
    
    // 3. Expected welcome message
    console.log('\n🎉 3. Expected WhatsApp Welcome Message:');
    if (profile) {
      const name = `${profile.first_name} ${profile.last_name}`;
      const slotInfo = slot ? `Your current prayer slot: ${slot.slot_time}` : 'Prayer slot: Not assigned yet';
      
      console.log('┌────────────────────────────────────────────────┐');
      console.log('│              EXPECTED WELCOME MESSAGE          │');
      console.log('├────────────────────────────────────────────────┤');
      console.log(`│ 🙏 Hello, ${name}!`);
      console.log(`│ ⏱ ${slotInfo}`);
      console.log('│');
      console.log('│ Welcome to your spiritual companion! 🌟');
      console.log('│ Choose what you\'d like to explore:');
      console.log('│');
      console.log('│ [📖 Devotionals] [🧠 Bible Quiz]');
      console.log('│ [⏰ Reminders] [📢 Updates]');
      console.log('│ [💬 Messages] [📊 Dashboard]');
      console.log('└────────────────────────────────────────────────┘');
    }
    
    console.log('\n✅ Data retrieval test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNgoniData();