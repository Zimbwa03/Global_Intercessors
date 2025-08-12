import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";

interface WeeklyPrayerAttendanceProps {
  userId: string;
}

export function WeeklyPrayerAttendance({ userId }: WeeklyPrayerAttendanceProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const queryClient = useQueryClient();

  // Fetch user's active days
  const { data: schedule } = useQuery({
    queryKey: ['/api/intercessor/schedule', userId],
    queryFn: () => apiRequest(`/api/intercessor/schedule/${userId}`),
  });

  // Fetch attendance for current week
  const { data: attendance, isLoading } = useQuery({
    queryKey: ['/api/intercessor/attendance', userId, format(currentWeek, 'yyyy-MM-dd')],
    queryFn: () => apiRequest(`/api/intercessor/attendance/${userId}?week=${format(currentWeek, 'yyyy-MM-dd')}`),
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: ({ date, attended }: { date: string; attended: boolean }) =>
      apiRequest('/api/intercessor/attendance', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          prayerDate: date,
          isAttended: attended,
          scheduledDayOfWeek: new Date(date).getDay()
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/intercessor/attendance', userId, format(currentWeek, 'yyyy-MM-dd')] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/intercessor/metrics', userId] });
      toast({
        title: "Attendance Updated",
        description: "Your prayer attendance has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const activeDays = schedule?.activeDays || [];
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  const getDayName = (date: Date) => format(date, 'EEEE').toLowerCase();
  
  const isActiveDay = (date: Date) => activeDays.includes(getDayName(date));
  
  const getAttendanceStatus = (date: Date) => {
    if (!attendance) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.find((a: any) => a.prayerDate === dateStr);
  };

  const handleAttendanceToggle = (date: Date, currentStatus: boolean | null) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newStatus = currentStatus === null ? true : !currentStatus;
    
    markAttendanceMutation.mutate({
      date: dateStr,
      attended: newStatus
    });
  };

  const previousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  
  const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeek);
  const isFutureWeek = currentWeek > startOfWeek(new Date(), { weekStartsOn: 1 });

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
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
        <p className="text-sm text-gray-600">
          Mark your attendance for your active prayer days. Only your scheduled days are shown.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={previousWeek}>
            <ChevronLeft className="w-4 h-4" />
            Previous Week
          </Button>
          
          <div className="text-center">
            <h3 className="font-semibold">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </h3>
            {isCurrentWeek && (
              <p className="text-sm text-gi-primary">Current Week</p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextWeek}
            disabled={isFutureWeek}
          >
            Next Week
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const isActive = isActiveDay(date);
            const attendanceRecord = getAttendanceStatus(date);
            const isAttended = attendanceRecord?.isAttended;
            const dayName = format(date, 'EEE');
            const dayNumber = format(date, 'd');
            const isFuture = date > new Date();
            
            if (!isActive) {
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-50 text-center opacity-50"
                >
                  <div className="text-xs text-gray-400 mb-1">{dayName}</div>
                  <div className="text-sm text-gray-400">{dayNumber}</div>
                  <div className="text-xs text-gray-400 mt-1">Rest Day</div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer
                  ${isAttended === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : isAttended === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gi-primary/30 bg-gi-primary/5 hover:border-gi-primary'
                  }
                  ${isFuture ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => !isFuture && handleAttendanceToggle(date, isAttended)}
              >
                <div className="text-center">
                  <div className="text-xs mb-1">{dayName}</div>
                  <div className="text-lg font-semibold">{dayNumber}</div>
                  <div className="mt-1">
                    {isAttended === true && <Check className="w-4 h-4 mx-auto text-green-600" />}
                    {isAttended === false && <X className="w-4 h-4 mx-auto text-red-600" />}
                    {isAttended === null && !isFuture && (
                      <div className="w-4 h-4 mx-auto border-2 border-gi-primary rounded"></div>
                    )}
                    {isFuture && (
                      <div className="text-xs text-gray-400">Future</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-green-500 bg-green-50 rounded"></div>
            <span>Attended</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-red-500 bg-red-50 rounded"></div>
            <span>Missed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-gi-primary bg-gi-primary/5 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-50 border-2 border-gray-200 rounded"></div>
            <span>Rest Day</span>
          </div>
        </div>

        {/* Weekly Summary */}
        {attendance && (
          <div className="bg-gi-primary/5 rounded-lg p-4">
            <h4 className="font-semibold text-gi-primary mb-2">Week Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-600 font-medium">
                  {attendance.filter((a: any) => a.isAttended).length}
                </span>
                <span className="text-gray-600"> attended</span>
              </div>
              <div>
                <span className="text-red-600 font-medium">
                  {attendance.filter((a: any) => !a.isAttended).length}
                </span>
                <span className="text-gray-600"> missed</span>
              </div>
              <div>
                <span className="text-gi-primary font-medium">
                  {activeDays.length - attendance.length}
                </span>
                <span className="text-gray-600"> pending</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}