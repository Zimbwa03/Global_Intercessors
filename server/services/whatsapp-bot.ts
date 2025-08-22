// DEPRECATED: This file has been replaced by whatsapp-bot-v2.ts
// Please update imports to use whatsapp-bot-v2.js directly

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

interface UserLanguagePreference {
  userId: string;
  language: 'english' | 'shona' | 'bilingual';
  phoneNumber: string;
}

// Placeholder interfaces for the bot service (assuming they exist elsewhere or are defined here)
interface BotResponse {
  messageId: string;
  from: string;
  response: string;
  timestamp: Date;
}

interface UserSession {
  userId: string;
  state: string;
  lastActivity: Date;
  context: Record<string, any>;
}

export class WhatsAppPrayerBot {
  private config!: WhatsAppAPIConfig;
  private deepSeekApiKey!: string;
  private processedMessages: Set<string> = new Set(); // Prevent duplicate message processing
  private rateLimitMap: Map<string, number> = new Map(); // Rate limiting per user

  // Bot service properties (added for integration)
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;
  private responses: Map<string, BotResponse> = new Map();
  private userSessions: Map<string, UserSession> = new Map();
  private messageQueue: Map<string, NodeJS.Timeout> = new Map();
  private pendingResponses: Map<string, boolean> = new Map(); // Tracks if a user has a pending response
  private userLanguagePreferences: Map<string, 'english' | 'shona' | 'bilingual'> = new Map();

  constructor() {
    console.log('🤖 Initializing WhatsApp Prayer Bot...');

    // Use Supabase client instead of direct PostgreSQL connection
    console.log('✅ Using Supabase client for WhatsApp bot database operations');

    this.config = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      apiVersion: 'v18.0'
    };

    // Initialize bot service properties
    this.accessToken = this.config.accessToken;
    this.phoneNumberId = this.config.phoneNumberId;
    this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''; // Assuming this is defined

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
    // Daily devotionals at 6:00 AM
    cron.schedule('0 6 * * *', () => {
      this.sendDailyDevotionals();
    }, { timezone: 'Africa/Harare' });

    // Prayer slot reminders - check every minute for upcoming slots
    cron.schedule('* * * * *', () => {
      this.checkPrayerSlotReminders();
    }, { timezone: 'Africa/Harare' });

    // Morning declarations at 6:00 AM daily
    cron.schedule('0 6 * * *', () => {
      this.sendMorningDeclarations();
    }, { timezone: 'Africa/Harare' });

    console.log('WhatsApp Prayer Bot scheduled jobs initialized');
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

      const result = await response.json();

