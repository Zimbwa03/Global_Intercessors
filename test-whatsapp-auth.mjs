import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAuthenticationFlow() {
  console.log('🔍 Testing WhatsApp Bot Authentication Flow');
  console.log('==========================================');
  
  try {
    const testPhone = '263789117038';
    const testUserId = 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f';
    
    // Test the new simplified upsert approach
    console.log('\n📝 Testing new authentication linking approach...');
    
    const { data: existingRecord, error: checkError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', testPhone)
      .single();

    console.log('Existing record check:', { 
      exists: !checkError, 
      user: existingRecord, 
      error: checkError?.message 
    });

    let upsertError = null;
    
    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('whatsapp_bot_users')
        .update({
          user_id: testUserId,
          is_active: true,
          timezone: 'UTC',
          updated_at: new Date().toISOString()
        })
        .eq('whatsapp_number', testPhone);
      upsertError = updateError;
      console.log('✅ Updated existing record');
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('whatsapp_bot_users')
        .insert({
          user_id: testUserId,
          whatsapp_number: testPhone,
          is_active: true,
          timezone: 'UTC',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      upsertError = insertError;
      console.log('✅ Inserted new record');
    }
    
    if (upsertError) {
      console.error('❌ Upsert error:', upsertError);
    } else {
      console.log('✅ Authentication linking successful!');
    }
    
    // Verify final state
    const { data: finalUser, error: finalError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', testPhone)
      .single();
    
    if (finalError) {
      console.error('❌ Final verification failed:', finalError);
    } else {
      console.log('✅ Final verification successful:');
      console.log(`   User ID: ${finalUser.user_id}`);
      console.log(`   WhatsApp: ${finalUser.whatsapp_number}`);
      console.log(`   Active: ${finalUser.is_active}`);
      console.log(`   Updated: ${finalUser.updated_at}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthenticationFlow();