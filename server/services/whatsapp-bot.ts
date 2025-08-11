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

export class WhatsAppPrayerBot {
  private db!: ReturnType<typeof drizzle>;
  private config!: WhatsAppAPIConfig;
  private deepSeekApiKey!: string;
  private processedMessages: Set<string> = new Set(); // Prevent duplicate message processing
  private rateLimitMap: Map<string, number> = new Map(); // Rate limiting per user

  constructor() {
    console.log('🤖 Initializing WhatsApp Prayer Bot...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL environment variable is not set. WhatsApp bot will run with limited functionality.');
      return;
    }

    try {
      const client = postgres(connectionString, {
        connect_timeout: 10,
        idle_timeout: 20,
        max_lifetime: 60 * 30
      });
      this.db = drizzle(client);
      console.log('✅ Database connection established for WhatsApp bot');
    } catch (error) {
      console.warn('❌ Failed to connect to database for WhatsApp bot:', error);
      console.log('WhatsApp bot will run without database functionality');
      return;
    }

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
    // Daily devotionals at 6:00 AM
    cron.schedule('0 6 * * *', () => {
      this.sendDailyDevotionals();
    });

    // Prayer slot reminders - check every minute for upcoming slots
    cron.schedule('* * * * *', () => {
      this.checkPrayerSlotReminders();
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

        const userName = userProfile[0]?.fullName?.split(' ')[0] || 'Dear Intercessor';

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

      // Calculate 1-hour and 30-minute before times
      const oneHourBefore = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
      const thirtyMinBefore = new Date(now.getTime() + 30 * 60 * 1000).toTimeString().slice(0, 5);

      // Get active prayer slots that need reminders
      const slotsForReminders = await this.db
        .select({
          slotTime: prayerSlots.slotTime,
          userId: prayerSlots.userId,
          userEmail: prayerSlots.userEmail
        })
        .from(prayerSlots)
        .where(eq(prayerSlots.status, 'active'));

      for (const slot of slotsForReminders) {
        const slotStartTime = slot.slotTime.split('–')[0]; // Extract start time from "HH:MM–HH:MM"

        // Check if we need to send 1-hour reminder
        if (slotStartTime === oneHourBefore) {
          await this.sendPrayerSlotReminder(slot.userId, slot.slotTime, '1 hour');
        }

        // Check if we need to send 30-minute reminder
        if (slotStartTime === thirtyMinBefore) {
          await this.sendPrayerSlotReminder(slot.userId, slot.slotTime, '30 minutes');
        }
      }
    } catch (error) {
      console.error('Error checking prayer slot reminders:', error);
    }
  }

  private async sendPrayerSlotReminder(userId: string, slotTime: string, timeRemaining: string) {
    try {
      // Get user's WhatsApp number and name
      const userData = await this.db
        .select({
          whatsAppNumber: whatsAppBotUsers.whatsAppNumber,
          fullName: userProfiles.fullName
        })
        .from(whatsAppBotUsers)
        .leftJoin(userProfiles, eq(whatsAppBotUsers.userId, userProfiles.id))
        .where(and(
          eq(whatsAppBotUsers.userId, userId),
          eq(whatsAppBotUsers.isActive, true)
        ))
        .limit(1);

      if (userData.length === 0) return;

      const { whatsAppNumber, fullName } = userData[0];
      const userName = fullName?.split(' ')[0] || 'Dear Intercessor';
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
    if (messageId && this.processedMessages.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId} - SKIPPING`);
      return;
    }

    // Add to processed messages
    if (messageId) {
      this.processedMessages.add(messageId);
      // Clean up old messages (keep last 100)
      if (this.processedMessages.size > 100) {
        const first = this.processedMessages.values().next().value;
        this.processedMessages.delete(first);
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
        await this.logUserInteraction(phoneNumber, messageText, 'command');
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
          await this.sendTodaysDevotional(phoneNumber);
          console.log(`✅ DEVOTIONAL command completed for ${phoneNumber}`);
          break;

        case '/remind':
        case 'remind':
        case 'reminders':
          console.log(`⏰ Executing REMIND command for ${phoneNumber}`);
          await this.enableSlotReminders(phoneNumber);
          await this.sendInteractiveMessage(phoneNumber, "✅ Prayer slot reminders enabled! You'll receive notifications before your prayer sessions.", [
            { id: 'devotional', title: '📖 Get Devotional' },
            { id: 'status', title: '📊 Check Status' },
            { id: 'help', title: '📋 Main Menu' }
          ]);
          console.log(`✅ REMIND command completed for ${phoneNumber}`);
          break;

        case '/stop':
        case 'stop':
        case 'unsubscribe':
          await this.handleUnsubscribe(phoneNumber);
          await this.sendWhatsAppMessage(phoneNumber, "😢 You've been unsubscribed from all notifications. Type '/start' anytime to rejoin our prayer community!");
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
            await this.sendWhatsAppMessage(phoneNumber, `⏰ Personal reminder set for ${command}! You'll receive daily devotionals at this time.`);
          } else {
            // Unknown command - show help
            await this.sendWhatsAppMessage(phoneNumber, `I didn't understand "${messageText}". Type 'menu' to see available commands!`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling WhatsApp command "${command}" for ${phoneNumber}:`, error);

      // Try to send error message, but don't fail if this also errors
      try {
        await this.sendWhatsAppMessage(phoneNumber, "Sorry, I encountered an error. Please try again later or type 'help' for assistance.");
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

    const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp Interactive API error:', errorData);

        // Fallback to regular message if interactive fails
        await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
        return false;
      }

      const result = await response.json();
      console.log('✅ Interactive message sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending interactive message:', error);

      // Fallback to regular message
      await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
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

    await this.sendWhatsAppMessage(phoneNumber, welcomeText);
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

      await this.sendWhatsAppMessage(phoneNumber, devotionalText);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'devotional_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending devotional:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch today's devotional right now. Please try again later. 🙏");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Daily reminder set for ${time}!\n\nYou'll receive your devotional and prayer points every day at this time.\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting daily reminder:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't set your reminder right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Prayer slot reminders enabled!\n\nI'll remind you 1 hour and 30 minutes before your assigned prayer sessions.\n\nType 'menu' for more options.`);
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ You've been unsubscribed from all reminders.\n\nWe'll miss you in our prayer community! 🙏\n\nTo reactivate, simply type 'menu' anytime.`);
    } catch (error) {
      console.error('Error unsubscribing user:', error);
    }
  }

  // Placeholder methods for additional features
  private async sendUserPrayerSchedule(phoneNumber: string): Promise<void> {
    // Implementation would fetch user's actual prayer schedule from database
    await this.sendWhatsAppMessage(phoneNumber, "📋 Your Prayer Schedule:\n\nCurrently, you don't have any assigned prayer slots.\n\nWould you like to request a prayer time slot? Reply with 'request slot' to get started!\n\nType 'menu' for more options.");
  }

  private async sendSlotRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "🙋 Prayer Slot Request:\n\nTo request a prayer time slot, please visit our dashboard at:\nhttps://b4cc0390-c3bd-450d-aa4c-0c324c9e9fbb-00-1u7acu7fuh03u.spock.replit.dev\n\nOr contact our admin team directly.\n\nType 'menu' for more options.");
  }

  private async sendSkipRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏭️ Skip Prayer Session:\n\nTo request to skip a prayer session, please use our dashboard or contact the admin team.\n\nWe understand that life happens! 🙏\n\nType 'menu' for more options.");
  }

  private async requestCustomTime(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏰ Custom Reminder Time:\n\nPlease reply with your preferred time in 24-hour format (e.g., '14:30' for 2:30 PM).\n\nI'll set up your daily devotional reminder for that time!\n\nType 'menu' to go back.");
  }

  private async sendUserSettings(phoneNumber: string): Promise<void> {
    if (!this.db) {
      await this.sendWhatsAppMessage(phoneNumber, "Settings temporarily unavailable. Please try again later.");
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

        await this.sendWhatsAppMessage(phoneNumber, settingsText);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch your settings right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `⏸️ All reminders paused!\n\nYour reminders have been temporarily disabled. You can reactivate them anytime from the menu.\n\nType 'menu' for options.`);
    } catch (error) {
      console.error('Error pausing reminders:', error);
    }
  }

  private async sendUserStatus(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, `📊 Your Status:

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

  // Handle incoming WhatsApp messages with deduplication
  async handleIncomingMessage(phoneNumber: string, messageText: string, messageId?: string): Promise<void> {
    console.log(`\n📨 INCOMING MESSAGE:`);
    console.log(`📱 From: ${phoneNumber}`);
    console.log(`💬 Text: "${messageText}"`);
    console.log(`🆔 Message ID: ${messageId || 'N/A'}`);

    // Check for duplicate messages
    if (messageId && this.processedMessages.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId} - SKIPPING`);
      return;
    }

    // Add to processed messages
    if (messageId) {
      this.processedMessages.add(messageId);
      // Clean up old messages (keep last 100)
      if (this.processedMessages.size > 100) {
        const first = this.processedMessages.values().next().value;
        this.processedMessages.delete(first);
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
        await this.logUserInteraction(phoneNumber, messageText, 'command');
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
          await this.sendTodaysDevotional(phoneNumber);
          console.log(`✅ DEVOTIONAL command completed for ${phoneNumber}`);
          break;

        case '/remind':
        case 'remind':
        case 'reminders':
          console.log(`⏰ Executing REMIND command for ${phoneNumber}`);
          await this.enableSlotReminders(phoneNumber);
          await this.sendInteractiveMessage(phoneNumber, "✅ Prayer slot reminders enabled! You'll receive notifications before your prayer sessions.", [
            { id: 'devotional', title: '📖 Get Devotional' },
            { id: 'status', title: '📊 Check Status' },
            { id: 'help', title: '📋 Main Menu' }
          ]);
          console.log(`✅ REMIND command completed for ${phoneNumber}`);
          break;

        case '/stop':
        case 'stop':
        case 'unsubscribe':
          await this.handleUnsubscribe(phoneNumber);
          await this.sendWhatsAppMessage(phoneNumber, "😢 You've been unsubscribed from all notifications. Type '/start' anytime to rejoin our prayer community!");
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
            await this.sendWhatsAppMessage(phoneNumber, `⏰ Personal reminder set for ${command}! You'll receive daily devotionals at this time.`);
          } else {
            // Unknown command - show help
            await this.sendWhatsAppMessage(phoneNumber, `I didn't understand "${messageText}". Type 'menu' to see available commands!`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling WhatsApp command "${command}" for ${phoneNumber}:`, error);

      // Try to send error message, but don't fail if this also errors
      try {
        await this.sendWhatsAppMessage(phoneNumber, "Sorry, I encountered an error. Please try again later or type 'help' for assistance.");
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

    const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp Interactive API error:', errorData);

        // Fallback to regular message if interactive fails
        await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
        return false;
      }

      const result = await response.json();
      console.log('✅ Interactive message sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending interactive message:', error);

      // Fallback to regular message
      await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
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

    await this.sendWhatsAppMessage(phoneNumber, welcomeText);
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

      await this.sendWhatsAppMessage(phoneNumber, devotionalText);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'devotional_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending devotional:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch today's devotional right now. Please try again later. 🙏");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Daily reminder set for ${time}!\n\nYou'll receive your devotional and prayer points every day at this time.\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting daily reminder:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't set your reminder right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Prayer slot reminders enabled!\n\nI'll remind you 1 hour and 30 minutes before your assigned prayer sessions.\n\nType 'menu' for more options.`);
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ You've been unsubscribed from all reminders.\n\nWe'll miss you in our prayer community! 🙏\n\nTo reactivate, simply type 'menu' anytime.`);
    } catch (error) {
      console.error('Error unsubscribing user:', error);
    }
  }

  // Placeholder methods for additional features
  private async sendUserPrayerSchedule(phoneNumber: string): Promise<void> {
    // Implementation would fetch user's actual prayer schedule from database
    await this.sendWhatsAppMessage(phoneNumber, "📋 Your Prayer Schedule:\n\nCurrently, you don't have any assigned prayer slots.\n\nWould you like to request a prayer time slot? Reply with 'request slot' to get started!\n\nType 'menu' for more options.");
  }

  private async sendSlotRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "🙋 Prayer Slot Request:\n\nTo request a prayer time slot, please visit our dashboard at:\nhttps://b4cc0390-c3bd-450d-aa4c-0c324c9e9fbb-00-1u7acu7fuh03u.spock.replit.dev\n\nOr contact our admin team directly.\n\nType 'menu' for more options.");
  }

  private async sendSkipRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏭️ Skip Prayer Session:\n\nTo request to skip a prayer session, please use our dashboard or contact the admin team.\n\nWe understand that life happens! 🙏\n\nType 'menu' for more options.");
  }

  private async requestCustomTime(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏰ Custom Reminder Time:\n\nPlease reply with your preferred time in 24-hour format (e.g., '14:30' for 2:30 PM).\n\nI'll set up your daily devotional reminder for that time!\n\nType 'menu' to go back.");
  }

  private async sendUserSettings(phoneNumber: string): Promise<void> {
    if (!this.db) {
      await this.sendWhatsAppMessage(phoneNumber, "Settings temporarily unavailable. Please try again later.");
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

        await this.sendWhatsAppMessage(phoneNumber, settingsText);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch your settings right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `⏸️ All reminders paused!\n\nYour reminders have been temporarily disabled. You can reactivate them anytime from the menu.\n\nType 'menu' for options.`);
    } catch (error) {
      console.error('Error pausing reminders:', error);
    }
  }

  private async sendUserStatus(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, `📊 Your Status:

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

  // Handle incoming WhatsApp messages with deduplication
  // This method is called from the webhook handler
  async handleIncomingMessage(phoneNumber: string, messageText: string, messageId?: string): Promise<void> {
    console.log(`\n📨 INCOMING MESSAGE:`);
    console.log(`📱 From: ${phoneNumber}`);
    console.log(`💬 Text: "${messageText}"`);
    console.log(`🆔 Message ID: ${messageId || 'N/A'}`);

    // Check for duplicate messages
    if (messageId && this.processedMessages.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId} - SKIPPING`);
      return;
    }

    // Add to processed messages
    if (messageId) {
      this.processedMessages.add(messageId);
      // Clean up old messages (keep last 100)
      if (this.processedMessages.size > 100) {
        const first = this.processedMessages.values().next().value;
        this.processedMessages.delete(first);
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
        await this.logUserInteraction(phoneNumber, messageText, 'command');
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
          await this.sendTodaysDevotional(phoneNumber);
          console.log(`✅ DEVOTIONAL command completed for ${phoneNumber}`);
          break;

        case '/remind':
        case 'remind':
        case 'reminders':
          console.log(`⏰ Executing REMIND command for ${phoneNumber}`);
          await this.enableSlotReminders(phoneNumber);
          await this.sendInteractiveMessage(phoneNumber, "✅ Prayer slot reminders enabled! You'll receive notifications before your prayer sessions.", [
            { id: 'devotional', title: '📖 Get Devotional' },
            { id: 'status', title: '📊 Check Status' },
            { id: 'help', title: '📋 Main Menu' }
          ]);
          console.log(`✅ REMIND command completed for ${phoneNumber}`);
          break;

        case '/stop':
        case 'stop':
        case 'unsubscribe':
          await this.handleUnsubscribe(phoneNumber);
          await this.sendWhatsAppMessage(phoneNumber, "😢 You've been unsubscribed from all notifications. Type '/start' anytime to rejoin our prayer community!");
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
            await this.sendWhatsAppMessage(phoneNumber, `⏰ Personal reminder set for ${command}! You'll receive daily devotionals at this time.`);
          } else {
            // Unknown command - show help
            await this.sendWhatsAppMessage(phoneNumber, `I didn't understand "${messageText}". Type 'menu' to see available commands!`);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling WhatsApp command "${command}" for ${phoneNumber}:`, error);

      // Try to send error message, but don't fail if this also errors
      try {
        await this.sendWhatsAppMessage(phoneNumber, "Sorry, I encountered an error. Please try again later or type 'help' for assistance.");
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

    const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;

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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp Interactive API error:', errorData);

        // Fallback to regular message if interactive fails
        await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
        return false;
      }

      const result = await response.json();
      console.log('✅ Interactive message sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending interactive message:', error);

      // Fallback to regular message
      await this.sendWhatsAppMessage(phoneNumber, `${message}\n\n${buttons.map(b => `• ${b.title}`).join('\n')}`);
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

    await this.sendWhatsAppMessage(phoneNumber, welcomeText);
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

      await this.sendWhatsAppMessage(phoneNumber, devotionalText);

      // Log devotional delivery
      await this.logUserInteraction(phoneNumber, 'devotional_requested', 'feature_use');
    } catch (error) {
      console.error('Error sending devotional:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch today's devotional right now. Please try again later. 🙏");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Daily reminder set for ${time}!\n\nYou'll receive your devotional and prayer points every day at this time.\n\nType 'menu' for more options.`);
    } catch (error) {
      console.error('Error setting daily reminder:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't set your reminder right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ Prayer slot reminders enabled!\n\nI'll remind you 1 hour and 30 minutes before your assigned prayer sessions.\n\nType 'menu' for more options.`);
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

      await this.sendWhatsAppMessage(phoneNumber, `✅ You've been unsubscribed from all reminders.\n\nWe'll miss you in our prayer community! 🙏\n\nTo reactivate, simply type 'menu' anytime.`);
    } catch (error) {
      console.error('Error unsubscribing user:', error);
    }
  }

  // Placeholder methods for additional features
  private async sendUserPrayerSchedule(phoneNumber: string): Promise<void> {
    // Implementation would fetch user's actual prayer schedule from database
    await this.sendWhatsAppMessage(phoneNumber, "📋 Your Prayer Schedule:\n\nCurrently, you don't have any assigned prayer slots.\n\nWould you like to request a prayer time slot? Reply with 'request slot' to get started!\n\nType 'menu' for more options.");
  }

  private async sendSlotRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "🙋 Prayer Slot Request:\n\nTo request a prayer time slot, please visit our dashboard at:\nhttps://b4cc0390-c3bd-450d-aa4c-0c324c9e9fbb-00-1u7acu7fuh03u.spock.replit.dev\n\nOr contact our admin team directly.\n\nType 'menu' for more options.");
  }

