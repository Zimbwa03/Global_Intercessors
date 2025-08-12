// Direct lookup of user details for +263785494594
import { supabase } from './server/supabase.js';

async function lookupUserDetails() {
  console.log('🔍 LOOKING UP USER DETAILS FOR +263785494594');
  console.log('===============================================');
  
  const phoneNumber = '263785494594';
  
  try {
    // 1. Search user_profiles by phone field
    console.log('\n📞 1. Searching user_profiles by phone field...');
    const { data: profilesByPhone, error: phoneError } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`phone.eq.${phoneNumber},phone.eq.+${phoneNumber},phone.eq.263${phoneNumber.replace('263', '')}`);
    
    console.log(`Found ${profilesByPhone?.length || 0} profiles by phone:`);
    if (profilesByPhone && profilesByPhone.length > 0) {
      profilesByPhone.forEach((profile, index) => {
        console.log(`\nProfile ${index + 1}:`);
        console.log(`  - User ID: ${profile.user_id}`);
        console.log(`  - Name: ${profile.first_name} ${profile.last_name}`);
        console.log(`  - Email: ${profile.email}`);
        console.log(`  - Phone: ${profile.phone}`);
        console.log(`  - Created: ${profile.created_at}`);
      });
    } else {
      console.log('  No profiles found by phone number');
    }
    
    // 2. Check whatsapp_bot_users table
    console.log('\n📱 2. Checking whatsapp_bot_users table...');
    const { data: whatsappUsers, error: whatsappError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', phoneNumber);
    
    console.log(`Found ${whatsappUsers?.length || 0} WhatsApp users:`);
    if (whatsappUsers && whatsappUsers.length > 0) {
      whatsappUsers.forEach((user, index) => {
        console.log(`\nWhatsApp User ${index + 1}:`);
        console.log(`  - User ID: ${user.user_id}`);
        console.log(`  - WhatsApp Number: ${user.whatsapp_number}`);
        console.log(`  - Active: ${user.is_active}`);
        console.log(`  - First Interaction: ${user.first_interaction}`);
      });
    } else {
      console.log('  No WhatsApp users found');
    }
    
    // 3. Check all user_profiles to see what phone numbers exist
    console.log('\n📋 3. Sample of existing phone numbers in user_profiles...');
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, phone, email')
      .limit(10);
    
    console.log(`Sample of ${allProfiles?.length || 0} user profiles:`);
    if (allProfiles && allProfiles.length > 0) {
      allProfiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.first_name} ${profile.last_name} - Phone: ${profile.phone} - Email: ${profile.email}`);
      });
    }
    
    // 4. Check prayer_slots for any user with email containing similar pattern
    console.log('\n🕊️ 4. Checking prayer_slots for related users...');
    const { data: prayerSlots, error: slotsError } = await supabase
      .from('prayer_slots')
      .select('*')
      .eq('status', 'active')
      .limit(5);
    
    console.log(`Sample of ${prayerSlots?.length || 0} active prayer slots:`);
    if (prayerSlots && prayerSlots.length > 0) {
      prayerSlots.forEach((slot, index) => {
        console.log(`  ${index + 1}. User ID: ${slot.user_id} - Email: ${slot.user_email} - Slot: ${slot.slot_time}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Lookup failed:', error.message);
  }
}

lookupUserDetails();