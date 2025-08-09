import cron from 'node-cron';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, sql } from 'drizzle-orm';
import fetch from 'node-fetch';

import { 
  whatsAppBotUsers, 
  whatsAppMessages, 
  dailyDevotionals,
  prayerSlots,
  userProfiles,
  updates,
  type WhatsAppBotUser,
  type InsertWhatsAppBotUser,
  type InsertWhatsAppMessage,
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
  private db: ReturnType<typeof drizzle>;
  private config: WhatsAppAPIConfig;
  private deepSeekApiKey: string;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('DATABASE_URL environment variable is not set. WhatsApp bot will run with limited functionality.');
      return;
    }

    try {
      this.db = drizzle(neon(connectionString));
    } catch (error) {
      console.warn('Failed to connect to database for WhatsApp bot:', error);
      console.log('WhatsApp bot will run without database functionality');
      return;
    }
    
    this.config = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      apiVersion: 'v18.0'
    };

    this.deepSeekApiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY || '';

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
    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`Would send WhatsApp message to ${phoneNumber}: ${message}`);
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
        const lines = aiResponse.split('\n').filter(line => line.trim());
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
}

// Export a singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();