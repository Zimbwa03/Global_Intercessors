import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Heart, BookOpen, Users, TrendingUp, Target, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";


interface MobileDashboardOverviewProps {
  userEmail: string;
  userId?: string;
  onTabChange?: (tab: string) => void;
}

export function MobileDashboardOverview({ userEmail, userId, onTabChange }: MobileDashboardOverviewProps) {
  const [timeOfDay, setTimeOfDay] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [timeUntilSlot, setTimeUntilSlot] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Prayer slot data - use userId if available, fallback to userEmail
  const { data: prayerSlot, isLoading: prayerSlotLoading } = useQuery({
    queryKey: ['prayer-slot', userId || userEmail],
    queryFn: async () => {
      if (!userId && !userEmail) return null;

      // Use the correct API endpoint that works
      const endpoint = userId ? `/api/prayer-slot/${userId}` : `/api/prayer-slot?userEmail=${encodeURIComponent(userEmail)}`;

      console.log('Fetching prayer slot from:', endpoint);
      const response = await fetch(endpoint);
      if (!response.ok) {
        console.error('Failed to fetch prayer slot:', response.status, response.statusText);
        throw new Error('Failed to fetch prayer slot');
      }
      const data = await response.json();
      console.log('Prayer slot data received:', data);
      return data;
    },
    enabled: !!(userId || userEmail),
  });

  // Analytics data
  const { data: analytics } = useQuery({
    queryKey: ['/api/admin/analytics'],
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setCurrentTime(timeString);

      if (hour < 12) setTimeOfDay("morning");
      else if (hour < 17) setTimeOfDay("afternoon");
      else setTimeOfDay("evening");
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Calculate countdown to next prayer session based on actual slot time (same logic as Prayer Slot Management)
  useEffect(() => {
    if (!prayerSlot?.prayerSlot || prayerSlot.prayerSlot.status !== 'active') {
      setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateNextSession = () => {
      const now = new Date();
      const slotTime = prayerSlot.prayerSlot.slotTime;

      if (!slotTime || !slotTime.includes('–')) {
        console.log('Invalid slot time format:', slotTime);
        setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const [startTime] = slotTime.split('–');
      const [hours, minutes] = startTime.split(':').map(Number);

      // Validate parsed values
      if (isNaN(hours) || isNaN(minutes)) {
        console.log('Invalid time values:', { hours, minutes, startTime });
        setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Create next session time for today
      const nextSlot = new Date();
      nextSlot.setHours(hours, minutes, 0, 0);

      // If the time has passed today, set for tomorrow
      if (nextSlot <= now) {
        nextSlot.setDate(nextSlot.getDate() + 1);
      }

      const timeDiff = nextSlot.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

      console.log('Countdown calculation:', {
        now: now.toLocaleString(),
        nextSlot: nextSlot.toLocaleString(),
        timeDiff,
        hoursLeft,
        minutesLeft,
        secondsLeft,
        slotTime
      });

      setTimeUntilSlot({
        hours: Math.max(0, hoursLeft),
        minutes: Math.max(0, minutesLeft),
        seconds: Math.max(0, secondsLeft)
      });
    };

    calculateNextSession();
    const interval = setInterval(calculateNextSession, 1000);

    return () => clearInterval(interval);
  }, [prayerSlot?.prayerSlot?.slotTime, prayerSlot?.prayerSlot?.status]);



  const getGreeting = () => {
    const name = userEmail?.split('@')[0] || 'Intercessor';
    switch (timeOfDay) {
      case "morning": return `Good morning, ${name}`;
      case "afternoon": return `Good afternoon, ${name}`;
      case "evening": return `Good evening, ${name}`;
      default: return `Welcome, ${name}`;
    }
  };

  const quickActions = [
    {
      title: "Start Prayer",
      description: "Begin your prayer session",
      icon: Heart,
      gradient: "from-gi-primary to-green-600",
      action: () => onTabChange?.("prayer-slots"),
      pulse: true
    },
    {
      title: "Bible Chat",
      description: "Get spiritual guidance",
      icon: BookOpen,
      gradient: "from-gi-gold to-yellow-500",
      action: () => onTabChange?.("bible-chat")
    },
    {
      title: "Prayer Planner",
      description: "Plan your intercession",
      icon: Target,
      gradient: "from-blue-500 to-blue-600",
      action: () => onTabChange?.("prayer-planner")
    },
    // Analytics button removed as per requirement
    // {
    //   title: "Analytics",
    //   description: "View your progress",
    //   icon: TrendingUp,
    //   gradient: "from-purple-500 to-purple-600",
    //   action: () => onTabChange?.("analytics")
    // }
  ];

  const stats = [
    {
      label: "Prayer Streak",
      value: "7 days",
      icon: Clock,
      change: "+2 from last week",
      positive: true
    },
    {
      label: "Community",
      value: (analytics as any)?.totalRegistered || "0",
      icon: Users,
      change: "Active intercessors",
      positive: true
    },
    {
      label: "Prayer Progress",
      value: "85%",
      icon: Target,
      change: "This month",
      positive: true
    }
  ];

  return (
    <div className="space-y-6 mobile-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gi-primary to-green-600 rounded-2xl p-6 text-white mobile-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
            <p className="text-green-100 text-base">Ready for spiritual growth today?</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono">{currentTime}</div>
            <div className="text-sm text-green-100 capitalize">{timeOfDay}</div>
          </div>
        </div>
      </div>

      {/* Time remaining to Next slot */}
      <Card className="mobile-interactive-card mobile-card border-gi-primary/20 bg-gradient-to-br from-gi-primary/5 to-gi-gold/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gi-primary">
            <Clock className="w-5 h-5" />
            Next Prayer Session Countdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            {prayerSlot?.prayerSlot && prayerSlot.prayerSlot.status === 'active' ? (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gi-primary/10">
                  <div className="text-5xl font-bold text-gi-primary font-mono tracking-wider mb-2">
                    {String(timeUntilSlot.hours).padStart(2, '0')}:
                    {String(timeUntilSlot.minutes).padStart(2, '0')}:
                    {String(timeUntilSlot.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    HOURS : MINUTES : SECONDS
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Your prayer time: <strong className="text-gi-primary">{prayerSlot.prayerSlot.slotTime}</strong></span>
                </div>
                <div className="text-xs text-gray-500">
                  {timeUntilSlot.hours < 24 ? 'Today' : 'Tomorrow'} • 
                  {timeUntilSlot.hours >= 24 ? ' Next day session' : ' Today\'s session'}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No active prayer slot</p>
                <p className="text-sm text-gray-500">Please select a slot to see countdown</p>
                <Button 
                  onClick={() => onTabChange?.("prayer-slots")}
                  className="mt-3 bg-gi-primary hover:bg-gi-primary/80"
                >
                  Choose Prayer Slot
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prayer Slot Status */}
      {prayerSlot?.prayerSlot && (
        <Card className="mobile-interactive-card mobile-card border-gi-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gi-primary">
              <Clock className="h-5 w-5" />
              Your Prayer Slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gi-primary">
                    {prayerSlot.prayerSlot.slotTime}
                  </div>
                  <p className="text-sm text-gray-600">Today's intercession time</p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-gi-gold/20 text-gi-primary border-gi-gold/30"
                >
                  {prayerSlot.prayerSlot.status}
                </Badge>
              </div>



              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-2">Prayer consistency this week</div>
                <Progress value={85} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">6 of 7 days completed</div>
              </div>

              <Button 
                onClick={() => onTabChange?.("prayer-slots")}
                className="w-full bg-gi-primary hover:bg-gi-primary/80"
              >
                Manage Prayer Slot
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gi-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={action.title}
              className={cn(
                "mobile-feature-card cursor-pointer transition-all duration-300",
                action.pulse && "mobile-pulse"
              )}
              onClick={action.action}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl mb-3 flex items-center justify-center",
                  `bg-gradient-to-r ${action.gradient}`
                )}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gi-primary mb-1">{action.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{action.description}</p>
              </CardContent>
            </Card>
          ))}

          {/* Independent Mobile WhatsApp Floating Button */}
          <div className="fixed bottom-24 right-4 z-40 lg:hidden">
            <button
              onClick={() => window.open('https://wa.me/263789117038', '_blank')}
              className="group relative bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                boxShadow: '0 8px 20px rgba(37, 211, 102, 0.4)'
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
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-300 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              
              {/* Ripple Effect on Touch */}
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-100 transition-transform duration-150"></div>
            </button>
          </div>
        </div>
      </div>


      {/* Progress & Growth Dashboard */}
      <div>
        <h3 className="text-lg font-semibold text-gi-primary mb-4">Your Progress & Growth</h3>
        
        {/* Attendance Rate Circle */}
        <Card className="mobile-card mb-4 bg-gradient-to-br from-gi-primary/10 to-gi-gold/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gi-primary mb-2">Attendance Rate</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gi-gold">85%</span>
                  <span className="text-sm text-gi-primary/70">this month</span>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-gi-gold h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="w-20 h-20 ml-4">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="35" stroke="#E8F5E9" strokeWidth="8" fill="none" />
                  <circle 
                    cx="40" cy="40" r="35" 
                    stroke="#D2AA68" 
                    strokeWidth="8" 
                    fill="none"
                    strokeDasharray={`${85 * 2.2} ${100 * 2.2}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Progress Bar */}
        <Card className="mobile-card mb-4">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-gi-primary mb-3">This Week's Journey</h4>
            <div className="grid grid-cols-7 gap-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={day} className="text-center">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-1 transition-all",
                    index < 6 
                      ? "bg-gi-primary text-white shadow-lg" 
                      : "bg-gray-200 text-gray-400"
                  )}>
                    <span className="text-xs font-bold">{day}</span>
                  </div>
                  {index < 6 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-gi-primary/70 mt-3">
              6 of 7 days completed • 1 day remaining
            </p>
          </CardContent>
        </Card>

        {/* Streak Counter */}
        <Card className="mobile-card mb-4 bg-gradient-to-r from-gi-primary to-gi-primary/80 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Current Streak</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">7</span>
                  <span className="text-lg opacity-90">days</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <i className="fas fa-fire text-3xl text-gi-gold"></i>
                </div>
                <span className="text-xs opacity-75">On Fire!</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="mobile-card">
            <CardContent className="p-4 text-center">
              <Activity className="w-8 h-8 text-gi-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-gi-primary">27</p>
              <p className="text-xs text-gi-primary/70">Sessions Attended</p>
            </CardContent>
          </Card>
          
          <Card className="mobile-card">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-gi-gold mx-auto mb-2" />
              <p className="text-2xl font-bold text-gi-gold">42</p>
              <p className="text-xs text-gi-primary/70">Avg Zoom Join</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Progress Chart */}
        <Card className="mobile-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gi-primary">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-end justify-between h-32 gap-1">
              {[12, 15, 18, 22, 20, 24, 27].map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gi-primary rounded-t transition-all"
                    style={{ height: `${(value / 30) * 100}%` }}
                  ></div>
                  <span className="text-xs text-gi-primary/70 mt-1">W{index + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-gi-primary/70 mt-3">
              Weekly prayer sessions this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-gi-primary">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gi-gold/10 rounded-lg">
              <div className="w-2 h-2 bg-gi-gold rounded-full mobile-pulse"></div>
              <div className="flex-1">
                <div className="font-medium text-gi-primary">Prayer session completed</div>
                <div className="text-sm text-gray-600">Today at {currentTime}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="flex-1">
                <div className="font-medium text-gray-700">Bible verse searched</div>
                <div className="text-sm text-gray-600">Yesterday</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspirational Quote */}
      <div className="bg-gradient-to-r from-gi-gold/20 to-yellow-100 rounded-2xl p-6 mobile-shimmer">
        <div className="text-center">
          <p className="text-gi-primary font-medium mb-2 italic">
            "Pray without ceasing"
          </p>
          <p className="text-sm text-gray-600">1 Thessalonians 5:17</p>
        </div>
      </div>
    </div>
  );
}