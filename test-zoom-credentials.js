// Test script for Zoom credentials and API access
// Run with: node test-zoom-credentials.js

const axios = require('axios');

class ZoomCredentialTester {
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_API_SECRET || '';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
  }

  async testCredentials() {
    console.log('🔧 Testing Zoom Credentials...\n');
    
    // Check if credentials are set
    console.log('📋 Credential Check:');
    console.log(`Client ID: ${this.clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`Client Secret: ${this.clientSecret ? '✅ Set' : '❌ Missing'}`);
    console.log(`Account ID: ${this.accountId ? '✅ Set' : '❌ Missing'}\n`);

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      console.log('❌ Missing credentials! Please set:');
      console.log('- ZOOM_CLIENT_ID');
      console.log('- ZOOM_API_SECRET');
      console.log('- ZOOM_ACCOUNT_ID');
      return;
    }

    try {
      // Test 1: Get Access Token
      console.log('🔐 Test 1: Getting Access Token...');
      const token = await this.getAccessToken();
      console.log('✅ Access token obtained successfully\n');

      // Test 2: Get User Info
      console.log('👤 Test 2: Getting User Info...');
      await this.getUserInfo(token);

      // Test 3: Get Recent Meetings
      console.log('📅 Test 3: Getting Recent Meetings...');
      await this.getRecentMeetings(token);

      // Test 4: Test Past Meetings (if available)
      console.log('📊 Test 4: Getting Past Meetings...');
      await this.getPastMeetings(token);

      console.log('\n🎉 All tests passed! Your Zoom integration is ready to use.');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      
      if (error.response?.status === 400 && error.response?.data?.error === 'invalid_client') {
        console.log('\n💡 This usually means:');
        console.log('1. Client ID or Client Secret is incorrect');
        console.log('2. The app is not published/activated in Zoom');
        console.log('3. Wrong app type (should be Server-to-Server OAuth)');
      }
      
      if (error.response?.status === 401) {
        console.log('\n💡 Unauthorized error suggests:');
        console.log('1. Invalid credentials');
        console.log('2. Token has expired');
        console.log('3. Insufficient scopes for the requested resource');
      }

      if (error.response?.status === 403) {
        console.log('\n💡 Forbidden error suggests:');
        console.log('1. Missing required scopes');
        console.log('2. App not approved for this account');
        console.log('3. Feature not enabled for your Zoom plan');
      }
    }
  }

  async getAccessToken() {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const payload = `grant_type=account_credentials&account_id=${this.accountId}`;
    
    const response = await axios.post('https://zoom.us/oauth/token', payload, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`   Token Type: ${response.data.token_type}`);
    console.log(`   Expires In: ${response.data.expires_in} seconds`);
    return response.data.access_token;
  }

  async getUserInfo(token) {
    try {
      const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   User: ${response.data.first_name} ${response.data.last_name}`);
      console.log(`   Email: ${response.data.email}`);
      console.log(`   Account Type: ${response.data.type}`);
      console.log('   ✅ User info retrieved successfully\n');
    } catch (error) {
      console.log(`   ❌ Failed to get user info: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  async getRecentMeetings(token) {
    try {
      const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          type: 'scheduled',
          page_size: 10
        }
      });

      const meetings = response.data.meetings || [];
      console.log(`   Found ${meetings.length} scheduled meetings`);
      
      if (meetings.length > 0) {
        console.log('   Sample meeting:');
        console.log(`   - Topic: ${meetings[0].topic}`);
        console.log(`   - ID: ${meetings[0].id}`);
        console.log(`   - Start Time: ${meetings[0].start_time}`);
      }
      console.log('   ✅ Recent meetings retrieved successfully\n');
    } catch (error) {
      console.log(`   ❌ Failed to get meetings: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 403) {
        console.log('   💡 You may need the "meeting:read:list_meetings" scope');
      }
      throw error;
    }
  }

  async getPastMeetings(token) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          type: 'previous_meetings',
          from: sevenDaysAgo,
          to: today,
          page_size: 10
        }
      });

      const meetings = response.data.meetings || [];
      console.log(`   Found ${meetings.length} past meetings in last 7 days`);
      
      if (meetings.length > 0) {
        console.log('   Sample past meeting:');
        console.log(`   - Topic: ${meetings[0].topic}`);
        console.log(`   - UUID: ${meetings[0].uuid}`);
        console.log(`   - Start Time: ${meetings[0].start_time}`);
        
        // Test participant retrieval for first meeting
        try {
          const participantResponse = await axios.get(
            `https://api.zoom.us/v2/past_meetings/${meetings[0].uuid}/participants`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              params: { page_size: 10 }
            }
          );
          
          const participants = participantResponse.data.participants || [];
          console.log(`   - Participants: ${participants.length}`);
          
          if (participants.length > 0) {
            console.log(`   - Sample participant: ${participants[0].name} (${participants[0].user_email})`);
          }
        } catch (participantError) {
          console.log(`   ❌ Failed to get participants: ${participantError.response?.data?.message || participantError.message}`);
          if (participantError.response?.status === 403) {
            console.log('   💡 You need the "meeting:read:past_participant" scope');
          }
        }
      }
      console.log('   ✅ Past meetings test completed\n');
    } catch (error) {
      console.log(`   ❌ Failed to get past meetings: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 403) {
        console.log('   💡 You may need the "meeting:read:past_meeting" scope');
      }
      throw error;
    }
  }
}

// Run the test
const tester = new ZoomCredentialTester();
tester.testCredentials();


