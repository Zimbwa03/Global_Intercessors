import axios from 'axios';

// Test if we can get participant data from your recent meetings
async function testParticipantData() {
  try {
    console.log('🧪 Testing participant data access...');
    
    // Get token first
    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_API_SECRET}`).toString('base64');
    const payload = `grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`;
    
    const tokenResponse = await axios.post('https://zoom.us/oauth/token', payload, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Got access token');
    
    // Test with your recent meeting UUID
    const meetingUuid = 'zaGq3VOWQOeiu7hECX9QPA=='; // From your latest meeting
    
    console.log(`🔍 Testing participant data for meeting: ${meetingUuid}`);
    
    try {
      const participantResponse = await axios.get(
        `https://api.zoom.us/v2/past_meetings/${meetingUuid}/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );
      
      console.log('✅ Participant data successful!');
      console.log('📊 Participants found:', participantResponse.data.participants?.length || 0);
      console.log('📋 Sample participant data:', JSON.stringify(participantResponse.data.participants?.[0], null, 2));
      
    } catch (participantError) {
      console.log('❌ Participant data failed:');
      console.log('Status:', participantError.response?.status);
      console.log('Error:', participantError.response?.data);
      
      if (participantError.response?.status === 404) {
        console.log('💡 404 could mean:');
        console.log('1. Meeting UUID format issue');
        console.log('2. Meeting too old (> 1 month)');
        console.log('3. Meeting not found');
      } else if (participantError.response?.status === 401) {
        console.log('💡 401 means insufficient permissions - need report:read:admin scope');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testParticipantData();