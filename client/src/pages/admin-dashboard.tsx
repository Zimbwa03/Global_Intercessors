import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
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
  RotateCcw,
  UserPlus,
  Zap,
  Bell,
  Heart,
  ImagePlus,
  Wrench,
  X,
  Send,
  CalendarDays,
  Trash2
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion, AnimatePresence } from "framer-motion";
import { PrayerSlotManagement } from '../components/dashboard/prayer-slot-management';
import { SlotCoverageMonitor } from '../components/dashboard/slot-coverage-monitor';
import { FastingProgramManagement } from '../components/dashboard/fasting-program-management';
import { AnalyticsCharts } from '../components/dashboard/analytics-charts';
import { EnhancedAnalytics } from '../components/admin/enhanced-analytics';
import { AdminManagement } from '../components/admin/admin-management';
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
  const [isAdminManagementOpen, setIsAdminManagementOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(isMobile);
  // Keep mobile flag in a ref to avoid re-subscribing listeners unnecessarily
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  // Avoid layout changes (which can blur inputs/close keyboard) while typing on mobile
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isInputFocusedRef = useRef(false);
  useEffect(() => { isInputFocusedRef.current = isInputFocused; }, [isInputFocused]);
  useEffect(() => {
    const onFocusIn = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Only track focus for actual text input fields, not buttons or selects
      if ((tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes((target as HTMLInputElement).type)) || 
          tag === 'TEXTAREA' || 
          target?.getAttribute('contenteditable') === 'true') {
        setIsInputFocused(true);
      }
    };
    const onFocusOut = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Only clear focus for text inputs
      if ((tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes((target as HTMLInputElement).type)) || 
          tag === 'TEXTAREA' || 
          target?.getAttribute('contenteditable') === 'true') {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('focusin', onFocusIn, { passive: true });
    document.addEventListener('focusout', onFocusOut, { passive: true });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Scroll hide/show handlers (run regardless of adminUser presence to keep hooks stable)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const goingDown = currentY > lastScrollYRef.current;
          const was = lastScrollYRef.current;
          lastScrollYRef.current = currentY;
          
          // Check if any dialog is open by looking for Dialog overlay
          const isDialogOpen = document.querySelector('[role="dialog"]') !== null;
          
          // Suppress UI hide/show while typing on mobile to prevent input blur/keyboard closing
          // Also suppress when any dialog is open to prevent flickering
          if ((isMobileRef.current && isInputFocusedRef.current) || isDialogOpen) {
            ticking = false;
            return;
          }
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
    refetchInterval: false,
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
  
  // State for categorized update dialogs
  const [fastUpdateOpen, setFastUpdateOpen] = useState(false);
  const [urgentNoticeOpen, setUrgentNoticeOpen] = useState(false);
  const [prayerRequestOpen, setPrayerRequestOpen] = useState(false);
  const [eventUpdateOpen, setEventUpdateOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [zoomLinkOpen, setZoomLinkOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateToDelete, setUpdateToDelete] = useState<any>(null);
  const [newUpdateCount, setNewUpdateCount] = useState(0);
  
  const [fastingTitle, setFastingTitle] = useState("3 Days & 3 Nights Fasting Program - August");
  const [fastingStartDate, setFastingStartDate] = useState<Date>();
  const [fastingEndDate, setFastingEndDate] = useState<Date>();
  const [fastingDescription, setFastingDescription] = useState("");
  
  const [urgentMessage, setUrgentMessage] = useState("");
  const [prayerRequestMessage, setPrayerRequestMessage] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [zoomLinkUpdate, setZoomLinkUpdate] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check if any dialog is open to prevent refetching during user interaction
  const isAnyDialogOpen = fastUpdateOpen || urgentNoticeOpen || prayerRequestOpen || 
                          eventUpdateOpen || maintenanceOpen || zoomLinkOpen || deleteDialogOpen;

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
    refetchInterval: isAnyDialogOpen ? false : 30000,
    staleTime: 15000
  });

  // Check admin authentication
  useEffect(() => {
    let isMounted = true;
    
    const checkAdminAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setLocation("/admin/login");
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
          if (isMounted) {
            toast({
              title: "Access Denied",
              description: "Admin privileges required",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            setLocation("/admin/login");
          }
          return;
        }

        if (isMounted) {
          setAdminUser(userData);
        }
      } catch (error) {
        console.error('Admin auth error:', error);
        if (isMounted) {
          toast({
            title: "Authentication Error",
            description: "Failed to verify admin privileges",
            variant: "destructive",
          });
        }
      }
    };

    checkAdminAuth();
    
    return () => {
      isMounted = false;
    };
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
    refetchInterval: isAnyDialogOpen ? false : 30000,
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
    refetchInterval: isAnyDialogOpen ? false : 30000,
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
    refetchInterval: isAnyDialogOpen ? false : 30000,
    staleTime: 20000,
    gcTime: 300000, // 5 minutes
  });

  const updates = useMemo(() => updatesResponse || [], [updatesResponse]);

  // Calculate new updates count based on last viewed timestamp
  useEffect(() => {
    if (!updates || updates.length === 0) {
      setNewUpdateCount(0);
      return;
    }

    const lastViewedTimestamp = localStorage.getItem('lastViewedUpdates');
    if (!lastViewedTimestamp) {
      // If never viewed, all updates are new
      setNewUpdateCount(updates.length);
      return;
    }

    const lastViewed = new Date(lastViewedTimestamp);
    const newUpdates = updates.filter(update => {
      const updateDate = new Date(update.created_at);
      return updateDate > lastViewed;
    });

    setNewUpdateCount(newUpdates.length);
  }, [updates]);

  // Mark updates as viewed when Management tab is clicked
  useEffect(() => {
    if (activeTab === 'management') {
      // Update the last viewed timestamp
      localStorage.setItem('lastViewedUpdates', new Date().toISOString());
      // Reset the new update count after a short delay to show the badge first
      setTimeout(() => setNewUpdateCount(0), 500);
    }
  }, [activeTab]);

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
    refetchInterval: isAnyDialogOpen ? false : 30000,
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
    refetchInterval: isAnyDialogOpen ? false : 30000,
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
    refetchInterval: isAnyDialogOpen ? false : 30000,
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

      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
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

  const deleteUpdateMutation = useMutation({
    mutationFn: async (updateId: number) => {
      const response = await fetch(`/api/admin/updates/${updateId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete update");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Update deleted successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setDeleteDialogOpen(false);
      setUpdateToDelete(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete update";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
      setDeleteDialogOpen(false);
      setUpdateToDelete(null);
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
                    name="sort-order"
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
      {/* Categorized Update Buttons */}
      <AnimatedCard animationType="fadeIn" delay={0.1}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Global Updates Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fast Update */}
            <Button
              onClick={() => setFastUpdateOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gi-primary to-gi-primary/80 hover:from-gi-primary/90 hover:to-gi-primary/70 text-white transition-all duration-300 hover:scale-105"
              data-testid="button-fast-update"
            >
              <Zap className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">Fast Update</div>
                <div className="text-xs opacity-90">Fasting Program Announcement</div>
              </div>
            </Button>

            {/* Urgent Notice */}
            <Button
              onClick={() => setUrgentNoticeOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white transition-all duration-300 hover:scale-105"
              data-testid="button-urgent-notice"
            >
              <Bell className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">Urgent Notice</div>
                <div className="text-xs opacity-90">Critical Announcements</div>
              </div>
            </Button>

            {/* Prayer Request */}
            <Button
              onClick={() => setPrayerRequestOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white transition-all duration-300 hover:scale-105"
              data-testid="button-prayer-request"
            >
              <Heart className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">Prayer Request</div>
                <div className="text-xs opacity-90">Community Prayer Needs</div>
              </div>
            </Button>

            {/* Event Updates */}
            <Button
              onClick={() => setEventUpdateOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white transition-all duration-300 hover:scale-105"
              data-testid="button-event-update"
            >
              <ImagePlus className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">Event Updates</div>
                <div className="text-xs opacity-90">With Image Upload</div>
              </div>
            </Button>

            {/* System Maintenance */}
            <Button
              onClick={() => setMaintenanceOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white transition-all duration-300 hover:scale-105"
              data-testid="button-system-maintenance"
            >
              <Wrench className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">System Maintenance</div>
                <div className="text-xs opacity-90">Technical Updates</div>
              </div>
            </Button>

            {/* Zoom Link Management */}
            <Button
              onClick={() => setZoomLinkOpen(true)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gi-gold to-yellow-500 hover:from-gi-gold/90 hover:to-yellow-600 text-gi-primary transition-all duration-300 hover:scale-105"
              data-testid="button-zoom-link"
            >
              <LinkIcon className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold text-lg">Zoom Link</div>
                <div className="text-xs opacity-90">Meeting Link Update</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Fast Update Dialog */}
      <Dialog open={fastUpdateOpen} onOpenChange={setFastUpdateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gi-primary" />
              Fast Update - Fasting Program
            </DialogTitle>
            <DialogDescription>
              Update fasting program details and dates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fasting-title">Program Title *</Label>
              <Input
                id="fasting-title"
                value={fastingTitle}
                onChange={(e) => setFastingTitle(e.target.value)}
                placeholder="e.g., 3 Days & 3 Nights Fasting Program - August"
                className="mt-1"
                data-testid="input-fasting-title"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full mt-1 justify-start text-left font-normal ${!fastingStartDate && "text-muted-foreground"}`}
                      data-testid="button-select-start-date"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {fastingStartDate ? format(fastingStartDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fastingStartDate}
                      onSelect={setFastingStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full mt-1 justify-start text-left font-normal ${!fastingEndDate && "text-muted-foreground"}`}
                      data-testid="button-select-end-date"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {fastingEndDate ? format(fastingEndDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fastingEndDate}
                      onSelect={setFastingEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="fasting-description">Program Description *</Label>
              <Textarea
                id="fasting-description"
                value={fastingDescription}
                onChange={(e) => setFastingDescription(e.target.value)}
                placeholder="Join believers worldwide in a powerful 3-day fasting period for breakthrough and revival..."
                rows={5}
                className="mt-1"
                data-testid="textarea-fasting-description"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFastingTitle("3 Days & 3 Nights Fasting Program - August");
                setFastingStartDate(undefined);
                setFastingEndDate(undefined);
                setFastingDescription("");
              }}
              data-testid="button-clear-fast"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!fastingTitle || !fastingStartDate || !fastingEndDate || !fastingDescription) {
                  toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
                  return;
                }
                const dateRange = `${format(fastingStartDate, "MMMM d")}-${format(fastingEndDate, "d, yyyy")}`;
                const fullDescription = `${fastingDescription}\n\n📅 Dates: ${dateRange}`;
                createUpdateMutation.mutate({
                  title: fastingTitle,
                  description: fullDescription,
                  type: "fast",
                  priority: "high",
                  schedule: "immediate",
                  expiry: "never",
                  sendNotification: true,
                  sendEmail: true,
                  pinToTop: true
                });
                setFastUpdateOpen(false);
                setFastingTitle("3 Days & 3 Nights Fasting Program - August");
                setFastingStartDate(undefined);
                setFastingEndDate(undefined);
                setFastingDescription("");
              }}
              className="bg-gi-primary hover:bg-gi-primary/90"
              data-testid="button-send-fast"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Urgent Notice Dialog */}
      <Dialog open={urgentNoticeOpen} onOpenChange={setUrgentNoticeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-600" />
              Urgent Notice
            </DialogTitle>
            <DialogDescription>
              Send critical announcement to all users
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={urgentMessage}
              onChange={(e) => setUrgentMessage(e.target.value)}
              placeholder="Enter urgent notice message..."
              rows={6}
              data-testid="textarea-urgent-message"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUrgentMessage("")} data-testid="button-clear-urgent">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!urgentMessage.trim()) {
                  toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
                  return;
                }
                createUpdateMutation.mutate({
                  title: "Urgent Notice",
                  description: urgentMessage,
                  type: "urgent",
                  priority: "critical",
                  schedule: "immediate",
                  expiry: "never",
                  sendNotification: true,
                  sendEmail: true,
                  pinToTop: true
                });
                setUrgentMessage("");
                setUrgentNoticeOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-send-urgent"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prayer Request Dialog */}
      <Dialog open={prayerRequestOpen} onOpenChange={setPrayerRequestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-600" />
              Prayer Request
            </DialogTitle>
            <DialogDescription>
              Share prayer needs with the community
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={prayerRequestMessage}
              onChange={(e) => setPrayerRequestMessage(e.target.value)}
              placeholder="Enter prayer request..."
              rows={6}
              data-testid="textarea-prayer-request"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrayerRequestMessage("")} data-testid="button-clear-prayer">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!prayerRequestMessage.trim()) {
                  toast({ title: "Error", description: "Please enter a prayer request", variant: "destructive" });
                  return;
                }
                createUpdateMutation.mutate({
                  title: "Prayer Request",
                  description: prayerRequestMessage,
                  type: "prayer",
                  priority: "high",
                  schedule: "immediate",
                  expiry: "never",
                  sendNotification: true,
                  sendEmail: false,
                  pinToTop: false
                });
                setPrayerRequestMessage("");
                setPrayerRequestOpen(false);
              }}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-send-prayer"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Update Dialog */}
      <Dialog open={eventUpdateOpen} onOpenChange={setEventUpdateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-blue-600" />
              Event Update
            </DialogTitle>
            <DialogDescription>
              Post event update with optional image flyer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="event-image">Event Flyer (Optional)</Label>
              <Input
                id="event-image"
                type="file"
                accept="image/*"
                onChange={(e) => setEventImage(e.target.files?.[0] || null)}
                className="mt-1"
                data-testid="input-event-image"
              />
            </div>
            <div>
              <Label htmlFor="event-message">Event Message *</Label>
              <Textarea
                id="event-message"
                value={eventMessage}
                onChange={(e) => setEventMessage(e.target.value)}
                placeholder="Enter event details..."
                rows={6}
                data-testid="textarea-event-message"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEventMessage("");
                setEventImage(null);
              }}
              data-testid="button-clear-event"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!eventMessage.trim()) {
                  toast({ title: "Error", description: "Please enter event details", variant: "destructive" });
                  return;
                }
                const description = eventImage 
                  ? `${eventMessage}\n\n${eventImage.name ? `📎 Attachment: ${eventImage.name}` : ''}`
                  : eventMessage;
                createUpdateMutation.mutate({
                  title: "Event Update",
                  description,
                  type: "event",
                  priority: "normal",
                  schedule: "immediate",
                  expiry: "never",
                  sendNotification: true,
                  sendEmail: false,
                  pinToTop: false
                });
                setEventMessage("");
                setEventImage(null);
                setEventUpdateOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-send-event"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Maintenance Dialog */}
      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              System Maintenance
            </DialogTitle>
            <DialogDescription>
              Notify users about system updates or downtime
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Enter maintenance notice..."
              rows={6}
              data-testid="textarea-maintenance"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMaintenanceMessage("")} data-testid="button-clear-maintenance">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!maintenanceMessage.trim()) {
                  toast({ title: "Error", description: "Please enter maintenance details", variant: "destructive" });
                  return;
                }
                createUpdateMutation.mutate({
                  title: "System Maintenance",
                  description: maintenanceMessage,
                  type: "maintenance",
                  priority: "normal",
                  schedule: "immediate",
                  expiry: "1week",
                  sendNotification: true,
                  sendEmail: false,
                  pinToTop: false
                });
                setMaintenanceMessage("");
                setMaintenanceOpen(false);
              }}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-send-maintenance"
              disabled={createUpdateMutation.isPending}
            >
              {createUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zoom Link Dialog */}
      <Dialog open={zoomLinkOpen} onOpenChange={setZoomLinkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-gi-gold" />
              Zoom Link Management
            </DialogTitle>
            <DialogDescription>
              Update the meeting link for prayer sessions
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentZoomLink && typeof currentZoomLink === 'object' && 'zoomLink' in currentZoomLink && (
              <div className="mb-4 p-3 bg-gi-primary/10 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current Link:</p>
                <p className="text-gi-primary font-mono text-sm break-all">{(currentZoomLink as any).zoomLink}</p>
              </div>
            )}
            <div>
              <Label htmlFor="zoom-link-input">New Zoom Link *</Label>
              <Input
                id="zoom-link-input"
                value={zoomLinkUpdate}
                onChange={(e) => setZoomLinkUpdate(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="mt-1"
                data-testid="input-zoom-link"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setZoomLinkUpdate("")} data-testid="button-clear-zoom">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => {
                if (!zoomLinkUpdate.trim()) {
                  toast({ title: "Error", description: "Please enter a Zoom link", variant: "destructive" });
                  return;
                }
                updateZoomLinkMutation.mutate(zoomLinkUpdate);
                setZoomLinkUpdate("");
                setZoomLinkOpen(false);
              }}
              className="bg-gi-gold hover:bg-gi-gold/90 text-gi-primary"
              data-testid="button-send-zoom"
              disabled={updateZoomLinkMutation.isPending}
            >
              {updateZoomLinkMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Update Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gi-primary border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading updates...</p>
            </div>
          ) : updates.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {updates.slice(0, 10).map((update) => {
                  const canDelete = !update.title.toLowerCase().includes('register for fasting');
                  return (
                    <div key={update.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm flex-1">{update.title}</h4>
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
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setUpdateToDelete(update);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`button-delete-update-${update.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
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
                            <span className="text-xs text-gi-primary">📌 Pinned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No updates posted yet</p>
              <p className="text-xs mt-1">Use the buttons above to post your first update</p>
            </div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* System Analytics */}
      <AnimatedCard animationType="fadeIn" delay={0.3}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            System Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gi-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-gi-primary">{prayerSlots.length}</div>
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
        return <EnhancedAnalytics />;
      default:
        return <OverviewTab />;
    }
  };

  

  class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
      return { hasError: true, error };
    }
    componentDidCatch(error: any, info: any) {
      // Log for debugging in console
      console.error('AdminDashboard render error boundary caught:', error, info);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="max-w-lg text-center">
              <h2 className="text-xl font-semibold mb-2">Admin dashboard failed to load</h2>
              <p className="text-gray-600 mb-4">Please refresh the page. If it persists, share the first error line from the Console.</p>
            </div>
          </div>
        );
      }
      return <>{this.props.children}</>;
    }
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      {/* Admin Management Dialog */}
      {adminUser && (
        <AdminManagement
          currentAdminEmail={adminUser.email}
          currentAdminRole={adminUser.role}
          isOpen={isAdminManagementOpen}
          onClose={() => setIsAdminManagementOpen(false)}
        />
      )}
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="/assets/GI_GOLD_Green_Icon_1751586542565.png" 
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
                onClick={() => setIsAdminManagementOpen(true)}
                size="sm"
                variant="ghost"
                className="p-2"
                title="Add Admin"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setActiveTab("management")}
                size="sm"
                variant={activeTab === "management" ? "default" : "ghost"}
                className={`p-2 relative ${activeTab === "management" ? "bg-gi-primary text-white" : ""}`}
              >
                <Settings className="w-4 h-4" />
                {newUpdateCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0.5 bg-red-500 text-white text-[10px]"
                  >
                    {newUpdateCount}
                  </Badge>
                )}
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
                src="/assets/GI_GOLD_Green_Icon_1751586542565.png" 
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
                onClick={() => setIsAdminManagementOpen(true)}
                variant="outline"
                size="sm"
                className="text-gi-primary border-white hover:bg-gi-primary/50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
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
              className="flex-1 relative"
              data-testid="button-tab-management"
            >
              <Settings className="w-4 h-4 mr-2" />
              Management
              {newUpdateCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-1 bg-red-500 text-white text-xs"
                  data-testid="badge-new-updates"
                >
                  {newUpdateCount}
                </Badge>
              )}
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
                            name="min-attendance"
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
                            name="max-attendance"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this update? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {updateToDelete && (
            <div className="py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">{updateToDelete.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2">{updateToDelete.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUpdateToDelete(null);
              }}
              disabled={deleteUpdateMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (updateToDelete) {
                  deleteUpdateMutation.mutate(updateToDelete.id);
                }
              }}
              disabled={deleteUpdateMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUpdateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}