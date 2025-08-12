import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";

interface WeeklyPrayerAttendanceProps {
  userId: string;
}

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'Sunday', short: 'Sun', dayIndex: 0 },
  { id: 'monday', label: 'Monday', short: 'Mon', dayIndex: 1 },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue', dayIndex: 2 },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed', dayIndex: 3 },
  { id: 'thursday', label: 'Thursday', short: 'Thu', dayIndex: 4 },
  { id: 'friday', label: 'Friday', short: 'Fri', dayIndex: 5 },
  { id: 'saturday', label: 'Saturday', short: 'Sat', dayIndex: 6 }
];

export function WeeklyPrayerAttendance({ userId }: WeeklyPrayerAttendanceProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user schedule
  const { data: schedule } = useQuery({
    queryKey: ['/api/intercessor/schedule', userId],
    queryFn: async () => {
      const response = await fetch(`/api/intercessor/schedule/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch weekly attendance
  const { data: attendance, isLoading } = useQuery({
    queryKey: ['/api/intercessor/attendance', userId, format(currentWeek, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/intercessor/attendance/${userId}?week=${format(currentWeek, 'yyyy-MM-dd')}`
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!userId,
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ 
      prayerDate, 
      isAttended, 
      dayOfWeek 
    }: { 
      prayerDate: string; 
      isAttended: boolean; 
      dayOfWeek: number; 
    }) => {
      const response = await fetch('/api/intercessor/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prayerDate,
          isAttended,
          scheduledDayOfWeek: dayOfWeek,
        }),
      });
      if (!response.ok) throw new Error('Failed to mark attendance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/attendance', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/metrics', userId] });
      toast({
        title: "Attendance Updated",
        description: "Your prayer attendance has been recorded!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive",
      });
    },
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const markAttendance = (date: Date, isAttended: boolean) => {
    const prayerDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    
    markAttendanceMutation.mutate({
      prayerDate,
      isAttended,
      dayOfWeek,
    });
  };

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance?.find((record: any) => record.prayer_date === dateStr);
  };

  const isActiveDay = (dayId: string) => {
    return schedule?.activeDays?.includes(dayId) || false;
  };

  const weekDays = DAYS_OF_WEEK.map(day => ({
    ...day,
    date: addDays(currentWeek, day.dayIndex),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Prayer Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <Calendar className="w-5 h-5 text-gi-primary" />
          Weekly Prayer Attendance
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Track your prayer attendance for the week of {format(currentWeek, 'MMM d, yyyy')}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const attendanceRecord = getAttendanceForDate(day.date);
            const isActive = isActiveDay(day.id);
            const isToday = isSameDay(day.date, new Date());
            const isPast = day.date < new Date() && !isToday;
            
            return (
              <div
                key={day.id}
                className={cn(
                  "border rounded-lg p-3 text-center space-y-2",
                  isActive 
                    ? "border-gi-primary/50 bg-gi-primary/5" 
                    : "border-gray-200 bg-gray-50",
                  isToday && "ring-2 ring-gi-gold"
                )}
              >
                {/* Day Header */}
                <div>
                  <div className="font-semibold text-sm">{day.short}</div>
                  <div className="text-xs text-gray-500">
                    {format(day.date, 'd')}
                  </div>
                  {isToday && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Today
                    </Badge>
                  )}
                </div>

                {/* Attendance Status */}
                {isActive ? (
                  <div className="space-y-2">
                    {attendanceRecord ? (
                      <div className="flex items-center justify-center">
                        {attendanceRecord.is_attended ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-xs">Attended</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <X className="w-4 h-4" />
                            <span className="text-xs">Missed</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-gray-400">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={attendanceRecord?.is_attended ? "default" : "outline"}
                        className="flex-1 h-6 text-xs"
                        onClick={() => markAttendance(day.date, true)}
                        disabled={markAttendanceMutation.isPending}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={attendanceRecord && !attendanceRecord.is_attended ? "destructive" : "outline"}
                        className="flex-1 h-6 text-xs"
                        onClick={() => markAttendance(day.date, false)}
                        disabled={markAttendanceMutation.isPending}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 py-4">
                    Not scheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3">Legend</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gi-primary/50 bg-gi-primary/5 rounded"></div>
              <span>Active prayer day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-200 bg-gray-50 rounded"></div>
              <span>Not scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-600" />
              <span>Prayer attended</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="w-3 h-3 text-red-600" />
              <span>Prayer missed</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}