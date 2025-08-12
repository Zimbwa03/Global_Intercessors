// Test script to trace user lookup process for WhatsApp +263785494594
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.DATABASE_URL?.includes('supabase') 
  ? process.env.DATABASE_URL.split('//')[1].split('@')[1].split(':')[0]
  : 'lmhbvdxainxcjuveisfe.supabase.co';

const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your_anon_key_here';
const supabase = createClient(`https://${supabaseUrl}`, supabaseKey);

async function traceUserLookup() {
  console.log('🔍 TRACING USER LOOKUP FOR +263785494594');
  console.log('===============================================');
  
  const phoneNumber = '263785494594';
  console.log(`📱 Testing WhatsApp number: ${phoneNumber}`);
  
  try {
    // Step 1: Check whatsapp_bot_users table
    console.log('\n📋 Step 1: Query whatsapp_bot_users table');
    const { data: botUser, error: botUserError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', phoneNumber);
    
    console.log('Result:', { 
      success: !botUserError, 
      count: botUser?.length || 0,
      data: botUser,
      error: botUserError?.message 
    });
    
    if (botUser && botUser.length > 0) {
      const userId = botUser[0].user_id;
      console.log(`✅ Found user_id: ${userId}`);
      
      // Step 2: Check user_profiles table
      console.log('\n👤 Step 2: Query user_profiles table');
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);
      
      console.log('Result:', { 
        success: !profileError, 
        count: userProfile?.length || 0,
        data: userProfile,
        error: profileError?.message 
      });
      
      // Step 3: Check prayer_slots table
      console.log('\n🕊️ Step 3: Query prayer_slots table');
      const { data: prayerSlot, error: slotError } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      console.log('Result:', { 
        success: !slotError, 
        count: prayerSlot?.length || 0,
        data: prayerSlot,
        error: slotError?.message 
      });
      
      // Step 4: Build user information
      console.log('\n🎯 Step 4: Build complete user information');
      if (userProfile && userProfile.length > 0) {
        const profile = userProfile[0];
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        console.log(`Name: "${name}" (from first_name: "${profile.first_name}", last_name: "${profile.last_name}")`);
      } else {
        console.log('Name: "Beloved Intercessor" (fallback - no profile found)');
      }
      
      if (prayerSlot && prayerSlot.length > 0) {
        const slot = prayerSlot[0];
        console.log(`Prayer slot: "${slot.slot_time}" (status: ${slot.status})`);
      } else {
        console.log('Prayer slot: Not assigned (no active slot found)');
      }
      
    } else {
      console.log('❌ No WhatsApp user found for this number');
    }
    
  } catch (error) {
    console.error('❌ Error during lookup:', error.message);
  }
}

// Run the trace
traceUserLookup();