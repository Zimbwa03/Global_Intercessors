import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, AlertCircle, CheckCircle2 } from "lucide-react";
import { notificationService } from "@/lib/notificationService";

interface NotificationSettings {
  prayerReminders: boolean;
  missedSlotAlerts: boolean;
  updateNotifications: boolean;
  reminderTime: number; // minutes before session
}

export function NotificationSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    prayerReminders: true,
    missedSlotAlerts: true,
    updateNotifications: true,
    reminderTime: 15
  });

  // Get current user and initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Initialize notification service
          const token = await notificationService.initialize();
          setFcmToken(token);
          setIsInitialized(true);
          setPermissionStatus(notificationService.getPermissionStatus());

          // Load user notification preferences
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('notification_preferences')
            .eq('id', user.id)
            .single();

          if (profile?.notification_preferences) {
            setSettings(profile.notification_preferences);
          }

          console.log('Notification service initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  const handlePermissionRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const token = await notificationService.initialize();
        setFcmToken(token);
        setIsInitialized(true);

        toast({
          title: "Notifications Enabled",
          description: "You'll now receive prayer slot reminders and updates.",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You won't receive prayer reminders. You can enable them later in browser settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to set up notifications. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (user) {
      try {
        // Save to database
        await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            notification_preferences: newSettings,
            updated_at: new Date().toISOString()
          });

        // Reschedule notifications if prayer reminders changed
        if (key === 'prayerReminders' && value) {
          await rescheduleNotifications();
        }

        toast({
          title: "Settings Updated",
          description: "Your notification preferences have been saved.",
        });
      } catch (error) {
        console.error('Error saving notification settings:', error);
        toast({
          title: "Error",
          description: "Failed to save notification settings.",
          variant: "destructive"
        });
      }
    }
  };

  const rescheduleNotifications = async () => {
    if (!user || !settings.prayerReminders) return;

    try {
      // Get user's current prayer slot
      const response = await fetch(`/api/prayer-slot/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.prayerSlot && data.prayerSlot.status === 'active') {
          notificationService.scheduleSlotReminders(data.prayerSlot);
          console.log('Prayer slot reminders rescheduled');
        }
      }
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  };

  const testNotification = async () => {
    if (permissionStatus !== 'granted') {
      toast({
        title: "Permission Required",
        description: "Please enable notifications first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a test notification using the browser's Notification API
      new Notification('Test Prayer Reminder', {
        body: 'Your prayer slot (14:30–15:00) starts in 5 minutes. This is a test notification.',
        icon: '/generated-icon.png',
        badge: '/generated-icon.png',
        tag: 'test-notification',
        requireInteraction: true
      });
      toast({
        title: "Test Notification Sent",
        description: "Check your browser notifications.",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification.",
        variant: "destructive"
      });
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Blocked</Badge>;
      default:
        return <Badge variant="secondary"><Bell className="w-3 h-3 mr-1" />Not Set</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="w-5 h-5 mr-2" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Browser Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Enable notifications to receive prayer reminders
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getPermissionBadge()}
              {permissionStatus !== 'granted' && (
                <Button onClick={handlePermissionRequest} size="sm">
                  Enable
                </Button>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          {permissionStatus === 'granted' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Prayer Slot Reminders</label>
                  <p className="text-sm text-muted-foreground">
                    Get notified 15 and 5 minutes before your prayer slot
                  </p>
                </div>
                <Switch
                  checked={settings.prayerReminders}
                  onCheckedChange={(checked) => handleSettingChange('prayerReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Missed Slot Alerts</label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you miss a prayer session
                  </p>
                </div>
                <Switch
                  checked={settings.missedSlotAlerts}
                  onCheckedChange={(checked) => handleSettingChange('missedSlotAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Update Notifications</label>
                  <p className="text-sm text-muted-foreground">
                    Receive important announcements and updates
                  </p>
                </div>
                <Switch
                  checked={settings.updateNotifications}
                  onCheckedChange={(checked) => handleSettingChange('updateNotifications', checked)}
                />
              </div>

              {/* Test Notification */}
              <div className="pt-4 border-t">
                <Button onClick={testNotification} variant="outline" size="sm">
                  Send Test Notification
                </Button>
              </div>
            </div>
          )}

          {/* Status Information */}
          <div className="text-xs text-muted-foreground space-y-1">
            {fcmToken && <p>FCM Token: {fcmToken.substring(0, 20)}...</p>}
            <p>Service Status: {isInitialized ? 'Initialized' : 'Not Initialized'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}