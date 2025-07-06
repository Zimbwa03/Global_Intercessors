import { createClient } from '@supabase/supabase-js';

// Using your actual Supabase credentials
const supabaseUrl = 'https://jncxejkssgvxhdurmvxy.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuY3hlamtzc2d2eGhkdXJteHkiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzE3ODM2NzkwLCJleHAiOjIwMzM0MTI3OTB9.4FwwQGIrTRWbq4_WrQqo7zTJgbLDLGpMTFXVVmr4MgE';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixAttendance() {
  console.log('🔧 Creating attendance record for your 18-minute prayer session...');
  
  const now = new Date();
  const attendanceData = {
    user_id: 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f',
    user_email: 'neezykidngoni@gmail.com',
    slot_time: '06:30–07:00',
    attended_at: now.toISOString(),
    duration_minutes: 18,
    session_type: 'zoom',
    meeting_id: 'completed_session_' + Date.now(),
    attendance_percentage: 100,
    prayer_slot_id: 3
  };

  try {
    // Insert attendance record
    const { data: attendanceResult, error: attendanceError } = await supabase
      .from('attendance_log')
      .insert([attendanceData])
      .select();
    
    if (attendanceError) {
      console.error('❌ Attendance error:', attendanceError);
      return;
    }
    
    console.log('✅ Attendance record created:', attendanceResult);
    
    // Also create prayer session record
    const sessionData = {
      user_id: 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f',
      user_email: 'neezykidngoni@gmail.com',
      slot_time: '06:30–07:00',
      date: now.toISOString().split('T')[0],
      duration_minutes: 18,
      session_type: 'zoom',
      completed: true
    };
    
    const { data: sessionResult, error: sessionError } = await supabase
      .from('prayer_sessions')
      .insert([sessionData])
      .select();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else {
      console.log('✅ Prayer session created:', sessionResult);
    }
    
    console.log('🎉 Your 18-minute prayer session is now recorded!');
    console.log('📊 Dashboard will show updated attendance rate');
    
  } catch (err) {
    console.error('❌ Connection error:', err);
  }
}

fixAttendance();