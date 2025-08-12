import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { IntercessorScheduleSettings } from '@/components/intercessor-schedule-settings';
import { WeeklyPrayerAttendance } from '@/components/weekly-prayer-attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Star } from 'lucide-react';

export default function SchedulePage() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Calendar className="w-6 h-6 text-gi-primary" />
              Prayer Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Please log in to access your prayer schedule and attendance tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gi-primary">Prayer Schedule</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your prayer commitment and track your spiritual journey with flexible scheduling 
            and detailed attendance metrics.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gi-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-gi-primary" />
              </div>
              <h3 className="font-semibold text-gi-primary mb-2">Flexible Scheduling</h3>
              <p className="text-sm text-gray-600">
                Choose which days of the week work best for your prayer commitment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gi-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-gi-gold" />
              </div>
              <h3 className="font-semibold text-gi-gold mb-2">Attendance Tracking</h3>
              <p className="text-sm text-gray-600">
                Mark your prayer attendance and track your consistency over time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-600 mb-2">Progress Insights</h3>
              <p className="text-sm text-gray-600">
                View your prayer streaks, attendance rates, and spiritual growth metrics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Schedule Settings */}
          <div>
            <IntercessorScheduleSettings userId={user.id} />
          </div>

          {/* Weekly Attendance */}
          <div>
            <WeeklyPrayerAttendance userId={user.id} />
          </div>
        </div>

        {/* How It Works Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">How Prayer Scheduling Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gi-primary mb-3">1. Set Your Schedule</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select the days of the week when you commit to attending your prayer slot. 
                  This becomes your "active schedule" - the foundation for tracking your consistency.
                </p>
                
                <h4 className="font-semibold text-gi-primary mb-3">2. Track Your Attendance</h4>
                <p className="text-sm text-gray-600">
                  Mark whether you attended prayer on each of your scheduled days. 
                  Your attendance rate and streaks are calculated based only on your active days, 
                  giving you an accurate picture of your commitment.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gi-primary mb-3">3. View Your Progress</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Watch your prayer streaks grow as you consistently attend on your scheduled days. 
                  Your attendance rate shows how well you're keeping your prayer commitment.
                </p>
                
                <h4 className="font-semibold text-gi-primary mb-3">4. Flexible Adjustments</h4>
                <p className="text-sm text-gray-600">
                  Life changes? No problem. Update your schedule anytime to reflect your current capacity. 
                  Your metrics will adjust accordingly, always giving you an encouraging and accurate view 
                  of your prayer journey.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}