  private async sendSkipRequestForm(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏭️ Skip Prayer Session:\n\nTo request to skip a prayer session, please use our dashboard or contact the admin team.\n\nWe understand that life happens! 🙏\n\nType 'menu' for more options.");
  }

  private async requestCustomTime(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, "⏰ Custom Reminder Time:\n\nPlease reply with your preferred time in 24-hour format (e.g., '14:30' for 2:30 PM).\n\nI'll set up your daily devotional reminder for that time!\n\nType 'menu' to go back.");
  }

  private async sendUserSettings(phoneNumber: string): Promise<void> {
    if (!this.db) {
      await this.sendWhatsAppMessage(phoneNumber, "Settings temporarily unavailable. Please try again later.");
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

        await this.sendWhatsAppMessage(phoneNumber, settingsText);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      await this.sendWhatsAppMessage(phoneNumber, "Sorry, I couldn't fetch your settings right now. Please try again later.");
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

      await this.sendWhatsAppMessage(phoneNumber, `⏸️ All reminders paused!\n\nYour reminders have been temporarily disabled. You can reactivate them anytime from the menu.\n\nType 'menu' for options.`);
    } catch (error) {
      console.error('Error pausing reminders:', error);
    }
  }

  private async sendUserStatus(phoneNumber: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, `📊 Your Status:

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
}

// Export a singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();