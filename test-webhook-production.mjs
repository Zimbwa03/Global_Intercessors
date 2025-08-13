#!/usr/bin/env node

// Test WhatsApp Webhook in Production Environment

console.log('🔍 Testing WhatsApp Webhook Production Setup...\n');

const WEBHOOK_URL = 'https://GlobalIntercession.replit.app/webhook';
const VERIFY_TOKEN = 'nerdx_verify_token_123';

// Test GET verification (what Meta uses)
async function testWebhookVerification() {
  console.log('🔐 Testing Webhook Verification (GET)...');
  
  const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=production_test_12345`;
  
  try {
    const response = await fetch(verifyUrl);
    const text = await response.text();
    
    console.log(`   Status Code: ${response.status}`);
    console.log(`   Response: ${text}`);
    console.log(`   Expected: production_test_12345`);
    console.log(`   Match: ${text.trim() === 'production_test_12345' ? '✅ YES' : '❌ NO'}`);
    
    if (response.status === 200 && text.trim() === 'production_test_12345') {
      console.log('✅ Webhook verification: WORKING\n');
      return true;
    } else {
      console.log('❌ Webhook verification: FAILED\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ Webhook verification error: ${error.message}\n`);
    return false;
  }
}

// Test POST message handling (what Meta uses for messages)
async function testWebhookMessage() {
  console.log('📱 Testing Webhook Message Handling (POST)...');
  
  const testMessage = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test_entry',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          messages: [{
            from: '1234567890',
            id: 'test_message_id',
            timestamp: Date.now().toString(),
            text: { body: 'test message' },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    const text = await response.text();
    
    console.log(`   Status Code: ${response.status}`);
    console.log(`   Response: ${text.substring(0, 100)}...`);
    
    if (response.status === 200) {
      console.log('✅ Webhook message handling: ACCESSIBLE\n');
      return true;
    } else {
      console.log('❌ Webhook message handling: FAILED\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ Webhook message error: ${error.message}\n`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log(`🌐 Testing webhook at: ${WEBHOOK_URL}`);
  console.log(`🔑 Using verify token: ${VERIFY_TOKEN}\n`);
  
  const verificationResult = await testWebhookVerification();
  const messageResult = await testWebhookMessage();
  
  console.log('📊 **Test Summary:**');
  console.log(`   Verification (GET): ${verificationResult ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Message Handling (POST): ${messageResult ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (verificationResult && messageResult) {
    console.log('\n🎉 **WEBHOOK STATUS: READY FOR META CONFIGURATION**');
    console.log('\n📋 **Meta Configuration Details:**');
    console.log(`   Webhook URL: ${WEBHOOK_URL}`);
    console.log(`   Verify Token: ${VERIFY_TOKEN}`);
    console.log('   Events: messages, message_reads');
  } else {
    console.log('\n⚠️ **WEBHOOK STATUS: NEEDS ATTENTION**');
    console.log('   Check server configuration and routing');
  }
}

runTests().catch(console.error);