// ============================================
// FRONTEND-ONLY ZOOM & ANALYTICS DATA
// ============================================
// Add impressive data directly in components
// No backend changes needed!
// ============================================

export const PRESENTATION_MODE = true; // Set to false after presentation

// ============================================
// ZOOM DATA FOR PRAYER SLOT PANEL
// ============================================

export const getZoomPanelData = () => ({
  // Current session data
  currentParticipants: PRESENTATION_MODE ? [
    { name: 'Sarah Johnson', location: 'Cape Town, SA', joinTime: '2 min ago' },
    { name: 'John Mukasa', location: 'Kampala, UG', joinTime: '5 min ago' },
    { name: 'Mary Okonkwo', location: 'Lagos, NG', joinTime: '8 min ago' },
    { name: 'David Kimani', location: 'Nairobi, KE', joinTime: '10 min ago' },
    { name: '38 others...', location: 'Various', joinTime: 'In session' }
  ] : [],
  
  // Session stats
  participantCount: PRESENTATION_MODE ? 42 : 0,
  averageDuration: PRESENTATION_MODE ? 45 : 0,
  totalSessions: PRESENTATION_MODE ? 124 : 0,
  
  // Meeting link (keep your existing)
  joinLink: 'https://zoom.us/j/8392387599?pwd=GlobalIntercessors2024'
});

// ============================================
// DASHBOARD STATS DATA
// ============================================

export const getDashboardStats = () => ({
  totalIntercessors: PRESENTATION_MODE ? 247 : 0,
  activeSlots: PRESENTATION_MODE ? 48 : 0,
  totalSlots: 48,
  attendanceRate: PRESENTATION_MODE ? 92.3 : 0,
  avgZoomParticipants: PRESENTATION_MODE ? 42 : 0,
  totalZoomMeetings: PRESENTATION_MODE ? 124 : 0,
  prayerHoursThisMonth: PRESENTATION_MODE ? 3672 : 0,
  
  // Today's stats
  todayAttended: PRESENTATION_MODE ? 44 : 0,
  todayTotalSlots: 48,
  todayAttendanceRate: PRESENTATION_MODE ? 91.7 : 0,
  
  // Growth metrics
  newSlotsThisWeek: PRESENTATION_MODE ? 12 : 0,
  activeUsersThisWeek: PRESENTATION_MODE ? 247 : 0,
  attendanceGrowth: PRESENTATION_MODE ? '+8.2%' : '0%'
});

// ============================================
// ANALYTICS CHART DATA
// ============================================

export const getAnalyticsData = () => ({
  // Weekly Attendance Chart
  weeklyAttendance: PRESENTATION_MODE ? {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Attended',
      data: [44, 42, 45, 43, 46, 44, 45],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4
    }, {
      label: 'Total Slots',
      data: [48, 48, 48, 48, 48, 48, 48],
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      tension: 0.4
    }]
  } : { labels: [], datasets: [] },
  
  // Time Slot Coverage Chart
  slotCoverage: PRESENTATION_MODE ? {
    labels: ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59', 
             '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'],
    datasets: [{
      label: 'Coverage %',
      data: [88, 85, 92, 95, 94, 96, 93, 91],
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }, {
      label: 'Attendance %',
      data: [85, 82, 89, 93, 91, 94, 90, 88],
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderColor: 'rgb(255, 99, 132)',
      borderWidth: 1
    }]
  } : { labels: [], datasets: [] },
  
  // Geographic Distribution Pie Chart
  geographicDistribution: PRESENTATION_MODE ? {
    labels: ['Africa', 'Americas', 'Europe', 'Asia', 'Oceania'],
    datasets: [{
      data: [87, 62, 49, 37, 12],
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
  } : { labels: [], datasets: [] },
  
  // Weekly Growth Trend
  weeklyTrend: PRESENTATION_MODE ? {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Attendance Rate %',
      data: [78, 83, 87, 92],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4
    }, {
      label: 'Active Users',
      data: [185, 201, 223, 247],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      tension: 0.4
    }]
  } : { labels: [], datasets: [] }
});

// ============================================
// PRAYER SLOT ENHANCED DATA
// ============================================

export const getPrayerSlotData = (userSlot?: any) => ({
  attendanceRate: PRESENTATION_MODE ? 89 + Math.floor(Math.random() * 10) : (userSlot?.attendance_rate || 0),
  lastAttended: PRESENTATION_MODE ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : userSlot?.last_attended,
  missedCount: PRESENTATION_MODE ? Math.floor(Math.random() * 2) : (userSlot?.missed_count || 0),
  totalSessions: PRESENTATION_MODE ? 30 : (userSlot?.total_sessions || 0),
  attendedSessions: PRESENTATION_MODE ? 27 + Math.floor(Math.random() * 3) : (userSlot?.attended_sessions || 0),
  zoomParticipants: PRESENTATION_MODE ? 35 + Math.floor(Math.random() * 15) : 0,
  averageDuration: PRESENTATION_MODE ? 42 + Math.floor(Math.random() * 8) : 0,
  
  // Session history
  recentSessions: PRESENTATION_MODE ? [
    { date: '2025-01-15', status: 'attended', duration: 45, participants: 38 },
    { date: '2025-01-14', status: 'attended', duration: 42, participants: 41 },
    { date: '2025-01-13', status: 'attended', duration: 48, participants: 35 },
    { date: '2025-01-12', status: 'attended', duration: 44, participants: 39 },
    { date: '2025-01-11', status: 'missed', duration: 0, participants: 0 }
  ] : []
});

// ============================================
// ACTIVITY FEED DATA
// ============================================

export const getActivityFeed = () => PRESENTATION_MODE ? [
  {
    id: 1,
    type: 'zoom_join',
    user: 'Sarah Johnson',
    action: 'joined Zoom prayer session',
    location: 'Cape Town, SA',
    time: new Date(Date.now() - 2 * 60000).toISOString(),
    slot_time: '14:00-14:30',
    icon: '🎥'
  },
  {
    id: 2,
    type: 'attendance_logged',
    user: 'John Mukasa',
    action: 'completed prayer slot',
    location: 'Kampala, UG',
    time: new Date(Date.now() - 5 * 60000).toISOString(),
    slot_time: '13:30-14:00',
    icon: '✅'
  },
  {
    id: 3,
    type: 'zoom_join',
    user: 'Mary Okonkwo',
    action: 'joined morning session',
    location: 'Lagos, NG',
    time: new Date(Date.now() - 10 * 60000).toISOString(),
    slot_time: '06:00-06:30',
    icon: '🌅'
  },
  {
    id: 4,
    type: 'attendance_logged',
    user: 'David Kimani',
    action: 'marked attendance',
    location: 'Nairobi, KE',
    time: new Date(Date.now() - 15 * 60000).toISOString(),
    slot_time: '05:30-06:00',
    icon: '📝'
  },
  {
    id: 5,
    type: 'zoom_active',
    user: '42 others',
    action: 'are in active prayer',
    location: 'Global',
    time: new Date(Date.now() - 1 * 60000).toISOString(),
    slot_time: 'Various',
    icon: '🙏'
  }
] : [];

// ============================================
// ZOOM MEETING DETAILS
// ============================================

export const getZoomMeetingDetails = () => PRESENTATION_MODE ? {
  meetingId: '8392387599',
  topic: 'Global Intercessors Prayer Meeting',
  startTime: new Date().toISOString(),
  duration: 45,
  participantCount: 42,
  participants: [
    { name: 'Sarah Johnson', joinTime: '14:08:00', location: 'Cape Town, SA' },
    { name: 'John Mukasa', joinTime: '14:05:00', location: 'Kampala, UG' },
    { name: 'Mary Okonkwo', joinTime: '14:02:00', location: 'Lagos, NG' },
    { name: 'David Kimani', joinTime: '14:00:00', location: 'Nairobi, KE' },
    { name: 'Elizabeth Chen', joinTime: '13:58:00', location: 'Singapore' },
    { name: 'Michael Brown', joinTime: '13:55:00', location: 'London, UK' }
  ],
  meetingStats: {
    totalMeetings: 124,
    totalParticipants: 3672,
    averageDuration: 45,
    averageParticipants: 42
  }
} : null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const formatAttendanceRate = (rate: number) => `${rate.toFixed(1)}%`;
export const formatParticipants = (count: number) => count.toLocaleString();
export const formatDuration = (minutes: number) => `${minutes} min`;
export const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ============================================
// MAIN EXPORT FOR EASY USE
// ============================================

export const PresentationData = {
  zoom: getZoomPanelData,
  dashboard: getDashboardStats,
  analytics: getAnalyticsData,
  prayerSlot: getPrayerSlotData,
  activityFeed: getActivityFeed,
  zoomMeeting: getZoomMeetingDetails,
  utils: {
    formatAttendanceRate,
    formatParticipants,
    formatDuration,
    formatTimeAgo
  }
};

export default PresentationData;
