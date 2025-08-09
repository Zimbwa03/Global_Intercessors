# WhatsApp Prayer Bot Setup Guide

## Overview

The WhatsApp Prayer Bot is a sophisticated automation system that sends personalized prayer reminders, daily devotionals, and administrative updates to Global Intercessors via WhatsApp. This guide covers the complete setup and configuration process.

## Prerequisites

1. **WhatsApp Business Account**: Required for WhatsApp Business API access
2. **Facebook Developer Account**: For accessing WhatsApp Business API
3. **Supabase Project**: Database for user management and message tracking
4. **AI API Access**: OpenAI, Gemini, or DeepSeek for content generation

## Environment Variables Required

Add these secrets to your Replit environment:

```bash
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_VERIFY_TOKEN=your_custom_verification_token

# Admin Security
ADMIN_SECRET_KEY=your_secure_admin_key

# AI API (use one of these)
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# Database (already configured)
DATABASE_URL=your_supabase_connection_string
```

## WhatsApp Business API Setup

### Step 1: Create WhatsApp Business Account

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app and select "Business" as the type
3. Add WhatsApp Business API product to your app

### Step 2: Get Phone Number ID

1. In your Facebook app dashboard, go to WhatsApp > API Setup
2. Copy the "Phone number ID" - this is your `WHATSAPP_PHONE_NUMBER_ID`

### Step 3: Generate Access Token

1. In the WhatsApp API Setup, generate a permanent access token
2. This token should have the following permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
3. Copy this token as your `WHATSAPP_ACCESS_TOKEN`

### Step 4: Configure Webhook

1. Set webhook URL to: `https://your-replit-domain.replit.app/api/whatsapp/webhook`
2. Set verify token to a secure string (save as `WHATSAPP_VERIFY_TOKEN`)
3. Subscribe to these webhook fields:
   - `messages`
   - `message_deliveries`
   - `message_reads`

## Database Setup

### Execute SQL Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of whatsapp-bot-schema.sql
-- This will create all necessary tables and security policies
```

### Verify Tables Created

Ensure these tables exist in your database:
- `whatsapp_bot_users`
- `whatsapp_messages`
- `daily_devotionals`

## AI API Configuration

### Option 1: Google Gemini (Recommended)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add as `GEMINI_API_KEY` environment variable

### Option 2: OpenAI

1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create an API key
3. Add as `OPENAI_API_KEY` environment variable

### Option 3: DeepSeek

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an API key
3. Add as `DEEPSEEK_API_KEY` environment variable

## Admin Configuration

1. Generate a secure admin key (minimum 32 characters)
2. Add as `ADMIN_SECRET_KEY` environment variable
3. Share this key only with authorized administrators

## Testing the Bot

### 1. Verify Server Startup

Check the console for these messages:
```
WhatsApp Prayer Bot scheduled jobs initialized
```

### 2. Test Registration

1. Navigate to WhatsApp Settings in the dashboard
2. Enter a valid WhatsApp number with country code
3. Register for notifications

### 3. Test Admin Functions

1. Access the admin panel (if implemented)
2. Use the admin key to send test messages
3. Verify message delivery in the dashboard

### 4. Test Webhook

Send a message to your WhatsApp Business number and verify webhook receives it.

## Bot Features

### Automated Features

1. **Daily Devotionals**: Sent at 6:00 AM daily
   - AI-generated inspirational content
   - Bible verses with references
   - Personalized with user's name

2. **Prayer Slot Reminders**: Automatic notifications
   - 1-hour before prayer slot
   - 30-minute before prayer slot
   - Personalized with slot time and user name

3. **Admin Updates**: Broadcast messaging
   - AI-summarized content for WhatsApp delivery
   - Sent to all active users
   - Includes Global Intercessors branding

### User Management

1. **Registration**: Users can register their WhatsApp numbers
2. **Preferences**: Custom reminder times and days
3. **Timezone Support**: Localized delivery times
4. **Deactivation**: Users can opt-out anytime

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` is correctly formatted
   - Check Supabase project status

2. **WhatsApp API Errors**
   - Verify phone number ID and access token
   - Check webhook verification
   - Ensure app is approved for production use

3. **Message Delivery Failures**
   - Check recipient phone number format
   - Verify WhatsApp Business account status
   - Review message template compliance

### Monitoring

1. **Message Statistics**: Track in admin dashboard
   - Total messages sent
   - Daily delivery count
   - Failed message count
   - Active user count

2. **Error Logging**: Check server console for errors
3. **Database Monitoring**: Review message logs in Supabase

## Security Considerations

1. **API Keys**: Store securely in Replit secrets
2. **Admin Access**: Limit admin key distribution
3. **User Data**: Protected by Supabase RLS policies
4. **Webhook Security**: Verify tokens on all requests

## Production Checklist

- [ ] WhatsApp Business Account verified and approved
- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] Webhook configured and verified
- [ ] AI API access confirmed
- [ ] Admin key secured
- [ ] Test messages successful
- [ ] Monitoring systems active
- [ ] Error handling tested
- [ ] User registration flow tested

## Support

For technical support:
1. Check server console logs
2. Review Supabase database logs
3. Verify WhatsApp API status
4. Test with minimal configuration first

## API Endpoints

### User Endpoints
- `POST /api/whatsapp/register` - Register user for notifications
- `POST /api/whatsapp/preferences` - Update user preferences
- `POST /api/whatsapp/deactivate` - Deactivate notifications

### Admin Endpoints
- `POST /api/whatsapp/broadcast` - Broadcast admin update
- `POST /api/whatsapp/test-devotional` - Send test devotional
- `GET /api/whatsapp/stats` - Get bot statistics

### Webhook Endpoints
- `GET /api/whatsapp/webhook` - Webhook verification
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages

## Schedule Information

- **Daily Devotionals**: 6:00 AM (user timezone or UTC)
- **Prayer Reminders**: 1 hour and 30 minutes before slots
- **Health Checks**: Every 5 minutes
- **Statistics Updates**: Real-time

This comprehensive setup enables the Global Intercessors platform to provide seamless WhatsApp integration for enhanced prayer community engagement.