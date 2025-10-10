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

interface GIWeeklyReport {
  report_date: string;
  total_slots_available: number;
  current_week: {
    total_slots_covered: number;
    daily_coverage: {
      Sunday?: number;
      Monday?: number;
      Tuesday?: number;
      Wednesday?: number;
      Thursday?: number;
      Friday?: number;
      Saturday?: number;
    };
    percentage_change: number;
  };
  previous_week: {
    total_slots_covered: number;
    daily_coverage: {
      Sunday?: number;
      Monday?: number;
      Tuesday?: number;
      Wednesday?: number;
      Thursday?: number;
      Friday?: number;
      Saturday?: number;
    };
  };
  calculated_metrics: {
    coverage_rate: number;
    average_daily_coverage: number;
    total_variance: number;
    highest_day: string;
    lowest_day: string;
  };
  platform_manning_consistent_intercessors: string[];
  week_comparison: {
    slots_difference: number;
    percentage_change: number;
    trend: 'increase' | 'decrease' | 'stable';
  };
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
  const [activeTab, setActiveTab] = useState('gi-report');
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

  // Fetch GI Weekly Report
  const { data: giReportData, isLoading: giReportLoading, refetch: refetchGIReport } = useQuery({
    queryKey: ['gi-weekly-report', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/gi-weekly-report');
      if (!response.ok) throw new Error('Failed to fetch GI weekly report');
      return response.json() as Promise<GIWeeklyReport>;
    },
    refetchInterval: 60000
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchRealtime();
    refetchWeekly();
    refetchZoom();
    refetchGIReport();
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

  const GIReportTab = ({ data, isLoading }: { data?: GIWeeklyReport; isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gi-primary"></div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center p-12 text-gray-500">
          No report data available
        </div>
      );
    }

    const dailyCoverageLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentWeekValues = dailyCoverageLabels.map(day => data.current_week.daily_coverage[day as keyof typeof data.current_week.daily_coverage] || 0);
    const previousWeekValues = dailyCoverageLabels.map(day => data.previous_week.daily_coverage[day as keyof typeof data.previous_week.daily_coverage] || 0);
    
    // Calculate variance and target for visualization
    const targetPerDay = 48; // Expected coverage per day
    const targetValues = dailyCoverageLabels.map(() => targetPerDay);
    const varianceValues = currentWeekValues.map(value => value - targetPerDay);

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <Card className="border-gi-primary/30 bg-gradient-to-r from-gi-primary/10 to-gi-gold/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gi-primary mb-1">
                  Global Intercessors Weekly Report
                </h2>
                <p className="text-sm text-gray-600">{data.report_date}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gi-primary">
                  {data.current_week.total_slots_covered}/{data.total_slots_available}
                </div>
                <p className="text-sm text-gray-600">Slots Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gi-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Coverage Rate</p>
                  <div className="text-2xl font-bold text-gi-primary">
                    {data.calculated_metrics.coverage_rate}%
                  </div>
                </div>
                <Target className="w-8 h-8 text-gi-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gi-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Daily Coverage</p>
                  <div className="text-2xl font-bold text-gi-primary">
                    {data.calculated_metrics.average_daily_coverage}
                  </div>
                </div>
                <Calendar className="w-8 h-8 text-gi-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gi-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Weekly Trend</p>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${
                      data.week_comparison.trend === 'increase' ? 'text-green-600' :
                      data.week_comparison.trend === 'decrease' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {data.week_comparison.percentage_change > 0 ? '+' : ''}{data.week_comparison.percentage_change}%
                    </div>
                    {data.week_comparison.trend === 'increase' ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : data.week_comparison.trend === 'decrease' ? (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    ) : (
                      <Activity className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gi-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Variance</p>
                  <div className="text-2xl font-bold text-gi-primary">
                    {data.calculated_metrics.total_variance}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.calculated_metrics.highest_day} → {data.calculated_metrics.lowest_day}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-gi-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Coverage Comparison Chart with Variance */}
        <Card className="border-gi-primary/20">
          <CardHeader>
            <CardTitle className="text-gi-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Coverage with Variance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Bar
                data={{
                  labels: dailyCoverageLabels,
                  datasets: [
                    {
                      label: 'Target',
                      data: targetValues,
                      backgroundColor: 'rgba(209, 213, 219, 0.6)', // Light gray
                      borderRadius: 6,
                      barThickness: 30,
                    },
                    {
                      label: 'Variance',
                      data: varianceValues, // Show all variance (positive and negative)
                      backgroundColor: varianceValues.map(v => v >= 0 ? GI_COLORS.success : GI_COLORS.danger), // Green for above target, Red for below
                      borderRadius: 6,
                      barThickness: 30,
                    },
                    {
                      label: 'Actual',
                      data: currentWeekValues,
                      backgroundColor: GI_COLORS.gold, // Gold for actual
                      borderRadius: 6,
                      barThickness: 30,
                    }
                  ]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          if (label === 'Variance') {
                            const actualValue = currentWeekValues[context.dataIndex];
                            const variance = actualValue - targetPerDay;
                            return `${label}: ${variance >= 0 ? '+' : ''}${variance} (${variance >= 0 ? 'above' : 'below'} target)`;
                          }
                          return `${label}: ${value}`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: GI_COLORS.gold }}></div>
                <span className="text-gray-600">Actual Coverage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: GI_COLORS.success }}></div>
                <span className="text-gray-600">Above Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: GI_COLORS.danger }}></div>
                <span className="text-gray-600">Below Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300"></div>
                <span className="text-gray-600">Target (48/day)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Comparison Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-gi-primary/20">
            <CardHeader>
              <CardTitle className="text-gi-primary">Current Week Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Slots Covered:</span>
                <span className="font-bold text-gi-primary text-lg">
                  {data.current_week.total_slots_covered}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Out of Available:</span>
                <span className="font-bold text-gi-primary text-lg">
                  {data.total_slots_available}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Coverage Rate:</span>
                <Badge className="bg-gi-primary text-white">
                  {data.calculated_metrics.coverage_rate}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gi-primary/20">
            <CardHeader>
              <CardTitle className="text-gi-primary">Week-to-Week Change</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Slots Difference:</span>
                <span className={`font-bold text-lg ${
                  data.week_comparison.slots_difference > 0 ? 'text-green-600' :
                  data.week_comparison.slots_difference < 0 ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {data.week_comparison.slots_difference > 0 ? '+' : ''}{data.week_comparison.slots_difference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Percentage Change:</span>
                <Badge className={
                  data.week_comparison.trend === 'increase' ? 'bg-green-600 text-white' :
                  data.week_comparison.trend === 'decrease' ? 'bg-red-600 text-white' :
                  'bg-gray-600 text-white'
                }>
                  {data.week_comparison.percentage_change > 0 ? '+' : ''}{data.week_comparison.percentage_change}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Trend:</span>
                <Badge className={
                  data.week_comparison.trend === 'increase' ? 'bg-green-100 text-green-800' :
                  data.week_comparison.trend === 'decrease' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {data.week_comparison.trend.charAt(0).toUpperCase() + data.week_comparison.trend.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consistent Intercessors */}
        {data.platform_manning_consistent_intercessors.length > 0 && (
          <Card className="border-gi-primary/20">
            <CardHeader>
              <CardTitle className="text-gi-primary flex items-center gap-2">
                <Award className="w-5 h-5" />
                Platform Manning Consistent Intercessors ({data.platform_manning_consistent_intercessors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.platform_manning_consistent_intercessors.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gi-primary/5 rounded-md"
                    >
                      <Award className="w-4 h-4 text-gi-gold flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{email}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

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

  const WeeklyTab = () => {
    if (weeklyLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/60 border-t-transparent mx-auto"></div>
            <p className="text-gi-dark/80">Loading detailed analysis...</p>
          </div>
        </div>
      );
    }

    if (!weeklyData) {
      return (
        <div className="text-center p-12">
          <div className="text-gi-dark/60">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No weekly data available</p>
            <p className="text-sm mt-2">Data will appear once prayer sessions are recorded</p>
          </div>
        </div>
      );
    }

    return (
    <div className="space-y-6">
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

          {/* Advanced Analytics Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gi-primary mb-6 flex items-center gap-2">
              <LineChartIcon className="w-6 h-6 text-gi-gold" />
              Advanced Insights & Trends
            </h2>

            {/* Daily Attendance Trend */}
            <Card className="mb-6 border-gi-primary/30 bg-gradient-to-br from-white to-gi-primary/5">
              <CardHeader>
                <CardTitle className="text-gi-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gi-gold" />
                  Daily Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <Line
                    data={{
                      labels: weeklyData.daily_breakdown?.map(day => dayjs(day.date).format('ddd, MMM D')) || [],
                      datasets: [
                        {
                          label: 'Attendance Rate',
                          data: weeklyData.daily_breakdown?.map(day => day.attendance_rate) || [],
                          borderColor: GI_COLORS.primary,
                          backgroundColor: `${GI_COLORS.primary}20`,
                          fill: true,
                          tension: 0.4,
                          borderWidth: 3,
                          pointRadius: 6,
                          pointHoverRadius: 8,
                          pointBackgroundColor: GI_COLORS.gold,
                          pointBorderColor: GI_COLORS.primary,
                          pointBorderWidth: 2,
                        },
                        {
                          label: 'Attended',
                          data: weeklyData.daily_breakdown?.map(day => day.attended_count) || [],
                          borderColor: GI_COLORS.success,
                          backgroundColor: `${GI_COLORS.success}20`,
                          fill: true,
                          tension: 0.4,
                          borderWidth: 2,
                        },
                        {
                          label: 'Missed',
                          data: weeklyData.daily_breakdown?.map(day => day.missed_count) || [],
                          borderColor: GI_COLORS.danger,
                          backgroundColor: `${GI_COLORS.danger}20`,
                          fill: true,
                          tension: 0.4,
                          borderWidth: 2,
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(16, 66, 32, 0.1)',
                          },
                          ticks: {
                            color: GI_COLORS.dark,
                          }
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                          ticks: {
                            color: GI_COLORS.dark,
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-gi-primary/20 bg-gradient-to-br from-gi-primary/10 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gi-dark/70">Avg Duration</p>
                        <p className="text-3xl font-bold text-gi-primary mt-2">
                          {weeklyData.attendance_summary.avg_duration_minutes}
                          <span className="text-lg font-normal text-gi-dark/70 ml-1">min</span>
                        </p>
                        <p className="text-xs text-gi-dark/60 mt-1">Per session</p>
                      </div>
                      <Clock className="w-12 h-12 text-gi-gold/60" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="border-gi-gold/20 bg-gradient-to-br from-gi-gold/10 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gi-dark/70">Active Slots</p>
                        <p className="text-3xl font-bold text-gi-primary mt-2">
                          {weeklyData.slot_coverage.active_slots}
                          <span className="text-lg font-normal text-gi-dark/70 ml-1">
                            /{weeklyData.slot_coverage.total_slots}
                          </span>
                        </p>
                        <p className="text-xs text-gi-dark/60 mt-1">
                          {weeklyData.slot_coverage.coverage_rate}% coverage
                        </p>
                      </div>
                      <Target className="w-12 h-12 text-gi-primary/60" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="border-gi-success/20 bg-gradient-to-br from-gi-success/10 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gi-dark/70">Attendance Rate</p>
                        <p className="text-3xl font-bold text-gi-success mt-2">
                          {weeklyData.attendance_summary.attendance_rate}%
                        </p>
                        <p className="text-xs text-gi-dark/60 mt-1">
                          {weeklyData.attendance_summary.attended_count} attended
                        </p>
                      </div>
                      <BarChart3 className="w-12 h-12 text-gi-success/60" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card className="border-gi-primary/20 bg-gradient-to-br from-gi-primary/10 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gi-dark/70">Total Participants</p>
                        <p className="text-3xl font-bold text-gi-primary mt-2">
                          {weeklyData.zoom_meetings.total_participants}
                        </p>
                        <p className="text-xs text-gi-dark/60 mt-1">
                          Across {weeklyData.zoom_meetings.total_meetings} meetings
                        </p>
                      </div>
                      <Users className="w-12 h-12 text-gi-gold/60" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Daily Performance Breakdown */}
            <Card className="border-gi-gold/30 bg-gradient-to-br from-gi-gold/5 to-white">
              <CardHeader>
                <CardTitle className="text-gi-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gi-gold" />
                  Daily Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyData.daily_breakdown?.map((day, index) => (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gi-primary/20 hover:border-gi-gold/50 transition-colors"
                    >
                      <div className="w-20">
                        <p className="text-sm font-bold text-gi-primary">
                          {dayjs(day.date).format('ddd')}
                        </p>
                        <p className="text-xs text-gi-dark/60">
                          {dayjs(day.date).format('MMM D')}
                        </p>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-gi-success to-gi-primary transition-all duration-500"
                              style={{ width: `${day.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gi-primary w-12 text-right">
                            {day.attendance_rate}%
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-gi-dark/70">
                          <span>✓ {day.attended_count} attended</span>
                          <span>✗ {day.missed_count} missed</span>
                          <span>🎥 {day.zoom_meetings} meetings</span>
                          <span>👥 {day.total_participants} participants</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {day.attendance_rate >= 80 ? (
                          <Badge className="bg-gi-success text-white">Excellent</Badge>
                        ) : day.attendance_rate >= 60 ? (
                          <Badge className="bg-gi-gold text-white">Good</Badge>
                        ) : (
                          <Badge className="bg-gi-danger text-white">Needs Attention</Badge>
                        )}
                      </div>
                    </motion.div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
  };

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
            onClick={() => {
              window.open('/api/admin/analytics/download-pdf-report', '_blank');
            }}
            className="bg-gradient-to-r from-gi-gold to-gi-gold/90 hover:from-gi-gold/90 hover:to-gi-gold text-white shadow-lg"
            size="sm"
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF Report
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
            value="gi-report" 
            className="data-[state=active]:bg-gi-primary data-[state=active]:text-white rounded-md transition-all"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            GI Weekly Report
          </TabsTrigger>
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

        <TabsContent value="gi-report" className="mt-6">
          <GIReportTab 
            data={giReportData} 
            isLoading={giReportLoading}
          />
        </TabsContent>

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

