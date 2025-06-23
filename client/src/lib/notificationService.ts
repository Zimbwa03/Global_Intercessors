
import { requestNotificationPermission, onMessageListener } from './firebase';

export interface PrayerSlot {
  id: string;
  slotTime: string;
  status: string;
  userId: string;
}

class NotificationService {
  private fcmToken: string | null = null;
  private reminderTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    // Request permission and get FCM token
    this.fcmToken = await requestNotificationPermission();
    
    // Listen for foreground messages
    this.setupForegroundMessageListener();
    
    return this.fcmToken;
  }

  private setupForegroundMessageListener() {
    onMessageListener()
      .then((payload: any) => {
        console.log('Received foreground message:', payload);
        
        // Show browser notification for foreground messages
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            requireInteraction: true
          });
        }
      })
      .catch((err) => console.log('Failed to receive foreground message:', err));
  }

  scheduleSlotReminders(prayerSlot: PrayerSlot) {
    // Clear existing reminders for this slot
    this.clearSlotReminders(prayerSlot.id);

    if (prayerSlot.status !== 'active') {
      return; // Don't schedule reminders for inactive slots
    }

    const slotTime = this.parseSlotTime(prayerSlot.slotTime);
    if (!slotTime) return;

    const now = new Date();
    const today = new Date();
    today.setHours(slotTime.hours, slotTime.minutes, 0, 0);

    // If the slot time has passed today, schedule for tomorrow
    if (today.getTime() <= now.getTime()) {
      today.setDate(today.getDate() + 1);
    }

    // Schedule 30-minute reminder
    const thirtyMinBefore = new Date(today.getTime() - 30 * 60 * 1000);
    if (thirtyMinBefore.getTime() > now.getTime()) {
      const timeout30 = setTimeout(() => {
        this.showLocalNotification(
          'Prayer Slot Reminder',
          `Your prayer slot starts in 30 minutes (${prayerSlot.slotTime})`,
          'prayer-30min'
        );
      }, thirtyMinBefore.getTime() - now.getTime());
      
      this.reminderTimeouts.set(`${prayerSlot.id}-30min`, timeout30);
    }

    // Schedule 15-minute reminder
    const fifteenMinBefore = new Date(today.getTime() - 15 * 60 * 1000);
    if (fifteenMinBefore.getTime() > now.getTime()) {
      const timeout15 = setTimeout(() => {
        this.showLocalNotification(
          'Prayer Slot Reminder',
          `Your prayer slot starts in 15 minutes (${prayerSlot.slotTime})`,
          'prayer-15min'
        );
      }, fifteenMinBefore.getTime() - now.getTime());
      
      this.reminderTimeouts.set(`${prayerSlot.id}-15min`, timeout15);
    }

    console.log(`Scheduled reminders for prayer slot ${prayerSlot.slotTime}`);
  }

  private parseSlotTime(slotTime: string): { hours: number; minutes: number } | null {
    // Parse time format like "14:30–15:00" or "14:30-15:00"
    const match = slotTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10)
      };
    }
    return null;
  }

  private showLocalNotification(title: string, body: string, tag: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/generated-icon.png',
        badge: '/generated-icon.png',
        tag,
        requireInteraction: true,
        data: {
          url: '/dashboard'
        }
      });
    }
  }

  clearSlotReminders(slotId: string) {
    const timeout30 = this.reminderTimeouts.get(`${slotId}-30min`);
    const timeout15 = this.reminderTimeouts.get(`${slotId}-15min`);
    
    if (timeout30) {
      clearTimeout(timeout30);
      this.reminderTimeouts.delete(`${slotId}-30min`);
    }
    
    if (timeout15) {
      clearTimeout(timeout15);
      this.reminderTimeouts.delete(`${slotId}-15min`);
    }
  }

  getFCMToken() {
    return this.fcmToken;
  }

  isEnabled(): boolean {
    return Notification.permission === 'granted';
  }

  async showPrayerSlotStart(slotTime: string): Promise<void> {
    this.showLocalNotification(
      'Prayer Time Now',
      `Your prayer slot (${slotTime}) has started. Join your fellow intercessors in prayer.`,
      'prayer-start'
    );
  }

  async showMissedSlotNotification(slotTime: string, missedCount: number): Promise<void> {
    this.showLocalNotification(
      'Prayer Slot Missed',
      `You missed your prayer slot (${slotTime}). This is your ${missedCount} missed session.`,
      'missed-slot'
    );
  }

  async showUpdateNotification(title: string, description: string): Promise<void> {
    this.showLocalNotification(title, description, 'update');
  }

  async schedulePrayerNotifications(userSlots: Array<{ slotTime: string; isActive: boolean; id?: string }>): Promise<void> {
    // Clear all existing reminders
    this.reminderTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.reminderTimeouts.clear();

    // Schedule reminders for active slots
    for (const slot of userSlots.filter(s => s.isActive)) {
      // Convert to PrayerSlot format
      const prayerSlot: PrayerSlot = {
        id: slot.id || '',
        slotTime: slot.slotTime,
        status: 'active',
        userId: ''
      };
      this.scheduleSlotReminders(prayerSlot);
    }
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const notificationService = new NotificationService();
