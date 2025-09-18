import fetch from 'node-fetch';

async function testReminderSystem() {
    console.log('🧪 Testing Prayer Slot Reminder System');
    console.log('=====================================');
    
    try {
        // Test the reminder system endpoint
        console.log('\n1️⃣ Testing reminder system endpoint...');
        const response = await fetch('http://localhost:5000/api/test-reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Reminder system test completed successfully');
            console.log('📊 Result:', result);
        } else {
            const error = await response.text();
            console.log('❌ Reminder system test failed');
            console.log('📊 Error:', error);
        }
        
    } catch (error) {
        console.log('❌ Error testing reminder system:', error.message);
        console.log('💡 Make sure the server is running on port 5000');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check server logs for detailed reminder activity');
    console.log('2. Verify prayer slots exist in database');
    console.log('3. Ensure WhatsApp users are properly configured');
    console.log('4. Test with actual prayer slot times');
}

testReminderSystem();
