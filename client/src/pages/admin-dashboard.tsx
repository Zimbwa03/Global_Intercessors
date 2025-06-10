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
  const [newUpdate, setNewUpdate] = useState({ title: "", description: "" });
  const [zoomLink, setZoomLink] = useState("");
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

  // Fetch fasting registrations from Supabase
  const { data: fastingRegistrationsResponse, isLoading: fastingLoading, refetch: refetchFasting } = useQuery({
    queryKey: ["admin-fasting-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fasting_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fasting registrations loaded:', data?.length || 0, 'records');
      return data || [];
    },
    enabled: !!adminUser,
    refetchInterval: 30000,
  });

  const fastingRegistrations = fastingRegistrationsResponse || [];

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
        const response = await apiRequest({ url: "/api/admin/user-activities" });
        console.log('Intercessors loaded:', Array.isArray(response) ? response.length : 0, 'records');
        return Array.isArray(response) ? response : [];
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
        const response = await apiRequest({ url: "/api/admin/attendance-stats" });
        return response || {};
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
        const response = await apiRequest({ url: "/api/admin/prayer-sessions" });
        return Array.isArray(response) ? response : [];
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
        const response = await apiRequest({ url: "/api/admin/zoom-link" });
        return response || null;
      } catch (error) {
        console.error('Error loading zoom link:', error);
        return null;
      }
    },
    enabled: !!adminUser,
  });

  // Mutations for admin actions
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: { title: string; description: string }) => {
      const { data, error } = await supabase
        .from('updates')
        .insert([updateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Update posted successfully" });
      setNewUpdate({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-updates"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post update", variant: "destructive" });
    },
  });

  const updateZoomLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      return apiRequest({
        url: "/api/admin/zoom-link",
        method: "POST",
        body: { zoomLink: link },
      });
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

  const handleExportIntercessors = () => {
    const exportData = userActivities.map(activity => ({
      name: activity.user_name || 'Anonymous',
      email: activity.user_email,
      contact: activity.contact_info || '',
      current_slot: activity.current_slot || '',
      total_sessions: activity.total_sessions,
      attended_sessions: activity.attended_sessions,
      attendance_rate: `${(activity.attendance_rate * 100).toFixed(1)}%`,
      last_activity: new Date(activity.last_activity).toLocaleDateString()
    }));

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
              <Badge variant="secondary">{userActivities.length} Active</Badge>
              <Button
                onClick={handleExportIntercessors}
                size="sm"
                variant="outline"
                className="flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading activity data...</p>
            </div>
          ) : userActivities.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {userActivities
                  .sort((a, b) => b.attendance_rate - a.attendance_rate)
                  .map((activity, index) => (
                  <div key={activity.user_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                          activity.attendance_rate >= 0.8 ? 'bg-green-500' :
                          activity.attendance_rate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{activity.user_name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-600">{activity.user_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={activity.attendance_rate >= 0.8 ? 'default' : 
                                      activity.attendance_rate >= 0.6 ? 'secondary' : 'destructive'}>
                          {(activity.attendance_rate * 100).toFixed(1)}%
                        </Badge>
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
                            activity.attendance_rate >= 0.8 ? 'bg-green-500' :
                            activity.attendance_rate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${activity.attendance_rate * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No activity data found</p>
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
                      {(registration.gps_latitude && registration.gps_longitude) && (
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
      {/* Post Updates */}
      <AnimatedCard animationType="fadeIn" delay={0.1}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Post New Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUpdate} className="space-y-4">
            <div>
              <Label htmlFor="updateTitle">Update Title</Label>
              <Input
                id="updateTitle"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                placeholder="Enter update title..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="updateDescription">Description</Label>
              <Textarea
                id="updateDescription"
                value={newUpdate.description}
                onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                placeholder="Enter update description..."
                rows={4}
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              disabled={createUpdateMutation.isPending}
              className="w-full"
            >
              {createUpdateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Post Update
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* Zoom Link Management */}
      <AnimatedCard animationType="fadeIn" delay={0.2}>
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