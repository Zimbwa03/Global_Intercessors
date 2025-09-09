// Test direct user lookup using the WhatsApp bot's actual functions
import { whatsAppBot } from './server/services/whatsapp-bot-v2.js';

async function testUserLookupDirect() {
  console.log('🧪 Testing Direct User Lookup for WhatsApp +263789117038');
  console.log('===========================================================');
  
  try {
    const testPhone = '263789117038';
    console.log(`📱 Testing with WhatsApp number: ${testPhone}`);
    console.log('');
    
    // Simulate the "start" command processing
    console.log('🔄 Simulating WhatsApp "start" command...');
    await whatsAppBot.handleIncomingMessage(testPhone, 'start', 'test_lookup_001');
    
    console.log('');
    console.log('✅ Test completed - check console logs for user data retrieval details');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUserLookupDirect();