const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jncxejkssgvxhdurmvxy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuY3hlamtzc2d2eGhkdXJteHkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzgzNjc5MCwiZXhwIjoyMDMzNDEyNzkwfQ.pUE_wJEUdAhqP8cXJ2B5xGxGiJPNPmFx_QKn0wGOxJw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function logCurrentAttendance() {
  console.log('🔄 Logging your current prayer session attendance...');
  
  const now = new Date();
  const attendanceData = {
    user_id: 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f',
    user_email: 'neezykidngoni@gmail.com',
    slot_time: '06:30–07:00',
    attended_at: now.toISOString(),
    duration_minutes: 15,
    session_type: 'zoom',
    meeting_id: 'live_session_' + Date.now(),
    attendance_percentage: 100,
    prayer_slot_id: 3
  };

  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .insert([attendanceData]);
    
    if (error) {
      console.error('❌ Error logging attendance:', error);
      return;
    }
    
    console.log('✅ Successfully logged your attendance:', attendanceData);
    
    // Also log to prayer sessions
    const sessionData = {
      user_id: 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f',
      user_email: 'neezykidngoni@gmail.com',
      slot_time: '06:30–07:00',
      date: now.toISOString().split('T')[0],
      duration_minutes: 15,
      session_type: 'zoom',
      completed: true
    };
    
    const { data: sessionResult, error: sessionError } = await supabase
      .from('prayer_sessions')
      .insert([sessionData]);
    
    if (sessionError) {
      console.error('❌ Error logging prayer session:', sessionError);
    } else {
      console.log('✅ Successfully logged prayer session');
    }
    
  } catch (err) {
    console.error('❌ Failed to log attendance:', err);
  }
}

logCurrentAttendance();