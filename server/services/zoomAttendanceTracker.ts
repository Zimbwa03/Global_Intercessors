import cron from 'node-cron';
import axios from 'axios';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import { supabaseAdmin } from '../supabase.js';

dayjs.extend(isBetween);

interface ZoomParticipant {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
  duration: number;
}

interface ZoomMeetingParticipants {
  participants: ZoomParticipant[];
  next_page_token?: string;
  page_count: number;
  page_size: number;
  total_records: number;
}

class ZoomAttendanceTracker {
  private zoomToken: string;
  private isRunning: boolean = false;
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private meetingId: string;

  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_API_SECRET || '';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.meetingId = process.env.ZOOM_MEETING_ID || '83923875995';
    this.zoomToken = '';
    
    console.log('🔧 Zoom Credentials Check:');
    console.log('Client ID:', this.clientId ? `${this.clientId.substring(0, 8)}...` : 'MISSING');
    console.log('Client Secret:', this.clientSecret ? `${this.clientSecret.substring(0, 8)}...` : 'MISSING');
    console.log('Account ID:', this.accountId ? `${this.accountId.substring(0, 8)}...` : 'MISSING');
    console.log('Meeting ID:', this.meetingId);
    
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      console.error('❌ ZOOM CREDENTIALS MISSING! Please set:');
      console.error('- ZOOM_CLIENT_ID');
      console.error('- ZOOM_API_SECRET (this should be Client Secret)');
      console.error('- ZOOM_ACCOUNT_ID');
    }
  }

  // Get OAuth token using Server-to-Server OAuth
  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Zoom credentials not configured. Please set ZOOM_CLIENT_ID, ZOOM_API_SECRET, and ZOOM_ACCOUNT_ID in Secrets');
    }

    try {
      console.log('🔄 Requesting Zoom access token...');
      console.log('Using Account ID:', this.accountId);
      
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const payload = `grant_type=account_credentials&account_id=${this.accountId}`;
      
      console.log('Request payload:', payload);
      console.log('Authorization header (first 20 chars):', credentials.substring(0, 20) + '...');

      const response = await axios.post('https://zoom.us/oauth/token', payload, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.zoomToken = response.data.access_token;
      console.log('✅ Zoom access token obtained successfully');
      console.log('Token type:', response.data.token_type);
      console.log('Expires in:', response.data.expires_in, 'seconds');
      return this.zoomToken;
    } catch (error: any) {
      console.error('❌ Error getting Zoom access token:');
      console.error('Status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      if (error.response?.data?.error === 'invalid_client') {
        console.error('💡 This usually means:');
        console.error('1. Client ID or Client Secret is incorrect');
        console.error('2. The app is not published/activated in Zoom');
        console.error('3. Wrong app type (should be Server-to-Server OAuth)');
      }
      
      throw new Error(`Zoom authentication failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Initialize the CRON job to run every 30 minutes
  startTracking() {
    if (this.isRunning) {
      console.log('Zoom attendance tracking is already running');
      return;
    }

    console.log('Starting Zoom attendance tracking...');
    this.isRunning = true;

    // Run every 5 minutes for near real-time tracking
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.processAttendance();
      } catch (error) {
        console.error('Error in attendance tracking:', error);
      }
    });

    // Run every 2 minutes during active prayer hours to avoid rate limits
    cron.schedule('*/2 * * * *', async () => {
      try {
        await this.checkActiveSlots();
      } catch (error) {
        console.error('Error in active slot checking:', error);
      }
    });

    // Also run immediately on startup
    this.processAttendance().catch(console.error);
  }

  // Main attendance processing function
  private async processAttendance() {
    try {
      // Always refresh token before processing to ensure it's valid
      await this.getAccessToken();
    } catch (error) {
      console.error('Failed to get Zoom access token:', error);
      return;
    }

    console.log('Processing attendance for:', dayjs().format('YYYY-MM-DD HH:mm'));

    try {
      // Try to get past meeting instances (requires additional API scopes)
      try {
        const meetings = await this.getRecentZoomMeetings();
        
        for (const meeting of meetings) {
          await this.processMeetingAttendance(meeting);
        }
      } catch (error: any) {
        // If we don't have the required scopes, skip past meetings
        if (error.response?.data?.code === 4711) {
          console.log('ℹ️ Skipping past meetings (requires additional Zoom API scopes)');
        } else {
          console.error('Error fetching past meetings:', error.message);
        }
      }

      // Process slot attendance for today
      await this.processSlotAttendance();

    } catch (error) {
      console.error('Error processing attendance:', error);
    }
  }

  // Get live participants from the specific prayer meeting
  private async getLiveParticipants() {
    try {
      console.log(`🔍 Checking for live participants in meeting ${this.meetingId}`);

      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${this.meetingId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const participants = response.data.participants || [];
      console.log(`👥 Found ${participants.length} live participants in prayer meeting`);
      
      if (participants.length > 0) {
        participants.forEach((participant: any, index: number) => {
          console.log(`📍 Participant ${index + 1}: ${participant.name} (${participant.user_email || 'no email'})`);
        });
      } else {
        console.log('⚠️ No participants currently in the meeting');
      }

      return participants;
    } catch (error: any) {
      // Meeting not started or no participants
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('ℹ️ Prayer meeting not currently active or has no participants');
        return [];
      }
      
      console.error('❌ Error fetching live participants:', error.response?.data || error.message);
      console.error('🔍 Debug info:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        meetingId: this.meetingId,
        url: error.config?.url
      });
      
      // If token is expired, try to refresh it once
      if (error.response?.status === 401) {
        console.log('🔄 Token expired, attempting to refresh...');
        try {
          await this.getAccessToken();
          // Retry the request with new token
          const retryResponse = await axios.get(
            `https://api.zoom.us/v2/meetings/${this.meetingId}/participants`,
            {
              headers: {
                Authorization: `Bearer ${this.zoomToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Token refresh successful, retry completed');
          return retryResponse.data.participants || [];
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          return [];
        }
      }
      
      return [];
    }
  }

  // Get recent Zoom meetings from API (now tracks past instances of recurring meeting)
  private async getRecentZoomMeetings() {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

      console.log(`🔍 Fetching past instances of meeting ${this.meetingId} from ${sevenDaysAgo} to ${today}`);

      const response = await axios.get(
        `https://api.zoom.us/v2/past_meetings/${this.meetingId}/instances`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the full API response structure to understand the format
      console.log('🔍 Full Zoom API response structure:', JSON.stringify(response.data, null, 2));
      
      const meetings = response.data.meetings || [];
      console.log(`📊 Found ${meetings.length} past instances of prayer meeting`);
      
      if (meetings.length > 0) {
        console.log('📋 Sample meeting data:', JSON.stringify(meetings[0], null, 2));
        console.log('📋 Meeting keys available:', Object.keys(meetings[0]));
        meetings.forEach((meeting: any, index: number) => {
          console.log(`📅 Meeting ${index + 1}:`, {
            start_time: meeting.start_time,
            uuid: meeting.uuid,
            id: meeting.id,
            hasId: !!meeting.id,
            hasUuid: !!meeting.uuid
          });
        });
      } else {
        console.log('⚠️ No past meeting instances found');
      }

      return meetings;
    } catch (error: any) {
      console.error('❌ Error fetching past meeting instances:', error.response?.data || error.message);
      console.error('🔍 Debug info:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        meetingId: this.meetingId,
        url: error.config?.url
      });
      
      // If missing list_past_instances scope, try alternative endpoint
      if (error.response?.data?.code === 4711) {
        console.log('ℹ️ Trying alternative endpoint with meeting:read:list_past_participants:admin scope...');
        return await this.getPastParticipantsDirect();
      }
      
      return [];
    }
  }

  // Alternative method using meeting:read:list_past_participants:admin scope
  private async getPastParticipantsDirect() {
    try {
      console.log(`⚠️ getPastParticipantsDirect requires meeting UUID, not meeting ID`);
      console.log(`ℹ️ Cannot fetch past participants without meeting instances/UUIDs`);
      console.log(`💡 Recommend: Grant meeting:read:list_past_instances:admin scope for full functionality`);
      
      // This endpoint requires a meeting UUID, not meeting ID
      // We can't use this.meetingId (which is just the meeting ID number)
      // We need UUIDs from past meeting instances
      // For now, return empty array and log recommendation
      
      return [];
      
      /* DISABLED: This won't work with meeting ID - requires UUID
      const response = await axios.get(
        `https://api.zoom.us/v2/past_meetings/${this.meetingId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );

      const participants = response.data.participants || [];
      console.log(`📊 Found ${participants.length} past participants`);
      
      if (participants.length > 0) {
        // Group participants by session (same join times within 30 min window)
        const sessions: any[] = [];
        let currentSession: any = null;
        
        participants.forEach((participant: any) => {
          const joinTime = dayjs(participant.join_time);
          
          if (!currentSession || joinTime.diff(currentSession.start_time, 'minute') > 30) {
            // New session
            currentSession = {
              id: participant.id,
              uuid: participant.id, // Use participant ID as uuid
              start_time: participant.join_time,
              participants: [participant]
            };
            sessions.push(currentSession);
          } else {
            // Same session
            currentSession.participants.push(participant);
          }
        });
        
        console.log(`📅 Grouped into ${sessions.length} sessions`);
        return sessions;
      }
      
      return [];
      */
    } catch (error: any) {
      console.error('❌ Error fetching past participants:', error.response?.data || error.message);
      return [];
    }
  }

  // Process attendance for a specific meeting
  private async processMeetingAttendance(meeting: any) {
    try {
      // Validate meeting object has required fields
      if (!meeting) {
        console.log('⚠️ Skipping null/undefined meeting object');
        return;
      }
      
      // Check if meeting has either id or uuid (Zoom API response variations)
      const meetingIdentifier = meeting.uuid || meeting.id;
      if (!meetingIdentifier) {
        console.log('⚠️ Skipping invalid meeting object - missing both id and uuid');
        console.log('   Available meeting fields:', Object.keys(meeting));
        console.log('   Meeting data:', JSON.stringify(meeting, null, 2));
        return;
      }
      
      // Ensure we have a proper ID for database storage
      const meetingId = meeting.id ? String(meeting.id) : String(meeting.uuid);
      const meetingUuid = meeting.uuid || String(meeting.id);
      
      console.log(`✅ Processing meeting with identifier:`, meetingIdentifier);

      // Check if meeting is already processed
      const { data: existingMeeting } = await supabaseAdmin
        .from('zoom_meetings')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (existingMeeting?.processed) {
        return; // Already processed
      }

      // Get meeting participants (either from embedded data or API call)
      let participants = meeting.participants || [];
      if (participants.length === 0 && meetingUuid) {
        participants = await this.getMeetingParticipants(meetingUuid);
      }

      // Store meeting data
      const meetingData = {
        meeting_id: meetingId,
        meeting_uuid: meetingUuid,
        topic: meeting.topic || 'Global Intercessors Prayer',
        start_time: new Date(meeting.start_time),
        end_time: meeting.end_time ? new Date(meeting.end_time) : null,
        duration: meeting.duration || 30,
        participant_count: participants.length,
        processed: true
      };

      await supabaseAdmin
        .from('zoom_meetings')
        .upsert(meetingData, { onConflict: 'meeting_id' });

      // Process each participant
      for (const participant of participants) {
        await this.processParticipantAttendance(participant, meeting);
      }

    } catch (error) {
      console.error('Error processing meeting attendance:', error);
    }
  }

  // Get participants for a specific meeting
  private async getMeetingParticipants(meetingUuid: string): Promise<ZoomParticipant[]> {
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/past_meetings/${meetingUuid}/participants`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );

      return response.data.participants || [];
    } catch (error: any) {
      // Handle specific Zoom API errors
      if (error.response?.status === 400 && error.response?.data?.code === 12702) {
        // Meeting too old to access (older than 1 year)
        console.log(`⏰ Meeting ${meetingUuid} is too old to retrieve participants (older than 1 year)`);
        return [];
      }
      
      if (error.response?.status === 404) {
        // Meeting not found
        console.log(`🔍 Meeting ${meetingUuid} not found`);
        return [];
      }
      
      // Log other errors for debugging
      console.error(`❌ Error fetching participants for meeting ${meetingUuid}:`, {
        status: error.response?.status,
        code: error.response?.data?.code,
        message: error.response?.data?.message || error.message
      });
      
      return [];
    }
  }

  // Process individual participant attendance
  private async processParticipantAttendance(participant: ZoomParticipant, meeting: any) {
    try {
      const email = participant.user_email?.toLowerCase();
      if (!email) return;

      // Find user by email
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!user) return; // User not found

      // Find user's prayer slot
      const { data: prayerSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!prayerSlot) return; // No active slot

      // Check if attendance matches slot time
      const meetingStart = dayjs(meeting.start_time);
      const slotTimeMatch = this.isTimeInSlot(meetingStart, prayerSlot.slot_time);

      if (slotTimeMatch) {
        // Log attendance
        const attendanceData = {
          user_id: user.id,
          slot_id: prayerSlot.id,
          date: meetingStart.format('YYYY-MM-DD'),
          status: 'attended',
          zoom_join_time: new Date(participant.join_time),
          zoom_leave_time: new Date(participant.leave_time),
          zoom_meeting_id: meeting.id.toString()
        };

        await supabaseAdmin
          .from('attendance_log')
          .upsert(attendanceData, { 
            onConflict: 'user_id,date',
            ignoreDuplicates: false 
          });

        // Reset missed count and update last attended
        await supabaseAdmin
          .from('prayer_slots')
          .update({
            missed_count: 0,
            last_attended: new Date().toISOString()
          })
          .eq('id', prayerSlot.id);

        console.log(`Marked attendance for ${email} on ${meetingStart.format('YYYY-MM-DD')}`);
      }

    } catch (error) {
      console.error('Error processing participant attendance:', error);
    }
  }

  // Check if meeting time overlaps with prayer slot
  private isTimeInSlot(meetingTime: dayjs.Dayjs, slotTime: string): boolean {
    try {
      const [startTime, endTime] = slotTime.split('–');
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const slotStart = meetingTime.clone().hour(startHour).minute(startMin).second(0);
      const slotEnd = meetingTime.clone().hour(endHour).minute(endMin).second(0);

      // Handle overnight slots (e.g., 23:00-01:00)
      if (slotEnd.isBefore(slotStart)) {
        slotEnd.add(1, 'day');
      }

      // Allow for some flexibility - if user joins within 15 minutes of their slot
      const flexStart = slotStart.subtract(15, 'minute');
      const flexEnd = slotEnd.add(15, 'minute');

      return meetingTime.isBetween(flexStart, flexEnd, null, '[]');
    } catch (error) {
      console.error('Error parsing slot time:', error);
      return false;
    }
  }

  // Process missed slots for users who didn't attend
  private async processSlotAttendance() {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const todayDayOfWeek = dayjs().day(); // 0=Sunday, 6=Saturday
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayDayName = dayNames[todayDayOfWeek];

      console.log(`📅 Processing attendance for ${today} (${todayDayName})`);

      // Get all active prayer slots
      const { data: activeSlots } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (!activeSlots) return;

      for (const slot of activeSlots) {
        // Check user's active prayer days schedule
        const { data: schedule } = await supabaseAdmin
          .from('intercessor_schedules')
          .select('active_days')
          .eq('user_id', slot.user_id)
          .single();

        // If user has a schedule, check if today is one of their active days
        if (schedule && schedule.active_days && Array.isArray(schedule.active_days)) {
          const isActiveDayToday = schedule.active_days.includes(todayDayName);
          
          if (!isActiveDayToday) {
            console.log(`⏭️  Skipping ${slot.user_email} - ${todayDayName} is not their prayer day`);
            continue; // Skip this user - today is not their prayer day
          }
        }

        // Check if there's an attendance record for today
        const { data: attendance } = await supabaseAdmin
          .from('attendance_log')
          .select('*')
          .eq('user_id', slot.user_id)
          .eq('date', today)
          .single();

        if (!attendance) {
          // No attendance record on their prayer day - mark as missed
          console.log(`❌ Marking ${slot.user_email} as missed for ${todayDayName}`);
          await this.markSlotMissed(slot, today);
        } else {
          console.log(`✅ ${slot.user_email} attended on ${todayDayName}`);
        }
      }
    } catch (error) {
      console.error('Error processing slot attendance:', error);
    }
  }

  // Mark a slot as missed and handle consequences
  private async markSlotMissed(slot: any, date: string) {
    try {
      // Log missed attendance
      const missedAttendance = {
        user_id: slot.user_id,
        slot_id: slot.id,
        date: date,
        status: 'missed',
        zoom_join_time: null,
        zoom_leave_time: null,
        zoom_meeting_id: null
      };

      await supabaseAdmin
        .from('attendance_log')
        .upsert(missedAttendance, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        });

      const newMissedCount = slot.missed_count + 1;

      if (newMissedCount >= 5) {
        // Auto-release slot after 5 missed days
        await supabaseAdmin
          .from('prayer_slots')
          .update({
            user_id: null,
            user_email: null,
            status: 'released',
            missed_count: 0
          })
          .eq('id', slot.id);

        // Make slot available again
        await supabaseAdmin
          .from('available_slots')
          .update({ is_available: true })
          .eq('slot_time', slot.slot_time);

        console.log(`Auto-released slot ${slot.slot_time} after 5 missed days`);
        
        // TODO: Send notification about slot release
        await this.sendSlotReleaseNotification(slot);

      } else {
        // Update missed count
        await supabaseAdmin
          .from('prayer_slots')
          .update({ missed_count: newMissedCount })
          .eq('id', slot.id);

        console.log(`Marked slot ${slot.slot_time} as missed (${newMissedCount}/5)`);

        // Send reminder notifications
        if (newMissedCount >= 3) {
          await this.sendMissedSlotReminder(slot, newMissedCount);
        }
      }

    } catch (error) {
      console.error('Error marking slot as missed:', error);
    }
  }

  // Send notification when slot is auto-released
  private async sendSlotReleaseNotification(slot: any) {
    // TODO: Implement push notification or email
    console.log(`Notification: Slot ${slot.slot_time} has been auto-released for user ${slot.user_email}`);
  }

  // Send reminder when user misses slots
  private async sendMissedSlotReminder(slot: any, missedCount: number) {
    // TODO: Implement push notification or email
    const message = missedCount >= 4 
      ? `⚠️ Final warning: Your prayer slot will be released after 1 more missed day.`
      : `⚠️ Reminder: You've missed ${missedCount} prayer sessions. Please honor your commitment.`;
    
    console.log(`Reminder for ${slot.user_email}: ${message}`);
  }

  // Stop the tracking service
  stopTracking() {
    this.isRunning = false;
    console.log('Zoom attendance tracking stopped');
  }

  // Manual trigger for testing
  async manualProcess() {
    console.log('Manual attendance processing triggered');
    await this.processAttendance();
  }

  // Manual attendance logging for immediate processing
  async logManualAttendance(userId: string, userEmail: string, duration: number = 20) {
    try {
      console.log(`Logging manual attendance for ${userEmail}: ${duration} minutes`);

      // Find user's prayer slot
      const { data: prayerSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!prayerSlot) {
        throw new Error('No active prayer slot found');
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const sessionStart = new Date(now.getTime() - (duration * 60 * 1000));

      // Log attendance
      const attendanceData = {
        user_id: userId,
        slot_id: prayerSlot.id,
        date: today,
        status: 'attended',
        zoom_join_time: sessionStart,
        zoom_leave_time: now,
        zoom_meeting_id: `manual_${Date.now()}`
      };

      await supabaseAdmin
        .from('attendance_log')
        .upsert(attendanceData, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        });

      // Reset missed count and update last attended
      await supabaseAdmin
        .from('prayer_slots')
        .update({
          missed_count: 0,
          last_attended: now.toISOString()
        })
        .eq('id', prayerSlot.id);

      console.log(`✅ Manual attendance logged for ${userEmail} - ${duration} minutes`);
      return { success: true, duration };

    } catch (error) {
      console.error('Error logging manual attendance:', error);
      throw error;
    }
  }

  // Check for active slots and live meetings
  private async checkActiveSlots() {
    try {
      const now = dayjs();
      const currentTime = now.format('HH:mm');

      // Get all active prayer slots
      const { data: activeSlots } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (!activeSlots) return;

      // Check if any slot is currently active (within 15 minutes)
      const currentlyActiveSlots = activeSlots.filter(slot => {
        // Check if slot_time exists and is valid
        if (!slot.slot_time || typeof slot.slot_time !== 'string') {
          console.log(`⚠️ Invalid slot_time for slot ${slot.id}:`, slot.slot_time);
          return false;
        }

        try {
          const [startTime, endTime] = slot.slot_time.split('–');
          if (!startTime || !endTime) {
            console.log(`⚠️ Invalid slot_time format for slot ${slot.id}:`, slot.slot_time);
            return false;
          }

          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);

          if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
            console.log(`⚠️ Invalid time values for slot ${slot.id}:`, slot.slot_time);
            return false;
          }

          const slotStart = now.clone().hour(startHour).minute(startMin);
          const slotEnd = now.clone().hour(endHour).minute(endMin);

          // Handle overnight slots
          if (slotEnd.isBefore(slotStart)) {
            slotEnd.add(1, 'day');
          }

          // Check if we're within the slot time (with 15 min buffer)
          const flexStart = slotStart.subtract(15, 'minute');
          const flexEnd = slotEnd.add(15, 'minute');

          return now.isBetween(flexStart, flexEnd, null, '[]');
        } catch (error: any) {
          console.log(`⚠️ Error parsing slot_time for slot ${slot.id}:`, error.message);
          return false;
        }
      });

      if (currentlyActiveSlots.length > 0) {
        console.log(`🔴 LIVE: ${currentlyActiveSlots.length} prayer slots are currently active!`);
        
        // Check for live meetings
        await this.checkLiveMeetings(currentlyActiveSlots);
      }

    } catch (error) {
      console.error('Error checking active slots:', error);
    }
  }

  // Rate limiting variables
  private lastZoomApiCall: number = 0;
  private minApiInterval: number = 2000; // Minimum 2 seconds between API calls

  // Check for live meetings with rate limiting
  private async checkLiveMeetings(activeSlots: any[]) {
    try {
      // Rate limiting check
      const now = Date.now();
      if (now - this.lastZoomApiCall < this.minApiInterval) {
        console.log('⏳ Rate limiting: Skipping Zoom API call');
        return;
      }
      this.lastZoomApiCall = now;

      if (!this.zoomToken) {
        await this.getAccessToken();
      }

      // Get live participants from specific prayer meeting
      const liveParticipants = await this.getLiveParticipants();
      
      if (liveParticipants.length > 0) {
        console.log(`🔴 LIVE PRAYER SESSION: ${liveParticipants.length} participants in meeting!`);
        
        // Process attendance for each participant
        for (const participant of liveParticipants) {
          await this.processLiveParticipantAttendance(participant, activeSlots);
        }
      } else {
        console.log('📊 No participants in prayer meeting right now');
      }

    } catch (error: any) {
      console.error('Error checking live meeting participants:', error.message);
    }
  }

  // Process attendance for live meetings immediately
  private async processLiveMeetingAttendance(meeting: any, activeSlots: any[]) {
    try {
      // Get live participants
      const participants = await this.getLiveMeetingParticipants(meeting.id);
      
      if (participants.length === 0) {
        console.log(`No participants found in live meeting ${meeting.id}`);
        return;
      }

      console.log(`👥 Found ${participants.length} participants in live meeting`);

      // Process each participant immediately
      for (const participant of participants) {
        await this.processLiveParticipantAttendance(participant, activeSlots);
      }

    } catch (error) {
      console.error('Error processing live meeting attendance:', error);
    }
  }

  // Get participants from a live meeting
  private async getLiveMeetingParticipants(meetingId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            page_size: 300
          }
        }
      );

      return response.data.participants || [];
    } catch (error) {
      console.error('Error fetching live meeting participants:', error);
      return [];
    }
  }

  // Process individual participant in live meeting
  private async processLiveParticipantAttendance(participant: any, activeSlots: any[]) {
    try {
      const email = participant.user_email?.toLowerCase() || participant.email?.toLowerCase();
      const participantName = participant.name || participant.user_name || 'Unknown';
      
      if (!email) {
        console.log(`⚠️ Participant ${participantName} has no email - checking by name match`);
        
        // Try to match by name if email is not available
        const nameMatch = activeSlots.find(slot => 
          slot.user_email && slot.user_email.includes(participantName.toLowerCase())
        );
        
        if (nameMatch) {
          console.log(`✅ Matched participant by name: ${participantName}`);
          await this.logLiveAttendanceForSlot(nameMatch, participant);
          return;
        }
        
        console.log(`❌ Could not match participant: ${participantName}`);
        return;
      }

      console.log(`🔍 Processing participant: ${email} (${participantName})`);

      // Find matching active slot for this user
      const userSlot = activeSlots.find(slot => 
        slot.user_email?.toLowerCase() === email
      );

      if (!userSlot) {
        console.log(`⚠️ No matching prayer slot found for ${email} - checking all slots`);
        
        // Check if user has ANY slot (even if not in activeSlots for today)
        const { data: anySlot } = await supabaseAdmin
          .from('prayer_slots')
          .select('*')
          .ilike('user_email', `%${email}%`)
          .eq('status', 'active')
          .single();
        
        if (anySlot) {
          console.log(`✅ Found slot for ${email} outside active time`);
          await this.logLiveAttendanceForSlot(anySlot, participant);
        }
        return;
      }

      await this.logLiveAttendanceForSlot(userSlot, participant);

    } catch (error: any) {
      console.error('Error processing live participant attendance:', error.message);
    }
  }

  // Helper method to log attendance for a live participant (updated signature)
  private async logLiveAttendanceForSlot(userSlot: any, participant: any) {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const now = dayjs();

      // Check if already marked attendance for today
      const { data: existingAttendance } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userSlot.user_id)
        .eq('date', today)
        .single();

      if (existingAttendance && existingAttendance.status === 'attended') {
        console.log(`✅ ${userSlot.user_email} already marked as attended today`);
        return;
      }

      // Mark attendance immediately
      const attendanceData = {
        user_id: userSlot.user_id,
        slot_id: userSlot.id,
        date: today,
        status: 'attended',
        meeting_id: this.meetingId,
        join_time: participant.join_time || now.toISOString(),
        participant_name: participant.name || participant.user_name
      };

      await supabaseAdmin
        .from('attendance_log')
        .upsert(attendanceData, { onConflict: 'user_id,date' });

      // Reset missed count
      await supabaseAdmin
        .from('prayer_slots')
        .update({ 
          missed_count: 0,
          last_attended: today
        })
        .eq('id', userSlot.id);

      console.log(`✅ LIVE ATTENDANCE logged for ${userSlot.user_email}`);

    } catch (error: any) {
      console.error('Error logging live attendance:', error.message);
    }
  }

  // Helper method to log attendance for a slot
  private async logAttendanceForSlot(userSlot: any, meeting: any, participant: any) {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const now = dayjs();

      // Check if already marked attendance for today
      const { data: existingAttendance } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userSlot.user_id)
        .eq('date', today)
        .single();

      if (existingAttendance && existingAttendance.status === 'attended') {
        console.log(`✅ ${userSlot.user_email} already marked as attended today`);
        return;
      }

      // Mark attendance immediately
      const attendanceData = {
        user_id: userSlot.user_id,
        slot_id: userSlot.id,
        date: today,
        status: 'attended',
        zoom_join_time: participant.join_time || now.toISOString(),
        zoom_leave_time: null,
        zoom_meeting_id: meeting.id.toString(),
        created_at: now.toISOString()
      };

      const { error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .upsert(attendanceData, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        });

      if (attendanceError) {
        console.error(`❌ Failed to log attendance for ${userSlot.user_email}:`, attendanceError);
        return;
      }

      // Reset missed count and update last attended
      const { error: updateError } = await supabaseAdmin
        .from('prayer_slots')
        .update({
          missed_count: 0,
          last_attended: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', userSlot.id);

      if (updateError) {
        console.error(`⚠️ Failed to update slot for ${userSlot.user_email}:`, updateError);
      }

      console.log(`🎉 ATTENDANCE LOGGED: ${userSlot.user_email} joined ${meeting.topic} at ${now.format('HH:mm')}`);

    } catch (error: any) {
      console.error('Error in logAttendanceForSlot:', error.message);
    }
  }

  // Force process all recent meetings (for debugging)
  async forceProcessRecentMeetings() {
    try {
      console.log('🔄 Force processing all recent meetings...');
      
      if (!this.zoomToken) {
        await this.getAccessToken();
      }

      // Get meetings from last 3 days instead of just yesterday
      const today = dayjs().format('YYYY-MM-DD');
      const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD');

      const response = await axios.get(
        `https://api.zoom.us/v2/users/me/meetings`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'previous_meetings',
            from: threeDaysAgo,
            to: today,
            page_size: 100
          }
        }
      );

      const meetings = response.data.meetings || [];
      console.log(`Found ${meetings.length} meetings in last 3 days`);

      for (const meeting of meetings) {
        console.log(`Processing meeting: ${meeting.topic} (${meeting.id})`);
        await this.processMeetingAttendance(meeting);
      }

      return { processed: meetings.length };

    } catch (error) {
      console.error('Error in force processing:', error);
      throw error;
    }
  }
}

export const zoomAttendanceTracker = new ZoomAttendanceTracker();