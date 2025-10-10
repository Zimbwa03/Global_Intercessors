import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar, AlertCircle, RotateCcw, Edit3, CheckCircle2, XCircle, TrendingUp, Users, Settings, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notificationService } from '@/lib/notificationService';
import { countdownService } from '@/lib/countdownService';
import { AnimatedCard } from '@/components/ui/animated-card';
import { SlotTransition } from '@/components/ui/slot-transition';
import { motion, AnimatePresence } from 'framer-motion';
import { PresentationData, PRESENTATION_MODE } from '@/utils/frontend-zoom-data';

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

interface PrayerSlotManagementProps {
  userEmail?: string;
}

interface SkipRequest {
  id: number;
  user_id: string;
  skip_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment?: string;
  created_at: string;
  processed_at?: string;
}

export function PrayerSlotManagement({ userEmail }: PrayerSlotManagementProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangeSlotModalOpen, setIsChangeSlotModalOpen] = useState(false);
  const [isSkipRequestModalOpen, setIsSkipRequestModalOpen] = useState(false);
  const [skipDays, setSkipDays] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [countdown, setCountdown] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  const [slotChangeSuccess, setSlotChangeSuccess] = useState(false);
  const [isSlotChanging, setIsSlotChanging] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch current prayer slot
  const { data: prayerSlotResponse, isLoading: isLoadingSlot, error: slotError, refetch } = useQuery({
    queryKey: ['prayer-slot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const response = await fetch(`/api/prayer-slot/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prayer slot');
      }

      const data = await response.json();
      console.log('Prayer slot management response:', data);
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity
  });

  // Fetch user's attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await fetch(`/api/attendance/${user.id}?limit=30`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }

      return response.json();
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false
  });

  // Fetch user's skip requests
  const { data: skipRequests = [] } = useQuery({
    queryKey: ['skip-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await fetch(`/api/prayer-slot/skip-requests/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch skip requests');
      }

      return response.json();
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false
  });


  // Fetch current Zoom link
  const { data: zoomLinkData } = useQuery({
    queryKey: ['zoom-link'],
    queryFn: async () => {
      const response = await fetch('/api/admin/zoom-link');
      if (!response.ok) {
        throw new Error('Failed to fetch zoom link');
      }
      return response.json();
    },
    refetchOnWindowFocus: false
  });

  // Fixed Zoom join link as requested
  const ZOOM_JOIN_LINK = 'https://us05web.zoom.us/j/9565792987?pwd=RSlfzbyg7I7SGd0QkXewoal3tgjWid.1';

  // Extract the prayer slot from the response
  const prayerSlot = prayerSlotResponse?.prayerSlot;

  // Calculate countdown to next prayer session based on actual slot time
  useEffect(() => {
    if (!prayerSlot?.slotTime || prayerSlot.status !== 'active') {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateNextSession = () => {
      const now = new Date();
      const [startTime] = prayerSlot.slotTime.split('–');
      const [hours, minutes] = startTime.split(':').map(Number);

      // Create next session time
      const nextSlot = new Date();
      nextSlot.setHours(hours, minutes, 0, 0);

      // If the time has passed today, set for tomorrow
      if (nextSlot <= now) {
        nextSlot.setDate(nextSlot.getDate() + 1);
      }

      const timeDiff = nextSlot.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setCountdown({
        hours: Math.max(0, hoursLeft),
        minutes: Math.max(0, minutesLeft),
        seconds: Math.max(0, secondsLeft)
      });
    };

    calculateNextSession();
    const interval = setInterval(calculateNextSession, 1000);

    return () => clearInterval(interval);
  }, [prayerSlot?.slotTime, prayerSlot?.status]);

  // Fetch available slots
  const { data: availableSlotsData = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['available-slots'],
    queryFn: async () => {
      const response = await fetch('/api/available-slots');
      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      return data.availableSlots;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
    gcTime: Infinity
  });

  // Submit skip request mutation
  const submitSkipRequestMutation = useMutation({
    mutationFn: async (data: { skipDays: string; reason: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const response = await fetch('/api/prayer-slot/skip-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          skipDays: data.skipDays,
          reason: data.reason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit skip request');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Skip Request Submitted",
        description: "Your skip request has been submitted and is awaiting admin approval.",
      });
      setIsSkipRequestModalOpen(false);
      setSkipDays('');
      setSkipReason('');
      queryClient.invalidateQueries({ queryKey: ['skip-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual attendance logging mutation
  const logAttendanceMutation = useMutation({
    mutationFn: async ({ duration }: { duration: number }) => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated');

      const response = await fetch('/api/attendance/manual-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          duration: duration
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to log attendance');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Attendance Logged",
        description: `Successfully logged ${data.data.duration} minutes of prayer for ${data.data.slotTime}`,
      });
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log attendance. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Change slot mutation
  const changeSlotMutation = useMutation({
    mutationFn: async (data: { newSlotTime: string; userEmail?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      setIsSlotChanging(true);

      const response = await fetch('/api/prayer-slot/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          newSlotTime: data.newSlotTime,
          userEmail: data.userEmail || userEmail || user.email 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change prayer slot');
      }

      return response.json();
    },
    onSuccess: () => {
      setSlotChangeSuccess(true);
      setTimeout(() => setSlotChangeSuccess(false), 2000);

      toast({
        title: "Slot Updated",
        description: "Your prayer slot has been successfully updated.",
      });

      setIsChangeSlotModalOpen(false);
      // Auto-refresh current slot and available slots
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSlotChanging(false);
    },
  });

  // Remove (release) prayer slot mutation
  const removeSlotMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const response = await fetch('/api/prayer-slot/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove prayer slot');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Prayer Slot Removed',
        description: 'Your prayer slot has been released and is now available to others.'
      });
      // Refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Remove Failed', description: error.message, variant: 'destructive' });
    }
  });

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    if (!attendanceRecords.length) return { rate: 0, streak: 0, total: 0, attended: 0 };

    const total = attendanceRecords.length;
    const attended = attendanceRecords.filter((record: any) => record.attended).length;
    const rate = (attended / total) * 100;

    // Calculate current streak
    let streak = 0;
    for (let i = 0; i < attendanceRecords.length; i++) {
      if ((attendanceRecords[i] as any).attended) {
        streak++;
      } else {
        break;
      }
    }

    return { rate: Math.round(rate), streak, total, attended };
  };

  const attendanceStatsRaw = calculateAttendanceStats();
  const demoSlotData = PRESENTATION_MODE ? PresentationData.prayerSlot() : null;
  const attendanceStats = {
    rate: attendanceStatsRaw.rate || (demoSlotData?.attendanceRate || 0),
    streak: attendanceStatsRaw.streak || (demoSlotData ? Math.min(30, Math.floor((demoSlotData.attendedSessions || 27) / 2) + 7) : 0),
    total: attendanceStatsRaw.total || (demoSlotData?.totalSessions || 0),
    attended: attendanceStatsRaw.attended || (demoSlotData?.attendedSessions || 0)
  };

  // Helper function to get status text safely
  const getStatusText = (status: string | undefined) => {
    if (!status || typeof status !== 'string') return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleChangeSlot = (newSlotTime: string) => {
    changeSlotMutation.mutate({ newSlotTime });
  };

  const handleSubmitSkipRequest = () => {
    if (!skipDays || !skipReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both skip duration and reason.",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(skipDays) < 1 || parseInt(skipDays) > 30) {
      toast({
        title: "Invalid Duration",
        description: "Skip duration must be between 1 and 30 days.",
        variant: "destructive",
      });
      return;
    }

    submitSkipRequestMutation.mutate({ skipDays, reason: skipReason });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className={`text-green-500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
      case 'skipped':
        return <XCircle className={`text-red-500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
      default:
        return <Clock className={`text-gi-primary/500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'skipped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // UI helpers for styling (avoid variant props for stricter typing)
  const badgeVariantClass = (variant: 'default' | 'secondary' | 'destructive' | 'outline') => {
    switch (variant) {
      case 'default':
        return 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80';
      case 'secondary':
        return 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80';
      case 'destructive':
        return 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80';
      case 'outline':
      default:
        return 'text-foreground';
    }
  };

  const outlineButtonClasses = 'border border-input bg-background hover:bg-accent hover:text-accent-foreground';

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }

        if (data?.session?.user) {
          setCurrentUserId(data.session.user.id);
        } else {
          setCurrentUserId(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    // Check attendance status every 30 seconds for real-time updates
    const attendanceInterval = setInterval(fetchAttendanceStatus, 30000);
    fetchAttendanceStatus();

    return () => clearInterval(attendanceInterval);
  }, []);

  const fetchAttendanceStatus = async () => {
    if (!currentUserId) return;
    try {
      const response = await fetch(`/api/attendance/status/${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-poppins font-semibold text-brand-text mb-2">Loading...</h2>
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gi-primary mx-auto mb-4" />
          <h2 className="text-xl font-poppins font-semibold text-brand-text mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access your prayer slot management.</p>
        </div>
      </div>
    );
  }

  if (isLoadingSlot) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text font-poppins">Loading your prayer slot...</p>
        </div>
      </div>
    );
  }

  if (slotError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-poppins font-semibold text-red-600 mb-2">Error Loading Slot</h2>
          <p className="text-gray-600 mb-4">Failed to load your prayer slot. Please try again.</p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['prayer-slot'] })}
            className="bg-gi-primary hover:bg-gi-primary/800 text-white font-poppins"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'px-2' : ''}`}>
      <div className="text-center md:text-left">
        <h2 className={`font-bold text-brand-text mb-2 font-poppins ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          Prayer Slot Management
        </h2>
        <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
          Manage your committed prayer time and attendance
        </p>
      </div>
      {/* Current Slot Status with Animations */}
      <AnimatedCard 
        animationType="slideIn" 
        delay={0.2}
        className={`shadow-brand-lg border border-gi-primary/100 ${isMobile ? 'mx-0' : ''}`}
      >
        <CardHeader className={isMobile ? 'pb-4' : ''}>
          <CardTitle className={`flex items-center ${isMobile ? 'text-lg' : ''}`}>
            <motion.div 
              className={`bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand ${
                isMobile ? 'w-6 h-6' : 'w-8 h-8'
              }`}
              animate={{
                rotate: slotChangeSuccess ? [0, 360] : 0,
                scale: slotChangeSuccess ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Clock className={`text-gi-gold ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </motion.div>
            <span className="font-poppins">Current Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-gi-primary/100 p-4">
            <AnimatePresence mode="wait">
              {prayerSlot && prayerSlot.slotTime ? (
                <motion.div 
                  key={`prayer-slot-${prayerSlot.slotTime}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="mb-4">
                    <h3 className={`font-bold text-gi-primary font-poppins mb-2 ${
                      isMobile ? 'text-2xl' : 'text-3xl'
                    }`}>
                      {prayerSlot.slotTime}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(prayerSlot.status)}
                      <Badge className={`font-poppins ${badgeVariantClass(getStatusBadgeVariant(prayerSlot.status))}`}>
                        {getStatusText(prayerSlot.status)}
                      </Badge>
                    </div>
                  </div>

                  {prayerSlot.status === 'active' && (
                    <motion.div 
                      className="mb-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <p className={`text-gray-600 mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Next session in:
                      </p>
                      <motion.div 
                        className={`font-bold text-gi-primary font-poppins ${
                          isMobile ? 'text-xl' : 'text-2xl'
                        }`}
                        animate={{
                          scale: [1, 1.05, 1],
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 1,
                          ease: "easeInOut"
                        }}
                      >
                        <motion.span
                          key={`hours-${countdown.hours}-${Date.now()}`}
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 0.3 }}
                        >
                          {String(countdown.hours).padStart(2, '0')}
                        </motion.span>
                        :
                        <motion.span
                          key={`minutes-${countdown.minutes}-${Date.now()}`}
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          {String(countdown.minutes).padStart(2, '0')}
                        </motion.span>
                        :
                        <motion.span
                          key={`seconds-${countdown.seconds}-${Date.now()}`}
                          animate={{ 
                            opacity: [0.5, 1],
                            color: countdown.seconds % 2 === 0 ? "#1e40af" : "#3b82f6"
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          {String(countdown.seconds).padStart(2, '0')}
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  )}

                  {prayerSlot.missedCount > 0 && (
                    <div className={`bg-red-50 border border-red-200 rounded-lg mb-4 ${
                      isMobile ? 'p-2' : 'p-3'
                    }`}>
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                        <span className={`font-semibold ${isMobile ? 'text-sm' : ''}`}>
                          Missed {prayerSlot.missedCount} day(s)
                        </span>
                      </div>
                      <p className={`text-red-600 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        Please maintain consistency in your prayer commitment.
                      </p>
                    </div>
                  )}

                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-4'} justify-center`}>
                    {/* 1. Join Zoom Meeting */}
                    <Button
                      onClick={() => window.open(ZOOM_JOIN_LINK || zoomLinkData?.zoomLink, '_blank')}
                      className={`bg-green-600 hover:bg-green-700 text-white font-poppins ${
                        isMobile ? 'h-10 px-4 py-2 text-sm' : 'h-12 px-6 py-3'
                      }`}
                    >
                      <Users className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      {isMobile ? 'Join Zoom' : 'Join Zoom Meeting'}
                    </Button>

                    {/* 2. Change Prayer Slot */}
                    <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className={`bg-gi-primary text-white hover:bg-gi-primary/80 transition-brand font-poppins ${
                            isMobile ? 'h-10 px-4 py-2 text-sm' : 'h-12 px-6 py-3'
                          }`}
                        >
                          <Edit3 className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                          {isMobile ? 'Change Slot' : 'Change Prayer Slot'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-poppins">Change Your Prayer Slot</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select onValueChange={handleChangeSlot}>
                            <SelectTrigger className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary">
                              <SelectValue placeholder="Choose your new time slot" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {isLoadingSlots ? (
                                <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                              ) : (
                                availableSlotsData.map((slot: any, index: number) => (
                                  <SelectItem key={`change-slot-${slot.id}-${index}`} value={slot.slotTime}>
                                    {slot.slotTime}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {changeSlotMutation.isPending && (
                            <p className="text-sm text-gi-primary">Updating your slot...</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* 3. Request Skip Days */}
                    {prayerSlot.status === 'active' && (
                      <Dialog open={isSkipRequestModalOpen} onOpenChange={setIsSkipRequestModalOpen}>
                        <DialogTrigger asChild>
                          <Button
                            className={`bg-gi-gold text-gi-primary hover:bg-gi-gold/90 transition-brand font-poppins ${
                              isMobile ? 'h-10 px-4 py-2 text-sm' : 'h-12 px-6 py-3'
                            }`}
                          >
                            <RotateCcw className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                            {isMobile ? 'Request Skip' : 'Request Skip Days'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-poppins">Request Skip Days</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="skipDays">Number of days to skip (1-30)</Label>
                              <Input
                                id="skipDays"
                                type="number"
                                min="1"
                                max="30"
                                value={skipDays}
                                onChange={(e) => setSkipDays(e.target.value)}
                                placeholder="Enter number of days"
                                className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary"
                              />
                            </div>
                            <div>
                              <Label htmlFor="skipReason">Reason for skipping</Label>
                              <Textarea
                                id="skipReason"
                                value={skipReason}
                                onChange={(e) => setSkipReason(e.target.value)}
                                placeholder="Please explain why you need to skip these days..."
                                className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary min-h-[100px]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSubmitSkipRequest}
                                disabled={submitSkipRequestMutation.isPending}
                                className="bg-gi-primary hover:bg-gi-primary/800 text-white font-poppins flex-1"
                              >
                                {submitSkipRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                              </Button>
                              <Button
                                onClick={() => setIsSkipRequestModalOpen(false)}
                                className="font-poppins"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* 4. Remove Prayer Slot */}
                    {prayerSlot.status === 'active' && (
                      <>
                        <Button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/zoom/confirm-attendance', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user?.id })
                              });
                              const data = await response.json();
                              if (data.success) {
                                toast({
                                  title: "✅ Attendance Confirmed",
                                  description: `Your attendance for ${data.date} has been recorded`,
                                });
                                refetch();
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to confirm attendance",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white mb-2"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Confirm Attendance (Just Attended Zoom)
                        </Button>

                        <Button
                          onClick={() => removeSlotMutation.mutate()}
                          disabled={removeSlotMutation.isPending}
                          className={`bg-red-600 hover:bg-red-700 text-white font-poppins ${
                            isMobile ? 'h-10 px-4 py-2 text-sm' : 'h-12 px-6 py-3'
                          }`}
                        >
                          <XCircle className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                          {removeSlotMutation.isPending ? 'Removing...' : (isMobile ? 'Remove Slot' : 'Remove Prayer Slot')}
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="no-prayer-slot"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-8"
                >
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2 font-poppins">No Prayer Slot Assigned</h3>
                  <p className="text-gray-600 mb-4">You don't have a prayer slot assigned yet.</p>
                  <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gi-primary hover:bg-gi-primary/800 text-white font-poppins">
                        <Calendar className="w-4 h-4 mr-2" />
                        Select Your Prayer Slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-poppins">Select Your Prayer Slot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select onValueChange={handleChangeSlot}>
                          <SelectTrigger className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary">
                            <SelectValue placeholder="Choose your time slot" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {isLoadingSlots ? (
                              <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                            ) : (
                              availableSlotsData.map((slot: any, index: number) => (
                                <SelectItem key={`select-slot-${slot.id}-${index}`} value={slot.slotTime}>
                                  {slot.slotTime}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {changeSlotMutation.isPending && (
                          <p className="text-sm text-gi-primary">Setting up your slot...</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </AnimatedCard>
      {/* Automatic Attendance Status */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-sm font-medium text-green-900 mb-2">
          🤖 Automatic Attendance Tracking
        </h4>
        <p className="text-xs text-green-700 mb-3">
          Your attendance is automatically tracked when you join the Zoom prayer session during your slot time
        </p>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800">System Status: Active</span>
          </div>
          <span className="text-green-600">|</span>
          <span className="text-green-700">
            {todayAttendance?.hasAttendedToday ? 
              `✅ Attended today at ${new Date(todayAttendance.attendanceRecord?.zoom_join_time || '').toLocaleTimeString()}` : 
              '⏳ Waiting for Zoom session...'}
          </span>
        </div>
      </div>
      {/* Skip Requests Status */}
      {skipRequests.length > 0 && (
        <Card className="shadow-brand-lg border border-gi-primary/100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
                <RotateCcw className="w-4 h-4 text-gi-gold" />
              </div>
              <span className="font-poppins">Skip Requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {skipRequests.slice(0, 3).map((request: SkipRequest) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-gi-primary/100"
                >
                  <div>
                    <p className="font-medium text-brand-text font-poppins">
                      {request.skip_days} day{request.skip_days > 1 ? 's' : ''} skip request
                    </p>
                    <p className="text-sm text-gray-600">{request.reason}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    className={`font-poppins ${badgeVariantClass(
                      request.status === 'approved' ? 'default' : 
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Attendance & Statistics */}
      <Card className="shadow-brand-lg border border-gi-primary/100">
        <CardHeader>
                    <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <TrendingUp className="w-4 h-4 text-gi-gold" />
            </div>
            <span className="font-poppins">Attendance & Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4 mb-6`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getAttendanceColor(attendanceStats.rate)} font-poppins`}>
                {attendanceStats.rate}%
              </div>
              <div className="text-sm text-gray-600">Attendance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gi-primary font-poppins">
                {attendanceStats.streak}
              </div>
              <div className="text-sm text-gray-600">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 font-poppins">
                {attendanceStats.attended}
              </div>
              <div className="text-sm text-gray-600">Sessions Attended</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 font-poppins">
                {attendanceStats.total}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
          </div>

          {attendanceRecords.length > 0 && (
            <div>
              <h4 className="font-semibold text-brand-text mb-3 font-poppins">Recent Attendance</h4>
              <div className="space-y-2">
                {attendanceRecords.slice(0, 5).map((record: any, index: number) => (
                  <div 
                    key={`attendance-${record.id}-${index}`}
                    className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-gi-primary/100"
                  >
                    <div>
                      <p className="font-medium text-brand-text font-poppins">
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                      {record.session_duration && (
                        <p className="text-sm text-gray-600">{record.session_duration} minutes</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {record.attended ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <Badge 
                        className={`font-poppins ${badgeVariantClass(record.attended ? 'default' : 'destructive')}`}
                      >
                        {record.attended ? 'Attended' : 'Missed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Prayer Guidelines */}
      <Card className="shadow-brand-lg border border-gi-primary/100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <AlertCircle className="w-4 h-4 text-gi-gold" />
            </div>
            <span className="font-poppins">Prayer Slot Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gi-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Commit to a daily 1-hour prayer session at your selected time
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gi-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Join the Zoom meeting during your assigned slot for group prayer
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gi-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Missing sessions will affect your commitment status
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gi-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Skip requests require admin approval and should be used sparingly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}