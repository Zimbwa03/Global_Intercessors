
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notificationService';

export function NotificationSetup() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check current notification permission
    setNotificationPermission(Notification.permission);
  }, []);

  const handleEnableNotifications = async () => {
    setIsInitializing(true);
    
    try {
      const token = await notificationService.initialize();
      
      if (token) {
        setFcmToken(token);
        setNotificationPermission('granted');
        toast({
          title: "Notifications Enabled",
          description: "You'll receive reminders for your prayer slots!"
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { text: 'Enabled', color: 'bg-green-100 text-green-700' };
      case 'denied':
        return { text: 'Blocked', color: 'bg-red-100 text-red-700' };
      default:
        return { text: 'Not Set', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  const status = getPermissionStatus();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-bell text-brand-primary"></i>
              Prayer Slot Notifications
            </CardTitle>
            <CardDescription>
              Get reminded before your assigned prayer slots
            </CardDescription>
          </div>
          <Badge className={status.color}>
            {status.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {notificationPermission === 'granted' ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <i className="fas fa-check-circle"></i>
              <span className="font-medium">Notifications are enabled</span>
            </div>
            <div className="text-sm text-gray-600">
              <p>You'll receive notifications:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>30 minutes before your prayer slot</li>
                <li>15 minutes before your prayer slot</li>
              </ul>
            </div>
            {fcmToken && (
              <div className="text-xs text-gray-500 break-all">
                <strong>FCM Token:</strong> {fcmToken.substring(0, 50)}...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Enable notifications to receive reminders for your prayer slots.</p>
            </div>
            <Button
              onClick={handleEnableNotifications}
              disabled={isInitializing || notificationPermission === 'denied'}
              className="w-full bg-brand-primary hover:bg-blue-700"
            >
              {isInitializing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Setting up notifications...
                </>
              ) : (
                <>
                  <i className="fas fa-bell mr-2"></i>
                  Enable Notifications
                </>
              )}
            </Button>
            {notificationPermission === 'denied' && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <p className="font-medium">Notifications are blocked</p>
                <p>Please enable notifications in your browser settings and refresh the page.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
