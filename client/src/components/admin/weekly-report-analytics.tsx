import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Activity
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

interface WeeklyReportData {
  report_date: string;
  total_slots_available: number;
  current_week: {
    total_slots_covered: number;
    daily_coverage: {
      [key: string]: number;
    };
  };
  previous_week: {
    total_slots_covered: number;
    daily_coverage: {
      [key: string]: number;
    };
  };
  efz_prayer_program: {
    week_number: number;
    wednesday_session: {
      participants: number;
      gi_participants: number;
      participation_rate: string;
      decline_from_last_week?: string;
    };
    sunday_session: {
      participants: number;
      gi_participants: number;
      participation_rate: string;
    };
  };
  platform_manning_consistent_intercessors: string[];
  coverage_analysis: {
    highest_coverage_day: string;
    lowest_coverage_day: string;
    coverage_rate: number;
    average_daily_coverage: number;
    total_variance: number;
  };
}

export function WeeklyReportAnalytics() {
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch weekly report data
  const { data: weeklyData, isLoading, refetch } = useQuery({
    queryKey: ['weekly-report-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/weekly-report-data');
      if (!response.ok) throw new Error('Failed to fetch weekly report data');
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (weeklyData) {
      setReportData(weeklyData);
    }
  }, [weeklyData]);

  // Generate sample data for demonstration
  const sampleData: WeeklyReportData = {
    report_date: "16-22 June 2025",
    total_slots_available: 336,
    current_week: {
      total_slots_covered: 238,
      daily_coverage: {
        Monday: 35,
        Tuesday: 32,
        Wednesday: 30,
        Thursday: 39,
        Friday: 34,
        Saturday: 30,
        Sunday: 35
      }
    },
    previous_week: {
      total_slots_covered: 242,
      daily_coverage: {
        Monday: 43,
        Tuesday: 30,
        Wednesday: 30,
        Thursday: 30,
        Friday: 30,
        Saturday: 25,
        Sunday: 25
      }
    },
    efz_prayer_program: {
      week_number: 11,
      wednesday_session: {
        participants: 22,
        gi_participants: 13,
        participation_rate: "59%",
        decline_from_last_week: "28%"
      },
      sunday_session: {
        participants: 21,
        gi_participants: 17,
        participation_rate: "77%"
      }
    },
    platform_manning_consistent_intercessors: [
      "Ms. Nyarai Seda", "Mrs. Ruth Sango", "Ms. Petronella Maramba",
      "Mr. Joseph Muleya", "Ms. Susan Mashiri", "Mr. Nyasha Mungure",
      "Mrs. Lisa Ncube", "Mr. Kimberly Mukupe", "Ms Blessing Mawereza",
      "Ms. Shanissi Mutanga", "Mr. Godknows Mugaduyi", "Ms. Blessing Siboniso",
      "Ms. Marrymore Matewe", "Mr. Tawanda Mubako", "Ms. Vimbai Debwe",
      "Dr. Rejoice Nharaunda", "Ms. Bethel Mutyandaedza"
    ],
    coverage_analysis: {
      highest_coverage_day: "Thursday",
      lowest_coverage_day: "Saturday",
      coverage_rate: 71,
      average_daily_coverage: 34,
      total_variance: 98
    }
  };

  const data = reportData || sampleData;

  // Chart configurations
  const dailyCoverageChartData = {
    labels: Object.keys(data.current_week.daily_coverage),
    datasets: [
      {
        label: 'Current Week',
        data: Object.values(data.current_week.daily_coverage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Previous Week',
        data: Object.values(data.previous_week.daily_coverage),
        backgroundColor: 'rgba(156, 163, 175, 0.5)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const coverageRateData = {
    labels: ['Covered', 'Uncovered'],
    datasets: [
      {
        data: [data.current_week.total_slots_covered, data.total_slots_available - data.current_week.total_slots_covered],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y} slots`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const percentage = ((context.parsed / data.total_slots_available) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} slots (${percentage}%)`;
          }
        }
      }
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/generate-weekly-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Global_Intercessors_Weekly_Report_${data.report_date.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Intercessors Weekly Report</h1>
          <p className="text-gray-600 mt-1">Analytics Dashboard for {data.report_date}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Coverage</p>
                  <p className="text-2xl font-bold text-blue-900">{data.coverage_analysis.coverage_rate}%</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {data.current_week.total_slots_covered} / {data.total_slots_available} slots
                  </p>
                </div>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
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
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Weekly Change</p>
                  <p className="text-2xl font-bold text-green-900 flex items-center">
                    {data.current_week.total_slots_covered - data.previous_week.total_slots_covered > 0 ? '+' : ''}
                    {data.current_week.total_slots_covered - data.previous_week.total_slots_covered}
                    {data.current_week.total_slots_covered - data.previous_week.total_slots_covered > 0 ? (
                      <TrendingUp className="w-4 h-4 ml-1 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 ml-1 text-red-600" />
                    )}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {((data.current_week.total_slots_covered - data.previous_week.total_slots_covered) / data.previous_week.total_slots_covered * 100).toFixed(1)}% change
                  </p>
                </div>
                <div className="p-2 bg-green-200 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600" />
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
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Daily Average</p>
                  <p className="text-2xl font-bold text-purple-900">{data.coverage_analysis.average_daily_coverage}</p>
                  <p className="text-xs text-purple-700 mt-1">slots per day</p>
                </div>
                <div className="p-2 bg-purple-200 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
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
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Consistent Intercessors</p>
                  <p className="text-2xl font-bold text-orange-900">{data.platform_manning_consistent_intercessors.length}</p>
                  <p className="text-xs text-orange-700 mt-1">active members</p>
                </div>
                <div className="p-2 bg-orange-200 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Coverage Chart */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Daily Participation Analysis
            </CardTitle>
            <p className="text-sm text-gray-600">
              Comparison of daily slot coverage between current and previous week
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={dailyCoverageChartData} options={chartOptions} />
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Highest Coverage:</strong> {data.coverage_analysis.highest_coverage_day} ({data.current_week.daily_coverage[data.coverage_analysis.highest_coverage_day]} slots)
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Lowest Coverage:</strong> {data.coverage_analysis.lowest_coverage_day} ({data.current_week.daily_coverage[data.coverage_analysis.lowest_coverage_day]} slots)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Rate Doughnut */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Overall Coverage Rate
            </CardTitle>
            <p className="text-sm text-gray-600">
              Visual representation of slot coverage for the current week
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={coverageRateData} options={doughnutOptions} />
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Coverage Rate:</strong> {data.coverage_analysis.coverage_rate}% ({data.current_week.total_slots_covered}/{data.total_slots_available})
              </p>
              <p className="text-sm text-green-800 mt-1">
                <strong>Total Variance:</strong> {data.coverage_analysis.total_variance} slots uncovered
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EFZ Prayer Program */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            EFZ Led Prayer Program - Week {data.efz_prayer_program.week_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Wednesday Session</h4>
              <div className="space-y-2">
                <p className="text-sm text-purple-800">
                  <strong>Total Participants:</strong> {data.efz_prayer_program.wednesday_session.participants}
                </p>
                <p className="text-sm text-purple-800">
                  <strong>GI Participants:</strong> {data.efz_prayer_program.wednesday_session.gi_participants}
                </p>
                <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                  {data.efz_prayer_program.wednesday_session.participation_rate} participation
                </Badge>
                {data.efz_prayer_program.wednesday_session.decline_from_last_week && (
                  <p className="text-sm text-red-600">
                    {data.efz_prayer_program.wednesday_session.decline_from_last_week} decline from last week
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Sunday Session</h4>
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>Total Participants:</strong> {data.efz_prayer_program.sunday_session.participants}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>GI Participants:</strong> {data.efz_prayer_program.sunday_session.gi_participants}
                </p>
                <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                  {data.efz_prayer_program.sunday_session.participation_rate} participation
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consistent Intercessors */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-600" />
            Platform Manning - Consistent Intercessors
          </CardTitle>
          <p className="text-sm text-gray-600">
            Members who consistently covered prayer slots throughout the week
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.platform_manning_consistent_intercessors.map((name, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                    <span className="text-orange-700 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-orange-900">{name}</span>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}