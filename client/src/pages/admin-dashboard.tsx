import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Timer,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion, AnimatePresence } from "framer-motion";
import { PrayerSlotManagement } from '../components/dashboard/prayer-slot-management';
import { SlotCoverageMonitor } from '../components/dashboard/slot-coverage-monitor';
import { FastingProgramManagement } from '../components/dashboard/fasting-program-management';
import { AnalyticsCharts } from '../components/dashboard/analytics-charts';
const WeeklyReportAnalytics = lazy(() => import('../components/admin/weekly-report-analytics').then(m => ({ default: m.WeeklyReportAnalytics })));

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
    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-h-[60px] ${
      isActive 
        ? 'bg-gi-primary text-white shadow-lg' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={18} className="mb-1 flex-shrink-0" />
    <span className="text-xs font-medium text-center leading-tight">{label}</span>
  </button>
);

export default function AdminDashboard() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [hideMobileFooter, setHideMobileFooter] = useState(false);
  const [hideDesktopHeaderButtons, setHideDesktopHeaderButtons] = useState(false);
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(isMobile);

  // Fetch skip requests for admin
  const { data: skipRequests = [], refetch: refetchSkipRequests } = useQuery({
    queryKey: ['admin-skip-requests'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/skip-requests');
        if (!response.ok) {
          // Treat as empty to avoid UI crash; server logs contain details
          return [] as any[];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [] as any[];
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 10000
  });

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

  // Debounced update handler to prevent excessive re-renders
  const handleUpdateChange = useCallback((field: string, value: any) => {
    setNewUpdate(prev => ({ ...prev, [field]: value }));
  }, []);
  const [zoomLink, setZoomLink] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'excellent' | 'good' | 'needs-improvement'>('all');
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest' | 'alphabetical'>('highest');
  const [dataAllocationFilter, setDataAllocationFilter] = useState({ min: 0, max: 100 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch data allocation
  const { data: dataAllocation = [], isLoading: dataAllocationLoading, refetch: refetchDataAllocation } = useQuery({
    queryKey: ['admin-data-allocation', dataAllocationFilter.min, dataAllocationFilter.max],
    queryFn: async () => {
      const response = await fetch(`/api/admin/data-allocation?minAttendance=${dataAllocationFilter.min}&maxAttendance=${dataAllocationFilter.max}`);
      if (!response.ok) throw new Error('Failed to fetch data allocation');
      return response.json();
    },
    enabled: !!adminUser && activeTab === 'data-allocation',
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 15000
  });

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const prayerSlots = useMemo(() => prayerSlotsResponse || [], [prayerSlotsResponse]);

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const fastingRegistrations = useMemo(() => 
    Array.isArray(fastingRegistrationsResponse) ? fastingRegistrationsResponse : [], 
    [fastingRegistrationsResponse]
  );

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const updates = useMemo(() => updatesResponse || [], [updatesResponse]);

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const userActivities: UserActivity[] = useMemo(() => 
    Array.isArray(userActivitiesResponse) ? userActivitiesResponse : [], 
    [userActivitiesResponse]
  );

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const attendanceStats = useMemo(() => attendanceStatsResponse || {}, [attendanceStatsResponse]);

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
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Fixed interval to prevent flickering
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const prayerSessions = useMemo(() => 
    Array.isArray(prayerSessionsResponse) ? prayerSessionsResponse : [], 
    [prayerSessionsResponse]
  );

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
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });

  // Mutations for admin actions
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: typeof newUpdate) => {
      const response = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: useCallback(() => {
      toast({
        title: "Global Update Posted",
        description: "Your update is now live on all user dashboards",
      });

      setNewUpdate({
        title: '',
        description: '',
        type: 'general',
        priority: 'normal',
        schedule: 'immediate',
        expiry: 'never',
        sendNotification: false,
        sendEmail: false,
        pinToTop: false
      });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/updates'] });
    }, [toast, queryClient]),
    onError: useCallback((error: Error) => {
      toast({
        title: "Failed to Post Update",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }, [toast]),
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

  const handleCreateUpdate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.description.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createUpdateMutation.mutate(newUpdate);
  }, [newUpdate, createUpdateMutation, toast]);

  const handleUpdateZoomLink = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomLink.trim()) {
      toast({ title: "Error", description: "Please enter a valid Zoom link", variant: "destructive" });
      return;
    }
    updateZoomLinkMutation.mutate(zoomLink);
  }, [zoomLink, updateZoomLinkMutation, toast]);

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
  const filteredAndSortedActivities = useMemo(() => userActivities
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
    }), [userActivities, attendanceFilter, sortOrder]);

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
    refetchSkipRequests();
    toast({ title: "Data Refreshed", description: "All data has been refreshed" });
  };

  // Handle skip request approval/rejection
  const handleSkipRequestAction = async (requestId: number, action: 'approve' | 'reject', comment?: string) => {
    try {
      console.log('Processing skip request:', { requestId, action, comment });

      const response = await fetch(`/api/admin/skip-requests/${requestId}/action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          action, 
          adminComment: comment || ''
        })
      });

      const responseData = await response.json();
      console.log('Skip request response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update skip request');
      }

      toast({
        title: `Skip Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The skip request has been ${action}d successfully.`,
      });

      // Refresh the data
      await refetchSkipRequests();
    } catch (error) {
      console.error('Skip request error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update skip request. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <AnimatedCard animationType="fadeIn" className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
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
                <div className="p-2 bg-gi-primary/100 rounded-lg">
                  <Clock className="w-4 h-4 text-gi-primary/600" />
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
                    <div className="p-1 bg-gi-primary rounded-full">
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
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
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
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
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
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
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
                  onChange={(e) => handleUpdateChange('title', e.target.value)}
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
                  onChange={(e) => handleUpdateChange('type', e.target.value)}
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
                  onChange={(e) => handleUpdateChange('priority', e.target.value)}
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
                  onChange={(e) => handleUpdateChange('description', e.target.value)}
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
                    onChange={(e) => handleUpdateChange('schedule', e.target.value)}
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
                    onChange={(e) => handleUpdateChange('expiry', e.target.value)}
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
                      onChange={(e) => handleUpdateChange('sendNotification', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send push notification to all users</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUpdate.sendEmail || false}
                      onChange={(e) => handleUpdateChange('sendEmail', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send email notification to subscribers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUpdate.pinToTop || false}
                      onChange={(e) => handleUpdateChange('pinToTop', e.target.checked)}
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
                disabled={createUpdateMutation.isPending || !newUpdate.title.trim() || !newUpdate.description.trim()}
                className="flex-1 bg-gi-primary/600 hover:bg-gi-primary/700 text-white font-medium"
              >
                {createUpdateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Publish Global Update
                  </>
                )}
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
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gi-primary/primary border-t-transparent mx-auto mb-2"></div>
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
                          <span className="text-xs text-gi-primary/600">📌 Pinned</span>
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
            <div className="mb-4 p-3 bg-gi-primary/50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Zoom Link:</p>
              <p className="text-gi-primary/600 font-mono text-sm break-all">{(currentZoomLink as any).zoomLink}</p>
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
            <div className="p-3 bg-gi-primary/50 rounded-lg">
              <div className="text-2xl font-bold text-gi-primary/600">{prayerSlots.length}</div>
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
      case "analytics":
        return <WeeklyReportAnalytics />;
      default:
        return <OverviewTab />;
    }
  };

  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const goingDown = currentY > lastScrollYRef.current;
          const was = lastScrollYRef.current;
          lastScrollYRef.current = currentY;
          if (isMobileRef.current) {
            // Hide footer when user scrolls up
            setHideMobileFooter(was > currentY && currentY > 20);
          } else {
            // Hide desktop header buttons when scrolling down
            setHideDesktopHeaderButtons(goingDown && currentY > 60);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className="w-6 h-6 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Global Intercessors</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setActiveTab("management")}
                size="sm"
                variant={activeTab === "management" ? "default" : "ghost"}
                className={`p-2 ${activeTab === "management" ? "bg-gi-primary text-white" : ""}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
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
        <div className="bg-gi-primary text-white p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className="w-8 h-8 object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.error('Admin logo failed to load');
                }}
              />
              <div>
                <h1 className="text-2xl font-bold">Global Intercessors Admin</h1>
                <p className="text-gi-primary/100 text-sm">Management Dashboard</p>
              </div>
            </div>
            <div className={`flex items-center space-x-4 transition-opacity duration-200 ${hideDesktopHeaderButtons ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <span className="text-sm">Welcome, {adminUser.email}</span>
              <Button
                onClick={refreshAllData}
                variant="outline"
                size="sm"
                className="text-gi-primary border-white hover:bg-gi-primary/50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-gi-primary border-white hover:bg-gi-primary/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto p-4 ${isMobile ? 'pb-40' : ''}`}>
        {/* Mobile Navigation */}
        {isMobile && (
          <div className="mb-6">
            {/* Mobile Footer Navigation */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gi-primary/20 z-20 shadow-lg transition-transform duration-200 ${hideMobileFooter ? 'translate-y-full' : 'translate-y-0'}`}>
              <div className="grid grid-cols-3 gap-1 p-2">
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
                  icon={Calendar}
                  label="Fasting"
                  isActive={activeTab === "fasting"}
                  onClick={() => setActiveTab("fasting")}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 p-2 pt-0">
                <MobileNavButton
                  icon={TrendingUp}
                  label="Analytics"
                  isActive={activeTab === "analytics"}
                  onClick={() => setActiveTab("analytics")}
                />
                <MobileNavButton
                  icon={RotateCcw}
                  label="Skip Requests"
                  isActive={activeTab === "skip-requests"}
                  onClick={() => setActiveTab("skip-requests")}
                />
                <MobileNavButton
                  icon={Download}
                  label="Data Export"
                  isActive={activeTab === "data-allocation"}
                  onClick={() => setActiveTab("data-allocation")}
                />
              </div>
            </div>
            {/* Add bottom padding to prevent content from being hidden by footer */}
            <div className="pb-32"></div>
          </div>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-2 shadow-sm">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeTab === "analytics" ? "default" : "ghost"}
              onClick={() => setActiveTab("analytics")}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={activeTab === "fasting" ? "default" : "ghost"}
              onClick={() => setActiveTab("fasting")}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Fasting
            </Button>
            <Button
              variant={activeTab === "slots" ? "default" : "ghost"}
              onClick={() => setActiveTab("slots")}
              className="flex-1"
            >
              <Clock className="w-4 h-4 mr-2" />
              Slots
            </Button>
            <Button
              variant={activeTab === "management" ? "default" : "ghost"}
              onClick={() => setActiveTab("management")}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Management
            </Button>
            <Button 
              variant={activeTab === 'skip-requests' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('skip-requests')}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Skip Requests
            </Button>
            <Button 
              variant={activeTab === 'data-allocation' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('data-allocation')}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Data Allocation
            </Button>
          </div>
        )}

        {/* Tab Content (animations disabled to avoid React error 310) */}
        <div>
          {activeTab === 'skip-requests' ? (
              <Card className="shadow-brand-lg border border-gi-primary/100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center shadow-brand">
                        <RotateCcw className="w-5 h-5 text-gi-gold" />
                      </div>
                      <span className="font-poppins text-xl">Skip Requests Management</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{skipRequests.length} Requests</Badge>
                      <Button
                        onClick={() => refetchSkipRequests()}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skipRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No skip requests found</p>
                        <p className="text-sm text-gray-500 mt-1">Skip requests will appear here when intercessors submit them</p>
                      </div>
                    ) : (
                      skipRequests.map((request: any) => (
                        <div 
                          key={request.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-brand-text font-poppins">
                                {request.user_email || `User ${request.user_id}`}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Requesting {request.skip_days} day{request.skip_days > 1 ? 's' : ''} skip
                              </p>
                            </div>
                            <Badge 
                              variant={
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'approved' ? 'default' : 'destructive'
                              }
                              className="font-poppins"
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>

                          <div className="mb-3">
                            <h5 className="font-medium text-gray-700 mb-1">Reason:</h5>
                            <p className="text-gray-600 text-sm bg-white p-2 rounded border">
                              {request.reason}
                            </p>
                          </div>

                          <div className="text-xs text-gray-500 mb-3">
                            Submitted: {new Date(request.created_at).toLocaleString()}
                            {request.processed_at && (
                              <span className="ml-4">
                                Processed: {new Date(request.processed_at).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {request.admin_comment && (
                            <div className="mb-3">
                              <h5 className="font-medium text-gray-700 mb-1">Admin Comment:</h5>
                              <p className="text-gray-600 text-sm bg-yellow-50 p-2 rounded border">
                                {request.admin_comment}
                              </p>
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                onClick={async () => {
                                  await handleSkipRequestAction(request.id, 'approve', 'Request approved by admin');
                                }}
                                className="bg-gi-primary hover:bg-gi-primary/90 text-white font-poppins"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={async () => {
                                  await handleSkipRequestAction(request.id, 'reject', 'Request rejected by admin');
                                }}
                                className="bg-gi-gold hover:bg-gi-gold/90 text-gi-primary font-poppins"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
          ) : activeTab === 'data-allocation' ? (
              <Card className="shadow-brand-lg border border-gi-primary/100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center shadow-brand">
                        <Download className="w-5 h-5 text-gi-gold" />
                      </div>
                      <span className="font-poppins text-xl">Data Allocation by Attendance</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{dataAllocation.length} Intercessors</Badge>
                      <Button
                        onClick={() => refetchDataAllocation()}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Attendance Filter Controls */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="min-attendance">Min Attendance %:</Label>
                          <Input
                            id="min-attendance"
                            type="number"
                            min="0"
                            max="100"
                            value={dataAllocationFilter.min}
                            onChange={(e) => setDataAllocationFilter(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                            className="w-20"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="max-attendance">Max Attendance %:</Label>
                          <Input
                            id="max-attendance"
                            type="number"
                            min="0"
                            max="100"
                            value={dataAllocationFilter.max}
                            onChange={(e) => setDataAllocationFilter(prev => ({ ...prev, max: parseInt(e.target.value) || 100 }))}
                            className="w-20"
                          />
                        </div>
                        <Button
                          onClick={() => refetchDataAllocation()}
                          size="sm"
                          className="bg-gi-primary hover:bg-gi-primary/90"
                        >
                          Apply Filter
                        </Button>
                      </div>
                      <div className="flex-1"></div>
                      <Button
                        onClick={() => {
                          window.open(`/api/admin/data-allocation/download?minAttendance=${dataAllocationFilter.min}&maxAttendance=${dataAllocationFilter.max}`, '_blank');
                          toast({
                            title: "CSV Download Started",
                            description: "Your intercessor data is being downloaded.",
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                  </div>

                  {/* Data Allocation Table */}
                  {dataAllocationLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
                      <p>Loading intercessor data...</p>
                    </div>
                  ) : dataAllocation.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {dataAllocation.map((intercessor: any, index: number) => (
                          <div key={intercessor.user_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                                  intercessor.attendance_percentage >= 90 ? 'bg-green-500' :
                                  intercessor.attendance_percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold">{intercessor.full_name}</p>
                                  <p className="text-sm text-gray-600">{intercessor.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex flex-col items-end">
                                  <Badge 
                                    variant={intercessor.attendance_percentage >= 90 ? 'default' : 
                                             intercessor.attendance_percentage >= 70 ? 'secondary' : 'destructive'}
                                    className={
                                      intercessor.attendance_percentage >= 90 ? 'bg-green-500 text-white' :
                                      intercessor.attendance_percentage >= 70 ? 'bg-yellow-500 text-white' :
                                      'bg-red-500 text-white'
                                    }
                                  >
                                    {intercessor.attendance_percentage}%
                                  </Badge>
                                  <span className="text-xs text-gray-500 mt-1">
                                    {intercessor.attendance_percentage >= 90 ? 'Excellent' :
                                     intercessor.attendance_percentage >= 70 ? 'Good' :
                                     'Needs Improvement'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                {intercessor.phone_number}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                {intercessor.prayer_slot}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {intercessor.attended_days}/{intercessor.total_days} days
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                Joined: {new Date(intercessor.joined_date).toLocaleDateString()}
                              </div>
                            </div>

                            {intercessor.last_attended && (
                              <div className="mt-2 text-xs text-gray-500">
                                Last attended: {new Date(intercessor.last_attended).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No intercessors found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting the attendance percentage filter to see more results
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
          ) : (
            <Suspense fallback={<div className="p-6 text-center text-sm text-gray-600">Loading…</div>}>
              {renderTabContent()}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}