      if (response.ok) {
        console.log(`WhatsApp message sent successfully to ${phoneNumber}`);
        return true;
      } else {
        console.error('WhatsApp API error:', result);
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // AI-powered devotional generation with multilingual support
  private async generateDailyDevotional(language: 'english' | 'shona' | 'bilingual' = 'english'): Promise<DevotionalContent> {
    if (!this.deepSeekApiKey) {
      return {
        devotionText: "May God's grace be with you today. Take time to seek Him in prayer and His Word will guide your steps.",
        bibleVerse: "Your word is a lamp for my feet, a light on my path.",
        verseReference: "Psalm 119:105"
      };
    }

    try {
      let prompt = '';
      
      if (language === 'shona') {
        prompt = `Generate a brief, inspiring daily devotional for Christian intercessors in Shona language. Include:
1. A short devotional message (2-3 sentences) about prayer, faith, or spiritual growth - IN SHONA
2. A relevant Bible verse with its reference - IN SHONA  
3. Keep it encouraging and practical for daily spiritual life
4. Use proper Shona grammar and professional spiritual language

Format as plain text without formatting. Write everything in Shona (chiShona).`;
      } else if (language === 'bilingual') {
        prompt = `Generate a brief, inspiring daily devotional for Christian intercessors in BOTH Shona and English. Include:
1. A short devotional message (2-3 sentences) about prayer, faith, or spiritual growth - FIRST IN SHONA, THEN IN ENGLISH
2. A relevant Bible verse with its reference - FIRST IN SHONA, THEN IN ENGLISH
3. Keep it encouraging and practical for daily spiritual life
4. Use proper Shona grammar and professional spiritual language
5. Present it as: [Shona content] followed by [English content]

Format as plain text without formatting. Provide both languages professionally.`;
      } else {
        prompt = `Generate a brief, inspiring daily devotional for Christian intercessors. Include:
1. A short devotional message (2-3 sentences) about prayer, faith, or spiritual growth
2. A relevant Bible verse with its reference
3. Keep it encouraging and practical for daily spiritual life

Format as plain text without formatting.`;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.deepSeekApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        })
      });

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiResponse) {
        // Parse the AI response to extract devotion and verse
        const lines = aiResponse.split('\n').filter((line: string) => line.trim());
        let devotionText = '';
        let bibleVerse = '';
        let verseReference = '';

        // Simple parsing logic
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes(':') && /\d+:\d+/.test(line)) {
            // Likely a Bible verse reference
            const parts = line.split(' ');
            verseReference = parts.slice(0, 2).join(' ');
            bibleVerse = parts.slice(2).join(' ');
          } else if (line.length > 20 && !devotionText) {
            devotionText = line;
          }
        }

        if (!devotionText) devotionText = lines[0] || "Trust in the Lord with all your heart and lean not on your own understanding.";
        if (!bibleVerse) bibleVerse = "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.";
        if (!verseReference) verseReference = "Proverbs 3:5-6";

        return { devotionText, bibleVerse, verseReference };
      }
    } catch (error) {
      console.error('Error generating devotional:', error);
    }

    // Fallback devotional
    return {
      devotionText: "Begin each day with prayer and end it with gratitude. God's mercies are new every morning.",
      bibleVerse: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
      verseReference: "Lamentations 3:22-23"
    };
  }

  // Daily devotional broadcasting
  private async sendDailyDevotionals() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if devotional already exists for today
      const { data: existingDevotional, error: devotionalError } = await supabase
        .from('daily_devotionals')
        .select('*')
        .eq('date', today)
        .single();

      let devotional: DevotionalContent;

      if (!devotionalError && existingDevotional) {
        devotional = {
          devotionText: existingDevotional.devotion_text,
          bibleVerse: existingDevotional.bible_verse,
          verseReference: existingDevotional.verse_reference
        };
      } else {
        // Generate new devotional
        devotional = await this.generateDailyDevotional();

        // Save to database
        const { error: insertError } = await supabase
          .from('daily_devotionals')
          .insert({
            date: today,
            devotion_text: devotional.devotionText,
            bible_verse: devotional.bibleVerse,
            verse_reference: devotional.verseReference
          });

        if (insertError) {
          console.error('Error saving devotional:', insertError);
        }
      }

      // Get all active WhatsApp bot users with their profiles
      const { data: botUsers, error } = await supabase
        .from('whatsapp_bot_users')
        .select(`
          whatsapp_number,
          user_id,
          user_profiles(full_name)
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching bot users:', error);
        return;
      }

      // Send devotional to each user
      for (const user of botUsers || []) {
        const userName = user.user_profiles?.full_name?.split(' ')[0] || 'Dear Intercessor';

        const message = `Good morning, ${userName}! 🌅

Today's Devotion:
${devotional.devotionText}

Scripture for Today:
"${devotional.bibleVerse}" - ${devotional.verseReference}

May God bless your day and strengthen your prayers! 🙏`;

        const success = await this.sendWhatsAppMessage(user.whatsapp_number, message);

        // Log the message
        const { error: logError } = await supabase
          .from('whatsapp_messages')
          .insert({
            recipient_number: user.whatsapp_number,
            message_type: 'devotional',
            message_content: message,
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null
          });

        if (logError) {
          console.warn('Error logging message:', logError);
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Daily devotionals sent to ${botUsers?.length || 0} users`);
    } catch (error) {
      console.error('Error sending daily devotionals:', error);
    }
  }

  // Prayer slot reminder system
  private async checkPrayerSlotReminders() {
    console.log('🔍 Checking prayer slot reminders using Supabase...');

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const currentHour = parseInt(currentTime.split(':')[0]);
      const currentMinute = parseInt(currentTime.split(':')[1]);

      // Test Supabase connection and query prayer_slots table
      console.log('🔍 Testing Supabase connection...');
      console.log('🔗 Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
      
      // First, test if we can connect to any table
      const { data: testConnection, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);
      
      console.log('🔗 Supabase connection test:', { success: !testError, error: testError?.message });
      
      // Note: Database is empty - need to populate with prayer slots data
      console.log('📊 Database connection successful - checking for prayer slots data');
      
      // Now query the prayer_slots table directly 
      console.log('🔍 Querying prayer_slots table directly...');
      const { data: allPrayerSlots, error: allSlotsError, count } = await supabase
        .from('prayer_slots')
        .select('*', { count: 'exact' });
        
      console.log('📊 ALL prayer_slots query result:', { 
        count: count || allPrayerSlots?.length || 0, 
        error: allSlotsError?.message,
        sample: allPrayerSlots?.[0] 
      });

      if (allSlotsError) {
        if (allSlotsError.code === '42P01') {
          console.error('❌ prayer_slots table does not exist. Please create the table first.');
        } else {
          console.error('❌ Error accessing prayer_slots table:', allSlotsError);
        }
        return;
      }

      if (!allPrayerSlots?.length && count === 0) {
        console.log('⚠️ prayer_slots table is empty - no prayer slots available for reminders');
        console.log('💡 Add sample prayer slots using create-whatsapp-bot-tables.sql');
        return;
      }
      
      if (count && count > 0) {
        console.log(`✅ BREAKTHROUGH! Found ${count} total prayer slots in database!`);
      }

      // Filter for active status
      const prayerSlots = allPrayerSlots?.filter(slot => slot.status === 'active') || [];
      console.log(`✅ Found ${prayerSlots.length} active prayer slots out of ${allPrayerSlots?.length || count || 0} total slots`);
      
      if (!prayerSlots.length) {
        const statuses = allPrayerSlots?.map(slot => slot.status) || [];
        console.log('📋 Available statuses:', Array.from(new Set(statuses)));
        console.log('⚠️ No slots with "active" status found');
        return;
      }

      // Extract user IDs, handling different possible column name formats
      const userIds = prayerSlots.map(slot => {
        return slot.user_id || slot.userId || slot.User_ID || slot['user-id'];
      }).filter(id => id);

      console.log('🔍 Extracted user IDs:', userIds);

      if (!userIds.length) {
        console.log('❌ No user IDs found in prayer slots');
        return;
      }

      // Get WhatsApp bot users who have active prayer slots
      const { data: whatsappUsers, error: usersError } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id, whatsapp_number, reminder_preferences')
        .in('user_id', userIds)
        .not('whatsapp_number', 'is', null);

      console.log('📱 WhatsApp users found:', whatsappUsers?.length || 0);

      if (usersError) {
        console.error('Error fetching WhatsApp users:', usersError);
        return;
      }

      // Get user profiles for names
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      console.log('👥 User profiles found:', userProfiles?.length || 0);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        return;
      }

      // Combine the data
      const activeSlots = prayerSlots.map(slot => {
        const userId = slot.user_id || slot.userId || slot.User_ID || slot['user-id'];
        const slotTime = slot.slot_time || slot.slotTime || slot.Slot_Time || slot['slot-time'];
        
        const whatsappUser = whatsappUsers?.find(user => user.user_id === userId);
        const userProfile = userProfiles?.find(profile => profile.user_id === userId);
        
        return {
          slot_time: slotTime,
          user_id: userId,
          whatsapp_number: whatsappUser?.whatsapp_number,
          reminder_preferences: whatsappUser?.reminder_preferences,
          full_name: userProfile?.full_name
        };
      }).filter(slot => slot.whatsapp_number); // Only include users with WhatsApp numbers

      console.log(`✅ Final active slots with WhatsApp numbers: ${activeSlots.length}`);

      console.log(`Found ${activeSlots.length} active prayer slots with WhatsApp users`);

      for (const slot of activeSlots) {
        const whatsAppNumber = slot.whatsapp_number;
        if (!whatsAppNumber) continue;

        const slotParts = slot.slot_time?.split('–'); // Expecting "HH:MM–HH:MM"
        if (!slotParts || slotParts.length !== 2) continue;

        const slotStartTimeStr = slotParts[0];
        const slotStartHour = parseInt(slotStartTimeStr.split(':')[0]);
        const slotStartMinute = parseInt(slotStartTimeStr.split(':')[1]);

        // Calculate time difference in minutes
        const slotTotalMinutes = slotStartHour * 60 + slotStartMinute;
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const timeDifferenceMinutes = slotTotalMinutes - currentTotalMinutes;

        let preferences: any = {};
        if (slot.reminder_preferences) {
          try {
            preferences = JSON.parse(slot.reminder_preferences);
          } catch (e) {
            console.error('Error parsing reminder preferences:', e);
          }
        }

        const reminderTiming = preferences.reminderTiming || '30min'; // Default to 30min if not set

        // Check for 1-hour reminder
        if (reminderTiming === '1hour' && timeDifferenceMinutes === 60) {
          await this.sendPrayerSlotReminder(whatsAppNumber, slot.full_name, slot.slot_time, '1 hour');
        }

        // Check for 30-minute reminder
        if (reminderTiming === '30min' && timeDifferenceMinutes === 30) {
          await this.sendPrayerSlotReminder(whatsAppNumber, slot.full_name, slot.slot_time, '30 minutes');
        }

        // Check for 15-minute reminder
        if (reminderTiming === '15min' && timeDifferenceMinutes === 15) {
          await this.sendPrayerSlotReminder(whatsAppNumber, slot.full_name, slot.slot_time, '15 minutes');
        }
      }
    } catch (error) {
      console.error('Error checking prayer slot reminders:', error);
    }
  }

  private async sendPrayerSlotReminder(whatsAppNumber: string, fullName: string | null, slotTime: string, timeRemaining: string) {
    try {
      const userName = fullName ? fullName.split(' ')[0] : 'Dear Intercessor';
      const slotStartTime = slotTime.split('–')[0];

      const message = `Hello ${userName}, you have ${timeRemaining} until your prayer slot begins at ${slotStartTime}. 

May the Lord prepare your heart for this sacred time of intercession. 🙏

Psalm 55:17 - "Evening, morning and noon I cry out in distress, and he hears my voice."`;

      const success = await this.sendWhatsAppMessage(whatsAppNumber, message);

      // Log the message
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          recipient_number: whatsAppNumber,
          message_type: 'reminder',
          message_content: message,
          status: success ? 'sent' : 'failed',
          sent_at: success ? new Date().toISOString() : null
        });

      if (error) {
        console.warn('Error logging prayer reminder:', error);
      }

      console.log(`Prayer slot reminder sent to ${userName} for ${slotTime} (${timeRemaining} before)`);
    } catch (error) {
      console.error('Error sending prayer slot reminder:', error);
    }
  }

  // Admin update broadcasting with AI summarization
  async broadcastAdminUpdate(updateTitle: string, updateContent: string): Promise<void> {
    try {
      // Summarize the update using AI
      const summarizedContent = await this.summarizeAdminUpdate(updateTitle, updateContent);

      // Get all active WhatsApp bot users
      const botUsers = await this.db
        .select({
          whatsAppNumber: whatsAppBotUsers.whatsAppNumber,
          userId: whatsAppBotUsers.userId
        })
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.isActive, true));

      const message = `📢 Important Update from Global Intercessors

${updateTitle}

${summarizedContent}

Visit the platform for full details.

God bless! 🙏`;

      // Send to all users
      for (const user of botUsers) {
        const success = await this.sendWhatsAppMessage(user.whatsAppNumber, message);

        // Log the message
        await this.db.insert(whatsAppMessages).values({
          recipientNumber: user.whatsAppNumber,
          messageType: 'admin_update',
          messageContent: message,
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : null
        });

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`Admin update broadcast to ${botUsers.length} users`);
    } catch (error) {
      console.error('Error broadcasting admin update:', error);
    }
  }

  private async summarizeAdminUpdate(title: string, content: string): Promise<string> {
    if (!this.deepSeekApiKey) {
      return content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }

    try {
      const prompt = `Summarize this admin update for WhatsApp delivery. Keep it concise (under 150 words) and professional:

Title: ${title}
Content: ${content}

Provide only the summarized content without any formatting.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.deepSeekApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          }
        })
      });

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return summary || content.slice(0, 200) + (content.length > 200 ? '...' : '');
    } catch (error) {
      console.error('Error summarizing admin update:', error);
      return content.slice(0, 200) + (content.length > 200 ? '...' : '');
    }
  }

  // User management methods
  async registerWhatsAppUser(userId: string, whatsAppNumber: string): Promise<boolean> {
    try {
      // Clean and validate phone number
      const cleanNumber = whatsAppNumber.replace(/[^\d+]/g, '');

      await this.db.insert(whatsAppBotUsers).values({
        userId,
        whatsAppNumber: cleanNumber,
        isActive: true,
        updatedAt: new Date(),
        createdAt: new Date(),
        timezone: 'UTC'
      }).onConflictDoUpdate({
        target: whatsAppBotUsers.whatsAppNumber,
        set: {
          userId,
          isActive: true,
          updatedAt: new Date()
        }
      });

      console.log(`WhatsApp user registered: ${userId} -> ${cleanNumber}`);
      return true;
    } catch (error) {
      console.error('Error registering WhatsApp user:', error);
      return false;
    }
  }

  async updateUserPreferences(userId: string, preferences: {
    personalReminderTime?: string;
    personalReminderDays?: string;
    timezone?: string;
  }): Promise<boolean> {
    try {
      await this.db
        .update(whatsAppBotUsers)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(whatsAppBotUsers.userId, userId));

      console.log(`Updated WhatsApp preferences for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  async deactivateWhatsAppUser(userId: string): Promise<boolean> {
    try {
      await this.db
        .update(whatsAppBotUsers)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(whatsAppBotUsers.userId, userId));

      console.log(`WhatsApp user deactivated: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deactivating WhatsApp user:', error);
      return false;
    }
  }

  // Statistics and monitoring
  async getMessageStats(): Promise<{
    totalSent: number;
    sentToday: number;
    failedToday: number;
    activeUsers: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [totalSent, sentToday, failedToday, activeUsers] = await Promise.all([
        this.db.select({ count: sql`count(*)` }).from(whatsAppMessages).where(eq(whatsAppMessages.status, 'sent')),
        this.db.select({ count: sql`count(*)` }).from(whatsAppMessages).where(
          and(
            eq(whatsAppMessages.status, 'sent'),
            sql`DATE(${whatsAppMessages.sentAt}) = ${today}`
          )
        ),
        this.db.select({ count: sql`count(*)` }).from(whatsAppMessages).where(
          and(
            eq(whatsAppMessages.status, 'failed'),
            sql`DATE(${whatsAppMessages.createdAt}) = ${today}`
          )
        ),
        this.db.select({ count: sql`count(*)` }).from(whatsAppBotUsers).where(eq(whatsAppBotUsers.isActive, true))
      ]);

      return {
        totalSent: Number(totalSent[0]?.count || 0),
        sentToday: Number(sentToday[0]?.count || 0),
        failedToday: Number(failedToday[0]?.count || 0),
        activeUsers: Number(activeUsers[0]?.count || 0)
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      return { totalSent: 0, sentToday: 0, failedToday: 0, activeUsers: 0 };
    }
  }

  // Interactive message handling with buttons and commands
  async handleIncomingMessage(phoneNumber: string, messageText: string, messageId?: string): Promise<void> {
    console.log(`\n📨 INCOMING MESSAGE:`);
    console.log(`📱 From: ${phoneNumber}`);
    console.log(`💬 Text: "${messageText}"`);
    console.log(`🆔 Message ID: ${messageId || 'N/A'}`);

    // Skip duplicate detection for button interactions to allow fast responses
    const isButtonInteraction = ['devotional', 'today_devotional', 'fresh_devotional', 'back_menu'].includes(messageText) || 
                               messageText.startsWith('remind_');

    if (!isButtonInteraction && messageId && this.processedMessages.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId} - SKIPPING`);
      return;
    }

    // Track processed messages (but not button clicks for speed)
    if (!isButtonInteraction && messageId) {
      this.processedMessages.add(messageId);
      // Clean up old messages (keep last 100 for better performance)
      if (this.processedMessages.size > 100) {
        const firstMessage = this.processedMessages.values().next().value;
        this.processedMessages.delete(firstMessage);
      }
    }

    // Check rate limiting
    if (this.isRateLimited(phoneNumber)) {
      return;
    }

    const command = messageText.toLowerCase().trim();
    console.log(`🎯 Processing command: "${command}"`);

    try {
      // Log user interaction asynchronously for speed
      this.logUserInteraction(phoneNumber, messageText, 'command').catch(dbError => {
        console.warn(`⚠️ Failed to log interaction for ${phoneNumber}:`, dbError.message);
      });

      switch (command) {
        case '/start':
        case 'start':
        case 'hi':
        case 'hello':
          console.log(`🚀 Executing START command for ${phoneNumber}`);
          try {
            await this.handleStartCommand(phoneNumber);
            console.log(`✅ START command completed for ${phoneNumber}`);
          } catch (startError) {
            console.error(`❌ START command failed for ${phoneNumber}:`, startError.message);
            // Always send a fallback response
            try {
              await this.sendMessage(phoneNumber, "🙏 Welcome to Global Intercessors Prayer Bot!\n\nI'm here to support your spiritual journey. Type 'menu' for options.\n\nGod bless your intercession! 🌟");
            } catch (fallbackError) {
              console.error(`❌ Failed to send fallback message:`, fallbackError.message);
            }
          }
          break;

        case '/help':
        case 'help':
        case 'menu':
          console.log(`📋 Executing HELP command for ${phoneNumber}`);
          await this.sendHelpMenu(phoneNumber);
          console.log(`✅ HELP command completed for ${phoneNumber}`);
          break;

        case '/devotional':
        case 'devotional':
          console.log(`📖 Executing DEVOTIONAL command for ${phoneNumber}`);
          await this.sendDevotionalMenu(phoneNumber);
          console.log(`✅ DEVOTIONAL menu sent for ${phoneNumber}`);
          break;

        case 'today_devotional':
          console.log(`📅 Sending today's devotional for ${phoneNumber}`);
          await this.sendTodaysDevotional(phoneNumber, messageText);
          break;

        case 'get_fresh_word':
          console.log(`✨ Generating fresh word for ${phoneNumber}`);
          await this.sendFreshWord(phoneNumber);
          break;

        case 'fresh_devotional':
        case 'generate_declarations':
          console.log(`🔥 Generating fresh declarations for ${phoneNumber}`);
          await this.sendFreshDeclarations(phoneNumber, messageText);
          break;

        case 'bible_quiz':
        case 'quiz':
          console.log(`🧠 Starting Bible Quiz for ${phoneNumber}`);
          try {
            await this.sendBibleQuizMenu(phoneNumber);
          } catch (error) {
            console.error('Error showing Bible Quiz menu:', error);
            await this.sendMessage(phoneNumber, `🧠 Welcome to Bible Quiz! Let's test your biblical knowledge!\n\nChoose a mode:\n\n🌟 Type 'daily' for Daily Challenge\n🧠 Type 'smart' for Smart Quiz\n📖 Type 'topic' for Topic Quiz\n\nType 'menu' to go back.`);
          }
          break;

        case 'daily_challenge':
        case 'daily':
          console.log(`📅 Starting daily challenge for ${phoneNumber}`);
          try {
            await this.startBibleQuiz(phoneNumber, 'daily_challenge');
          } catch (error) {
            console.error('Error starting daily challenge:', error);
            await this.sendMessage(phoneNumber, `Sorry, I'm having trouble starting the daily challenge right now. Please try again in a moment! 🙏`);
          }
          break;

        case 'smart_quiz':
        case 'adaptive_quiz':
          console.log(`🎯 Starting smart quiz for ${phoneNumber}`);
          await this.startBibleQuiz(phoneNumber, 'smart_quiz');
          break;

        case 'topic_quiz':
          console.log(`📖 Starting topic quiz for ${phoneNumber}`);
          await this.startBibleQuiz(phoneNumber, 'topic_quiz');
          break;

        case 'next_question':
          console.log(`▶️ Next question for ${phoneNumber}`);
          await this.handleNextQuestion(phoneNumber);
          break;

        case 'end_quiz':
          console.log(`🏁 Ending quiz for ${phoneNumber}`);
          await this.endBibleQuiz(phoneNumber);
          break;

        case 'quiz_a':
        case 'quiz_b':
        case 'quiz_c':
        case 'quiz_d':
          console.log(`✅ Processing quiz answer ${command} for ${phoneNumber}`);
          await this.handleQuizAnswer(phoneNumber, command);
          break;

        case 'back_menu':
          console.log(`🔙 Back to main menu for ${phoneNumber}`);
          await this.sendHelpMenu(phoneNumber);
          break;

        case '/remind':
        case 'remind':
        case 'reminders':
          console.log(`⏰ Executing REMIND command for ${phoneNumber}`);
          await this.sendSamplePrayerReminder(phoneNumber);
          await this.showReminderPreferences(phoneNumber);
          console.log(`✅ REMIND preferences shown for ${phoneNumber}`);
          break;

        case 'remind_1hour':
          await this.setReminderPreference(phoneNumber, '1hour');
          break;

        case 'remind_30min':
          await this.setReminderPreference(phoneNumber, '30min');
          break;

        case 'remind_15min':
          await this.setReminderPreference(phoneNumber, '15min');
          break;

        case '/stop':
        case 'stop':
        case 'unsubscribe':
          await this.handleUnsubscribe(phoneNumber);
          await this.sendMessage(phoneNumber, "😢 You've been unsubscribed from all notifications. Type '/start' anytime to rejoin our prayer community!");
          break;

        case '/status':
        case 'status':
          await this.sendUserStatus(phoneNumber);
          break;

        case '/settings':
        case 'settings':
          await this.sendUserSettings(phoneNumber);
          break;

        case '/pause':
        case 'pause':
          await this.pauseUserReminders(phoneNumber);
          break;

        default:
          // Handle time setting (e.g., "7:00" or "19:30")
          if (/^\d{1,2}:\d{2}$/.test(command)) {
            await this.setDailyReminder(phoneNumber, command);
            await this.sendMessage(phoneNumber, `⏰ Personal reminder set for ${command}! You'll receive daily devotionals at this time.`);
          } else {
            // Unknown command - show help
            await this.sendMessage(phoneNumber, `I didn't understand "${messageText}". Type 'menu' to see available commands!`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling WhatsApp command "${command}" for ${phoneNumber}:`, error);

      // Try to send error message, but don't fail if this also errors
      try {
        await this.sendMessage(phoneNumber, "Sorry, I encountered an error. Please try again later or type 'help' for assistance.");
      } catch (sendError) {
        console.error(`❌ Failed to send error message to ${phoneNumber}:`, sendError);
      }
    }

    console.log(`📝 Message processing completed for ${phoneNumber}\n`);
  }

  // Handle start command with registration and personalized welcome
  private async handleStartCommand(phoneNumber: string): Promise<void> {
    console.log(`🚀 Processing start command for ${phoneNumber}`);

    // Try to register user, but continue even if it fails
    try {
      await this.registerUser(phoneNumber);
    } catch (error) {
      console.warn('⚠️ User registration failed, continuing with welcome message:', error.message);
    }

    // Get user's name for personalization
    const userName = await this.getUserName(phoneNumber);

    const welcomeMessage = `🙏 Hello ${userName}! Welcome to Global Intercessors Prayer Bot!

I'm your personal prayer companion, here to empower your spiritual journey with:

📖 **AI-Powered Devotionals** - Daily scripture with fresh insights
⏰ **Smart Prayer Reminders** - Never miss your intercession slot  
🌍 **Global Prayer Updates** - Connect with intercessors worldwide
✨ **Fresh Messages** - AI-generated declarations and prayer points
📊 **Personal Dashboard** - Track your spiritual growth
⚙️ **Custom Settings** - Personalized prayer experience

Ready to transform your prayer life? Choose an option below to begin your spiritual adventure!

*"The effective, fervent prayer of a righteous man avails much." - James 5:16*`;

    // Always try to send welcome message with interactive buttons
    try {
      await this.sendInteractiveMessage(phoneNumber, welcomeMessage, [
        { id: 'devotional', title: '📖 Get Today\'s Word' },
        { id: 'bible_quiz', title: '🧠 Bible Quiz' },
        { id: 'remind', title: '⏰ Setup Reminders' },
        { id: 'help', title: '📋 Full Menu' }
      ]);
    } catch (error) {
      console.warn('⚠️ Interactive message failed, sending simple welcome:', error.message);
      await this.sendMessage(phoneNumber, `${welcomeMessage}\n\nType 'menu' to explore all features.`);
    }
  }

  // Send personalized help menu with available commands
  private async sendHelpMenu(phoneNumber: string): Promise<void> {
    const userName = await this.getUserName(phoneNumber);
    const helpMessage = `📋 Welcome ${userName}! 

Here's your complete Global Intercessors command center:

🎯 **Quick Access Menu**
Choose any option below to continue your spiritual journey:`;

    // Send interactive menu with essential buttons
    await this.sendInteractiveMessage(phoneNumber, helpMessage, [
      { id: 'devotional', title: '📖 Daily Word' },
      { id: 'bible_quiz', title: '🧠 Bible Quiz' },
      { id: 'remind', title: '⏰ Prayer Alerts' },
      { id: 'status', title: '📊 My Dashboard' }
    ]);

    // Send additional options as second menu
    setTimeout(async () => {
      const additionalMessage = `⚙️ **Additional Options**

More features to enhance your prayer experience:`;

      await this.sendInteractiveMessage(phoneNumber, additionalMessage, [
        { id: 'settings', title: '⚙️ Preferences' },
        { id: 'pause', title: '⏸️ Pause Alerts' },
        { id: 'stop', title: '🛑 Unsubscribe' }
      ]);
    }, 1000);
  }

  // Send personalized devotional menu with options
  private async sendDevotionalMenu(phoneNumber: string): Promise<void> {
    const userName = await this.getUserName(phoneNumber);
    const menuMessage = `📖 ${userName}, Welcome to Your Spiritual Menu!

**Choose your spiritual nourishment:**

🤖 **Powered by DeepSeek AI** - Get authentic, personalized devotional content crafted just for you!`;

    await this.sendInteractiveMessage(phoneNumber, menuMessage, [
      { id: 'today_devotional', title: '📅 Today\'s Word' },
      { id: 'fresh_devotional', title: '🔥 Fresh Declarations' },
      { id: 'back_menu', title: '🔙 Back' }
    ]);
  }

  // Send interactive message with buttons
  private async sendInteractiveMessage(phoneNumber: string, message: string, buttons: Array<{id: string, title: string}>): Promise<boolean> {
    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`❌ WhatsApp credentials missing. Would send interactive message to ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log(`Buttons: ${buttons.map(b => b.title).join(', ')}`);
      return false;
    }

    console.log(`📤 Sending WhatsApp interactive message to ${phoneNumber}`);
    console.log(`Message: ${message.substring(0, 100)}...`);

    // For testing - show full message in console
    console.log(`\n🤖 BOT INTERACTIVE RESPONSE TO ${phoneNumber}:\n${message}`);
    console.log(`🔘 BUTTONS: ${buttons.map(b => `[${b.title}]`).join(' ')}\n`);

    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    const data = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: message
        },
        action: {
          buttons: buttons.slice(0, 3).map((button, index) => ({
            type: 'reply',
            reply: {
              id: button.id,
              title: button.title.substring(0, 20) // WhatsApp button title limit
            }
          }))
        }
      }
    };

    try {
      // Use AbortController for timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp Interactive API error:', errorData);

        // Fallback to regular message if interactive fails
        await this.sendMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
        return false;
      }

      const result = await response.json();
      console.log('✅ Interactive message sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending interactive message:', error);
      if (error.name === 'AbortError') {
        console.error('WhatsApp Interactive API request timed out');
      }

      // Fallback to regular message
      await this.sendMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
      return false;
    }
  }

  // Database operations for user management
  private async registerUser(phoneNumber: string): Promise<void> {
    try {
      console.log(`📝 Registering user for ${phoneNumber}`);

      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        if (selectError.code === '42P01') {
          console.error('⚠️ whatsapp_bot_users table does not exist. Please run create-whatsapp-bot-tables.sql');
          return;
        }
        console.error('Error checking existing user:', selectError);
        return;
      }

      if (!existingUser) {
        // Register new user
        const { error: insertError } = await supabase
          .from('whatsapp_bot_users')
          .insert({
            user_id: `whatsapp_user_${phoneNumber.replace('+', '')}`,
            whatsapp_number: phoneNumber,
            is_active: true,
            reminder_preferences: JSON.stringify({
              dailyDevotionals: true,
              prayerSlotReminders: true,
              reminderTiming: '30min',
              timezone: 'UTC'
            }),
            personal_reminder_time: null,
            timezone: 'UTC',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting new user:', insertError);
          if (insertError.code === '42P01') {
            console.error('⚠️ Please run create-whatsapp-bot-tables.sql in Supabase to create missing tables');
          }
          return;
        }

        console.log(`✅ New user registered: ${phoneNumber}`);
      } else {
        console.log(`👤 User already exists: ${phoneNumber}`);
        
        // Update user as active if they were inactive
        if (!existingUser.is_active) {
          const { error: updateError } = await supabase
            .from('whatsapp_bot_users')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('whatsapp_number', phoneNumber);

          if (!updateError) {
            console.log(`✅ User reactivated: ${phoneNumber}`);
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error registering user ${phoneNumber}:`, error?.message || 'Unknown error');
      // Don't throw error - continue with bot functionality even if registration fails
    }
  }

  // This method should NOT automatically send devotionals - REMOVED AUTOMATIC SENDING
  // Users must explicitly request devotionals through commands or buttons
  private async sendWelcomeMessage(phoneNumber: string): Promise<void> {
    // This method is deprecated - use handleStartCommand instead
    console.log('⚠️ sendWelcomeMessage deprecated - redirecting to handleStartCommand');
    await this.handleStartCommand(phoneNumber);
  }

  // Send today's devotional with DeepSeek AI and multilingual support
  private async sendTodaysDevotional(phoneNumber: string, userMessage?: string): Promise<void> {
    try {
      const userName = await this.getUserName(phoneNumber);
      
      // Detect language preference from user message or get stored preference
      let language: 'english' | 'shona' | 'bilingual' = 'english';
      if (userMessage) {
        language = this.detectLanguage(userMessage);
        this.setUserLanguagePreference(phoneNumber, language);
      } else {
        language = this.getUserLanguagePreference(phoneNumber);
      }
      
      const devotional = await this.generateStructuredTodaysWord(language);

      const devotionalText = `📖 ${userName}, Here's Your Word for Today!

**${devotional.topic}**

📜 **Scripture:** "${devotional.bibleVerse}"
- ${devotional.verseReference}

**Deep Understanding:**
${devotional.explanation}

🙏 **Prayer:**
${devotional.prayer}

**Amen.**

**Continue Your Spiritual Journey:**`;

      // Send devotional with interactive buttons
      await this.sendInteractiveMessage(phoneNumber, devotionalText, [
        { id: 'get_fresh_word', title: '✨ Get Fresh Word' },
        { id: 'back_menu', title: '🔙 Back' }
      ]);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'todays_word_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending today\'s word:', error);
      const userName = await this.getUserName(phoneNumber);
      await this.sendMessage(phoneNumber, `Sorry ${userName}, I couldn't generate your word right now. Please try again later. 🙏`);
    }
  }

  // Get today's devotional content
  private async getTodaysDevotional(): Promise<DevotionalContent> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if we have today's devotional in database
      const { data: existingDevotional, error } = await supabase
        .from('daily_devotionals')
        .select('*')
        .eq('date', today)
        .single();

      if (!error && existingDevotional) {
        return {
          devotionText: existingDevotional.devotion_text,
          bibleVerse: existingDevotional.bible_verse,
          verseReference: existingDevotional.verse_reference
        };
      }

      // Generate new devotional using AI
      const newDevotional = await this.generateDevotionalWithAI();

      // Save to database
      const { error: insertError } = await supabase
        .from('daily_devotionals')
        .insert({
          date: today,
          devotion_text: newDevotional.devotionText,
          bible_verse: newDevotional.bibleVerse,
          verse_reference: newDevotional.verseReference
        });

      if (insertError) {
        console.warn('Error saving devotional to database:', insertError);
      }

      return newDevotional;
    } catch (error) {
      console.error('Error getting today\'s devotional:', error);
      return this.getFallbackDevotional();
    }
  }

  // Generate structured Today's Word with DeepSeek AI and multilingual support  
  private async generateStructuredTodaysWord(language: 'english' | 'shona' | 'bilingual' = 'english'): Promise<{topic: string, bibleVerse: string, verseReference: string, explanation: string, prayer: string}> {
    if (!this.deepSeekApiKey) {
      console.log('No DeepSeek API key available, using fallback word');
      return this.getFallbackTodaysWord();
    }

    try {
      const today = new Date().toDateString();
      let prompt = '';
      
      if (language === 'shona') {
        prompt = `Generate a powerful "Today's Word" for Christian intercessors for ${today} IN SHONA LANGUAGE. Follow this exact structure:

1. A compelling topic title about prayer, faith, spiritual warfare, or intercession - IN SHONA
2. A relevant Bible verse that supports the topic - IN SHONA  
3. A deep, detailed explanation of the topic using the Bible verse, breaking it down for intercessors (3-4 sentences) - IN SHONA
4. A powerful, focused prayer based on the topic (2-3 sentences) - IN SHONA

Use proper chiShona grammar and spiritual terminology. Respond in this exact format:
TOPIC: [powerful topic title in Shona]
VERSE: [complete Bible verse text in Shona]
REFERENCE: [Book Chapter:Verse in Shona format]
EXPLANATION: [detailed breakdown in Shona]
PRAYER: [powerful prayer in Shona]`;
      } else if (language === 'bilingual') {
        prompt = `Generate a powerful "Today's Word" for Christian intercessors for ${today} IN BOTH SHONA AND ENGLISH. Follow this exact structure:

1. A compelling topic title about prayer, faith, spiritual warfare, or intercession - FIRST IN SHONA, THEN IN ENGLISH
2. A relevant Bible verse that supports the topic - FIRST IN SHONA, THEN IN ENGLISH
3. A deep, detailed explanation of the topic using the Bible verse, breaking it down for intercessors (3-4 sentences) - FIRST IN SHONA, THEN IN ENGLISH
4. A powerful, focused prayer based on the topic (2-3 sentences) - FIRST IN SHONA, THEN IN ENGLISH

Respond in this exact format with both languages:
TOPIC: [powerful topic title in Shona] | [same topic in English]
VERSE: [complete Bible verse in Shona] | [same verse in English]
REFERENCE: [Book Chapter:Verse in Shona] | [same reference in English]
EXPLANATION: [detailed breakdown in Shona] | [same explanation in English]
PRAYER: [powerful prayer in Shona] | [same prayer in English]`;
      } else {
        prompt = `Generate a powerful "Today's Word" for Christian intercessors for ${today}. Follow this exact structure:

1. A compelling topic title about prayer, faith, spiritual warfare, or intercession
2. A relevant Bible verse that supports the topic
3. A deep, detailed explanation of the topic using the Bible verse, breaking it down for intercessors (3-4 sentences)
4. A powerful, focused prayer based on the topic (2-3 sentences)

Respond in this exact format:
TOPIC: [powerful topic title]
VERSE: [complete Bible verse text]
REFERENCE: [Book Chapter:Verse]
EXPLANATION: [detailed breakdown of the topic using the verse]
PRAYER: [powerful prayer focused on the topic]`;
      }

      console.log('Calling DeepSeek API for structured Today\'s Word...');

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a Christian spiritual advisor creating powerful devotional content for prayer warriors and intercessors. Provide biblical, encouraging, and practical spiritual guidance that empowers intercession.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 600,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        console.error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        return this.getFallbackTodaysWord(language);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        console.log('DeepSeek AI response received for Today\'s Word');

        // Parse the structured response
        const topicMatch = aiResponse.match(/TOPIC:\s*(.*?)(?=VERSE:|$)/s);
        const verseMatch = aiResponse.match(/VERSE:\s*(.*?)(?=REFERENCE:|$)/s);
        const referenceMatch = aiResponse.match(/REFERENCE:\s*(.*?)(?=EXPLANATION:|$)/s);
        const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.*?)(?=PRAYER:|$)/s);
        const prayerMatch = aiResponse.match(/PRAYER:\s*(.*?)$/s);

        const topic = topicMatch?.[1]?.trim() || "Divine Authority in Prayer";
        const bibleVerse = verseMatch?.[1]?.trim() || "The effective, fervent prayer of a righteous man avails much.";
        const verseReference = referenceMatch?.[1]?.trim() || "James 5:16";
        const explanation = explanationMatch?.[1]?.trim() || "When we pray with righteousness and fervency, our prayers carry divine authority that moves heaven and earth.";
        const prayer = prayerMatch?.[1]?.trim() || "Father, empower my prayers today with Your righteousness and fervent spirit. Let my intercession break through every barrier and accomplish Your will.";

        return { topic, bibleVerse, verseReference, explanation, prayer };
      }
    } catch (error) {
      console.error('Error generating Today\'s Word with DeepSeek AI:', error);
    }

    console.log('Using fallback Today\'s Word due to API error');
    return this.getFallbackTodaysWord(language);
  }

  // Fallback Today's Word content with multilingual support
  private getFallbackTodaysWord(language: 'english' | 'shona' | 'bilingual' = 'english'): {topic: string, bibleVerse: string, verseReference: string, explanation: string, prayer: string} {
    if (language === 'shona') {
      return {
        topic: "Simba Remwari Mumunamato",
        bibleVerse: "Munamato womunhu wakarurama unoshanda zvikuru kana uchinyatsokumbirwa.",
        verseReference: "Jakobho 5:16",
        explanation: "Kana tichinamata nokururama uye nokushingaira, minamato yedu inotakura simba raMwari rinokwanisa kushandura denga nenyika. Tsamba iyi inoratidza kuti minamato yedu haisi mashoko chete, asi zvombo zvine simba zvoumumweya zvinokwanisa kuitisa zvizhinji muumambo hwaMwari.",
        prayer: "Baba, ndinokutendai nokuti minamato yangu inoshanda uye ine simba. Ndizadzei nokururama kwenyu uye mugope mweya wokushingaira pakunamata. Rega minamato yangu ikuite zvizhinji muumambo hwenyu uye ikaunze budiriro munzvimbo dzose dzandinosimudza kwamuri."
      };
    } else if (language === 'bilingual') {
      return {
        topic: "Simba Remwari Mumunamato | Divine Authority in Prayer",
        bibleVerse: "Munamato womunhu wakarurama unoshanda zvikuru kana uchinyatsokumbirwa.\nThe effective, fervent prayer of a righteous man avails much.",
        verseReference: "Jakobho 5:16 | James 5:16",
        explanation: "Kana tichinamata nokururama uye nokushingaira, minamato yedu inotakura simba raMwari rinokwanisa kushandura denga nenyika. Tsamba iyi inoratidza kuti minamato yedu haisi mashoko chete, asi zvombo zvine simba zvoumumweya.\nWhen we pray with righteousness and fervency, our prayers carry divine authority that moves heaven and earth. This verse reveals that our prayers are not mere words, but powerful spiritual weapons.",
        prayer: "Baba, ndinokutendai nokuti minamato yangu inoshanda uye ine simba. Ndizadzei nokururama kwenyu uye mugope mweya wokushingaira pakunamata.\nFather, I thank You that my prayers are effective and powerful. Fill me with Your righteousness and grant me a fervent spirit as I intercede today."
      };
    } else {
      return {
        topic: "Divine Authority in Prayer",
        bibleVerse: "The effective, fervent prayer of a righteous man avails much.",
        verseReference: "James 5:16",
        explanation: "When we pray with righteousness and fervency, our prayers carry divine authority that moves heaven and earth. This verse reveals that our prayers are not mere words, but powerful spiritual weapons that accomplish much in the kingdom of God. As intercessors, we must understand that our prayers have the power to change circumstances, heal the sick, and transform nations.",
        prayer: "Father, I thank You that my prayers are effective and powerful. Fill me with Your righteousness and grant me a fervent spirit as I intercede today. Let my prayers accomplish much for Your kingdom and bring breakthrough in every situation I lift before You."
      };
    }
  }

  // Fallback devotional content
  private getFallbackDevotional(): DevotionalContent {
    return {
      devotionText: "Begin each day with prayer and end it with gratitude. God's mercies are new every morning.",
      bibleVerse: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
      verseReference: "Lamentations 3:22-23"
    };
  }

  // Send fresh word generated by DeepSeek AI with interactive buttons
  private async sendFreshWord(phoneNumber: string): Promise<void> {
    try {
      const userName = await this.getUserName(phoneNumber);
      const freshWord = await this.generateStructuredTodaysWord();

      const wordText = `✨ ${userName}, Fresh Word from the Lord!

**${freshWord.topic}**

📜 **Scripture:** "${freshWord.bibleVerse}"
- ${freshWord.verseReference}

**Deep Understanding:**
${freshWord.explanation}

🙏 **Prayer:**
${freshWord.prayer}

**Amen.**

**Ready for More Spiritual Power?**`;

      // Send fresh word with interactive buttons
      await this.sendInteractiveMessage(phoneNumber, wordText, [
        { id: 'get_fresh_word', title: '✨ Get Fresh Word' },
        { id: 'back_menu', title: '🔙 Back' }
      ]);

      // Log word delivery
      await this.logUserInteraction(phoneNumber, 'fresh_word_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending fresh word:', error);
      const userName = await this.getUserName(phoneNumber);
      await this.sendMessage(phoneNumber, `Sorry ${userName}, I couldn't generate a fresh word right now. Please try again later. 🙏`);
    }
  }

  // Send fresh declarations generated by DeepSeek AI with multilingual support
  private async sendFreshDeclarations(phoneNumber: string, userMessage?: string): Promise<void> {
    try {
      const userName = await this.getUserName(phoneNumber);
      
      // Detect language preference from user message or get stored preference
      let language: 'english' | 'shona' | 'bilingual' = 'english';
      if (userMessage) {
        language = this.detectLanguage(userMessage);
        this.setUserLanguagePreference(phoneNumber, language);
      } else {
        language = this.getUserLanguagePreference(phoneNumber);
      }
      
      const declarations = await this.generateFreshDeclarations(language);

      const declarationsText = `🔥 ${userName}, Fresh Declarations from Heaven!

📌 **Declaration Focus:** ${declarations.focus}

${declarations.declarations.map((decl, index) => 
        `${index + 1}️⃣ 🔥 ${decl.declaration}
📖 ${decl.verseReference} — "${decl.verse}"`
      ).join('\n\n')}

**Continue in the Spirit:**`;

      // Send declarations with interactive buttons
      await this.sendInteractiveMessage(phoneNumber, declarationsText, [
        { id: 'fresh_devotional', title: '🔄 Generate Another' },
        { id: 'back_menu', title: '🔙 Back' }
      ]);

      // Log declarations delivery
      await this.logUserInteraction(phoneNumber, 'fresh_declarations_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending fresh declarations:', error);
      const userName = await this.getUserName(phoneNumber);
      await this.sendMessage(phoneNumber, `Sorry ${userName}, I couldn't generate fresh declarations right now. Please try again later. 🙏`);
    }
  }

  // Generate fresh declarations using DeepSeek AI with multilingual support
  private async generateFreshDeclarations(language: 'english' | 'shona' | 'bilingual' = 'english'): Promise<{focus: string, declarations: Array<{declaration: string, verse: string, verseReference: string}>}> {
    if (!this.deepSeekApiKey) {
      console.log('No DeepSeek API key available, using fallback declarations');
      return this.getFallbackDeclarations();
    }

    try {
      const timestamp = Date.now();
      let prompt = '';
      
      if (language === 'shona') {
        prompt = `Generate 10 powerful declarations for Christian intercessors IN SHONA LANGUAGE (ID: ${timestamp}). Create:

1. A compelling focus theme in Shona (e.g., "Moyo Wakamira Mukushe", "Simba Remwari", "Kukunda Mumweya")
2. 10 numbered declarations with Bible verses, following this format exactly:
   - Each declaration should be powerful, faith-filled, and in first person ("Ndinodanidzira..." or "Ndinoreva...")
   - Include relevant emojis naturally in the declarations
   - Each declaration must have a supporting Bible verse with reference - ALL IN SHONA
   - Make them unique and spiritually empowering
   - Use proper chiShona grammar and spiritual terminology

Respond in this exact format:
FOCUS: [compelling focus theme in Shona]
DECLARATION1: [powerful "Ndinodanidzira" statement with emojis in Shona]
VERSE1: [complete Bible verse text in Shona]
REFERENCE1: [Book Chapter:Verse]
DECLARATION2: [powerful declaration in Shona with emojis]
VERSE2: [complete Bible verse text in Shona]
REFERENCE2: [Book Chapter:Verse]
[Continue for all 10 declarations in Shona]`;
      } else if (language === 'bilingual') {
        prompt = `Generate 10 powerful declarations for Christian intercessors in BOTH SHONA AND ENGLISH (ID: ${timestamp}). Create:

1. A compelling focus theme in both Shona and English
2. 10 numbered declarations with Bible verses, following this format exactly:
   - Each declaration should be powerful, faith-filled, and in first person
   - FIRST in Shona ("Ndinodanidzira..."), THEN in English ("I declare...")
   - Include relevant emojis naturally in the declarations
   - Each declaration must have a supporting Bible verse with reference - BOTH languages
   - Make them unique and spiritually empowering
   - Use proper chiShona grammar and professional English

Respond in this exact format:
FOCUS_SHONA: [compelling focus theme in Shona]
FOCUS_ENGLISH: [compelling focus theme in English]
DECLARATION1_SHONA: [powerful statement in Shona with emojis]
DECLARATION1_ENGLISH: [powerful statement in English with emojis]
VERSE1_SHONA: [Bible verse in Shona]
VERSE1_ENGLISH: [Bible verse in English]
REFERENCE1: [Book Chapter:Verse]
[Continue for all 10 declarations in both languages]`;
      } else {
        prompt = `Generate 10 powerful declarations for Christian intercessors (ID: ${timestamp}). Create:

1. A compelling focus theme (e.g., "Heart Standing Firm in the Lord", "Divine Authority", "Spiritual Breakthrough")
2. 10 numbered declarations with Bible verses, following this format exactly:
   - Each declaration should be powerful, faith-filled, and in first person ("I declare...")
   - Include relevant emojis naturally in the declarations
   - Each declaration must have a supporting Bible verse with reference
   - Make them unique and spiritually empowering

Respond in this exact format:
FOCUS: [compelling focus theme]
DECLARATION1: [powerful "I declare" statement with emojis]
VERSE1: [complete Bible verse text]
REFERENCE1: [Book Chapter:Verse]
DECLARATION2: [powerful "I declare" statement with emojis]
VERSE2: [complete Bible verse text]
REFERENCE2: [Book Chapter:Verse]
[Continue for all 10 declarations]`;
      }

      console.log('Calling DeepSeek API for fresh declarations...');

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a prophetic spiritual advisor creating powerful declarations for Christian intercessors and prayer warriors. Always create faith-filled, victorious declarations that empower spiritual warfare and intercession.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1200,
          temperature: 0.95
        })
      });

      if (!response.ok) {
        console.error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        return this.getFallbackDeclarations(language);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        console.log('DeepSeek AI response received for fresh declarations');

        // Parse the structured response
        const focusMatch = aiResponse.match(/FOCUS:\s*(.*?)(?=DECLARATION1:|$)/s);
        const focus = focusMatch?.[1]?.trim() || "💖 Heart Standing Firm in the Lord";

        const declarations = [];
        for (let i = 1; i <= 10; i++) {
          const declMatch = aiResponse.match(new RegExp(`DECLARATION${i}:\\s*(.*?)(?=VERSE${i}:|$)`, 's'));
          const verseMatch = aiResponse.match(new RegExp(`VERSE${i}:\\s*(.*?)(?=REFERENCE${i}:|DECLARATION${i+1}:|$)`, 's'));
          const refMatch = aiResponse.match(new RegExp(`REFERENCE${i}:\\s*(.*?)(?=DECLARATION${i+1}:|VERSE${i+1}:|$)`, 's'));

          if (declMatch && verseMatch && refMatch) {
            declarations.push({
              declaration: declMatch[1].trim(),
              verse: verseMatch[1].trim(),
              verseReference: refMatch[1].trim()
            });
          }
        }

        // If we didn't get 10 declarations, fill with fallback
        while (declarations.length < 10) {
          const fallback = this.getFallbackDeclarations(language);
          declarations.push(fallback.declarations[declarations.length % fallback.declarations.length]);
        }

        return { focus, declarations: declarations.slice(0, 10) };
      }
    } catch (error) {
      console.error('Error generating fresh declarations with DeepSeek AI:', error);
    }

    console.log('Using fallback declarations due to API error');
    return this.getFallbackDeclarations(language);
  }

  // Language detection method
  private detectLanguage(message: string): 'english' | 'shona' | 'bilingual' {
    const shonaWords = ['ndini', 'ndinotenda', 'mufudzi', 'jesu', 'mwari', 'kristu', 'bhaibheri', 'munamato', 'namato', 'chirevo', 'shona', 'ndiyamuke', 'ndanzwe', 'muchishona', 'chiShona', 'rukudzo', 'rwedenga', 'komborero', 'rugare', 'rudo'];
    const englishWords = ['prayer', 'declare', 'bible', 'jesus', 'christ', 'devotion', 'english', 'word', 'verse', 'god', 'lord', 'faith', 'blessing', 'peace', 'love'];
    
    const messageWords = message.toLowerCase().split(/\s+/);
    let shonaCount = 0;
    let englishCount = 0;
    
    messageWords.forEach(word => {
      if (shonaWords.some(sw => word.includes(sw))) shonaCount++;
      if (englishWords.some(ew => word.includes(ew))) englishCount++;
    });

    // Check for explicit language requests
    if (message.toLowerCase().includes('shona') || message.toLowerCase().includes('chishona') || message.toLowerCase().includes('muchishona')) {
      return shonaCount > 0 ? 'bilingual' : 'shona';
    }
    
    if (shonaCount > englishCount) return 'shona';
    if (englishCount > shonaCount) return 'english';
    return 'english'; // Default to English
  }

  // Store user language preference
  private setUserLanguagePreference(phoneNumber: string, language: 'english' | 'shona' | 'bilingual') {
    this.userLanguagePreferences.set(phoneNumber, language);
  }

  // Get user language preference
  private getUserLanguagePreference(phoneNumber: string): 'english' | 'shona' | 'bilingual' {
    return this.userLanguagePreferences.get(phoneNumber) || 'english';
  }

  // Fallback declarations content with multilingual support
  private getFallbackDeclarations(language: 'english' | 'shona' | 'bilingual' = 'english'): {focus: string, declarations: Array<{declaration: string, verse: string, verseReference: string}>} {
    
    if (language === 'shona') {
      return {
        focus: "💖 Moyo Wakamira Mukushe",
        declarations: [
          {
            declaration: "Ndinodanidzira kuti moyo wangu haushaike nokuti Ishe ndiwo hwaro hwangu! 🙏💪🏽✨",
            verse: "Havazotya mashoko akaipa; mwoyo yavo yakasimba, ichivimba naJehovha.",
            verseReference: "Pisarema 112:7"
          },
          {
            declaration: "Ndinodanidzira kuti moyo wangu unoramba wakachena uye wakatendeka kuShoko raMwari! 💎❤️🙌",
            verse: "Vakaropafadzwa vanochena pamoyo, nokuti ivo vachaona Mwari.",
            verseReference: "Mateo 5:8"
          },
          {
            declaration: "Ndinodanidzira kuti moyo wangu unodziviridzwa noRugare rwaKristu! 🕊️💖🛡️",
            verse: "Uye rugare rwaMwari... ruchadzivira mwoyo yenyu nendangariro dzenyu muna Kristu Jesu.",
            verseReference: "VaFiripi 4:7"
          }
        ]
      };
    } else if (language === 'bilingual') {
      return {
        focus: "💖 Moyo Wakamira Mukushe | Heart Standing Firm in the Lord",
        declarations: [
          {
            declaration: "Ndinodanidzira kuti moyo wangu haushaike nokuti Ishe ndiwo hwaro hwangu! 🙏💪🏽✨\nI declare my heart is unshakable because the Lord is my foundation! 🙏💪🏽✨",
            verse: "Havazotya mashoko akaipa; mwoyo yavo yakasimba, ichivimba naJehovha.\nThey will have no fear of bad news; their hearts are steadfast, trusting in the Lord.",
            verseReference: "Pisarema 112:7 | Psalm 112:7"
          },
          {
            declaration: "Ndinodanidzira kuti moyo wangu unoramba wakachena uye wakatendeka kuShoko raMwari! 💎❤️🙌\nI declare that my heart remains pure and faithful to God's Word! 💎❤️🙌",
            verse: "Vakaropafadzwa vanochena pamoyo, nokuti ivo vachaona Mwari.\nBlessed are the pure in heart, for they will see God.",
            verseReference: "Mateo 5:8 | Matthew 5:8"
          }
        ]
      };
    } else {
      return {
        focus: "💖 Heart Standing Firm in the Lord",
        declarations: [
        {
          declaration: "I declare my heart is unshakable because the Lord is my foundation! 🙏💪🏽✨",
          verse: "They will have no fear of bad news; their hearts are steadfast, trusting in the Lord.",
          verseReference: "Psalm 112:7"
        },
        {
          declaration: "I declare that my heart remains pure and faithful to God's Word! 💎❤️🙌",
          verse: "Blessed are the pure in heart, for they will see God.",
          verseReference: "Matthew 5:8"
        },
        {
          declaration: "I declare my heart is guarded by the peace of Christ! 🕊️💖🛡️",
          verse: "And the peace of God… will guard your hearts and your minds in Christ Jesus.",
          verseReference: "Philippians 4:7"
        },
        {
          declaration: "I declare that my heart overflows with unshakable joy! 😄🔥💐",
          verse: "The joy of the Lord is your strength.",
          verseReference: "Nehemiah 8:10"
        },
        {
          declaration: "I declare my heart will not be troubled but rests in His promises! 🌊🛌🙏",
          verse: "Do not let your hearts be troubled. You believe in God; believe also in me.",
          verseReference: "John 14:1"
        },
        {
          declaration: "I declare my heart beats with faith, not fear! 💓🛡️🔥",
          verse: "So do not fear, for I am with you… I will uphold you with my righteous right hand.",
          verseReference: "Isaiah 41:10"
        },
        {
          declaration: "I declare my heart treasures the Word of God daily! 📖❤️💎",
          verse: "I have hidden your word in my heart that I might not sin against you.",
          verseReference: "Psalm 119:11"
        },
        {
          declaration: "I declare my heart is strengthened every day by the Spirit of God! 💪🔥💨",
          verse: "That He may strengthen you with power through His Spirit in your inner being.",
          verseReference: "Ephesians 3:16"
        },
        {
          declaration: "I declare my heart overflows with love for God and people! ❤️🤝🔥",
          verse: "Love the Lord your God… and love your neighbor as yourself.",
          verseReference: "Mark 12:30-31"
        },
        {
          declaration: "I declare my heart remains faithful until the end! 🏁❤️🙌",
          verse: "We have come to share in Christ, if indeed we hold our original conviction firmly to the very end.",
          verseReference: "Hebrews 3:14"
        }
      ]
    };
  }

  // Generate fresh devotional using DeepSeek AI
  private async generateFreshDevotionalWithAI(): Promise<DevotionalContent> {
    if (!this.deepSeekApiKey) {
      console.log('No DeepSeek API key available, using fallback devotional');
      return this.getFallbackDevotional();
    }

    try {
      const timestamp = Date.now();
      const currentTime = new Date().toLocaleString();
      const prompt = `Generate a completely unique and fresh devotional for Christian intercessors (${timestamp} - ${currentTime}). This must be entirely different from any previous devotional. Create:

1. A powerful, inspiring devotional message (2-3 sentences) about intercession, spiritual warfare, prayer breakthrough, or faith victories
2. A relevant Bible verse that aligns with the devotional theme
3. The complete Bible reference (Book Chapter:Verse)
4. Make it unique, encouraging, and practical for intercessors standing in the gap
5. Include themes like: breakthrough prayers, spiritual authority, prophetic intercession, or nations transformation

Respond in this exact format:
DEVOTION: [your unique devotional message]
VERSE: [the complete Bible verse]
REFERENCE: [Book Chapter:Verse]
DECLARATION: [a short declaration prayer based on the devotional]`;

      console.log('Calling DeepSeek API for fresh devotional...');

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a prophetic spiritual advisor creating fresh, unique devotional content for Christian intercessors and prayer warriors. Always create completely new, powerful, and meaningful content that empowers spiritual warfare.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.95 // Very high temperature for maximum creativity and uniqueness
        })
      });

      if (!response.ok) {
        console.error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        return this.getFallbackDevotional();
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        console.log('DeepSeek AI response received for fresh devotional');

        // Parse the structured response
        const devotionMatch = aiResponse.match(/DEVOTION:\s*(.*?)(?=VERSE:|$)/s);
        const verseMatch = aiResponse.match(/VERSE:\s*(.*?)(?=REFERENCE:|DECLARATION:|$)/s);
        const referenceMatch = aiResponse.match(/REFERENCE:\s*(.*?)(?=DECLARATION:|$)/s);
        const declarationMatch = aiResponse.match(/DECLARATION:\s*(.*?)$/s);

        const devotionText = devotionMatch?.[1]?.trim() || "God has positioned you as a watchman on the wall. Your prayers are powerful and effective for breakthrough.";
        const bibleVerse = verseMatch?.[1]?.trim() || "The effective, fervent prayer of a righteous man avails much.";
        const verseReference = referenceMatch?.[1]?.trim() || "James 5:16";
        const declaration = declarationMatch?.[1]?.trim();

        // Add declaration to the devotional text if present
        let finalDevotionText = devotionText;
        if (declaration) {
          finalDevotionText += `\n\n🔥 Declaration: ${declaration}`;
        }

        return { 
          devotionText: finalDevotionText, 
          bibleVerse, 
          verseReference 
        };
      }
    } catch (error) {
      console.error('Error generating fresh devotional with DeepSeek AI:', error);
    }

    console.log('Using fallback devotional due to API error');
    return this.getFallbackDevotional();
  }

  // Get user name from user profiles table for personalization
  private async getUserName(phoneNumber: string): Promise<string> {
    try {
      // First try to get from user profiles table directly using phone number
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('phone_number', phoneNumber)
        .single();

      if (!directError && directProfile?.full_name) {
        return directProfile.full_name.split(' ')[0];
      }

      // Fallback: try to get user ID from whatsapp_bot_users and then look up profile
      const { data: botUser, error: botError } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (botError) {
        if (botError.code === '42P01') {
          console.warn('⚠️ whatsapp_bot_users table missing - using default name');
        }
        return 'Dear Intercessor';
      }

      if (botUser?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', botUser.user_id)
          .single();

        if (!profileError && profile?.full_name) {
          return profile.full_name.split(' ')[0];
        }
      }

      return 'Dear Intercessor';
    } catch (error: any) {
      console.warn('Error getting user name:', error?.message || 'Unknown error');
      return 'Dear Intercessor';
    }
  }

  // Show reminder preference options
  private async showReminderPreferences(phoneNumber: string): Promise<void> {
    const userName = await this.getUserName(phoneNumber);
    const userSlot = await this.getUserPrayerSlot(phoneNumber);

    let slotMessage = '';
    if (userSlot) {
      slotMessage = `\n🎯 Your Prayer Slot: ${userSlot}\n\nYou will be reminded at your chosen time before your slot begins.`;
    }

    const reminderMessage = `⏰ ${userName}, choose your reminder preference:${slotMessage}

Select when you'd like to be reminded before your prayer slot:`;

    await this.sendInteractiveMessage(phoneNumber, reminderMessage, [
      { id: 'remind_1hour', title: '🕐 1 Hour Before' },
      { id: 'remind_30min', title: '🕕 30 Minutes Before' },
      { id: 'remind_15min', title: '🕘 15 Minutes Before' }
    ]);
  }

  // Set reminder preference
  private async setReminderPreference(phoneNumber: string, preference: string): Promise<void> {
    try {
      const userName = await this.getUserName(phoneNumber);
      let reminderTime = '30min'; // default
      let displayTime = '30 minutes';

      switch (preference) {
        case '1hour':
          reminderTime = '1hour';
          displayTime = '1 hour';
          break;
        case '30min':
          reminderTime = '30min';
          displayTime = '30 minutes';
          break;
        case '15min':
          reminderTime = '15min';
          displayTime = '15 minutes';
          break;
      }

      // Get current preferences
      const { data: currentUser, error: getUserError } = await supabase
        .from('whatsapp_bot_users')
        .select('reminder_preferences')
        .eq('whatsapp_number', phoneNumber)
        .single();

      let preferences = { 
        prayerSlotReminders: true,
        reminderTiming: reminderTime
      };

      if (!getUserError && currentUser?.reminder_preferences) {
        try {
          preferences = { 
            ...JSON.parse(currentUser.reminder_preferences), 
            prayerSlotReminders: true,
            reminderTiming: reminderTime
          };
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      }

      // Update preferences
      const { error: updateError } = await supabase
        .from('whatsapp_bot_users')
        .update({
          reminder_preferences: JSON.stringify(preferences)
        })
        .eq('whatsapp_number', phoneNumber);

      if (updateError) {
        console.error('Error updating reminder preferences:', updateError);
        return;
      }

      const userSlot = await this.getUserPrayerSlot(phoneNumber);
      const slotInfo = userSlot ? `\n\n🎯 Your Prayer Slot: ${userSlot}\nYou will be reminded ${displayTime} before your slot begins.` : '';

      await this.sendMessage(phoneNumber, `✅ Perfect, ${userName}! Reminder preference set to ${displayTime} before your prayer slot.${slotInfo}\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting reminder preference:', error);
    }
  }

  // Get user's name from profile
  private async getUserName(phoneNumber: string): Promise<string> {
    try {
      const { data: user, error } = await supabase
        .from('whatsapp_bot_users')
        .select(`
          user_id,
          user_profiles!inner(full_name)
        `)
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (error) {
        console.warn('Error getting user name:', error.message);
        return 'Dear Intercessor';
      }

      if (user?.user_profiles?.full_name) {
        return user.user_profiles.full_name.split(' ')[0]; // First name
      }

      // Fallback: try to get from user profiles table directly using phone number
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('phone_number', phoneNumber)
        .single();

      if (!directError && directProfile?.full_name) {
        return directProfile.full_name.split(' ')[0];
      }

      return 'Dear Intercessor';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'Dear Intercessor';
    }
  }

  // Get user's prayer slot
  private async getUserPrayerSlot(phoneNumber: string): Promise<string | null> {
    try {
      // Get user ID from WhatsApp bot users table
      const { data: user, error: userError } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (userError || !user?.user_id) return null;

      // Get prayer slot for the user
      const { data: slot, error: slotError } = await supabase
        .from('prayer_slots')
        .select('slot_time')
        .eq('user_id', user.user_id)
        .eq('status', 'active')
        .single();

      if (slotError || !slot) return null;

      return slot.slot_time;
    } catch (error) {
      console.error('Error getting user prayer slot:', error);
      return null;
    }
  }

  // Send morning declarations to all users
  async sendMorningDeclarations(): Promise<void> {
    try {
      console.log('🌅 Sending morning declarations to all users...');

      // Generate fresh morning declaration using DeepSeek AI
      const morningDeclaration = await this.generateMorningDeclaration();

      // Get all active users with their profiles
      const activeUsers = await this.db
        .select({
          whatsAppNumber: whatsAppBotUsers.whatsAppNumber,
          userId: whatsAppBotUsers.userId,
          fullName: userProfiles.fullName
        })
        .from(whatsAppBotUsers)
        .leftJoin(userProfiles, eq(whatsAppBotUsers.userId, userProfiles.id))
        .where(eq(whatsAppBotUsers.isActive, true));

      let sentCount = 0;

      for (const user of activeUsers) {
        const userName = (user.fullName || user.full_name) ? (user.fullName || user.full_name).split(' ')[0] : 'Dear Intercessor';

        const message = `🌅 Good Morning, ${userName}!

Today's Morning Declaration:

${morningDeclaration.declaration}

📜 Scripture Foundation: "${morningDeclaration.bibleVerse}"
- ${morningDeclaration.verseReference}

🙏 Declare this over your day and step into God's victory!

God bless your day! ✨`;

        const success = await this.sendMessage(user.whatsAppNumber, message);

        if (success) {
          sentCount++;
          // Log the message
          await this.db.insert(whatsAppMessages).values({
            recipientNumber: user.whatsAppNumber,
            messageType: 'morning_declaration',
            messageContent: message,
            status: 'sent',
            sentAt: new Date()
          });
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Morning declarations sent to ${sentCount} users`);
    } catch (error) {
      console.error('Error sending morning declarations:', error);
    }
  }

  // Generate morning declaration using DeepSeek AI
  private async generateMorningDeclaration(): Promise<{declaration: string, bibleVerse: string, verseReference: string}> {
    if (!this.deepSeekApiKey) {
      return {
        declaration: "Today I declare that I am blessed, favored, and victorious in Christ Jesus. God goes before me and makes a way where there seems to be no way.",
        bibleVerse: "But thanks be to God! He gives us the victory through our Lord Jesus Christ.",
        verseReference: "1 Corinthians 15:57"
      };
    }

    try {
      const timestamp = Date.now();
      const prompt = `Generate a powerful morning declaration for Christian intercessors (ID: ${timestamp}). Create:
1. A positive, faith-filled declaration statement (2-3 sentences) that intercessors can speak over their day
2. Include themes of victory, blessing, favor, protection, and spiritual authority
3. A relevant Bible verse with reference that supports the declaration
4. Make it unique and powerful for starting the day in faith

Format as plain text without formatting.`;

      const response = await fetch(`https://api.deepseek.com/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a spiritual advisor creating powerful morning declarations for Christian intercessors. Create faith-filled, victorious declarations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        // Parse the AI response
        const lines = aiResponse.split('\n').filter((line: string) => line.trim());
        let declaration = '';
        let bibleVerse = '';
        let verseReference = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes(':') && /\d+:\d+/.test(line)) {
            const parts = line.split(' ');
            verseReference = parts.slice(0, 2).join(' ');
            bibleVerse = parts.slice(2).join(' ');
          } else if (line.length > 20 && !declaration) {
            declaration = line;
          }
        }

        if (!declaration) declaration = lines[0] || "Today I declare that I am blessed, favored, and victorious in Christ Jesus.";
        if (!bibleVerse) bibleVerse = "But thanks be to God! He gives us the victory through our Lord Jesus Christ.";
        if (!verseReference) verseReference = "1 Corinthians 15:57";

        return { declaration, bibleVerse, verseReference };
      }
    } catch (error) {
      console.error('Error generating morning declaration with DeepSeek:', error);
    }

    return {
      declaration: "Today I declare that I am blessed, favored, and victorious in Christ Jesus. God goes before me and makes a way where there seems to be no way.",
      bibleVerse: "But thanks be to God! He gives us the victory through our Lord Jesus Christ.",
      verseReference: "1 Corinthians 15:57"
    };
  }

  // Set daily reminder for user
  private async setDailyReminder(phoneNumber: string, time: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_users')
        .update({
          personal_reminder_time: time
        })
        .eq('whatsapp_number', phoneNumber);

      if (error) {
        console.error('Error setting daily reminder:', error);
        await this.sendMessage(phoneNumber, "Sorry, I couldn't set your reminder right now. Please try again later.");
        return;
      }

      await this.sendMessage(phoneNumber, `✅ Daily reminder set for ${time}!\n\nYou'll receive your devotional and prayer points every day at this time.\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting daily reminder:', error);
      await this.sendMessage(phoneNumber, "Sorry, I couldn't set your reminder right now. Please try again later.");
    }
  }

  // Enable slot reminders
  private async enableSlotReminders(phoneNumber: string): Promise<void> {
    if (!this.db) return;

    try {
      const currentPrefs = await this.db
        .select({ reminderPreferences: whatsAppBotUsers.reminderPreferences })
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      let preferences = { prayerSlotReminders: true };
      if (currentPrefs[0]?.reminderPreferences) {
        try {
          preferences = { ...JSON.parse(currentPrefs[0].reminderPreferences), prayerSlotReminders: true };
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }
      }

      await this.db
        .update(whatsAppBotUsers)
        .set({
          reminderPreferences: JSON.stringify(preferences)
        })
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber));

      await this.sendMessage(phoneNumber, `✅ Prayer slot reminders enabled!\n\nI'll remind you 1 hour and 30 minutes before your assigned prayer sessions.\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error enabling slot reminders:', error);
    }
  }

  // Log user interactions with better error handling
  private async logUserInteraction(phoneNumber: string, content: string, interactionType: string): Promise<void> {
    try {
      // Check if whatsapp_interactions table exists first
      const { error } = await supabase
        .from('whatsapp_interactions')
        .insert({
          phone_number: phoneNumber,
          interaction_type: interactionType,
          content: content,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.warn(`⚠️ Failed to log interaction for ${phoneNumber}:`, error.message || 'Unknown database error');
      } else {
        console.log(`📊 Interaction logged: ${interactionType} from ${phoneNumber}`);
      }
    } catch (error: any) {
      console.warn(`⚠️ Failed to log interaction for ${phoneNumber}:`, error?.message || 'undefined');
      // Don't throw error - logging failure shouldn't stop bot operation
    }
  }

  // Handle unsubscribe
  private async handleUnsubscribe(phoneNumber: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_bot_users')
        .update({ is_active: false })
        .eq('whatsapp_number', phoneNumber);

      if (error) {
        console.error('Error unsubscribing user:', error);
        return;
      }

      await this.sendMessage(phoneNumber, `✅ You've been unsubscribed from all reminders.\n\nWe'll miss you in our prayer community! 🙏\n\nTo reactivate, simply type 'menu' anytime.`);
    } catch (error) {
      console.error('Error unsubscribing user:', error);
    }
  }

  // Placeholder methods for additional features
  private async sendUserPrayerSchedule(phoneNumber: string): Promise<void> {
    // Implementation would fetch user's actual prayer schedule from database
    await this.sendMessage(phoneNumber, "📋 Your Prayer Schedule:\n\nCurrently, you don't have any assigned prayer slots.\n\nWould you like to request a prayer time slot? Reply with 'request slot' to get started!\n\nType 'menu' for more options.");
  }

  private async sendSlotRequestForm(phoneNumber: string): Promise<void> {
    await this.sendMessage(phoneNumber, "🙋 Prayer Slot Request:\n\nTo request a prayer time slot, please visit our dashboard at:\nhttps://b4cc0390-c3bd-450d-aa4c-0c324c9e9fbb-00-1u7acu7fuh03u.spock.replit.dev\n\nOr contact our admin team directly.\n\nType 'menu' for more options.");
  }

  private async sendSkipRequestForm(phoneNumber: string): Promise<void> {
    await this.sendMessage(phoneNumber, "⏭️ Skip Prayer Session:\n\nTo request to skip a prayer session, please use our dashboard or contact the admin team.\n\nWe understand that life happens! 🙏\n\nType 'menu' for more options.");
  }

  private async requestCustomTime(phoneNumber: string): Promise<void> {
    await this.sendMessage(phoneNumber, "⏰ Custom Reminder Time:\n\nPlease reply with your preferred time in 24-hour format (e.g., '14:30' for 2:30 PM).\n\nI'll set up your daily devotional reminder for that time!\n\nType 'menu' to go back.");
  }

  private async sendUserSettings(phoneNumber: string): Promise<void> {
    try {
      const { data: user, error } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (error || !user) {
        await this.sendMessage(phoneNumber, "Settings temporarily unavailable. Please try again later.");
        return;
      }

      let preferences: any = {};
      try {
        preferences = user.reminder_preferences ? JSON.parse(user.reminder_preferences) : {};
      } catch (e) {
        console.error('Error parsing preferences:', e);
      }

      const settingsText = `⚙️ Your Current Settings:

📱 Phone: ${phoneNumber}
✅ Status: ${user.is_active ? 'Active' : 'Inactive'}
📖 Daily Devotionals: ${preferences?.dailyDevotionals ? 'Enabled' : 'Disabled'}
⏰ Prayer Slot Reminders: ${preferences?.prayerSlotReminders ? 'Enabled' : 'Disabled'}
🕐 Custom Reminder: ${user.personal_reminder_time || 'Not set'}
📅 Registered: ${new Date(user.created_at).toLocaleDateString()}

Type 'menu' for more options.`;

      await this.sendMessage(phoneNumber, settingsText);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      await this.sendMessage(phoneNumber, "Sorry, I couldn't fetch your settings right now. Please try again later.");
    }
  }

  private async pauseUserReminders(phoneNumber: string): Promise<void> {
    try {
      const pausedPreferences = JSON.stringify({
        dailyDevotionals: false,
        prayerSlotReminders: false,
        customReminderTime: null,
        timezone: 'UTC'
      });

      const { error } = await supabase
        .from('whatsapp_bot_users')
        .update({
          reminder_preferences: pausedPreferences
        })
        .eq('whatsapp_number', phoneNumber);

      if (error) {
        console.error('Error pausing reminders:', error);
        return;
      }

      await this.sendMessage(phoneNumber, `⏸️ All reminders paused!\n\nYour reminders have been temporarily disabled. You can reactivate them anytime from the menu.\n\nType 'menu' for options.`);
    } catch (error) {
      console.error('Error pausing reminders:', error);
    }
  }

  private async sendUserStatus(phoneNumber: string): Promise<void> {
    await this.sendMessage(phoneNumber, `📊 Your Status:

✅ Connected to Global Intercessors Prayer Bot
🙏 Part of our worldwide prayer community
🌍 Contributing to 24/7 prayer coverage

Type 'menu' to see all available options!`);
  }

  // Check if user is rate limited
  private isRateLimited(phoneNumber: string): boolean {
    const now = Date.now();
    const lastMessage = this.rateLimitMap.get(phoneNumber) || 0;
    const timeDiff = now - lastMessage;

    if (timeDiff < 2000) { // 2 second rate limit
      console.log(`⚠️ Rate limiting ${phoneNumber} - too many messages`);
      return true;
    }

    this.rateLimitMap.set(phoneNumber, now);
    return false;
  }

  // --- Bot Service Methods (Optimized for Speed) ---

  async processMessage(messageData: any) {
    try {
      console.log('Processing WhatsApp message:', JSON.stringify(messageData, null, 2));

      const entry = messageData.entry?.[0];
      if (!entry?.changes?.[0]?.value?.messages) {
        console.log('No messages found in webhook data');
        return;
      }

      const message = entry.changes[0].value.messages[0];
      const from = message.from;
      const messageText = message.text?.body?.toLowerCase() || '';
      const messageId = message.id;

      console.log(`Processing message "${messageText}" from ${from}`);

      // Prevent duplicate processing or handle pending responses
      if (this.responses.has(messageId) || this.pendingResponses.get(from)) {
        console.log('Message already processed or response pending, skipping');
        return;
      }

      // Mark user as having a pending response
      this.pendingResponses.set(from, true);

      // Mark message as processed
      this.responses.set(messageId, {
        messageId,
        from,
        response: 'Processing...',
        timestamp: new Date()
      });

      // Clear any existing timeout for this user
      const existingTimeout = this.messageQueue.get(from);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Process immediately for faster response
      try {
        await this.handleMessage(from, messageText, messageId);
      } catch (error) {
        console.error('Error handling immediate message:', error);
        await this.sendMessage(from, "I'm having trouble processing your message right now. Please try again.");
      } finally {
        this.pendingResponses.delete(from); // Remove pending flag after handling
      }

    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
    }
  }

  private async handleMessage(from: string, messageText: string, messageId: string) {
    try {
      console.log(`Handling WhatsApp command: "${messageText}" from ${from}`);

      // Send immediate typing indicator or acknowledgment for fast feedback
      await this.sendTypingIndicator(from);

      let session = this.userSessions.get(from);
      if (!session) {
        session = {
          userId: from,
          state: 'initial',
          lastActivity: new Date(),
          context: {}
        };
        this.userSessions.set(from, session);
      }

      // Update last activity
      session.lastActivity = new Date();

      // --- Main command handling logic ---
      // This part should be replaced with your actual bot logic
      // For now, a simple echo or a help response is used as a placeholder
      let responseMessage = '';
      switch (messageText.toLowerCase()) {
        case '/start':
          responseMessage = "Welcome! How can I help you today? Type 'menu' for options.";
          break;
        case '/help':
          responseMessage = "Available commands: /start, /help, /status. Type 'menu' for more.";
          break;
        case 'menu':
          responseMessage = "Here are the main options:\n- Daily Devotional\n- Prayer Reminders\n- Settings\n- Menu";
          break;
        default:
          // If it's not a known command, echo it back or provide a default response
          if (messageText) {
            responseMessage = `You said: "${messageText}"`;
          } else {
            responseMessage = "I received your message. How can I assist you?";
          }
          break;
      }
      // --- End of main command handling logic ---

      // Send the response
      if (responseMessage) {
        await this.sendMessage(from, responseMessage);
      }

      // Log the interaction after processing
      await this.logUserInteraction(from, messageText, 'received');

    } catch (error) {
      console.error(`Error in handleMessage for ${from}:`, error);
      // Attempt to inform the user about the error
      try {
        await this.sendMessage(from, "Sorry, I encountered an internal error. Please try again later.");
      } catch (sendError) {
        console.error(`Failed to send error message to ${from}:`, sendError);
      }
    }
  }

  private async sendMessage(to: string, message: string, options: any = {}): Promise<boolean> {
    try {
      console.log(`📤 Sending message to ${to}: ${message.substring(0, 50)}...`);

      if (!this.config.phoneNumberId || !this.config.accessToken) {
        console.log(`❌ WhatsApp credentials missing - SIMULATION MODE`);
        console.log(`🤖 Would send to ${to}: ${message}`);
        return false;
      }

      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: message },
        ...options
      };

      // Use AbortController for timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ WhatsApp API Error (${response.status}):`, error);
        return false;
      }

      const result = await response.json();
      console.log(`✅ Message sent successfully to ${to}`);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ WhatsApp API request timed out');
      } else {
        console.error('❌ Error sending WhatsApp message:', error.message);
      }
      return false;
    }
  }

  private async sendTypingIndicator(to: string): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text', // Sending a 'text' type with an empty body or a placeholder like '...' often triggers the typing indicator
        text: { body: '...' } // Sending a placeholder message to indicate activity
      };

      // Fetch doesn't directly support a "typing indicator" type, so we send a minimal valid message
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      // We don't necessarily need to log success here, as it's a background action.
      // Errors are logged below.
    } catch (error) {
      // Don't throw error for typing indicator failures, as it shouldn't block message processing
      console.log('Could not send typing indicator:', error.message);
    }
  }

  // This is a placeholder method, as the original code had a similar method.
  // You would integrate your actual bot command handling here.
  private async sendPrayerReminder(phoneNumber: string, userName: string, slotTime: string): Promise<void> {
    const message = `🙏 *Prayer Reminder* 🙏\n\nHello ${userName}!\n\nThis is your gentle reminder that your prayer slot (${slotTime}) is coming up in 15 minutes.\n\nMay the Lord bless your time of intercession! 🌟\n\n_"Devote yourselves to prayer, being watchful and thankful." - Colossians 4:2_`;

    try {
      await this.sendMessage(phoneNumber, message);
      console.log(`Prayer reminder sent to ${phoneNumber}`);
    } catch (error) {
      console.error(`Failed to send prayer reminder to ${phoneNumber}:`, error);
    }
  }

  // Send sample prayer reminder with user's actual slot information
  private async sendSamplePrayerReminder(phoneNumber: string): Promise<void> {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    // Sample prayer reminder message with realistic details
    const reminderMessage = `🔔 PRAYER REMINDER - Global Intercessors

⏰ Your Prayer Slot: 03:00–03:30 (CAT)
🌍 Time Until Prayer: 15 minutes
📍 Current Time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}

Dear Faithful Intercessor,

Your assigned prayer time is approaching! You are part of our 24/7 global prayer coverage, standing in the gap for nations and souls worldwide.

📖 Today's Prayer Focus:
• Pray for Global Revival & Awakening
• Intercede for World Leaders & Nations
• Cover Your Local Community in Prayer
• Lift up Persecuted Believers Worldwide
• Pray for Church Unity & Growth

💡 Remember: Join your Zoom prayer session at your designated time for fellowship and unity in intercession.

🔗 Zoom Link: https://zoom.us/j/yourroom
📱 Meeting ID: 123-456-789

God bless your faithful intercession! 🌟

Global Intercessors Team`;

    // Send the reminder with action buttons
    await this.sendInteractiveMessage(phoneNumber, reminderMessage, [
      { id: 'devotional', title: '📖 Get Devotional' },
      { id: 'status', title: '📊 My Status' },
      { id: 'pause', title: '⏸️ Pause Reminders' }
    ]);
  }

  // Bible Quiz Game Implementation with Gemini AI Integration
  private bibleQuizSessions = new Map<string, BibleQuizSession>();

  // Bible Quiz Menu
  private async sendBibleQuizMenu(phoneNumber: string): Promise<void> {
    const userName = await this.getUserName(phoneNumber);
    
    const quizMenuMessage = `🧠 ${userName}, Welcome to Bible Quiz Game!

**Test your biblical knowledge with AI-powered questions!**

🎯 **Quiz Modes Available:**

🌟 **Daily Challenge** - Limited once per day, earn bonus rewards
🧠 **Smart Quiz** - Adaptive difficulty that grows with you  
📖 **Topic Quiz** - Focus on specific biblical themes

🤖 **Powered by Gemini AI** - Dynamic questions with biblical accuracy!

Choose your challenge level and let's begin your spiritual knowledge journey!`;

    await this.sendInteractiveMessage(phoneNumber, quizMenuMessage, [
      { id: 'daily_challenge', title: '🌟 Daily Challenge' },
      { id: 'smart_quiz', title: '🧠 Smart Quiz' },
      { id: 'topic_quiz', title: '📖 Topic Quiz' },
      { id: 'back_menu', title: '🔙 Main Menu' }
    ]);
  }

  // Start Bible Quiz Session
  private async startBibleQuiz(phoneNumber: string, quizType: 'daily_challenge' | 'smart_quiz' | 'topic_quiz'): Promise<void> {
    try {
      console.log(`🎯 Starting Bible Quiz for ${phoneNumber}, type: ${quizType}`);
      
      const userName = await this.getUserName(phoneNumber);
      console.log(`👤 Got user name: ${userName}`);
      
      const userId = await this.getUserId(phoneNumber);
      console.log(`🔑 Got user ID: ${userId}`);
      
      if (!userId) {
        console.log(`❌ No user ID found for ${phoneNumber}`);
        await this.sendMessage(phoneNumber, `Sorry ${userName}, please login first to start the quiz!`);
        return;
      }

      // Check for existing session
      if (this.bibleQuizSessions.has(phoneNumber)) {
        console.log(`🔄 Ending existing quiz session for ${phoneNumber}`);
        await this.endBibleQuiz(phoneNumber);
      }

      // Create new quiz session
      const session: BibleQuizSession = {
        phoneNumber,
        userId,
        userName,
        quizType,
        score: 0,
        correctAnswers: 0,
        questionsAnswered: 0,
        currentStreak: 0,
        startTime: new Date(),
        difficulty: 'easy',
        currentQuestion: null
      };

      console.log(`📝 Created quiz session for ${phoneNumber}`);
      this.bibleQuizSessions.set(phoneNumber, session);

      // Send first question
      console.log(`📖 Sending first question to ${phoneNumber}`);
      
      // Add a small delay to ensure session is properly set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await this.sendNextBibleQuestion(phoneNumber);

    } catch (error) {
      console.error('❌ CRITICAL ERROR starting Bible quiz:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        phoneNumber,
        quizType
      });
      
      try {
        const userName = await this.getUserName(phoneNumber);
        await this.sendMessage(phoneNumber, `Sorry ${userName}, there was an error starting your quiz. Please try again! 🙏`);
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
  }

  // Generate Bible Question with Gemini AI
  private async generateBibleQuestionWithGemini(difficulty: 'easy' | 'medium' | 'hard' = 'easy', topic?: string): Promise<BibleQuestion | null> {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error('Gemini API key not found');
        return this.getFallbackBibleQuestion();
      }

      const topicPrompt = topic ? `focusing on the topic of ${topic}` : 'on any biblical topic';
      const difficultyPrompt = difficulty === 'easy' ? 'for beginners' : difficulty === 'medium' ? 'for intermediate learners' : 'for advanced biblical scholars';

      const prompt = `Generate a Bible quiz question ${topicPrompt} ${difficultyPrompt}. 

REQUIREMENTS:
1. Question must be biblically accurate and directly supported by scripture
2. Provide exactly 4 multiple choice options (A, B, C, D)
3. Include a clear explanation with biblical context
4. Provide the specific Bible verse reference
5. Make the question engaging and educational

FORMAT YOUR RESPONSE AS JSON:
{
  "question": "The actual question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Brief explanation with biblical context",
  "verseReference": "Book Chapter:Verse format",
  "difficulty": "${difficulty}",
  "category": "Biblical category (Old Testament, New Testament, etc.)"
}

Make the question appropriate for Christian intercessors and spiritually enriching.`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        console.error(`Gemini API error: ${response.status} ${response.statusText}`);
        return this.getFallbackBibleQuestion();
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        return this.getFallbackBibleQuestion();
      }

      // Parse JSON response
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const questionData = JSON.parse(cleanResponse);

      return {
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        verseReference: questionData.verseReference,
        difficulty: questionData.difficulty || difficulty,
        category: questionData.category || 'General'
      };

    } catch (error) {
      console.error('Error generating Bible question with Gemini:', error);
      return this.getFallbackBibleQuestion();
    }
  }

  // Fallback Bible Questions
  private getFallbackBibleQuestion(): BibleQuestion {
    const fallbackQuestions: BibleQuestion[] = [
      {
        question: "Who led the Israelites out of Egypt?",
        options: ["Abraham", "Moses", "David", "Noah"],
        correctAnswer: "Moses",
        explanation: "Moses was chosen by God to lead the Israelites out of slavery in Egypt during the Exodus.",
        verseReference: "Exodus 3:10",
        difficulty: "easy",
        category: "Old Testament"
      },
      {
        question: "What did Jesus turn water into at the wedding in Cana?",
        options: ["Wine", "Bread", "Fish", "Oil"],
        correctAnswer: "Wine",
        explanation: "Jesus performed His first miracle by turning water into wine at a wedding in Cana.",
        verseReference: "John 2:9",
        difficulty: "easy",
        category: "New Testament"
      },
      {
        question: "How many disciples did Jesus choose?",
        options: ["10", "12", "7", "15"],
        correctAnswer: "12",
        explanation: "Jesus chose twelve disciples to be His closest followers and apostles.",
        verseReference: "Matthew 10:1-4",
        difficulty: "easy",
        category: "New Testament"
      },
      {
        question: "In which city was Jesus born?",
        options: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"],
        correctAnswer: "Bethlehem",
        explanation: "Jesus was born in Bethlehem, fulfilling the prophecy about the Messiah's birthplace.",
        verseReference: "Luke 2:4-7",
        difficulty: "easy",
        category: "New Testament"
      }
    ];

    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }

  // Send Next Bible Question
  private async sendNextBibleQuestion(phoneNumber: string): Promise<void> {
    try {
      console.log(`📖 Attempting to send Bible question to ${phoneNumber}`);
      
      const session = this.bibleQuizSessions.get(phoneNumber);
      if (!session) {
        console.log(`❌ No quiz session found for ${phoneNumber}`);
        return;
      }

      console.log(`🎲 Generating question with difficulty: ${session.difficulty}`);
      
      // Generate question with Gemini AI
      const question = await this.generateBibleQuestionWithGemini(session.difficulty);
      if (!question) {
        console.log(`❌ Failed to generate question for ${phoneNumber}, using fallback`);
        const fallbackQuestion = this.getFallbackBibleQuestion();
        session.currentQuestion = fallbackQuestion;
        session.questionStartTime = Date.now();

        const questionMessage = `📖 **Question ${session.questionsAnswered + 1}**

${fallbackQuestion.question}

**Choose your answer:**
A) ${fallbackQuestion.options[0]}
B) ${fallbackQuestion.options[1]}
C) ${fallbackQuestion.options[2]}
D) ${fallbackQuestion.options[3]}

⏱️ Take your time to think and choose wisely!`;

        await this.sendInteractiveMessage(phoneNumber, questionMessage, [
          { id: 'quiz_a', title: `A) ${fallbackQuestion.options[0].substring(0, 20)}...` },
          { id: 'quiz_b', title: `B) ${fallbackQuestion.options[1].substring(0, 20)}...` },
          { id: 'quiz_c', title: `C) ${fallbackQuestion.options[2].substring(0, 20)}...` },
          { id: 'quiz_d', title: `D) ${fallbackQuestion.options[3].substring(0, 20)}...` }
        ]);
        return;
      }

      console.log(`✅ Generated question: ${question.question.substring(0, 50)}...`);
      
      session.currentQuestion = question;
      session.questionStartTime = Date.now();

      const questionMessage = `📖 **Question ${session.questionsAnswered + 1}**

${question.question}

**Choose your answer:**
A) ${question.options[0]}
B) ${question.options[1]}
C) ${question.options[2]}
D) ${question.options[3]}

⏱️ Take your time to think and choose wisely!`;

      console.log(`📱 Sending interactive message with question to ${phoneNumber}`);

      await this.sendInteractiveMessage(phoneNumber, questionMessage, [
        { id: 'quiz_a', title: `A) ${question.options[0].substring(0, 20)}...` },
        { id: 'quiz_b', title: `B) ${question.options[1].substring(0, 20)}...` },
        { id: 'quiz_c', title: `C) ${question.options[2].substring(0, 20)}...` },
        { id: 'quiz_d', title: `D) ${question.options[3].substring(0, 20)}...` }
      ]);

      console.log(`✅ Successfully sent Bible question to ${phoneNumber}`);

    } catch (error) {
      console.error('❌ CRITICAL ERROR sending Bible question:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        phoneNumber
      });
      
      try {
        await this.sendMessage(phoneNumber, "Sorry, I had trouble loading your question. Let me try again...");
        await this.endBibleQuiz(phoneNumber);
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }
  }

  // Handle Next Question
  private async handleNextQuestion(phoneNumber: string): Promise<void> {
    const session = this.bibleQuizSessions.get(phoneNumber);
    if (!session) {
      await this.sendMessage(phoneNumber, "No active quiz session found. Please start a new quiz!");
      return;
    }

    if (session.questionsAnswered >= 10) {
      await this.endBibleQuiz(phoneNumber);
      return;
    }

    await this.sendNextBibleQuestion(phoneNumber);
  }

  // Handle Quiz Answer
  private async handleQuizAnswer(phoneNumber: string, answerButton: string): Promise<void> {
    const session = this.bibleQuizSessions.get(phoneNumber);
    if (!session || !session.currentQuestion) return;

    const question = session.currentQuestion;
    const optionIndex = answerButton.replace('quiz_', '').charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
    const selectedAnswer = question.options[optionIndex];

    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === question.correctAnswer;
    const timeTaken = Math.round((Date.now() - session.questionStartTime!) / 1000);

    // Update session
    session.questionsAnswered++;
    if (isCorrect) {
      session.correctAnswers++;
      session.currentStreak++;
      const points = this.calculatePoints(question.difficulty, timeTaken, session.currentStreak);
      session.score += points;
    } else {
      session.currentStreak = 0;
    }

    // Send feedback
    const feedbackMessage = isCorrect 
      ? `✅ **Correct!** Well done ${session.userName}! 

🎯 **Answer:** ${question.correctAnswer}
📖 **Explanation:** ${question.explanation}
📜 **Scripture:** ${question.verseReference}
🔥 **Streak:** ${session.currentStreak}
⭐ **Score:** ${session.score} points

Great biblical knowledge! 🙌`
      : `❌ **Not quite right**, ${session.userName}

✅ **Correct Answer:** ${question.correctAnswer}
📖 **Explanation:** ${question.explanation}
📜 **Scripture:** ${question.verseReference}
💪 **Keep Learning:** Every question makes you wiser!

Don't give up - you're growing in wisdom! 🌱`;

    const buttons = session.questionsAnswered >= 10 
      ? [{ id: 'end_quiz', title: '🏁 View Results' }]
      : [
          { id: 'next_question', title: '▶️ Next Question' },
          { id: 'end_quiz', title: '🏁 End Quiz' }
        ];

    await this.sendInteractiveMessage(phoneNumber, feedbackMessage, buttons);

    if (session.questionsAnswered >= 10) {
      setTimeout(() => this.endBibleQuiz(phoneNumber), 5000);
    }
  }

  // Calculate Points
  private calculatePoints(difficulty: string, timeTaken: number, streak: number): number {
    let basePoints = 10;
    
    if (difficulty === 'medium') basePoints = 15;
    if (difficulty === 'hard') basePoints = 20;

    // Speed bonus (max 5 bonus points)
    const speedBonus = Math.max(0, 5 - Math.floor(timeTaken / 5));
    
    // Streak bonus
    const streakBonus = Math.min(streak * 2, 10);

    return basePoints + speedBonus + streakBonus;
  }

  // End Bible Quiz
  private async endBibleQuiz(phoneNumber: string): Promise<void> {
    const session = this.bibleQuizSessions.get(phoneNumber);
    if (!session) return;

    const accuracy = session.questionsAnswered > 0 
      ? Math.round((session.correctAnswers / session.questionsAnswered) * 100) 
      : 0;

    const duration = Math.round((Date.now() - session.startTime.getTime()) / 1000 / 60);

    const resultsMessage = `🏁 **Quiz Complete!** ${session.userName}

📊 **Your Results:**
✅ Correct: ${session.correctAnswers}/${session.questionsAnswered}
🎯 Accuracy: ${accuracy}%
⭐ Total Score: ${session.score} points
🔥 Best Streak: ${session.currentStreak}
⏱️ Duration: ${duration} minutes

${accuracy >= 80 ? '🌟 Excellent biblical knowledge!' : 
  accuracy >= 60 ? '👍 Good work, keep studying!' : 
  '💪 Keep learning, you\'re growing!'}

*"Study to show yourself approved unto God." - 2 Timothy 2:15*

Ready for another challenge?`;

    await this.sendInteractiveMessage(phoneNumber, resultsMessage, [
      { id: 'bible_quiz', title: '🔄 Play Again' },
      { id: 'devotional', title: '📖 Get Word' },
      { id: 'back_menu', title: '🔙 Main Menu' }
    ]);

    this.bibleQuizSessions.delete(phoneNumber);
  }

  // Get User ID helper method
  private async getUserId(phoneNumber: string): Promise<string | null> {
    try {
      // Try to get from user profiles table directly using phone number
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (!directError && directProfile?.id) {
        return directProfile.id;
      }

      // Fallback: try to get user ID from whatsapp_bot_users
      const { data: botUser, error: botError } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (!botError && botUser?.user_id) {
        return botUser.user_id;
      }

      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }
}

// Bible Quiz Types
interface BibleQuizSession {
  phoneNumber: string;
  userId: string;
  userName: string;
  quizType: 'daily_challenge' | 'smart_quiz' | 'topic_quiz';
  score: number;
  correctAnswers: number;
  questionsAnswered: number;
  currentStreak: number;
  startTime: Date;
  difficulty: 'easy' | 'medium' | 'hard';
  currentQuestion: BibleQuestion | null;
  questionStartTime?: number;
}

interface BibleQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  verseReference: string;
  difficulty: string;
  category: string;
}

// Export a singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();