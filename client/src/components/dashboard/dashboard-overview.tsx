import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// Get user's first name from profile or fallback to email username
const getUserName = (userProfile: any, email?: string) => {
  if (userProfile?.fullName || userProfile?.full_name || userProfile?.name) {
    const fullName = userProfile.fullName || userProfile.full_name || userProfile.name;
    return fullName.split(' ')[0]; // Return first name
  }
  if (email) {
    return email.split('@')[0]; // Fallback to email username
  }
  return 'Intercessor';
};

export function DashboardOverview({ userEmail }: DashboardOverviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [nextSession, setNextSession] = useState({ hours: 2, minutes: 15, seconds: 30 });
  const [user, setUser] = useState<any>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Set up real-time subscription for prayer_slots updates on dashboard
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up dashboard real-time subscription...');
    
    const dashboardSubscription = supabase
      .channel('dashboard_prayer_slots')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_slots'
        },
        (payload) => {
          console.log('Dashboard: Real-time prayer slot change detected:', payload);
          
          // Refresh dashboard data when prayer slots change
          queryClient.refetchQueries({ queryKey: ['user-profile'] });
          queryClient.refetchQueries({ queryKey: ['prayer-slot'] });
          queryClient.refetchQueries({ queryKey: ['attendance-stats'] });
          
          // Show notification for user's slot updates
          if (payload.eventType === 'UPDATE' && payload.new?.user_id === user.id) {
            toast({
              title: "Prayer Slot Updated",
              description: `Your dashboard has been refreshed with the latest changes`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up dashboard subscription...');
      supabase.removeChannel(dashboardSubscription);
    };
  }, [user?.id, queryClient, toast]);

  // Fetch user profile for name
  const { data: userProfileData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

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
        .sort((a: any, b: any) => new Date(b.date || a.created_at).getTime() - new Date(a.date || a.created_at).getTime());

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
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
    refetchOnWindowFocus: false
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
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
    refetchOnWindowFocus: false
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
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
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
      {/* Enhanced Welcome Header with Logo */}
      <div className="bg-gradient-to-br from-gi-primary via-gi-primary/90 to-gi-primary/80 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-gi-gold/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gi-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gi-gold/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <img 
                src="/assets/GI_Logo_Main_1751586542563.png" 
                alt="Global Intercessors" 
                className="h-16 w-auto object-contain drop-shadow-lg"
                onError={(e) => {
                  console.error('Dashboard logo failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                {userEmail || userProfileData ? (
                  <>
                    <h1 className="text-3xl font-bold font-poppins">
                      {getTimeBasedGreeting().text}, {getUserName(userProfileData, userEmail)}! {getTimeBasedGreeting().emoji}
                    </h1>
                    <p className="text-gi-gold/90 text-lg">Ready for your prayer session today</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold font-poppins">Welcome back!</h1>
                    <p className="text-gi-gold/90">Loading your information...</p>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2 bg-gi-gold/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <i className="fas fa-calendar-alt text-gi-gold"></i>
              <span className="text-gi-gold font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          
          
          {/* Attendance & Performance Panel */}
          <div className="mb-8">
            <Card className="bg-white/90 backdrop-blur-sm shadow-brand border border-gi-primary/20">
              <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <i className="fas fa-chart-line text-gi-gold"></i>
                  </div>
                  <span className="font-poppins text-xl text-gi-primary">Attendance & Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {/* Attendance Rate */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gi-gold mb-2">
                      {attendanceStats?.sessionsThisMonth && attendanceStats?.sessionsThisMonth > 0 
                        ? Math.round((attendanceStats.sessionsThisMonth / new Date().getDate()) * 100)
                        : 0}%
                    </div>
                    <p className="text-gi-primary/70 text-sm font-medium">Attendance Rate</p>
                  </div>

                  {/* Current Streak */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gi-primary mb-2">
                      {attendanceStats?.dayStreak || 0}
                    </div>
                    <p className="text-gi-primary/70 text-sm font-medium">Current Streak</p>
                  </div>

                  {/* Sessions Attended */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gi-gold mb-2">
                      {attendanceStats?.sessionsThisMonth || 0}
                    </div>
                    <p className="text-gi-primary/70 text-sm font-medium">Sessions Attended</p>
                  </div>

                  {/* Total Sessions */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gi-primary mb-2">
                      {new Date().getDate()}
                    </div>
                    <p className="text-gi-primary/70 text-sm font-medium">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Prayer Slot Card */}
      <Card 
        className="shadow-2xl border border-gi-primary/20 hover:shadow-3xl transition-all duration-300 overflow-hidden"
        onMouseEnter={() => setIsHovered('prayer-slot')}
        onMouseLeave={() => setIsHovered(null)}
      >
        <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
          <CardTitle className="flex items-center">
            <div className={`w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center mr-3 shadow-lg transition-transform duration-300 ${
              isHovered === 'prayer-slot' ? 'scale-110' : ''
            }`}>
              <i className="fas fa-clock text-gi-gold"></i>
            </div>
            <span className="font-poppins text-xl text-gi-primary">Your Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-br from-gi-primary/5 via-white to-gi-gold/5 rounded-xl p-6 border border-gi-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gi-gold/10 rounded-full blur-xl"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {prayerSlot ? (
                    <>
                      <h3 className="text-3xl font-bold text-gi-primary font-poppins mb-2">{prayerSlot.slotTime}</h3>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          prayerSlot?.status === 'active' ? 'bg-green-500 animate-pulse' : 
                          prayerSlot?.status === 'missed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className={`font-semibold ${getStatusColor(prayerSlot?.status || 'inactive')} font-poppins text-lg`}>
                          {prayerSlot?.status ? prayerSlot.status.charAt(0).toUpperCase() + prayerSlot.status.slice(1) : 'No Status'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <i className="fas fa-calendar-plus text-4xl text-gi-primary/40 mb-4"></i>
                      <p className="text-gi-primary text-lg font-medium">No prayer slot assigned</p>
                      <p className="text-gi-primary/60 mt-2">Please select a slot in Prayer Slot Management</p>
                    </div>
                  )}
                </div>

                {prayerSlot?.status === 'active' && (
                  <div className="text-right bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gi-gold/30">
                    <p className="text-sm text-gi-primary/70 mb-1">Next session in:</p>
                    <div className="flex items-center space-x-1">
                      <div className="bg-gi-primary text-white px-2 py-1 rounded font-bold text-lg">
                        {String(nextSession.hours).padStart(2, '0')}
                      </div>
                      <span className="text-gi-primary font-bold">:</span>
                      <div className="bg-gi-primary text-white px-2 py-1 rounded font-bold text-lg">
                        {String(nextSession.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-gi-primary font-bold">:</span>
                      <div className="bg-gi-primary text-white px-2 py-1 rounded font-bold text-lg">
                        {String(nextSession.seconds).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {prayerSlot?.status === "active" && (
                <Button 
                  onClick={handleRequestSkip}
                  variant="outline"
                  className="w-full border-2 border-gi-gold/50 text-gi-primary hover:bg-gi-gold hover:text-white hover:border-gi-gold transition-all duration-300 font-poppins py-3 text-lg font-semibold"
                >
                  <i className="fas fa-pause mr-2"></i>
                  Request Skip (5 days)
                </Button>
              )}
            </div>
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

      {/* Enhanced Reminder Settings */}
      <Card 
        className="shadow-2xl border border-gi-primary/20 hover:shadow-3xl transition-all duration-300"
        onMouseEnter={() => setIsHovered('reminder')}
        onMouseLeave={() => setIsHovered(null)}
      >
        <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
          <CardTitle className="flex items-center">
            <div className={`w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center mr-3 shadow-lg transition-transform duration-300 ${
              isHovered === 'reminder' ? 'scale-110' : ''
            }`}>
              <i className="fas fa-bell text-gi-gold"></i>
            </div>
            <span className="font-poppins text-xl text-gi-primary">Reminder Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 rounded-xl border border-gi-primary/10">
            <div>
              <label htmlFor="reminders" className="text-lg font-semibold font-poppins text-gi-primary">
                Prayer Session Reminders
              </label>
              <p className="text-gi-primary/70 mt-1">
                Get notified 15 minutes before your prayer session
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${remindersEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {remindersEnabled ? 'ON' : 'OFF'}
              </span>
              <Switch
                id="reminders"
                checked={remindersEnabled}
                onCheckedChange={handleReminderToggle}
                className="data-[state=checked]:bg-gi-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Floating WhatsApp Button (desktop-only) */}
      <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
        <button
          onClick={() => window.open('https://wa.me/263789117038', '_blank')}
          className="group relative bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:rotate-12"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)'
          }}
        >
          {/* WhatsApp Icon */}
          <div className="relative">
            <svg 
              className="w-6 h-6 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            
            {/* Pulse Animation */}
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            
            {/* Status Indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-300 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              WhatsApp Prayer Support
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}