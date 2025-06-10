import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Users, 
  Clock, 
  Calendar, 
  Shield, 
  Settings, 
  BarChart3, 
  RefreshCw,
  LogOut,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Activity,
  Plus,
  Link as LinkIcon,
  Download,
  TrendingUp,
  UserCheck,
  Timer
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface PrayerSlot {
  id: string;
  slotTime: string;
  status: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
  missedCount?: number;
}

interface FastingRegistration {
  id: string;
  full_name: string;
  phone_number: string;
  region: string;
  travel_cost: string;
  gps_latitude: string | null;
  gps_longitude: string | null;
  city_name?: string;
  created_at: string;
}

interface Intercessor {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  prayer_slot?: string;
  attendance_rate?: number;
  last_activity?: string;
  zoom_sessions?: number;
}

interface AdminUpdate {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_email: string;
  slot_time: string;
  attendance_status: string;
  meeting_date: string;
  duration: number;
  created_at: string;
}

interface UserActivity {
  user_id: string;
  user_email: string;
  user_name?: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_rate: number;
  last_activity: string;
  contact_info?: string;
  current_slot?: string;
}

const MobileNavButton = ({ icon: Icon, label, isActive, onClick }: {
  icon: any;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-brand-primary text-white shadow-lg' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={20} className="mb-1" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [newUpdate, setNewUpdate] = useState({ 
    title: "", 
    description: "", 
    type: "general", 
    priority: "normal",
    schedule: "immediate",
    expiry: "never",
    sendNotification: false,
    sendEmail: false,
    pinToTop: false
  });
  const [zoomLink, setZoomLink] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'excellent' | 'good' | 'needs-improvement'>('all');
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest' | 'alphabetical'>('highest');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Check admin authentication
  useEffect(() => {
    const checkAdminAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLocation("/admin/login");
        return;
      }

      // Verify admin role
      const { data: userData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setLocation("/admin/login");
        return;
      }

      setAdminUser(userData);
    };

    checkAdminAuth();
  }, [setLocation, toast]);

  // Fetch prayer slots from Supabase
  const { data: prayerSlotsResponse, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["admin-prayer-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_slots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Prayer slots loaded:', data?.length || 0, 'records');
      return data || [];
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const prayerSlots = prayerSlotsResponse || [];

  // Fetch fasting registrations with location conversion from API
  const { data: fastingRegistrationsResponse, isLoading: fastingLoading, refetch: refetchFasting } = useQuery({
    queryKey: ["admin-fasting-registrations"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/fasting-registrations", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fasting registrations loaded:', Array.isArray(data) ? data.length : 0, 'records');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error loading fasting registrations:', error);
        return [];
      }
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const fastingRegistrations = Array.isArray(fastingRegistrationsResponse) ? fastingRegistrationsResponse : [];

  // Fetch admin updates from Supabase
  const { data: updatesResponse, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ["admin-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Admin updates loaded:', data?.length || 0, 'records');
      return data || [];
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const updates = updatesResponse || [];

  // Fetch user activities for intercessor tracking
  const { data: userActivitiesResponse, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
    queryKey: ["admin-user-activities"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/user-activities", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Intercessors loaded:', Array.isArray(data) ? data.length : 0, 'records');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error loading user activities:', error);
        return [];
      }
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const userActivities: UserActivity[] = Array.isArray(userActivitiesResponse) ? userActivitiesResponse : [];

  // Fetch attendance statistics
  const { data: attendanceStatsResponse, isLoading: attendanceLoading } = useQuery({
    queryKey: ["admin-attendance-stats"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/attendance-stats", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || {};
      } catch (error) {
        console.error('Error loading attendance stats:', error);
        return {};
      }
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const attendanceStats = attendanceStatsResponse || {};

  // Fetch prayer sessions
  const { data: prayerSessionsResponse, isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-prayer-sessions"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/prayer-sessions", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error loading prayer sessions:', error);
        return [];
      }
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const prayerSessions = Array.isArray(prayerSessionsResponse) ? prayerSessionsResponse : [];

  // Get current Zoom link
  const { data: currentZoomLink } = useQuery({
    queryKey: ["admin-zoom-link"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/zoom-link", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || null;
      } catch (error) {
        console.error('Error loading zoom link:', error);
        return null;
      }
    },
    enabled: !!adminUser,
  });

  // Mutations for admin actions
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create update');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Update Created",
        description: data.message || "Update has been posted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      queryClient.invalidateQueries({ queryKey: ['updates'] });
      setNewUpdate({
        title: '',
        description: '',
        type: 'general',
        priority: 'normal',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Update",
        description: error.message || "Failed to create update. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateZoomLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      const response = await fetch("/api/admin/zoom-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ zoomLink: link }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zoom link updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-zoom-link"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Zoom link", variant: "destructive" });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/admin/login");
  };

  const handleCreateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.description.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createUpdateMutation.mutate(newUpdate);
  };

  const handleUpdateZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomLink.trim()) {
      toast({ title: "Error", description: "Please enter a valid Zoom link", variant: "destructive" });
      return;
    }
    updateZoomLinkMutation.mutate(zoomLink);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No Data", description: "No data available to export" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(item => headers.map(header => {
        let value = item[header];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportFasting = () => {
    exportToCSV(fastingRegistrations, 'fasting-registrations.csv');
    toast({
      title: "Export Complete",
      description: "Fasting registrations exported to CSV",
    });
  };

  // Filter and sort intercessor activities
  const filteredAndSortedActivities = userActivities
    .filter(activity => {
      if (attendanceFilter === 'all') return true;
      if (attendanceFilter === 'excellent') return activity.attendance_rate >= 0.9;
      if (attendanceFilter === 'good') return activity.attendance_rate >= 0.7 && activity.attendance_rate < 0.9;
      if (attendanceFilter === 'needs-improvement') return activity.attendance_rate < 0.7;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'highest') return b.attendance_rate - a.attendance_rate;
      if (sortOrder === 'lowest') return a.attendance_rate - b.attendance_rate;
      if (sortOrder === 'alphabetical') return (a.user_name || '').localeCompare(b.user_name || '');
      return 0;
    });

  const generateAttendanceCSV = (activities: UserActivity[]) => {
    return activities.map(activity => ({
      name: activity.user_name || 'Anonymous',
      email: activity.user_email,
      contact: activity.contact_info || '',
      current_slot: activity.current_slot || '',
      total_sessions: activity.total_sessions,
      attended_sessions: activity.attended_sessions,
      attendance_rate: `${(activity.attendance_rate * 100).toFixed(1)}%`,
      attendance_category: activity.attendance_rate >= 0.9 ? 'Excellent' : 
                          activity.attendance_rate >= 0.7 ? 'Good' : 
                          'Needs Improvement',
      last_activity: new Date(activity.last_activity).toLocaleDateString(),
      recommended_for_reward: activity.attendance_rate >= 0.9 ? 'Yes' : 'No'
    }));
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No Data", description: "No data available to export" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(item => headers.map(header => {
        let value = item[header];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportIntercessors = () => {
    const exportData = generateAttendanceCSV(filteredAndSortedActivities);

    exportToCSV(exportData, 'intercessors-activity.csv');
    toast({
      title: "Export Complete",
      description: "Intercessor activity data exported to CSV",
    });
  };

  const refreshAllData = () => {
    refetchSlots();
    refetchFasting();
    refetchUpdates();
    refetchActivities();
    toast({ title: "Data Refreshed", description: "All data has been refreshed" });
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <AnimatedCard animationType="fadeIn" className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Admin Access</h2>
            <p className="text-gray-600">Please wait while we authenticate your credentials...</p>
          </CardContent>
        </AnimatedCard>
      </div>
    );
  }

  const OverviewTab = () => {
    const activeSlots = prayerSlots.filter(slot => slot.status === 'active').length;
    const totalIntercessors = userActivities.length;
    const totalFastingRegistrations = fastingRegistrations.length;
    const avgAttendanceRate = userActivities.length > 0 
      ? userActivities.reduce((sum, activity) => sum + activity.attendance_rate, 0) / userActivities.length
      : 0;

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <AnimatedCard animationType="slideIn" delay={0.1}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Slots</p>
                  <p className="text-2xl font-bold text-gray-900">{activeSlots}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.2}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Intercessors</p>
                  <p className="text-2xl font-bold text-gray-900">{totalIntercessors}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.3}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fasting</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFastingRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.4}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{(avgAttendanceRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Recent Activity */}
        <AnimatedCard animationType="fadeIn" delay={0.5}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.slice(0, 5).length > 0 ? (
                updates.slice(0, 5).map((update) => (
                  <div key={update.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-brand-primary rounded-full">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{update.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(update.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent updates</p>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    );
  };

  const PrayerSlotsTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Prayer Slots Management
            </span>
            <Badge variant="secondary">{prayerSlots.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slotsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading prayer slots...</p>
            </div>
          ) : prayerSlots.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {prayerSlots.map((slot) => (
                  <div key={slot.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={slot.status === 'active' ? 'default' : 'secondary'}>
                          {slot.status}
                        </Badge>
                        <span className="font-semibold">{slot.slot_time}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(slot.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><Mail className="w-4 h-4 inline mr-1" />{slot.user_email || 'No email'}</p>
                      <p className="mt-1">User ID: {slot.user_id}</p>
                      {slot.missed_count > 0 && (
                        <p className="mt-1 text-red-600">Missed: {slot.missed_count} times</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No prayer slots found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const IntercessorActivityTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              Intercessor Activity Tracking
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{userActivities.length} Total</Badge>
              <Button
                onClick={handleExportIntercessors}
                size="sm"
                variant="outline"
                className="flex items-center"
                disabled={filteredAndSortedActivities.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Attendance Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Filter by Attendance Rate</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={attendanceFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('all')}
                >
                  All ({userActivities.length})
                </Button>
                <Button
                  variant={attendanceFilter === 'excellent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('excellent')}
                  className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                >
                  Excellent 90%+ ({userActivities.filter(a => a.attendance_rate >= 0.9).length})
                </Button>
                <Button
                  variant={attendanceFilter === 'good' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('good')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                >
                  Good 70-89% ({userActivities.filter(a => a.attendance_rate >= 0.7 && a.attendance_rate < 0.9).length})
                </Button>
                <Button
                  variant={attendanceFilter === 'needs-improvement' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceFilter('needs-improvement')}
                  className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                >
                  Needs Improvement &lt;70% ({userActivities.filter(a => a.attendance_rate < 0.7).length})
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="sort-order" className="font-medium">Sort by:</label>
                  <select
                    id="sort-order"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'highest' | 'lowest' | 'alphabetical')}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="highest">Highest Attendance</option>
                    <option value="lowest">Lowest Attendance</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Showing {filteredAndSortedActivities.length} of {userActivities.length} intercessors
                </div>
              </div>
            </div>
          </div>

          {activitiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading activity data...</p>
            </div>
          ) : filteredAndSortedActivities.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredAndSortedActivities.map((activity, index) => (
                  <div key={activity.user_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                          activity.attendance_rate >= 0.9 ? 'bg-green-500' :
                          activity.attendance_rate >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{activity.user_name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-600">{activity.user_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          <Badge variant={activity.attendance_rate >= 0.9 ? 'default' : 
                                        activity.attendance_rate >= 0.7 ? 'secondary' : 'destructive'}
                                className={
                                  activity.attendance_rate >= 0.9 ? 'bg-green-500 text-white' :
                                  activity.attendance_rate >= 0.7 ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }>
                            {(activity.attendance_rate * 100).toFixed(1)}%
                          </Badge>
                          <span className="text-xs text-gray-500 mt-1">
                            {activity.attendance_rate >= 0.9 ? 'Excellent' :
                             activity.attendance_rate >= 0.7 ? 'Good' :
                             'Needs Improvement'}
                          </span>
                          {activity.attendance_rate >= 0.9 && (
                            <span className="text-xs text-green-600 font-medium">
                              ⭐ Reward Eligible
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Timer className="w-4 h-4 mr-2" />
                        {activity.total_sessions} sessions
                      </div>
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {activity.attended_sessions} attended
                      </div>
                      {activity.current_slot && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          {activity.current_slot}
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Activity className="w-4 h-4 mr-2" />
                        {new Date(activity.last_activity).toLocaleDateString()}
                      </div>
                    </div>

                    {activity.contact_info && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {activity.contact_info}
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Attendance Rate</span>
                        <span>{(activity.attendance_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            activity.attendance_rate >= 0.9 ? 'bg-green-500' :
                            activity.attendance_rate >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${activity.attendance_rate * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : userActivities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No intercessor activity data found</p>
              <p className="text-sm text-gray-500 mt-1">Activity data will appear once intercessors join Zoom prayer sessions</p>
              <div className="mt-4 text-xs text-gray-500">
                <p>To enable attendance tracking:</p>
                <p>1. Ensure Zoom API credentials are configured</p>
                <p>2. Intercessors must use the same email for Zoom and registration</p>
                <p>3. Prayer sessions must be conducted via Zoom meetings</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No intercessors match the selected filter</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting the attendance filter or sort options</p>
            </div>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const FastingTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Fasting Registrations
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{fastingRegistrations.length} Total</Badge>
              <Button
                onClick={handleExportFasting}
                size="sm"
                variant="outline"
                className="flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fastingLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading fasting registrations...</p>
            </div>
          ) : fastingRegistrations.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {fastingRegistrations.map((registration) => (
                  <div key={registration.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{registration.full_name}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {registration.phone_number}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {registration.region}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Travel Cost:</span>
                        ${registration.travel_cost}
                      </div>
                      {registration.city_name && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="font-medium mr-2">Location:</span>
                          {registration.city_name}
                        </div>
                      )}
                      {(registration.gps_latitude && registration.gps_longitude && !registration.city_name) && (
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium mr-2">GPS:</span>
                          {registration.gps_latitude}, {registration.gps_longitude}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No fasting registrations found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const ManagementTab = () => (
    <div className="space-y-6">
      {/* Advanced Update Posting */}
      <AnimatedCard animationType="fadeIn" delay={0.1}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Post Global Update
            </span>
            <Badge variant="outline" className="text-xs">
              Will appear on user dashboard
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUpdate} className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="updateTitle" className="text-sm font-medium">Update Title *</Label>
                <Input
                  id="updateTitle"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  placeholder="e.g., Prayer Meeting Schedule Update, Fasting Program Announcement..."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="updateType" className="text-sm font-medium">Update Type</Label>
                <select
                  id="updateType"
                  value={newUpdate.type || 'general'}
                  onChange={(e) => setNewUpdate({ ...newUpdate, type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="general">General Announcement</option>
                  <option value="urgent">Urgent Notice</option>
                  <option value="prayer">Prayer Request</option>
                  <option value="event">Event Update</option>
                  <option value="maintenance">System Maintenance</option>
                </select>
              </div>

              <div>
                <Label htmlFor="updatePriority" className="text-sm font-medium">Priority Level</Label>
                <select
                  id="updatePriority"
                  value={newUpdate.priority || 'normal'}
                  onChange={(e) => setNewUpdate({ ...newUpdate, priority: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Alert</option>
                </select>
              </div>

              <div>
                <Label htmlFor="updateDescription" className="text-sm font-medium">Message Content *</Label>
                <Textarea
                  id="updateDescription"
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  placeholder="Enter your message for all users. This will appear on their dashboard immediately after posting..."
                  rows={6}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newUpdate.description.length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="updateSchedule" className="text-sm font-medium">Schedule Options</Label>
                  <select
                    id="updateSchedule"
                    value={newUpdate.schedule || 'immediate'}
                    onChange={(e) => setNewUpdate({ ...newUpdate, schedule: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="immediate">Post Immediately</option>
                    <option value="scheduled">Schedule for Later</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="updateExpiry" className="text-sm font-medium">Auto-Hide After</Label>
                  <select
                    id="updateExpiry"
                    value={newUpdate.expiry || 'never'}
                    onChange={(e) => setNewUpdate({ ...newUpdate, expiry: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="never">Never Hide</option>
                    <option value="1day">1 Day</option>
                    <option value="3days">3 Days</option>
                    <option value="1week">1 Week</option>
                    <option value="1month">1 Month</option>
                  </select>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="text-sm font-medium mb-2">Notification Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUpdate.sendNotification || false}
                      onChange={(e) => setNewUpdate({ ...newUpdate, sendNotification: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send push notification to all users</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUpdate.sendEmail || false}
                      onChange={(e) => setNewUpdate({ ...newUpdate, sendEmail: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send email notification to subscribers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUpdate.pinToTop || false}
                      onChange={(e) => setNewUpdate({ ...newUpdate, pinToTop: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Pin to top of user dashboard</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setNewUpdate({ 
                  title: '', 
                  description: '', 
                  type: 'general', 
                  priority: 'normal',
                  schedule: 'immediate',
                  expiry: 'never',
                  sendNotification: false,
                  sendEmail: false,
                  pinToTop: false
                })}
                className="flex-1"
              >
                Clear Form
              </Button>
              <Button 
                type="submit" 
                disabled={createUpdateMutation.isPending || !newUpdate.title || !newUpdate.description}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90"
              >
                {createUpdateMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Post Update
              </Button>
            </div>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* Recent Updates Preview */}
      <AnimatedCard animationType="fadeIn" delay={0.2}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Recent Updates
            </span>
            <Badge variant="secondary">{updates.length} Published</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updatesLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-primary border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading updates...</p>
            </div>
          ) : updates.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {updates.slice(0, 10).map((update, index) => (
                  <div key={update.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{update.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={update.priority === 'critical' ? 'destructive' : 
                                  update.priority === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {update.priority || 'normal'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(update.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {update.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        {update.type || 'general'}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-600">✓ Published</span>
                        {update.pinToTop && (
                          <span className="text-xs text-blue-600">📌 Pinned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No updates posted yet</p>
              <p className="text-xs mt-1">Use the form above to post your first update</p>
            </div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Zoom Link Management */}
      <AnimatedCard animationType="fadeIn" delay={0.3}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="w-5 h-5 mr-2" />
            Zoom Link Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentZoomLink && typeof currentZoomLink === 'object' && 'zoomLink' in currentZoomLink && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Zoom Link:</p>
              <p className="text-blue-600 font-mono text-sm break-all">{(currentZoomLink as any).zoomLink}</p>
            </div>
          )}
          <form onSubmit={handleUpdateZoomLink} className="space-y-4">
            <div>
              <Label htmlFor="zoomLink">New Zoom Link</Label>
              <Input
                id="zoomLink"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              disabled={updateZoomLinkMutation.isPending}
              className="w-full"
            >
              {updateZoomLinkMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              Update Zoom Link
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* System Analytics */}
      <AnimatedCard animationType="fadeIn" delay={0.4}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            System Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{prayerSlots.length}</div>
              <div className="text-xs text-gray-600">Prayer Slots</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userActivities.length}</div>
              <div className="text-xs text-gray-600">Active Users</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{fastingRegistrations.length}</div>
              <div className="text-xs text-gray-600">Fasting Participants</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{updates.length}</div>
              <div className="text-xs text-gray-600">Published Updates</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchSlots()}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Slots
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchActivities()}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Activities
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchFasting()}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Fasting
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchUpdates()}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Updates
              </Button>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "slots":
        return <PrayerSlotsTab />;
      case "activity":
        return <IntercessorActivityTab />;
      case "fasting":
        return <FastingTab />;
      case "management":
        return <ManagementTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-brand-primary" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Global Intercessors</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshAllData}
                size="sm"
                variant="ghost"
                className="p-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="ghost"
                className="p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="bg-brand-primary text-white p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Global Intercessors Admin</h1>
                <p className="text-blue-100 text-sm">Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Welcome, {adminUser.email}</span>
              <Button
                onClick={refreshAllData}
                variant="outline"
                size="sm"
                className="text-brand-primary border-white hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-brand-primary border-white hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4">
        {/* Mobile Navigation */}
        {isMobile ? (
          <div className="grid grid-cols-5 gap-2 mb-6 bg-white rounded-lg p-3 shadow-sm">
            <MobileNavButton
              icon={BarChart3}
              label="Overview"
              isActive={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            />
            <MobileNavButton
              icon={Clock}
              label="Slots"
              isActive={activeTab === "slots"}
              onClick={() => setActiveTab("slots")}
            />
            <MobileNavButton
              icon={UserCheck}
              label="Activity"
              isActive={activeTab === "activity"}
              onClick={() => setActiveTab("activity")}
            />
            <MobileNavButton
              icon={Calendar}
              label="Fasting"
              isActive={activeTab === "fasting"}
              onClick={() => setActiveTab("fasting")}
            />
            <MobileNavButton
              icon={Settings}
              label="Manage"
              isActive={activeTab === "management"}
              onClick={() => setActiveTab("management")}
            />
          </div>
        ) : (
          /* Desktop Navigation */
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-2 shadow-sm">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "slots", label: "Prayer Slots", icon: Clock },
              { id: "activity", label: "Intercessor Activity", icon: UserCheck },
              { id: "fasting", label: "Fasting Program", icon: Calendar },
              { id: "management", label: "Management", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  className={`flex items-center space-x-2 px-4 py-2 ${
                    activeTab === tab.id 
                      ? "bg-brand-primary text-white shadow-md" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}