import cron from 'node-cron';
import { supabaseAdmin as supabase } from '../supabase.js';
import fetch from 'node-fetch';

interface WhatsAppAPIConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

interface DevotionalContent {
  devotionText: string;
  bibleVerse: string;
  verseReference: string;
}

interface WhatsAppBotUser {
  id?: number;
  user_id: string;
  whatsapp_number: string;
  is_active: boolean;
  reminder_preferences: any;
  created_at?: string;
  updated_at?: string;
}

interface PrayerSlot {
  id: number;
  user_id: string;
  user_email: string;
  slot_time: string;
  status: string;
  missed_count: number;
  skip_start_date?: string;
  skip_end_date?: string;
  created_at: string;
  updated_at: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  start_time?: string;
  end_time?: string;
}

interface UserProfile {
  id?: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export class WhatsAppPrayerBot {
  private config: WhatsAppAPIConfig;
  private deepSeekApiKey: string;
  private processedMessages: Set<string> = new Set();
  private rateLimitMap: Map<string, number> = new Map();

  constructor() {
    console.log('🤖 Initializing WhatsApp Prayer Bot v2...');
    console.log('✅ Using Supabase client for WhatsApp bot database operations');

    this.config = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      apiVersion: 'v18.0'
    };

    this.deepSeekApiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY || '';

    console.log('🔧 WhatsApp Bot Configuration:');
    console.log('Phone Number ID:', this.config.phoneNumberId ? 'Configured' : 'Missing');
    console.log('Access Token:', this.config.accessToken ? 'Configured' : 'Missing');
    console.log('AI API Key:', this.deepSeekApiKey ? 'Configured' : 'Missing');

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.warn('WhatsApp API credentials not configured. Bot functionality will be limited.');
    }

