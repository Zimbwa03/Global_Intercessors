import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { 
  Clock, 
  Users, 
  Calendar, 
  Activity,
  TrendingUp,
  MapPin,
  Phone
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface MobileChartsProps {
  prayerSlots: any[];
  intercessors: any[];
  fastingRegistrations: any[];
  updates: any[];
}

function MobileCharts({ 
  prayerSlots, 
  intercessors, 
  fastingRegistrations, 
  updates 
}: MobileChartsProps) {
  const isMobile = useIsMobile();

  // Process prayer slots data for time distribution
  const getSlotTimeDistribution = () => {
    const timeSlots = new Map();
    
    prayerSlots.forEach(slot => {
      if (slot.slotTime) {
        const hour = slot.slotTime.split('–')[0].split(':')[0];
        const timeRange = `${hour}:00`;
        timeSlots.set(timeRange, (timeSlots.get(timeRange) || 0) + 1);
      }
    });

    const sortedSlots = Array.from(timeSlots.entries())
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, isMobile ? 6 : 12);

    return {
      labels: sortedSlots.map(([time]) => time),
      datasets: [{
        label: 'Active Slots',
        data: sortedSlots.map(([, count]) => count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }]
    };
  };

  // Process fasting registration regions
  const getRegionDistribution = () => {
    const regions = new Map();
    
    fastingRegistrations.forEach(reg => {
      if (reg.region) {
        regions.set(reg.region, (regions.get(reg.region) || 0) + 1);
      }
    });

    const sortedRegions = Array.from(regions.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, isMobile ? 4 : 8);

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)', 
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(34, 197, 94, 0.8)'
    ];

    return {
      labels: sortedRegions.map(([region]) => region),
      datasets: [{
        data: sortedRegions.map(([, count]) => count),
        backgroundColor: colors.slice(0, sortedRegions.length),
        borderWidth: 0,
      }]
    };
  };

  // Process activity trend over time (last 7 days)
  const getActivityTrend = () => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const activityData = last7Days.map(date => {
      const dayActivities = [
        ...prayerSlots.filter(slot => slot.createdAt?.startsWith(date)),
        ...fastingRegistrations.filter(reg => reg.created_at?.startsWith(date)),
        ...updates.filter(update => update.created_at?.startsWith(date))
      ];
      return dayActivities.length;
    });

    return {
      labels: last7Days.map(date => {
        const d = new Date(date);
        return isMobile ? d.toLocaleDateString('en', { weekday: 'short' }) : d.toLocaleDateString();
      }),
      datasets: [{
        label: 'Daily Activity',
        data: activityData,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: isMobile ? 3 : 4,
        pointHoverRadius: isMobile ? 5 : 6,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !isMobile,
        position: 'top' as const,
        labels: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      tooltip: {
        titleFont: {
          size: isMobile ? 11 : 13
        },
        bodyFont: {
          size: isMobile ? 10 : 12
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: isMobile ? 9 : 11
          },
          maxRotation: isMobile ? 45 : 0
        }
      },
      y: {
        ticks: {
          font: {
            size: isMobile ? 9 : 11
          }
        }
      }
    }
  };

  // Mobile-optimized list visualization for regions

  // Compact stats cards for mobile
  const StatCard = ({ icon: Icon, label, value, color, trend }: {
    icon: any;
    label: string;
    value: number;
    color: string;
    trend?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-600' : 'text-gray-500'}`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend > 0 ? '+' : ''}{trend}
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 truncate">{label}</p>
      </div>
    </motion.div>
  );

  // Data table component for mobile
  const CompactDataTable = ({ title, data, icon: Icon, maxItems = 5 }: {
    title: string;
    data: any[];
    icon: any;
    maxItems?: number;
  }) => (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Icon className="w-4 h-4 mr-2" />
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {data.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className={isMobile ? "h-32" : "h-40"}>
          <div className="space-y-2">
            {data.slice(0, maxItems).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  {title === "Recent Prayer Slots" && (
                    <>
                      <p className="font-medium text-sm truncate">{item.slotTime}</p>
                      <p className="text-xs text-gray-500 truncate">{item.userEmail}</p>
                    </>
                  )}
                  {title === "Recent Registrations" && (
                    <>
                      <p className="font-medium text-sm truncate">{item.full_name}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {item.region}
                      </p>
                    </>
                  )}
                  {title === "Active Intercessors" && (
                    <>
                      <p className="font-medium text-sm truncate">{item.name || item.email}</p>
                      <p className="text-xs text-gray-500">{item.prayer_slot || 'No slot assigned'}</p>
                    </>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(item.created_at || item.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const slotTimeData = getSlotTimeDistribution();
  const regionData = getRegionDistribution();
  const activityData = getActivityTrend();

  return (
    <div className="space-y-4">
      {/* Quick Stats Grid */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard 
          icon={Clock} 
          label="Active Slots" 
          value={prayerSlots.filter(s => s.status === 'active').length}
          color="blue"
          trend={5}
        />
        <StatCard 
          icon={Users} 
          label="Intercessors" 
          value={intercessors.length}
          color="green"
          trend={12}
        />
        <StatCard 
          icon={Calendar} 
          label="Fasting Reg." 
          value={fastingRegistrations.length}
          color="purple"
          trend={8}
        />
        <StatCard 
          icon={Activity} 
          label="Updates" 
          value={updates.length}
          color="orange"
          trend={3}
        />
      </div>

      {/* Charts Section */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* Prayer Slot Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Slot Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? "h-32" : "h-40"}>
              {slotTimeData.labels.length > 0 ? (
                <Bar data={slotTimeData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No slot data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Region Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Regional Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {regionData.labels.length > 0 ? (
                regionData.labels.slice(0, isMobile ? 4 : 6).map((region, index) => {
                  const count = regionData.datasets[0].data[index];
                  const percentage = Math.round((count / fastingRegistrations.length) * 100);
                  return (
                    <div key={region} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: regionData.datasets[0].backgroundColor[index] }}
                        />
                        <span className="text-sm text-gray-700 truncate">{region}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-gray-500">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-20 text-gray-500">
                  No regional data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Trend - Full width on mobile */}
        <Card className={isMobile ? "col-span-1" : "col-span-2"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              7-Day Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? "h-32" : "h-40"}>
              <Line data={activityData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <CompactDataTable 
          title="Recent Prayer Slots"
          data={prayerSlots.sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime())}
          icon={Clock}
          maxItems={isMobile ? 3 : 5}
        />
        
        <CompactDataTable 
          title="Recent Registrations"
          data={fastingRegistrations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          icon={Calendar}
          maxItems={isMobile ? 3 : 5}
        />
        
        <CompactDataTable 
          title="Active Intercessors"
          data={intercessors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          icon={Users}
          maxItems={isMobile ? 3 : 5}
        />
      </div>

      {/* Summary Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Platform Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">
                {Math.round((prayerSlots.filter(s => s.status === 'active').length / 48) * 100)}%
              </p>
              <p className="text-xs text-gray-600">Slot Coverage</p>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                ${fastingRegistrations.reduce((sum, reg) => sum + parseFloat(reg.travel_cost || '0'), 0).toFixed(0)}
              </p>
              <p className="text-xs text-gray-600">Total Travel Cost</p>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">
                {new Set(fastingRegistrations.map(r => r.region)).size}
              </p>
              <p className="text-xs text-gray-600">Unique Regions</p>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-lg font-bold text-orange-600">
                {fastingRegistrations.filter(r => r.gps_latitude && r.gps_longitude).length}
              </p>
              <p className="text-xs text-gray-600">GPS Locations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileCharts;