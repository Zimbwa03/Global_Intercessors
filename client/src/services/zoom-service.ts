import axios from 'axios';

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

export interface ZoomMeeting {
  id: string;
  uuid: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  participant_count?: number;
}

export interface UserAttendance {
  totalSessions: number;
  attendedSessions: number;
  missedSessions: number;
  attendanceRate: number;
  currentStreak: number;
  lastAttended: string | null;
  slotTime: string | null;
  recentSessions: Array<{
    date: string;
    status: string;
    duration: number;
  }>;
}

class ZoomService {
  private baseUrl = '';

  // Get Zoom analytics
  async getAnalytics(): Promise<ZoomAnalytics | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/zoom/analytics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Zoom analytics:', error);
      return null;
    }
  }

  // Get live meetings
  async getLiveMeetings(): Promise<ZoomMeeting[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/zoom/live-meetings`);
      return response.data.meetings || [];
    } catch (error) {
      console.error('Error fetching live meetings:', error);
      return [];
    }
  }

  // Get all meetings
  async getAllMeetings(from?: string, to?: string): Promise<ZoomMeeting[]> {
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const response = await axios.get(`${this.baseUrl}/api/zoom/meetings?${params.toString()}`);
      return response.data.meetings || [];
    } catch (error) {
      console.error('Error fetching meetings:', error);
      return [];
    }
  }

  // Get user attendance data
  async getUserAttendance(userId: string): Promise<UserAttendance | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/zoom/user-attendance/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user attendance:', error);
      return null;
    }
  }

  // Get meeting participants
  async getMeetingParticipants(meetingUuid: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/zoom/meeting/${meetingUuid}/participants`);
      return response.data.participants || [];
    } catch (error) {
      console.error('Error fetching meeting participants:', error);
      return [];
    }
  }

  // Get live meeting participants
  async getLiveMeetingParticipants(meetingId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/zoom/live-meeting/${meetingId}/participants`);
      return response.data.participants || [];
    } catch (error) {
      console.error('Error fetching live meeting participants:', error);
      return [];
    }
  }

  // Test Zoom connection
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/admin/test-zoom`, {
        headers: { 'x-admin-key': 'dev-admin-key' }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error testing Zoom connection:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.message || 'Connection failed'
      };
    }
  }

  // Get comprehensive dashboard data
  async getDashboardData(): Promise<{
    analytics: ZoomAnalytics | null;
    liveMeetings: ZoomMeeting[];
    recentMeetings: ZoomMeeting[];
  }> {
    try {
      const [analytics, liveMeetings, recentMeetings] = await Promise.all([
        this.getAnalytics(),
        this.getLiveMeetings(),
        this.getAllMeetings() // Gets recent meetings by default
      ]);

      return {
        analytics,
        liveMeetings,
        recentMeetings: recentMeetings.slice(0, 10) // Get last 10 meetings
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        analytics: null,
        liveMeetings: [],
        recentMeetings: []
      };
    }
  }

  // Format data for charts
  formatForCharts(meetings: ZoomMeeting[]): any {
    // Weekly attendance chart data
    const weeklyData = this.getWeeklyAttendanceData(meetings);
    
    // Time slot coverage data
    const slotCoverageData = this.getSlotCoverageData(meetings);
    
    // Geographic distribution (mock for now - would need participant location data)
    const geographicData = {
      labels: ['Africa', 'Americas', 'Europe', 'Asia', 'Oceania'],
      datasets: [{
        data: [45, 28, 18, 12, 5], // Estimated based on Global Intercessors context
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };

    return {
      weeklyAttendance: weeklyData,
      slotCoverage: slotCoverageData,
      geographic: geographicData
    };
  }

  private getWeeklyAttendanceData(meetings: ZoomMeeting[]) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const attendanceByDay = Array(7).fill(0);
    const totalSlotsByDay = Array(7).fill(8); // Assuming 8 slots per day

    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.start_time);
      const dayOfWeek = (meetingDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      if (dayOfWeek >= 0 && dayOfWeek < 7) {
        attendanceByDay[dayOfWeek] += meeting.participant_count || 0;
      }
    });

    return {
      labels: days,
      datasets: [{
        label: 'Attended',
        data: attendanceByDay,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }, {
        label: 'Total Slots',
        data: totalSlotsByDay,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      }]
    };
  }

  private getSlotCoverageData(meetings: ZoomMeeting[]) {
    const timeSlots = [
      '00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59',
      '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'
    ];
    
    const coverageBySlot = Array(8).fill(0);
    const attendanceBySlot = Array(8).fill(0);

    meetings.forEach(meeting => {
      const meetingTime = new Date(meeting.start_time);
      const hour = meetingTime.getHours();
      const slotIndex = Math.floor(hour / 3);
      
      if (slotIndex >= 0 && slotIndex < 8) {
        coverageBySlot[slotIndex]++;
        attendanceBySlot[slotIndex] += meeting.participant_count || 0;
      }
    });

    // Convert to percentages (assuming max 10 meetings per slot)
    const coveragePercentages = coverageBySlot.map(count => Math.min(100, (count / 10) * 100));
    const attendancePercentages = attendanceBySlot.map(count => Math.min(100, (count / 50) * 100)); // Assuming max 50 participants per slot

    return {
      labels: timeSlots,
      datasets: [{
        label: 'Coverage %',
        data: coveragePercentages,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1
      }, {
        label: 'Attendance %',
        data: attendancePercentages,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1
      }]
    };
  }

  // Get real-time activity feed
  async getActivityFeed(): Promise<any[]> {
    try {
      const liveMeetings = await this.getLiveMeetings();
      const recentMeetings = await this.getAllMeetings();
      
      const activities: any[] = [];

      // Add live meeting activities
      for (const meeting of liveMeetings) {
        const participants = await this.getLiveMeetingParticipants(meeting.id);
        
        activities.push({
          id: `live-${meeting.id}`,
          type: 'zoom_live',
          user: `${participants.length} participants`,
          action: 'are in active prayer',
          location: 'Global',
          time: new Date().toISOString(),
          slot_time: meeting.topic,
          icon: '🔴'
        });

        // Add individual participants
        participants.slice(0, 3).forEach((participant, index) => {
          activities.push({
            id: `participant-${meeting.id}-${index}`,
            type: 'zoom_join',
            user: participant.name || participant.user_email || 'Anonymous',
            action: 'joined prayer session',
            location: 'Unknown',
            time: participant.join_time || new Date().toISOString(),
            slot_time: meeting.topic,
            icon: '🙏'
          });
        });
      }

      // Add recent meeting activities
      recentMeetings.slice(0, 5).forEach(meeting => {
        const startTime = new Date(meeting.start_time);
        const isToday = startTime.toDateString() === new Date().toDateString();
        
        if (isToday) {
          activities.push({
            id: `meeting-${meeting.id}`,
            type: 'meeting_completed',
            user: `${meeting.participant_count || 0} participants`,
            action: 'completed prayer session',
            location: 'Global',
            time: meeting.start_time,
            slot_time: meeting.topic,
            icon: '✅'
          });
        }
      });

      // Sort by time (most recent first)
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

    } catch (error) {
      console.error('Error getting activity feed:', error);
      return [];
    }
  }
}

export const zoomService = new ZoomService();
