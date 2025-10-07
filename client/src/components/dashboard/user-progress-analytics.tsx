
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Clock, Award, Target } from "lucide-react";

interface UserProgressAnalyticsProps {
  userId: string;
}

export function UserProgressAnalytics({ userId }: UserProgressAnalyticsProps) {
  // Fetch user's attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ['user-attendance-analytics', userId],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/${userId}?limit=30`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Fetch Zoom participation data
  const { data: zoomData } = useQuery({
    queryKey: ['user-zoom-analytics', userId],
    queryFn: async () => {
      const response = await fetch(`/api/zoom/user-stats/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch zoom data');
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Process data for charts
  const weeklyData = attendanceData?.slice(0, 7).reverse().map((day: any, index: number) => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(day.date).getDay()],
    attended: day.attended ? 1 : 0,
    duration: day.duration_minutes || 0,
  })) || [];

  const monthlyTrend = attendanceData?.reduce((acc: any[], curr: any) => {
    const week = Math.floor((new Date(curr.date).getDate() - 1) / 7);
    if (!acc[week]) acc[week] = { week: `Week ${week + 1}`, sessions: 0, avgDuration: 0 };
    acc[week].sessions += curr.attended ? 1 : 0;
    acc[week].avgDuration = (acc[week].avgDuration + (curr.duration_minutes || 0)) / 2;
    return acc;
  }, []) || [];

  const consistencyScore = attendanceData ? 
    Math.round((attendanceData.filter((d: any) => d.attended).length / attendanceData.length) * 100) : 0;

  const streakData = [
    { name: 'Current Streak', value: attendanceData?.currentStreak || 0, color: '#104220' },
    { name: 'Best Streak', value: attendanceData?.bestStreak || 0, color: '#D2AA68' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gi-primary to-gi-primary/80 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Consistency Score</p>
                <p className="text-3xl font-bold mt-1">{consistencyScore}%</p>
              </div>
              <Target className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gi-gold to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Current Streak</p>
                <p className="text-3xl font-bold mt-1">{attendanceData?.currentStreak || 0}</p>
              </div>
              <Award className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Zoom Meetings</p>
                <p className="text-3xl font-bold mt-1">{zoomData?.totalMeetings || 0}</p>
              </div>
              <Calendar className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avg Duration</p>
                <p className="text-3xl font-bold mt-1">{zoomData?.avgDuration || 0}<span className="text-lg">m</span></p>
              </div>
              <Clock className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Attendance Pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gi-primary">
            <TrendingUp className="w-5 h-5" />
            Weekly Attendance Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
              <XAxis dataKey="day" tick={{ fill: '#104220', fontSize: 12 }} />
              <YAxis tick={{ fill: '#104220', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#104220', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value, name) => [
                  name === 'attended' ? (value === 1 ? 'Attended' : 'Missed') : `${value} min`,
                  name === 'attended' ? 'Status' : 'Duration'
                ]}
              />
              <Bar dataKey="attended" fill="#104220" radius={[8, 8, 0, 0]} />
              <Bar dataKey="duration" fill="#D2AA68" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Progress Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gi-primary">Monthly Progress Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E9" />
              <XAxis dataKey="week" tick={{ fill: '#104220', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#104220', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#D2AA68', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#104220', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="sessions" 
                stroke="#104220" 
                strokeWidth={3}
                dot={{ fill: '#104220', r: 5 }}
                name="Sessions"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avgDuration" 
                stroke="#D2AA68" 
                strokeWidth={3}
                dot={{ fill: '#D2AA68', r: 5 }}
                name="Avg Duration (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Streak Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gi-primary">Streak Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={streakData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {streakData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-4">
              {streakData.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card className="bg-gradient-to-br from-gi-primary/5 to-gi-gold/5">
          <CardHeader>
            <CardTitle className="text-gi-primary">Performance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gi-primary">Best Day</span>
              <span className="text-lg font-bold text-gi-gold">
                {weeklyData.reduce((best: any, day: any) => 
                  day.attended > (best?.attended || 0) ? day : best, {})?.day || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gi-primary">Longest Session</span>
              <span className="text-lg font-bold text-gi-gold">
                {Math.max(...weeklyData.map((d: any) => d.duration))} min
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gi-primary">Weekly Goal</span>
              <span className="text-lg font-bold text-gi-gold">
                {weeklyData.filter((d: any) => d.attended === 1).length}/7
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
