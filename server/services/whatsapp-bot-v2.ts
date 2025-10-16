import cron from 'node-cron';
import { supabaseAdmin as supabase } from '../supabase.js';
import fetch from 'node-fetch';
import { AdvancedReminderSystem } from './advancedReminderSystem';
import { ScriptureCoachCommands } from './scriptureCoachCommands.js';
import { ScriptureCoachCommandsProduction } from './scriptureCoachCommands-production.js';

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
  timezone?: string;
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

  // Bible Quiz functionality removed - replaced with ScriptureCoach system
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
      console.warn('⚠️ WhatsApp API credentials not configured. Bot will run in SIMULATION MODE.');
      console.warn('📱 To enable real WhatsApp messaging, configure these environment variables:');
      console.warn('   - WHATSAPP_PHONE_NUMBER_ID');
      console.warn('   - WHATSAPP_ACCESS_TOKEN');
      console.warn('   - WHATSAPP_VERIFY_TOKEN');
    } else {
      console.log('✅ WhatsApp API credentials configured. Bot is ready for PRODUCTION messaging.');
    }

    // Initialize the advanced reminder system
    this.reminderSystem = new AdvancedReminderSystem(this);
    console.log('🔔 Advanced Reminder System initialized');


    this.initializeScheduledJobs();
  }

  private sanitizeForWhatsApp(input: string, isButton: boolean = false): string {
    if (!input) return '';
    let text = input;
    // Remove markdown bold/italic markers **, __, * around words
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    // Strip stray backticks and underscores commonly used in markdown
    text = text.replace(/[`_]/g, '');
    // Collapse multiple spaces/newlines for button titles
    if (isButton) {
      text = text.replace(/\s+/g, ' ').trim();
      // Enforce WhatsApp button max 20 chars (server-side guard; titles already trimmed elsewhere)
      if (text.length > 20) text = text.slice(0, 19) + '…';
    }
    // Replace smart quotes/emojis if needed (keep emojis, normalize quotes)
    text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    return text;
  }

  private initializeScheduledJobs() {
    // Prayer slot reminders - check every minute for upcoming slots
    cron.schedule('* * * * *', () => {
      this.checkPrayerSlotReminders();
    }, { timezone: 'Africa/Harare' });

    // Morning declarations at 6:00 AM daily
    cron.schedule('0 6 * * *', () => {
      this.sendMorningDeclarations();
    }, { timezone: 'Africa/Harare' });

    console.log('WhatsApp Prayer Bot v2 scheduled jobs initialized');
  }

  // Core messaging functionality
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    // Sanitize markdown that WhatsApp doesn't support (e.g., **bold**)
    const sanitizedBody = this.sanitizeForWhatsApp(message);
    console.log(`\n📤 SENDING MESSAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📝 Length: ${sanitizedBody.length} characters`);

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`❌ WhatsApp credentials missing - SIMULATION MODE`);
      console.log(`📄 Message Preview: ${sanitizedBody.substring(0, 100)}...`);
      console.log(`🔑 Missing: ${!this.config.phoneNumberId ? 'Phone Number ID' : ''}${!this.config.phoneNumberId && !this.config.accessToken ? ' and ' : ''}${!this.config.accessToken ? 'Access Token' : ''}`);
      return false;
    }

    console.log(`📄 Message Preview: ${sanitizedBody.substring(0, 100)}...`);

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
            body: sanitizedBody
          }
        })
      });

      if (response.ok) {
        console.log('✅ Message sent successfully');
        await this.logMessage(phoneNumber, sanitizedBody, 'outbound');
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

  // Send image with optional caption via WhatsApp
  private async sendWhatsAppImage(phoneNumber: string, base64Image: string, caption?: string): Promise<boolean> {
    console.log(`\n📤 SENDING IMAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📷 Image size: ${Math.round(base64Image.length / 1024)}KB`);

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      console.log(`❌ WhatsApp credentials missing - SIMULATION MODE`);
      return false;
    }

    try {
      // Extract base64 data and mime type
      const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        console.error('❌ Invalid base64 image format');
        return false;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Step 1: Upload image to WhatsApp media endpoint
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', buffer, {
        filename: 'image.jpg',
        contentType: mimeType
      });

      const uploadResponse = await fetch(`https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        console.error('❌ Failed to upload image:', error);
        return false;
      }

      const uploadData = await uploadResponse.json();
      const mediaId = uploadData.id;
      console.log(`✅ Image uploaded, Media ID: ${mediaId}`);

      // Step 2: Send image message with media ID
      const messageResponse = await fetch(`https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'image',
          image: {
            id: mediaId,
            caption: caption ? this.sanitizeForWhatsApp(caption) : undefined
          }
        })
      });

      if (messageResponse.ok) {
        console.log('✅ Image message sent successfully');
        await this.logMessage(phoneNumber, `[Image] ${caption || 'No caption'}`, 'outbound');
        return true;
      } else {
        const errorData = await messageResponse.text();
        console.error('❌ Failed to send image message:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp image:', error);
      return false;
    }
  }

  // Send interactive message with buttons
  private async sendInteractiveMessage(phoneNumber: string, text: string, buttons: { id: string, title: string }[]): Promise<boolean> {
    const sanitizedText = this.sanitizeForWhatsApp(text);
    const sanitizedButtons = buttons.map(b => ({ id: b.id, title: this.sanitizeForWhatsApp(b.title, true) }));
    console.log(`\n📤 SENDING INTERACTIVE MESSAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📝 Text: ${sanitizedText.substring(0, 100)}...`);
    console.log(`🔘 Buttons: ${sanitizedButtons.map(b => b.title).join(', ')}`);

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
              text: sanitizedText
            },
            action: {
              buttons: sanitizedButtons.map(button => ({
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

  // ==================== META WHATSAPP COMPLIANCE 2025 ====================
  
  // Send approved template message (Meta requirement for business-initiated messages)
  private async sendTemplateMessage(
    phoneNumber: string, 
    templateName: string, 
    parameters: string[]
  ): Promise<boolean> {
    console.log(`\n📤 SENDING TEMPLATE MESSAGE:`);
    console.log(`📱 To: ${phoneNumber}`);
    console.log(`📋 Template: ${templateName}`);
    console.log(`📝 Parameters: ${parameters.join(', ')}`);

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
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: [{
              type: 'body',
              parameters: parameters.map(text => ({ type: 'text', text }))
            }]
          }
        })
      });

      if (response.ok) {
        console.log('✅ Template message sent successfully');
        await this.logMessage(phoneNumber, `[Template: ${templateName}]`, 'outbound');
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to send template message:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending template message:', error);
      return false;
    }
  }

  // Send opt-in request to new users (Meta compliance requirement)
  private async sendOptInRequest(phoneNumber: string): Promise<void> {
    const message = `🕊️ *Welcome to Global Intercessors Prayer Platform!* 🕊️

To receive:
• 📖 Daily devotionals (6:00 AM)
• 🔔 Prayer slot reminders
• 📢 Important updates from leadership

*Reply YES to opt-in and start receiving messages.*
Reply NO to decline.

By opting in, you consent to receive WhatsApp messages from Global Intercessors. You can opt-out anytime by replying STOP.

*Global Intercessors - Standing in the Gap* 🙏`;

    await this.sendWhatsAppMessage(phoneNumber, message);
  }

  // Check if user has opted in and is allowed to receive messages
  private async canReceiveMessages(phoneNumber: string, checkServiceWindow: boolean = false): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('whatsapp_bot_users')
        .select('opted_in, is_active, last_inbound_message_at')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (!user) return false;
      
      const hasOptedIn = user.opted_in === true && user.is_active === true;
      
      if (!hasOptedIn) return false;
      
      // If checking service window, verify 24-hour window
      if (checkServiceWindow) {
        const withinWindow = await this.isWithinServiceWindow(phoneNumber);
        return withinWindow;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking opt-in status:', error);
      return false;
    }
  }

  // Process opt-in (YES command)
  private async processOptIn(phoneNumber: string): Promise<void> {
    try {
      const { data: existingUser } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (existingUser) {
        // Update existing user to opt-in
        await supabase
          .from('whatsapp_bot_users')
          .update({
            opted_in: true,
            is_active: true,
            opt_in_timestamp: new Date().toISOString(),
            opt_in_method: 'whatsapp_command',
            updated_at: new Date().toISOString()
          })
          .eq('whatsapp_number', phoneNumber);
      }

      const confirmMessage = `✅ *You're subscribed!* ✅

You will now receive:
• 📖 Daily devotionals at 6:00 AM
• 🔔 Prayer slot reminders
• 📢 Important updates

🎛️ *Manage Your Preferences:*
Reply *DEVOTIONAL OFF* to stop daily devotionals
Reply *REMINDERS OFF* to stop prayer reminders
Reply *UPDATES OFF* to stop admin updates
Reply *STOP* to unsubscribe from all messages

*Global Intercessors - Standing in the Gap* 🙏`;

      await this.sendWhatsAppMessage(phoneNumber, confirmMessage);
      await this.logInteraction(phoneNumber, 'opt_in', 'user_consented');
    } catch (error) {
      console.error('Error processing opt-in:', error);
    }
  }

  // Process opt-out (STOP command)
  private async processOptOut(phoneNumber: string): Promise<void> {
    try {
      await supabase
        .from('whatsapp_bot_users')
        .update({
          opted_in: false,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('whatsapp_number', phoneNumber);

      const confirmMessage = `✅ *You have been unsubscribed.* ✅

You will no longer receive:
• Daily devotionals
• Prayer slot reminders  
• Admin updates

To re-subscribe anytime, simply reply *YES*

We'll miss you! May God bless you abundantly.

*Global Intercessors - Standing in the Gap* 🙏`;

      await this.sendWhatsAppMessage(phoneNumber, confirmMessage);
      await this.logInteraction(phoneNumber, 'opt_out', 'user_unsubscribed');
    } catch (error) {
      console.error('Error processing opt-out:', error);
    }
  }

  // Helper to ensure user is opted in and active
  private async ensureUserOptedIn(phoneNumber: string): Promise<void> {
    try {
      await supabase
        .from('whatsapp_bot_users')
        .update({
          opted_in: true,
          is_active: true,
          opt_in_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('whatsapp_number', phoneNumber);
    } catch (error) {
      console.error('Error ensuring user opt-in:', error);
    }
  }

  // Update user message preferences (DEVOTIONAL/REMINDERS/UPDATES ON/OFF)
  private async updateUserPreference(phoneNumber: string, preferenceType: string, enabled: boolean): Promise<void> {
    try {
      console.log(`📝 Updating preference for ${phoneNumber}: ${preferenceType} = ${enabled}`);
      
      // First, check if user exists in whatsapp_bot_users
      const { data: existingUser, error: selectError } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (selectError || !existingUser) {
        // User doesn't exist - they need to log in first
        console.log(`⚠️ No whatsapp_bot_users record found for ${phoneNumber}`);
        console.log(`Select error:`, selectError);
        
        const loginMessage = `⚠️ *Please Log In First*

To manage your preferences, you need to log in to your Global Intercessors account.

📧 Reply with:
Email: your_email@example.com
Password: your_password

Or reply *HELP* for assistance.`;
        
        await this.sendWhatsAppMessage(phoneNumber, loginMessage);
        return;
      }

      // User exists, update their preference
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (preferenceType === 'DEVOTIONAL') {
        updateData.devotional_enabled = enabled;
      } else if (preferenceType === 'REMINDERS') {
        updateData.reminders_enabled = enabled;
      } else if (preferenceType === 'UPDATES') {
        updateData.updates_enabled = enabled;
      } else {
        console.error(`❌ Invalid preference type: ${preferenceType}`);
        const errorMessage = `❌ Invalid preference type. Please use DEVOTIONAL, REMINDERS, or UPDATES.`;
        await this.sendWhatsAppMessage(phoneNumber, errorMessage);
        return;
      }

      console.log(`Attempting to update:`, updateData);

      const { error } = await supabase
        .from('whatsapp_bot_users')
        .update(updateData)
        .eq('whatsapp_number', phoneNumber);

      if (error) {
        console.error('❌ Database error updating preference:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        const errorMessage = `❌ Sorry, there was an error updating your ${preferenceType.toLowerCase()} preferences.

Error: ${error.message || 'Unknown database error'}

Please try again or contact support.`;
        
        await this.sendWhatsAppMessage(phoneNumber, errorMessage);
        return;
      }

      console.log(`✅ Successfully updated ${preferenceType} to ${enabled} for ${phoneNumber}`);

      const status = enabled ? 'ON' : 'OFF';
      const emoji = enabled ? '✅' : '🔕';
      const action = enabled ? 'enabled' : 'disabled';
      
      const confirmMessage = `${emoji} *Preference Updated* ${emoji}

${preferenceType.charAt(0) + preferenceType.slice(1).toLowerCase()} messages are now *${status}*

You have successfully ${action} ${preferenceType.toLowerCase()} notifications.

To view all preferences, reply *SETTINGS*

*Global Intercessors - Standing in the Gap* 🙏`;

      await this.sendWhatsAppMessage(phoneNumber, confirmMessage);
    } catch (error: any) {
      console.error('❌ Error updating user preference:', error);
      console.error('Error stack:', error?.stack);
      
      const errorMessage = `❌ An unexpected error occurred while updating your preferences.

Error: ${error?.message || 'Unknown error'}

Please try again later or contact support.`;
      
      await this.sendWhatsAppMessage(phoneNumber, errorMessage);
    }
  }

  // Track last inbound message for 24-hour customer service window
  private async trackInboundMessage(phoneNumber: string): Promise<void> {
    try {
      await supabase
        .from('whatsapp_bot_users')
        .update({
          last_inbound_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('whatsapp_number', phoneNumber);
    } catch (error) {
      console.error('Error tracking inbound message:', error);
    }
  }

  // Check if within 24-hour customer service window (can send regular messages)
  private async isWithinServiceWindow(phoneNumber: string): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('whatsapp_bot_users')
        .select('last_inbound_message_at')
        .eq('whatsapp_number', phoneNumber)
        .single();

      if (!user || !user.last_inbound_message_at) return false;

      const lastInbound = new Date(user.last_inbound_message_at);
      const now = new Date();
      const hoursSinceInbound = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60);

      return hoursSinceInbound < 24;
    } catch (error) {
      console.error('Error checking service window:', error);
      return false;
    }
  }

  // ==================== END META WHATSAPP COMPLIANCE ====================

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
        .eq('id', userIdOrPhone)
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
          .eq('id', botUser.user_id)
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
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { 
      hour12: false, 
      timeZone: 'Africa/Harare' 
    });

    console.log(`🔍 [${currentTime}] Checking prayer slot reminders...`);

    try {
      // Get current time in Africa/Harare timezone
      const currentParts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Africa/Harare',
      }).formatToParts(now);

      const currentHour = Number(currentParts.find(p => p.type === 'hour')?.value || '0');
      const currentMinute = Number(currentParts.find(p => p.type === 'minute')?.value || '0');
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      console.log(`🕐 Current time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} (${currentTotalMinutes} minutes)`);

      // Direct query to get active slots with user details
      const { data: prayerSlots, error: slotsError } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (slotsError) {
        console.error('❌ Error fetching prayer slots:', slotsError);
        return;
      }

      if (!prayerSlots || prayerSlots.length === 0) {
        console.log('⚠️ No active prayer slots found');
        return;
      }

      const userIds = prayerSlots?.map(slot => slot.user_id).filter(Boolean) || [];

      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching user profiles:', profilesError);
        return;
      }

      // Combine data for easier access - using phone_number from user_profiles
      const combinedData = prayerSlots?.map(slot => {
        const profile = userProfiles?.find(up => up.id === slot.user_id);
        return { slot, profile };
      }).filter(d => d.profile && d.profile.phone_number); // Only include if profile exists with phone number

      if (!combinedData || combinedData.length === 0) {
        console.log('⚠️ No active prayer slots with WhatsApp phone numbers found');
        return;
      }

      console.log(`📊 Found ${combinedData.length} active prayer slots with WhatsApp numbers`);

      // Process each slot
      for (const item of combinedData) {
        const { slot, profile } = item;

        if (!profile.phone_number) {
          console.log(`⚠️ No WhatsApp number for slot ${slot.slot_time} (User ID: ${slot.user_id})`);
          continue;
        }

        // Parse slot time
        const slotTimeStr = slot.slot_time?.split('–')[0] || slot.slot_time;
        if (!slotTimeStr) {
          console.log(`⚠️ No slot time for user ${slot.user_id}`);
          continue;
        }

        const [slotHour, slotMinute] = slotTimeStr.split(':').map(Number);
        if (isNaN(slotHour) || isNaN(slotMinute)) {
          console.log(`⚠️ Invalid slot time format: ${slotTimeStr}`);
          continue;
        }

        const slotTotalMinutes = slotHour * 60 + slotMinute;
        console.log(`⏰ User ${slot.user_id}: ${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')} (${slotTotalMinutes} minutes)`);

        // Check for 30-minute reminder
        const reminder30Min = (slotTotalMinutes - 30 + 1440) % 1440;
        const diff30Min = Math.abs(currentTotalMinutes - reminder30Min);
        const timeDiff30Min = Math.min(diff30Min, 1440 - diff30Min);

        // Check for 15-minute reminder
        const reminder15Min = (slotTotalMinutes - 15 + 1440) % 1440;
        const diff15Min = Math.abs(currentTotalMinutes - reminder15Min);
        const timeDiff15Min = Math.min(diff15Min, 1440 - diff15Min);

        // Check for 5-minute reminder
        const reminder5Min = (slotTotalMinutes - 5 + 1440) % 1440;
        const diff5Min = Math.abs(currentTotalMinutes - reminder5Min);
        const timeDiff5Min = Math.min(diff5Min, 1440 - diff5Min);

        console.log(`🔍 Slot ${slot.id} timing check:`);
        console.log(`   - 30min reminder: ${reminder30Min} minutes (diff: ${timeDiff30Min})`);
        console.log(`   - 15min reminder: ${reminder15Min} minutes (diff: ${timeDiff15Min})`);
        console.log(`   - 5min reminder: ${reminder5Min} minutes (diff: ${timeDiff5Min})`);

        // Send appropriate reminder
        if (timeDiff30Min <= 1) {
          console.log(`🔔 Sending 30-minute reminder for slot ${slot.id}`);
          await this.sendPrayerSlotReminder(profile, slot, 30);
        } else if (timeDiff15Min <= 1) {
          console.log(`🔔 Sending 15-minute reminder for slot ${slot.id}`);
          await this.sendPrayerSlotReminder(profile, slot, 15);
        } else if (timeDiff5Min <= 1) {
          console.log(`🔔 Sending 5-minute reminder for slot ${slot.id}`);
          await this.sendPrayerSlotReminder(profile, slot, 5);
        }
      }

    } catch (error) {
      console.error('❌ Error in checkPrayerSlotReminders:', error);
      console.error('❌ Full error details:', error);
    }
  }

  private async sendPrayerSlotReminder(profile: any, slot: any, minutesBefore: number): Promise<void> {
    try {
      const userName = profile.full_name || 'Beloved Intercessor';
      const slotTime = slot.slot_time?.split('–')[0] || slot.slot_time;
      const whatsappNumber = profile.phone_number;

      if (!whatsappNumber) {
        console.log(`⚠️ No WhatsApp number found for user ${profile.id}`);
        return;
      }

      // META COMPLIANCE: Check if user has opted in and enabled reminders
      const { data: botUser } = await supabase
        .from('whatsapp_bot_users')
        .select('opted_in, reminders_enabled')
        .eq('whatsapp_number', whatsappNumber)
        .single();

      if (!botUser || !botUser.opted_in || !botUser.reminders_enabled) {
        console.log(`⚠️ User ${whatsappNumber} has not opted in or disabled reminders - skipping`);
        return;
      }

      // META COMPLIANCE: Check 24-hour service window
      const withinWindow = await this.isWithinServiceWindow(whatsappNumber);

      let timeText = '';
      let urgencyEmoji = '';
      let urgencyMessage = '';

      switch (minutesBefore) {
        case 30:
          timeText = '30 minutes';
          urgencyEmoji = '⏰';
          urgencyMessage = 'May the Lord strengthen you as you stand in the gap for His people and purposes.';
          break;
        case 15:
          timeText = '15 minutes';
          urgencyEmoji = '🔔';
          urgencyMessage = 'May the Lord strengthen you as you stand in the gap for His people and purposes.';
          break;
        case 5:
          timeText = '5 minutes';
          urgencyEmoji = '🚨';
          urgencyMessage = 'URGENT: Your prayer slot is starting soon! Please prepare your heart and join your Zoom meeting.';
          break;
        default:
          timeText = `${minutesBefore} minutes`;
          urgencyEmoji = '⏰';
          urgencyMessage = 'May the Lord strengthen you as you stand in the gap for His people and purposes.';
      }

      if (withinWindow) {
        // Within 24h window - can send regular message (free)
        const message = `🕊️ *Prayer Slot Reminder* 🕊️

Hello ${userName}! 

${urgencyEmoji} Your prayer slot (${slotTime}) begins in ${timeText}.

🙏 *"The effectual fervent prayer of a righteous man availeth much."* - James 5:16

${minutesBefore <= 5 ? '🚨 *URGENT:* Your prayer slot is starting soon! Please prepare your heart and join your Zoom meeting.' : 'May the Lord strengthen you as you stand in the gap for His people and purposes.'}

${slot.zoom_link ? `🔗 Join Zoom: ${slot.zoom_link}` : ''}

Reply *help* for more options.`;

        const success = await this.sendWhatsAppMessage(whatsappNumber, message);

        if (success) {
          console.log(`✅ ${timeText} prayer reminder sent to ${whatsappNumber} for slot ${slotTime}`);
          await this.logInteraction(whatsappNumber, 'reminder', 'prayer_slot');
        } else {
          console.log(`❌ Failed to send ${timeText} prayer reminder to ${whatsappNumber}`);
        }
      } else {
        // Outside window - use approved Meta template
        console.log(`📨 User ${whatsappNumber} outside 24h window - using approved template message`);
        const zoomLink = slot.zoom_link || '';
        await this.sendTemplateMessage(whatsappNumber, 'account_creation_cor', [userName, urgencyEmoji, slotTime, timeText, urgencyMessage, zoomLink]);
      }
    } catch (error) {
      console.error('❌ Error sending prayer slot reminder:', error);
    }
  }

  // Dynamic AI-generated morning declarations
  private async sendMorningDeclarations(): Promise<void> {
    try {
      // META COMPLIANCE: Only send to users who have opted in AND enabled devotionals
      const { data: activeUsers } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('is_active', true)
        .eq('opted_in', true)
        .eq('devotional_enabled', true);

      if (!activeUsers || activeUsers.length === 0) {
        console.log('⚠️ No active WhatsApp users with devotional preference enabled');
        return;
      }

      console.log(`🌅 Generating dynamic morning messages for ${activeUsers.length} opted-in users...`);

      for (const user of activeUsers) {
        let userName = 'Beloved Intercessor'; // Default fallback
        try {
          userName = await this.getUserName(user.user_id);

          // META COMPLIANCE: Check 24-hour service window
          const withinWindow = await this.isWithinServiceWindow(user.whatsapp_number);

          if (withinWindow) {
            // Within 24h window - can send regular message (free)
            const dynamicMessage = await this.generateDynamicMorningMessage(userName);
            await this.sendWhatsAppMessage(user.whatsapp_number, dynamicMessage);
            await this.logInteraction(user.whatsapp_number, 'morning_declaration_ai', 'daily');
          } else {
            // Outside window - use approved Meta template
            console.log(`📨 User ${user.whatsapp_number} outside 24h window - using approved template message`);
            const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            await this.sendTemplateMessage(user.whatsapp_number, 'daily_devotional_utility', [userName, dayOfWeek]);
          }

          // Rate limiting between users
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error sending morning message to user ${user.whatsapp_number}:`, error);

          // Fallback to static message if AI fails
          const fallbackMessage = `🌅 *Good Morning, ${userName}!* 🌅

✝️ "This is the day the LORD has made; I will rejoice and be glad in it!" - Psalm 118:24

🙏 May your prayers today move mountains and your intercession break every chain!

*God bless your day!*`;

          await this.sendWhatsAppMessage(user.whatsapp_number, fallbackMessage);
        }
      }

      console.log(`✅ Dynamic morning declarations sent to ${activeUsers.length} users`);
    } catch (error) {
      console.error('❌ Error sending morning declarations:', error);
    }
  }

  private async generateDynamicMorningMessage(userName: string): Promise<string> {
    try {
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        throw new Error('DeepSeek API key not configured');
      }

      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const prompt = `Generate a personalized morning devotional message for ${userName}, a Global Intercessor, for ${dayOfWeek}, ${currentDate}.

Requirements:
- Personal greeting with their name
- Fresh, inspiring Bible verse (different each day)
- Encouraging prayer focus for the day
- Motivational words for intercession
- Appropriate emojis for WhatsApp
- Maximum 200 words
- End with "Global Intercessors - Standing in the Gap"

Make it uplifting, personal, and spiritually powerful. Focus on prayer, intercession, and spiritual warfare themes.`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a pastoral AI assistant creating encouraging morning devotionals for Christian intercessors. Always include Bible verses and prayer focus.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.8
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0]?.message?.content;

      if (aiMessage) {
        console.log(`✅ Generated dynamic morning message for ${userName}`);
        return aiMessage;
      } else {
        throw new Error('No content generated by AI');
      }

    } catch (error) {
      console.error('❌ Error generating dynamic morning message:', error);

      // Fallback to dynamic but simpler message
      const bibleVerses = [
        '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, to give you hope and a future." - Jeremiah 29:11',
        '"The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you." - Zephaniah 3:17',
        '"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." - Joshua 1:9',
        '"But those who hope in the Lord will renew their strength. They will soar on wings like eagles." - Isaiah 40:31',
        '"The Lord will fight for you; you need only to be still." - Exodus 14:14'
      ];

      const randomVerse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      return `🌅 *Good Morning, ${userName}!* 🌅

Happy ${dayOfWeek}! God has great plans for your prayers today.

✨ *Today's Word:*
${randomVerse}

🙏 *Prayer Focus:* Stand in the gap for breakthrough, healing, and divine intervention in our world today.

Your intercession matters! 💪

*Global Intercessors - Standing in the Gap*`;
    }
  }

  // Admin update broadcasting with optional image support
  public async broadcastAdminUpdate(updateTitle: string, updateContent: string, imageUrl?: string | null): Promise<void> {
    try {
      console.log('📢 Broadcasting admin update to WhatsApp users:', updateTitle, imageUrl ? '(with image)' : '');

      // META COMPLIANCE: Only send to users who have opted in AND enabled updates
      const { data: activeUsers } = await supabase
        .from('whatsapp_bot_users')
        .select('*')
        .eq('is_active', true)
        .eq('opted_in', true)
        .eq('updates_enabled', true);

      if (!activeUsers || activeUsers.length === 0) {
        console.log('⚠️ No active WhatsApp users with updates enabled');
        return;
      }

      console.log(`📢 Broadcasting to ${activeUsers.length} opted-in users who have updates enabled`);

      // Generate AI-summarized update
      const summarizedUpdate = await this.generateUpdateSummary(updateTitle, updateContent);

      for (const user of activeUsers) {
        try {
          const userName = await this.getUserName(user.user_id);

          // META COMPLIANCE: Check 24-hour service window
          const withinWindow = await this.isWithinServiceWindow(user.whatsapp_number);

          if (withinWindow) {
            // Within 24h window - can send regular message (free)
            const message = `📢 *Important Update from Global Intercessors* 📢

Hello ${userName}!

🎯 **${updateTitle}**

${summarizedUpdate}

💡 *This update was sent by your Global Intercessors leadership team.*

🌐 *Visit the Global Intercessors app for full details.*

*Global Intercessors - Standing in the Gap* 🙏`;

            // Send image if provided
            if (imageUrl && imageUrl.startsWith('data:image')) {
              // Send image first, then caption
              await this.sendWhatsAppImage(user.whatsapp_number, imageUrl, message);
            } else {
              // Send text message only
              await this.sendWhatsAppMessage(user.whatsapp_number, message);
            }
            await this.logInteraction(user.whatsapp_number, 'admin_update', updateTitle);
          } else {
            // Outside window - use approved Meta template
            console.log(`📨 User ${user.whatsapp_number} outside 24h window - using approved template message`);
            await this.sendTemplateMessage(user.whatsapp_number, '_admin_update_utility', [userName, updateTitle, summarizedUpdate]);
          }

          // Rate limiting between users
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`❌ Error sending update to user ${user.whatsapp_number}:`, error);
        }
      }

      console.log(`✅ Admin update broadcast sent to ${activeUsers.length} WhatsApp users`);
    } catch (error) {
      console.error('❌ Error broadcasting admin update:', error);
    }
  }

  private async generateUpdateSummary(title: string, content: string): Promise<string> {
    try {
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        // Return simplified version if no AI
        return content.substring(0, 150) + (content.length > 150 ? '...' : '');
      }

      const prompt = `Summarize this Global Intercessors admin update for WhatsApp distribution:

Title: ${title}
Content: ${content}

Requirements:
- Keep it concise but informative (max 100 words)
- Maintain the important details
- Use encouraging, spiritual tone
- Suitable for WhatsApp messaging
- Include key action items if any`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a communications assistant for Global Intercessors. Summarize updates clearly and encouragingly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const summary = data.choices[0]?.message?.content;
        if (summary) {
          return summary;
        }
      }

      // Fallback to truncated content
      return content.substring(0, 150) + (content.length > 150 ? '...' : '');
    } catch (error) {
      console.error('❌ Error generating update summary:', error);
      return content.substring(0, 150) + (content.length > 150 ? '...' : '');
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
        // Update existing record - ensure user is opted in and active
        // DO NOT reset preferences - preserve user's choices
        const { error: updateError } = await supabase
          .from('whatsapp_bot_users')
          .update({
            user_id: userId,
            is_active: true,
            opted_in: true,
            opt_in_timestamp: new Date().toISOString(),
            opt_in_method: 'web_app_login',
            timezone: userProfile.timezone || 'UTC',
            updated_at: new Date().toISOString()
          })
          .eq('whatsapp_number', phoneNumber);
        upsertError = updateError;
      } else {
        // Insert new record - user is opted in via web app login with default preferences
        const { error: insertError } = await supabase
          .from('whatsapp_bot_users')
          .insert({
            user_id: userId,
            whatsapp_number: phoneNumber,
            is_active: true,
            opted_in: true,
            opt_in_timestamp: new Date().toISOString(),
            opt_in_method: 'web_app_login',
            devotional_enabled: true,
            reminders_enabled: true,
            updates_enabled: true,
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

    // Track inbound message for 24-hour customer service window (Meta compliance)
    await this.trackInboundMessage(phoneNumber);

    try {
      const command = messageText.toLowerCase().trim();

      // ==================== META WHATSAPP COMPLIANCE COMMANDS ====================
      // Process opt-in/opt-out and preferences FIRST (before authentication)
      
      // STOP command - highest priority (Meta requirement for immediate opt-out)
      if (command === 'stop' || command === 'unsubscribe' || command === 'cancel') {
        await this.processOptOut(phoneNumber);
        return;
      }

      // YES/CONFIRM/JOIN command - opt-in
      if (command === 'yes' || command === 'confirm' || command === 'join' || command === 'subscribe') {
        await this.processOptIn(phoneNumber);
        return;
      }

      // NO command - decline opt-in
      if (command === 'no' || command === 'decline') {
        const message = `No problem! You will not receive automated messages from Global Intercessors.

If you change your mind, simply reply *YES* anytime.

*Global Intercessors - Standing in the Gap* 🙏`;
        await this.sendWhatsAppMessage(phoneNumber, message);
        return;
      }

      // User preference management commands - check for BOTH keywords with word boundaries
      // Supports: "DEVOTIONAL OFF", "disable devotionals", "turn the devotionals off", etc.
      // Prevents false matches: bare "devotional" or "devotionals" button clicks won't match
      
      // DEVOTIONAL commands
      if (command.match(/\bdevotional(s)?\b/)) {
        if (command.match(/\b(off|disable|stop)\b/)) {
          await this.updateUserPreference(phoneNumber, 'DEVOTIONAL', false);
          return;
        }
        if (command.match(/\b(on|enable|start)\b/)) {
          await this.ensureUserOptedIn(phoneNumber);
          await this.updateUserPreference(phoneNumber, 'DEVOTIONAL', true);
          return;
        }
      }

      // REMINDER commands
      if (command.match(/\breminder(s)?\b/)) {
        if (command.match(/\b(off|disable|stop)\b/)) {
          await this.updateUserPreference(phoneNumber, 'REMINDERS', false);
          return;
        }
        if (command.match(/\b(on|enable|start)\b/)) {
          await this.ensureUserOptedIn(phoneNumber);
          await this.updateUserPreference(phoneNumber, 'REMINDERS', true);
          return;
        }
      }

      // UPDATE commands
      if (command.match(/\bupdate(s)?\b/)) {
        if (command.match(/\b(off|disable|stop)\b/)) {
          await this.updateUserPreference(phoneNumber, 'UPDATES', false);
          return;
        }
        if (command.match(/\b(on|enable|start)\b/)) {
          await this.ensureUserOptedIn(phoneNumber);
          await this.updateUserPreference(phoneNumber, 'UPDATES', true);
          return;
        }
      }

      // SETTINGS command - show current preferences
      if (command === 'settings' || command === 'preferences') {
        const { data: user } = await supabase
          .from('whatsapp_bot_users')
          .select('*')
          .eq('whatsapp_number', phoneNumber)
          .single();

        if (user) {
          const devotionalStatus = user.devotional_enabled ? '✅ ON' : '❌ OFF';
          const remindersStatus = user.reminders_enabled ? '✅ ON' : '❌ OFF';
          const updatesStatus = user.updates_enabled ? '✅ ON' : '❌ OFF';
          const optedInStatus = (user.opted_in && user.is_active) ? '✅ Subscribed' : '❌ Not subscribed';

          const settingsMessage = `⚙️ *Your Message Preferences* ⚙️

📊 *Status:* ${optedInStatus}

📖 *Daily Devotionals:* ${devotionalStatus}
🔔 *Prayer Reminders:* ${remindersStatus}
📢 *Admin Updates:* ${updatesStatus}

*To change:*
• Reply *DEVOTIONAL OFF* or *DEVOTIONAL ON*
• Reply *REMINDERS OFF* or *REMINDERS ON*
• Reply *UPDATES OFF* or *UPDATES ON*
• Reply *STOP* to unsubscribe from all

*Global Intercessors - Standing in the Gap* 🙏`;

          await this.sendWhatsAppMessage(phoneNumber, settingsMessage);
          return;
        } else {
          // User doesn't exist, create them with default settings
          await supabase
            .from('whatsapp_bot_users')
            .insert({
              whatsapp_number: phoneNumber,
              user_id: `whatsapp_${phoneNumber}`,
              is_active: true,
              opted_in: true,
              opt_in_timestamp: new Date().toISOString(),
              devotional_enabled: true,
              reminders_enabled: true,
              updates_enabled: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          const welcomeMessage = `⚙️ *Welcome! Your Preferences Set Up* ⚙️

📊 *Status:* ✅ Subscribed

📖 *Daily Devotionals:* ✅ ON
🔔 *Prayer Reminders:* ✅ ON
📢 *Admin Updates:* ✅ ON

*To change:*
• Reply *DEVOTIONAL OFF* or *DEVOTIONAL ON*
• Reply *REMINDERS OFF* or *REMINDERS ON*
• Reply *UPDATES OFF* or *UPDATES ON*
• Reply *STOP* to unsubscribe from all

*Global Intercessors - Standing in the Gap* 🙏`;

          await this.sendWhatsAppMessage(phoneNumber, welcomeMessage);
          return;
        }
      }

      // ==================== END COMPLIANCE COMMANDS ====================

      // First, check if user is authenticated
      const authStatus = await this.isUserAuthenticated(phoneNumber);

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

      // Bible Quiz functionality removed - replaced with ScriptureCoach system

      // Handle button responses and commands
      if (command === 'continue' || command === 'start' || command === '/start' || command === 'hi' || command === 'hello') {
        await this.handleStartCommand(phoneNumber, userName);
      } else if (command === 'devotionals' || command === '/devotionals') {
        await this.handleDevotionalsMenuCommand(phoneNumber, userName);
      } else if (command === 'scripture_coach' || command === '/scripture') {
        await this.handleScriptureCoachCommand(phoneNumber, userName);
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
      } else if (command === 'join_zoom') {
        await this.handleJoinZoom(phoneNumber);
      } else if (command === 'gi_app') {
        await this.handleGiApp(phoneNumber);
      } else if (command === 'settings' || command === 'preferences') {
        await this.handleSettingsCommand(phoneNumber);
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
      } else if (command === 'scripture_plan' || command === 'scripture_memorize' || command === 'scripture_quiz' || 
                 command === 'scripture_review' || command === 'scripture_stats' || command === 'daily_review' ||
                 command === 'verse_packs' || command === 'create_memory_card' || command === 'todays_reading' ||
                 command.startsWith('plan_') || command.startsWith('pack_') || command.startsWith('quiz_') ||
                 command.startsWith('rate_') || command === 'get_hint' || command === 'mark_complete' ||
                 command === 'get_reflection' || command === 'skip_review') {
        await this.handleScriptureCoachButton(phoneNumber, userName, command);
      } else if (command === 'reminder_30min' || command === 'reminder_15min' || command === 'reminder_custom') {
        await this.handleReminderSettings(phoneNumber, userName, command);
      } else if (command === 'global_updates' || command === 'prayer_requests') {
        await this.handleSpecificUpdates(phoneNumber, userName, command);
      } else if (command === 'warfare_declaration' || command === 'prophetic_word' || command === 'prayer_points') {
        await this.handleSpecificMessages(phoneNumber, userName, command);
      } else if (command === 'prayer_stats' || command === 'growth_report' || command === 'achievements') {
        await this.handleSpecificDashboard(phoneNumber, userName, command);
      // Bible Quiz functionality removed - replaced with ScriptureCoach system
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
// Bible Quiz functionality removed - replaced with ScriptureCoach system  
⏰ Smart Prayer Reminders – Never miss your intercession time
🌍 Global Prayer Updates – Join intercessors around the world in united prayer
✨ Fresh Messages – Daily AI-generated declarations & prayer points
📊 Personal Dashboard – Track and celebrate your spiritual growth

*"The effective, fervent prayer of the righteous man avails much."* – James 5:16

Choose an option below to begin your spiritual journey:`;

          const buttons = [
        { id: 'devotionals', title: '📖 Devotionals' },
        { id: 'scripture_coach', title: '📚 ScriptureCoach' },
        { id: 'reminders', title: '⏰ Reminders' }
      ];

    await this.sendInteractiveMessage(phoneNumber, welcomeMessage, buttons);

    // Send secondary quick-access buttons as a separate interactive message
    const quickAccessMessage = `🔗 Quick Access`;
    const quickButtons = [
      { id: 'join_zoom', title: '🎥 Join Zoom' },
      { id: 'gi_app', title: '🌐 GI App' },
      { id: 'settings', title: '⚙️ Settings' }
    ];

    await this.sendInteractiveMessage(phoneNumber, quickAccessMessage, quickButtons);
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

📚 *SCRIPTURECOACH*
• *scripture* - Bible learning & memorization
• *scripture plan* - Daily reading plans
• *scripture memorize* - Verse memorization
• *scripture quiz* - Memory challenges
• *scripture review* - Daily verse review

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

  // Bible Quiz functionality removed - replaced with ScriptureCoach system

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

📈 **Your Spiritual Growth:**
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
// Bible Quiz functionality removed - replaced with ScriptureCoach system
• Prayer slot reminders and global updates
• Personal dashboard tracking your spiritual growth

*Ready to join the global prayer movement?*`;

    const buttons = [
      { id: 'retry_login', title: '🔄 Try Login Again' }
    ];

    await this.sendInteractiveMessage(phoneNumber, helpMessage, buttons);
  }

  private async handleJoinZoom(phoneNumber: string): Promise<void> {
    const url = 'https://us06web.zoom.us/j/83923875995?pwd=QmVJcGpmRys1aWlvWCtZdzZKLzFRQT09';
    const message = `🎥 *Join Zoom Prayer*\n\nTap to join now:\n${url}`;
    await this.sendWhatsAppMessage(phoneNumber, message);
    await this.logInteraction(phoneNumber, 'button_action', 'join_zoom');
  }

  private async handleGiApp(phoneNumber: string): Promise<void> {
    const url = 'https://globalintercessors.co.zw/';
    const message = `🌐 *Global Intercessors Web App*\n\nOpen the app:\n${url}`;
    await this.sendWhatsAppMessage(phoneNumber, message);
    await this.logInteraction(phoneNumber, 'button_action', 'gi_app');
  }

  private async handleSettingsCommand(phoneNumber: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'command', 'settings');

    const { data: user } = await supabase
      .from('whatsapp_bot_users')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .single();

    if (user) {
      const devotionalStatus = user.devotional_enabled ? '✅ ON' : '❌ OFF';
      const remindersStatus = user.reminders_enabled ? '✅ ON' : '❌ OFF';
      const updatesStatus = user.updates_enabled ? '✅ ON' : '❌ OFF';
      const optedInStatus = (user.opted_in && user.is_active) ? '✅ Subscribed' : '❌ Not subscribed';

      const settingsMessage = `⚙️ *Your Message Preferences* ⚙️

📊 *Status:* ${optedInStatus}

📖 *Daily Devotionals:* ${devotionalStatus}
🔔 *Prayer Reminders:* ${remindersStatus}
📢 *Admin Updates:* ${updatesStatus}

*To change:*
• Reply *DEVOTIONAL OFF* or *DEVOTIONAL ON*
• Reply *REMINDERS OFF* or *REMINDERS ON*
• Reply *UPDATES OFF* or *UPDATES ON*
• Reply *STOP* to unsubscribe from all

*Global Intercessors - Standing in the Gap* 🙏`;

      await this.sendWhatsAppMessage(phoneNumber, settingsMessage);
    } else {
      // User doesn't exist, create them with default settings
      await supabase
        .from('whatsapp_bot_users')
        .insert({
          whatsapp_number: phoneNumber,
          user_id: `whatsapp_${phoneNumber}`,
          is_active: true,
          opted_in: true,
          opt_in_timestamp: new Date().toISOString(),
          devotional_enabled: true,
          reminders_enabled: true,
          updates_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      const welcomeMessage = `⚙️ *Welcome! Your Preferences Set Up* ⚙️

📊 *Status:* ✅ Subscribed

📖 *Daily Devotionals:* ✅ ON
🔔 *Prayer Reminders:* ✅ ON
📢 *Admin Updates:* ✅ ON

*To change:*
• Reply *DEVOTIONAL OFF* or *DEVOTIONAL ON*
• Reply *REMINDERS OFF* or *REMINDERS ON*
• Reply *UPDATES OFF* or *UPDATES ON*
• Reply *STOP* to unsubscribe from all

*Global Intercessors - Standing in the Gap* 🙏`;

      await this.sendWhatsAppMessage(phoneNumber, welcomeMessage);
    }
  }

  private async handleAbout(phoneNumber: string, userName: string): Promise<void> {
    const aboutMessage = `ℹ️ *About Global Intercessors Bot* ℹ️\n\n` +
`Hello ${userName}! This WhatsApp bot is your personal prayer companion, designed to help you stay consistent and strong in intercession.\n\n` +
`💠 *What the Bot Does*\n` +
`• 📖 Provides AI-powered daily devotionals and insights\n` +
`• ⏰ Sends smart reminders for your prayer slots\n` +
`• 📚 Offers ScriptureCoach tools for learning and memorization\n` +
`• 🌍 Shares global prayer updates and declarations\n\n` +
`🙏 *About Global Intercessors*\n` +
`We are a worldwide prayer movement committed to 24/7 prayer coverage across nations. Intercessors from around the world stand together in continuous prayer for revival, transformation, and God's Kingdom purposes.\n\n` +
`"The effective, fervent prayer of the righteous man avails much." — James 5:16`;

    await this.sendWhatsAppMessage(phoneNumber, aboutMessage);
    await this.logInteraction(phoneNumber, 'button_action', 'about');
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

  // Generate Today's Word using Gemini (preferred) with DeepSeek fallback
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

      // Prefer Gemini for more variety and uniqueness
      const content = await this.generateAIContentDevotional(prompt);

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

  // Generate Daily Declarations using Gemini (preferred) with DeepSeek fallback
  private async generateDailyDeclarations(phoneNumber: string, userName: string): Promise<void> {
    try {
      // Add timestamp and variety for unique content
      const timestamp = Date.now();
      const focusThemes = ['Kingdom Authority', 'Spiritual Breakthrough', 'Divine Favor', 'Prayer Power', 'Victorious Living', 'Supernatural Strength', 'Heavenly Wisdom', 'Revival Fire', 'Prophetic Authority', 'Divine Protection'];
      const randomFocus = focusThemes[Math.floor(Math.random() * focusThemes.length)];

      // Ask for fewer, tighter declarations to keep message size small
      const prompt = `Generate 5 powerful daily declarations for Christian intercessors (ID: ${timestamp}) with focus on "${randomFocus}".
Keep it very concise and optimized for WhatsApp. HARD LENGTH LIMITS:
- Each declaration line <= 120 characters total
- Verse snippet <= 12 words (or provide reference only)
- Total output <= 1100 characters

Structure:

**Focus:** [Theme related to "${randomFocus}"]

1️⃣ I DECLARE: [Short, specific statement]
📖 [Book Chapter:Verse] - "[very short verse snippet (<= 12 words)]" OR just [Book Chapter:Verse]

2️⃣ I DECLARE: [Short statement]
📖 [Reference OR very short snippet]

3️⃣ I DECLARE: [Short statement]
📖 [Reference OR very short snippet]

4️⃣ I DECLARE: [Short statement]
📖 [Reference OR very short snippet]

5️⃣ I DECLARE: [Short statement]
📖 [Reference OR very short snippet]

Make each declaration powerful and unique. If output exceeds limits, shorten further.`;

      const content = await this.generateAIContentDevotional(prompt);

      const firstName = userName.split(' ')[0];
      const declarationsMessage = `🔥 *Daily Declarations* 🔥

*${firstName}, speak these over your life:*

${content}

💪 *Declare with bold faith!*

*"Let the redeemed SAY SO!" - Psalm 107:2*`;

      // If message is too long for an interactive body, chunk into multiple text messages and then send a small interactive menu
      const MAX_LEN = 1400; // conservative limit for interactive body
      if (declarationsMessage.length > MAX_LEN) {
        console.log(`⚠️ Declarations too long (${declarationsMessage.length}), chunking into parts`);
        const header = `🔥 Daily Declarations 🔥\n\n${firstName}, speak these over your life:\n\n`;
        const footer = `\n\n💪 Declare with bold faith!\n\n"Let the redeemed SAY SO!" - Psalm 107:2`;

        // Split on blank lines to keep declarations intact
        const blocks = content.split(/\n\s*\n/).filter(Boolean);
        const parts: string[] = [];
        let current = header;
        for (const b of blocks) {
          if ((current + b + '\n\n').length > 900) { // keep parts comfortably small
            parts.push(current.trim());
            current = b + '\n\n';
          } else {
            current += b + '\n\n';
          }
        }
        if (current.trim().length) parts.push((current + footer).trim());

        // Send parts as text messages
        for (let idx = 0; idx < parts.length; idx++) {
          const part = parts[idx];
          const label = parts.length > 1 ? ` (Part ${idx + 1}/${parts.length})` : '';
          const body = idx === parts.length - 1 ? part : part + `\n${label}`;
          await this.sendWhatsAppMessage(phoneNumber, body);
        }

        // Send a small interactive menu after the content
        await this.sendInteractiveMessage(phoneNumber, 'Select an option:', [
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
      console.error('Error details:', (error as Error).message || 'Unknown error');

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

  // Prefer Gemini for Devotions/Declarations; fallback to DeepSeek
  private async generateAIContentDevotional(prompt: string): Promise<string> {
    // Try Gemini first if available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const body = {
          contents: [
            {
              role: 'system',
              parts: [
                {
                  text:
                    'You are a Christian devotional writer for WhatsApp. Write concise, biblically grounded, inspiring content for prayer warriors. Avoid markdown symbols like ** or _; keep text clean. Keep under 1400 characters.'
                }
              ]
            },
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 800
          }
        } as any;

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (resp.ok) {
          const data: any = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && typeof text === 'string') return text;
          throw new Error('Gemini returned no text');
        } else {
          const t = await resp.text();
          throw new Error(`Gemini error ${resp.status}: ${t}`);
        }
      } catch (e) {
        console.error('❌ Gemini generation failed, falling back to DeepSeek:', e);
      }
    }

    // Fallback to DeepSeek
    return await this.generateAIContent(prompt);
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

📖 *"The effectual fervent prayer of the righteous man availeth much."* - James 5:17

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

  // Bible Quiz functionality removed - replaced with ScriptureCoach system

  private async handleReminderSettings(phoneNumber: string, userName: string, setting: string): Promise<void> {
    await this.logInteraction(phoneNumber, 'button_action', setting);

    let message = '';
    let timing = '30min';
    let minutes = 30;

    if (setting === 'reminder_30min') {
      timing = '30min';
      minutes = 30;
      message = `⏰ *30-Minute Reminders Set!* ⏰

Perfect choice, ${userName}!

✅ You'll receive prayer reminders 30 minutes before your slot
📱 Gentle notifications to prepare your heart
🙏 Time to transition into prayer mindset
⚔️ Spiritual preparation for powerful intercession`;
    } else if (setting === 'reminder_15min') {
      timing = '15min';
      minutes = 15;
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

    // Apply reminder timing via AdvancedReminderSystem against the user's active slot
    try {
      const userInfo = await this.getCompleteUserInfo(phoneNumber);
      if (setting === 'reminder_custom') {
        // For now, keep the informational message only for custom
      } else {
        const ok = await this.reminderSystem.updateReminderSettings(userInfo.userId, minutes);
        if (!ok) {
          message = `❌ Failed to update reminder settings. Please try again or use "remind ${minutes}".`;
        }
      }
    } catch (e) {
      message = `❌ Error updating reminder settings. Please try again.`;
    }

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
// Bible Quiz functionality removed - replaced with ScriptureCoach system
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
      { id: 'scripture_coach', title: '📚 ScriptureCoach' },
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

  // === ScriptureCoach Command Handlers ===
  // Ensure a ScriptureCoach user exists in the ScriptureCoach `users` table and return its id
  private async ensureScriptureCoachUser(waPhone: string, userName: string): Promise<string> {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('wa_id', waPhone)
      .single();

    if (existing?.id) return existing.id;

    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert({ wa_id: waPhone, username: userName || 'Intercessor', tz: 'Africa/Harare' })
      .select('id')
      .single();

    if (insertErr || !inserted?.id) {
      throw new Error(`Failed ensuring ScriptureCoach user: ${insertErr?.message || 'unknown'}`);
    }

    return inserted.id;
  }

  private async handleScriptureCoachCommand(phoneNumber: string, userName: string): Promise<void> {
    try {
      await this.ensureScriptureCoachUser(phoneNumber, userName);
      const { message, buttons } = await ScriptureCoachCommandsProduction.handleScriptureCoachMenu(phoneNumber, userName);
      await this.sendInteractiveMessage(phoneNumber, message, buttons);
    } catch (error) {
      console.error('Error handling ScriptureCoach command:', error);
      await this.sendWhatsAppMessage(phoneNumber, 
        `🚧 ${userName}, Scripture Coach is temporarily unavailable while we enhance your experience. Please try again in a moment!\n\n*"Be still, and know that I am God." - Psalm 46:10*`
      );
    }
  }

  // === ScriptureCoach Button Handlers ===

  private async handleScriptureCoachButton(phoneNumber: string, userName: string, buttonId: string): Promise<void> {
    try {
      const userInfo = await this.getCompleteUserInfo(phoneNumber);
      const scriptureCoachUserId = await this.ensureScriptureCoachUser(phoneNumber, userName);

      let result: { message: string; buttons: { id: string; title: string }[] };

      switch (buttonId) {
        case 'scripture_plan':
          result = await ScriptureCoachCommandsProduction.handleReadingPlans(phoneNumber, userName);
          break;
        case 'scripture_plan_retry':
          result = await ScriptureCoachCommandsProduction.handleReadingPlans(phoneNumber, userName);
          break;
        case 'scripture_progress':
          result = await ScriptureCoachCommandsProduction.handleProgressStats(scriptureCoachUserId, userName);
          break;
        case 'progress_retry':
          result = await ScriptureCoachCommandsProduction.handleProgressStats(scriptureCoachUserId, userName);
          break;
        case 'scripture_memorize':
          result = await ScriptureCoachCommands.handleMemorizationMenu(phoneNumber, userName);
          break;
        case 'scripture_quiz':
          result = await ScriptureCoachCommands.handleMemoryQuizMenu(phoneNumber, userName);
          break;
        case 'scripture_review':
          result = await ScriptureCoachCommands.handleDailyReview(scriptureCoachUserId, userName);
          break;
        case 'scripture_more':
          result = await ScriptureCoachCommands.handleMoreOptions(phoneNumber, userName);
          break;
        case 'daily_review':
          result = await ScriptureCoachCommands.handleDailyReview(scriptureCoachUserId, userName);
          break;
        case 'get_hint':
          result = await ScriptureCoachCommands.handleGetHint(scriptureCoachUserId, userName);
          break;
        case 'verse_packs':
          result = await ScriptureCoachCommands.handleVersePacks(phoneNumber, userName);
          break;
        case 'create_memory_card':
          result = await ScriptureCoachCommands.handleCreateMemoryCard(scriptureCoachUserId, 'John 3:16', userName);
          break;
        case 'todays_reading':
          result = await ScriptureCoachCommandsProduction.handleTodaysReading(scriptureCoachUserId, userName);
          break;
        case 'todays_reading_retry':
          result = await ScriptureCoachCommandsProduction.handleTodaysReading(scriptureCoachUserId, userName);
          break;
        case 'mark_complete':
          result = await ScriptureCoachCommandsProduction.handleMarkComplete(scriptureCoachUserId, userName);
          break;
        case 'mark_complete_retry':
          result = await ScriptureCoachCommandsProduction.handleMarkComplete(scriptureCoachUserId, userName);
          break;
        case 'get_reflection':
          result = await ScriptureCoachCommands.handleGetReflection(scriptureCoachUserId, userName);
          break;
        case 'back':
          result = await ScriptureCoachCommandsProduction.handleScriptureCoachMenu(phoneNumber, userName);
          break;
        case 'help':
          result = await ScriptureCoachCommandsProduction.handleScriptureCoachHelp(phoneNumber, userName);
          break;
        default:
          // Handle plan selection (e.g., plan_123)
          if (buttonId.startsWith('plan_')) {
            const planId = buttonId.replace('plan_', '').replace('_retry', '');
            result = await ScriptureCoachCommandsProduction.handleStartReadingPlan(scriptureCoachUserId, planId, userName);
          } else {
            result = await ScriptureCoachCommandsProduction.handleScriptureCoachHelp(phoneNumber, userName);
          }
      }

      await this.sendInteractiveMessage(phoneNumber, result.message, result.buttons);
    } catch (error) {
      console.error('Error handling ScriptureCoach button:', error);
      await this.sendWhatsAppMessage(phoneNumber, 
        `❌ Sorry ${userName}, I encountered an error. Please try again.`
      );
    }
  }

  // Bible Quiz functionality removed - replaced with ScriptureCoach system

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
          await this.sendWhatsAppMessage(phoneNumber, `🔕 *Reminders Disabled*\n\n✅ You will no longer receive prayer slot reminders.\n\n🔔 To re-enable, use: *remind [minutes]*\nExample: "remind 30"\n\n💡 You'll still receive daily morning messages with verses.`);
        } else {
          await this.sendWhatsAppMessage(phoneNumber, `❌ Failed to disable reminders. Please try again.`);
        }
        return;
      }

      // Handle "remind [minutes]" command
      const minutes = parseInt(parts[1]);
      if (isNaN(minutes) || minutes < 5 || minutes > 120) {
        await this.sendWhatsAppMessage(phoneNumber, `❌ Invalid reminder time: ${parts[1]}\n\n✅ Please specify 5-120 minutes\n\n🔔 *Examples:*\n• "remind 15" - 15 minutes before\n• "remind 30" - 30 minutes before\n• "remind 60" - 1 hour before\n• "remind off" - disable reminders`);
        return;
      }

      const success = await this.reminderSystem.updateReminderSettings(userData.userId, minutes);
      if (success) {
        await this.sendWhatsAppMessage(phoneNumber, `🔔 *Reminder Settings Updated!*\n\n⏰ *New Setting:* ${minutes} minutes before your slot\n\n📋 *What happens next:*\n• You'll receive a reminder ${minutes} minutes before your prayer slot\n• Daily morning messages will continue at 6:00 AM\n• Professional preparation tips included\n\n🛠️ *Change anytime:*\n• "remind [5-120]" - adjust timing\n• "remind off" - disable reminders\n\n_Standing strong in intercession! 💪_`);
      } else {
        await this.sendWhatsAppMessage(phoneNumber, `❌ Failed to update reminder settings. Please try again.`);
      }

    } catch (error) {
      console.error('❌ Error handling reminder command:', error);
      await this.sendMessage(phoneNumber, `❌ An error occurred updating your reminder settings. Please try again.`);
    }
  }

  // Helper to send messages, used by reminder system
  public async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    return await this.sendWhatsAppMessage(phoneNumber, message);
  }
}

// Export singleton instance
export const whatsAppBot = new WhatsAppPrayerBot();