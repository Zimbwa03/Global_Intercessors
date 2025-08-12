import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, Activity } from "lucide-react";

interface IntercessorScheduleSettingsProps {
  userId: string;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' }
];

export function IntercessorScheduleSettings({ userId }: IntercessorScheduleSettingsProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch current schedule
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['/api/intercessor/schedule', userId],
    queryFn: () => apiRequest(`/api/intercessor/schedule/${userId}`),
  });

  // Fetch attendance metrics
  const { data: metrics } = useQuery({
    queryKey: ['/api/intercessor/metrics', userId],
    queryFn: () => apiRequest(`/api/intercessor/metrics/${userId}`),
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: (activeDays: string[]) =>
      apiRequest('/api/intercessor/schedule', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          activeDays
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/schedule', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/metrics', userId] });
      toast({
        title: "Schedule Updated",
        description: "Your prayer schedule has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (schedule?.activeDays) {
      setSelectedDays(schedule.activeDays);
    }
  }, [schedule]);

  const handleDayToggle = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSaveSchedule = () => {
    updateScheduleMutation.mutate(selectedDays);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Prayer Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="grid grid-cols-2 gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gi-primary" />
            Prayer Schedule Settings
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select the days of the week when you plan to attend your prayer slot. 
            Your streak and attendance metrics will be calculated based on these active days only.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Day Selection Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day.id}
                className={`
                  border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
                  ${selectedDays.includes(day.id)
                    ? 'border-gi-primary bg-gi-primary/10 text-gi-primary'
                    : 'border-gray-200 hover:border-gi-primary/50'
                  }
                `}
                onClick={() => handleDayToggle(day.id)}
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedDays.includes(day.id)}
                    onChange={() => handleDayToggle(day.id)}
                  />
                  <div className="text-center">
                    <div className="font-medium text-sm md:hidden">{day.short}</div>
                    <div className="font-medium text-sm hidden md:block">{day.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            >
              Weekdays
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDays(['saturday', 'sunday'])}
            >
              Weekends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDays(DAYS_OF_WEEK.map(d => d.id))}
            >
              All Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDays([])}
            >
              Clear All
            </Button>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveSchedule}
            disabled={updateScheduleMutation.isPending}
            className="w-full bg-gi-primary hover:bg-gi-primary/90"
          >
            {updateScheduleMutation.isPending ? "Saving..." : "Save Schedule"}
          </Button>
        </CardContent>
      </Card>

      {/* Metrics Display */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gi-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-gi-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-gi-primary">
                    {metrics.currentStreak} {metrics.currentStreak === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gi-gold/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-gi-gold" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gi-gold">
                    {Math.round(metrics.attendanceRate)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days Attended</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics.daysAttended}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}