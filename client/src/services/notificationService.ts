// Notification Service for Global Intercessors
class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

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

      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service worker registered successfully');

      this.setupMessageListener();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
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
      `Prayer Time Now`,
      {
        body: `Your prayer slot (${slotTime}) has started. Join your fellow intercessors in prayer.`,
        tag: 'prayer-start',
        data: { type: 'prayer-start', slotTime },
        actions: [
          { action: 'join', title: 'Join Prayer' },
          { action: 'mark-absent', title: 'Cannot Join' }
        ]
      }
    );
  }

  async showUpdateNotification(title: string, message: string, priority: 'normal' | 'high' | 'urgent' = 'normal'): Promise<void> {
    const icons = {
      normal: 'Announcement',
      high: 'Important Update',
      urgent: 'Urgent Notice'
    };

    await this.showNotification(
      `${icons[priority]}: ${title}`,
      {
        body: message,
        tag: 'update-notification',
        data: { type: 'update', priority },
        requireInteraction: priority === 'urgent'
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

  async schedulePrayerNotifications(userSlots: Array<{ slotTime: string; isActive: boolean }>): Promise<void> {
    if (!this.isInitialized) return;

    await this.clearScheduledNotifications();

    for (const slot of userSlots.filter(s => s.isActive)) {
      await this.scheduleSlotNotifications(slot.slotTime);
    }
  }

  private async scheduleSlotNotifications(slotTime: string): Promise<void> {
    const [startTime] = slotTime.split('–');
    const [hours, minutes] = startTime.split(':').map(Number);

    const now = new Date();
    const slotDate = new Date();
    slotDate.setHours(hours, minutes, 0, 0);

    if (slotDate <= now) {
      slotDate.setDate(slotDate.getDate() + 1);
    }

    // 15-minute reminder
    const reminderTime = new Date(slotDate.getTime() - 15 * 60 * 1000);
    if (reminderTime > now) {
      setTimeout(() => {
        this.showPrayerSlotReminder(slotTime, 15);
      }, reminderTime.getTime() - now.getTime());
    }

    // 5-minute reminder
    const closeReminderTime = new Date(slotDate.getTime() - 5 * 60 * 1000);
    if (closeReminderTime > now) {
      setTimeout(() => {
        this.showPrayerSlotReminder(slotTime, 5);
      }, closeReminderTime.getTime() - now.getTime());
    }

    // Start notification
    if (slotDate > now) {
      setTimeout(() => {
        this.showPrayerSlotStart(slotTime);
      }, slotDate.getTime() - now.getTime());
    }
  }

  private async clearScheduledNotifications(): Promise<void> {
    // Clear existing notifications
  }

  isEnabled(): boolean {
    return this.isInitialized && Notification.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const notificationService = NotificationService.getInstance();