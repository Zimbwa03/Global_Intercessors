// Direct database check for user +263785494594
import { supabase } from './server/supabase.js';

async function checkUserDataDirect() {
  console.log('🔍 DIRECT DATABASE CHECK FOR +263785494594');
  console.log('==============================================');
  
  const phoneNumber = '263785494594';
  
  try {
    console.log('\n📱 1. Checking whatsapp_bot_users table...');
    const { data: botUsers, error: botError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', phoneNumber);
    
    console.log(`Found ${botUsers?.length || 0} WhatsApp bot users:`);
    if (botUsers && botUsers.length > 0) {
      botUsers.forEach(user => {
        console.log(`  - User ID: ${user.user_id}`);
        console.log(`  - WhatsApp: ${user.whatsapp_number}`);
        console.log(`  - Active: ${user.is_active}`);
        console.log(`  - Created: ${user.created_at}`);
      });
      
      const userId = botUsers[0].user_id;
      
      console.log('\n👤 2. Checking user_profiles table...');
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);
      
      console.log(`Found ${profiles?.length || 0} user profiles:`);
      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          console.log(`  - First Name: "${profile.first_name}"`);
          console.log(`  - Last Name: "${profile.last_name}"`);
          console.log(`  - Email: ${profile.email}`);
          console.log(`  - User ID: ${profile.user_id}`);
        });
      } else {
        console.log('  ❌ No user profile found for this user_id');
      }
      
      console.log('\n🕊️ 3. Checking prayer_slots table...');
      const { data: slots, error: slotError } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      console.log(`Found ${slots?.length || 0} active prayer slots:`);
      if (slots && slots.length > 0) {
        slots.forEach(slot => {
          console.log(`  - Slot Time: "${slot.slot_time}"`);
          console.log(`  - Status: ${slot.status}`);
          console.log(`  - User Email: ${slot.user_email}`);
          console.log(`  - Missed Count: ${slot.missed_count}`);
        });
      } else {
        console.log('  ❌ No active prayer slot found for this user_id');
      }
      
    } else {
      console.log('❌ No WhatsApp bot user found for this number');
      
      // Let's check if there's any data in these tables
      console.log('\n📊 Checking table contents...');
      
      const { data: allBotUsers, error: allBotError } = await supabase
        .from('whatsapp_bot_users')
        .select('whatsapp_number, user_id')
        .limit(5);
      
      console.log(`Total WhatsApp bot users in database: ${allBotUsers?.length || 0}`);
      if (allBotUsers && allBotUsers.length > 0) {
        console.log('Sample WhatsApp numbers:');
        allBotUsers.forEach(user => {
          console.log(`  - ${user.whatsapp_number} → ${user.user_id}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkUserDataDirect();