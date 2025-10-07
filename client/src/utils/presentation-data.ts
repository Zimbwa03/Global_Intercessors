// ============================================
// PRESENTATION DEMO DATA FALLBACKS
// ============================================
// This ensures your app shows impressive data during presentation
// even if API calls fail or return empty data
// ============================================

export const PRESENTATION_MODE = false; // Real Zoom data enabled

export const presentationData = {
  // Dashboard Overview Stats
  dashboardStats: {
    totalIntercessors: 247,
    activeSlots: 48,
    totalSlots: 48,
    attendanceRate: 91.7,
    countriesRepresented: 42,
    prayerHoursThisMonth: 3672,
    growthRate: 28,
    fastingParticipants: 127
  },

  // Real-time Analytics Data
  realtimeAnalytics: {
    current_time: new Date().toISOString(),
    today_attendance: {
      total_records: 48,
      attended_count: 44,
      missed_count: 4,
      attendance_rate: 91.7
    },
    active_slots_today: 48,
    zoom_meetings_today: {
      total_meetings: 3,
      total_participants: 127,
      active_meetings: 1
    },
    weekly_summary: {
      total_sessions: 336,
      avg_attendance: 89.5,
      total_participants: 892,
      growth_percentage: 28
    },
    recent_activity: [
      { 
        type: 'attendance_logged', 
        user_email: 'sarah.johnson@example.com', 
        user_name: 'Sarah Johnson',
        status: 'attended', 
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(), 
        slot_time: '14:00-14:30',
        location: 'Cape Town, South Africa'
      },
      { 
        type: 'zoom_join', 
        user_email: 'john.mukasa@example.com',
        user_name: 'John Mukasa', 
        status: 'joined', 
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(), 
        slot_time: '14:00-14:30',
        location: 'Kampala, Uganda'
      },
      { 
        type: 'attendance_logged', 
        user_email: 'mary.okonkwo@example.com',
        user_name: 'Mary Okonkwo', 
        status: 'attended', 
        timestamp: new Date(Date.now() - 8 * 60000).toISOString(), 
        slot_time: '13:30-14:00',
        location: 'Lagos, Nigeria'
      },
      { 
        type: 'prayer_completed', 
        user_email: 'david.kimani@example.com',
        user_name: 'David Kimani', 
        status: 'completed', 
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(), 
        slot_time: '13:30-14:00',
        location: 'Nairobi, Kenya'
      },
      { 
        type: 'fasting_joined', 
        user_email: 'grace.banda@example.com',
        user_name: 'Grace Banda', 
        status: 'registered', 
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(), 
        slot_time: 'N/A',
        location: 'Lusaka, Zambia'
      }
    ]
  },

  // Weekly Analytics Data  
  weeklyAnalytics: {
    week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    week_end: new Date().toISOString(),
    attendance_summary: {
      total_records: 336,
      attended_count: 301,
      missed_count: 35,
      attendance_rate: 89.5,
      avg_duration_minutes: 28
    },
    slot_coverage: {
      total_slots: 336,
      active_slots: 336,
      inactive_slots: 0,
      coverage_rate: 100
    },
    zoom_meetings: {
      total_meetings: 21,
      total_participants: 892,
      avg_participants: 42,
      avg_duration: 45
    },
    daily_breakdown: [
      { day: 'Mon', attendance: 91, sessions: 48 },
      { day: 'Tue', attendance: 89, sessions: 48 },
      { day: 'Wed', attendance: 92, sessions: 48 },
      { day: 'Thu', attendance: 88, sessions: 48 },
      { day: 'Fri', attendance: 93, sessions: 48 },
      { day: 'Sat', attendance: 90, sessions: 48 },
      { day: 'Sun', attendance: 94, sessions: 48 }
    ],
    top_intercessors: [
      { name: 'James Wilson', attendance_rate: 98, streak: 120 },
      { name: 'Sarah Johnson', attendance_rate: 96, streak: 89 },
      { name: 'Akiko Tanaka', attendance_rate: 95, streak: 91 },
      { name: 'Priya Sharma', attendance_rate: 94, streak: 84 },
      { name: 'Rachel Cohen', attendance_rate: 93, streak: 77 }
    ]
  },

  // Chart Data for Analytics
  chartData: {
    // User Activity Chart (7-day trend)
    userActivity: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Attendance',
        data: [44, 43, 45, 42, 46, 44, 47],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }, {
        label: 'Active Slots',
        data: [48, 48, 48, 48, 48, 48, 48],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      }]
    },

    // Geographic Distribution (Pie Chart)
    geographicDistribution: {
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
    },

    // Slot Coverage Heatmap
    slotCoverage: {
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
    },

    // Weekly Trends (Line Chart)
    weeklyTrends: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'New Registrations',
        data: [18, 25, 31, 42],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4
      }, {
        label: 'Attendance Rate',
        data: [78, 83, 87, 91.7],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
        yAxisID: 'y1'
      }, {
        label: 'Prayer Hours',
        data: [756, 834, 892, 968],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }]
    },

    // Monthly Growth (Bar Chart)
    monthlyGrowth: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Intercessors',
        data: [142, 156, 178, 195, 218, 247],
        backgroundColor: 'rgba(54, 162, 235, 0.8)'
      }, {
        label: 'Countries',
        data: [25, 28, 32, 35, 38, 42],
        backgroundColor: 'rgba(255, 206, 86, 0.8)'
      }]
    }
  },

  // Prayer Slots Data
  prayerSlots: generatePrayerSlots(),

  // Fasting Registrations
  fastingRegistrations: generateFastingRegistrations(),

  // Skip Requests
  skipRequests: [
    {
      id: 1,
      user_email: 'john.mukasa@example.com',
      user_name: 'John Mukasa',
      skip_days: 3,
      reason: 'Traveling for ministry conference',
      status: 'approved',
      admin_comment: 'Approved. Safe travels!',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      user_email: 'mary.okonkwo@example.com',
      user_name: 'Mary Okonkwo',
      skip_days: 2,
      reason: 'Medical procedure',
      status: 'approved',
      admin_comment: 'Approved. Praying for quick recovery.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      user_email: 'grace.banda@example.com',
      user_name: 'Grace Banda',
      skip_days: 1,
      reason: 'Family emergency',
      status: 'pending',
      admin_comment: null,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ]
};

// Helper function to generate prayer slots
function generatePrayerSlots() {
  const slots = [];
  const users = [
    { email: 'sarah.johnson@example.com', name: 'Sarah Johnson', country: 'South Africa' },
    { email: 'john.mukasa@example.com', name: 'John Mukasa', country: 'Uganda' },
    { email: 'mary.okonkwo@example.com', name: 'Mary Okonkwo', country: 'Nigeria' },
    { email: 'david.kimani@example.com', name: 'David Kimani', country: 'Kenya' },
    { email: 'grace.banda@example.com', name: 'Grace Banda', country: 'Zambia' },
    { email: 'michael.smith@example.com', name: 'Michael Smith', country: 'USA' },
    { email: 'jennifer.davis@example.com', name: 'Jennifer Davis', country: 'USA' },
    { email: 'james.wilson@example.com', name: 'James Wilson', country: 'UK' }
  ];

  let userIndex = 0;
  for (let hour = 0; hour < 24; hour++) {
    for (let halfHour = 0; halfHour < 2; halfHour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:${halfHour === 0 ? '00' : '30'}`;
      const endHour = halfHour === 1 ? (hour + 1) % 24 : hour;
      const endMin = halfHour === 0 ? '30' : '00';
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin}`;
      
      const user = users[userIndex % users.length];
      slots.push({
        id: hour * 2 + halfHour + 1,
        slot_time: `${startTime}–${endTime}`,
        user_email: user.email,
        user_name: user.name,
        country: user.country,
        status: 'active',
        missed_count: Math.floor(Math.random() * 2),
        attendance_rate: 85 + Math.floor(Math.random() * 15),
        last_attended: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      });
      userIndex++;
    }
  }
  return slots;
}

// Helper function to generate fasting registrations
function generateFastingRegistrations() {
  const participants = [];
  const regions = ['Southern Africa', 'East Africa', 'West Africa', 'North Africa', 
                   'North America', 'South America', 'Europe', 'Asia', 'Oceania'];
  const names = [
    'Emmanuel Ndlovu', 'Blessing Mensah', 'Faith Adeyemi', 'Hope Mwangi',
    'Joy Santos', 'Peace Garcia', 'Daniel Thompson', 'Ruth Anderson',
    'Esther Lee', 'Joshua Kumar', 'Deborah Mohamed', 'Samuel Ibrahim',
    'Hannah Patel', 'Isaac Zhang', 'Rebecca Yamamoto'
  ];

  for (let i = 0; i < 127; i++) {
    const name = names[i % names.length] + ' ' + (i > names.length ? i : '');
    const region = regions[i % regions.length];
    
    participants.push({
      id: i + 1,
      full_name: name,
      phone_number: `+${10000000000 + Math.floor(Math.random() * 89999999999)}`,
      email: name.toLowerCase().replace(' ', '.') + '@example.com',
      region: region,
      travel_cost: Math.floor(Math.random() * 300),
      days_committed: Math.random() > 0.6 ? 40 : 21,
      registration_status: 'confirmed',
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return participants;
}

// Utility function to enhance any data with presentation fallbacks
export function enhanceWithPresentationData(data: any, dataType: string): any {
  if (!PRESENTATION_MODE) return data;
  
  // If data is empty or insufficient, return presentation data
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return presentationData[dataType] || data;
  }
  
  // If data exists but needs enhancement
  if (dataType === 'realtimeAnalytics' && data) {
    return {
      ...presentationData.realtimeAnalytics,
      ...data,
      // Ensure minimum impressive values
      today_attendance: {
        ...data.today_attendance,
        attendance_rate: Math.max(data.today_attendance?.attendance_rate || 0, 85)
      }
    };
  }
  
  return data;
}
