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

  constructor() {
    this.zoomToken = process.env.ZOOM_API_TOKEN || '';
    if (!this.zoomToken) {
      console.warn('ZOOM_API_TOKEN not found in environment variables');
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

    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      try {
        await this.processAttendance();
      } catch (error) {
        console.error('Error in attendance tracking:', error);
      }
    });

    // Also run immediately on startup
    this.processAttendance().catch(console.error);
  }

  // Main attendance processing function
  private async processAttendance() {
    if (!this.zoomToken) {
      console.error('Zoom API token not configured');
      return;
    }

    console.log('Processing attendance for:', dayjs().format('YYYY-MM-DD HH:mm'));

    try {
      // Get all recent unprocessed Zoom meetings
      const meetings = await this.getRecentZoomMeetings();
      
      for (const meeting of meetings) {
        await this.processMeetingAttendance(meeting);
      }

      // Process slot attendance for today
      await this.processSlotAttendance();

    } catch (error) {
      console.error('Error processing attendance:', error);
    }
  }

  // Get recent Zoom meetings from API
  private async getRecentZoomMeetings() {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      const response = await axios.get(
        `https://api.zoom.us/v2/users/me/meetings`,
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'previous_meetings',
            from: yesterday,
            to: today,
            page_size: 100
          }
        }
      );

      return response.data.meetings || [];
    } catch (error) {
      console.error('Error fetching Zoom meetings:', error);
      return [];
    }
  }

  // Process attendance for a specific meeting
  private async processMeetingAttendance(meeting: any) {
    try {
      // Check if meeting is already processed
      const { data: existingMeeting } = await supabaseAdmin
        .from('zoom_meetings')
        .select('*')
        .eq('meeting_id', meeting.id)
        .single();

      if (existingMeeting?.processed) {
        return; // Already processed
      }

      // Get meeting participants
      const participants = await this.getMeetingParticipants(meeting.uuid);

      // Store meeting data
      const meetingData = {
        meeting_id: meeting.id.toString(),
        meeting_uuid: meeting.uuid,
        topic: meeting.topic,
        start_time: new Date(meeting.start_time),
        end_time: meeting.end_time ? new Date(meeting.end_time) : null,
        duration: meeting.duration,
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
    } catch (error) {
      console.error('Error fetching meeting participants:', error);
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

      return meetingTime.isBetween(slotStart, slotEnd, null, '[]');
    } catch (error) {
      console.error('Error parsing slot time:', error);
      return false;
    }
  }

  // Process missed slots for users who didn't attend
  private async processSlotAttendance() {
    try {
      const today = dayjs().format('YYYY-MM-DD');

      // Get all active prayer slots
      const { data: activeSlots } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (!activeSlots) return;

      for (const slot of activeSlots) {
        // Check if there's an attendance record for today
        const { data: attendance } = await supabaseAdmin
          .from('attendance_log')
          .select('*')
          .eq('user_id', slot.user_id)
          .eq('date', today)
          .single();

        if (!attendance) {
          // No attendance record - mark as missed
          await this.markSlotMissed(slot, today);
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
}

export const zoomAttendanceTracker = new ZoomAttendanceTracker();