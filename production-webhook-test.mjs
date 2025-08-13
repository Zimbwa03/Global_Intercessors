#!/usr/bin/env node

// Production Webhook Test - Multiple Endpoints

console.log('🚀 Testing Production Webhook Endpoints...\n');

const VERIFY_TOKEN = 'nerdx_verify_token_123';
const BASE_URL = 'https://GlobalIntercession.replit.app';

const endpoints = [
  '/api/webhook',
  '/webhook', 
  '/api/whatsapp/webhook'
];

async function testEndpoint(endpoint) {
  const testUrl = `${BASE_URL}${endpoint}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test_${Date.now()}`;
  
  try {
    console.log(`🔍 Testing: ${endpoint}`);
    const response = await fetch(testUrl);
    const text = await response.text();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`);
    
    const isWorkingWebhook = response.status === 200 && text.startsWith('test_');
    console.log(`   Status: ${isWorkingWebhook ? '✅ WORKING' : '❌ FAILED'}\n`);
    
    return { endpoint, working: isWorkingWebhook, response: text };
    
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ❌ ERROR\n`);
    return { endpoint, working: false, error: error.message };
  }
}

async function runTests() {
  console.log(`🌐 Testing webhooks on: ${BASE_URL}`);
  console.log(`🔑 Using verify token: ${VERIFY_TOKEN}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('📊 **PRODUCTION WEBHOOK TEST RESULTS:**\n');
  
  const workingEndpoints = results.filter(r => r.working);
  
  if (workingEndpoints.length > 0) {
    console.log('✅ **WORKING ENDPOINTS:**');
    workingEndpoints.forEach(r => {
      console.log(`   ${BASE_URL}${r.endpoint}`);
    });
    console.log('\n🎯 **RECOMMENDED FOR META CONFIGURATION:**');
    console.log(`   Webhook URL: ${BASE_URL}${workingEndpoints[0].endpoint}`);
    console.log(`   Verify Token: ${VERIFY_TOKEN}`);
    console.log('   Events: messages, message_reads');
  } else {
    console.log('❌ **NO WORKING ENDPOINTS FOUND**');
    console.log('   All endpoints returned HTML instead of webhook response');
    console.log('   This indicates a production routing issue');
  }
  
  console.log('\n🔧 **TROUBLESHOOTING:**');
  if (workingEndpoints.length === 0) {
    console.log('   • Production environment may be serving static files');
    console.log('   • Try /api/webhook as it should bypass static routing');
    console.log('   • Check if development server is accessible from Meta');
  } else {
    console.log('   • Webhook is production ready!');
    console.log('   • Use the working endpoint in Meta Business Manager');
  }
}

runTests().catch(console.error);