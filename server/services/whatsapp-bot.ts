import cron from 'node-cron';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, sql } from 'drizzle-orm';
import fetch from 'node-fetch';

import { 
  whatsAppBotUsers, 
  whatsAppMessages, 
  whatsAppInteractions,
  dailyDevotionals,
  prayerSlots,
  userProfiles,
  updates,
  type WhatsAppBotUser,
  type InsertWhatsAppBotUser,
  type InsertWhatsAppMessage,
  type InsertWhatsAppInteraction,
  type InsertDailyDevotional,
  type PrayerSlot,
  type UserProfile
} from '../../shared/schema.js';

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
  private db!: ReturnType<typeof drizzle>;
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

  constructor() {
    console.log('🤖 Initializing WhatsApp Prayer Bot...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL environment variable is not set. WhatsApp bot will run with limited functionality.');
      // Initialize bot service properties even if DB is not available
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
      return;
    }

    try {
      const client = postgres(connectionString, {
        connect_timeout: 30,
        idle_timeout: 60,
        max_lifetime: 60 * 60,
        max: 1, // Use single connection for bot
        transform: postgres.camel,
        onnotice: () => {}, // Ignore notices
        debug: false
      });
      this.db = drizzle(client);
      console.log('✅ Database connection established for WhatsApp bot');

      // Test connection
      setTimeout(async () => {
        try {
          await client`SELECT 1`;
          console.log('✅ WhatsApp bot database connection verified');
        } catch (testError) {
          console.warn('⚠️ WhatsApp bot database connection test failed:', testError.message);
        }
      }, 1000);
    } catch (error) {
      console.warn('❌ Failed to connect to database for WhatsApp bot:', error);
      console.log('WhatsApp bot will run without database functionality');
      // Initialize bot service properties even if DB connection fails
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
      return;
    }

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
    });

    // Prayer slot reminders - check every minute for upcoming slots
    cron.schedule('* * * * *', () => {
      this.checkPrayerSlotReminders();
    });

    // Morning declarations at 6:00 AM daily
    cron.schedule('0 6 * * *', () => {
      this.sendMorningDeclarations();
    });

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

  // AI-powered devotional generation
  private async generateDailyDevotional(): Promise<DevotionalContent> {
    if (!this.deepSeekApiKey) {
      return {
        devotionText: "May God's grace be with you today. Take time to seek Him in prayer and His Word will guide your steps.",
        bibleVerse: "Your word is a lamp for my feet, a light on my path.",
        verseReference: "Psalm 119:105"
      };
    }

    try {
      const prompt = `Generate a brief, inspiring daily devotional for Christian intercessors. Include:
1. A short devotional message (2-3 sentences) about prayer, faith, or spiritual growth
2. A relevant Bible verse with its reference
3. Keep it encouraging and practical for daily spiritual life

Format as plain text without formatting.`;

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
      const existingDevotional = await this.db
        .select()
        .from(dailyDevotionals)
        .where(eq(dailyDevotionals.date, today))
        .limit(1);

      let devotional: DevotionalContent;

      if (existingDevotional.length > 0) {
        devotional = {
          devotionText: existingDevotional[0].devotionText,
          bibleVerse: existingDevotional[0].bibleVerse,
          verseReference: existingDevotional[0].verseReference
        };
      } else {
        // Generate new devotional
        devotional = await this.generateDailyDevotional();

        // Save to database
        await this.db.insert(dailyDevotionals).values({
          date: today,
          devotionText: devotional.devotionText,
          bibleVerse: devotional.bibleVerse,
          verseReference: devotional.verseReference
        });
      }

      // Get all active WhatsApp bot users
      const botUsers = await this.db
        .select({
          whatsAppNumber: whatsAppBotUsers.whatsAppNumber,
          userId: whatsAppBotUsers.userId
        })
        .from(whatsAppBotUsers)
        .leftJoin(userProfiles, eq(whatsAppBotUsers.userId, userProfiles.id))
        .where(eq(whatsAppBotUsers.isActive, true));

      // Send devotional to each user
      for (const user of botUsers) {
        // Get user's name from profile
        const userProfile = await this.db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.id, user.userId))
          .limit(1);

        const userName = userProfile[0]?.fullName?.split(' ')[0] || userProfile[0]?.full_name?.split(' ')[0] || 'Dear Intercessor';

        const message = `Good morning, ${userName}! 🌅

Today's Devotion:
${devotional.devotionText}

Scripture for Today:
"${devotional.bibleVerse}" - ${devotional.verseReference}

May God bless your day and strengthen your prayers! 🙏`;

        const success = await this.sendWhatsAppMessage(user.whatsAppNumber, message);

        // Log the message
        await this.db.insert(whatsAppMessages).values({
          recipientNumber: user.whatsAppNumber,
          messageType: 'devotional',
          messageContent: message,
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : null
        });

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Daily devotionals sent to ${botUsers.length} users`);
    } catch (error) {
      console.error('Error sending daily devotionals:', error);
    }
  }

  // Prayer slot reminder system
  private async checkPrayerSlotReminders() {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const currentHour = parseInt(currentTime.split(':')[0]);
      const currentMinute = parseInt(currentTime.split(':')[1]);

      // Get active prayer slots
      const activeSlots = await this.db
        .select({
          slotTime: prayerSlots.slotTime,
          userId: prayerSlots.userId,
          reminderPreferences: whatsAppBotUsers.reminderPreferences,
          whatsAppNumber: whatsAppBotUsers.whatsAppNumber,
          fullName: userProfiles.fullName
        })
        .from(prayerSlots)
        .leftJoin(whatsAppBotUsers, eq(prayerSlots.userId, whatsAppBotUsers.userId))
        .leftJoin(userProfiles, eq(prayerSlots.userId, userProfiles.id))
        .where(eq(prayerSlots.status, 'active'));

      for (const slot of activeSlots) {
        if (!slot.whatsAppNumber) continue;

        const slotParts = slot.slotTime.split('–'); // Expecting "HH:MM–HH:MM"
        if (slotParts.length !== 2) continue;

        const slotStartTimeStr = slotParts[0];
        const slotStartHour = parseInt(slotStartTimeStr.split(':')[0]);
        const slotStartMinute = parseInt(slotStartTimeStr.split(':')[1]);

        // Calculate time difference in minutes
        const slotTotalMinutes = slotStartHour * 60 + slotStartMinute;
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const timeDifferenceMinutes = slotTotalMinutes - currentTotalMinutes;

        let preferences: any = {};
        if (slot.reminderPreferences) {
          try {
            preferences = JSON.parse(slot.reminderPreferences);
          } catch (e) {
            console.error('Error parsing reminder preferences:', e);
          }
        }

        const reminderTiming = preferences.reminderTiming || '30min'; // Default to 30min if not set

        // Check for 1-hour reminder
        if (reminderTiming === '1hour' && timeDifferenceMinutes === 60) {
          await this.sendPrayerSlotReminder(slot.whatsAppNumber, slot.fullName, slot.slotTime, '1 hour');
        }

        // Check for 30-minute reminder
        if (reminderTiming === '30min' && timeDifferenceMinutes === 30) {
          await this.sendPrayerSlotReminder(slot.whatsAppNumber, slot.fullName, slot.slotTime, '30 minutes');
        }

        // Check for 15-minute reminder
        if (reminderTiming === '15min' && timeDifferenceMinutes === 15) {
          await this.sendPrayerSlotReminder(slot.whatsAppNumber, slot.fullName, slot.slotTime, '15 minutes');
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
      await this.db.insert(whatsAppMessages).values({
        recipientNumber: whatsAppNumber,
        messageType: 'reminder',
        messageContent: message,
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : null
      });

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

    // Check for duplicate messages
    if (messageId && this.responses.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId} - SKIPPING`);
      return;
    }

    // Add to processed messages
    if (messageId) {
      this.responses.set(messageId, {
        messageId,
        from: phoneNumber,
        response: 'Processing...',
        timestamp: new Date()
      });
      // Clean up old messages (keep last 100)
      if (this.responses.size > 100) {
        const first = this.responses.values().next().value;
        this.responses.delete(first.messageId);
      }
    }

    // Check rate limiting
    if (this.isRateLimited(phoneNumber)) {
      return;
    }

    const command = messageText.toLowerCase().trim();
    console.log(`🎯 Processing command: "${command}"`);

    try {
      // Log user interaction (with error handling)
      try {
        await this.logUserInteraction(phoneNumber, messageText, 'command'); // Log original message text
        console.log(`✅ Interaction logged for ${phoneNumber}`);
      } catch (dbError) {
        console.warn(`⚠️ Failed to log interaction - continuing without logging:`, dbError.message);
      }

      switch (command) {
        case '/start':
        case 'start':
        case 'hi':
        case 'hello':
          console.log(`🚀 Executing START command for ${phoneNumber}`);
          await this.handleStartCommand(phoneNumber);
          console.log(`✅ START command completed for ${phoneNumber}`);
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
          await this.sendTodaysDevotional(phoneNumber);
          break;

        case 'fresh_devotional':
          console.log(`✨ Generating fresh devotional for ${phoneNumber}`);
          await this.sendFreshDevotional(phoneNumber);
          break;

        case 'back_menu':
          console.log(`🔙 Back to main menu for ${phoneNumber}`);
          await this.sendHelpMenu(phoneNumber);
          break;

        case '/remind':
        case 'remind':
        case 'reminders':
          console.log(`⏰ Executing REMIND command for ${phoneNumber}`);
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

  // Handle start command with registration
  private async handleStartCommand(phoneNumber: string): Promise<void> {
    console.log(`🚀 Processing start command for ${phoneNumber}`);

    // Register user
    await this.registerUser(phoneNumber);

    const welcomeMessage = `🙏 Welcome to Global Intercessors Prayer Bot!

I'm here to support your spiritual journey with:

📖 Daily devotionals and scripture
⏰ Prayer slot reminders
🌍 Global prayer updates
⚙️ Personalized settings

God bless your intercession! 🌟`;

    // Send welcome message with interactive buttons
    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, [
      { id: 'devotional', title: '📖 Today\'s Devotional' },
      { id: 'remind', title: '⏰ Enable Reminders' },
      { id: 'help', title: '📋 Show Menu' }
    ]);
  }

  // Send help menu with available commands
  private async sendHelpMenu(phoneNumber: string): Promise<void> {
    const helpMessage = `📋 Global Intercessors Prayer Bot Menu

Choose an option below or type any command:`;

    // Send interactive menu with essential buttons
    await this.sendInteractiveMessage(phoneNumber, helpMessage, [
      { id: 'devotional', title: '📖 Daily Devotional' },
      { id: 'remind', title: '⏰ Prayer Reminders' },
      { id: 'status', title: '📊 My Status' },
      { id: 'settings', title: '⚙️ Settings' },
      { id: 'pause', title: '⏸️ Pause Notifications' },
      { id: 'stop', title: '🛑 Unsubscribe' }
    ]);
  }

  // Send devotional menu with options
  private async sendDevotionalMenu(phoneNumber: string): Promise<void> {
    const menuMessage = `📖 Devotional Menu

Select your preferred option:`;

    await this.sendInteractiveMessage(phoneNumber, menuMessage, [
      { id: 'today_devotional', title: '📅 Today\'s Devotional' },
      { id: 'fresh_devotional', title: '✨ Generate Fresh Message' },
      { id: 'back_menu', title: '🔙 Back to Main Menu' }
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
    if (!this.db) return;

    try {
      // Check if user exists
      const existingUser = await this.db
        .select()
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      if (existingUser.length === 0) {
        // Register new user
        await this.db.insert(whatsAppBotUsers).values({
          userId: `whatsapp_user_${phoneNumber.replace('+', '')}`,
          whatsAppNumber: phoneNumber,
          isActive: true,
          reminderPreferences: JSON.stringify({
            dailyDevotionals: true,
            prayerSlotReminders: true,
            customReminderTime: null,
            timezone: 'UTC'
          }),
          personalReminderTime: null,
          timezone: 'UTC',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ New user registered: ${phoneNumber}`);

        // Send welcome message
        await this.sendWelcomeMessage(phoneNumber);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    }
  }

  // Send welcome message to new users
  private async sendWelcomeMessage(phoneNumber: string): Promise<void> {
    const welcomeText = `🙏 Welcome to Global Intercessors Prayer Bot!

I'm here to help you stay connected with our global prayer community.

🌟 What I can do for you:
• Send daily devotionals and prayer points
• Remind you of your prayer time slots
• Help you manage your prayer schedule
• Connect you with our 24/7 prayer coverage

Type 'menu' anytime to see all available options.

May God bless your prayer journey! 🙌`;

    await this.sendMessage(phoneNumber, welcomeText);
  }

  // Send today's devotional
  private async sendTodaysDevotional(phoneNumber: string): Promise<void> {
    try {
      const devotional = await this.getTodaysDevotional();

      const devotionalText = `📖 Today's Devotional

${devotional.devotionText}

📜 Scripture: "${devotional.bibleVerse}"
- ${devotional.verseReference}

🙏 Prayer Point: Take a moment to meditate on this verse and let it guide your prayers today.

Type 'menu' for more options.`;

      await this.sendMessage(phoneNumber, devotionalText);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'devotional_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending devotional:', error);
      await this.sendMessage(phoneNumber, "Sorry, I couldn't fetch today's devotional right now. Please try again later. 🙏");
    }
  }

  // Get today's devotional content
  private async getTodaysDevotional(): Promise<DevotionalContent> {
    if (!this.db) {
      return this.getFallbackDevotional();
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if we have today's devotional in database
      const existingDevotional = await this.db
        .select()
        .from(dailyDevotionals)
        .where(eq(dailyDevotionals.date, today))
        .limit(1);

      if (existingDevotional.length > 0) {
        return {
          devotionText: existingDevotional[0].devotionText,
          bibleVerse: existingDevotional[0].bibleVerse,
          verseReference: existingDevotional[0].verseReference
        };
      }

      // Generate new devotional using AI
      const newDevotional = await this.generateDevotionalWithAI();

      // Save to database
      await this.db.insert(dailyDevotionals).values({
        date: today,
        devotionText: newDevotional.devotionText,
        bibleVerse: newDevotional.bibleVerse,
        verseReference: newDevotional.verseReference
      });

      return newDevotional;
    } catch (error) {
      console.error('Error getting today\'s devotional:', error);
      return this.getFallbackDevotional();
    }
  }

  // Generate devotional using AI
  private async generateDevotionalWithAI(): Promise<DevotionalContent> {
    if (!this.deepSeekApiKey) {
      return this.getFallbackDevotional();
    }

    try {
      const prompt = `Generate a daily devotional for Christian intercessors with:
1. A short devotional message (2-3 sentences) about prayer, faith, or spiritual growth
2. A relevant Bible verse with its reference
3. Keep it encouraging and practical for daily spiritual life

Format as plain text without formatting.`;

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

      const data = await response.json() as any;
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
      console.error('Error generating devotional with AI:', error);
    }

    return this.getFallbackDevotional();
  }

  // Fallback devotional content
  private getFallbackDevotional(): DevotionalContent {
    return {
      devotionText: "Begin each day with prayer and end it with gratitude. God's mercies are new every morning.",
      bibleVerse: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
      verseReference: "Lamentations 3:22-23"
    };
  }

  // Send fresh devotional generated by AI
  private async sendFreshDevotional(phoneNumber: string): Promise<void> {
    try {
      const freshDevotional = await this.generateFreshDevotionalWithAI();

      // Get user's name for personalization
      const userName = await this.getUserName(phoneNumber);

      const devotionalText = `✨ Fresh Devotional for ${userName}

${freshDevotional.devotionText}

📜 Scripture: "${freshDevotional.bibleVerse}"
- ${freshDevotional.verseReference}

🙏 Prayer Point: Let this fresh word of God guide your prayers today.

Type 'menu' for more options.`;

      await this.sendMessage(phoneNumber, devotionalText);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'fresh_devotional_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending fresh devotional:', error);
      await this.sendMessage(phoneNumber, "Sorry, I couldn't generate a fresh devotional right now. Please try again later. 🙏");
    }
  }

  // Generate fresh devotional using DeepSeek AI
  private async generateFreshDevotionalWithAI(): Promise<DevotionalContent> {
    if (!this.deepSeekApiKey) {
      return this.getFallbackDevotional();
    }

    try {
      const timestamp = Date.now();
      const prompt = `Generate a completely unique daily devotional for Christian intercessors (ID: ${timestamp}). This must be fresh and different from any previous devotional with:
1. An inspiring devotional message (2-3 sentences) about prayer, faith, or spiritual growth
2. A relevant Bible verse with its reference
3. Keep it encouraging and practical for daily spiritual life
4. Make it unique and meaningful for today's spiritual needs

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
              content: 'You are a spiritual advisor providing fresh, unique devotional content for Christian intercessors. Always create new, meaningful content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.9 // Higher temperature for more creative/unique content
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

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
      console.error('Error generating fresh devotional with DeepSeek:', error);
    }

    return this.getFallbackDevotional();
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
    if (!this.db) return;

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

      const currentPrefs = await this.db
        .select({ reminderPreferences: whatsAppBotUsers.reminderPreferences })
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      let preferences = { 
        prayerSlotReminders: true,
        reminderTiming: reminderTime
      };

      if (currentPrefs[0]?.reminderPreferences) {
        try {
          preferences = { 
            ...JSON.parse(currentPrefs[0].reminderPreferences), 
            prayerSlotReminders: true,
            reminderTiming: reminderTime
          };
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

      const userSlot = await this.getUserPrayerSlot(phoneNumber);
      const slotInfo = userSlot ? `\n\n🎯 Your Prayer Slot: ${userSlot}\nYou will be reminded ${displayTime} before your slot begins.` : '';

      await this.sendMessage(phoneNumber, `✅ Perfect, ${userName}! Reminder preference set to ${displayTime} before your prayer slot.${slotInfo}\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting reminder preference:', error);
    }
  }

  // Get user's name from profile
  private async getUserName(phoneNumber: string): Promise<string> {
    if (!this.db) return 'Dear Intercessor';

    try {
      const user = await this.db
        .select({
          userId: whatsAppBotUsers.userId,
          userName: userProfiles.fullName
        })
        .from(whatsAppBotUsers)
        .leftJoin(userProfiles, eq(whatsAppBotUsers.userId, userProfiles.id))
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      if (user[0]?.userName) {
        return user[0].userName.split(' ')[0]; // First name
      }

      // Fallback: try to get from user profiles table directly using phone number
      try {
        const directProfile = await this.db
          .select({ fullName: userProfiles.fullName })
          .from(userProfiles)
          .where(eq(userProfiles.phoneNumber, phoneNumber))
          .limit(1);

        if (directProfile[0]?.fullName) {
          return directProfile[0].fullName.split(' ')[0];
        }
      } catch (fallbackError) {
        console.error('Fallback profile lookup failed:', fallbackError);
      }

      return 'Dear Intercessor';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'Dear Intercessor';
    }
  }

  // Get user's prayer slot
  private async getUserPrayerSlot(phoneNumber: string): Promise<string | null> {
    if (!this.db) return null;

    try {
      const user = await this.db
        .select({ userId: whatsAppBotUsers.userId })
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      if (!user[0]?.userId) return null;

      const slot = await this.db
        .select({ slotTime: prayerSlots.slotTime })
        .from(prayerSlots)
        .where(and(
          eq(prayerSlots.userId, user[0].userId),
          eq(prayerSlots.status, 'active')
        ))
        .limit(1);

      return slot[0]?.slotTime || null;
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
    if (!this.db) return;

    try {
      await this.db
        .update(whatsAppBotUsers)
        .set({
          personalReminderTime: time
        })
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber));

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
    if (!this.db) {
      console.log(`📝 No database connection - skipping interaction log for ${phoneNumber}`);
      return;
    }

    try {
      await this.db.insert(whatsAppInteractions).values({
        phoneNumber,
        interactionType,
        content,
        createdAt: new Date()
      });
      console.log(`📊 Interaction logged: ${interactionType} from ${phoneNumber}`);
    } catch (error) {
      console.warn(`⚠️ Failed to log interaction for ${phoneNumber}:`, error.message);
      // Don't throw error - logging failure shouldn't stop bot operation
    }
  }

  // Handle unsubscribe
  private async handleUnsubscribe(phoneNumber: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db
        .update(whatsAppBotUsers)
        .set({ isActive: false })
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber));

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
    if (!this.db) {
      await this.sendMessage(phoneNumber, "Settings temporarily unavailable. Please try again later.");
      return;
    }

    try {
      const user = await this.db
        .select()
        .from(whatsAppBotUsers)
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber))
        .limit(1);

      if (user.length > 0) {
        let preferences: any = {};
        try {
          preferences = user[0].reminderPreferences ? JSON.parse(user[0].reminderPreferences) : {};
        } catch (e) {
          console.error('Error parsing preferences:', e);
        }

        const settingsText = `⚙️ Your Current Settings:

📱 Phone: ${phoneNumber}
✅ Status: ${user[0].isActive ? 'Active' : 'Inactive'}
📖 Daily Devotionals: ${preferences?.dailyDevotionals ? 'Enabled' : 'Disabled'}
⏰ Prayer Slot Reminders: ${preferences?.prayerSlotReminders ? 'Enabled' : 'Disabled'}
🕐 Custom Reminder: ${user[0].personalReminderTime || 'Not set'}
📅 Registered: ${new Date(user[0].createdAt).toLocaleDateString()}

Type 'menu' for more options.`;

        await this.sendMessage(phoneNumber, settingsText);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      await this.sendMessage(phoneNumber, "Sorry, I couldn't fetch your settings right now. Please try again later.");
    }
  }

  private async pauseUserReminders(phoneNumber: string): Promise<void> {
    if (!this.db) return;

    try {
      const pausedPreferences = JSON.stringify({
        dailyDevotionals: false,
        prayerSlotReminders: false,
        customReminderTime: null,
        timezone: 'UTC'
      });

      await this.db
        .update(whatsAppBotUsers)
        .set({
          reminderPreferences: pausedPreferences
        })
        .where(eq(whatsAppBotUsers.whatsAppNumber, phoneNumber));

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

  private async sendMessage(to: string, message: string, options: any = {}): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: message },
        ...options
      };

      // Use AbortController for timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
        console.error('WhatsApp API Error:', error);
        throw new Error(`WhatsApp API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      console.log(`Message sent successfully to ${to}:`, result);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('WhatsApp API request timed out');
      } else {
        console.error('Error sending WhatsApp message:', error);
      }
      throw error;
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
}

// Export a singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();