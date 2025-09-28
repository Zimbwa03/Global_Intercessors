import axios from 'axios';
import dayjs from 'dayjs';
import { supabaseAdmin } from '../supabase.js';

export interface ZoomMeeting {
  id: string;
  uuid: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  participant_count?: number;
}

export interface ZoomParticipant {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time?: string;
  duration: number;
}

export interface ZoomAnalytics {
  totalMeetings: number;
  totalParticipants: number;
  avgParticipants: number;
  avgDuration: number;
  attendanceRate: number;
  activeUsersToday: number;
  meetingsThisWeek: number;
  participantGrowth: string;
}

class ZoomAPIService {
  private zoomToken: string = '';
  private clientId: string;
  private clientSecret: string;
  private accountId: string;

  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_API_SECRET || '';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
  }

  // Get OAuth token using Server-to-Server OAuth
  async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new Error('Zoom credentials not configured');
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const payload = `grant_type=account_credentials&account_id=${this.accountId}`;

      const response = await axios.post('https://zoom.us/oauth/token', payload, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.zoomToken = response.data.access_token;
      console.log('✅ Zoom access token obtained successfully');
      return this.zoomToken;
    } catch (error: any) {
      console.error('❌ Error getting Zoom access token:', error.response?.data);
      throw new Error(`Zoom authentication failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get all meetings (past and upcoming)
  async getAllMeetings(fromDate?: string, toDate?: string): Promise<ZoomMeeting[]> {
    try {
      if (!this.zoomToken) {
        await this.getAccessToken();
      }

      const from = fromDate || dayjs().subtract(30, 'days').format('YYYY-MM-DD');
      const to = toDate || dayjs().format('YYYY-MM-DD');

      // Get past meetings
      const pastMeetingsResponse = await axios.get(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'previous_meetings',
            from: from,
            to: to,
            page_size: 300
          }
        }
      );

      // Get upcoming meetings
      const upcomingMeetingsResponse = await axios.get(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'scheduled',
            page_size: 300
          }
        }
      );

      const allMeetings = [
        ...(pastMeetingsResponse.data.meetings || []),
        ...(upcomingMeetingsResponse.data.meetings || [])
      ];

      console.log(`📊 Retrieved ${allMeetings.length} total meetings`);
      return allMeetings;
    } catch (error: any) {
      console.error('❌ Error fetching meetings:', error.response?.data);
      
      // Retry with new token if unauthorized
      if (error.response?.status === 401) {
        await this.getAccessToken();
        return this.getAllMeetings(fromDate, toDate);
      }
      
      return [];
    }
  }

  // Get live/active meetings
  async getLiveMeetings(): Promise<ZoomMeeting[]> {
    try {
      if (!this.zoomToken) {
        await this.getAccessToken();
      }

      const response = await axios.get(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          headers: {
            Authorization: `Bearer ${this.zoomToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            type: 'live',
            page_size: 100
          }
        }
      );

      const liveMeetings = response.data.meetings || [];
      console.log(`🔴 Found ${liveMeetings.length} live meetings`);
      return liveMeetings;
    } catch (error: any) {
      console.error('❌ Error fetching live meetings:', error.response?.data);
      return [];
    }
  }

  // Get meeting participants
  async getMeetingParticipants(meetingUuid: string): Promise<ZoomParticipant[]> {
    try {
      if (!this.zoomToken) {
        await this.getAccessToken();
      }

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
      console.error('❌ Error fetching meeting participants:', error.response?.data);
      return [];
    }
  }

  // Get live meeting participants
  async getLiveMeetingParticipants(meetingId: string): Promise<any[]> {
    try {
      if (!this.zoomToken) {
        await this.getAccessToken();
      }

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
    } catch (error: any) {
      console.error('❌ Error fetching live participants:', error.response?.data);
      return [];
    }
  }

  // Get comprehensive analytics
  async getZoomAnalytics(): Promise<ZoomAnalytics> {
    try {
      const meetings = await this.getAllMeetings();
      const liveMeetings = await this.getLiveMeetings();
      
      // Calculate metrics
      const totalMeetings = meetings.length;
      const totalParticipants = meetings.reduce((sum, m) => sum + (m.participant_count || 0), 0);
      const avgParticipants = totalMeetings > 0 ? Math.round(totalParticipants / totalMeetings) : 0;
      const avgDuration = totalMeetings > 0 ? 
        Math.round(meetings.reduce((sum, m) => sum + m.duration, 0) / totalMeetings) : 0;

      // Get database stats for attendance rate
      const { data: attendanceStats } = await supabaseAdmin
        .from('prayer_attendance')
        .select('*')
        .gte('prayer_date', dayjs().subtract(30, 'days').format('YYYY-MM-DD'));

      const attendedCount = attendanceStats?.filter(a => a.is_attended)?.length || 0;
      const totalCount = attendanceStats?.length || 1;
      const attendanceRate = Math.round((attendedCount / totalCount) * 100);

      // Users active today
      const todayAttendance = attendanceStats?.filter(a => 
        dayjs(a.prayer_date).isSame(dayjs(), 'day') && a.is_attended
      )?.length || 0;

      // Meetings this week
      const weekStart = dayjs().startOf('week');
      const meetingsThisWeek = meetings.filter(m => 
        dayjs(m.start_time).isAfter(weekStart)
      ).length;

      // Growth calculation (simplified)
      const lastWeekMeetings = meetings.filter(m => {
        const meetingDate = dayjs(m.start_time);
        return meetingDate.isBetween(
          dayjs().subtract(2, 'week').startOf('week'),
          dayjs().subtract(1, 'week').endOf('week')
        );
      }).length;

      const growthRate = lastWeekMeetings > 0 ? 
        Math.round(((meetingsThisWeek - lastWeekMeetings) / lastWeekMeetings) * 100) : 0;
      const participantGrowth = growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`;

      return {
        totalMeetings,
        totalParticipants,
        avgParticipants,
        avgDuration,
        attendanceRate,
        activeUsersToday: todayAttendance,
        meetingsThisWeek,
        participantGrowth
      };
    } catch (error) {
      console.error('❌ Error calculating analytics:', error);
      return {
        totalMeetings: 0,
        totalParticipants: 0,
        avgParticipants: 0,
        avgDuration: 0,
        attendanceRate: 0,
        activeUsersToday: 0,
        meetingsThisWeek: 0,
        participantGrowth: '0%'
      };
    }
  }

  // Get user-specific attendance data
  async getUserAttendanceData(userId: string): Promise<any> {
    try {
      const { data: attendanceData } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      const { data: prayerSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const totalSessions = attendanceData?.length || 0;
      const attendedSessions = attendanceData?.filter(a => a.status === 'attended')?.length || 0;
      const missedSessions = totalSessions - attendedSessions;
      const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

      return {
        totalSessions,
        attendedSessions,
        missedSessions,
        attendanceRate,
        currentStreak: this.calculateStreak(attendanceData || []),
        lastAttended: attendanceData?.find(a => a.status === 'attended')?.date || null,
        slotTime: prayerSlot?.slot_time || null,
        recentSessions: (attendanceData || []).slice(0, 10).map(session => ({
          date: session.date,
          status: session.status,
          duration: session.zoom_leave_time && session.zoom_join_time ? 
            Math.round((new Date(session.zoom_leave_time).getTime() - new Date(session.zoom_join_time).getTime()) / 60000) : 0
        }))
      };
    } catch (error) {
      console.error('❌ Error fetching user attendance:', error);
      return null;
    }
  }

  private calculateStreak(attendanceData: any[]): number {
    let streak = 0;
    const sortedData = attendanceData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const record of sortedData) {
      if (record.status === 'attended') {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      await this.getAccessToken();
      const meetings = await this.getAllMeetings();
      
      return {
        success: true,
        message: `Successfully connected to Zoom API. Found ${meetings.length} meetings.`,
        data: {
          meetings_count: meetings.length,
          token_obtained: !!this.zoomToken,
          credentials_configured: !!(this.clientId && this.clientSecret && this.accountId)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Zoom API connection failed: ${error.message}`
      };
    }
  }
}

export const zoomAPIService = new ZoomAPIService();
