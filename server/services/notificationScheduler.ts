import { supabaseAdmin } from '../supabase';
import cron from 'node-cron';

class NotificationScheduler {
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting notification scheduler...');

    // Check for upcoming prayer slots every minute
    cron.schedule('* * * * *', async () => {
      await this.checkUpcomingPrayerSlots();
    }, { timezone: 'Africa/Harare' });

    // Check for missed slots every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkMissedSlots();
    }, { timezone: 'Africa/Harare' });

    // Send daily reminders at 6 AM
    cron.schedule('0 6 * * *', async () => {
      await this.sendDailyReminders();
    }, { timezone: 'Africa/Harare' });
  }

  private async checkUpcomingPrayerSlots() {
    try {
      // Compute times in Africa/Harare local time
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Harare' });
      const partsNow = fmt.formatToParts(now);
      const currentHours = Number(partsNow.find(p => p.type === 'hour')?.value || '0');
      const currentMinutes = Number(partsNow.find(p => p.type === 'minute')?.value || '0');
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      // Get active prayer slots
      const { data: slots, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching prayer slots:', error);
        return;
      }

      for (const slot of slots || []) {
        const slotTime = this.parseSlotTime(slot.slot_time);
        if (!slotTime) continue;

        // Minutes since midnight for slot
        const slotTotalMinutes = slotTime.hours * 60 + slotTime.minutes;

        // Targets: start, 15-min before, 5-min before
        const reminders: Array<{ label: 'start' | 15 | 5; minutes: number }> = [
          { label: 'start', minutes: slotTotalMinutes },
          { label: 15, minutes: (slotTotalMinutes - 15 + 1440) % 1440 },
          { label: 5, minutes: (slotTotalMinutes - 5 + 1440) % 1440 },
        ];

        for (const r of reminders) {
          const diff = Math.abs(currentTotalMinutes - r.minutes);
          const minDiff = Math.min(diff, 1440 - diff);
          if (minDiff <= 1) {
            if (r.label === 'start') await this.sendPrayerStartNotification(slot);
            else await this.sendPrayerReminder(slot, r.label);
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming prayer slots:', error);
    }
  }

  private async checkMissedSlots() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Get today's attendance records
      const { data: attendance, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('date', today);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        return;
      }

      // Get active prayer slots
      const { data: slots, error: slotsError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        return;
      }

      for (const slot of slots || []) {
        const slotTime = this.parseSlotTime(slot.slot_time);
        if (!slotTime) continue;

        const todaySlotTime = new Date();
        todaySlotTime.setHours(slotTime.hours, slotTime.minutes + 30, 0, 0); // 30 minutes after start

        // Check if slot time has passed and no attendance recorded
        if (todaySlotTime <= now) {
          const hasAttendance = attendance?.some(a => 
            a.user_id === slot.user_id && a.date === today
          );

          if (!hasAttendance) {
            await this.markSlotMissed(slot);
          }
        }
      }
    } catch (error) {
      console.error('Error checking missed slots:', error);
    }
  }

  private async sendPrayerReminder(slot: any, minutesUntil: number) {
    try {
      console.log(`📢 Sending ${minutesUntil}-minute prayer reminder for slot ${slot.slot_time} to user ${slot.user_email}`);
      
      // Get user's FCM token for push notifications
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('fcm_token, notification_preferences')
        .eq('id', slot.user_id)
        .single();

      // Create notification record for real-time updates
      await supabaseAdmin
        .from('updates')
        .insert({
          title: `Prayer Time Approaching`,
          description: `Your prayer slot (${slot.slot_time}) starts in ${minutesUntil} minutes. Prepare your heart for intercession and join the global prayer coverage.`,
          type: 'prayer_reminder',
          priority: 'high',
          is_active: true,
          user_specific: slot.user_id,
          created_at: new Date().toISOString()
        });

      console.log(`✅ Prayer reminder notification created for user ${slot.user_email}`);

    } catch (error) {
      console.error('Error sending prayer reminder:', error);
    }
  }

  private async sendPrayerStartNotification(slot: any) {
    try {
      console.log(`🚀 Sending prayer start notification for slot ${slot.slot_time} to user ${slot.user_email}`);
      
      await supabaseAdmin
        .from('updates')
        .insert({
          title: `Prayer Time Has Begun`,
          description: `Your prayer slot (${slot.slot_time}) has started. Join the global prayer coverage now! Your fellow intercessors are counting on you.`,
          type: 'prayer_start',
          priority: 'urgent',
          is_active: true,
          user_specific: slot.user_id,
          created_at: new Date().toISOString()
        });

      console.log(`✅ Prayer start notification created for user ${slot.user_email}`);

    } catch (error) {
      console.error('Error sending prayer start notification:', error);
    }
  }

  private async markSlotMissed(slot: any) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Record missed attendance
      await supabaseAdmin
        .from('attendance_log')
        .insert({
          user_id: slot.user_id,
          user_email: slot.user_email,
          slot_time: slot.slot_time,
          status: 'absent',
          date: today,
          created_at: new Date().toISOString()
        });

      // Update missed count
      const newMissedCount = (slot.missed_count || 0) + 1;
      await supabaseAdmin
        .from('prayer_slots')
        .update({ 
          missed_count: newMissedCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', slot.id);

      // Send missed slot notification
      await supabaseAdmin
        .from('updates')
        .insert({
          title: 'Prayer Slot Missed',
          description: `You missed your prayer slot (${slot.slot_time}). This is missed session #${newMissedCount}. Your slot may be reassigned after 3 missed sessions.`,
          type: 'missed_slot',
          priority: newMissedCount >= 3 ? 'urgent' : 'high',
          is_active: true,
          created_at: new Date().toISOString()
        });

      console.log(`Marked slot ${slot.slot_time} as missed for user ${slot.user_email}`);
    } catch (error) {
      console.error('Error marking slot as missed:', error);
    }
  }

  private async sendDailyReminders() {
    try {
      await supabaseAdmin
        .from('updates')
        .insert({
          title: 'Daily Prayer Reminder',
          description: 'Good morning! Remember your prayer commitment today. Check your slot time and prepare your heart for intercession.',
          type: 'daily_reminder',
          priority: 'normal',
          is_active: true,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error sending daily reminder:', error);
    }
  }

  private parseSlotTime(slotTime: string): { hours: number; minutes: number } | null {
    try {
      const [startTime] = slotTime.split('–');
      const [hours, minutes] = startTime.split(':').map(Number);
      return { hours, minutes };
    } catch (error) {
      console.error('Error parsing slot time:', slotTime, error);
      return null;
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Notification scheduler stopped');
  }
}

export const notificationScheduler = new NotificationScheduler();