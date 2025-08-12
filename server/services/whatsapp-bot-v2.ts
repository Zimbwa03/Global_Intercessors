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
      
      // For +263785494594, we know it belongs to Ngonidzashe Zimbwa with ID eb399bac-8ae0-42fb-9ee8-ffb46f63a97f
      if (phoneNumber === '263785494594') {
        console.log('🎯 Recognized phone +263785494594 - using known user ID eb399bac-8ae0-42fb-9ee8-ffb46f63a97f');
        
        // Get Ngonidzashe Zimbwa's profile directly
        const { data: ngoniProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f')
          .single();

        console.log('👤 Ngonidzashe profile lookup:', { 
          success: !profileError, 
          profile: ngoniProfile, 
          error: profileError?.message 
        });

        if (ngoniProfile) {
          authUser = ngoniProfile;
          userId = ngoniProfile.id;
          console.log(`✅ Found Ngonidzashe Zimbwa: ${ngoniProfile.fullName || ngoniProfile.full_name} (ID: ${userId})`);
          
          // Ensure WhatsApp bot record exists
          const { data: existingBotUser } = await supabase
            .from('whatsapp_bot_users')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (!existingBotUser) {
            await supabase
              .from('whatsapp_bot_users')
              .insert({
                whatsapp_number: phoneNumber,
                user_id: userId,
                is_active: true,
                first_interaction: new Date().toISOString()
              });
            console.log(`✅ Created WhatsApp bot record for Ngonidzashe Zimbwa`);
          }
        } else {
          throw new Error('Could not find Ngonidzashe Zimbwa profile');
        }
      } else {
        // General phone search for other numbers
        const { data: profilesByPhone, error: phoneSearchError } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`phone.eq.${phoneNumber},phone.eq.+${phoneNumber}`);

        console.log('📞 Phone search in user_profiles:', { 
          success: !phoneSearchError, 
          count: profilesByPhone?.length || 0,
          data: profilesByPhone,
          error: phoneSearchError?.message 
        });

        if (profilesByPhone && profilesByPhone.length > 0) {
          authUser = profilesByPhone[0];
          userId = authUser.id;
          console.log(`✅ Found user by phone: ${authUser.fullName || authUser.full_name} (ID: ${userId})`);
        } else {
          console.log('❌ No user found for this phone number');
          throw new Error(`No user found for phone number ${phoneNumber}`);
        }
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

      // Handle button responses and commands
      if (command === 'continue' || command === 'start' || command === '/start' || command === 'hi' || command === 'hello') {
        await this.handleStartCommand(phoneNumber, userName);
      } else if (command === 'devotionals' || command === '/devotionals') {
        await this.handleDevotionalsMenuCommand(phoneNumber, userName);
      } else if (command === 'quiz' || command === '/quiz') {
        await this.handleQuizCommand(phoneNumber, userName);
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
      } else if (command === 'todays_word' || command === 'daily_declarations') {
        await this.handleDevotionalContent(phoneNumber, userName, command);
      } else if (command === 'get_fresh_word' || command === 'generate_another') {
        await this.handleGenerateContent(phoneNumber, userName, command);
      } else if (command === 'daily_devotional' || command === 'fresh_word' || command === 'scripture_insight') {
        await this.handleSpecificDevotional(phoneNumber, userName, command);
      } else if (command === 'easy_quiz' || command === 'medium_quiz' || command === 'hard_quiz') {
        await this.handleSpecificQuiz(phoneNumber, userName, command);
      } else if (command === 'reminder_30min' || command === 'reminder_15min' || command === 'reminder_custom') {
        await this.handleReminderSettings(phoneNumber, userName, command);
      } else if (command === 'global_updates' || command === 'prayer_requests') {
        await this.handleSpecificUpdates(phoneNumber, userName, command);
      } else if (command === 'warfare_declaration' || command === 'prophetic_word' || command === 'prayer_points') {
        await this.handleSpecificMessages(phoneNumber, userName, command);
      } else if (command === 'prayer_stats' || command === 'growth_report' || command === 'achievements') {
        await this.handleSpecificDashboard(phoneNumber, userName, command);
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

*"The effective, fervent prayer of a righteous man avails much."* – James 5:16

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

🔔 **/remind** - Enable prayer slot reminders
📖 **/devotional** - Get today's devotional content  
🛑 **/stop** - Disable notifications
❓ **/help** - Show this help message

*Simply type any command to get started!*

🕊️ *"Pray without ceasing"* - 1 Thessalonians 5:17`;

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
    await this.logInteraction(phoneNumber, 'command', 'quiz');

    const quizMessage = `🧠 *Bible Quiz Challenge* 🧠

Ready for a spiritual brain workout, ${userName}?

📚 Test and strengthen your biblical knowledge with:
🎯 Interactive Bible trivia questions
📖 Scripture memory challenges  
🏆 Progressive difficulty levels
📈 Track your spiritual growth
⭐ Earn badges for achievements
🌟 Compete with fellow intercessors globally

*"Study to show yourself approved unto God, a workman that needs not to be ashamed."* - 2 Timothy 2:15

Select your challenge level:`;

    const buttons = [
      { id: 'easy_quiz', title: '⭐ Beginner Level' },
      { id: 'medium_quiz', title: '⭐⭐ Intermediate' },
      { id: 'hard_quiz', title: '⭐⭐⭐ Advanced' }
    ];

    await this.sendInteractiveMessage(phoneNumber, quizMessage, buttons);
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
    
    const welcomeMessage = `🕊️ *${userName}, Welcome to Devotions* 🕊️

*"Your word is a lamp for my feet, a light on my path."* - Psalm 119:105

Choose your spiritual nourishment for today:`;

    const buttons = [
      { id: 'todays_word', title: "📖 Today's Word" },
      { id: 'daily_declarations', title: '🔥 Daily Declarations' },
      { id: 'back', title: '⬅️ Back to Menu' }
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
    }
  }

  // Generate Today's Word using DeepSeek AI
  private async generateTodaysWord(phoneNumber: string, userName: string): Promise<void> {
    try {
      const prompt = `Generate a powerful "Today's Word" devotional message for a Christian intercessor. Structure it exactly as follows:

1. Today's Word Topic (a compelling spiritual theme)
2. A relevant Bible verse that supports the topic
3. Deep explanation of the topic using the verse, breaking it down for the intercessor
4. A powerful short prayer focused on the message topic
5. End with "Amen."

Make it spiritually powerful, encouraging, and focused on prayer and intercession. Keep it concise but impactful.`;

      const content = await this.generateAIContent(prompt);
      
      const todaysWordMessage = `📖 *Today's Word* 📖

${content}

*May this word strengthen your prayer life today, ${userName}.*`;

      const buttons = [
        { id: 'get_fresh_word', title: '🔄 Get Fresh Word' },
        { id: 'back', title: '⬅️ Back' }
      ];

      await this.sendInteractiveMessage(phoneNumber, todaysWordMessage, buttons);

    } catch (error) {
      console.error('Error generating Today\'s Word:', error);
      
      const fallbackMessage = `📖 *Today's Word* 📖

**Topic: Standing Firm in Faith**

*"Be on your guard; stand firm in the faith; be courageous; be strong."* - 1 Corinthians 16:13

Dear ${userName}, in times of uncertainty, God calls us to stand firm in our faith. This verse reminds us that being on guard is not about fear, but about spiritual alertness. When we stand firm in faith, we become unshakeable pillars of strength in prayer.

As an intercessor, your firm foundation in Christ enables you to pray with authority and confidence. Let your faith be the anchor that holds steady when the storms of life rage around you.

**Prayer:** *Father God, help me to stand firm in my faith today. Give me courage to pray boldly and strength to persevere in intercession. Let my faith be unwavering as I stand in the gap for others. In Jesus' name, Amen.*`;

      const buttons = [
        { id: 'get_fresh_word', title: '🔄 Get Fresh Word' },
        { id: 'back', title: '⬅️ Back' }
      ];

      await this.sendInteractiveMessage(phoneNumber, fallbackMessage, buttons);
    }
  }

  // Generate Daily Declarations using DeepSeek AI
  private async generateDailyDeclarations(phoneNumber: string, userName: string): Promise<void> {
    try {
      const prompt = `Generate 10 powerful daily declarations for Christian intercessors. Structure exactly as follows:

📌 Declaration Focus: [Choose a spiritual theme like "Heart Standing Firm in the Lord", "Walking in Divine Authority", "Breakthrough and Victory", etc.]

For each declaration (1️⃣ through 🔟):
- Start with "🔥 I declare..." 
- Make it personal, powerful, and faith-building
- Add relevant emojis to make it engaging
- Include a supporting Bible verse with reference: 📖 [Verse] — "[Quote]"

Make them spiritually powerful, encouraging, and focused on prayer, faith, and intercession. Each declaration should be different and impactful.`;

      const content = await this.generateAIContent(prompt);
      
      const declarationsMessage = `🔥 *Daily Declarations* 🔥

*${userName}, speak these declarations over your life today:*

${content}

*Declare these with faith and watch God move in your life and ministry!*`;

      const buttons = [
        { id: 'generate_another', title: '🔄 Generate Another' },
        { id: 'back', title: '⬅️ Back' }
      ];

      await this.sendInteractiveMessage(phoneNumber, declarationsMessage, buttons);

    } catch (error) {
      console.error('Error generating Daily Declarations:', error);
      
      const fallbackMessage = `🔥 *Daily Declarations* 🔥

*${userName}, speak these declarations over your life today:*

📌 Declaration Focus: 💖 Heart Standing Firm in the Lord

1️⃣ 🔥 I declare my heart is unshakable because the Lord is my foundation! 🙏💪🏽✨
📖 Psalm 112:7 — "They will have no fear of bad news; their hearts are steadfast, trusting in the Lord."

2️⃣ 🔥 I declare that my heart remains pure and faithful to God's Word! 💎❤️🙌
📖 Matthew 5:8 — "Blessed are the pure in heart, for they will see God."

3️⃣ 🔥 I declare my heart is guarded by the peace of Christ! 🕊️💖🛡️
📖 Philippians 4:7 — "And the peace of God… will guard your hearts and your minds in Christ Jesus."

4️⃣ 🔥 I declare that my heart overflows with unshakable joy! 😄🔥💐
📖 Nehemiah 8:10 — "The joy of the Lord is your strength."

5️⃣ 🔥 I declare my heart will not be troubled but rests in His promises! 🌊🛌🙏
📖 John 14:1 — "Do not let your hearts be troubled. You believe in God; believe also in me."

*Declare these with faith and watch God move in your life and ministry!*`;

      const buttons = [
        { id: 'generate_another', title: '🔄 Generate Another' },
        { id: 'back', title: '⬅️ Back' }
      ];

      await this.sendInteractiveMessage(phoneNumber, fallbackMessage, buttons);
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
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a Christian devotional writer specializing in powerful, biblically-grounded content for intercessors and prayer warriors. Your writing is inspiring, scripturally sound, and spiritually empowering.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.8
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';

    } catch (error) {
      console.error('DeepSeek AI generation failed:', error);
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

  private async handleSpecificQuiz(phoneNumber: string, userName: string, level: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', level);

    let question = '';
    let answers = [];
    
    if (level === 'easy_quiz') {
      question = `⭐ *Beginner Bible Quiz* ⭐

Ready ${userName}? Here's your question:

❓ **Question 1:** Who built the ark that saved his family from the flood?

Choose your answer:`;
      answers = [
        { id: 'quiz_answer_noah', title: 'A) Noah' },
        { id: 'quiz_answer_moses', title: 'B) Moses' },
        { id: 'quiz_answer_abraham', title: 'C) Abraham' }
      ];
    } else if (level === 'medium_quiz') {
      question = `⭐⭐ *Intermediate Bible Quiz* ⭐⭐

Challenge time, ${userName}!

❓ **Question 1:** In which city was Jesus born?

Choose your answer:`;
      answers = [
        { id: 'quiz_answer_bethlehem', title: 'A) Bethlehem' },
        { id: 'quiz_answer_nazareth', title: 'B) Nazareth' },
        { id: 'quiz_answer_jerusalem', title: 'C) Jerusalem' }
      ];
    } else {
      question = `⭐⭐⭐ *Advanced Bible Quiz* ⭐⭐⭐

Expert level, ${userName}!

❓ **Question 1:** Who was the high priest when David ate the showbread?

Choose your answer:`;
      answers = [
        { id: 'quiz_answer_ahimelech', title: 'A) Ahimelech' },
        { id: 'quiz_answer_zadok', title: 'B) Zadok' },
        { id: 'quiz_answer_abiathar', title: 'C) Abiathar' }
      ];
    }

    await this.sendInteractiveMessage(phoneNumber, question, answers);
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