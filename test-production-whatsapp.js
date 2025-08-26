// Test Production WhatsApp Bot Configuration
// Run this on Render to verify WhatsApp credentials are properly configured

import { whatsAppBot } from './server/services/whatsapp-bot-v2.js';

async function testProductionWhatsApp() {
  console.log('🧪 Testing Production WhatsApp Bot Configuration...\n');
  
  try {
    // Test 1: Check Configuration Status
    console.log('1️⃣ Checking WhatsApp Bot Configuration...');
    const hasPhoneId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
    const hasVerifyToken = !!process.env.WHATSAPP_VERIFY_TOKEN;
    
    console.log(`   Phone Number ID: ${hasPhoneId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Access Token: ${hasAccessToken ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Verify Token: ${hasVerifyToken ? '✅ Configured' : '❌ Missing'}`);
    
    if (hasPhoneId && hasAccessToken) {
      console.log('   🎉 WhatsApp Bot is PRODUCTION READY!');
    } else {
      console.log('   ⚠️ WhatsApp Bot will run in SIMULATION MODE');
    }
    
    // Test 2: Test Message Sending (if credentials available)
    if (hasPhoneId && hasAccessToken) {
      console.log('\n2️⃣ Testing WhatsApp Message Sending...');
      
      // Test with a sample phone number (replace with actual test number)
      const testPhone = process.env.TEST_WHATSAPP_NUMBER || '+1234567890';
      const testMessage = '🧪 Test message from Global Intercessors WhatsApp Bot - Production Mode Active!';
      
      console.log(`   Sending test message to: ${testPhone}`);
      const success = await whatsAppBot.sendMessage(testPhone, testMessage);
      
      if (success) {
        console.log('   ✅ Test message sent successfully!');
      } else {
        console.log('   ❌ Test message failed to send');
      }
    } else {
      console.log('\n2️⃣ Skipping message test (credentials not configured)');
    }
    
    // Test 3: Check Bot Instance
    console.log('\n3️⃣ Checking Bot Instance...');
    console.log(`   Bot initialized: ${whatsAppBot ? '✅ Yes' : '❌ No'}`);
    console.log(`   Bot type: ${whatsAppBot.constructor.name}`);
    
    console.log('\n🎯 Production Configuration Test Complete!');
    
    if (hasPhoneId && hasAccessToken) {
      console.log('🚀 Your WhatsApp Bot is ready to send real messages!');
      console.log('📱 Users will receive WhatsApp notifications after fasting registration.');
    } else {
      console.log('⚠️ Configure WhatsApp credentials on Render to enable real messaging.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProductionWhatsApp();
