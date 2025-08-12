const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAuthenticationFlow() {
  console.log('🔍 Testing WhatsApp Bot Authentication Flow');
  console.log('==========================================');
  
  try {
    // First check the whatsapp_bot_users table structure
    console.log('\n📋 Checking whatsapp_bot_users table structure...');
    const { data: tableStructure, error: structureError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error checking table structure:', structureError);
      
      // Try to check if table exists
      console.log('\n🔍 Checking if whatsapp_bot_users table exists...');
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names');
      
      if (tablesError) {
        console.log('📝 Creating whatsapp_bot_users table...');
        const { error: createError } = await supabase.rpc('create_whatsapp_bot_users_table');
        if (createError) {
          console.error('❌ Error creating table:', createError);
        }
      }
    } else {
      console.log('✅ whatsapp_bot_users table accessible');
      console.log('Sample structure:', tableStructure);
    }
    
    // Test authentication with known credentials
    console.log('\n🔐 Testing authentication for known user...');
    const testPhone = '263785494594';
    
    // Check if record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', testPhone)
      .single();
    
    console.log('Existing user check:', { 
      exists: !checkError, 
      user: existingUser, 
      error: checkError?.message 
    });
    
    // Test upsert operation
    console.log('\n💾 Testing upsert operation...');
    const testUserId = 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f';
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('whatsapp_bot_users')
      .upsert({
        user_id: testUserId,
        whatsapp_number: testPhone,
        is_active: true,
        timezone: 'UTC',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'whatsapp_number'
      })
      .select();
    
    if (upsertError) {
      console.error('❌ Upsert error:', upsertError);
      console.error('Error details:', JSON.stringify(upsertError, null, 2));
      
      // Try manual insert/update approach
      console.log('\n🔄 Trying manual approach...');
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', testPhone)
        .single();
      
      if (existing) {
        console.log('📝 Updating existing record...');
        const { data: updateData, error: updateError } = await supabase
          .from('whatsapp_bot_users')
          .update({
            user_id: testUserId,
            is_active: true,
            timezone: 'UTC',
            updated_at: new Date().toISOString()
          })
          .eq('whatsapp_number', testPhone)
          .select();
        
        if (updateError) {
          console.error('❌ Update error:', updateError);
        } else {
          console.log('✅ Update successful:', updateData);
        }
      } else {
        console.log('📝 Inserting new record...');
        const { data: insertData, error: insertError } = await supabase
          .from('whatsapp_bot_users')
          .insert({
            user_id: testUserId,
            whatsapp_number: testPhone,
            is_active: true,
            timezone: 'UTC',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
        
        if (insertError) {
          console.error('❌ Insert error:', insertError);
        } else {
          console.log('✅ Insert successful:', insertData);
        }
      }
    } else {
      console.log('✅ Upsert successful:', upsertData);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const { data: finalUser, error: finalError } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', testPhone)
      .single();
    
    if (finalError) {
      console.error('❌ Final verification failed:', finalError);
    } else {
      console.log('✅ Final verification successful:', finalUser);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthenticationFlow();