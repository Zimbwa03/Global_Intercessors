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
  Video,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
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
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import dayjs from 'dayjs';
import { enhanceAnalyticsData, enhanceZoomData, enhanceDashboardStats } from '@/utils/zoom-analytics-enhancer';

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
  Filler
);

// GI Brand Colors
const GI_COLORS = {
  primary: '#104220',
  gold: '#D2AA68',
  dark: '#0A2E18',
  light: '#E8F5E9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
};

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
  const [reportDate, setReportDate] = useState(() => {
    const end = dayjs();
    const start = end.subtract(6, 'days');
    return `${start.format('DD MMM')} - ${end.format('DD MMM YYYY')}`;
  });

  // Fetch Zoom analytics with enhancement
  const { data: zoomData, isLoading: zoomLoading, refetch: refetchZoom } = useQuery({
    queryKey: ['zoom-analytics', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/zoom/analytics');
      if (!response.ok) throw new Error('Failed to fetch Zoom analytics');
      const data = await response.json();
      return enhanceZoomData(data);
    },
    refetchInterval: 30000
  });

  // Fetch real-time data
  const { data: realtimeData, isLoading: realtimeLoading, refetch: refetchRealtime } = useQuery({
    queryKey: ['analytics-realtime', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/realtime');
      if (!response.ok) throw new Error('Failed to fetch realtime data');
      return response.json() as Promise<RealtimeData>;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  // Fetch weekly analytics
  const { data: weeklyData, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery({
    queryKey: ['analytics-weekly', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/weekly');
      if (!response.ok) throw new Error('Failed to fetch weekly data');
      return response.json() as Promise<WeeklyAnalytics>;
    },
    refetchInterval: 60000
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchRealtime();
    refetchWeekly();
    refetchZoom();
  };

  // Professional chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12, family: 'Inter, sans-serif', weight: '600' },
          color: GI_COLORS.dark,
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: GI_COLORS.gold,
        bodyColor: '#fff',
        borderColor: GI_COLORS.gold,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(16, 66, 32, 0.1)' },
        ticks: {
          font: { size: 11, family: 'Inter, sans-serif' },
          color: GI_COLORS.dark
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, family: 'Inter, sans-serif' },
          color: GI_COLORS.dark
        }
      }
    }
  };

  // Calculate variance (difference between target and actual)
  const targetSlots = 48; // Total slots per day
  const actualData = weeklyData?.daily_breakdown?.map(d => d.attended_count) || [0, 0, 0, 0, 0, 0, 0];
  const varianceData = actualData.map(actual => targetSlots - actual);

  // Prepare weekly participation chart data with GI brand colors
  const rawWeeklyData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Actual',
        data: actualData,
        backgroundColor: '#104220', // GI Primary Green
        borderColor: '#104220',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Variance',
        data: varianceData,
        backgroundColor: '#D2AA68', // GI Gold
        borderColor: '#D2AA68',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Target',
        data: Array(7).fill(targetSlots),
        backgroundColor: '#F5E6D3', // Light Gold/Cream for target
        borderColor: '#D2AA68',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };
  const weeklyParticipationData = enhanceAnalyticsData(rawWeeklyData, 'attendance');

  // Zoom participants trend with GI brand colors
  const rawZoomTrendData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Zoom Participants',
        data: weeklyData?.daily_breakdown?.map(d => d.total_participants || 0) || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(16, 66, 32, 0.1)', // GI Green with transparency
        borderColor: '#104220', // GI Primary Green
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#104220',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };
  const zoomTrendData = enhanceAnalyticsData(rawZoomTrendData, 'weeklyTrend');

  // Coverage rate visualization with GI brand colors
  const coverageData = {
    labels: ['Covered', 'Uncovered'],
    datasets: [{
      data: [
        weeklyData?.attendance_summary?.attended_count || 0,
        (weeklyData?.attendance_summary?.total_records || 0) - (weeklyData?.attendance_summary?.attended_count || 0)
      ],
      backgroundColor: ['#104220', '#D2AA68'], // GI Primary Green and Gold
      borderColor: ['#fff', '#fff'],
      borderWidth: 3
    }]
  };

  const exportData = async (type: string) => {
    try {
      const payload = {
        generated_at: new Date().toISOString(),
        report_date: reportDate,
        realtime: realtimeData,
        weekly: weeklyData,
        zoom: zoomData,
        total_slots_available: 336
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GI_Weekly_Report_${new Date().toISOString().split('T')[0]}.json`;
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
      {/* Header with Report Date */}
      <Card className="border-gi-primary/30 bg-gradient-to-r from-gi-primary/10 to-gi-gold/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gi-dark">Prayer Platform Weekly Report</h2>
              <p className="text-gi-dark/80 mt-1">{reportDate}</p>
            </div>
            <Badge className="bg-gi-primary text-white px-4 py-2 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              {dayjs().format('DD MMM YYYY')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics - Professional Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-gi-primary/20 bg-gradient-to-br from-gi-primary/5 to-gi-primary/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gi-primary uppercase tracking-wide">Weekly Coverage</p>
                  <p className="text-3xl font-bold text-gi-primary mt-2">
                    {weeklyData?.attendance_summary?.attendance_rate || 0}%
                  </p>
                  <p className="text-xs text-gi-dark/70 mt-2 font-medium">
                    {weeklyData?.attendance_summary?.attended_count || 0} / {weeklyData?.attendance_summary?.total_records || 0} slots
                  </p>
                </div>
                <div className="p-3 bg-gi-primary/20 rounded-xl">
                  <Target className="w-8 h-8 text-gi-primary" />
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
          <Card className="border-gi-gold/30 bg-gradient-to-br from-gi-gold/10 to-gi-gold/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gi-dark uppercase tracking-wide">Zoom Meetings</p>
                  <p className="text-3xl font-bold text-gi-dark mt-2">
                    {zoomData?.totalMeetings || weeklyData?.zoom_meetings?.total_meetings || 0}
                  </p>
                  <p className="text-xs text-gi-dark/70 mt-2 font-medium">
                    {zoomData?.totalParticipants || weeklyData?.zoom_meetings?.total_participants || 0} total participants
                  </p>
                </div>
                <div className="p-3 bg-gi-gold/30 rounded-xl">
                  <Video className="w-8 h-8 text-gi-dark" />
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
          <Card className="border-gi-primary/30 bg-gradient-to-br from-gi-primary/10 to-gi-primary/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gi-primary uppercase tracking-wide">Avg Participants</p>
                  <p className="text-3xl font-bold text-gi-primary mt-2">
                    {zoomData?.avgParticipants || weeklyData?.zoom_meetings?.avg_participants || 0}
                  </p>
                  <p className="text-xs text-gi-primary/70 mt-2 font-medium">
                    per Zoom session
                  </p>
                </div>
                <div className="p-3 bg-gi-primary/20 rounded-xl">
                  <Users className="w-8 h-8 text-gi-primary" />
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
          <Card className="border-gi-gold/30 bg-gradient-to-br from-gi-gold/5 to-gi-gold/15 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gi-dark uppercase tracking-wide">Growth Rate</p>
                  <p className="text-3xl font-bold text-gi-dark mt-2 flex items-center gap-2">
                    {zoomData?.participantGrowth || '+0%'}
                    {(zoomData?.participantGrowth?.includes('+') || false) ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </p>
                  <p className="text-xs text-gi-dark/70 mt-2 font-medium">
                    participant growth
                  </p>
                </div>
                <div className="p-3 bg-gi-gold/30 rounded-xl">
                  <Activity className="w-8 h-8 text-gi-dark" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Professional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Participation Chart */}
        <Card className="border-gi-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
            <CardTitle className="text-lg font-bold text-gi-dark flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gi-primary" />
              Weekly Participation Analysis
            </CardTitle>
            <p className="text-sm text-gi-dark/70 mt-1">Actual attendance, variance from target, and target slots (48/day)</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80">
              <Bar data={weeklyParticipationData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Zoom Participants Trend */}
        <Card className="border-gi-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
            <CardTitle className="text-lg font-bold text-gi-dark flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-gi-primary" />
              Zoom Participants Trend
            </CardTitle>
            <p className="text-sm text-gi-dark/70 mt-1">Weekly Zoom meeting participation</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80">
              <Line data={zoomTrendData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Coverage Rate Doughnut */}
        <Card className="border-gi-gold/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gi-gold/10 to-gi-primary/10 border-b border-gi-gold/20">
            <CardTitle className="text-lg font-bold text-gi-dark flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-gi-gold" />
              Overall Coverage Rate
            </CardTitle>
            <p className="text-sm text-gi-dark/70 mt-1">Weekly slot coverage distribution</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 flex items-center justify-center">
              <Doughnut 
                data={coverageData} 
                options={{
                  ...chartOptions,
                  cutout: '65%',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      position: 'bottom' as const
                    }
                  }
                }} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Card className="border-gi-gold/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gi-gold/10 to-gi-primary/10 border-b border-gi-gold/20">
            <CardTitle className="text-lg font-bold text-gi-dark flex items-center gap-2">
              <Award className="w-5 h-5 text-gi-gold" />
              Key Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gi-primary/10 rounded-lg">
                <span className="text-sm font-semibold text-gi-dark">Total Slots Available:</span>
                <span className="text-lg font-bold text-gi-primary">336</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gi-gold/10 rounded-lg">
                <span className="text-sm font-semibold text-gi-dark">Slots Covered:</span>
                <span className="text-lg font-bold text-gi-dark">{weeklyData?.attendance_summary?.attended_count || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gi-primary/10 rounded-lg">
                <span className="text-sm font-semibold text-gi-dark">Avg Session Duration:</span>
                <span className="text-lg font-bold text-gi-primary">{weeklyData?.attendance_summary?.avg_duration_minutes || 0} min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gi-gold/10 rounded-lg">
                <span className="text-sm font-semibold text-gi-dark">Highest Coverage Day:</span>
                <span className="text-lg font-bold text-gi-dark">
                  {weeklyData?.daily_breakdown?.reduce((max, day) => 
                    day.attended_count > (max?.attended_count || 0) ? day : max
                  )?.date ? dayjs(weeklyData.daily_breakdown.reduce((max, day) => 
                    day.attended_count > (max?.attended_count || 0) ? day : max
                  ).date).format('dddd') : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

  if (realtimeLoading || weeklyLoading || zoomLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gi-primary/600 border-t-transparent mx-auto"></div>
          <p className="text-gi-dark/80 font-medium">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gi-primary/5 min-h-screen">
      {/* Professional Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-lg border border-gi-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-gi-primary to-gi-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gi-dark">Global Intercessors Analytics</h1>
            <p className="text-gi-dark/70 mt-1 font-medium">
              Professional Weekly Report & Zoom Integration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="border-gi-primary hover:bg-gi-primary hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => exportData('report')}
            className="bg-gradient-to-r from-gi-primary to-gi-primary/90 hover:from-gi-primary/90 hover:to-gi-primary text-white shadow-lg"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Content - Professional Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-gi-primary/20 p-1 rounded-lg shadow-md">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-gi-primary data-[state=active]:text-white rounded-md transition-all"
          >
            <Eye className="w-4 h-4 mr-2" />
            Weekly Report
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="data-[state=active]:bg-gi-primary data-[state=active]:text-white rounded-md transition-all"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Detailed Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <WeeklyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

