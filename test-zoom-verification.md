
# Zoom Attendance Tracking Verification Checklist

## 1. Test Zoom API Connection
- Admin Panel → Management → "Test Zoom Connection"
- Should show: ✅ Success with user info and meetings data
- Should NOT show: ❌ Scope errors

## 2. Check Attendance Debug Data
- Admin Panel → Data Export → "Debug Attendance"
- Should show: Real attendance records, prayer slots, zoom meetings

## 3. Test Manual Attendance Logging
- Admin Panel → Management → "Log Manual Attendance"
- Enter a user ID from your prayer slots
- Should create attendance record immediately

## 4. Monitor Live Meetings
- When you have an active Zoom meeting
- Check Admin Panel → Analytics
- Should show real-time participant tracking

## 5. Generate Test Data (if needed)
- Admin Panel → Management → "Generate Test Attendance"
- Creates sample data for visualization

## Expected Results:
- ✅ Zoom API connects successfully
- ✅ Meeting data is retrieved
- ✅ Attendance records are created
- ✅ Analytics show real data
- ✅ Live meeting detection works
