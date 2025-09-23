import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  Clock, 
  Download,
  RefreshCw,
  Target,
  Award,
  Activity,
  Zap,
  Eye,
  Database,
  BarChart,
  PieChart,
  LineChart
} from "lucide-react";
import { motion } from "framer-motion";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
// Frontend-only presentation data
import { PresentationData, PRESENTATION_MODE } from '@/utils/frontend-zoom-data';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
);

interface RealtimeData {
  current_time: string;
  today_attendance: {
    total_records: number;
    attended_count: number;
    missed_count: number;
    attendance_rate: number;
  };
  active_slots_today: number;
  zoom_meetings_today: {
    total_meetings: number;
    total_participants: number;
    active_meetings: number;
  };
  weekly_summary: any;
  recent_activity: Array<{
    type: string;
    user_email: string;
    status: string;
    timestamp: string;
    slot_time: string;
  }>;
}

interface WeeklyAnalytics {
  week_start: string;
  week_end: string;
  attendance_summary: {
    total_records: number;
    attended_count: number;
    missed_count: number;
    attendance_rate: number;
    avg_duration_minutes: number;
  };
  slot_coverage: {
    total_slots: number;
    active_slots: number;
    inactive_slots: number;
    coverage_rate: number;
  };
  zoom_meetings: {
    total_meetings: number;
    total_participants: number;
    avg_participants: number;
    avg_duration: number;
    processed_meetings: number;
    unprocessed_meetings: number;
  };
  daily_breakdown: Array<{
    date: string;
    attendance_count: number;
    attended_count: number;
    missed_count: number;
    attendance_rate: number;
    zoom_meetings: number;
    total_participants: number;
  }>;
  top_performers: Array<{
    user_id: string;
    user_email: string;
    slot_time: string;
    attendance_rate: number;
    current_streak: number;
    total_attendance_days: number;
  }>;
}

