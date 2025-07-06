import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jncxejkssgvxhdurmvxy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuY3hlamtzc2d2eGhkdXJteHkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxNzgzNjc5MCwiZXhwIjoyMDMzNDEyNzkwfQ.pUE_wJEUdAhqP8cXJ2B5xGxGiJPNPmFx_QKn0wGOxJw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function logSession() {
  console.log('🎉 Logging your completed 18-minute prayer session...');
  
  const now = new Date();
  const sessionData = {
    user_id: 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f',
    user_email: 'neezykidngoni@gmail.com',
    slot_time: '06:30–07:00',
    attended_at: now.toISOString(),
    duration_minutes: 18,
    session_type: 'zoom',
    meeting_id: 'completed_' + Date.now(),
    attendance_percentage: 100,
    prayer_slot_id: 3
  };

  try {
    const { data, error } = await supabase
      .from('attendance_log')
      .insert([sessionData]);
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log('✅ Prayer session logged successfully!');
    console.log('📊 Duration: 18 minutes (exceeded 15-minute minimum)');
    console.log('🎯 Attendance: 100% for your 06:30–07:00 slot');
    
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

logSession();