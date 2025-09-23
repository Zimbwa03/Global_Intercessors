# 📋 Quick Copy-Paste Code Snippets

## Just Copy These Into Your Components

---

## 🎯 **Method 1: Super Quick (2 lines per component)**

### **For Prayer Slot Component:**
```typescript
import { PresentationData } from '@/utils/frontend-zoom-data';

// Replace any zero values with:
const zoomData = PresentationData.zoom();
const participants = zoomData.participantCount; // Shows 42
const attendance = PresentationData.prayerSlot().attendanceRate; // Shows 89-98%
```

### **For Dashboard Stats:**
```typescript
import { PresentationData } from '@/utils/frontend-zoom-data';

// Replace stats with:
const stats = PresentationData.dashboard();
const totalUsers = stats.totalIntercessors; // Shows 247
const attendanceRate = stats.attendanceRate; // Shows 92.3%
```

### **For Analytics Charts:**
```typescript
import { PresentationData } from '@/utils/frontend-zoom-data';

// Replace chart data with:
const chartData = PresentationData.analytics();
const weeklyData = chartData.weeklyAttendance; // Shows weekly chart
const coverageData = chartData.slotCoverage; // Shows coverage bars
const geoData = chartData.geographicDistribution; // Shows pie chart
```

---

## 🎯 **Method 2: Direct Replacements (No imports needed)**

### **Replace Zero Values Directly:**

```typescript
// Instead of: {participantCount || 0}
// Use: {participantCount || 42}

// Instead of: {attendanceRate || '0%'}
// Use: {attendanceRate || '92.3%'}

// Instead of: {totalMeetings || 0}
// Use: {totalMeetings || 124}

// Instead of: {activeUsers || 0}
// Use: {activeUsers || 247}
```

### **For Empty Arrays:**
```typescript
// Instead of: {participants.length === 0 ? [] : participants}
// Use: {participants.length === 0 ? [
//   {name: 'Sarah Johnson', location: 'Cape Town', joinTime: '2 min ago'},
//   {name: 'John Mukasa', location: 'Kampala', joinTime: '5 min ago'},
//   {name: 'Mary Okonkwo', location: 'Lagos', joinTime: '8 min ago'}
// ] : participants}
```

---

## 🎯 **Method 3: Conditional Display**

### **Add This Pattern Anywhere:**
```typescript
const PRESENTATION_MODE = true; // Set to false after presentation

// Then use:
<div>Participants: {PRESENTATION_MODE ? 42 : (actualData || 0)}</div>
<div>Attendance: {PRESENTATION_MODE ? '92%' : (actualData || '0%')}</div>
<div>Meetings: {PRESENTATION_MODE ? 124 : (actualData || 0)}</div>
```

---

## 📊 **Specific Component Snippets**

### **Prayer Slot Management Panel:**
```typescript
// Add this to show Zoom participants
<div className="zoom-participants">
  <h4>Current Participants (42)</h4>
  <ul>
    <li>✅ Sarah Johnson - Cape Town (2 min ago)</li>
    <li>✅ John Mukasa - Kampala (5 min ago)</li>
    <li>✅ Mary Okonkwo - Lagos (8 min ago)</li>
    <li>✅ David Kimani - Nairobi (10 min ago)</li>
    <li>✅ 38 others in session</li>
  </ul>
</div>

// Add this for attendance stats
<div className="attendance-stats">
  <div>Attendance Rate: 92.3%</div>
  <div>Last Attended: Today at 14:00</div>
  <div>Missed Sessions: 1</div>
  <div>Average Duration: 45 min</div>
</div>
```

### **Admin Dashboard Overview:**
```typescript
// Replace your stats cards with:
<div className="stats-grid">
  <div className="stat-card">
    <h3>247</h3>
    <p>Total Intercessors</p>
  </div>
  <div className="stat-card">
    <h3>48</h3>
    <p>Active Prayer Slots</p>
  </div>
  <div className="stat-card">
    <h3>92.3%</h3>
    <p>Attendance Rate</p>
  </div>
  <div className="stat-card">
    <h3>42</h3>
    <p>Avg Zoom Participants</p>
  </div>
</div>
```

### **Analytics Charts:**
```typescript
// For Chart.js or similar:
const weeklyData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{
    label: 'Attended',
    data: [44, 42, 45, 43, 46, 44, 45],
    borderColor: 'rgb(75, 192, 192)',
    backgroundColor: 'rgba(75, 192, 192, 0.2)'
  }]
};

const coverageData = {
  labels: ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59', 
           '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'],
  datasets: [{
    label: 'Coverage %',
    data: [88, 85, 92, 95, 94, 96, 93, 91],
    backgroundColor: 'rgba(75, 192, 192, 0.6)'
  }]
};

const geoData = {
  labels: ['Africa', 'Americas', 'Europe', 'Asia', 'Oceania'],
  datasets: [{
    data: [87, 62, 49, 37, 12],
    backgroundColor: [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)'
    ]
  }]
};
```

### **Activity Feed:**
```typescript
// Add this activity feed:
<div className="activity-feed">
  <h3>Recent Activity</h3>
  <div className="activity-list">
    <div className="activity-item">
      🎥 <strong>Sarah Johnson</strong> joined Zoom prayer session
      <br><small>Cape Town, SA • 2 min ago</small>
    </div>
    <div className="activity-item">
      ✅ <strong>John Mukasa</strong> completed prayer slot
      <br><small>Kampala, UG • 5 min ago</small>
    </div>
    <div className="activity-item">
      🌅 <strong>Mary Okonkwo</strong> joined morning session
      <br><small>Lagos, NG • 10 min ago</small>
    </div>
    <div className="activity-item">
      🙏 <strong>42 others</strong> are in active prayer
      <br><small>Global • Just now</small>
    </div>
  </div>
</div>
```

---

## 🎯 **One-Line Fixes for Common Zeros**

```typescript
// Replace these common zero displays:
{participants || 42}                    // Instead of {participants || 0}
{attendance || '92.3%'}                 // Instead of {attendance || '0%'}
{meetings || 124}                       // Instead of {meetings || 0}
{users || 247}                          // Instead of {users || 0}
{duration || '45 min'}                  // Instead of {duration || '0 min'}
{coverage || '94%'}                     // Instead of {coverage || '0%'}
```

---

## 🔄 **After Presentation - Quick Disable**

```typescript
// Change this one line in frontend-zoom-data.ts:
export const PRESENTATION_MODE = false; // Was true
```

Or remove the import and function calls you added.

---

## ✅ **Test These Numbers**

Your app should now show:
- **42** Zoom participants
- **92.3%** Attendance rate  
- **247** Total intercessors
- **124** Zoom meetings
- **48** Active prayer slots

Perfect for your presentation! 🚀
