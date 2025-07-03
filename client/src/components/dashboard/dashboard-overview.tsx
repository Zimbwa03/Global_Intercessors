import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from "@/lib/supabase";
import { NotificationSetup } from './notification-setup';

interface DashboardOverviewProps {
  userEmail?: string;
}

// Get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "☀️" };
  return { text: "Good Evening", emoji: "🌙" };
};

// Extract username from email
const getUserName = (email: string) => {
  return email.split('@')[0];
};

export function DashboardOverview({ userEmail }: DashboardOverviewProps) {
  const { toast } = useToast();
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [nextSession, setNextSession] = useState({ hours: 2, minutes: 15, seconds: 30 });
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch user's attendance statistics
  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(`/api/attendance/${user.id}?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const attendanceData = await response.json();

      // Calculate sessions this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthSessions = attendanceData.filter((record: any) => {
        const recordDate = new Date(record.date || record.created_at);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear &&
               (record.attended || record.status === 'attended');
      }).length;

      // Calculate day streak
      let dayStreak = 0;
      const sortedAttendance = attendanceData
        .filter((record: any) => record.attended || record.status === 'attended')
        .sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());

      if (sortedAttendance.length > 0) {
        const today = new Date();
        let checkDate = new Date(today);

        for (const record of sortedAttendance) {
          const recordDate = new Date(record.date || record.created_at);
          const daysDiff = Math.floor((checkDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === dayStreak) {
            dayStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      return {
        sessionsThisMonth: thisMonthSessions,
        dayStreak: dayStreak
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch global intercessors count
  const { data: globalStats } = useQuery({
    queryKey: ['global-intercessors'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) throw new Error('Failed to fetch global stats');
      const analyticsData = await response.json();

      return {
        totalIntercessors: analyticsData.intercessorStats.totalRegistered
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch user's prayer slot with real-time updates
  const { data: prayerSlotResponse, refetch: refetchPrayerSlot } = useQuery({
    queryKey: ['prayer-slot', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/prayer-slot/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch prayer slot');
      const data = await response.json();
      console.log('Dashboard prayer slot response:', data);
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds (more frequent)
    refetchOnWindowFocus: true,
    staleTime: 0 // Always consider data stale
  });

  // Trigger a manual refetch when user changes
  useEffect(() => {
    if (user?.id) {
      refetchPrayerSlot();
    }
  }, [user?.id, refetchPrayerSlot]);

  const prayerSlot = prayerSlotResponse?.prayerSlot;

  useEffect(() => {
    // Load reminder preference from localStorage
    const savedReminders = localStorage.getItem('remindersEnabled');
    if (savedReminders) {
      setRemindersEnabled(JSON.parse(savedReminders));
    }
  }, []);

  // Calculate countdown to next prayer session based on actual slot time
  useEffect(() => {
    if (!prayerSlot?.slotTime || prayerSlot.status !== 'active') {
      setNextSession({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateNextSession = () => {
      const now = new Date();
      const [startTime] = prayerSlot.slotTime.split('–');
      const [hours, minutes] = startTime.split(':').map(Number);

      // Create next session time
      const nextSlot = new Date();
      nextSlot.setHours(hours, minutes, 0, 0);

      // If the time has passed today, set for tomorrow
      if (nextSlot <= now) {
        nextSlot.setDate(nextSlot.getDate() + 1);
      }

      const timeDiff = nextSlot.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setNextSession({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setNextSession({
        hours: Math.max(0, hoursLeft),
        minutes: Math.max(0, minutesLeft),
        seconds: Math.max(0, secondsLeft)
      });
    };

    calculateNextSession();
    const interval = setInterval(calculateNextSession, 1000);

    return () => clearInterval(interval);
  }, [prayerSlot?.slotTime, prayerSlot?.status]);

  const handleReminderToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    localStorage.setItem('remindersEnabled', JSON.stringify(enabled));
    toast({
      title: enabled ? "Reminders Enabled" : "Reminders Disabled",
      description: enabled 
        ? "You'll receive notifications for your prayer sessions"
        : "Prayer session reminders have been turned off"
    });
  };

  const handleRequestSkip = () => {
    //setPrayerSlot(prev => ({ ...prev, status: "On Leave" }));
    toast({
      title: "Skip Requested",
      description: "Your prayer slot has been marked as 'On Leave' for 5 days"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600";
      case "missed": return "text-red-600";
      case "skipped": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return "fas fa-check-circle";
      case "missed": return "fas fa-times-circle";
      case "skipped": return "fas fa-pause-circle";
      default: return "fas fa-circle";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="gradient-brand text-white rounded-2xl p-6 shadow-brand-lg">
        {userEmail ? (
          <>
            <h1 className="text-3xl font-bold mb-2 font-poppins">
              {getTimeBasedGreeting().text}, {getUserName(userEmail)}! {getTimeBasedGreeting().emoji}
            </h1>
            <p className="text-gi-primary/100">Ready for your prayer session today</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2 font-poppins">Welcome back!</h1>
            <p className="text-gi-primary/100">Loading your information...</p>
          </>
        )}
      </div>

      {/* Prayer Slot Card */}
      <Card className="shadow-brand-lg border border-gi-primary/100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <i className="fas fa-clock text-gi-gold text-sm"></i>
            </div>
            <span className="font-poppins">Your Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-gi-primary/100">
            <div className="flex items-center justify-between mb-3">
              <div>
                {prayerSlot ? (
                  <>
                    <h3 className="text-2xl font-bold text-gi-primary font-poppins">{prayerSlot.slotTime}</h3>
                    <div className="flex items-center mt-1">
                      <i className={`${getStatusIcon(prayerSlot?.status || 'inactive')} ${getStatusColor(prayerSlot?.status || 'inactive')} mr-2`}></i>
                      <span className={`font-semibold ${getStatusColor(prayerSlot?.status || 'inactive')} font-poppins`}>
                        {prayerSlot?.status ? prayerSlot.status.charAt(0).toUpperCase() + prayerSlot.status.slice(1) : 'No Status'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-gray-600">No prayer slot assigned</p>
                    <p className="text-sm text-gray-500 mt-1">Please select a slot in Prayer Slot Management</p>
                  </div>
                )}
              </div>
              {prayerSlot?.status === 'active' && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Next session in:</p>
                  <p className="text-lg font-bold text-gi-primary font-poppins">
                    {String(nextSession.hours).padStart(2, '0')}:
                    {String(nextSession.minutes).padStart(2, '0')}:
                    {String(nextSession.seconds).padStart(2, '0')}
                  </p>
                </div>
              )}
            </div>

            {prayerSlot?.status === "active" && (
              <Button 
                onClick={handleRequestSkip}
                variant="outline"
                className="w-full border-gi-primary/accent text-gi-gold hover:bg-gi-gold hover:text-gi-primary transition-brand font-poppins"
              >
                <i className="fas fa-pause mr-2"></i>
                Request Skip (5 days)
              </Button>
            )}
          </div>

          {/*missedDays > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                You've missed {missedDays} day(s). 
                {missedDays >= 4 && " Your slot will be auto-released after 5 missed days."}
              </p>
            </div>
          )*/}
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card className="shadow-brand-lg border border-gi-primary/100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <i className="fas fa-bell text-gi-gold text-sm"></i>
            </div>
            <span className="font-poppins">Reminder Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="reminders" className="text-base font-medium font-poppins">
                Prayer Session Reminders
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Get notified 15 minutes before your prayer session
              </p>
            </div>
            <Switch
              id="reminders"
              checked={remindersEnabled}
              onCheckedChange={handleReminderToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-brand-lg border border-gi-primary/100 hover:shadow-xl transition-brand group">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand group-hover:bg-gi-gold transition-brand">
                <i className="fas fa-calendar-check text-gi-gold group-hover:text-gi-primary transition-brand"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-text font-poppins">
                  {attendanceStats?.sessionsThisMonth ?? 0}
                </p>
                <p className="text-sm text-gray-600">Sessions This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-brand-lg border border-gi-primary/100 hover:shadow-xl transition-brand group">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand group-hover:bg-gi-gold transition-brand">
                <i className="fas fa-fire text-gi-gold group-hover:text-gi-primary transition-brand"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-text font-poppins">
                  {attendanceStats?.dayStreak ?? 0}
                </p>
                <p className="text-sm text-gray-600">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-brand-lg border border-gi-primary/100 hover:shadow-xl transition-brand group">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand group-hover:bg-gi-gold transition-brand">
                <i className="fas fa-users text-gi-gold group-hover:text-gi-primary transition-brand"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-text font-poppins">
                  {globalStats?.totalIntercessors ?? 0}
                </p>
                <p className="text-sm text-gray-600">Active Intercessors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}