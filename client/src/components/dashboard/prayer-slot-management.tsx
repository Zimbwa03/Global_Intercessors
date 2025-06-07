import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar, AlertCircle, RotateCcw, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notificationService } from '@/lib/notificationService';
import { countdownService } from '@/lib/countdownService';
import { AnimatedCard } from '@/components/ui/animated-card';
import { SlotTransition } from '@/components/ui/slot-transition';
import { motion, AnimatePresence } from 'framer-motion';


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
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangeSlotModalOpen, setIsChangeSlotModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  const [slotChangeSuccess, setSlotChangeSuccess] = useState(false);
  const [isSlotChanging, setIsSlotChanging] = useState(false);

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

  // Subscribe to countdown service
  useEffect(() => {
    const unsubscribe = countdownService.subscribe((time: CountdownTime) => {
      setCountdown(time);
    });

    countdownService.start();

    return () => {
      unsubscribe();
      countdownService.stop();
    };
  }, []);

  // Fetch current prayer slot
  const { data: prayerSlot, isLoading: isLoadingSlot, error: slotError } = useQuery({
    queryKey: ['prayer-slot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const response = await fetch(`/api/prayer-slot/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prayer slot');
      }
      
      const data = await response.json();
      return data.prayerSlot;
    },
    enabled: !!user?.id,
  });

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
  });

  // Skip slot mutation
  const skipSlotMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await fetch('/api/prayer-slot/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip prayer slot');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Slot Skipped",
        description: "Your prayer slot has been skipped for 5 days.",
      });
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Skip Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change slot mutation
  const changeSlotMutation = useMutation({
    mutationFn: async (newSlotTime: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      setIsSlotChanging(true);
      
      const response = await fetch('/api/prayer-slot/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          newSlotTime 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change prayer slot');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSlotChangeSuccess(true);
      setTimeout(() => setSlotChangeSuccess(false), 2000);
      
      toast({
        title: "Slot Updated",
        description: "Your prayer slot has been successfully updated.",
      });
      
      // Force refetch the prayer slot data
      queryClient.invalidateQueries({ queryKey: ['prayer-slot', user?.id] });
      queryClient.refetchQueries({ queryKey: ['prayer-slot', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      setIsChangeSlotModalOpen(false);
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

  const handleChangeSlot = (newSlotTime: string) => {
    changeSlotMutation.mutate(newSlotTime);
  };

  const handleSkipSlot = () => {
    skipSlotMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className={`text-green-500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
      case 'skipped':
        return <XCircle className={`text-red-500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
      default:
        return <Clock className={`text-blue-500 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />;
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
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
    <div className={`space-y-6 ${isMobile ? 'px-2' : ''}`}>
      <div className="text-center md:text-left">
        <h2 className={`font-bold text-brand-text mb-2 font-poppins ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          Prayer Slot Management
        </h2>
        <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
          Manage your committed prayer time and schedule
        </p>
      </div>

      {/* Current Slot Status with Animations */}
      <AnimatedCard 
        animationType="slideIn" 
        delay={0.2}
        className={`shadow-brand-lg border border-blue-100 ${isMobile ? 'mx-0' : ''}`}
      >
        <CardHeader className={isMobile ? 'pb-4' : ''}>
          <CardTitle className={`flex items-center ${isMobile ? 'text-lg' : ''}`}>
            <motion.div 
              className={`bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand ${
                isMobile ? 'w-6 h-6' : 'w-8 h-8'
              }`}
              animate={{
                rotate: slotChangeSuccess ? [0, 360] : 0,
                scale: slotChangeSuccess ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Clock className={`text-brand-accent ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </motion.div>
            <span className="font-poppins">Current Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 p-4">
            <AnimatePresence mode="wait">
              {prayerSlot && prayerSlot.slotTime ? (
                <motion.div 
                  key={prayerSlot.slotTime}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <SlotTransition
                    status={prayerSlot.status}
                    slotTime={prayerSlot.slotTime}
                    isChanging={isSlotChanging || changeSlotMutation.isPending}
                    className="mb-4"
                  />

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
                        className={`font-bold text-brand-primary font-poppins ${
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
                          key={countdown.hours}
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 0.3 }}
                        >
                          {String(countdown.hours).padStart(2, '0')}
                        </motion.span>
                        :
                        <motion.span
                          key={countdown.minutes}
                          animate={{ opacity: [0.5, 1] }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          {String(countdown.minutes).padStart(2, '0')}
                        </motion.span>
                        :
                        <motion.span
                          key={countdown.seconds}
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
                    {prayerSlot.status === 'active' && (
                      <Button
                        onClick={handleSkipSlot}
                        disabled={skipSlotMutation.isPending}
                        variant="outline"
                        className={`border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-primary transition-brand font-poppins ${
                          isMobile ? 'h-12 text-sm' : ''
                        }`}
                      >
                        <RotateCcw className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                        {skipSlotMutation.isPending ? 'Processing...' : isMobile ? 'Skip (5 days)' : 'Request Skip (5 days)'}
                      </Button>
                    )}

                    <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className={`border-brand-primary text-brand-primary hover:bg-blue-50 transition-brand font-poppins ${
                            isMobile ? 'h-12 text-sm' : ''
                          }`}
                        >
                          <Edit3 className={`mr-2 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                          {isMobile ? 'Change Slot' : 'Change Time Slot'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-poppins">Change Your Prayer Slot</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select onValueChange={handleChangeSlot}>
                            <SelectTrigger className="border-blue-200 focus:ring-brand-primary focus:border-brand-primary">
                              <SelectValue placeholder="Choose your new time slot" />
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
                </motion.div>
              ) : (
                <motion.div 
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </AnimatedCard>

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
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Commit to a daily 1-hour prayer session at your selected time
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Join the Zoom meeting during your assigned slot for group prayer
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Missing sessions will affect your commitment status
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0"></div>
              <p className={`text-gray-700 ${isMobile ? 'text-sm' : ''}`}>
                Use the skip option sparingly - only for emergencies (5-day cooldown)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}