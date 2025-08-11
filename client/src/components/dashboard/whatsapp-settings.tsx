import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, Calendar, Settings, Bell, CheckCircle, AlertCircle, Send, TestTube } from 'lucide-react';

interface WhatsAppSettings {
  isRegistered: boolean;
  whatsAppNumber: string;
  personalReminderTime: string;
  personalReminderDays: string;
  timezone: string;
}

interface WhatsAppStats {
  totalSent: number;
  sentToday: number;
  failedToday: number;
  activeUsers: number;
}

export function WhatsAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [personalReminderTime, setPersonalReminderTime] = useState('07:00');
  const [personalReminderDays, setPersonalReminderDays] = useState('Everyday');
  const [timezone, setTimezone] = useState('UTC');
  const [isRegistered, setIsRegistered] = useState(false);

  // Test message functionality
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [adminKey, setAdminKey] = useState('');

  // Fetch WhatsApp bot statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/whatsapp/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: WhatsAppStats };

  // Register WhatsApp user mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { userId: string; whatsAppNumber: string }) => {
      const response = await fetch('/api/whatsapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register for WhatsApp notifications');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsRegistered(true);
      const phoneNumber = data.whatsAppNumber; // Assuming the API returns the number
      toast({
        title: "WhatsApp Registered!",
        description: `Your number ${phoneNumber} has been successfully registered for prayer reminders.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/stats'] });
    },
    onError: (error: any) => { // Changed to 'any' to access potential message property
      const errorMessage = error?.message || "Failed to register WhatsApp number. Please check your phone number format and try again.";
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: {
      personalReminderTime?: string;
      personalReminderDays?: string;
      timezone?: string;
    }) => {
      const response = await fetch('/api/whatsapp/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          preferences,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your WhatsApp notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string; adminKey: string }) => {
      const response = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test message');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Message Sent",
        description: `Message sent successfully. ID: ${data.messageId?.substring(0, 20)}...`,
      });
      setTestMessage('');
      setTestPhoneNumber('');
    },
    onError: (error: Error) => {
      toast({
        title: "Test Message Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate WhatsApp user mutation
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/whatsapp/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate WhatsApp notifications');
      }

      return response.json();
    },
    onSuccess: () => {
      setIsRegistered(false);
      toast({
        title: "WhatsApp Notifications Disabled",
        description: "You will no longer receive WhatsApp notifications.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Deactivation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    if (!user?.id || !whatsAppNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your WhatsApp number.",
        variant: "destructive",
      });
      return;
    }

    // Clean and validate phone number
    const cleanNumber = whatsAppNumber.replace(/[^\d+]/g, '');
    if (cleanNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid WhatsApp phone number with country code.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      userId: user.id,
      whatsAppNumber: cleanNumber,
    });
  };

  const handleUpdatePreferences = () => {
    if (!isRegistered) return;

    updatePreferencesMutation.mutate({
      personalReminderTime,
      personalReminderDays,
      timezone,
    });
  };

  const handleDeactivate = () => {
    if (!user?.id) return;
    deactivateMutation.mutate();
  };

  const formatPhoneNumber = (number: string) => {
    // Simple formatting for display
    const cleaned = number.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+${cleaned}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <MessageSquare className="h-8 w-8 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Prayer Bot</h2>
          <p className="text-gray-600 dark:text-gray-300">Receive prayer reminders and daily devotionals via WhatsApp</p>
        </div>
      </div>

      {/* Statistics Card */}
      {stats && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Bot Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.sentToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sent Today</div>
              </div>
              <div className="text-2xl font-bold text-purple-600 text-center">
                <div>{stats.totalSent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failedToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>WhatsApp Configuration</span>
          </CardTitle>
          <CardDescription>
            Set up your WhatsApp number to receive automated prayer reminders and daily devotionals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isRegistered ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">WhatsApp Phone Number</Label>
                <Input
                  id="whatsapp-number"
                  type="tel"
                  placeholder="+1234567890"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  className="font-mono"
                />
                <p className="text-sm text-gray-500">
                  Include your country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>

              <Button 
                onClick={handleRegister}
                disabled={registerMutation.isPending || !whatsAppNumber.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {registerMutation.isPending ? 'Registering...' : 'Register for WhatsApp Notifications'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 dark:text-green-200">
                  WhatsApp notifications are active for {formatPhoneNumber(whatsAppNumber)}
                </span>
              </div>

              <Separator />

              {/* Personal Reminder Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Personal Reminder Settings</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-time">Reminder Time</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={personalReminderTime}
                      onChange={(e) => setPersonalReminderTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder-days">Days</Label>
                    <Select value={personalReminderDays} onValueChange={setPersonalReminderDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Everyday">Everyday</SelectItem>
                        <SelectItem value="Mon,Tue,Wed,Thu,Fri">Weekdays</SelectItem>
                        <SelectItem value="Sat,Sun">Weekends</SelectItem>
                        <SelectItem value="Mon">Monday</SelectItem>
                        <SelectItem value="Tue">Tuesday</SelectItem>
                        <SelectItem value="Wed">Wednesday</SelectItem>
                        <SelectItem value="Thu">Thursday</SelectItem>
                        <SelectItem value="Fri">Friday</SelectItem>
                        <SelectItem value="Sat">Saturday</SelectItem>
                        <SelectItem value="Sun">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                      <SelectItem value="Africa/Cairo">Cairo (EET)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleUpdatePreferences}
                  disabled={updatePreferencesMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {updatePreferencesMutation.isPending ? 'Updating...' : 'Update Preferences'}
                </Button>
              </div>

              <Separator />

              {/* Deactivation */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Deactivate WhatsApp notifications. You can re-register anytime.
                </p>
                <Button 
                  onClick={handleDeactivate}
                  disabled={deactivateMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate WhatsApp Notifications'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Information */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Bot Features</CardTitle>
          <CardDescription>What you'll receive through the prayer bot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Prayer Slot Reminders</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic reminders 1 hour and 30 minutes before your assigned prayer slots
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Daily Devotionals</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-powered morning devotions and Bible verses delivered at 6:00 AM
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Administrative Updates</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Important announcements from Global Intercessors, automatically summarized
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Personal Reminders</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Custom prayer reminders at times you choose, acting like a spiritual alarm clock
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}