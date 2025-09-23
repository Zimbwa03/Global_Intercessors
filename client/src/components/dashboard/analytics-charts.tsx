import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Activity, Clock, Calendar } from "lucide-react";

interface AnalyticsData {
  userActivities: Array<{
    date: string;
    activities: number;
    prayers: number;
    attendance: number;
  }>;
  prayerStats: Array<{
    timeSlot: string;
    coverage: number;
    attendance: number;
  }>;
  intercessorStats: {
    totalActive: number;
    totalRegistered: number;
    activeToday: number;
    averageAttendance: number;
  };
  weeklyTrends: Array<{
    week: string;
    newRegistrations: number;
    totalSessions: number;
    avgDuration: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsCharts() {
  // Frontend-only sample mode for presentations
  const PRESENTATION_MODE = true; // set to false after presentation

  const buildPresentationAnalyticsData = (): AnalyticsData => {
    // 7-day daily activity trends
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const attended = [44, 42, 45, 43, 46, 44, 45];
    const totals =   [48, 48, 48, 48, 48, 48, 48];
    const userActivities = days.map((d, i) => ({
      date: d,
      activities: 120 + i * 8, // synthetic total platform activities
      prayers: 60 + i * 4,     // prayer sessions
      attendance: attended[i], // attended sessions per day
    }));

    // Time slot coverage (8 blocks)
    const timeSlots = [
      '00:00-02:59','03:00-05:59','06:00-08:59','09:00-11:59',
      '12:00-14:59','15:00-17:59','18:00-20:59','21:00-23:59'
    ];
    const coverageSeries = [88, 85, 92, 95, 94, 96, 93, 91];
    const attendanceSeries = [85, 82, 89, 93, 91, 94, 90, 88];
    const prayerStats = timeSlots.map((slot, i) => ({
      timeSlot: slot,
      coverage: coverageSeries[i],
      attendance: attendanceSeries[i],
    }));

    const intercessorStats = {
      totalActive: 48,
      totalRegistered: 247,
      activeToday: 44,
      averageAttendance: Math.round((attended.reduce((s, v) => s + v, 0) / totals.reduce((s, v) => s + v, 0)) * 100),
    };

    const weeklyTrends = [
      { week: 'Week 1', newRegistrations: 32, totalSessions: 310, avgDuration: 44 },
      { week: 'Week 2', newRegistrations: 38, totalSessions: 328, avgDuration: 45 },
      { week: 'Week 3', newRegistrations: 41, totalSessions: 343, avgDuration: 45 },
      { week: 'Week 4', newRegistrations: 46, totalSessions: 356, avgDuration: 46 },
    ];

    return { userActivities, prayerStats, intercessorStats, weeklyTrends };
  };

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
    refetchOnWindowFocus: false
  });

  const effectiveAnalytics: AnalyticsData | undefined = analytics || (PRESENTATION_MODE ? buildPresentationAnalyticsData() : undefined);

  if (isLoading && !effectiveAnalytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gi-primary/100">Total Intercessors</p>
                <p className="text-2xl font-bold">{effectiveAnalytics!.intercessorStats.totalRegistered}</p>
              </div>
              <Users className="w-8 h-8 text-gi-primary/200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100">Active Today</p>
                <p className="text-2xl font-bold">{effectiveAnalytics!.intercessorStats.activeToday}</p>
              </div>
              <Activity className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-600 to-amber-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100">Avg Attendance</p>
                <p className="text-2xl font-bold">{Math.round(effectiveAnalytics!.intercessorStats.averageAttendance)}%</p>
              </div>
              <Clock className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-violet-600 to-violet-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100">Active Slots</p>
                <p className="text-2xl font-bold">{effectiveAnalytics!.intercessorStats.totalActive}</p>
              </div>
              <Calendar className="w-8 h-8 text-violet-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Daily Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={effectiveAnalytics!.userActivities}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="activities" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Activities"
                />
                <Line 
                  type="monotone" 
                  dataKey="prayers" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Prayer Sessions"
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Attendance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prayer Slot Coverage */}
        <Card>
          <CardHeader>
            <CardTitle>Prayer Slot Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={effectiveAnalytics!.prayerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeSlot" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="coverage" fill="#3B82F6" name="Coverage %" />
                <Bar dataKey="attendance" fill="#10B981" name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Growth Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={effectiveAnalytics!.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="newRegistrations" fill="#8B5CF6" name="New Registrations" />
                <Bar dataKey="totalSessions" fill="#EF4444" name="Total Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time Slot Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Prayer Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={effectiveAnalytics!.prayerStats.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ timeSlot, coverage }) => `${timeSlot}: ${coverage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="coverage"
                >
                  {effectiveAnalytics!.prayerStats.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}