    this.initializeScheduledJobs();
  }

  private initializeScheduledJobs() {
    // Prayer slot reminders - check every minute for upcoming slots
    cron.schedule('* * * * *', () => {
      this.checkPrayerSlotReminders();
    });

    // Morning declarations at 6:00 AM daily
    cron.schedule('0 6 * * *', () => {
      this.sendMorningDeclarations();
    });

    console.log('WhatsApp Prayer Bot v2 scheduled jobs initialized');
  }

  // Core messaging functionality
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    console.log(`\n📤 SENDING MESSAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📝 Length: ${message.length} characters`);

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`❌ WhatsApp credentials missing - SIMULATION MODE`);
      console.log(`📄 Message Preview: ${message.substring(0, 100)}...`);
      return false;
    }

    console.log(`📄 Message Preview: ${message.substring(0, 100)}...`);

    try {
      const response = await fetch(`https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      if (response.ok) {
        console.log('✅ Message sent successfully');
        await this.logMessage(phoneNumber, message, 'outbound');
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to send message:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Send interactive message with buttons
  private async sendInteractiveMessage(phoneNumber: string, text: string, buttons: { id: string, title: string }[]): Promise<boolean> {
    console.log(`\n📤 SENDING INTERACTIVE MESSAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📝 Text: ${text.substring(0, 100)}...`);
    console.log(`🔘 Buttons: ${buttons.map(b => b.title).join(', ')}`);

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`❌ WhatsApp credentials missing - SIMULATION MODE`);
      return false;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: text
            },
            action: {
              buttons: buttons.map(button => ({
                type: 'reply',
                reply: {
                  id: button.id,
                  title: button.title
                }
              }))
            }
          }
        })
      });

      if (response.ok) {
        console.log('✅ Interactive message sent successfully');
        await this.logMessage(phoneNumber, `${text} [Interactive: ${buttons.map(b => b.title).join(', ')}]`, 'outbound');
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to send interactive message:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending interactive message:', error);
      return false;
    }
  }

  // Database operations using Supabase
  private async getUserName(userIdOrPhone: string): Promise<string> {
    try {
      console.log(`🔍 Fetching user name for: ${userIdOrPhone}`);
      
      // First try to get by user_id
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', userIdOrPhone)
        .single();

      if (profile) {
        const fullName = `${profile.first_name} ${profile.last_name}`.trim();
        console.log(`✅ Found user name: ${fullName}`);
        return fullName;
      }

      // Try to find by WhatsApp number
      const { data: botUser } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id')
        .eq('whatsapp_number', userIdOrPhone)
        .single();

      if (botUser) {
        const { data: profileByBotUser } = await supabase
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', botUser.user_id)
          .single();

        if (profileByBotUser) {
          const fullName = `${profileByBotUser.first_name} ${profileByBotUser.last_name}`.trim();
          console.log(`✅ Found user name via bot user: ${fullName}`);
          return fullName;
        }
      }

      console.log(`❌ No user name found for: ${userIdOrPhone}`);
      return 'Beloved Intercessor';
    } catch (error) {
      console.error('❌ Error fetching user name:', error);
      return 'Beloved Intercessor';
    }
  }

  private async logMessage(phoneNumber: string, content: string, direction: 'inbound' | 'outbound'): Promise<void> {
    try {
      await supabase
        .from('whatsapp_messages')
        .insert({
          whatsapp_number: phoneNumber,
          content: content,
          direction: direction,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Error logging message:', error);
    }
  }

  private async logInteraction(phoneNumber: string, interaction_type: string, command: string): Promise<void> {
    try {
      await supabase
        .from('whatsapp_interactions')
        .insert({
          whatsapp_number: phoneNumber,
          interaction_type: interaction_type,
          command: command,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Error logging interaction:', error);
    }
  }

  private async getUserByPhone(phoneNumber: string): Promise<WhatsAppBotUser | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (error) {
        console.log(`ℹ️ No existing user found for ${phoneNumber}`);
        return null;
      }

      return data as WhatsAppBotUser;
    } catch (error) {
      console.error('❌ Error fetching user by phone:', error);
      return null;
    }
  }

  private async createOrUpdateUser(phoneNumber: string, userData: Partial<WhatsAppBotUser>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_users')
        .upsert({
          whatsapp_number: phoneNumber,
          user_id: userData.user_id || `whatsapp_${phoneNumber}`,
          is_active: userData.is_active || true,
          reminder_preferences: userData.reminder_preferences || { reminderTiming: "30min", enabled: true },
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error creating/updating user:', error);
        return false;
      }

      console.log(`✅ User created/updated successfully for ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Error in createOrUpdateUser:', error);
      return false;
    }
  }

  // Prayer slot reminders
  public async checkPrayerSlotReminders(): Promise<void> {
    console.log('🔍 Checking prayer slot reminders using Supabase...');
    
    try {
      console.log('🔍 Testing Supabase connection...');
      console.log('🔗 Supabase URL:', process.env.SUPABASE_URL?.substring(0, 50) + '...');
      
      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('prayer_slots')
        .select('count', { count: 'exact', head: true });
      
      console.log('🔗 Supabase connection test:', { success: !connectionError, error: connectionError?.message });
      
      if (connectionError) {
        console.error('❌ Failed to connect to Supabase:', connectionError);
        return;
      }
      
      console.log('📊 Database connection successful - checking for prayer slots data');
      
      // Query all prayer slots with detailed logging
      console.log('🔍 Querying prayer_slots table directly...');
      const { data: allSlots, count: totalCount, error: queryError } = await supabase
        .from('prayer_slots')
        .select('*', { count: 'exact' });
      
      console.log('📊 ALL prayer_slots query result:', { 
        count: totalCount, 
        error: queryError?.message, 
        sample: allSlots?.[0] 
      });
      
      if (queryError) {
        console.error('❌ Error querying prayer slots:', queryError);
        return;
      }
      
      if (!allSlots || allSlots.length === 0) {
        console.log('⚠️ prayer_slots table is empty - no prayer slots available for reminders');
        console.log('💡 Add sample prayer slots using create-whatsapp-bot-tables.sql');
        return;
      }
      
      console.log(`✅ BREAKTHROUGH! Found ${totalCount} total prayer slots in database!`);
      
      // Filter active slots
      const activeSlots = allSlots.filter(slot => slot.status === 'active');
      console.log(`✅ Found ${activeSlots.length} active prayer slots out of ${totalCount} total slots`);
      
      if (activeSlots.length === 0) {
        console.log('⚠️ No active prayer slots found for reminders');
        return;
      }
      
      // Extract user IDs for debugging
      const userIds = activeSlots.map(slot => slot.user_id);
      console.log('🔍 Extracted user IDs:', userIds);
      
      // Get WhatsApp bot users
      const { data: whatsappUsers, count: whatsappCount } = await supabase
        .from('whatsapp_bot_users')
        .select('*', { count: 'exact' })
        .eq('is_active', true);
      
      console.log(`📱 WhatsApp users found: ${whatsappCount || 0}`);
      
      // Get user profiles for names
      const { data: userProfiles, count: profilesCount, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });
      
      console.log(`👥 User profiles found: ${profilesCount || 0}`);
      if (profilesError) {
        console.log('Error fetching user profiles:', profilesError);
      }
      
      if (!whatsappUsers || whatsappUsers.length === 0) {
        console.log('⚠️ No WhatsApp bot users found - no one to send reminders to');
        return;
      }
      
      // Process reminders for each active slot
      const currentTime = new Date();
      const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
      
      for (const slot of activeSlots) {
        // Parse slot time (e.g., "04:00" or "14:30–15:00")
        const slotTimeStr = slot.slot_time.split('–')[0] || slot.slot_time;
        const [hours, minutes] = slotTimeStr.split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;
        
        // Check if reminder should be sent (30 minutes before)
        const reminderMinutes = slotMinutes - 30;
        const timeDiff = Math.abs(currentMinutes - reminderMinutes);
        
        // Send reminder if within 1 minute of reminder time
        if (timeDiff <= 1) {
          const whatsappUser = whatsappUsers.find(user => user.user_id === slot.user_id);
          if (whatsappUser) {
            await this.sendPrayerSlotReminder(whatsappUser, slot);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in checkPrayerSlotReminders:', error);
    }
  }

  private async sendPrayerSlotReminder(user: WhatsAppBotUser, slot: PrayerSlot): Promise<void> {
    try {
      const userName = await this.getUserName(user.user_id);
      
      const message = `🕊️ *Prayer Reminder* 🕊️

Hello ${userName}! 

⏰ Your prayer slot (${slot.slot_time}) begins in 30 minutes.

🙏 *"The effectual fervent prayer of a righteous man availeth much."* - James 5:16

May the Lord strengthen you as you stand in the gap for His people and purposes.

Reply *help* for more options.`;

      const success = await this.sendWhatsAppMessage(user.whatsapp_number, message);
      
      if (success) {
        console.log(`✅ Prayer reminder sent to ${user.whatsapp_number} for slot ${slot.slot_time}`);
        await this.logInteraction(user.whatsapp_number, 'reminder', 'prayer_slot');
      }
    } catch (error) {
      console.error('❌ Error sending prayer slot reminder:', error);
    }
  }

  // Morning declarations
  private async sendMorningDeclarations(): Promise<void> {
    try {
      const { data: activeUsers } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('is_active', true);

      if (!activeUsers || activeUsers.length === 0) {
        console.log('⚠️ No active WhatsApp users found for morning declarations');
        return;
      }

      const declarations = `🌅 *Good Morning, Prayer Warrior!* 🌅

🔥 *Today's Declarations:*

✝️ "This is the day the LORD has made; I will rejoice and be glad in it!" - Psalm 118:24

🛡️ "No weapon formed against me shall prosper!" - Isaiah 54:17

👑 "I can do all things through Christ who strengthens me!" - Philippians 4:13

🙏 May your prayers today move mountains and your intercession break every chain!

*Reply /help for bot commands*`;

      for (const user of activeUsers) {
        const userName = await this.getUserName(user.user_id);
        const personalizedMessage = declarations.replace('Prayer Warrior', userName);
        
        await this.sendWhatsAppMessage(user.whatsapp_number, personalizedMessage);
        await this.logInteraction(user.whatsapp_number, 'morning_declaration', 'daily');
      }

      console.log(`✅ Morning declarations sent to ${activeUsers.length} users`);
    } catch (error) {
      console.error('❌ Error sending morning declarations:', error);
    }
  }

  // Command handlers
  public async handleIncomingMessage(phoneNumber: string, messageText: string, messageId: string): Promise<void> {
    console.log(`\n📥 INCOMING MESSAGE:`);
    console.log(`📱 From: ${phoneNumber}`);
    console.log(`📝 Text: ${messageText}`);
    console.log(`🆔 Message ID: ${messageId}`);

    // Prevent duplicate processing
    if (this.processedMessages.has(messageId)) {
      console.log('⚠️ Message already processed, skipping');
      return;
    }
    this.processedMessages.add(messageId);

    // Rate limiting
    const now = Date.now();
    const lastMessage = this.rateLimitMap.get(phoneNumber) || 0;
    if (now - lastMessage < 2000) { // 2 second rate limit
      console.log('⚠️ Rate limited, skipping message');
      return;
    }
    this.rateLimitMap.set(phoneNumber, now);

    // Log incoming message
    await this.logMessage(phoneNumber, messageText, 'inbound');

    // Get or create user
    let user = await this.getUserByPhone(phoneNumber);
    if (!user) {
      await this.createOrUpdateUser(phoneNumber, {});
      user = await this.getUserByPhone(phoneNumber);
    }

    // Process command
    const command = messageText.toLowerCase().trim();
    const userName = await this.getUserName(user?.user_id || phoneNumber);

    if (command === 'start' || command === 'hi' || command === 'hello') {
      await this.handleStartCommand(phoneNumber, userName);
    } else if (command === 'help' || command === '/help') {
      await this.handleHelpCommand(phoneNumber, userName);
    } else if (command === 'remind' || command === '/remind') {
      await this.handleRemindCommand(phoneNumber, userName);
    } else if (command === 'devotional' || command === '/devotional') {
      await this.handleDevotionalCommand(phoneNumber, userName);
    } else if (command === 'stop' || command === '/stop') {
      await this.handleStopCommand(phoneNumber, userName);
    } else {
      await this.handleUnknownCommand(phoneNumber, userName, messageText);
    }
  }

  private async handleStartCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'start');

    const welcomeMessage = `🕊️ *Welcome to Global Intercessors Prayer Bot* 🕊️

Hello there, ${userName}! It's wonderful to connect with you. Your simple 'start' speaks volumes about your heart for prayer and intercession.

🙏 *I'm here to support your prayer journey with:*

🔔 **Prayer Reminders** - Gentle nudges for your assigned prayer slots
📖 **Daily Devotionals** - AI-powered spiritual content and fresh prophetic words  
⚔️ **Spiritual Warfare** - Declarations and intercession guidance
📱 **Interactive Experience** - Simple commands to access all features

*Ready to begin your intercession journey?*`;

    const buttons = [
      { id: 'help', title: '📋 View Commands' },
      { id: 'devotional', title: '📖 Get Devotional' },
      { id: 'remind', title: '🔔 Prayer Reminders' }
    ];

    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, buttons);
  }

  private async handleHelpCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'help');

    const helpMessage = `🤖 *Global Intercessors Bot Commands* 🤖

Hello ${userName}! Here are the available commands:

🔔 **/remind** - Enable prayer slot reminders
📖 **/devotional** - Get today's devotional content  
🛑 **/stop** - Disable notifications
❓ **/help** - Show this help message

*Simply type any command to get started!*

🕊️ *"Pray without ceasing"* - 1 Thessalonians 5:17`;

    await this.sendWhatsAppMessage(phoneNumber, helpMessage);
  }

  private async handleRemindCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'remind');

    // Update user preferences to enable reminders
    await this.createOrUpdateUser(phoneNumber, {
      reminder_preferences: { reminderTiming: "30min", enabled: true }
    });

    const reminderMessage = `🔔 *Prayer Reminders Activated* 🔔

Thank you ${userName}! 

✅ You will now receive prayer slot reminders 30 minutes before your assigned time.

🙏 *"Continue earnestly in prayer, being vigilant in it with thanksgiving"* - Colossians 4:2

Your commitment to intercession is a blessing to the global church!`;

    await this.sendWhatsAppMessage(phoneNumber, reminderMessage);
  }

  private async handleDevotionalCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'devotional');

    const devotionalMessage = `📖 *Today's Devotional* 📖

Hello ${userName}!

🔥 *"For the eyes of the LORD run to and fro throughout the whole earth, to show Himself strong on behalf of those whose heart is loyal to Him."* - 2 Chronicles 16:9

💡 **Reflection:** God is actively seeking hearts completely devoted to Him. Your prayers today are part of His mighty work across the earth.

⚔️ **Declaration:** "Lord, I position my heart in complete loyalty to You. Use my prayers to demonstrate Your strength in every nation!"

🌍 **Intercession Focus:** Pray for spiritual awakening in unreached nations and for God's strength to be revealed through global intercession.

Reply **/devotional** for fresh content anytime!`;

    await this.sendWhatsAppMessage(phoneNumber, devotionalMessage);
  }

  private async handleStopCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'stop');

    // Update user preferences to disable reminders
    await this.createOrUpdateUser(phoneNumber, {
      is_active: false,
      reminder_preferences: { reminderTiming: "30min", enabled: false }
    });

    const stopMessage = `🛑 *Notifications Disabled* 🛑

${userName}, your prayer reminders have been disabled.

🕊️ You can reactivate them anytime by typing **/remind**

*"The LORD bless you and keep you!"* - Numbers 6:24

Thank you for your heart for intercession!`;

    await this.sendWhatsAppMessage(phoneNumber, stopMessage);
  }

  private async handleUnknownCommand(phoneNumber: string, userName: string, messageText: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'unknown_command', messageText);

    const unknownMessage = `🤔 *Command Not Recognized* 🤔

Hello ${userName}! I didn't understand "${messageText}".

✨ *Try these commands:*
• **/help** - View all commands
• **/remind** - Enable prayer reminders  
• **/devotional** - Get spiritual content
• **/stop** - Disable notifications

🙏 *"Call to Me, and I will answer you"* - Jeremiah 33:3`;

    await this.sendWhatsAppMessage(phoneNumber, unknownMessage);
  }

  // Webhook verification for Meta WhatsApp Business API
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'GI_PRAYER_BOT_VERIFY_2024';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return challenge;
    } else {
      console.error('❌ Webhook verification failed');
      return null;
    }
  }

  // Process webhook data from Meta WhatsApp Business API
  public async processWebhookData(body: any): Promise<void> {
    console.log('📥 Processing webhook data...');
    
    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                if (message.type === 'text') {
                  await this.handleIncomingMessage(
                    message.from,
                    message.text.body,
                    message.id
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing webhook data:', error);
    }
  }
}

// Export singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();