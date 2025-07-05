import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, AlertCircle, RotateCcw, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import type { PrayerSlot, AvailableSlot, PrayerSession } from "../../../shared/schema";

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

export default function PrayerSlotManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChangeSlotModalOpen, setIsChangeSlotModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch user's prayer slot
  const { data: prayerSlotData, isLoading: isLoadingSlot } = useQuery({
    queryKey: ['prayer-slot', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/prayer-slot/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch prayer slot');
      const data = await response.json();
      return data.prayerSlot || null;
    },
    enabled: !!user?.id
  });

  const prayerSlot = prayerSlotData;

  // Fetch available slots
  const { data: availableSlotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['available-slots'],
    queryFn: async () => {
      const response = await fetch('/api/available-slots');
      if (!response.ok) throw new Error('Failed to fetch available slots');
      const data = await response.json();
      return data.availableSlots || [];
    }
  });

  const availableSlots = availableSlotsData || [];

  // Fetch prayer session history
  const { data: sessionHistory = [] } = useQuery<PrayerSession[]>({
    queryKey: ['prayer-sessions', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/prayer-sessions/${user?.id}?limit=7`);
      if (!response.ok) throw new Error('Failed to fetch prayer sessions');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Skip slot mutation
  const skipSlotMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/prayer-slot/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to skip prayer slot');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      toast({
        title: "Slot Skipped Successfully",
        description: "Your prayer slot has been paused for 5 days.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to skip prayer slot. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Change slot mutation
  const changeSlotMutation = useMutation({
    mutationFn: async ({ userId, newSlotTime, currentSlotTime }: { userId: string; newSlotTime: string; currentSlotTime?: string }) => {
      const response = await fetch('/api/prayer-slot/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newSlotTime, currentSlotTime })
      });
      if (!response.ok) throw new Error('Failed to change prayer slot');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-slot'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      setIsChangeSlotModalOpen(false);
      toast({
        title: "Slot Changed Successfully",
        description: "Your prayer slot has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change prayer slot. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate countdown to next prayer session
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
    if (user?.id && prayerSlot?.slotTime) {
      changeSlotMutation.mutate({
        userId: user.id,
        newSlotTime,
        currentSlotTime: prayerSlot.slotTime
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Card className="w-96 shadow-brand-lg">
          <CardContent className="p-6 text-center">
            
            <h2 className="text-xl font-poppins font-semibold text-brand-text mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access your prayer slot management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text font-poppins">Loading your prayer slot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-text font-poppins mb-2">Prayer Slot Management</h1>
          <p className="text-gray-600 text-lg">Manage your committed prayer time and schedule</p>
        </div>

        {/* Current Slot Status */}
        <Card className="shadow-brand-lg border border-gi-primary/100">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center shadow-brand">
                <Clock className="w-5 h-5 text-gi-gold" />
              </div>
              <span className="font-poppins text-xl">Your Prayer Slot</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-gi-primary/100">
              {prayerSlot ? (
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-gi-primary mb-4 font-poppins">
                    {prayerSlot.slotTime}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {getStatusIcon(prayerSlot.status)}
                    <Badge variant={getStatusBadgeVariant(prayerSlot.status)} className="text-sm font-poppins">
                      {prayerSlot.status.charAt(0).toUpperCase() + prayerSlot.status.slice(1)}
                    </Badge>
                  </div>

                  {prayerSlot.status === 'active' && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-2">Next session in:</p>
                      <div className="text-3xl font-bold text-gi-primary font-poppins">
                        {String(countdown.hours).padStart(2, '0')}:
                        {String(countdown.minutes).padStart(2, '0')}:
                        {String(countdown.seconds).padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  {prayerSlot.missedCount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
                        className="border-gi-primary/accent text-gi-gold hover:bg-gi-gold hover:text-gi-primary transition-brand font-poppins"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {skipSlotMutation.isPending ? 'Processing...' : 'Request Skip (5 days)'}
                      </Button>
                    )}

                    <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="border-gi-primary/primary text-gi-primary hover:bg-gi-primary/50 transition-brand font-poppins"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Change Time Slot
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" aria-describedby="change-slot-description">
                        <DialogHeader>
                          <DialogTitle className="font-poppins">Select New Prayer Slot</DialogTitle>
                        </DialogHeader>
                        <div id="change-slot-description" className="sr-only">
                          Choose a new time slot for your prayer commitment from the available options.
                        </div>
                        <div className="space-y-4">
                          <Select onValueChange={handleChangeSlot}>
                            <SelectTrigger className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary">
                              <SelectValue placeholder="Choose a new time slot" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {isLoadingSlots ? (
                                <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                              ) : availableSlots.length > 0 ? (
                                availableSlots.map((slot: AvailableSlot) => (
                                  <SelectItem key={slot.id} value={slot.slotTime}>
                                    {slot.slotTime}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-slots" disabled>No available slots</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {changeSlotMutation.isPending && (
                            <p className="text-sm text-gi-primary">Updating your slot...</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  
                  <h3 className="text-xl font-semibold text-gray-700 mb-2 font-poppins">No Prayer Slot Assigned</h3>
                  <p className="text-gray-600 mb-4">You don't have a prayer slot assigned yet.</p>
                  <Dialog open={isChangeSlotModalOpen} onOpenChange={setIsChangeSlotModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gi-primary hover:bg-gi-primary/800 text-white font-poppins">
                        <Calendar className="w-4 h-4 mr-2" />
                        Select Your Prayer Slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md" aria-describedby="select-slot-description">
                      <DialogHeader>
                        <DialogTitle className="font-poppins">Select Your Prayer Slot</DialogTitle>
                      </DialogHeader>
                      <div id="select-slot-description" className="sr-only">
                        Choose your preferred time slot for daily prayer commitment from the available options.
                      </div>
                      <div className="space-y-4">
                        <Select onValueChange={handleChangeSlot}>
                          <SelectTrigger className="border-gi-primary/200 focus:ring-brand-primary focus:border-gi-primary/primary">
                            <SelectValue placeholder="Choose your time slot" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {isLoadingSlots ? (
                              <SelectItem value="loading" disabled>Loading slots...</SelectItem>
                            ) : availableSlots.length > 0 ? (
                              availableSlots.map((slot: AvailableSlot) => (
                                <SelectItem key={slot.id} value={slot.slotTime}>
                                  {slot.slotTime}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-slots" disabled>No available slots</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {changeSlotMutation.isPending && (
                          <p className="text-sm text-gi-primary">Setting up your slot...</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prayer Guidelines */}
        <Card className="shadow-brand-lg border border-gi-primary/100">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center shadow-brand">
                <AlertCircle className="w-5 h-5 text-gi-gold" />
              </div>
              <span className="font-poppins text-xl">Prayer Slot Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gi-primary rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text font-poppins">30-Minute Commitment</h4>
                    <p className="text-sm text-gray-600">Dedicate 30 minutes of focused prayer during your assigned slot</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gi-gold rounded-full flex items-center justify-center mt-0.5">
                    <Clock className="w-3 h-3 text-gi-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text font-poppins">Skip Policy</h4>
                    <p className="text-sm text-gray-600">Request to skip your slot for up to 5 consecutive days when needed</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                    <XCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text font-poppins">Auto-Release Rule</h4>
                    <p className="text-sm text-gray-600">Missing 5 days in a row will auto-release your slot to other intercessors</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gi-primary rounded-full flex items-center justify-center mt-0.5">
                    <Calendar className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text font-poppins">Global Coverage</h4>
                    <p className="text-sm text-gray-600">Your commitment helps maintain 24/7 global prayer coverage</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Prayer Sessions */}
        <Card className="shadow-brand-lg border border-gi-primary/100">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center shadow-brand">
                <Calendar className="w-5 h-5 text-gi-gold" />
              </div>
              <span className="font-poppins text-xl">Recent Prayer Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessionHistory.length > 0 ? (
                sessionHistory.map((session: PrayerSession, index: number) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-gi-primary/100"
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
    </div>
  );
}