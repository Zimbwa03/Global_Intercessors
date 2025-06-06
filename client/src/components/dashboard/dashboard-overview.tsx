import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DashboardOverviewProps {
  userEmail?: string;
}

export function DashboardOverview({ userEmail }: DashboardOverviewProps) {
  const [prayerSlot, setPrayerSlot] = useState({ time: "22:00 - 22:30", status: "Active" });
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [nextSession, setNextSession] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [missedDays, setMissedDays] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Load reminder preference from localStorage
    const savedReminders = localStorage.getItem('remindersEnabled');
    if (savedReminders) {
      setRemindersEnabled(JSON.parse(savedReminders));
    }

    // Calculate time until next session (simplified countdown)
    const calculateNextSession = () => {
      const now = new Date();
      const nextSlot = new Date();
      nextSlot.setHours(22, 0, 0, 0);
      
      if (now.getHours() >= 22) {
        nextSlot.setDate(nextSlot.getDate() + 1);
      }
      
      const diff = nextSlot.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setNextSession({ hours, minutes, seconds });
    };

    calculateNextSession();
    const interval = setInterval(calculateNextSession, 1000);

    return () => clearInterval(interval);
  }, []);

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
    setPrayerSlot(prev => ({ ...prev, status: "On Leave" }));
    toast({
      title: "Skip Requested",
      description: "Your prayer slot has been marked as 'On Leave' for 5 days"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "text-green-600";
      case "Missed": return "text-red-600";
      case "On Leave": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active": return "fas fa-check-circle";
      case "Missed": return "fas fa-times-circle";
      case "On Leave": return "fas fa-pause-circle";
      default: return "fas fa-circle";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-brand-primary text-white rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-gray-200">{userEmail}</p>
      </div>

      {/* Prayer Slot Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-clock text-brand-accent text-sm"></i>
            </div>
            Your Prayer Slot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-brand-neutral rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-brand-primary">{prayerSlot.time}</h3>
                <div className="flex items-center mt-1">
                  <i className={`${getStatusIcon(prayerSlot.status)} ${getStatusColor(prayerSlot.status)} mr-2`}></i>
                  <span className={`font-semibold ${getStatusColor(prayerSlot.status)}`}>
                    {prayerSlot.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Next session in:</p>
                <p className="text-lg font-bold text-brand-primary">
                  {String(nextSession.hours).padStart(2, '0')}:
                  {String(nextSession.minutes).padStart(2, '0')}:
                  {String(nextSession.seconds).padStart(2, '0')}
                </p>
              </div>
            </div>
            
            {prayerSlot.status === "Active" && (
              <Button 
                onClick={handleRequestSkip}
                variant="outline"
                className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                <i className="fas fa-pause mr-2"></i>
                Request Skip (5 days)
              </Button>
            )}
          </div>

          {missedDays > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                You've missed {missedDays} day(s). 
                {missedDays >= 4 && " Your slot will be auto-released after 5 missed days."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-bell text-brand-accent text-sm"></i>
            </div>
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reminders" className="text-base font-medium">
                Prayer Session Reminders
              </Label>
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
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-calendar-check text-blue-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">12</p>
                <p className="text-sm text-gray-600">Sessions This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-fire text-green-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">7</p>
                <p className="text-sm text-gray-600">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-users text-purple-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">245</p>
                <p className="text-sm text-gray-600">Global Intercessors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}