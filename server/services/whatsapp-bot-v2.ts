import cron from 'node-cron';
import { supabaseAdmin as supabase } from '../supabase.js';
import fetch from 'node-fetch';
import { AdvancedReminderSystem } from './advancedReminderSystem';

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
  join_url?: string;
  start_url?: string;
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
  private bibleStudySessions: Map<string, {
    inSession: boolean;
    topic: string | null;
    conversationHistory: Array<{role: string, content: string}>;
    waitingForTopic?: boolean;
  }> = new Map();

  // Bible Quiz Game Session Management - Enhanced with Diverse Question Types
  private bibleQuizSessions: Map<string, {
    sessionId: string;
    currentQuestion: any;
    questionStartTime: number;
    score: number;
    streak: number;
    questionsAnswered: number;
    correctAnswers: number;
    sessionType: string;
    difficulty: string;
    topic?: string;
    questionType?: 'standard' | 'memory_verse' | 'situational_verse' | 'doctrine' | 'character_study';
    isActive: boolean;
  }> = new Map();
  private reminderSystem: AdvancedReminderSystem;


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

    // Initialize the advanced reminder system
    this.reminderSystem = new AdvancedReminderSystem(this);
    console.log('🔔 Advanced Reminder System initialized');


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

  // Get complete user information using phone number to access user auth and database
  private async getCompleteUserInfo(phoneNumber: string): Promise<{
    name: string;
    email: string;
    userId: string;
    slotInfo: string;
    slotTime: string | null;
    userDetails: any;
  }> {
    try {
      console.log(`🔍 Looking up user by phone number: ${phoneNumber}`);

      let authUser: any = null;
      let userId: string | null = null;

      // First try to find existing WhatsApp bot user record
      const { data: existingBotUser, error: botUserError } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (existingBotUser) {
        // Found existing WhatsApp bot user, get their profile
        userId = existingBotUser.user_id;
        console.log(`✅ Found existing WhatsApp bot user with ID: ${userId}`);

        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userProfile) {
          authUser = userProfile;
          console.log(`✅ Found user profile: ${userProfile.full_name} (ID: ${userId})`);
        } else {
          throw new Error(`Could not find user profile for ID: ${userId}`);
        }
      } else {
        // Try phone search with multiple formats 
        const phoneVariants = [
          phoneNumber,
          `+${phoneNumber}`,
          phoneNumber.startsWith('+') ? phoneNumber.slice(1) : `+${phoneNumber}`
        ];

        let foundProfile = null;
        for (const phoneVariant of phoneVariants) {
          const { data: profilesByPhone, error: phoneSearchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('phone_number', phoneVariant);

          console.log(`📞 Phone search for ${phoneVariant}:`, { 
            success: !phoneSearchError, 
            count: profilesByPhone?.length || 0,
            error: phoneSearchError?.message 
          });

          if (profilesByPhone && profilesByPhone.length > 0) {
            foundProfile = profilesByPhone[0];
            userId = foundProfile.id;
            authUser = foundProfile;
            console.log(`✅ Found user by phone variant ${phoneVariant}: ${foundProfile.full_name} (ID: ${userId})`);
            break;
          }
        }

        if (!foundProfile) {
          console.log('❌ No user found for phone number', phoneNumber);
          throw new Error(`No user found for phone number ${phoneNumber}`);
        }

        // Create WhatsApp bot user record for future lookups
        await supabase
          .from('whatsapp_bot_users')
          .insert({
            whatsapp_number: phoneNumber,
            user_id: userId,
            is_active: true,
            created_at: new Date().toISOString()
          });
        console.log(`✅ Created WhatsApp bot record for user ${userId}`);
      }

      // Now get user profile using the userId
      if (!authUser) {
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        console.log('👤 User profile lookup:', { 
          success: !profileError, 
          profile: userProfile, 
          error: profileError?.message 
        });

        authUser = userProfile;
      }

      // Get prayer slot information for this specific user
      const { data: prayerSlot, error: slotError } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      console.log('🕊️ Prayer slot lookup for user:', { 
        userId,
        userName: authUser ? (authUser.fullName || authUser.full_name || 'Unknown') : 'Unknown',
        success: !slotError, 
        slot: prayerSlot, 
        error: slotError?.message 
      });

      // Build user information from auth data  
      const fullName = authUser?.full_name || authUser?.fullName || '';
      const firstName = fullName.split(' ')[0] || '';
      const lastName = fullName.split(' ').slice(1).join(' ') || '';
      const name = fullName || 'Beloved Intercessor';
      const email = authUser?.email || prayerSlot?.user_email || 'Not registered';
      const slotTime = prayerSlot?.slot_time || null;
      const slotInfo = slotTime ? `⏱ Your current prayer slot: ${slotTime}` : `⏱ Prayer slot: Not assigned yet`;

      console.log('✅ User data compiled:', {
        name,
        email,
        userId: userId || 'unknown',
        slotTime,
        hasAuthUser: !!authUser,
        hasPrayerSlot: !!prayerSlot,
        phoneNumber
      });

      return {
        name,
        email,
        userId: userId!,
        slotInfo,
        slotTime,
        userDetails: {
          authUser,
          prayerSlot,
          whatsappNumber: phoneNumber
        }
      };

    } catch (error) {
      console.error('❌ Error connecting phone to user auth database:', error);

      return {
        name: 'Beloved Intercessor',
        email: 'Not available',
        userId: `whatsapp_${phoneNumber}`,
        slotInfo: '⏱ Prayer slot: Information unavailable',
        slotTime: null,
        userDetails: { error: (error as Error).message || 'Unknown error' }
      };
    }
  }

  // Get user's assigned prayer slot (legacy method for backward compatibility)
  private async getUserPrayerSlot(phoneNumber: string): Promise<string | null> {
    const userInfo = await this.getCompleteUserInfo(phoneNumber);
    return userInfo.slotTime;
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

  // Authentication methods
  private async isUserAuthenticated(phoneNumber: string): Promise<{authenticated: boolean, userId?: string}> {
    try {
      // Check if user is authenticated by looking up whatsapp_bot_users table
      const { data: botUser, error } = await supabase
        .from('whatsapp_bot_users')
        .select('user_id, is_active')
        .eq('whatsapp_number', phoneNumber)
        .eq('is_active', true)
        .single();

      if (error || !botUser) {
        return { authenticated: false };
      }

      // Verify the user still exists in user_profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', botUser.user_id)
        .single();

      if (profileError || !userProfile) {
        return { authenticated: false };
      }

      return { authenticated: true, userId: botUser.user_id };
    } catch (error) {
      console.error('Error checking authentication:', error);
      return { authenticated: false };
    }
  }

  private async authenticateUser(phoneNumber: string, email: string, password: string): Promise<{success: boolean, userId?: string, message: string}> {
    try {
      console.log(`🔐 Authenticating user: ${email}`);

      // Use Supabase auth to verify credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error || !data.user) {
        console.log(`❌ Authentication failed for ${email}:`, error?.message);
        return { 
          success: false, 
          message: "Login failed. The email or password you provided was incorrect. Please try again, or visit the Global Intercessors web app if you need to reset your password. Remember to delete your password message after trying again." 
        };
      }

      const userId = data.user.id;
      console.log(`✅ Authentication successful for ${email}, User ID: ${userId}`);

      // Get user profile data
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.log(`❌ No user profile found for user ${userId}`);
        return { 
          success: false, 
          message: `🔒 Authentication successful, but your phone number ${phoneNumber} is not saved in your Global Intercessors profile.

📱 To continue using the WhatsApp bot:

1️⃣ Open the Global Intercessors web application
2️⃣ Go to your User Profile settings
3️⃣ Add your WhatsApp number: ${phoneNumber}
4️⃣ Save your profile
5️⃣ Return here and try logging in again

This ensures secure connection between your account and WhatsApp bot access.` 
        };
      }

      // CRITICAL SECURITY CHECK: Verify the current phone number matches the registered WhatsApp number
      const registeredWhatsAppNumber = userProfile.whatsapp_number || userProfile.phone_number;

      if (!registeredWhatsAppNumber) {
        console.log(`❌ No WhatsApp number registered for user ${userId}`);
        return { 
          success: false, 
          message: `🔒 Authentication successful, but no WhatsApp number is registered in your Global Intercessors profile.

📱 To continue using the WhatsApp bot:

1️⃣ Open the Global Intercessors web application
2️⃣ Go to your User Profile settings  
3️⃣ Add your WhatsApp number: ${phoneNumber}
4️⃣ Save your profile
5️⃣ Return here and try logging in again

This ensures secure access to your account.` 
        };
      }

      // Normalize phone numbers for comparison (remove spaces, dashes, plus signs)
      const normalizePhone = (phone: string) => phone.replace(/[\s\-\+\(\)]/g, '');
      const currentPhoneNormalized = normalizePhone(phoneNumber);
      const registeredPhoneNormalized = normalizePhone(registeredWhatsAppNumber);

      if (currentPhoneNormalized !== registeredPhoneNormalized) {
        console.log(`❌ Phone number mismatch for user ${userId}. Current: ${phoneNumber}, Registered: ${registeredWhatsAppNumber}`);
        return { 
          success: false, 
          message: `🚫 **Access Denied - Unregistered Phone Number**

Your login credentials are correct, but this phone number (${phoneNumber}) is not registered in your Global Intercessors account.

**Registered WhatsApp number:** ${registeredWhatsAppNumber}

🔐 **For security reasons, bot access is restricted to registered phone numbers only.**

📱 **To use this phone number:**

1️⃣ Open the Global Intercessors web application
2️⃣ Go to your User Profile settings
3️⃣ Update your WhatsApp number to: ${phoneNumber}
4️⃣ Save your profile
5️⃣ Return here and login again

**Or use your registered phone number: ${registeredWhatsAppNumber}**` 
        };
      }

      // Create or update WhatsApp bot user record - simplified approach
      const { data: existingRecord, error: checkError } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      let upsertError = null;

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('whatsapp_bot_users')
          .update({
            user_id: userId,
            is_active: true,
            timezone: userProfile.timezone || 'UTC',
            updated_at: new Date().toISOString()
          })
          .eq('whatsapp_number', phoneNumber);
        upsertError = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('whatsapp_bot_users')
          .insert({
            user_id: userId,
            whatsapp_number: phoneNumber,
            is_active: true,
            timezone: userProfile.timezone || 'UTC',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        upsertError = insertError;
      }

      if (upsertError) {
        console.error('Error creating WhatsApp bot user record:', upsertError);
        console.error('Error details:', JSON.stringify(upsertError, null, 2));
        return { 
          success: false, 
          message: "Authentication was successful, but we couldn't link your WhatsApp account. Please try again." 
        };
      }

      // Log the interaction
      await this.logInteraction(phoneNumber, 'authentication', 'login_success');

      const userName = userProfile.fullName || userProfile.full_name || 'Beloved Intercessor';

      return { 
        success: true, 
        userId: userId,
        message: `Login successful! Welcome, ${userName}! You are now connected to your Global Intercessors account. You can now access your prayer slot reminders, daily scriptures, and more. Remember to delete your password message for security. How can I assist you today?` 
      };

    } catch (error) {
      console.error('Error in authentication process:', error);
      return { 
        success: false, 
        message: "An error occurred during login. Please try again later." 
      };
    }
  }

  private async sendLoginPrompt(phoneNumber: string): Promise<void> {
    const loginMessage = `Welcome to the Global Intercessors WhatsApp Bot! 🕊️

To access your personalized prayer features and account details, please log in with the same email and password you use for the Global Intercessors web app.

📧 Format your login like this:
Email: your_email@example.com
Password: your_secure_password

🔒 *Important: For your security, please delete your message containing your password from our chat immediately after successful login. We will confirm once you are logged in.*

If you don't have an account yet, please sign up at the Global Intercessors web app first.`;

    const buttons = [
      { id: 'help_login', title: '❓ Need Help?' },
      { id: 'retry_login', title: '🔄 Try Again' }
    ];

    await this.sendInteractiveMessage(phoneNumber, loginMessage, buttons);
    await this.logInteraction(phoneNumber, 'authentication', 'login_prompt_sent');
  }

  private parseLoginCredentials(messageText: string): {email?: string, password?: string} {
    // Look for email and password in the message
    const emailMatch = messageText.match(/email:\s*([^\s\n]+)/i);
    const passwordMatch = messageText.match(/password:\s*([^\s\n]+)/i);

    if (emailMatch && passwordMatch) {
      return {
        email: emailMatch[1].trim(),
        password: passwordMatch[1].trim()
      };
    }

    // Try alternative format - lines with email and password
    const lines = messageText.split('\n');
    let email, password;

    for (const line of lines) {
      if (line.toLowerCase().includes('@') && !email) {
        email = line.trim();
      } else if (line.length > 5 && !password && !line.includes('@')) {
        password = line.trim();
      }
    }

    return { email, password };
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

    // Clear old processed messages (keep only last 100)
    if (this.processedMessages.size > 100) {
      const oldMessages = Array.from(this.processedMessages).slice(0, 50);
      oldMessages.forEach(id => this.processedMessages.delete(id));
    }

    // Rate limiting
    const now = Date.now();
    const lastMessage = this.rateLimitMap.get(phoneNumber) || 0;
    if (now - lastMessage < 1000) { // 1 second rate limit
      console.log('⚠️ Rate limited, skipping message');
      return;
    }
    this.rateLimitMap.set(phoneNumber, now);

    // Log incoming message
    await this.logMessage(phoneNumber, messageText, 'inbound');

    try {
      // First, check if user is authenticated
      const authStatus = await this.isUserAuthenticated(phoneNumber);
      const command = messageText.toLowerCase().trim();

      // Handle authentication for non-authenticated users
      if (!authStatus.authenticated) {
        console.log(`🔐 User ${phoneNumber} not authenticated, processing authentication`);

        // Check if this is a login attempt
        const credentials = this.parseLoginCredentials(messageText);

        if (credentials.email && credentials.password) {
          console.log(`🔐 Processing login attempt from ${phoneNumber} with email: ${credentials.email}`);
          const authResult = await this.authenticateUser(phoneNumber, credentials.email, credentials.password);

          if (authResult.success) {
            // Send success message with continue button
            const successButtons = [
              { id: 'continue', title: '✅ Continue' },
              { id: 'help', title: '❓ Help' }
            ];
            await this.sendInteractiveMessage(phoneNumber, authResult.message, successButtons);
          } else {
            // Send error message with retry buttons
            const retryButtons = [
              { id: 'retry_login', title: '🔄 Try Again' },
              { id: 'help_login', title: '❓ Need Help?' }
            ];
            await this.sendInteractiveMessage(phoneNumber, authResult.message, retryButtons);
          }
          return;
        }

        // For any other message from unauthenticated user, send login prompt
        console.log(`📧 Sending login prompt to unauthenticated user: ${phoneNumber}`);
        await this.sendLoginPrompt(phoneNumber);
        return;
      }

      console.log(`✅ User ${phoneNumber} is authenticated, processing command: ${command}`);

      // Get or create user for existing flow
      let user = await this.getUserByPhone(phoneNumber);
      if (!user) {
        await this.createOrUpdateUser(phoneNumber, {});
        user = await this.getUserByPhone(phoneNumber);
      }

      // Process command - Get complete user information for personalized responses
      const userInfo = await this.getCompleteUserInfo(phoneNumber);
      console.log(`🎯 Processing command "${command}" for authenticated user: ${userInfo.name} (${userInfo.userId})`);

      const userName = userInfo.name;

      // Check if user is in Bible Study session
      const bibleStudySession = this.bibleStudySessions.get(phoneNumber);
      if (bibleStudySession?.inSession && !command.startsWith('/end')) {
        await this.handleBibleStudyConversation(phoneNumber, userName, messageText);
        return;
      }

      // Check if user is in Bible Quiz session
      const quizSession = this.bibleQuizSessions.get(phoneNumber);
      if (quizSession?.isActive && !['quiz_menu', 'end_quiz', 'main_menu'].includes(command)) {
        await this.handleQuizAnswer(phoneNumber, userName, messageText);
        return;
      }

      // Handle button responses and commands
      if (command === 'continue' || command === 'start' || command === '/start' || command === 'hi' || command === 'hello') {
        await this.handleStartCommand(phoneNumber, userName);
      } else if (command === 'devotionals' || command === '/devotionals') {
        await this.handleDevotionalsMenuCommand(phoneNumber, userName);
      } else if (command === 'quiz' || command === '/quiz') {
        try {
          await this.handleQuizCommand(phoneNumber, userName);
        } catch (error) {
          console.error('❌ Error in quiz command:', error);
          await this.sendWhatsAppMessage(phoneNumber, `🧠 *Bible Quiz* 🧠

Welcome ${userName}! Let's test your biblical knowledge!

Reply with:
• "daily" for Daily Challenge
• "smart" for Smart Quiz
• "topic" for Topic Quiz

Ready to explore God's Word? 📚`);
        }
      } else if (command === 'reminders' || command === '/reminders') {
        await this.handleRemindersCommand(phoneNumber, userName);
      } else if (command === 'updates' || command === '/updates') {
        await this.handleUpdatesCommand(phoneNumber, userName);
      } else if (command === 'messages' || command === '/messages') {
        await this.handleMessagesCommand(phoneNumber, userName);
      } else if (command === 'dashboard' || command === '/dashboard') {
        await this.handleDashboardCommand(phoneNumber, userName);
      } else if (command === 'help' || command === '/help') {
        await this.handleHelpCommand(phoneNumber, userName);
      } else if (command === 'stop' || command === '/stop') {
        await this.handleStopCommand(phoneNumber, userName);
      } else if (command === 'retry_login') {
        await this.sendLoginPrompt(phoneNumber);
      } else if (command === 'help_login') {
        await this.handleLoginHelpCommand(phoneNumber);

      } else if (command === 'back' || command === 'menu') {
        await this.handleStartCommand(phoneNumber, userName);

      // Handle specific button interactions
      } else if (command === 'todays_word' || command === 'daily_declarations' || command === 'bible_study') {
        await this.handleDevotionalContent(phoneNumber, userName, command);
      } else if (command === 'get_fresh_word' || command === 'generate_another') {
        await this.handleGenerateContent(phoneNumber, userName, command);
      } else if (command === 'type_topic' || command === 'random_topic') {
        await this.handleBibleStudyTopicSelection(phoneNumber, userName, command);
      } else if (command === '/endstudy' || command === '/end bible study') {
        await this.handleEndBibleStudy(phoneNumber, userName);
      } else if (command === 'daily_devotional' || command === 'fresh_word' || command === 'scripture_insight') {
        await this.handleSpecificDevotional(phoneNumber, userName, command);
      } else if (command === 'easy_quiz' || command === 'medium_quiz' || command === 'hard_quiz' || 
                 command === 'daily_challenge' || command === 'topic_quiz' || command === 'adaptive_quiz') {
        await this.handleSpecificQuiz(phoneNumber, userName, command);
      } else if (['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'true', 'false'].includes(command) && 
                 this.bibleQuizSessions.has(phoneNumber)) {
        await this.handleQuizAnswer(phoneNumber, userName, messageText);
      } else if (command === 'reminder_30min' || command === 'reminder_15min' || command === 'reminder_custom') {
        await this.handleReminderSettings(phoneNumber, userName, command);
      } else if (command === 'global_updates' || command === 'prayer_requests') {
        await this.handleSpecificUpdates(phoneNumber, userName, command);
      } else if (command === 'warfare_declaration' || command === 'prophetic_word' || command === 'prayer_points') {
        await this.handleSpecificMessages(phoneNumber, userName, command);
      } else if (command === 'prayer_stats' || command === 'growth_report' || command === 'achievements') {
        await this.handleSpecificDashboard(phoneNumber, userName, command);
      } else if (command === 'next_question') {
        // Continue quiz with next question
        const session = this.bibleQuizSessions.get(phoneNumber);
        if (session) {
          await this.sendNextQuestion(phoneNumber, userName, session.sessionId);
        } else {
          await this.sendWhatsAppMessage(phoneNumber, 'No active quiz session. Please start a new quiz.');
        }
      } else if (command === 'end_quiz') {
        await this.endQuizSession(phoneNumber, userName, 'user_ended');
      } else if (command === 'start_adaptive') {
        const userInfo = await this.getCompleteUserInfo(phoneNumber);
        await this.startAdaptiveQuiz(phoneNumber, userName, userInfo.userId);
      } else if (command.startsWith('topic_')) {
        const topicType = command.replace('topic_', '');
        const userInfo = await this.getCompleteUserInfo(phoneNumber);
        await this.startTopicQuiz(phoneNumber, userName, userInfo.userId, topicType);
      } else if (command.startsWith('remind ')) { // Handle reminder commands
        await this.handleReminderCommand(phoneNumber, messageText, userInfo.userDetails);
      } else {
        await this.handleUnknownCommand(phoneNumber, userName, messageText);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.sendWhatsAppMessage(phoneNumber, 
        `🤖 I apologize, but I encountered an error processing your message. Please try again or reply *help* for assistance.`
      );
    }
  }

  private async handleStartCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'start');

    // Get complete user information from database
    const userInfo = await this.getCompleteUserInfo(phoneNumber);

    const welcomeMessage = `🙏 Hello, ${userInfo.name}!
Welcome to Global Intercessors Prayer Bot! 🙌
${userInfo.slotInfo}

I'm your personal prayer companion, here to strengthen your walk with God through:

📖 AI-Powered Devotionals – Daily scriptures with fresh, Spirit-led insights
🧠 Bible Quiz Challenge – Test and grow your biblical knowledge  
⏰ Smart Prayer Reminders – Never miss your intercession time
🌍 Global Prayer Updates – Join intercessors around the world in united prayer
✨ Fresh Messages – Daily AI-generated declarations & prayer points
📊 Personal Dashboard – Track and celebrate your spiritual growth

*"The effective, fervent prayer of the righteous man avails much."* – James 5:16

Choose an option below to begin your spiritual journey:`;

    const buttons = [
      { id: 'devotionals', title: '📖 Devotionals' },
      { id: 'quiz', title: '🧠 Bible Quiz' },
      { id: 'reminders', title: '⏰ Reminders' }
    ];

    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, buttons);
  }

  private async handleHelpCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'help');

    const helpMessage = `🤖 *Global Intercessors Bot Commands* 🤖

Hello ${userName}! Here are the available commands:

🔧 *PRAYER SLOT MANAGEMENT*
• *status* - Check your current slot
• *skip [days] [reason]* - Request time off
  Example: "skip 3 traveling"

🔔 *REMINDER SETTINGS*
• *remind [5-120]* - Set reminder minutes
  Example: "remind 30" (30 min before)
• *remind off* - Disable reminders

📖 *DAILY DEVOTIONAL*
• *devotionals* - Get devotional options

🧠 *BIBLE QUIZ*
• *quiz* - Start a Bible quiz challenge

🌍 *GLOBAL UPDATES*
• *updates* - View global prayer focuses

✨ *FRESH MESSAGES*
• *messages* - Access AI-generated content

📊 *PERSONAL DASHBOARD*
• *dashboard* - View your spiritual progress

❓ *GENERAL*
• *help* - Show this help message
• *stop* - Disable all notifications

*"Pray without ceasing"* - 1 Thessalonians 5:17`;

    await this.sendWhatsAppMessage(phoneNumber, helpMessage);
  }

  private async handleDevotionalsCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'devotionals');

    const devotionalsMessage = `📖 *Daily Devotionals* 📖

Welcome ${userName} to your spiritual growth journey!

🔥 Experience fresh, AI-powered devotionals featuring:
✨ Daily scripture with Spirit-led insights
🙏 Personalized prayer points for your intercession
⚔️ Prophetic declarations for breakthrough
🌍 Global prayer focuses connecting you with believers worldwide

*"Your word is a lamp to my feet and a light to my path."* - Psalm 119:105

Choose your devotional experience:`;

    const buttons = [
      { id: 'daily_devotional', title: '📅 Today\'s Devotional' },
      { id: 'fresh_word', title: '✨ Fresh Prophetic Word' },
      { id: 'scripture_insight', title: '🔍 Scripture Insight' }
    ];

    await this.sendInteractiveMessage(phoneNumber, devotionalsMessage, buttons);
  }

  private async handleQuizCommand(phoneNumber: string, userName: string): Promise<void> {
    try {
      await this.logInteraction(phoneNumber, 'command', 'quiz');

      // Get user's quiz progress
      const userInfo = await this.getCompleteUserInfo(phoneNumber);
      const quizProgress = await this.getUserQuizProgress(userInfo.userId);

      const quizMessage = `🧠 *Bible Quiz Challenge* 🧠

Welcome back, ${userName}! 🎯

📊 **Your Quiz Stats:**
📈 Level: ${quizProgress?.current_level || 1} (${quizProgress?.total_xp || 0} XP)
🔥 Current Streak: ${quizProgress?.current_streak || 0}
🎯 Accuracy: ${quizProgress?.total_questions_answered > 0 ? Math.round((quizProgress.total_correct_answers / quizProgress.total_questions_answered) * 100) : 0}%
🏆 Total Score: ${quizProgress?.total_score || 0}

Choose your quiz adventure:`;

      const buttons = [
        { id: 'daily_challenge', title: '🌟 Daily Challenge' },
        { id: 'smart_quiz', title: '🎯 Smart Quiz' },
        { id: 'memory_verse', title: '📖 Memory Verse' },
        { id: 'situational_quiz', title: '💡 Life Situations' },
        { id: 'topic_quiz', title: '📚 Topic Focus' }
      ];

      await this.sendInteractiveMessage(phoneNumber, quizMessage, buttons);
    } catch (error) {
      console.error('❌ Error in handleQuizCommand:', error);
      await this.sendWhatsAppMessage(phoneNumber, `🧠 *Bible Quiz Challenge* 🧠

Welcome ${userName}! Ready to test your biblical knowledge?

Choose your quiz adventure:

🌟 Type "daily_challenge" for Daily Challenge
🎯 Type "smart_quiz" for Smart Quiz
📖 Type "memory_verse" for Memory Verse Quiz
💡 Type "situational_quiz" for Life Situations Quiz
📚 Type "topic_quiz" for Topic Focus

Let's dive into God's Word together! 📚`);
    }
  }

  private async handleRemindersCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'reminders');

    // Update user preferences to enable reminders
    await this.createOrUpdateUser(phoneNumber, {
      reminder_preferences: { reminderTiming: "30min", enabled: true }
    });

    const reminderMessage = `⏰ *Smart Prayer Reminders* ⏰

Activated for ${userName}! 

✅ You will receive gentle reminders 30 minutes before your prayer slot
📱 Customizable notification preferences
🔔 Never miss your intercession time again
📊 Track your prayer consistency
🌍 Join global prayer coverage

*"Continue earnestly in prayer, being vigilant in it with thanksgiving"* - Colossians 4:2

Your faithfulness in prayer makes an eternal difference!

Choose your reminder settings:`;

    const buttons = [
      { id: 'reminder_30min', title: '⏰ 30 Min Before' },
      { id: 'reminder_15min', title: '⏰ 15 Min Before' },
      { id: 'reminder_custom', title: '⚙️ Custom Settings' }
    ];

    await this.sendInteractiveMessage(phoneNumber, reminderMessage, buttons);
  }

  private async handleUpdatesCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'updates');

    const updatesMessage = `🌍 *Global Prayer Updates* 🌍

Stay connected, ${userName}!

🌎 Join intercessors worldwide in united prayer for:
🔥 Global revival movements
🕊️ Peace in nations facing conflict  
⛪ Church growth in restricted regions
👨‍👩‍👧‍👦 Family restoration worldwide
🏥 Healing for the nations
💼 Economic breakthrough for believers

*"If my people, who are called by my name, will humble themselves and pray..."* - 2 Chronicles 7:14

Choose your prayer focus:`;

    const buttons = [
      { id: 'global_updates', title: '🌍 Global Updates' },
      { id: 'prayer_requests', title: '🙏 Prayer Requests' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, updatesMessage, buttons);
  }

  private async handleMessagesCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'messages');

    const messagesMessage = `✨ *Fresh Messages* ✨

AI-Generated spiritual content for ${userName}!

🔥 Receive powerful, Spirit-inspired content:
⚔️ Daily warfare declarations
🙏 Personalized prayer points
📜 Prophetic insights and words
💪 Faith-building affirmations
🌟 Breakthrough confessions
🎯 Targeted intercession focuses

*"Death and life are in the power of the tongue."* - Proverbs 18:21

Select your message type:`;

    const buttons = [
      { id: 'warfare_declaration', title: '⚔️ Warfare Declarations' },
      { id: 'prophetic_word', title: '📜 Prophetic Insights' },
      { id: 'prayer_points', title: '🙏 Prayer Points' }
    ];

    await this.sendInteractiveMessage(phoneNumber, messagesMessage, buttons);
  }

  private async handleDashboardCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'dashboard');

    const prayerSlot = await this.getUserPrayerSlot(phoneNumber);
    const slotDisplay = prayerSlot ? `Your slot: ${prayerSlot}` : 'No slot assigned';

    const dashboardMessage = `📊 *Personal Dashboard* 📊

Spiritual Progress Report for ${userName}

📈 **Your Prayer Journey:**
⏰ ${slotDisplay}
🎯 Prayer consistency: Building momentum!
🏆 Spiritual milestones: Growing in faith
📚 Bible knowledge: Expanding wisdom
🌟 Global impact: Making a difference

*"Being confident of this very thing, that He who has begun a good work in you will complete it."* - Philippians 1:6

View your detailed progress:`;

    const buttons = [
      { id: 'prayer_stats', title: '📈 Prayer Statistics' },
      { id: 'growth_report', title: '🌱 Growth Report' },
      { id: 'achievements', title: '🏆 Achievements' }
    ];

    await this.sendInteractiveMessage(phoneNumber, dashboardMessage, buttons);
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

  // New helper functions for button interactions
  private async handleLoginHelpCommand(phoneNumber: string): Promise<void> {
    const helpMessage = `🕊️ *Welcome to Global Intercessors WhatsApp Bot* 🕊️

*What is Global Intercessors?*
Global Intercessors is a worldwide prayer movement that maintains 24/7 prayer coverage around the globe. We unite believers from every nation in continuous intercession for revival, breakthrough, and God's kingdom advancement.

🌍 *Our Mission:*
• Maintain unbroken prayer chain across all time zones
• Connect intercessors globally for powerful corporate prayer
• Provide spiritual resources and AI-powered prayer assistance
• Track prayer consistency and spiritual growth

🔑 *To Access This Bot You Need:*

1️⃣ **Create Account:** Sign up at the Global Intercessors web application
2️⃣ **Complete Profile:** Add your personal information and WhatsApp number
3️⃣ **Login Here:** Use the same email and password from the web app
4️⃣ **Format:** Email: your@email.com Password: yourpassword

🙏 *Bot Features After Login:*
• Daily AI-powered devotionals and prophetic words
• Interactive Bible quizzes and spiritual challenges
• Prayer slot reminders and global updates
• Personal dashboard tracking your prayer journey

*Ready to join the global prayer movement?*`;

    const buttons = [
      { id: 'retry_login', title: '🔄 Try Login Again' }
    ];

    await this.sendInteractiveMessage(phoneNumber, helpMessage, buttons);
  }

  // New devotional menu handler
  private async handleDevotionalsMenuCommand(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'devotionals_menu');

    const welcomeMessage = `📚 *${userName}, Welcome to Devotions* 📚

*"Your word is a lamp for my feet, a light on my path."* - Psalm 119:105

Choose your spiritual nourishment for today:`;

    const buttons = [
      { id: 'todays_word', title: "📖 Today's Word" },
      { id: 'daily_declarations', title: '🔥 Daily Declarations' },
      { id: 'bible_study', title: '📚 Bible Study' }
    ];

    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, buttons);
  }

  // Handle devotional content generation
  private async handleDevotionalContent(phoneNumber: string, userName: string, type: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', type);

    if (type === 'todays_word') {
      await this.generateTodaysWord(phoneNumber, userName);
    } else if (type === 'daily_declarations') {
      await this.generateDailyDeclarations(phoneNumber, userName);
    } else if (type === 'bible_study') {
      await this.initiateBibleStudy(phoneNumber, userName);
    }
  }

  // Generate Today's Word using DeepSeek AI
  private async generateTodaysWord(phoneNumber: string, userName: string): Promise<void> {
    try {
      // Add timestamp for truly unique content generation
      const timestamp = Date.now();
      const randomTopics = ['Divine Authority', 'Breakthrough Power', 'Spiritual Warfare', 'Intercession Fire', 'Kingdom Victory', 'Prophetic Prayer', 'Heavenly Strategy', 'Miraculous Faith', 'Prayer Shield', 'Revival Fire'];
      const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];

      const prompt = `Generate a unique "Today's Word" devotional (ID: ${timestamp}) with focus on "${randomTopic}" for WhatsApp. Structure exactly as follows:

**Topic:** [Compelling spiritual theme - 3-4 words, different from "${randomTopic}"]

**Scripture:** [Book Chapter:Verse]
"[Write the COMPLETE Bible verse text - not just reference]"

**Deep Insight:**
[2-3 sentences explaining the verse's meaning for today's intercessor, focusing on practical application and spiritual empowerment]

**Prayer Declaration:**
"Father, [specific prayer based on the verse - 2 sentences]. In Jesus' name, Amen."

Make it spiritually rich, encouraging, and practical for prayer warriors. Generate fresh, unique content every time.`;

      const content = await this.generateAIContent(prompt);

      const firstName = userName.split(' ')[0];
      const todaysWordMessage = `📖 *Today's Word* 📖

${content}

🙏 *May this strengthen your intercession today, ${firstName}!*

*"The effective prayer of the righteous has great power." - James 5:16*`;

      const buttons = [
        { id: 'get_fresh_word', title: '✨ Get Fresh Word' },
        { id: 'daily_declarations', title: '🔥 Declarations' },
        { id: 'back', title: '⬅️ Back' }
      ];

      console.log(`📏 Enhanced Today's Word message length: ${todaysWordMessage.length} characters`);
      await this.sendInteractiveMessage(phoneNumber, todaysWordMessage, buttons);

    } catch (error) {
      console.error('Error generating Today\'s Word:', error);

      // Enhanced fallback message with full verse
      const firstName = userName.split(' ')[0];
      const fallbackMessage = `📖 *Today's Word* 📖

**Topic:** Unshakable Faith

**Scripture:** Hebrews 12:28
"Therefore, since we are receiving a kingdom that cannot be shaken, let us be thankful, and so worship God acceptably with reverence and awe."

**Deep Insight:**
God's kingdom stands firm when everything else crumbles. As intercessors, we pray from this unshakeable foundation. Your prayers today are rooted in eternal victory, not temporary circumstances.

**Prayer Declaration:**
"Father, anchor my heart in Your unchanging kingdom. Let my prayers flow from Your unshakeable throne. In Jesus' name, Amen."

🙏 *May this strengthen your intercession today, ${firstName}!*

*"The effective prayer of the righteous has great power." - James 5:16*`;

      const buttons = [
        { id: 'get_fresh_word', title: '✨ Get Fresh Word' },
        { id: 'daily_declarations', title: '🔥 Declarations' },
        { id: 'back', title: '⬅️ Back' }
      ];

      console.log(`📏 Enhanced fallback message length: ${fallbackMessage.length} characters`);
      await this.sendInteractiveMessage(phoneNumber, fallbackMessage, buttons);
    }
  }

  // Generate Daily Declarations using DeepSeek AI - Enhanced with more content
  private async generateDailyDeclarations(phoneNumber: string, userName: string): Promise<void> {
    try {
      // Add timestamp and variety for unique content
      const timestamp = Date.now();
      const focusThemes = ['Kingdom Authority', 'Spiritual Breakthrough', 'Divine Favor', 'Prayer Power', 'Victorious Living', 'Supernatural Strength', 'Heavenly Wisdom', 'Revival Fire', 'Prophetic Authority', 'Divine Protection'];
      const randomFocus = focusThemes[Math.floor(Math.random() * focusThemes.length)];

      const prompt = `Generate 8 powerful daily declarations for Christian intercessors (ID: ${timestamp}) with focus on "${randomFocus}". Structure for WhatsApp:

**Focus:** [Theme related to "${randomFocus}"]

1️⃣ I DECLARE: [Powerful faith statement - be specific and bold]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

2️⃣ I DECLARE: [Breakthrough statement - about obstacles breaking]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

3️⃣ I DECLARE: [Authority statement - about spiritual power]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

4️⃣ I DECLARE: [Victory statement - about overcoming]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

5️⃣ I DECLARE: [Favor statement - about God's blessing]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

6️⃣ I DECLARE: [Protection statement - about divine covering]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

7️⃣ I DECLARE: [Purpose statement - about calling and destiny]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

8️⃣ I DECLARE: [Healing statement - about restoration and wholeness]
📖 [Book Chapter:Verse] - "[Complete short Bible verse]"

Make each declaration powerful, unique, and include the complete short Bible verse text. Focus on empowering intercessors with spiritual authority.`;

      const content = await this.generateAIContent(prompt);

      const firstName = userName.split(' ')[0];
      const declarationsMessage = `🔥 *Daily Declarations* 🔥

*${firstName}, speak these over your life:*

${content}

💪 *Declare with bold faith!*

*"Let the redeemed SAY SO!" - Psalm 107:2*`;

      // Check message length and truncate if needed - increased limit for enhanced content
      if (declarationsMessage.length > 1600) {
        console.log(`⚠️ Message too long (${declarationsMessage.length} chars), truncating content`);
        // Truncate content but keep structure
        const lines = content.split('\n');
        const truncatedLines = lines.slice(0, 25); // Keep first 25 lines to maintain structure
        const truncatedContent = truncatedLines.join('\n') + '\n\n*[Content truncated - more declarations available]*';
        const truncatedMessage = `🔥 *Daily Declarations* 🔥

*${firstName}, speak these over your life:*

${truncatedContent}

💪 *Declare with bold faith!*

*"Let the redeemed SAY SO!" - Psalm 107:2*`;

        if (truncatedMessage.length > 1600) {
          throw new Error('Message still too long, using fallback');
        }

        await this.sendInteractiveMessage(phoneNumber, truncatedMessage, [
          { id: 'generate_another', title: '🔄 Fresh Declarations' },
          { id: 'todays_word', title: '📖 Today\'s Word' },
          { id: 'back', title: '⬅️ Back' }
        ]);
        return;
      }

      const buttons = [
        { id: 'generate_another', title: '🔄 Fresh Declarations' },
        { id: 'todays_word', title: '📖 Today\'s Word' },
        { id: 'back', title: '⬅️ Back' }
      ];

      console.log(`📏 Declarations message length: ${declarationsMessage.length} characters`);
      await this.sendInteractiveMessage(phoneNumber, declarationsMessage, buttons);

    } catch (error) {
      console.error('Error generating Daily Declarations:', error);
      console.error('Error details:', error.message);

      // Concise fallback message
      const firstName = userName.split(' ')[0];
      const fallbackMessage = `🔥 *Daily Declarations* 🔥

*${firstName}, speak these over your life:*

**Focus:** Kingdom Authority

1️⃣ I DECLARE: God's power flows through my prayers!
📖 Matthew 6:13

2️⃣ I DECLARE: Every chain is broken in Jesus' name!
📖 Isaiah 61:1

3️⃣ I DECLARE: Divine favor surrounds me like a shield!
📖 Psalm 5:12

4️⃣ I DECLARE: I walk in spiritual authority today!
📖 Luke 10:19

5️⃣ I DECLARE: My prayers align with God's will!
📖 1 John 5:14

💪 *Declare with bold faith!*

*"Let the redeemed SAY SO!" - Psalm 107:2*`;

      const buttons = [
        { id: 'generate_another', title: '🔄 Fresh Declarations' },
        { id: 'todays_word', title: '📖 Today\'s Word' },
        { id: 'back', title: '⬅️ Back' }
      ];

      console.log(`📏 Fallback declarations length: ${fallbackMessage.length} characters`);

      try {
        await this.sendInteractiveMessage(phoneNumber, fallbackMessage, buttons);
        console.log('✅ Fallback declarations sent successfully');
      } catch (sendError) {
        console.error('❌ Failed to send fallback declarations:', sendError);
        // Send a simple text message as last resort
        await this.sendWhatsAppMessage(phoneNumber, `🔥 Daily Declarations ready! Please try again or type "declarations" for your daily spiritual power boost, ${firstName}!`);
      }
    }
  }

  // Handle content regeneration
  private async handleGenerateContent(phoneNumber: string, userName: string, command: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', command);

    if (command === 'get_fresh_word') {
      await this.generateTodaysWord(phoneNumber, userName);
    } else if (command === 'generate_another') {
      await this.generateDailyDeclarations(phoneNumber, userName);
    }
  }

  // AI content generation helper
  private async generateAIContent(prompt: string): Promise<string> {
    try {
      console.log('🤖 Attempting AI content generation...');
      
      // Check if API key is available
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
      if (!apiKey) {
        console.error('❌ No AI API key configured');
        throw new Error('AI service unavailable - no API key');
      }

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a Christian devotional writer specializing in powerful, biblically-grounded content for intercessors and prayer warriors. Your writing is inspiring, scripturally sound, and spiritually empowering. Keep responses concise and formatted for WhatsApp messaging.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.8
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DeepSeek API error: ${response.status} - ${errorText}`);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('❌ No content returned from AI');
        throw new Error('No content returned from AI service');
      }

      console.log('✅ AI content generated successfully');
      return content;

    } catch (error) {
      console.error('❌ AI content generation failed:', error);
      throw error;
    }
  }

  // Specific button interaction handlers
  private async handleSpecificDevotional(phoneNumber: string, userName: string, type: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', type);

    let content = '';
    if (type === 'daily_devotional') {
      content = `📖 *Today's Devotional* 📖

Hello ${userName}!

🔥 *"For the eyes of the LORD run to and fro throughout the whole earth, to show Himself strong on behalf of those whose heart is loyal to Him."* - 2 Chronicles 16:9

💡 **Reflection:** God is actively seeking hearts completely devoted to Him. Your prayers today are part of His mighty work across the earth.

⚔️ **Declaration:** "Lord, I position my heart in complete loyalty to You. Use my prayers to demonstrate Your strength in every nation!"

🌍 **Intercession Focus:** Pray for spiritual awakening in unreached nations and for God's strength to be revealed through global intercession.`;
    } else if (type === 'fresh_word') {
      content = `✨ *Fresh Prophetic Word* ✨

Beloved ${userName},

🔥 **The Spirit speaks:** "I am raising up a generation of intercessors who will not be silent! Your prayers are creating pathways for My glory to flow in dark places."

⚔️ **Prophetic Declaration:** "I decree that every prayer offered in faith is breaking chains and opening prison doors. The sound of intercession is the sound of victory!"

🌟 **Personal Activation:** Step into your calling as a watchman on the walls. Your prayers today will shift atmospheres!`;
    } else {
      content = `🔍 *Scripture Insight* 🔍

Deep dive, ${userName}!

📖 *"The effectual fervent prayer of a righteous man availeth much."* - James 5:17

🎯 **Hebrew Insight:** The word "effectual" means "energized by divine power." Your prayers aren't just words - they're spiritual forces!

💪 **Application:** Today, pray with the understanding that each word carries divine energy to accomplish God's purposes.

🔥 **Challenge:** Spend 5 extra minutes in prayer today, knowing your words are charged with heaven's power!`;
    }

    const buttons = [
      { id: 'devotionals', title: '📖 More Devotionals' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, content, buttons);
  }

  private async handleSpecificQuiz(phoneNumber: string, userName: string, quizType: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', quizType);

    const userInfo = await this.getCompleteUserInfo(phoneNumber);

    if (quizType === 'daily_challenge') {
      await this.startDailyChallenge(phoneNumber, userName, userInfo.userId);
    } else if (quizType === 'adaptive_quiz') {
      await this.startAdaptiveQuiz(phoneNumber, userName, userInfo.userId);
    } else if (quizType === 'topic_quiz') {
      await this.showTopicSelection(phoneNumber, userName);
    } else {
      // Legacy difficulty-based quiz
      const difficulty = quizType.replace('_quiz', '');
      await this.startQuizSession(phoneNumber, userName, userInfo.userId, difficulty, 'difficulty_based');
    }
  }

  private async handleReminderSettings(phoneNumber: string, userName: string, setting: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', setting);

    let message = '';
    let timing = '30min';

    if (setting === 'reminder_30min') {
      timing = '30min';
      message = `⏰ *30-Minute Reminders Set!* ⏰

Perfect choice, ${userName}!

✅ You'll receive prayer reminders 30 minutes before your slot
📱 Gentle notifications to prepare your heart
🙏 Time to transition into prayer mindset
⚔️ Spiritual preparation for powerful intercession`;
    } else if (setting === 'reminder_15min') {
      timing = '15min';
      message = `⏰ *15-Minute Reminders Set!* ⏰

Great timing, ${userName}!

✅ You'll receive prayer reminders 15 minutes before your slot
⚡ Quick transition into prayer mode
🎯 Last-minute spiritual focus
🔥 Immediate intercession readiness`;
    } else {
      message = `⚙️ *Custom Reminder Settings* ⚙️

Customize your experience, ${userName}!

🔧 Available options:
• Reminder timing (5, 10, 15, 30, 60 minutes)
• Multiple reminders per slot
• Personalized message content
• Prayer focus themes

📞 Contact support to set up your custom preferences!`;
    }

    // Update user reminder preferences
    await this.createOrUpdateUser(phoneNumber, {
      reminder_preferences: { reminderTiming: timing, enabled: true }
    });

    const buttons = [
      { id: 'reminders', title: '⏰ Reminder Options' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, message, buttons);
  }

  private async handleSpecificUpdates(phoneNumber: string, userName: string, type: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', type);

    let content = '';
    if (type === 'global_updates') {
      content = `🌍 *Global Prayer Updates* 🌍

Current prayer focuses, ${userName}:

🚨 **Urgent:** Middle East peace negotiations
🔥 **Revival:** South Korea experiencing youth awakening
⛪ **Persecution:** Iranian believers need protection
🌾 **Harvest:** 10,000 new believers in Nigeria this month
💼 **Economics:** Pray for job provision in Argentina
👨‍👩‍👧‍👦 **Families:** Reconciliation movement in Philippines

*"The earth will be filled with the knowledge of the glory of the LORD."* - Habakkuk 2:14`;
    } else {
      content = `🙏 *Current Prayer Requests* 🙏

Join in prayer, ${userName}:

💒 **Church Leaders:** Wisdom for pastors navigating cultural challenges
🏥 **Healing:** Medical missions in remote African villages  
🎓 **Education:** Christian schools facing financial difficulties
🌪️ **Disasters:** Recovery efforts in storm-affected regions
💔 **Broken Hearts:** Emotional healing for trauma survivors
🕊️ **Peace:** Conflict resolution in divided communities

*"The prayer of a righteous person is powerful and effective."* - James 5:16`;
    }

    const buttons = [
      { id: 'updates', title: '🌍 More Updates' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, content, buttons);
  }

  private async handleSpecificMessages(phoneNumber: string, userName: string, type: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', type);

    let content = '';
    if (type === 'warfare_declaration') {
      content = `⚔️ *Warfare Declarations* ⚔️

Speak with authority, ${userName}!

💥 **I DECREE:**
• Every chain of darkness is broken in Jesus' name!
• The gates of hell shall not prevail against God's church!
• Divine breakthrough is manifesting in every area of my life!

🔥 **I DECLARE:**
• God's kingdom advances through my prayers!
• Angels are released to accomplish His will!
• Victory belongs to the Lord!

*"No weapon formed against you shall prosper!"* - Isaiah 54:17`;
    } else if (type === 'prophetic_word') {
      content = `📜 *Prophetic Insights* 📜

Heaven speaks, ${userName}:

🔮 **The Lord says:** "I am shifting seasons rapidly now. What seemed impossible yesterday becomes your testimony tomorrow."

✨ **Prophetic Vision:** "I see doors opening that man cannot shut. Your faithfulness in prayer has positioned you for divine appointments."

🌟 **Personal Word:** "The intercession flowing through you is creating wells of revival in dry places. Keep digging deeper!"

*"For My thoughts are not your thoughts."* - Isaiah 55:8`;
    } else {
      content = `🙏 *Targeted Prayer Points* 🙏

Intercession focus, ${userName}:

🎯 **For Nations:**
• Pray for governmental leaders to seek godly wisdom
• Intercede for religious freedom worldwide

🎯 **For Churches:**
• Unity among believers across denominational lines
• Fresh outpouring of the Holy Spirit

🎯 **For Families:**
• Protection over marriages and children
• Generational curses broken

*"I sought for a man among them who would make a wall."* - Ezekiel 22:30`;
    }

    const buttons = [
      { id: 'messages', title: '✨ More Messages' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, content, buttons);
  }

  private async handleSpecificDashboard(phoneNumber: string, userName: string, type: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', type);

    const prayerSlot = await this.getUserPrayerSlot(phoneNumber);
    let content = '';

    if (type === 'prayer_stats') {
      content = `📈 *Prayer Statistics* 📈

Your intercession journey, ${userName}:

⏰ **Prayer Slot:** ${prayerSlot || 'Not assigned'}
📅 **Days Active:** Building consistency!
🎯 **Prayer Focus:** Global intercession
⚡ **Impact Level:** Growing stronger
🌍 **Global Rank:** Rising intercessor

📊 **This Month:**
• Prayers offered: Countless blessings
• Breakthrough reports: Testimonies flowing
• Unity with global intercessors: Connected

*"Pray without ceasing!"* - 1 Thessalonians 5:17`;
    } else if (type === 'growth_report') {
      content = `🌱 *Spiritual Growth Report* 🌱

Your development, ${userName}:

📚 **Biblical Knowledge:** Expanding daily
🔥 **Faith Level:** Stronger than yesterday
💪 **Prayer Endurance:** Building stamina
🎯 **Prophetic Sensitivity:** Hearing heaven
🌟 **Leadership Capacity:** Emerging calling

📈 **Growth Areas:**
• Intercession intensity: Rising
• Scriptural insight: Deepening
• Spiritual authority: Increasing

*"Grow in grace and knowledge of our Lord."* - 2 Peter 3:18`;
    } else {
      content = `🏆 *Your Achievements* 🏆

Celebrating progress, ${userName}:

🥇 **Badges Earned:**
• Faithful Intercessor
• Prayer Warrior
• Global Connector

⭐ **Milestones Reached:**
• 30-day prayer streak: In progress
• Bible quiz champion: Growing
• Revival catalyst: Active

🎖️ **Special Recognition:**
• Part of 24/7 global prayer coverage
• Contributing to worldwide revival

*"Well done, good and faithful servant!"* - Matthew 25:23`;
    }

    const buttons = [
      { id: 'dashboard', title: '📊 Main Dashboard' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, content, buttons);
  }

  private async handleUnknownCommand(phoneNumber: string, userName: string, messageText: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'unknown_command', messageText);

    const unknownMessage = `🤖 I didn't understand "${messageText}", ${userName}.

Let me help you get back on track! Here are your options:`;

    const buttons = [
      { id: 'devotionals', title: '📖 Devotionals' },
      { id: 'quiz', title: '🧠 Bible Quiz' },
      { id: 'reminders', title: '⏰ Reminders' },
      { id: 'help', title: '❓ Help' }
    ];

    await this.sendInteractiveMessage(phoneNumber, unknownMessage, buttons);
  }

  // Bible Study Feature Implementation
  private async initiateBibleStudy(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'bible_study', 'initiate');

    // Initialize session
    this.bibleStudySessions.set(phoneNumber, {
      inSession: true,
      topic: null,
      conversationHistory: []
    });

    const firstName = userName.split(' ')[0];
    const welcomeMessage = `📚 *Welcome to Bible Study, ${firstName}!* 📚

I'm your personal Bible Study Instructor, here to guide you through God's Word with depth and spiritual insight.

*"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness."* - 2 Timothy 3:16

What topic would you like to explore today? You can choose your own or let me select one for you:`;

    const buttons = [
      { id: 'type_topic', title: '✏️ Type a Topic' },
      { id: 'random_topic', title: '🎲 Random Topic' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, buttons);
  }

  private async handleBibleStudyTopicSelection(phoneNumber: string, userName: string, selection: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'bible_study', 'topic_selection');

    const session = this.bibleStudySessions.get(phoneNumber);
    if (!session?.inSession) {
      await this.initiateBibleStudy(phoneNumber, userName);
      return;
    }

    if (selection === 'type_topic') {
      // Set a flag indicating user wants to type their own topic
      session.topic = null;
      session.conversationHistory = [];
      session.waitingForTopic = true;
      this.bibleStudySessions.set(phoneNumber, session);

      const message = `📝 *Type Your Bible Study Topic* 📝

Please type the Bible topic you'd like to study today.

*Examples:*
• Faith
• Love  
• Prayer
• Forgiveness
• The Holy Spirit
• Grace
• Hope
• Salvation
• Obedience
• Trust

*Simply type your chosen topic and we'll begin our study!*

Type */endstudy* anytime to end the session.`;

      await this.sendWhatsAppMessage(phoneNumber, message);
    } else if (selection === 'random_topic') {
      const topics = [
        'Faith', 'Love', 'Grace', 'Hope', 'Prayer', 'Forgiveness', 
        'The Holy Spirit', 'Discipleship', 'Wisdom', 'Peace', 
        'Joy', 'Redemption', 'Sacrifice', 'The Kingdom of God',
        'Humility', 'Worship', 'Thanksgiving', 'Perseverance',
        'Obedience', 'Trust', 'Salvation', 'Righteousness',
        'Mercy', 'Patience', 'Courage', 'Divine Purpose'
      ];

      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      session.topic = randomTopic;
      session.waitingForTopic = false;
      this.bibleStudySessions.set(phoneNumber, session);

      // Start the Bible study immediately with the random topic
      await this.startBibleStudyWithTopic(phoneNumber, userName, randomTopic);
    }
  }

  private async handleBibleStudyConversation(phoneNumber: string, userName: string, userMessage: string): Promise<void> {
    const session = this.bibleStudySessions.get(phoneNumber);
    if (!session?.inSession) return;

    try {
      // If waiting for topic input, set the topic from user message
      if (session.waitingForTopic && !session.topic) {
        const userTopic = userMessage.trim();
        session.topic = userTopic;
        session.waitingForTopic = false;
        this.bibleStudySessions.set(phoneNumber, session);

        // Start the Bible study with the user's chosen topic
        await this.startBibleStudyWithTopic(phoneNumber, userName, userTopic);
        return;
      }

      // If no topic set yet and user says "yes", this means they're ready to start with a random topic
      if (!session.topic && userMessage.toLowerCase() === 'yes') {
        await this.sendWhatsAppMessage(phoneNumber, 
          `📚 Please first select a topic by clicking "Type a Topic" or "Random Topic" from the menu.`);
        return;
      }

      // If topic is set but user says "yes", start the actual study
      if (session.topic && userMessage.toLowerCase() === 'yes' && session.conversationHistory.length === 0) {
        await this.startBibleStudyWithTopic(phoneNumber, userName, session.topic);
        return;
      }

      // Build conversation history for ongoing study
      session.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Generate AI response using DeepSeek with Bible Study Instructor persona
      const prompt = this.buildBibleStudyPrompt(session, userName);
      const aiResponse = await this.generateBibleStudyResponse(prompt, session.conversationHistory);

      // Send response
      await this.sendWhatsAppMessage(phoneNumber, aiResponse);

      // Update conversation history
      session.conversationHistory.push({
        role: 'assistant', 
        content: aiResponse
      });

      // Keep conversation history manageable (last 10 exchanges)
      if (session.conversationHistory.length > 20) {
        session.conversationHistory = session.conversationHistory.slice(-20);
      }

      this.bibleStudySessions.set(phoneNumber, session);

    } catch (error) {
      console.error('Error in Bible Study conversation:', error);
      await this.sendWhatsAppMessage(phoneNumber, 
        `📚 I apologize, but I encountered a technical issue. Let's continue our study. Please repeat your last message or ask another question about our topic: **${session.topic}**`
      );
    }
  }

  private buildBibleStudyPrompt(session: any, userName: string): string {
    const firstName = userName.split(' ')[0];

    return `You are a Professional, Knowledgeable, and Spiritually Discerning Bible Study Instructor conducting a WhatsApp Bible study session with ${firstName} on the topic of "${session.topic}". 

**Core Directives:**
1. **Persona Adherence:** Maintain a respectful, patient, encouraging, structured, contextual, application-oriented, and theologically neutral tone. Your language should be clear, concise, and accessible for WhatsApp messaging.

2. **Scripture-Centric:** Always ground discussions in biblical text. Encourage reading and referring to specific verses using standard format (e.g., John 3:16).

3. **Methodical Approach:** Use effective Bible study techniques:
   - **Observation:** Ask what the text says
   - **Interpretation:** Guide understanding of original context  
   - **Correlation:** Connect with other relevant scriptures
   - **Application:** Prompt personal life application

4. **Interactive Dialogue:** Ask open-ended questions. Facilitate discovery rather than just providing answers.

5. **WhatsApp Optimization:** Keep responses concise but meaningful (under 1000 characters when possible). Use emojis appropriately (📖🙏✨💝🌟) and bullet points for clarity.

6. **Session Management:** Remember this is an ongoing conversation. Reference previous points made and build upon them.

7. **Practical Focus:** Always include practical application questions and encourage personal reflection.

**Current Topic:** ${session.topic}
**Session Stage:** ${session.conversationHistory.length === 0 ? 'Beginning - provide opening question/verse' : 'Ongoing conversation'}

**Instructions:** 
- If this is the beginning, start with a foundational verse about ${session.topic} and an engaging opening question
- If ongoing, respond thoughtfully to the user's input and guide them deeper into the topic
- Include relevant scripture references
- Ask engaging questions that promote reflection
- Provide brief contextual information when helpful
- Encourage practical application

Remember: You're guiding ${firstName} through an enriching Bible study experience via WhatsApp. Be warm, encouraging, and spiritually insightful while maintaining theological integrity.`;
  }

  private async generateBibleStudyResponse(prompt: string, conversationHistory: any[]): Promise<string> {
    try {
      const messages = [
        {
          role: 'system',
          content: prompt
        },
        ...conversationHistory.slice(-6) // Include last 6 messages for context
      ];

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Let me think about that... Could you rephrase your question?';

    } catch (error) {
      console.error('Bible Study AI generation failed:', error);
      throw error;
    }
  }

  private async startBibleStudyWithTopic(phoneNumber: string, userName: string, topic: string): Promise<void> {
    const session = this.bibleStudySessions.get(phoneNumber);
    if (!session) return;

    try {
      const firstName = userName.split(' ')[0];

      // Generate opening Bible study content for the topic
      const prompt = `Generate an engaging opening for a Bible study session on "${topic}". Include:

1. A warm welcome mentioning the topic
2. One foundational Bible verse about ${topic} (include the full verse text, not just reference)
3. A brief introduction to why this topic is important for Christians
4. An engaging opening question to start the discussion

Format for WhatsApp (under 1000 characters). Use emojis appropriately (📖🙏✨💝🌟) and keep it conversational and inspiring.`;

      const openingContent = await this.generateBibleStudyResponse(prompt, []);

      // Send the opening content
      await this.sendWhatsAppMessage(phoneNumber, openingContent);

      // Add the opening to conversation history
      session.conversationHistory.push({
        role: 'assistant',
        content: openingContent
      });

      this.bibleStudySessions.set(phoneNumber, session);

    } catch (error) {
      console.error('Error starting Bible study with topic:', error);

      // Fallback message
      const fallbackMessage = `📚 *Welcome to our Bible Study on ${topic}!* 📚

${userName.split(' ')[0]}, let's explore what God's Word teaches us about **${topic}**.

📖 *"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness."* - 2 Timothy 3:16

This topic is foundational to our Christian walk. Through studying ${topic}, we can grow closer to God and understand His heart better.

🤔 *Opening Question:* What comes to mind when you think about ${topic}? How have you experienced this in your own life?

*Feel free to share your thoughts, ask questions, or request specific verses about this topic!*`;

      await this.sendWhatsAppMessage(phoneNumber, fallbackMessage);

      session.conversationHistory.push({
        role: 'assistant',
        content: fallbackMessage
      });
      this.bibleStudySessions.set(phoneNumber, session);
    }
  }

  private async handleEndBibleStudy(phoneNumber: string, userName: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'bible_study', 'end_session');

    // Clear session
    this.bibleStudySessions.delete(phoneNumber);

    const firstName = userName.split(' ')[0];
    const endMessage = `📚 *Bible Study Session Complete* 📚

Thank you for joining this Bible study session, ${firstName}! I pray that our time in God's Word has been enriching and transformative.

*"But be doers of the word, and not hearers only, deceiving yourselves."* - James 1:22

Remember, the journey of faith is continuous. Feel free to start another study session whenever you're ready to dive deeper into Scripture!

🙏 *God bless you as you apply His Word to your life!*`;

    const buttons = [
      { id: 'bible_study', title: '📚 New Bible Study' },
      { id: 'devotionals', title: '📖 More Devotionals' },
      { id: 'back', title: '⬅️ Back to Menu' }
    ];

    await this.sendInteractiveMessage(phoneNumber, endMessage, buttons);
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

  // Bible Quiz Game Methods
  private async getUserQuizProgress(userId: string) {
    try {
      console.log(`📊 Fetching quiz progress for user: ${userId}`);
      
      const { data: progress, error } = await supabase
        .from('bible_quiz_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Database error fetching quiz progress:', error);
        // Return default progress if database error
        return {
          current_level: 1,
          total_xp: 0,
          current_streak: 0,
          total_score: 0,
          total_questions_answered: 0,
          total_correct_answers: 0
        };
      }

      if (!progress || error?.code === 'PGRST116') {
        console.log(`ℹ️ No existing quiz progress found, creating new record for user: ${userId}`);
        
        // Create new progress record
        const newProgress = {
          user_id: userId,
          current_level: 1,
          total_xp: 0,
          current_streak: 0,
          total_score: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          last_played: new Date().toISOString()
        };

        try {
          const { data: created, error: createError } = await supabase
            .from('bible_quiz_progress')
            .insert(newProgress)
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating quiz progress:', createError);
            return newProgress; // Return default even if insert fails
          }

          console.log(`✅ Created new quiz progress for user: ${userId}`);
          return created || newProgress;
        } catch (insertError) {
          console.error('❌ Insert error:', insertError);
          return newProgress;
        }
      }

      console.log(`✅ Found existing quiz progress for user: ${userId}`);
      return progress;
    } catch (error) {
      console.error('❌ Error getting quiz progress:', error);
      return {
        current_level: 1,
        total_xp: 0,
        current_streak: 0,
        total_score: 0,
        total_questions_answered: 0,
        total_correct_answers: 0
      };
    }
  }

  private async startDailyChallenge(phoneNumber: string, userName: string, userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Check if user has already completed today's challenge
    const { data: existingChallenge } = await supabase
      .from('bible_quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_type', 'daily_challenge')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .single();

    if (existingChallenge && existingChallenge.is_completed) {
      const message = `🌟 *Daily Challenge Complete!* 🌟

You've already completed today's challenge, ${userName}!

🎯 Today's Score: ${existingChallenge.final_score}
⏱️ Completion Time: ${Math.round(existingChallenge.duration_seconds / 60)} minutes
🔥 Streak: ${existingChallenge.streak_count}

Come back tomorrow for a fresh challenge! 💪`;

      const buttons = [
        { id: 'adaptive_quiz', title: '🎯 Smart Quiz' },
        { id: 'topic_quiz', title: '📖 Topic Quiz' },
        { id: 'quiz', title: '🔙 Quiz Menu' }
      ];

      await this.sendInteractiveMessage(phoneNumber, message, buttons);
      return;
    }

    await this.startQuizSession(phoneNumber, userName, userId, 'adaptive', 'daily_challenge');
  }

  private async startAdaptiveQuiz(phoneNumber: string, userName: string, userId: string): Promise<void> {
    const progress = await this.getUserQuizProgress(userId);

    // Determine difficulty based on user performance
    let difficulty = 'easy';
    if (progress.total_questions_answered > 0) {
      const accuracy = progress.total_correct_answers / progress.total_questions_answered;
      if (accuracy >= 0.8 && progress.current_level >= 5) {
        difficulty = 'hard';
      } else if (accuracy >= 0.6 && progress.current_level >= 3) {
        difficulty = 'medium';
      }
    }

    const message = `🎯 *Smart Quiz Mode* 🎯

Based on your performance, ${userName}, I've selected ${difficulty} difficulty for you!

🧠 **Adaptive Learning:**
• Questions adjust to your skill level
• Progressive difficulty increases
• Personalized learning path
• Real-time performance tracking

Ready to challenge yourself? Let's go! 🚀`;

    const buttons = [
      { id: 'start_adaptive', title: '🚀 Start Quiz' },
      { id: 'quiz', title: '🔙 Choose Different' }
    ];

    await this.sendInteractiveMessage(phoneNumber, message, buttons);

    // Start the quiz immediately
    await this.startQuizSession(phoneNumber, userName, userId, difficulty, 'adaptive');
  }

  private async showTopicSelection(phoneNumber: string, userName: string): Promise<void> {
    const message = `📖 *Topic-Based Quiz* 📖

Choose your Bible study focus, ${userName}:

🎯 Test your knowledge in specific areas of Scripture and deepen your understanding through focused questions.

Select your topic:`;

    const buttons = [
      { id: 'topic_ot', title: '📜 Old Testament' },
      { id: 'topic_nt', title: '✝️ New Testament' },
      { id: 'topic_jesus', title: '🙏 Life of Jesus' }
    ];

    await this.sendInteractiveMessage(phoneNumber, message, buttons);
  }

  private async startTopicQuiz(phoneNumber: string, userName: string, userId: string, topicType: string): Promise<void> {
    const topicNames = {
      'ot': 'Old Testament',
      'nt': 'New Testament', 
      'jesus': 'Life of Jesus'
    };

    const topicName = topicNames[topicType as keyof typeof topicNames] || 'Bible Study';

    const message = `📖 *${topicName} Quiz* 📖

Excellent choice, ${userName}! 

🎯 **Topic Focus:** ${topicName}
📚 Questions will cover key themes, stories, and teachings
⭐ Difficulty will adapt to your performance
🏆 Earn bonus points for topic expertise

Ready to dive deep into Scripture? Let's begin! 🚀`;

    const buttons = [
      { id: 'start_topic_quiz', title: '🚀 Start Quiz' },
      { id: 'quiz', title: '🔙 Choose Different' }
    ];

    await this.sendInteractiveMessage(phoneNumber, message, buttons);

    // Start the quiz with topic focus
    await this.startQuizSession(phoneNumber, userName, userId, 'medium', `topic_${topicType}`);
  }

  private async startQuizSession(phoneNumber: string, userName: string, userId: string, difficulty: string, sessionType: string): Promise<void> {
    try {
      console.log(`🎮 Starting quiz session for ${userName} - ${difficulty} ${sessionType}`);

      // Try to create database session first
      let sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Create new quiz session in database
        const sessionData = {
          user_id: userId,
          session_type: sessionType,
          difficulty_level: difficulty,
          current_question_number: 1,
          score: 0,
          correct_answers: 0,
          questions_answered: 0,
          streak_count: 0,
          is_active: true,
          is_completed: false,
          created_at: new Date().toISOString()
        };

        const { data: session, error } = await supabase
          .from('bible_quiz_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (!error && session) {
          sessionId = session.id;
          console.log(`✅ Database quiz session created: ${sessionId}`);
        } else {
          console.error('⚠️ Database session creation failed, continuing with memory session:', error);
        }
      } catch (dbError) {
        console.error('⚠️ Database session creation error, continuing with memory session:', dbError);
      }

      // Always store session in memory for operation
      this.bibleQuizSessions.set(phoneNumber, {
        sessionId: sessionId,
        currentQuestion: null,
        questionStartTime: Date.now(),
        score: 0,
        streak: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        sessionType: sessionType,
        difficulty: difficulty,
        isActive: true
      });

      console.log(`📝 Memory session stored for ${phoneNumber}`);

      // Send welcome message with first question
      const welcomeMessage = `🎯 *${sessionType.replace('_', ' ').toUpperCase()}* 🎯

Welcome ${userName}! Ready for your Bible quiz challenge?

📊 **Session Details:**
🎚️ Difficulty: ${difficulty.toUpperCase()}
❓ Questions: Up to 10
⏱️ No time limit - take your time to think!

Let's begin! 🚀`;

      await this.sendWhatsAppMessage(phoneNumber, welcomeMessage);

      // Generate and send first question
      await this.sendNextQuestion(phoneNumber, userName, sessionId);

    } catch (error) {
      console.error('❌ Critical error starting quiz session:', error);
      
      // Clean up if needed
      this.bibleQuizSessions.delete(phoneNumber);
      
      await this.sendWhatsAppMessage(phoneNumber, `🎯 *Bible Quiz* 🎯

Sorry ${userName}, there was a technical issue starting your quiz. 

Let's try a simple approach - I'll send you Bible questions one by one!

🎯 **Ready for your first question?**`);

      // Try to send at least one fallback question
      setTimeout(async () => {
        try {
          const fallbackQuestion = {
            question: "Who was the first man God created?",
            options: ["Adam", "Abel", "Cain", "Seth"],
            correctAnswer: "Adam",
            scripture: "Genesis 2:7",
            explanation: "God formed Adam from the dust of the ground and breathed into his nostrils the breath of life."
          };

          const questionText = `❓ **Bible Question:**

${fallbackQuestion.question}

📖 *Reference: ${fallbackQuestion.scripture}*

Choose your answer:`;

          const buttons = fallbackQuestion.options.map((option: string, index: number) => ({
            id: `answer_${String.fromCharCode(97 + index)}`,
            title: `${String.fromCharCode(65 + index)}) ${option}`
          }));

          await this.sendInteractiveMessage(phoneNumber, questionText, buttons);
        } catch (fallbackError) {
          console.error('❌ Even fallback question failed:', fallbackError);
        }
      }, 2000);
    }
  }

  private async sendNextQuestion(phoneNumber: string, userName: string, sessionId: string): Promise<void> {
    try {
      const session = this.bibleQuizSessions.get(phoneNumber);
      if (!session) return;

      // Generate AI question
      const question = await this.generateQuizQuestion(session.difficulty, session.sessionType, session.questionsAnswered + 1);

      if (!question) {
        await this.endQuizSession(phoneNumber, userName, 'AI service unavailable');
        return;
      }

      // Store current question
      session.currentQuestion = question;
      session.questionStartTime = Date.now();
      this.bibleQuizSessions.set(phoneNumber, session);

      // Format question message
      const difficultyEmoji = {
        'easy': '⭐',
        'medium': '⭐⭐', 
        'hard': '⭐⭐⭐'
      };

      const questionText = `${difficultyEmoji[session.difficulty]} *Bible Quiz ${session.difficulty.toUpperCase()}* ${difficultyEmoji[session.difficulty]}

${userName}, here's Question ${session.questionsAnswered + 1}:

❓ **${question.question}**

${question.scripture ? `📖 *Reference: ${question.scripture}*\n` : ''}

Choose your answer:`;

      const answerButtons = question.options.map((option: string, index: number) => ({
        id: `quiz_${String.fromCharCode(97 + index)}`, // a, b, c, d
        title: `${String.fromCharCode(65 + index)}) ${option}` // A) option, B) option, etc.
      }));

      await this.sendInteractiveMessage(phoneNumber, questionText, answerButtons);

    } catch (error) {
      console.error('Error sending next question:', error);
      await this.endQuizSession(phoneNumber, userName, 'Error generating question');
    }
  }

  private async handleQuizAnswer(phoneNumber: string, userName: string, answer: string): Promise<void> {
    try {
      const session = this.bibleQuizSessions.get(phoneNumber);
      if (!session || !session.currentQuestion) return;

      const question = session.currentQuestion;
      let selectedAnswer = '';

      // Parse answer from button or text
      if (answer.startsWith('quiz_')) {
        const optionIndex = answer.replace('quiz_', '').charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
        selectedAnswer = question.options[optionIndex] || '';
      } else {
        // Handle text answers like "a", "b", "1", "2", etc.
        const cleanAnswer = answer.toLowerCase().trim();
        if (['a', 'b', 'c', 'd'].includes(cleanAnswer)) {
          const optionIndex = cleanAnswer.charCodeAt(0) - 97;
          selectedAnswer = question.options[optionIndex] || '';
        } else if (['1', '2', '3', '4'].includes(cleanAnswer)) {
          const optionIndex = parseInt(cleanAnswer) - 1;
          selectedAnswer = question.options[optionIndex] || '';
        }
      }

      if (!selectedAnswer) {
        await this.sendWhatsAppMessage(phoneNumber, 'Please select a valid answer option (A, B, C, or D).');
        return;
      }

      // Check if answer is correct
      const isCorrect = selectedAnswer === question.correctAnswer;
      const timeTaken = Math.round((Date.now() - session.questionStartTime) / 1000);

      // Calculate points
      let points = 0;
      if (isCorrect) {
        points = this.calculateQuizPoints(session.difficulty, timeTaken, session.streak);
        session.correctAnswers++;
        session.streak++;
      } else {
        session.streak = 0;
      }

      session.score += points;
      session.questionsAnswered++;

      // Update session in database
      await supabase
        .from('bible_quiz_sessions')
        .update({
          score: session.score,
          correct_answers: session.correctAnswers,
          questions_answered: session.questionsAnswered,
          streak_count: session.streak
        })
        .eq('id', session.sessionId);

      // Send feedback message with question type context
      const feedbackMessage = this.generateAnswerFeedback(
        isCorrect, 
        selectedAnswer, 
        question.correctAnswer,
        question.explanation || '',
        points,
        session.streak,
        userName,
        question.questionType || 'standard'
      );

      const continueButtons = [
        { id: 'next_question', title: '▶️ Next Question' },
        { id: 'end_quiz', title: '🏁 End Quiz' },
        { id: 'quiz_help', title: '❓ Help' }
      ];

      await this.sendInteractiveMessage(phoneNumber, feedbackMessage, continueButtons);

      // Check if quiz should continue
      if (session.questionsAnswered >= 10 || session.sessionType === 'daily_challenge' && session.questionsAnswered >= 5) {
        await this.endQuizSession(phoneNumber, userName, 'completed');
      }

    } catch (error) {
      console.error('Error handling quiz answer:', error);
      await this.sendWhatsAppMessage(phoneNumber, 'Sorry, there was an error processing your answer. Please try again.');
    }
  }

  private async generateQuizQuestion(difficulty: string, sessionType: string, questionNumber: number) {
    console.log(`🎯 Generating ${difficulty} quiz question #${questionNumber} for ${sessionType}`);
    
    // Determine question type based on session type and randomization
    let questionType = 'standard';
    if (sessionType === 'memory_verse') {
      questionType = 'memory_verse';
    } else if (sessionType === 'situational_quiz') {
      questionType = 'situational_verse';
    } else if (sessionType === 'smart_quiz') {
      // Mix different question types for smart quiz
      const types = ['standard', 'memory_verse', 'situational_verse', 'doctrine', 'character_study'];
      questionType = types[Math.floor(Math.random() * types.length)];
    }
    
    // Expanded fallback question pools with diverse question types
    const fallbackQuestions = {
      easy: [
        {
          question: "Who built the ark that saved his family from the flood?",
          options: ["Noah", "Moses", "Abraham", "David"],
          correctAnswer: "Noah",
          scripture: "Genesis 6-9",
          explanation: "Noah built the ark according to God's instructions to save his family and the animals from the worldwide flood.",
          questionType: "standard"
        },
        {
          question: "Fill in the missing word: 'For God so _____ the world that He gave His one and only Son'",
          options: ["blessed", "loved", "created", "saved"],
          correctAnswer: "loved",
          scripture: "John 3:16",
          explanation: "This foundational verse shows God's love as the motivation for salvation through Jesus Christ.",
          questionType: "memory_verse"
        },
        {
          question: "An intercessor is feeling fearful about a situation they're praying for. Which verse would best help them?",
          options: ["Isaiah 41:10 - Do not fear, for I am with you", "Psalm 23:1 - The Lord is my shepherd", "John 3:16 - For God so loved the world", "Matthew 6:9 - Our Father in heaven"],
          correctAnswer: "Isaiah 41:10 - Do not fear, for I am with you",
          scripture: "Isaiah 41:10",
          explanation: "This verse directly addresses fear and reminds believers of God's presence and strength.",
          questionType: "situational_verse"
        },
        {
          question: "Who was known for his dedication to prayer three times a day?",
          options: ["David", "Daniel", "Moses", "Abraham"],
          correctAnswer: "Daniel",
          scripture: "Daniel 6:10",
          explanation: "Daniel maintained his prayer routine even when it meant facing the lions' den, showing the importance of consistent prayer.",
          questionType: "character_study"
        }
      ],
      medium: [
        {
          question: "In which city was Jesus born?",
          options: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"],
          correctAnswer: "Bethlehem",
          scripture: "Matthew 2:1",
          explanation: "Jesus was born in Bethlehem of Judea, fulfilling the prophecy in Micah 5:2.",
          questionType: "standard"
        },
        {
          question: "Complete this verse: 'The prayer of a _____ person is powerful and effective'",
          options: ["faithful", "righteous", "humble", "persistent"],
          correctAnswer: "righteous",
          scripture: "James 5:16",
          explanation: "This verse emphasizes that righteous living enhances the effectiveness of prayer, crucial for intercessors.",
          questionType: "memory_verse"
        },
        {
          question: "An intercessor has been praying for someone's salvation for years without seeing results. What would encourage them?",
          options: ["Galatians 6:9 - Let us not become weary in doing good", "Psalm 23:4 - Even though I walk through the valley", "1 Corinthians 13:4 - Love is patient and kind", "Romans 8:28 - All things work together for good"],
          correctAnswer: "Galatians 6:9 - Let us not become weary in doing good",
          scripture: "Galatians 6:9",
          explanation: "This verse specifically encourages perseverance in spiritual work, especially when results aren't immediately visible.",
          questionType: "situational_verse"
        },
        {
          question: "What is the primary biblical foundation for intercessory prayer?",
          options: ["Church tradition", "Jesus' example and commands", "Old Testament practices", "Personal spiritual gifts"],
          correctAnswer: "Jesus' example and commands",
          scripture: "1 Timothy 2:1-2, John 17",
          explanation: "Jesus both modeled intercession (John 17) and commanded believers to pray for others, establishing the biblical foundation.",
          questionType: "doctrine"
        }
      ],
      hard: [
        {
          question: "What does the Hebrew word 'Selah' likely mean in the Psalms?",
          options: ["Pause and reflect", "Sing louder", "Repeat the verse", "End of prayer"],
          correctAnswer: "Pause and reflect",
          scripture: "Found throughout Psalms",
          explanation: "Selah is thought to be a musical or liturgical instruction meaning to pause and reflect on what was just sung or said.",
          questionType: "standard"
        },
        {
          question: "Complete this challenging verse: 'Now faith is the _____ of things hoped for, the evidence of things not seen'",
          options: ["foundation", "substance", "beginning", "promise"],
          correctAnswer: "substance",
          scripture: "Hebrews 11:1",
          explanation: "This verse defines faith as having substance - it's not wishful thinking but a spiritual reality that gives weight to our hopes.",
          questionType: "memory_verse"
        },
        {
          question: "An intercessor is facing spiritual warfare while praying for a difficult case. Which passage provides the best guidance?",
          options: ["Ephesians 6:12 - We wrestle not against flesh and blood", "Psalm 23:4 - Yea, though I walk through the valley", "Romans 8:28 - All things work together for good", "Philippians 4:13 - I can do all things through Christ"],
          correctAnswer: "Ephesians 6:12 - We wrestle not against flesh and blood",
          scripture: "Ephesians 6:12",
          explanation: "This verse directly addresses spiritual warfare, reminding intercessors that their battle is spiritual, not physical.",
          questionType: "situational_verse"
        },
        {
          question: "Who is known as the greatest intercessor in the Old Testament, standing in the gap for Israel's sins?",
          options: ["Moses", "David", "Samuel", "Jeremiah"],
          correctAnswer: "Moses",
          scripture: "Exodus 32:11-14, Numbers 14:13-20",
          explanation: "Moses repeatedly interceded for Israel, even offering his own life for their forgiveness, exemplifying sacrificial intercession.",
          questionType: "character_study"
        }
      ]
    };

    try {
      let prompt = '';
      
      // Generate different prompts based on question type
      switch (questionType) {
        case 'memory_verse':
          prompt = `Generate a ${difficulty} level memory verse Bible quiz question for Christian intercessors (Question ${questionNumber}).

Requirements:
- Present a well-known Bible verse with one crucial word missing
- Provide 4 multiple choice options for the missing word
- Choose verses meaningful for prayer warriors and intercessors
- Include explanation of verse significance for prayer life
- JSON format: {"question": "Fill in the missing word: 'The prayer of a _____ person is powerful and effective.'", "options": ["faithful", "righteous", "humble", "persistent"], "correctAnswer": "righteous", "scripture": "James 5:16", "explanation": "This verse reminds intercessors that righteous living enhances prayer power", "questionType": "memory_verse"}

${difficulty} guidelines:
- Easy: Well-known verses like John 3:16, Psalm 23:1
- Medium: Prayer/faith verses like James 5:16, Hebrews 11:1
- Hard: Deeper theological verses, original language concepts`;

        case 'situational_verse':
          prompt = `Generate a ${difficulty} level situational verse matching question for Christian intercessors (Question ${questionNumber}).

Requirements:
- Present a real-life situation that intercessors commonly face
- Ask which Bible verse best applies to that situation
- Provide 4 verse options with references and partial text
- Focus on prayer ministry, spiritual warfare, or intercession scenarios
- JSON format: {"question": "An intercessor feels discouraged after months of prayer without breakthrough. Which verse would best encourage them?", "options": ["Galatians 6:9 - Let us not become weary...", "Psalm 23:1 - The Lord is my shepherd...", "John 3:16 - For God so loved...", "Proverbs 3:5 - Trust in the Lord..."], "correctAnswer": "Galatians 6:9 - Let us not become weary...", "scripture": "Galatians 6:9", "explanation": "This verse specifically addresses perseverance in prayer when results aren't immediately visible", "questionType": "situational_verse"}

${difficulty} guidelines:
- Easy: Common struggles like doubt, fear, need for guidance
- Medium: Ministry challenges, spiritual warfare, difficult prayers
- Hard: Complex theological situations, cultural challenges, leadership decisions`;

        case 'doctrine':
          prompt = `Generate a ${difficulty} level biblical doctrine question for mature Christian intercessors (Question ${questionNumber}).

Requirements:
- Focus on core Christian doctrines, theology, or spiritual principles
- Relevant to prayer ministry and intercession practices
- Include scriptural foundation and practical application
- JSON format: {"question": "What is the biblical foundation for intercessory prayer?", "options": ["Jesus' example and commands", "Old Testament traditions", "Church traditions", "Personal preference"], "correctAnswer": "Jesus' example and commands", "scripture": "1 Timothy 2:1-2, John 17", "explanation": "Jesus modeled intercession and commanded His followers to pray for others", "questionType": "doctrine"}`;

        case 'character_study':
          prompt = `Generate a ${difficulty} level Bible character study question for intercessors (Question ${questionNumber}).

Requirements:
- Focus on biblical characters known for prayer or faith
- Include lessons applicable to modern intercessors
- Provide insights into their prayer practices or spiritual journey
- JSON format: {"question": "Which biblical character prayed three times daily despite persecution?", "options": ["David", "Daniel", "Nehemiah", "Elijah"], "correctAnswer": "Daniel", "scripture": "Daniel 6:10", "explanation": "Daniel maintained his prayer routine despite the decree that led to the lions' den", "questionType": "character_study"}`;

        default: // standard
          prompt = `Generate a ${difficulty} level Bible quiz question for Christian intercessors (Question ${questionNumber}).

Requirements:
- Multiple choice with exactly 4 options
- Include Bible verse reference
- Brief explanation for correct answer
- JSON format: {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "scripture": "...", "explanation": "...", "questionType": "standard"}

${difficulty} guidelines:
- Easy: Basic Bible stories, well-known characters
- Medium: Biblical themes, geography, disciples, parables  
- Hard: Original languages, theological concepts, lesser-known details`;
      }

      const content = await this.generateAIContent(prompt);
      console.log('🤖 AI returned content for quiz question');

      // Clean and parse JSON response
      let cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim();
      
      // Handle cases where the AI returns the JSON wrapped in markdown
      if (cleanedContent.includes('```')) {
        const jsonMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedContent = jsonMatch[1].trim();
        }
      }

      const question = JSON.parse(cleanedContent);

      // Validate question structure
      if (!question.question || !Array.isArray(question.options) || question.options.length !== 4 || !question.correctAnswer) {
        throw new Error('Invalid question format from AI');
      }

      console.log('✅ Successfully generated and validated AI quiz question');
      return question;

    } catch (error) {
      console.error('❌ Error generating AI quiz question:', error);
      console.log('🔄 Using fallback question instead');

      // Use fallback questions with rotation based on question type
      const questionPool = fallbackQuestions[difficulty as keyof typeof fallbackQuestions] || fallbackQuestions.easy;
      
      // Filter by question type if specified
      let filteredQuestions = questionPool;
      if (questionType !== 'standard') {
        filteredQuestions = questionPool.filter(q => q.questionType === questionType);
        if (filteredQuestions.length === 0) {
          filteredQuestions = questionPool; // Fallback to all questions if none of the specified type
        }
      }
      
      const questionIndex = (questionNumber - 1) % filteredQuestions.length;
      return filteredQuestions[questionIndex];
    }
  }

  private calculateQuizPoints(difficulty: string, timeTaken: number, streak: number): number {
    let basePoints = 0;

    // Base points by difficulty
    switch (difficulty) {
      case 'easy': basePoints = 10; break;
      case 'medium': basePoints = 20; break;
      case 'hard': basePoints = 30; break;
      default: basePoints = 10;
    }

    // Time bonus (up to 50% bonus for quick answers)
    const timeBonus = Math.max(0, 1.5 - (timeTaken / 30));

    // Streak bonus (up to 100% bonus)
    const streakBonus = Math.min(1, streak * 0.1);

    return Math.round(basePoints * (1 + timeBonus + streakBonus));
  }

  private generateAnswerFeedback(
    isCorrect: boolean,
    selectedAnswer: string,
    correctAnswer: string,
    explanation: string,
    points: number,
    streak: number,
    userName: string,
    questionType: string = 'standard'
  ): string {
    
    let feedbackEmoji = '';
    let encouragement = '';
    
    // Customize feedback based on question type
    switch (questionType) {
      case 'memory_verse':
        feedbackEmoji = isCorrect ? '📖✅' : '📖❌';
        encouragement = isCorrect ? 
          '🌟 Excellent memory work! Scripture meditation strengthens your prayer life!' :
          '💡 Memorizing Scripture helps during spiritual battles. Keep studying God\'s Word!';
        break;
      case 'situational_verse':
        feedbackEmoji = isCorrect ? '💡✅' : '💡❌';
        encouragement = isCorrect ? 
          '🎯 Perfect application! You know how to apply God\'s Word to real situations!' :
          '📚 Learning to apply Scripture to life situations enhances your intercession ministry!';
        break;
      case 'doctrine':
        feedbackEmoji = isCorrect ? '⛪✅' : '⛪❌';
        encouragement = isCorrect ? 
          '🏛️ Solid biblical foundation! Strong doctrine strengthens effective prayer!' :
          '📖 Understanding biblical doctrine empowers confident intercession!';
        break;
      case 'character_study':
        feedbackEmoji = isCorrect ? '👑✅' : '👑❌';
        encouragement = isCorrect ? 
          '🌟 Great insight! Learning from biblical heroes inspires faithful intercession!' :
          '💪 Studying biblical characters teaches us perseverance in prayer!';
        break;
      default:
        feedbackEmoji = isCorrect ? '✅' : '❌';
        encouragement = isCorrect ? 
          '🌟 Keep up the excellent Bible knowledge!' :
          '📚 Every question is a learning opportunity! Study God\'s Word daily!';
    }

    if (isCorrect) {
      return `${feedbackEmoji} *Excellent, ${userName}!* ${feedbackEmoji}

Your answer: **${selectedAnswer}**

🎯 +${points} points earned!
${streak > 1 ? `🔥 ${streak} question streak!` : ''}

💡 **Explanation:** ${explanation}

${encouragement}`;
    } else {
      return `${feedbackEmoji} *Good try, ${userName}* ${feedbackEmoji}

Your answer: **${selectedAnswer}**
✅ Correct answer: **${correctAnswer}**

💡 **Explanation:** ${explanation}

${encouragement}`;
    }
  }

  private async endQuizSession(phoneNumber: string, userName: string, reason: string): Promise<void> {
    try {
      const session = this.bibleQuizSessions.get(phoneNumber);
      if (!session) return;

      // Update session as completed
      const { data: updatedSession } = await supabase
        .from('bible_quiz_sessions')
        .update({
          is_completed: true,
          is_active: false,
          final_score: session.score,
          duration_seconds: Math.round((Date.now() - session.questionStartTime) / 1000)
        })
        .eq('id', session.sessionId)
        .select()
        .single();

      // Update user progress
      await this.updateQuizProgress(phoneNumber, session);

      // Calculate performance metrics
      const accuracy = session.questionsAnswered > 0 ? (session.correctAnswers / session.questionsAnswered) * 100 : 0;
      const grade = this.calculateQuizGrade(accuracy);

      const summaryMessage = `🎓 *Quiz Complete!* 🎓

Great job, ${userName}! Here's your summary:

📊 **Final Results:**
🎯 Score: ${session.score} points
✅ Correct: ${session.correctAnswers}/${session.questionsAnswered}
📈 Accuracy: ${Math.round(accuracy)}%
🏆 Grade: ${grade}
🔥 Best Streak: ${session.streak}

${this.getEncouragementMessage(accuracy)}

*"Study to show yourself approved unto God, a workman that needs not to be ashamed, rightly dividing the word of truth."* - 2 Timothy 2:15`;

      const buttons = [
        { id: 'quiz', title: '🔄 Play Again' },
        { id: 'quiz_stats', title: '📊 View Stats' },
        { id: 'devotionals', title: '📖 Devotionals' },
        { id: 'continue', title: '🏠 Main Menu' }
      ];

      await this.sendInteractiveMessage(phoneNumber, summaryMessage, buttons);

      // Clean up session
      this.bibleQuizSessions.delete(phoneNumber);

    } catch (error) {
      console.error('Error ending quiz session:', error);
      this.bibleQuizSessions.delete(phoneNumber);
    }
  }

  private async updateQuizProgress(phoneNumber: string, session: any): Promise<void> {
    try {
      const userInfo = await this.getCompleteUserInfo(phoneNumber);
      const currentProgress = await this.getUserQuizProgress(userInfo.userId);

      const newXP = this.calculateXPGain(session.score, session.correctAnswers);
      const newLevel = this.calculateLevel(currentProgress.total_xp + newXP);

      await supabase
        .from('bible_quiz_progress')
        .update({
          total_xp: currentProgress.total_xp + newXP,
          current_level: newLevel,
          total_score: currentProgress.total_score + session.score,
          total_questions_answered: currentProgress.total_questions_answered + session.questionsAnswered,
          total_correct_answers: currentProgress.total_correct_answers + session.correctAnswers,
          current_streak: session.streak > currentProgress.current_streak ? session.streak : currentProgress.current_streak,
          last_played: new Date().toISOString()
        })
        .eq('user_id', userInfo.userId);

    } catch (error) {
      console.error('Error updating quiz progress:', error);
    }
  }

  private calculateXPGain(score: number, correctAnswers: number): number {
    return score + (correctAnswers * 5); // Base XP plus bonus for correct answers
  }

  private calculateLevel(totalXP: number): number {
    return Math.floor(totalXP / 100) + 1; // Level up every 100 XP
  }

  private calculateQuizGrade(accuracy: number): string {
    if (accuracy >= 90) return "A+ Excellent! 🌟";
    if (accuracy >= 80) return "A Good Work! 👍";
    if (accuracy >= 70) return "B Keep Going! 📚";
    if (accuracy >= 60) return "C Study More! 💪";
    return "Keep Learning! 🙏";
  }

  private getEncouragementMessage(accuracy: number): string {
    if (accuracy >= 80) {
      return "🌟 Outstanding biblical knowledge! Your dedication to God's Word is evident.";
    } else if (accuracy >= 60) {
      return "📚 Good effort! Continue studying Scripture to grow in wisdom and understanding.";
    } else {
      return "💪 Every step in learning God's Word matters. Keep studying and growing in faith!";
    }
  }

  // --- Reminder Command Handlers ---
  private async handleReminderCommand(phoneNumber: string, messageText: string, userData: any) {
    try {
      console.log(`🔔 Processing reminder command from ${phoneNumber}: ${messageText}`);

      const parts = messageText.toLowerCase().split(' ');
      if (parts[0] !== 'remind') {
        return;
      }

      // Handle "remind off" command
      if (parts[1] === 'off' || parts[1] === 'disable') {
        const success = await this.reminderSystem.disableReminders(userData.userId);
        if (success) {
          await this.sendMessage(phoneNumber, `🔕 *Reminders Disabled*\n\n✅ You will no longer receive prayer slot reminders.\n\n🔔 To re-enable, use: *remind [minutes]*\nExample: "remind 30"\n\n💡 You'll still receive daily morning messages with verses.`);
        } else {
          await this.sendMessage(phoneNumber, `❌ Failed to disable reminders. Please try again.`);
        }
        return;
      }

      // Handle "remind [minutes]" command
      const minutes = parseInt(parts[1]);
      if (isNaN(minutes) || minutes < 5 || minutes > 120) {
        await this.sendMessage(phoneNumber, `❌ Invalid reminder time: ${parts[1]}\n\n✅ Please specify 5-120 minutes\n\n🔔 *Examples:*\n• "remind 15" - 15 minutes before\n• "remind 30" - 30 minutes before\n• "remind 60" - 1 hour before\n• "remind off" - disable reminders`);
        return;
      }

      const success = await this.reminderSystem.updateReminderSettings(userData.userId, minutes);
      if (success) {
        await this.sendMessage(phoneNumber, `🔔 *Reminder Settings Updated!*\n\n⏰ *New Setting:* ${minutes} minutes before your slot\n\n📋 *What happens next:*\n• You'll receive a reminder ${minutes} minutes before your prayer slot\n• Daily morning messages will continue at 6:00 AM\n• Professional preparation tips included\n\n🛠️ *Change anytime:*\n• "remind [5-120]" - adjust timing\n• "remind off" - disable reminders\n\n_Standing strong in intercession! 💪_`);
      } else {
        await this.sendMessage(phoneNumber, `❌ Failed to update reminder settings. Please try again.`);
      }

    } catch (error) {
      console.error('❌ Error handling reminder command:', error);
      await this.sendMessage(phoneNumber, `❌ An error occurred updating your reminder settings. Please try again.`);
    }
  }

  // Helper to send messages, used by reminder system
  public async sendMessage(phoneNumber: string, message: string): Promise<void> {
    await this.sendWhatsAppMessage(phoneNumber, message);
  }
}

// Export singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();