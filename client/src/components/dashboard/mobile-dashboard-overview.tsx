import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Heart, BookOpen, Users, TrendingUp, Target, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { PrayerPlanner } from "@/components/dashboard/prayer-planner";

interface MobileDashboardOverviewProps {
  userEmail: string;
  onTabChange?: (tab: string) => void;
}

export function MobileDashboardOverview({ userEmail, onTabChange }: MobileDashboardOverviewProps) {
  const [timeOfDay, setTimeOfDay] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [timeUntilSlot, setTimeUntilSlot] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Prayer slot data
  const { data: prayerSlot } = useQuery({
    queryKey: ['/api/prayer-slot', userEmail],
    enabled: !!userEmail,
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

      // Calculate time until next prayer slot
      if ((prayerSlot as any)?.prayerSlot && (prayerSlot as any).prayerSlot.status === 'active') {
        const slotTime = (prayerSlot as any).prayerSlot.slotTime;
        const [startTime] = slotTime.split('–');
        const [slotHours, slotMinutes] = startTime.split(':').map(Number);

        const slotDateTime = new Date();
        slotDateTime.setHours(slotHours, slotMinutes, 0, 0);

        if (slotDateTime <= now) {
          slotDateTime.setDate(slotDateTime.getDate() + 1);
        }

        const diff = slotDateTime.getTime() - now.getTime();
        
        if (diff > 0) {
          const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

          setTimeUntilSlot({
            hours: Math.max(0, hoursLeft),
            minutes: Math.max(0, minutesLeft),
            seconds: Math.max(0, secondsLeft)
          });
        } else {
          setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
        }
      } else {
        setTimeUntilSlot({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [prayerSlot]);

  

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
    {
      title: "Analytics",
      description: "View your progress",
      icon: TrendingUp,
      gradient: "from-purple-500 to-purple-600",
      action: () => onTabChange?.("analytics")
    }
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
      <Card className="mobile-interactive-card mobile-card border-gi-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gi-primary">
            <Clock className="w-5 h-5" />
            Time remaining to your Next slot:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            {(prayerSlot as any)?.prayerSlot && (prayerSlot as any).prayerSlot.status === 'active' ? (
              <>
                <div className="text-4xl font-bold text-gi-primary font-mono">
                  {String(timeUntilSlot.hours).padStart(2, '0')}:
                  {String(timeUntilSlot.minutes).padStart(2, '0')}:
                  {String(timeUntilSlot.seconds).padStart(2, '0')}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span>Next prayer session at {(prayerSlot as any).prayerSlot.slotTime}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No active prayer slot</p>
                <p className="text-sm text-gray-500">Please select a slot to see countdown</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prayer Slot Status */}
      {(prayerSlot as any)?.prayerSlot && (
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
                    {(prayerSlot as any).prayerSlot.slotTime}
                  </div>
                  <p className="text-sm text-gray-600">Today's intercession time</p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-gi-gold/20 text-gi-primary border-gi-gold/30"
                >
                  {(prayerSlot as any).prayerSlot.status}
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
        </div>
      </div>

      {/* Prayer Planner Section */}
      <Card className="mobile-card border-gi-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gi-primary">
            <Heart className="w-5 h-5" />
            Prayer Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PrayerPlanner />
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gi-primary mb-4">Your Impact</h3>
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="mobile-stat-card mobile-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm opacity-90">{stat.label}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-xs font-medium",
                    stat.positive ? "text-green-200" : "text-red-200"
                  )}>
                    {stat.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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