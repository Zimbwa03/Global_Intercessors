import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Save, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntercessorScheduleSettingsProps {
  userId: string;
}

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' }
];

export function IntercessorScheduleSettings({ userId }: IntercessorScheduleSettingsProps) {
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current schedule
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['/api/intercessor/schedule', userId],
    queryFn: async () => {
      const response = await fetch(`/api/intercessor/schedule/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch user metrics
  const { data: metrics } = useQuery({
    queryKey: ['/api/intercessor/metrics', userId],
    queryFn: async () => {
      const response = await fetch(`/api/intercessor/metrics/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: !!userId,
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (newActiveDays: string[]) => {
      const response = await fetch('/api/intercessor/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activeDays: newActiveDays }),
      });
      if (!response.ok) throw new Error('Failed to update schedule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/schedule', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/metrics', userId] });
      setHasChanges(false);
      toast({
        title: "Schedule Updated",
        description: "Your prayer schedule has been saved successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  // Update local state when schedule data loads
  useEffect(() => {
    if (schedule?.activeDays) {
      setActiveDays(schedule.activeDays);
    }
  }, [schedule]);

  const toggleDay = (dayId: string) => {
    const newActiveDays = activeDays.includes(dayId)
      ? activeDays.filter(day => day !== dayId)
      : [...activeDays, dayId];
    
    setActiveDays(newActiveDays);
    setHasChanges(true);
  };

  const saveSchedule = () => {
    updateScheduleMutation.mutate(activeDays);
  };

  const resetSchedule = () => {
    setActiveDays(schedule?.activeDays || []);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Prayer Schedule Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gi-primary" />
          Prayer Schedule Settings
        </CardTitle>
        <p className="text-sm text-gray-600">
          Select the days when you can commit to prayer. Your attendance tracking 
          will be based on these active days.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Metrics Display */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gi-primary">{metrics.currentStreak}</div>
              <div className="text-xs sm:text-sm text-gray-600">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gi-gold">{Math.round(metrics.attendanceRate)}%</div>
              <div className="text-xs sm:text-sm text-gray-600">Attendance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{metrics.daysAttended}</div>
              <div className="text-xs sm:text-sm text-gray-600">Days Attended</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{metrics.totalActiveDays}</div>
              <div className="text-xs sm:text-sm text-gray-600">Active Days/Week</div>
            </div>
          </div>
        )}

        {/* Day Selection Grid */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Your Prayer Days
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const isActive = activeDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={cn(
                    "p-2 sm:p-3 md:p-4 rounded-lg border-2 transition-all duration-200 text-center min-h-[56px] sm:min-h-[70px] md:min-h-[80px]",
                    "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gi-primary/50",
                    isActive
                      ? "border-gi-primary bg-gi-primary text-white shadow-lg"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gi-primary/50"
                  )}
                >
                  <div className="font-semibold text-[10px] sm:text-xs md:text-sm mb-1">{day.short}</div>
                  <div className="text-[10px] sm:text-xs opacity-75">{day.label.slice(0, 3)}</div>
                  {isActive && (
                    <div className="mt-1 sm:mt-2">
                      <Clock className="w-3 h-3 mx-auto" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              onClick={saveSchedule}
              disabled={updateScheduleMutation.isPending}
              className="flex items-center gap-2 w-full sm:w-auto px-6 py-3 text-sm md:text-base"
            >
              <Save className="w-4 h-4" />
              {updateScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetSchedule}
              disabled={updateScheduleMutation.isPending}
              className="w-full sm:w-auto px-6 py-3 text-sm md:text-base"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Helper Text */}
        <div className="text-sm text-gray-500 space-y-2">
          <p>
            <strong>How it works:</strong> Select the days you can consistently pray. 
            Your streak and attendance rate will be calculated based only on these active days.
          </p>
          <p>
            You can update your schedule anytime to reflect changes in your availability. 
            Past attendance records will be preserved.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}