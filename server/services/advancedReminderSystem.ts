
import { supabaseAdmin as supabase } from '../supabase.js';
import cron from 'node-cron';
import fetch from 'node-fetch';

interface PrayerSlot {
  id: number;
  user_id: string;
  user_email: string;
  slot_time: string;
  status: string;
  reminder_time?: number;
  custom_reminders?: boolean;
  timezone?: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  phone_number?: string;
  timezone?: string;
  reminder_preferences?: any;
}

interface ReminderLog {
  id?: number;
  slot_id: number;
  user_id: string;
  reminder_type: string;
  minutes_before?: number;
  sent_at: string;
  status: string;
  message_content?: string;
  phone_number?: string;
}

interface ReminderSettings {
  prayerSlotReminders: boolean;
  dailyDevotionals: boolean;
  weeklyReports: boolean;
  customReminders: boolean;
  defaultReminderTime: number;
  timezone: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  reminderDays: string[];
}

class AdvancedReminderSystem {
  private whatsappBot: any;
  private activeReminders = new Map<string, NodeJS.Timeout>();
  private deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  private reminderQueue = new Map<string, { phoneNumber: string; message: string; priority: number; retryCount: number }>();
  private isProcessingQueue = false;

  constructor(whatsappBot: any) {
    this.whatsappBot = whatsappBot;
    this.initializeReminderSystem();
    this.startQueueProcessor();
  }

  private async initializeReminderSystem() {
    console.log('🔔 Initializing Advanced Reminder System...');
    
    try {
      // Ensure database tables exist
      await this.ensureDatabaseTables();
      
      // Schedule various reminder types
      this.scheduleReminderJobs();
      
      // Initialize existing reminders
      await this.scheduleAllActiveReminders();
      
      console.log('✅ Advanced Reminder System fully initialized');
    } catch (error) {
      console.error('❌ Error initializing reminder system:', error);
    }
  }

  private async ensureDatabaseTables() {
    try {
      // Create reminder_logs table if it doesn't exist
      const { error: logsError } = await supabase.rpc('create_reminder_logs_table');
      if (logsError) {
        console.log('ℹ️ reminder_logs table may already exist or needs manual creation');
      }

      // Add reminder columns to prayer_slots if they don't exist
      const { error: columnsError } = await supabase.rpc('add_reminder_columns_to_prayer_slots');
      if (columnsError) {
        console.log('ℹ️ Reminder columns may already exist in prayer_slots');
      }

      console.log('✅ Database schema verified');
    } catch (error) {
      console.error('❌ Error ensuring database tables:', error);
    }
  }

  private scheduleReminderJobs() {
    // Prayer slot reminders - check every minute
    cron.schedule('* * * * *', async () => {
      await this.checkUpcomingSlots();
    }, {
      timezone: "Africa/Harare"
    });

    // Morning devotionals at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      await this.sendDailyMorningMessages();
    }, {
      timezone: "Africa/Harare"
    });

    // Weekly reports on Sundays at 8:00 AM
    cron.schedule('0 8 * * 0', async () => {
      await this.sendWeeklyReports();
    }, {
      timezone: "Africa/Harare"
    });

    // Custom reminder processing every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.processCustomReminders();
    });

    // Queue processing every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      await this.processReminderQueue();
    });

    console.log('📅 All reminder jobs scheduled');
  }

  private async checkUpcomingSlots() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      // Use the database function to get active slots with user details
      const { data: prayerSlots, error } = await supabase
        .rpc('get_active_slots_for_reminders');

      if (error) {
        console.error('❌ Error fetching prayer slots for reminders:', error);
        return;
      }

      console.log(`🔍 Found ${prayerSlots?.length || 0} active slots for reminder checking`);

      for (const slot of prayerSlots || []) {
        await this.processSlotReminder(slot, currentTime);
      }

    } catch (error) {
      console.error('❌ Error checking upcoming slots:', error);
    }
  }

  private async processSlotReminder(slot: any, currentTime: string) {
    try {
      // slot now contains flattened data from the database function
      const reminderMinutes = 30; // default reminder time
      
      // Parse slot time
      const slotStartTime = this.parseSlotTime(slot.slot_time);
      if (!slotStartTime) return;

      // Calculate reminder time
      const reminderTime = new Date(slotStartTime.getTime() - (reminderMinutes * 60 * 1000));
      const reminderTimeStr = reminderTime.toTimeString().slice(0, 5);

      // Check if it's time to send reminder
      if (currentTime === reminderTimeStr) {
        const reminderKey = `${slot.slot_id}-${reminderTimeStr}`;
        
        // Prevent duplicate reminders
        if (this.activeReminders.has(reminderKey)) return;

        // Check if user is in quiet hours
        if (this.isInQuietHours(slot)) {
          console.log(`🔇 Skipping reminder for ${slot.full_name} - quiet hours`);
          return;
        }

        await this.sendSlotReminder(slot, reminderMinutes);
        
        // Mark this reminder as sent
        this.activeReminders.set(reminderKey, setTimeout(() => {
          this.activeReminders.delete(reminderKey);
        }, 60000));
      }

    } catch (error) {
      console.error('❌ Error processing slot reminder:', error);
    }
  }

  private async sendSlotReminder(slot: any, reminderMinutes: number) {
    try {
      const userName = slot.full_name || slot.user_email?.split('@')[0] || 'Beloved Intercessor';
      const slotTime = this.formatSlotTime(slot.slot_time);

      // Generate personalized prayer focus based on time and user
      const prayerFocus = await this.generatePersonalizedPrayerFocus(userName, slotTime);

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

💡 *Personalized Prayer Focus:*
${prayerFocus}

🚀 *Remember:* Your prayers matter! You're not just attending a meeting—you're participating in a divine strategy session.

_"The effective, fervent prayer of a righteous man avails much." - James 5:16_

🔗 *Quick Commands:*
• "remind 15" - Change to 15-minute reminder
• "remind off" - Disable reminders
• "status" - Check your prayer stats
• "help" - See all commands

Global Intercessors ⚔️ Standing Strong!`;

      // Add to queue for reliable delivery
      this.addToReminderQueue(userProfile.phone_number, reminderMessage, 1);
      
      // Log the reminder
      await this.logReminderSent(slot.id, slot.user_id, reminderMinutes, reminderMessage);

    } catch (error) {
      console.error('❌ Error sending slot reminder:', error);
    }
  }

  private async generatePersonalizedPrayerFocus(userName: string, slotTime: string): Promise<string> {
    try {
      if (!this.deepSeekApiKey) {
        return this.getFallbackPrayerFocus();
      }

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
            content: `Generate a personalized prayer focus for ${userName} for their prayer slot at ${slotTime}. 
            Make it specific, encouraging, and actionable. Include 2-3 specific prayer points.
            Format as bullet points starting with •. Keep it under 100 words.`
          }],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('❌ Error generating personalized prayer focus:', error);
    }

    return this.getFallbackPrayerFocus();
  }

  private getFallbackPrayerFocus(): string {
    const focusOptions = [
      "• Pray for breakthrough in your assigned region\n• Intercede for church leaders worldwide\n• Seek God's guidance for current global issues",
      "• Pray for unity among believers\n• Intercede for the lost and broken\n• Ask for wisdom in your daily decisions",
      "• Pray for your family and loved ones\n• Intercede for your community\n• Seek God's strength for your journey"
    ];
    return focusOptions[Math.floor(Math.random() * focusOptions.length)];
  }

  private async sendDailyMorningMessages() {
    console.log('🌅 Sending daily morning messages...');

    try {
      const { data: prayerSlots, error } = await supabase
        .from('prayer_slots')
        .select(`
          *,
          user_profiles!inner(full_name, phone_number, timezone, reminder_preferences)
        `)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Error fetching prayer slots for morning messages:', error);
        return;
      }

      for (const slot of prayerSlots || []) {
        const userProfile = slot.user_profiles;
        if (!userProfile?.phone_number) continue;

        const userName = userProfile.full_name || slot.user_email?.split('@')[0] || 'Beloved Intercessor';
        const slotTime = this.formatSlotTime(slot.slot_time);
        // Generate a unique devotion per user/day
        const verseOfTheDay = await this.generateVerseOfTheDay(userName);

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

🔔 *Quick Commands:*
• "remind 30" - Set 30-minute reminder
• "remind off" - Disable reminders
• "status" - Check your progress
• "help" - See all commands

Go forth and intercede with authority! 👑

_Global Intercessors - Standing in the Gap_`;

        this.addToReminderQueue(userProfile.phone_number, morningMessage, 2);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      }

    } catch (error) {
      console.error('❌ Error sending daily morning messages:', error);
    }
  }

  private async sendWeeklyReports() {
    console.log('📊 Sending weekly reports...');

    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .not('phone_number', 'is', null);

      if (error) {
        console.error('❌ Error fetching users for weekly reports:', error);
        return;
      }

      for (const user of users || []) {
        const weeklyStats = await this.generateWeeklyStats(user.id);
        const reportMessage = `📊 *Weekly Prayer Report* 📊

👋 Hello ${user.full_name || 'Beloved Intercessor'}!

📈 *Your Week in Review:*
${weeklyStats}

🎯 *Next Week's Goals:*
• Maintain your prayer consistency
• Deepen your intercession focus
• Encourage fellow intercessors

💪 *Keep Standing Strong!*
Your faithfulness in prayer is making a difference.

_"Therefore, my dear brothers and sisters, stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain." - 1 Corinthians 15:58_`;

        this.addToReminderQueue(user.phone_number, reportMessage, 3);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
      }

    } catch (error) {
      console.error('❌ Error sending weekly reports:', error);
    }
  }

  private async generateWeeklyStats(userId: string): Promise<string> {
    try {
      // Get prayer slot attendance for the week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const { data: slots, error } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString());

      if (error) {
        return "• Prayer slots: Data unavailable\n• Consistency: Keep praying!";
      }

      const totalSlots = slots?.length || 0;
      const activeSlots = slots?.filter(s => s.status === 'active').length || 0;

      return `• Prayer slots: ${totalSlots} total, ${activeSlots} active\n• Consistency: ${activeSlots > 0 ? 'Great job!' : 'Keep praying!'}\n• Next slot: Check your dashboard`;
    } catch (error) {
      return "• Prayer slots: Data unavailable\n• Consistency: Keep praying!";
    }
  }

  private async generateVerseOfTheDay(userName?: string): Promise<string> {
    try {
      if (!this.deepSeekApiKey) {
        return this.getFallbackVerse();
      }

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
            content: this.buildDailyDevotionPrompt(userName)
          }],
          max_tokens: 220,
          temperature: 0.95,
          top_p: 0.9
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('❌ Error generating verse of the day:', error);
    }

    return this.getFallbackVerse();
  }

  private getFallbackVerse(): string {
    // 21 rotating themed fallbacks keyed by day-of-year for uniqueness
    const options = [
      "Psalm 5:3 — In the morning, LORD, you hear my voice; in the morning I lay my requests before you and wait expectantly.\n\nReflection: Begin today with expectation. God bends His ear toward your prayers and orders your steps as you intercede.",
      "Isaiah 40:31 — But those who hope in the LORD will renew their strength...\n\nReflection: Your strength is renewed at the altar of prayer. Wait on Him and soar above today's challenges.",
      "Philippians 4:6–7 — Do not be anxious about anything...\n\nReflection: Trade anxiety for intercession. God's peace will guard your heart as you pray.",
      "1 Timothy 2:1–2 — I urge that petitions, prayers, intercession...\n\nReflection: Your prayers shape leaders and nations. Heaven partners with your intercession today.",
      "James 5:16 — The prayer of a righteous person is powerful and effective.\n\nReflection: Pray with confidence. Your petitions are powerful tools in God's hand.",
      "Jeremiah 33:3 — Call to me and I will answer you...\n\nReflection: Expect divine insight. God reveals strategies as you call on Him.",
      "Psalm 121:1–2 — I lift up my eyes to the mountains...\n\nReflection: Help comes from the Lord. Fix your gaze on Him as you pray.",
      "Ephesians 6:18 — Pray in the Spirit on all occasions...\n\nReflection: Stay alert and persistent. Your consistency builds heavenly momentum.",
      "Colossians 4:2 — Devote yourselves to prayer, being watchful and thankful.\n\nReflection: Watch and pray. Gratitude sharpens your spiritual sight.",
      "Matthew 7:7 — Ask and it will be given to you...\n\nReflection: Keep knocking. Persistent intercession opens locked doors.",
      "Psalm 46:10 — Be still, and know that I am God.\n\nReflection: In stillness, authority grows. Let His presence anchor your petitions.",
      "Romans 12:12 — Be joyful in hope, patient in affliction, faithful in prayer.\n\nReflection: Prayer keeps hope blazing through every season.",
      "Mark 11:24 — Whatever you ask for in prayer, believe that you have received it...\n\nReflection: Pray from faith, not fear. Heaven recognizes the sound of faith.",
      "Hebrews 4:16 — Approach God's throne of grace with confidence...\n\nReflection: Intercede boldly. Mercy and help flow to the place of need.",
      "Psalm 27:14 — Wait for the LORD; be strong and take heart...\n\nReflection: Timing is strategic. Your waiting becomes warfare.",
      "John 14:13 — I will do whatever you ask in my name...\n\nReflection: Pray in alignment with Jesus’ name and purpose; fruit will follow.",
      "Psalm 37:5 — Commit your way to the LORD...\n\nReflection: Surrender your plan; God establishes your steps today.",
      "Luke 18:1 — Always pray and not give up.\n\nReflection: Persistence moves mountains. Keep pressing in.",
      "Acts 4:31 — After they prayed, the place was shaken...\n\nReflection: Prayer shakes atmospheres. Expect boldness and power.",
      "Psalm 34:17 — The righteous cry out, and the LORD hears them...\n\nReflection: God is near. Your cry does not go unnoticed.",
      "2 Chronicles 7:14 — If my people... will humble themselves and pray...\n\nReflection: Humility unlocks healing. Stand in the gap with a yielded heart."
    ];
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime());
    const dayOfYear = Math.floor(diff / 86400000); // ms per day
    return options[dayOfYear % options.length];
  }

  private buildDailyDevotionPrompt(userName?: string): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const nameLine = userName ? `This is for ${userName}.` : '';

    const weeklyThemes = [
      'Intimacy with God', 'Faith for Nations', 'Perseverance in Prayer', 'Hearing God', 'Unity of the Body', 'Spiritual Warfare', 'Thanksgiving and Praise'
    ];
    const theme = weeklyThemes[now.getDay() % weeklyThemes.length];

    return `Today is ${dateStr} (${weekday}), seed ${dayOfYear}. ${nameLine}
Generate a unique morning devotion for intercessors themed: "${theme}".
Requirements:
- Start with a single Bible verse (reference + exact text, KJV preferred if known).
- Then give a 2–3 sentence reflection focused on prayer/intercession.
- Keep total length under 120 words.
- Make it distinct from previous days for the same seed.
Format exactly:
Verse Reference — Verse Text\n\nReflection: [short reflection here]`;
  }

  private async processCustomReminders() {
    try {
      const { data: customReminders, error } = await supabase
        .from('custom_reminders')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString());

      if (error) {
        console.error('❌ Error fetching custom reminders:', error);
        return;
      }

      for (const reminder of customReminders || []) {
        await this.sendCustomReminder(reminder);
      }

    } catch (error) {
      console.error('❌ Error processing custom reminders:', error);
    }
  }

  private async sendCustomReminder(reminder: any) {
    try {
      const message = `🔔 *Custom Reminder* 🔔

${reminder.message}

💡 *Set by:* ${reminder.created_by || 'System'}

Reply "done" to mark as complete.`;

      this.addToReminderQueue(reminder.phone_number, message, 1);
      
      // Mark as sent
      await supabase
        .from('custom_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id);

    } catch (error) {
      console.error('❌ Error sending custom reminder:', error);
    }
  }

  // Queue management for reliable message delivery
  private addToReminderQueue(phoneNumber: string, message: string, priority: number) {
    const key = `${phoneNumber}-${Date.now()}`;
    this.reminderQueue.set(key, { phoneNumber, message, priority, retryCount: 0 });
  }

  private async processReminderQueue() {
    if (this.isProcessingQueue || this.reminderQueue.size === 0) return;

    this.isProcessingQueue = true;

    try {
      // Sort by priority (lower number = higher priority)
      const sortedEntries = Array.from(this.reminderQueue.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);

      for (const [key, reminder] of sortedEntries) {
        try {
          const success = await this.whatsappBot.sendMessage(reminder.phoneNumber, reminder.message);
          
          if (success) {
            this.reminderQueue.delete(key);
            console.log(`✅ Reminder sent successfully to ${reminder.phoneNumber}`);
          } else {
            // Increment retry count
            reminder.retryCount++;
            if (reminder.retryCount >= 3) {
              console.error(`❌ Failed to send reminder to ${reminder.phoneNumber} after 3 attempts`);
              this.reminderQueue.delete(key);
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error processing reminder for ${reminder.phoneNumber}:`, error);
          reminder.retryCount++;
          if (reminder.retryCount >= 3) {
            this.reminderQueue.delete(key);
          }
        }
      }

    } finally {
      this.isProcessingQueue = false;
    }
  }

  private startQueueProcessor() {
    // Process queue every 30 seconds
    setInterval(async () => {
      await this.processReminderQueue();
    }, 30000);
  }

  private isInQuietHours(userProfile: any): boolean {
    try {
      if (!userProfile.reminder_preferences?.quietHours?.enabled) return false;

      const { start, end } = userProfile.reminder_preferences.quietHours;
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes <= endMinutes) {
        return currentTime >= startMinutes && currentTime <= endMinutes;
      } else {
        // Handles overnight quiet hours (e.g., 22:00 to 06:00)
        return currentTime >= startMinutes || currentTime <= endMinutes;
      }
    } catch (error) {
      return false;
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

  // Public methods for external use
  public async updateReminderSettings(userId: string, reminderMinutes: number): Promise<boolean> {
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

  public async disableReminders(userId: string): Promise<boolean> {
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

  public async updateUserPreferences(userId: string, preferences: ReminderSettings): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ reminder_preferences: preferences })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating user preferences:', error);
        return false;
      }

      console.log(`✅ Updated reminder preferences for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating user preferences:', error);
      return false;
    }
  }

  public async createCustomReminder(phoneNumber: string, message: string, scheduledFor: Date, createdBy?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_reminders')
        .insert({
          phone_number: phoneNumber,
          message,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          created_by: createdBy || 'system'
        });

      if (error) {
        console.error('❌ Error creating custom reminder:', error);
        return false;
      }

      console.log(`✅ Custom reminder created for ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Error creating custom reminder:', error);
      return false;
    }
  }

  private parseSlotTime(slotTime: string): Date | null {
    try {
      let timeStr = '';
      if (slotTime.includes('–')) {
        timeStr = slotTime.split('–')[0].trim();
      } else if (slotTime.includes('-')) {
        timeStr = slotTime.split('-')[0].trim();
      } else {
        timeStr = slotTime.trim();
      }

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

  private async logReminderSent(slotId: number, userId: string, reminderMinutes: number, messageContent: string) {
    try {
      await supabase
        .from('reminder_logs')
        .insert({
          slot_id: slotId,
          user_id: userId,
          reminder_type: 'slot_reminder',
          minutes_before: reminderMinutes,
          sent_at: new Date().toISOString(),
          status: 'sent',
          message_content: messageContent
        });
    } catch (error) {
      console.error('❌ Error logging reminder:', error);
    }
  }

  // Get system status
  public getSystemStatus() {
    return {
      activeReminders: this.activeReminders.size,
      queueSize: this.reminderQueue.size,
      isProcessingQueue: this.isProcessingQueue,
      deepSeekAvailable: !!this.deepSeekApiKey
    };
  }
}

export { AdvancedReminderSystem };
