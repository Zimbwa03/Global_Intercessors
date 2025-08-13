# WhatsApp Business API Webhook Configuration

## Webhook URL
**Primary Webhook URL:** `https://GlobalIntercession.replit.app/webhook`

## Configuration Steps

### 1. WhatsApp Business API Setup
Configure your WhatsApp Business API with the following webhook URL:
```
https://GlobalIntercession.replit.app/webhook
```

### 2. Webhook Verification
The webhook endpoint supports GET requests for verification with these parameters:
- `hub.mode` - Should be "subscribe"
- `hub.verify_token` - Must match your WHATSAPP_VERIFY_TOKEN environment variable
- `hub.challenge` - WhatsApp challenge code that gets returned for verification

### 3. Environment Variables Required
Make sure these environment variables are configured:
```
WHATSAPP_VERIFY_TOKEN=your_verification_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### 4. Supported Features
The webhook handles:
- ✅ Incoming text messages
- ✅ Button interactions 
- ✅ User authentication
- ✅ Bible Quiz with Gemini AI
- ✅ Daily devotionals
- ✅ Prayer reminders
- ✅ Attendance tracking

### 5. Testing Webhook
To test the webhook configuration:
1. Send a message to your WhatsApp Business number
2. Check the server logs for incoming message processing
3. Verify bot responses are working correctly

### 6. Webhook Events Processed
- **messages** - Text messages from users
- **message_reads** - Message read receipts  
- **postbacks** - Button click events
- **messaging_handovers** - Handover events

## Implementation Details

### GET /webhook (Verification)
```typescript
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

### POST /webhook (Message Processing)
```typescript
app.post('/webhook', async (req: Request, res: Response) => {
  // Processes incoming WhatsApp messages
  // Handles user authentication
  // Routes to appropriate bot handlers
  // Returns 200 OK to acknowledge receipt
});
```

## Security Features
- Webhook verification token validation
- Request signature verification (if configured)
- User phone number validation against registered users
- Rate limiting protection
- Error handling and logging

## Status: ✅ READY FOR PRODUCTION
The webhook is configured and ready to receive WhatsApp messages at:
`https://GlobalIntercession.replit.app/webhook`