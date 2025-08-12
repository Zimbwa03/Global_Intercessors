
import { supabase } from '../supabase';
import cron from 'node-cron';

interface PrayerSlot {
  id: number;
  user_id: string;
  user_email: string;
  slot_time: string;
  status: string;
  phone_number?: string;
  reminder_time?: number; // minutes before slot
  custom_reminders?: boolean;
}

interface UserProfile {
  id: string;
  full_name?: string;
  phone_number?: string;
  timezone?: string;
}

class AdvancedReminderSystem {
  private whatsappBot: any;
  private activeReminders = new Map<string, NodeJS.Timeout>();
  private deepSeekApiKey = process.env.DEEPSEEK_API_KEY;

  constructor(whatsappBot: any) {
    this.whatsappBot = whatsappBot;
    this.initializeReminderSystem();
  }

  private initializeReminderSystem() {
    console.log('🔔 Initializing Advanced Reminder System...');
    
    // Schedule daily morning messages at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      await this.sendDailyMorningMessages();
    }, {
      timezone: "Africa/Harare"
    });

    // Check for upcoming prayer slots every minute
    cron.schedule('* * * * *', async () => {
      await this.checkUpcomingSlots();
    });

    // Initialize existing reminders
    this.scheduleAllActiveReminders();
  }

  private async generateVerseOfTheDay(): Promise<string> {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `Generate a powerful, encouraging Bible verse for today with a brief 2-sentence reflection about prayer and intercession. Format: "Verse Reference - Verse Text\n\nReflection: [2 sentences about prayer/intercession]"`
          }],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        // Fallback verses if API fails
        const fallbackVerses = [
          "Philippians 4:6-7 - Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.\n\nReflection: Prayer is our direct line to the throne of grace, where we can cast all our cares upon Him. As intercessors, we stand in the gap, bringing peace and breakthrough through our faithful petitions.",
          "1 Timothy 2:1-2 - I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people—for kings and all those in authority, that we may live peaceful and quiet lives in all godliness and holiness.\n\nReflection: Our prayers have the power to influence nations and change the course of history. Every intercession we make is a seed planted in the spiritual realm that will bear fruit in due season.",
          "James 5:16 - The prayer of a righteous person is powerful and effective.\n\nReflection: Your prayers matter more than you realize—they move the heart of God and shake the foundations of heaven. Stand firm in your calling as an intercessor, knowing that your faithful prayers create lasting impact."
        ];
        return fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
      }
    } catch (error) {
      console.error('❌ Error generating verse of the day:', error);
      return "Isaiah 40:31 - But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.\n\nReflection: In prayer, we find our strength renewed and our spirits lifted. Your commitment to intercession is a testament to your hope in the Lord's faithfulness.";
    }
  }

  private async sendDailyMorningMessages() {
    console.log('🌅 Sending daily morning messages...');

    try {
      // Get all active prayer slots with user details
      const { data: prayerSlots, error } = await supabase
        .from('prayer_slots')
        .select(`
          *,
          user_profiles!inner(full_name, phone_number, timezone)
        `)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Error fetching prayer slots for morning messages:', error);
        return;
      }

      const verseOfTheDay = await this.generateVerseOfTheDay();

      for (const slot of prayerSlots || []) {
        const userProfile = slot.user_profiles;
        if (!userProfile?.phone_number) continue;

        const userName = userProfile.full_name || slot.user_email?.split('@')[0] || 'Beloved Intercessor';
        const slotTime = this.formatSlotTime(slot.slot_time);

        const morningMessage = `🌅 *Good Morning, ${userName}!* 🌅

🙏 *Your Prayer Assignment Today*
⏰ Slot: *${slotTime}*
📍 Status: *Active & Ready*

✨ *Today's Word from Heaven* ✨
${verseOfTheDay}

💪 *Remember:* You are chosen for such a time as this. Your prayers today will:
• Open heavenly gates 🚪
• Release breakthrough 💥
• Bring divine intervention 🕊️

🔔 *Reminder Settings:* Type *"remind 30"* to set a 30-minute reminder, or *"remind off"* to disable reminders.

Go forth and intercede with authority! 👑

_Global Intercessors - Standing in the Gap_`;

        await this.whatsappBot.sendMessage(userProfile.phone_number, morningMessage);
        console.log(`✅ Morning message sent to ${userName} (${userProfile.phone_number})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Error sending daily morning messages:', error);
    }
  }

  private async checkUpcomingSlots() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Get all active slots with reminder settings
      const { data: prayerSlots, error } = await supabase
        .from('prayer_slots')
        .select(`
          *,
          user_profiles!inner(full_name, phone_number, timezone)
        `)
        .eq('status', 'active')
        .not('user_profiles.phone_number', 'is', null);

      if (error) {
        console.error('❌ Error fetching prayer slots for reminders:', error);
        return;
      }

      for (const slot of prayerSlots || []) {
        await this.processSlotReminder(slot, currentTime);
      }

    } catch (error) {
      console.error('❌ Error checking upcoming slots:', error);
    }
  }

  private async processSlotReminder(slot: any, currentTime: string) {
    try {
      const userProfile = slot.user_profiles;
      const reminderMinutes = slot.reminder_time || 30; // Default 30 minutes
      
      // Parse slot time
      const slotStartTime = this.parseSlotTime(slot.slot_time);
      if (!slotStartTime) return;

      // Calculate reminder time
      const reminderTime = new Date(slotStartTime.getTime() - (reminderMinutes * 60 * 1000));
      const reminderTimeStr = reminderTime.toTimeString().slice(0, 5);

      // Check if it's time to send reminder
      if (currentTime === reminderTimeStr) {
        const reminderKey = `${slot.id}-${reminderTimeStr}`;
        
        // Prevent duplicate reminders
        if (this.activeReminders.has(reminderKey)) return;

        await this.sendSlotReminder(slot, userProfile, reminderMinutes);
        
        // Mark this reminder as sent
        this.activeReminders.set(reminderKey, setTimeout(() => {
          this.activeReminders.delete(reminderKey);
        }, 60000)); // Remove after 1 minute
      }

    } catch (error) {
      console.error('❌ Error processing slot reminder:', error);
    }
  }

  private async sendSlotReminder(slot: any, userProfile: any, reminderMinutes: number) {
    try {
      const userName = userProfile.full_name || slot.user_email?.split('@')[0] || 'Beloved Intercessor';
      const slotTime = this.formatSlotTime(slot.slot_time);

      const reminderMessage = `🔔 *PRAYER SLOT REMINDER* 🔔

👋 Hello ${userName}!

⏰ *Your prayer slot starts in ${reminderMinutes} minutes*
🕐 Time: *${slotTime}*
📅 Date: *${new Date().toLocaleDateString()}*

🎯 *Preparation Checklist:*
✅ Find a quiet space
✅ Have your prayer list ready
✅ Connect with God's heart
✅ Join your Zoom meeting

💡 *Quick Prayer Focus:*
• Pray for breakthrough in your assigned region
• Intercede for church leaders worldwide
• Seek God's guidance for current global issues

🚀 *Remember:* Your prayers matter! You're not just attending a meeting—you're participating in a divine strategy session.

_"The effective, fervent prayer of a righteous man avails much." - James 5:16_

🔗 Need to adjust reminder time? Reply with *"remind [minutes]"* (e.g., "remind 15")

Global Intercessors ⚔️ Standing Strong!`;

      await this.whatsappBot.sendMessage(userProfile.phone_number, reminderMessage);
      console.log(`🔔 Reminder sent to ${userName} for ${slotTime} slot (${reminderMinutes} minutes before)`);

      // Log the reminder in the database
      await this.logReminderSent(slot.id, slot.user_id, reminderMinutes);

    } catch (error) {
      console.error('❌ Error sending slot reminder:', error);
    }
  }

  private async logReminderSent(slotId: number, userId: string, reminderMinutes: number) {
    try {
      await supabase
        .from('reminder_logs')
        .insert({
          slot_id: slotId,
          user_id: userId,
          reminder_type: 'slot_reminder',
          minutes_before: reminderMinutes,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
    } catch (error) {
      console.error('❌ Error logging reminder:', error);
    }
  }

  private parseSlotTime(slotTime: string): Date | null {
    try {
      // Handle different slot time formats
      let timeStr = '';
      if (slotTime.includes('–')) {
        timeStr = slotTime.split('–')[0].trim();
      } else if (slotTime.includes('-')) {
        timeStr = slotTime.split('-')[0].trim();
      } else {
        timeStr = slotTime.trim();
      }

      // Create date object for today with the slot time
      const today = new Date();
      const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
      
      if (isNaN(hours) || isNaN(minutes)) return null;

      today.setHours(hours, minutes, 0, 0);
      return today;

    } catch (error) {
      console.error('❌ Error parsing slot time:', slotTime, error);
      return null;
    }
  }

  private formatSlotTime(slotTime: string): string {
    try {
      if (slotTime.includes('–') || slotTime.includes('-')) {
        return slotTime;
      }
      // If it's just a time like "14:00", format it as a 30-minute slot
      const time = slotTime.trim();
      const [hours, minutes] = time.split(':').map(num => parseInt(num));
      const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const endMinutes = minutes + 30;
      const endHours = endMinutes >= 60 ? hours + 1 : hours;
      const adjustedEndMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
      const endTime = `${endHours.toString().padStart(2, '0')}:${adjustedEndMinutes.toString().padStart(2, '0')}`;
      return `${startTime}–${endTime}`;
    } catch (error) {
      return slotTime;
    }
  }

  private async scheduleAllActiveReminders() {
    try {
      console.log('📋 Scheduling all active reminders...');
      // This will be handled by the minute-by-minute cron job
      console.log('✅ Reminder scheduling system active');
    } catch (error) {
      console.error('❌ Error scheduling active reminders:', error);
    }
  }

  // Public method to update reminder settings
  public async updateReminderSettings(userId: string, reminderMinutes: number) {
    try {
      const { error } = await supabase
        .from('prayer_slots')
        .update({ reminder_time: reminderMinutes })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Error updating reminder settings:', error);
        return false;
      }

      console.log(`✅ Updated reminder settings for user ${userId}: ${reminderMinutes} minutes`);
      return true;
    } catch (error) {
      console.error('❌ Error updating reminder settings:', error);
      return false;
    }
  }

  // Public method to disable reminders
  public async disableReminders(userId: string) {
    try {
      const { error } = await supabase
        .from('prayer_slots')
        .update({ reminder_time: null })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Error disabling reminders:', error);
        return false;
      }

      console.log(`✅ Disabled reminders for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error disabling reminders:', error);
      return false;
    }
  }
}

export { AdvancedReminderSystem };