export function EnhancedAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch real-time data
  const { data: realtimeData, isLoading: realtimeLoading, refetch: refetchRealtime } = useQuery({
    queryKey: ['analytics-realtime', refreshKey],
    queryFn: async () => {
      if (PRESENTATION_MODE) {
        const stats = PresentationData.dashboard();
        const activity = PresentationData.activityFeed();
        const mappedActivity = activity.map((a: any, idx: number) => ({
          type: a.type,
          user_email: a.user || 'intercessor@giprayer.org',
          status: a.type === 'attendance_logged' ? 'attended' : 'joined',
          timestamp: a.time,
          slot_time: a.slot_time || '—',
        }));
        const fallback: RealtimeData = {
          current_time: new Date().toISOString(),
          today_attendance: {
            total_records: stats.todayTotalSlots || 48,
            attended_count: stats.todayAttended || 44,
            missed_count: (stats.todayTotalSlots || 48) - (stats.todayAttended || 44),
            attendance_rate: Math.round((stats.todayAttended || 44) / (stats.todayTotalSlots || 48) * 100),
          },
          active_slots_today: stats.activeSlots || 48,
          zoom_meetings_today: {
            total_meetings: stats.totalZoomMeetings || 124,
            total_participants: stats.avgZoomParticipants * 3 || 126,
            active_meetings: 1,
          },
          weekly_summary: {},
          recent_activity: mappedActivity,
        };
        return fallback;
      }
      const response = await fetch('/api/admin/analytics/realtime');
      if (!response.ok) throw new Error('Failed to fetch realtime data');
      return response.json() as Promise<RealtimeData>;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true
  });

  // Fetch weekly analytics
  const { data: weeklyData, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery({
    queryKey: ['analytics-weekly', refreshKey],
    queryFn: async () => {
      if (PRESENTATION_MODE) {
        const a = PresentationData.analytics();
        const stats = PresentationData.dashboard();
        // Derive weekly summary from presentation data
        const attended = a.weeklyAttendance.datasets?.[0]?.data || [44,42,45,43,46,44,45];
        const totals = a.weeklyAttendance.datasets?.[1]?.data || [48,48,48,48,48,48,48];
        const total_records = totals.reduce((s: number, v: number) => s + v, 0);
        const attended_count = attended.reduce((s: number, v: number) => s + v, 0);
        const missed_count = total_records - attended_count;
        const attendance_rate = Math.round(attended_count / total_records * 100);
        const fallback: WeeklyAnalytics = {
          week_start: new Date(Date.now() - 6*24*3600*1000).toISOString(),
          week_end: new Date().toISOString(),
          attendance_summary: {
            total_records,
            attended_count,
            missed_count,
            attendance_rate,
            avg_duration_minutes: 45,
          },
          slot_coverage: {
            total_slots: 48,
            active_slots: stats.activeSlots || 48,
            inactive_slots: Math.max(0, 48 - (stats.activeSlots || 48)),
            coverage_rate: 94,
          },
          zoom_meetings: {
            total_meetings: stats.totalZoomMeetings || 124,
            total_participants: (stats.avgZoomParticipants || 42) * 7,
            avg_participants: stats.avgZoomParticipants || 42,
            avg_duration: 45,
            processed_meetings: Math.round((stats.totalZoomMeetings || 124) * 0.92),
            unprocessed_meetings: Math.round((stats.totalZoomMeetings || 124) * 0.08),
          },
          daily_breakdown: [0,1,2,3,4,5,6].map((i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 3600 * 1000).toISOString().split('T')[0],
            attendance_count: totals[i] || 48,
            attended_count: attended[i] || 44,
            missed_count: (totals[i] || 48) - (attended[i] || 44),
            attendance_rate: Math.round(((attended[i] || 44) / (totals[i] || 48)) * 100),
            zoom_meetings: 4,
            total_participants: (stats.avgZoomParticipants || 42) * 4,
          })),
          top_performers: [
            { user_id: '1', user_email: 'sarah.johnson@example.com', slot_time: '06:00', attendance_rate: 100, current_streak: 21, total_attendance_days: 30 },
            { user_id: '2', user_email: 'john.mukasa@example.com', slot_time: '12:00', attendance_rate: 97, current_streak: 18, total_attendance_days: 29 },
            { user_id: '3', user_email: 'mary.okonkwo@example.com', slot_time: '18:00', attendance_rate: 95, current_streak: 15, total_attendance_days: 28 },
          ],
        };
        return fallback;
      }
      const response = await fetch('/api/admin/analytics/weekly');
      if (!response.ok) throw new Error('Failed to fetch weekly data');
      return response.json() as Promise<WeeklyAnalytics>;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch Zoom analytics
  const { data: zoomData, isLoading: zoomLoading } = useQuery({
    queryKey: ['analytics-zoom', refreshKey],
    queryFn: async () => {
      if (PRESENTATION_MODE) {
        const details = PresentationData.zoomMeeting();
        const geo = PresentationData.analytics().geographicDistribution;
        return { details, geo };
      }
      const response = await fetch('/api/admin/analytics/zoom');
      if (!response.ok) throw new Error('Failed to fetch zoom data');
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Fetch slot coverage analytics
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['analytics-slots', refreshKey],
    queryFn: async () => {
      if (PRESENTATION_MODE) {
        return PresentationData.analytics().slotCoverage;
      }
      const response = await fetch('/api/admin/analytics/slots');
      if (!response.ok) throw new Error('Failed to fetch slots data');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchRealtime();
    refetchWeekly();
  };

  const exportData = async (type: string) => {
    try {
      // Export whatever is currently displayed (realtime + weekly + zoom + slots)
      const payload = {
        generated_at: new Date().toISOString(),
        realtime: realtimeData,
        weekly: weeklyData,
        zoom: zoomData,
        slots: slotsData,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${type}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (realtimeLoading || weeklyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/600 border-t-transparent"></div>
      </div>
    );
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-gi-primary/20 bg-gradient-to-br from-gi-primary/5 to-gi-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gi-primary">Today's Attendance</p>
                  <p className="text-2xl font-bold text-gi-primary">
                    {realtimeData?.today_attendance?.attendance_rate || 0}%
                  </p>
                  <p className="text-xs text-gi-primary/80 mt-1">
                    {realtimeData?.today_attendance?.attended_count || 0} / {realtimeData?.today_attendance?.total_records || 0} records
                  </p>
                </div>
                <div className="p-2 bg-gi-primary/20 rounded-lg">
                  <Target className="w-6 h-6 text-gi-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-gi-gold/30 bg-gradient-to-br from-gi-gold/10 to-gi-gold/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gi-dark">Active Slots</p>
                  <p className="text-2xl font-bold text-gi-dark">
                    {realtimeData?.active_slots_today || 0}
                  </p>
                  <p className="text-xs text-gi-dark/80 mt-1">prayer slots today</p>
                </div>
                <div className="p-2 bg-gi-gold/30 rounded-lg">
                  <Clock className="w-6 h-6 text-gi-dark" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-gi-primary/30 bg-gradient-to-br from-gi-primary/10 to-gi-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gi-primary">Zoom Meetings</p>
                  <p className="text-2xl font-bold text-gi-primary">
                    {realtimeData?.zoom_meetings_today?.total_meetings || 0}
                  </p>
                  <p className="text-xs text-gi-primary/80 mt-1">
                    {realtimeData?.zoom_meetings_today?.total_participants || 0} participants
                  </p>
                </div>
                <div className="p-2 bg-gi-primary/20 rounded-lg">
                  <Activity className="w-6 h-6 text-gi-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-gi-gold/30 bg-gradient-to-br from-gi-gold/5 to-gi-gold/15">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gi-dark">Live Meetings</p>
                  <p className="text-2xl font-bold text-gi-dark">
                    {realtimeData?.zoom_meetings_today?.active_meetings || 0}
                  </p>
                  <p className="text-xs text-gi-dark/80 mt-1">currently active</p>
                </div>
                <div className="p-2 bg-gi-gold/30 rounded-lg">
                  <Zap className="w-6 h-6 text-gi-dark" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <Card className="border-gi-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gi-dark flex items-center gap-2">
            <Activity className="w-5 h-5 text-gi-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {realtimeData?.recent_activity?.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-gi-primary/5 rounded-lg border border-gi-primary/20"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'attended' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gi-dark">
                      {activity.user_email}
                    </p>
                    <p className="text-xs text-gi-dark/80">
                      {activity.status} • {activity.slot_time} • {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-gi-primary/20 text-gi-primary">
                    {activity.status}
                  </Badge>
                </motion.div>
              )) || []}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const WeeklyTab = () => (
    <div className="space-y-6">
      {weeklyData && (
        <>
          {/* Weekly Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-gi-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gi-primary">Weekly Attendance</p>
                    <p className="text-2xl font-bold text-gi-primary">
                      {weeklyData.attendance_summary.attendance_rate}%
                    </p>
                    <p className="text-xs text-gi-primary/80 mt-1">
                      {weeklyData.attendance_summary.attended_count} / {weeklyData.attendance_summary.total_records} records
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-gi-primary/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gi-gold/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gi-dark">Slot Coverage</p>
                    <p className="text-2xl font-bold text-gi-dark">
                      {weeklyData.slot_coverage.coverage_rate}%
                    </p>
                    <p className="text-xs text-gi-dark/80 mt-1">
                      {weeklyData.slot_coverage.active_slots} / {weeklyData.slot_coverage.total_slots} slots
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-gi-gold/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gi-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gi-primary">Zoom Meetings</p>
                    <p className="text-2xl font-bold text-gi-primary">
                      {weeklyData.zoom_meetings.total_meetings}
                    </p>
                    <p className="text-xs text-gi-primary/80 mt-1">
                      {weeklyData.zoom_meetings.total_participants} participants
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-gi-primary/60" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card className="border-gi-gold/30">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gi-dark flex items-center gap-2">
                <Award className="w-5 h-5 text-gi-gold" />
                Top Performers This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {weeklyData.top_performers?.map((performer, index) => (
                    <motion.div
                      key={performer.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-gi-gold/10 rounded-lg border border-gi-gold/30"
                    >
                      <div className="w-8 h-8 bg-gi-gold/30 rounded-full flex items-center justify-center">
                        <span className="text-gi-dark font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gi-dark">{performer.user_email}</p>
                        <p className="text-xs text-gi-dark/80">
                          {performer.slot_time} • {performer.current_streak} day streak
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gi-dark">{performer.attendance_rate}%</p>
                        <p className="text-xs text-gi-dark/80">{performer.total_attendance_days} days</p>
                      </div>
                    </motion.div>
                  )) || []}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gi-dark">Enhanced Analytics Dashboard</h1>
          <p className="text-gi-dark/80 mt-1">
            Real-time insights and comprehensive reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="border-gi-primary/30 hover:bg-gi-primary/10 text-gi-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => exportData('all')}
            className="bg-gi-primary hover:bg-gi-primary/90 text-white"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="zoom" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Zoom
          </TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Slots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyTab />
        </TabsContent>

        <TabsContent value="zoom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-gi-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gi-dark flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gi-primary" />
                  Participants by Day (Weekly)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: (PresentationData.analytics().weeklyAttendance.labels),
                    datasets: [
                      {
                        label: 'Participants',
                        data: (PresentationData.analytics().weeklyAttendance.datasets?.[0]?.data || [44,42,45,43,46,44,45]).map((v: number) => Math.round(v * (PresentationData.dashboard().avgZoomParticipants / 44))),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                      },
                    ],
                  }}
                />
              </CardContent>
            </Card>

            <Card className="border-gi-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gi-dark flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-gi-primary" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Doughnut data={PresentationData.analytics().geographicDistribution} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slots">
          <Card className="border-gi-primary/20">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gi-dark flex items-center gap-2">
                <BarChart className="w-5 h-5 text-gi-primary" />
                Time Slot Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Bar data={PresentationData.analytics().slotCoverage} options={{ responsive: true, plugins: { legend: { position: 'top' as const } } }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

