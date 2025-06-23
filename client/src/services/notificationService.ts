import { requestNotificationPermission, onMessageListener } from "@/lib/firebase";

// Notification Service for Global Intercessors
class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;
  private reminderTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private fcmToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return false;
      }

      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Get FCM token
      this.fcmToken = await requestNotificationPermission();
      
      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service worker registered successfully');

      this.setupMessageListener();
      this.isInitialized = true;
      
      // Store FCM token on server if available
      if (this.fcmToken) {
        await this.storeFCMToken(this.fcmToken);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async storeFCMToken(token: string): Promise<void> {
    try {
      const response = await fetch('/api/users/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: token }),
      });
      
      if (response.ok) {
        console.log('FCM token stored successfully');
      }
    } catch (error) {
      console.error('Failed to store FCM token:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  private setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_MESSAGE') {
          this.handleNotificationClick(event.data.notification);
        }
      });
    }

    // Setup foreground message listener
    onMessageListener()
      .then((payload: any) => {
        console.log('Received foreground message:', payload);
        
        // Show browser notification for foreground messages
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            requireInteraction: true
          });
        }
      })
      .catch((err) => console.log('Failed to receive foreground message:', err));
  }

  async showNotification(title: string, options: NotificationOptions & { 
    tag?: string;
    data?: any;
    actions?: Array<{ action: string; title: string; icon?: string }>;
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (Notification.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      requireInteraction: true,
      ...options
    };

    try {
      if (this.registration) {
        await this.registration.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async showPrayerSlotReminder(slotTime: string, minutesToGo: number): Promise<void> {
    await this.showNotification(
      `Prayer Time Approaching`,
      {
        body: `Your prayer slot (${slotTime}) starts in ${minutesToGo} minutes. Prepare your heart for intercession.`,
        tag: 'prayer-reminder',
        data: { type: 'prayer-reminder', slotTime },
        actions: [
          { action: 'join', title: 'Join Now' },
          { action: 'skip', title: 'Skip This Time' }
        ]
      }
    );
  }

  async showPrayerSlotStart(slotTime: string): Promise<void> {
    await this.showNotification(
      `Prayer Time Has Begun`,
      {
        body: `Your prayer slot (${slotTime}) has started. Join the global prayer coverage now!`,
        tag: 'prayer-start',
        data: { type: 'prayer-start', slotTime },
        actions: [
          { action: 'join', title: 'Join Prayer' },
          { action: 'view', title: 'View Dashboard' }
        ]
      }
    );
  }

  async showMissedSlotNotification(slotTime: string, missedCount: number): Promise<void> {
    await this.showNotification(
      `Prayer Slot Missed`,
      {
        body: `You missed your prayer slot (${slotTime}). This is your ${missedCount} missed session. Your slot may be reassigned after 3 missed sessions.`,
        tag: 'missed-slot',
        data: { type: 'missed-slot', slotTime, missedCount },
        actions: [
          { action: 'request-makeup', title: 'Request Makeup' },
          { action: 'skip-request', title: 'Request Skip' }
        ]
      }
    );
  }

  async showUpdateNotification(title: string, description: string): Promise<void> {
    await this.showNotification(
      title,
      {
        body: description,
        tag: 'update',
        data: { type: 'update' },
        actions: [
          { action: 'view', title: 'View Updates' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      }
    );
  }

  // Schedule prayer slot reminders
  schedulePrayerSlotReminders(prayerSlot: any): void {
    // Clear existing reminders for this slot
    this.clearSlotReminders(prayerSlot.id?.toString() || '');

    if (prayerSlot.status !== 'active') {
      return; // Don't schedule reminders for inactive slots
    }

    const slotTime = this.parseSlotTime(prayerSlot.slotTime || prayerSlot.slot_time);
    if (!slotTime) return;

    const now = new Date();
    const today = new Date();
    today.setHours(slotTime.hours, slotTime.minutes, 0, 0);

    // If the slot time has passed today, schedule for tomorrow
    if (today.getTime() <= now.getTime()) {
      today.setDate(today.getDate() + 1);
    }

    // Schedule 15-minute reminder
    const fifteenMinBefore = new Date(today.getTime() - 15 * 60 * 1000);
    if (fifteenMinBefore.getTime() > now.getTime()) {
      const timeout15 = setTimeout(() => {
        this.showPrayerSlotReminder(prayerSlot.slotTime || prayerSlot.slot_time, 15);
      }, fifteenMinBefore.getTime() - now.getTime());
      
      this.reminderTimeouts.set(`${prayerSlot.id}-15min`, timeout15);
    }

    // Schedule 5-minute reminder
    const fiveMinBefore = new Date(today.getTime() - 5 * 60 * 1000);
    if (fiveMinBefore.getTime() > now.getTime()) {
      const timeout5 = setTimeout(() => {
        this.showPrayerSlotReminder(prayerSlot.slotTime || prayerSlot.slot_time, 5);
      }, fiveMinBefore.getTime() - now.getTime());
      
      this.reminderTimeouts.set(`${prayerSlot.id}-5min`, timeout5);
    }

    // Schedule start notification
    if (today.getTime() > now.getTime()) {
      const timeoutStart = setTimeout(() => {
        this.showPrayerSlotStart(prayerSlot.slotTime || prayerSlot.slot_time);
      }, today.getTime() - now.getTime());
      
      this.reminderTimeouts.set(`${prayerSlot.id}-start`, timeoutStart);
    }

    console.log(`Scheduled reminders for prayer slot ${prayerSlot.slotTime || prayerSlot.slot_time}`);
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

  clearSlotReminders(slotId: string): void {
    const reminderKeys = [`${slotId}-15min`, `${slotId}-5min`, `${slotId}-start`];
    
    reminderKeys.forEach(key => {
      const timeout = this.reminderTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.reminderTimeouts.delete(key);
      }
    });
  }

  private handleNotificationClick(notification: any): void {
    console.log('Notification clicked:', notification);
    
    switch (notification.data?.type) {
      case 'prayer-reminder':
      case 'prayer-start':
        window.location.hash = '#/dashboard?tab=prayer-slot';
        break;
      case 'update':
        window.location.hash = '#/dashboard?tab=updates';
        break;
      case 'missed-slot':
        window.location.hash = '#/dashboard?tab=prayer-slot';
        break;
    }
  }

  async schedulePrayerNotifications(userSlots: Array<{ slotTime: string; isActive: boolean; id?: string }>): Promise<void> {
    if (!this.isInitialized) return;

    // Clear all existing reminders
    this.reminderTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.reminderTimeouts.clear();

    // Schedule reminders for active slots
    for (const slot of userSlots.filter(s => s.isActive)) {
      this.schedulePrayerSlotReminders(slot);
    }
  }

  isEnabled(): boolean {
    return this.isInitialized && Notification.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  getFCMToken(): string | null {
    return this.fcmToken;
  }
}

export const notificationService = NotificationService.getInstance();