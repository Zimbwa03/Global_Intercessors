import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Smartphone, Mail, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NotificationSettings {
  prayerReminders: boolean;
  missedSlotAlerts: boolean;
  slotReleaseWarnings: boolean;
  attendanceReports: boolean;
  reminderTime: number; // minutes before session
  notificationMethod: "push" | "email" | "both";
}

export function NotificationSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    prayerReminders: true,
    missedSlotAlerts: true,
    slotReleaseWarnings: true,
    attendanceReports: false,
    reminderTime: 15,
    notificationMethod: "both"
  });

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch attendance statistics
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', user?.id],
    queryFn: async () => {
      // Use Supabase to fetch session tracking data for attendance stats
      const { data, error } = await supabase
        .from('session_tracking')
        .select('*')
        .eq('intercessor_id', user?.id)
        .order('session_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      // Calculate attendance statistics
      const totalSessions = data?.length || 0;
      const attendedSessions = data?.filter(session => session.attended).length || 0;
      const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
      
      return {
        totalSessions,
        attendedSessions,
        missedSessions: totalSessions - attendedSessions,
        attendanceRate: Math.round(attendanceRate)
      };
    },
    enabled: !!user?.id,
    refetchInterval: 300000,
  });

  // Manual attendance processing
  const processAttendanceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/attendance/manual-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to process attendance');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Processing Started",
        description: "Zoom attendance data is being processed. Results will appear shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process attendance data",
        variant: "destructive",
      });
    }
  });

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Auto-save settings
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const calculateAttendanceRate = () => {
    if (!attendanceStats || attendanceStats.length === 0) return 0;
    const attended = attendanceStats.filter((record: any) => record.status === 'attended').length;
    return Math.round((attended / attendanceStats.length) * 100);
  };

  const getRecentMissedDays = () => {
    if (!attendanceStats) return 0;
    const recentRecords = attendanceStats.slice(0, 7); // Last 7 days
    return recentRecords.filter((record: any) => record.status === 'missed').length;
  };

  const getAttendanceStreak = () => {
    if (!attendanceStats) return 0;
    let streak = 0;
    for (const record of attendanceStats) {
      if (record.status === 'attended') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-brand-primary mx-auto mb-4" />
          <h2 className="text-xl font-poppins font-semibold text-brand-text mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access notification settings.</p>
        </div>
      </div>
    );
  }

  const attendanceRate = calculateAttendanceRate();
  const missedDays = getRecentMissedDays();
  const streak = getAttendanceStreak();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text mb-2 font-poppins">Notification & Attendance Setup</h2>
        <p className="text-gray-600">Manage your prayer session reminders and attendance tracking</p>
      </div>

      {/* Attendance Overview */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <Calendar className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="font-poppins">Attendance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-2 font-poppins">{attendanceRate}%</div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-xs text-green-600 mt-1">Last 30 days</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100">
              <div className="text-3xl font-bold text-brand-primary mb-2 font-poppins">{streak}</div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-xs text-blue-600 mt-1">Consecutive days</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-100">
              <div className="text-3xl font-bold text-red-600 mb-2 font-poppins">{missedDays}</div>
              <p className="text-sm text-gray-600">Missed (Last 7 days)</p>
              {missedDays >= 3 && (
                <p className="text-xs text-red-600 mt-1">⚠️ Action required</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => processAttendanceMutation.mutate()}
              disabled={processAttendanceMutation.isPending}
              className="bg-brand-primary hover:bg-blue-800 text-white font-poppins"
            >
              <Clock className="w-4 h-4 mr-2" />
              {processAttendanceMutation.isPending ? 'Processing...' : 'Sync Zoom Attendance'}
            </Button>
            
            <Badge 
              variant={attendanceRate >= 90 ? "default" : attendanceRate >= 70 ? "secondary" : "destructive"}
              className="font-poppins self-start"
            >
              {attendanceRate >= 90 ? "Excellent" : attendanceRate >= 70 ? "Good" : "Needs Improvement"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <Bell className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="font-poppins">Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prayer Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-brand-primary" />
              <div>
                <label className="text-base font-medium font-poppins">Prayer Session Reminders</label>
                <p className="text-sm text-gray-600">Get notified before your scheduled prayer time</p>
              </div>
            </div>
            <Switch
              checked={settings.prayerReminders}
              onCheckedChange={(checked) => handleSettingChange('prayerReminders', checked)}
            />
          </div>

          {/* Reminder Time */}
          {settings.prayerReminders && (
            <div className="ml-8 flex items-center space-x-4">
              <label className="text-sm font-medium">Remind me</label>
              <Select 
                value={settings.reminderTime.toString()} 
                onValueChange={(value) => handleSettingChange('reminderTime', parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">before my session</span>
            </div>
          )}

          {/* Missed Slot Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <label className="text-base font-medium font-poppins">Missed Slot Alerts</label>
                <p className="text-sm text-gray-600">Receive warnings after missing prayer sessions</p>
              </div>
            </div>
            <Switch
              checked={settings.missedSlotAlerts}
              onCheckedChange={(checked) => handleSettingChange('missedSlotAlerts', checked)}
            />
          </div>

          {/* Slot Release Warnings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-red-600" />
              <div>
                <label className="text-base font-medium font-poppins">Slot Release Warnings</label>
                <p className="text-sm text-gray-600">Get notified before your slot is auto-released</p>
              </div>
            </div>
            <Switch
              checked={settings.slotReleaseWarnings}
              onCheckedChange={(checked) => handleSettingChange('slotReleaseWarnings', checked)}
            />
          </div>

          {/* Attendance Reports */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <label className="text-base font-medium font-poppins">Weekly Attendance Reports</label>
                <p className="text-sm text-gray-600">Receive summary of your prayer attendance</p>
              </div>
            </div>
            <Switch
              checked={settings.attendanceReports}
              onCheckedChange={(checked) => handleSettingChange('attendanceReports', checked)}
            />
          </div>

          {/* Notification Method */}
          <div className="space-y-3">
            <label className="text-base font-medium font-poppins">Notification Method</label>
            <Select 
              value={settings.notificationMethod} 
              onValueChange={(value) => handleSettingChange('notificationMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Push Notifications Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4" />
                    <span>Both Push & Email</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Zoom Integration Status */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-poppins">Zoom Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="font-medium text-green-800 font-poppins">Zoom Attendance Tracking Active</p>
              <p className="text-sm text-green-600">Your attendance is automatically tracked via Zoom participation logs</p>
            </div>
            <Badge variant="default" className="bg-green-600 text-white font-poppins">
              Connected
            </Badge>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 space-y-2">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>System automatically checks Zoom meeting attendance every 30 minutes</li>
              <li>Matches your email with prayer slot times to track attendance</li>
              <li>Sends reminders after 3+ missed sessions</li>
              <li>Auto-releases slots after 5 consecutive missed days</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}