import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, AlertCircle, RotateCcw, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NotificationSetup } from './notification-setup';
import { notificationService } from '@/lib/notificationService';

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

interface PrayerSlotManagementProps {
  userEmail?: string;
}

export function PrayerSlotManagement({ userEmail }: PrayerSlotManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChangeSlotModalOpen, setIsChangeSlotModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  const [user, setUser] = useState<any>(null);

  // Get userId from localStorage or use a default
  const userId = localStorage.getItem('userId') || 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f';

  // Get current user and initialize notification service
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    // Initialize notification service
    notificationService.initialize();
    
    getCurrentUser();
  }, []);

  // Fetch user's prayer slot with automatic refetching
  const { data: prayerSlot, error: slotError, isLoading: isLoadingSlot } = useQuery({
    queryKey: ['prayer-slot', user?.id],
    queryFn: async () => {
      // Use Supabase to fetch from prayer_slots table
      const { data, error } = await supabase
        .from('prayer_slots')
        .select(`
          *,
          intercessors (
            id,
            name,
            email
          )
        `)
        .eq('intercessor_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000
  });

  // Fetch available slots with real-time updates
  const { data: availableSlotsData = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['available-slots'],
    queryFn: async () => {
      // Use Supabase to fetch available prayer slots
      const { data, error } = await supabase
        .from('prayer_slots')
        .select('*')
        .eq('status', 'free');
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  // Fetch prayer session history with real-time updates
  const { data: sessionHistory = [] } = useQuery({
    queryKey: ['prayer-sessions', user?.id],
    queryFn: async () => {
      // Use Supabase to fetch session tracking with intercessor details
      const { data, error } = await supabase
        .from('session_tracking')
        .select(`
          *,
          intercessors (
            id,
            name,
            email
          )
        `)
        .eq('intercessor_id', user?.id)
        .order('session_date', { ascending: false })
        .limit(7);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  });

  // Skip slot mutation with optimistic updates
  const skipSlotMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Update prayer slot status to inactive in Supabase
      const { data, error } = await supabase
        .from('prayer_slots')
        .update({ 
          status: 'inactive',
          last_attended: new Date().toISOString()
        })
        .eq('intercessor_id', userId)
        .select()
        .single();
      
      if (error) throw new Error(error.message || 'Failed to skip prayer slot');
      return data;
    },
    onMutate: async (userId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prayer-slot', userId] });

      // Snapshot the previous value
      const previousSlot = queryClient.getQueryData(['prayer-slot', userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['prayer-slot', userId], (old: any) => ({
        ...old,
        status: 'skipped'
      }));

      return { previousSlot };
    },
    onSuccess: (data) => {
      // Update with actual server response and mark as fresh
      queryClient.setQueryData(['prayer-slot', user?.id], data);
      // Set a longer stale time to prevent immediate overwrites
      queryClient.setQueryDefaults(['prayer-slot', user?.id], { staleTime: 30000 });
      toast({
        title: "Slot Skipped Successfully",
        description: "Your prayer slot has been paused for 5 days.",
      });
    },
    onError: (error, userId, context) => {
      // Rollback on error
      if (context?.previousSlot) {
        queryClient.setQueryData(['prayer-slot', userId], context.previousSlot);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to skip prayer slot. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Delay refetch to allow UI to show the update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      }, 2000);
    }
  });

  // Change slot mutation with optimistic updates
  const changeSlotMutation = useMutation({
    mutationFn: async ({ userId, newSlotTime, currentSlotTime }: { userId: string; newSlotTime: string; currentSlotTime?: string }) => {
      // First, free up the current slot if it exists
      if (currentSlotTime) {
        await supabase
          .from('prayer_slots')
          .update({ status: 'free', intercessor_id: null })
          .eq('slot_time', currentSlotTime);
      }

      // Then assign the new slot
      const { data, error } = await supabase
        .from('prayer_slots')
        .update({ 
          intercessor_id: userId,
          status: 'active',
          last_attended: new Date().toISOString()
        })
        .eq('slot_time', newSlotTime)
        .select()
        .single();
      
      if (error) throw new Error(error.message || 'Failed to change prayer slot');
      return data;
    },
    onMutate: async ({ userId, newSlotTime }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prayer-slot', userId] });

      // Snapshot the previous value
      const previousSlot = queryClient.getQueryData(['prayer-slot', userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['prayer-slot', userId], (old: any) => ({
        ...old,
        slotTime: newSlotTime,
        status: 'active'
            }));

      return { previousSlot };
    },
    onSuccess: (data) => {
      // Update with actual server response and mark as fresh
      queryClient.setQueryData(['prayer-slot', user?.id], data);
      // Set a longer stale time to prevent immediate overwrites
      queryClient.setQueryDefaults(['prayer-slot', user?.id], { staleTime: 30000 });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      setIsChangeSlotModalOpen(false);
      toast({
        title: "Slot Changed Successfully",
        description: "Your prayer slot has been updated.",
      });
    },
    onError: (error, { userId }, context) => {
      // Rollback on error
      if (context?.previousSlot) {
        queryClient.setQueryData(['prayer-slot', userId], context.previousSlot);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to change prayer slot. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Delay refetch to allow UI to show the update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
        queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      }, 2000);
    }
  });

  // Calculate countdown to next prayer session and schedule notifications
  useEffect(() => {
    if (!prayerSlot?.slotTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const [startTime] = prayerSlot.slotTime.split('–');
      const [hours, minutes] = startTime.split(':').map(Number);

      const nextSession = new Date();
      nextSession.setHours(hours, minutes, 0, 0);

      // If the time has passed today, set for tomorrow
      if (nextSession <= now) {
        nextSession.setDate(nextSession.getDate() + 1);
      }

      const timeDiff = nextSession.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setCountdown({
        hours: Math.max(0, hoursLeft),
        minutes: Math.max(0, minutesLeft),
        seconds: Math.max(0, secondsLeft)
      });
    };

    // Schedule notifications when prayer slot is active
    if (prayerSlot && prayerSlot.status === 'active') {
      notificationService.scheduleSlotReminders(prayerSlot);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayerSlot]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'skipped':
        return 'secondary';
      case 'missed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'skipped':
        return <Clock className="w-4 h-4" />;
      case 'missed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleSkipSlot = () => {
    if (user?.id) {
      skipSlotMutation.mutate(user.id);
    }
  };

  const handleChangeSlot = (newSlotTime: string) => {
    if (user?.id) {
      changeSlotMutation.mutate({
        userId: user.id,
        newSlotTime,
        currentSlotTime: prayerSlot?.slotTime
      });
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-brand-primary mx-auto mb-4" />
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
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
            className="bg-brand-primary hover:bg-blue-800 text-white font-poppins"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text mb-2 font-poppins">Prayer Slot Management</h2>
        <p className="text-gray-600">Manage your committed prayer time and schedule</p>
      </div>

      {/* Notification Setup */}
      <NotificationSetup />

      {/* Current Slot Status */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <Clock className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="font-poppins">Current Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 border border-blue-100">
            {prayerSlot ? (
              <div className="text-center mb-4">
                <h3 className="text-3xl font-bold text-brand-primary mb-2 font-poppins">{prayerSlot.slotTime}</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {getStatusIcon(prayerSlot.status)}
                  <Badge variant={getStatusBadgeVariant(prayerSlot.status)} className="font-poppins">
                    {prayerSlot.status.charAt(0).toUpperCase() + prayerSlot.status.slice(1)}
                  </Badge>
                </div>

                {prayerSlot.status === 'active' && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Next session in:</p>
                    <div className="text-2xl font-bold text-brand-primary font-poppins">
                      {String(countdown.hours).padStart(2, '0')}:
                      {String(countdown.minutes).padStart(2, '0')}:
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                  </div>
                )}

                {prayerSlot.missedCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-semibold">
                        Missed {prayerSlot.missedCount} day(s)
                      </span>
                    </div>
                    {prayerSlot.missedCount >= 4 && (
                      <p className="text-sm text-red-600 mt-1">
                        Warning: Your slot will be auto-released after 5 missed days.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {prayerSlot.status === 'active' && (
                    <Button
                      onClick={handleSkipSlot}
                      disabled={skipSlotMutation.isPending}
                      variant="outline"
                      className="border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-primary transition-brand font-poppins"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {skipSlotMutation.isPending ? 'Processing...' : 'Request Skip (5 days)'}
                    </Button>
                  )}

                  <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-brand-primary text-brand-primary hover:bg-blue-50 transition-brand font-poppins"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Change Time Slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-poppins">Select New Prayer Slot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select onValueChange={handleChangeSlot}>
                          <SelectTrigger className="border-blue-200 focus:ring-brand-primary focus:border-brand-primary">
                            <SelectValue placeholder="Choose a new time slot" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {isLoadingSlots ? (
                              <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                            ) : (
                              availableSlotsData.map((slot: any) => (
                                <SelectItem key={slot.id} value={slot.slotTime}>
                                  {slot.slotTime}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {changeSlotMutation.isPending && (
                          <p className="text-sm text-brand-primary">Updating your slot...</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2 font-poppins">No Prayer Slot Assigned</h3>
                <p className="text-gray-600 mb-4">You don't have a prayer slot assigned yet.</p>
                <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-brand-primary hover:bg-blue-800 text-white font-poppins">
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
                        <SelectTrigger className="border-blue-200 focus:ring-brand-primary focus:border-brand-primary">
                          <SelectValue placeholder="Choose your time slot" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {isLoadingSlots ? (
                            <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                          ) : (
                            availableSlotsData.map((slot: any) => (
                              <SelectItem key={slot.id} value={slot.slotTime}>
                                {slot.slotTime}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {changeSlotMutation.isPending && (
                        <p className="text-sm text-brand-primary">Setting up your slot...</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Slot Information */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <AlertCircle className="w-4 h-4 text-brand-accent" />
            </div>
            <span className="font-poppins">Slot Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <CheckCircle2 className="w-4 h-4 text-brand-primary mr-3 mt-0.5" />
              <p>Commit to 30 minutes of focused prayer during your assigned slot</p>
            </div>
            <div className="flex items-start">
              <Clock className="w-4 h-4 text-brand-accent mr-3 mt-0.5" />
              <p>You can request to skip your slot for up to 5 consecutive days</p>
            </div>
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-600 mr-3 mt-0.5" />
              <p>Missing 5 days in a row will auto-release your slot to other intercessors</p>
            </div>
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-brand-primary mr-3 mt-0.5" />
              <p>Your commitment helps maintain 24/7 global prayer coverage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Prayer Sessions */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center shadow-brand">
              <Calendar className="w-5 h-5 text-brand-accent" />
            </div>
            <span className="font-poppins text-xl">Recent Prayer Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessionHistory.length > 0 ? (
              sessionHistory.map((session: any, index: number) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <p className="font-medium text-brand-text font-poppins">
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">{session.slotTime}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(session.status)} className="font-poppins">
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </Badge>
                    {session.duration && (
                      <p className="text-xs text-gray-500 mt-1">{session.duration} min</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No prayer sessions recorded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}