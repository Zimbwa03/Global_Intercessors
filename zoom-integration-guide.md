# Zoom Integration Configuration Guide

## Required API Endpoints
Your Global Intercessors system makes these specific Zoom API calls:

1. **Get Past Meetings:**
   ```
   GET /v2/users/me/meetings?type=previous_meetings&from={date}&to={date}
   ```
   - Requires: `meeting:read:list_past_meetings` or `meeting:read:past_meeting`

2. **Get Meeting Participants:**
   ```
   GET /v2/past_meetings/{meetingUuid}/participants
   ```
   - Requires: `meeting:read:past_participant` or `meeting:read:participant`

## Complete Scope List Needed

Add these scopes to your Zoom App:

### Meeting Scopes:
- `meeting:read:list_meetings` ✅ (you have this)
- `meeting:read:list_meetings:admin` ✅ (you have this)
- `meeting:read:past_meeting` ❗ **MISSING - ADD THIS**
- `meeting:read:participant` ❗ **MISSING - ADD THIS**
- `meeting:read:past_participant` ❗ **MISSING - ADD THIS**

### User Scopes:
- `user:read:user` ❗ **MISSING - ADD THIS**

### Dashboard Scopes (Optional but Recommended):
- `dashboard_meetings:read:list_meetings`
- `meeting:read:meeting`

## App Configuration Steps

1. **Go to Zoom App Marketplace:**
   - Visit: https://marketplace.zoom.us/
   - Go to "Develop" → "Build App"
   - Select your existing Server-to-Server OAuth app

2. **Update Scopes:**
   - Navigate to "Scopes" tab
   - Add the missing scopes listed above
   - Click "Done"

3. **Activate App:**
   - Make sure your app status is "Published" or "Activated"
   - If it's in development, activate it for production use

## Environment Variables Setup

Once you have your credentials, set these in your system:

```env
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_API_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
```

## Testing Your Setup

The system includes diagnostic endpoints to test your configuration:

1. **Test Zoom Connection:**
   ```
   GET /api/admin/zoom/test
   ```

2. **Test Recent Meetings:**
   ```
   GET /api/admin/zoom/meetings
   ```

## Troubleshooting Common Issues

### Issue: "insufficient_scope" Error
**Solution:** Add the missing scopes listed above

### Issue: "invalid_client" Error  
**Solution:** 
- Verify Client ID and Client Secret are correct
- Ensure app is published/activated
- Check that you're using Server-to-Server OAuth (not JWT)

### Issue: No meetings found
**Possible causes:**
- Meeting history retention settings
- Wrong user account (meetings under different Zoom user)
- Date range issues
- App permissions

## How the Integration Works

1. **Every 5 minutes:** System fetches recent Zoom meetings
2. **For each meeting:** Gets participant list with join/leave times
3. **Attendance Matching:** Matches participants to prayer slots by:
   - Email address matching
   - Time slot overlap (±15 minutes flexibility)
4. **Database Update:** Records attendance and updates prayer slot stats
5. **Analytics:** Real-time dashboard shows attendance metrics

## Meeting Participant Matching Logic

The system matches Zoom participants to prayer slots using:
- **Email Matching:** Zoom participant email = User profile email
- **Time Matching:** Meeting time overlaps with prayer slot time (±15 min buffer)
- **Slot Status:** Only matches active prayer slots

Example: If John has slot "14:00-14:30" and joins Zoom meeting at 14:05, it counts as attended.


