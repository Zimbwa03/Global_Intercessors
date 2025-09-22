import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Play, 
  Trophy, 
  Target,
  Clock,
  Sparkles,
  Heart,
  Star,
  ChevronRight,
  RefreshCw,
  Book,
  Award,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  days: number;
  is_active: boolean;
  created_at: string;
}

interface UserPlan {
  plan_id: string;
  plan_name: string;
  description: string;
  days: number;
  current_day: number;
  start_date: string;
  is_active: boolean;
}

interface TodayReading {
  plan_name: string;
  day_number: number;
  total_days: number;
  references: string[];
}

interface ProgressStats {
  userPlans: UserPlan[];
  activePlans: UserPlan[];
  completedPlans: UserPlan[];
  totalDaysRead: number;
  totalPlans: number;
}

export function ScriptureCoach() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);

  // Load current user id
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    })();
  }, []);

  // Fetch available reading plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['scripture-coach-plans'],
    queryFn: async () => {
      const response = await fetch('/api/scripture-coach/plans');
      if (!response.ok) throw new Error('Failed to fetch reading plans');
      const data = await response.json();
      return data.plans as ReadingPlan[];
    }
  });

  // Fetch user's reading plans
  const { data: userPlans, refetch: refetchUserPlans } = useQuery({
    queryKey: ['scripture-coach-user-plans', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/scripture-coach/user-plans/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user plans');
      const data = await response.json();
      return data.userPlans as UserPlan[];
    },
    enabled: !!userId
  });

  // Fetch today's reading
  const { data: todayReading, refetch: refetchTodayReading } = useQuery({
    queryKey: ['scripture-coach-today-reading', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/scripture-coach/today-reading/${userId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch today\'s reading');
      }
      const data = await response.json();
      return data.todayReading as TodayReading;
    },
    enabled: !!userId
  });

  // Fetch progress stats
  const { data: progressStats } = useQuery({
    queryKey: ['scripture-coach-progress', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/scripture-coach/progress/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch progress stats');
      const data = await response.json();
      return data as ProgressStats;
    },
    enabled: !!userId
  });

  // Start reading plan mutation
  const startPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch('/api/scripture-coach/start-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start reading plan');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reading Plan Started!",
        description: "Your new reading plan is now active. Check the 'My Plans' tab to see your progress.",
      });
      refetchUserPlans();
      refetchTodayReading();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark reading complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/scripture-coach/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark reading complete');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.completed) {
        toast({
          title: "🎉 Congratulations!",
          description: data.message,
        });
      } else {
        toast({
          title: "Great Job!",
          description: data.message,
        });
      }
      refetchUserPlans();
      refetchTodayReading();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleStartPlan = (plan: ReadingPlan) => {
    setSelectedPlan(plan);
    startPlanMutation.mutate(plan.id);
  };

  const handleMarkComplete = () => {
    markCompleteMutation.mutate();
  };

  const getProgressPercentage = (currentDay: number, totalDays: number) => {
    return Math.round((currentDay / totalDays) * 100);
  };

  const getStreakDays = () => {
    if (!progressStats) return 0;
    return progressStats.totalDaysRead;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header - Consistent with Application Style */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-gi-gold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gi-primary font-poppins">
              Scripture Coach
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto md:mx-0">
            Transform your spiritual journey with structured Bible reading plans and progress tracking
          </p>
        </div>

        {/* Stats Overview - Application Consistent Style */}
        {progressStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gi-primary" />
                  <div>
                    <p className="text-sm text-gray-600">Days Read</p>
                    <p className="text-2xl font-bold text-gi-primary">{getStreakDays()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Plans</p>
                    <p className="text-2xl font-bold text-green-600">{progressStats.activePlans.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gi-gold" />
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gi-gold">{progressStats.completedPlans.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Book className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Plans</p>
                    <p className="text-2xl font-bold text-purple-600">{progressStats.totalPlans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 bg-white shadow-lg rounded-lg border border-gi-primary/20">
            <TabsTrigger 
              value="today" 
              className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Today's Reading</span>
              <span className="sm:hidden">Today</span>
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
            <TabsTrigger 
              value="my-plans" 
              className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">My Plans</span>
              <span className="sm:hidden">My Plans</span>
            </TabsTrigger>
            <TabsTrigger 
              value="progress" 
              className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Today's Reading Tab */}
          <TabsContent value="today" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {todayReading ? (
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                    <CardTitle className="text-2xl flex items-center gap-3 font-poppins">
                      <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-gi-gold" />
                      </div>
                      Today's Reading
                    </CardTitle>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span className="text-lg font-semibold">{todayReading.plan_name}</span>
                      <Badge className="bg-gi-primary/10 text-gi-primary border-gi-primary/20">
                        Day {todayReading.day_number} of {todayReading.total_days}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Today's Passages:</h3>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={getProgressPercentage(todayReading.day_number, todayReading.total_days)} 
                            className="w-32 h-2"
                          />
                          <span className="text-sm text-gray-600">
                            {getProgressPercentage(todayReading.day_number, todayReading.total_days)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {todayReading.references.map((reference, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-800">{reference}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t">
                        <Button 
                          onClick={handleMarkComplete}
                          disabled={markCompleteMutation.isPending}
                          className="w-full bg-gi-primary hover:bg-gi-primary/90 text-white font-semibold py-3"
                        >
                          {markCompleteMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Mark Today's Reading Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gi-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-gi-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gi-primary mb-2 font-poppins">No Active Reading Plan</h3>
                    <p className="text-gray-600 mb-6">
                      Start a reading plan to begin your daily Bible study journey.
                    </p>
                    <Button 
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                        const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                        plansTab?.click();
                      }}
                      className="bg-gi-primary hover:bg-gi-primary/90"
                    >
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Browse Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plansLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="shadow-brand-lg border border-gi-primary/20">
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  plans?.map((plan) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-gi-gold" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold text-gi-primary font-poppins">
                                  {plan.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">{plan.days} days</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Available
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {plan.description}
                          </p>
                          <Button
                            onClick={() => handleStartPlan(plan)}
                            disabled={startPlanMutation.isPending}
                            className="w-full bg-gi-primary hover:bg-gi-primary/90 font-semibold"
                          >
                            {startPlanMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Start Plan
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* My Plans Tab */}
          <TabsContent value="my-plans" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {userPlans && userPlans.length > 0 ? (
                <div className="space-y-4">
                  {userPlans.map((userPlan) => (
                    <motion.div
                      key={userPlan.plan_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="shadow-brand-lg border border-gi-primary/20 hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                userPlan.is_active 
                                  ? 'bg-gi-primary' 
                                  : 'bg-gray-400'
                              }`}>
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                  {userPlan.plan_name}
                                </h3>
                                <p className="text-sm text-gray-600">{userPlan.description}</p>
                              </div>
                            </div>
                            <Badge variant={userPlan.is_active ? "default" : "secondary"}>
                              {userPlan.is_active ? "Active" : "Completed"}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Progress</span>
                              <span className="text-sm text-gray-600">
                                Day {userPlan.current_day} of {userPlan.days}
                              </span>
                            </div>
                            <Progress 
                              value={getProgressPercentage(userPlan.current_day, userPlan.days)} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Started: {new Date(userPlan.start_date).toLocaleDateString()}</span>
                              <span>{getProgressPercentage(userPlan.current_day, userPlan.days)}% complete</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gi-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-gi-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-gi-primary mb-2 font-poppins">No Reading Plans Yet</h3>
                    <p className="text-gray-600 mb-6">
                      Start your first reading plan to begin your spiritual journey.
                    </p>
                    <Button 
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                        const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                        plansTab?.click();
                      }}
                      className="bg-gi-primary hover:bg-gi-primary/90"
                    >
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Progress Tab - Enhanced with Advanced Visual Progress */}
          <TabsContent value="progress" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {progressStats ? (
                <div className="space-y-6">
                  {/* Overall Progress Visual */}
                  <Card className="shadow-brand-lg border border-gi-primary/20">
                    <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                      <CardTitle className="flex items-center gap-2 font-poppins">
                        <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center">
                          <Award className="h-4 w-4 text-gi-gold" />
                        </div>
                        Your Scripture Journey Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Circular Progress for Total Reading */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="8"
                                strokeDasharray={`${(progressStats.totalDaysRead / 365) * 339.292} 339.292`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{progressStats.totalDaysRead}</div>
                                <div className="text-xs text-gray-500">Days</div>
                              </div>
                            </div>
                          </div>
                          <h3 className="font-semibold text-gray-800">Reading Streak</h3>
                          <p className="text-sm text-gray-600">Keep up the momentum!</p>
                        </div>

                        {/* Plan Completion Chart */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#F59E0B"
                                strokeWidth="8"
                                strokeDasharray={`${progressStats.totalPlans > 0 ? (progressStats.completedPlans.length / progressStats.totalPlans) * 339.292 : 0} 339.292`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gi-gold">{progressStats.completedPlans.length}</div>
                                <div className="text-xs text-gray-500">Plans</div>
                              </div>
                            </div>
                          </div>
                          <h3 className="font-semibold text-gray-800">Completed Plans</h3>
                          <p className="text-sm text-gray-600">Great achievement!</p>
                        </div>

                        {/* Active Plans Gauge */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                              />
                              <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#3B82F6"
                                strokeWidth="8"
                                strokeDasharray={`${Math.min(progressStats.activePlans.length / 3, 1) * 339.292} 339.292`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{progressStats.activePlans.length}</div>
                                <div className="text-xs text-gray-500">Active</div>
                              </div>
                            </div>
                          </div>
                          <h3 className="font-semibold text-gray-800">Active Plans</h3>
                          <p className="text-sm text-gray-600">Stay focused!</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detailed Reading Statistics */}
                    <Card className="shadow-brand-lg border border-gi-primary/20">
                      <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                        <CardTitle className="flex items-center gap-2 font-poppins">
                          <TrendingUp className="h-5 w-5 text-gi-primary" />
                          Reading Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 rounded-lg border border-gi-primary/10">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-gi-primary" />
                              <span className="font-medium text-gray-700">Total Days Read</span>
                            </div>
                            <span className="text-2xl font-bold text-gi-primary">{progressStats.totalDaysRead}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Active Plans</span>
                              <span className="text-lg font-bold text-green-600">{progressStats.activePlans.length}</span>
                            </div>
                            <Progress value={progressStats.activePlans.length * 25} className="h-2" />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Completed Plans</span>
                              <span className="text-lg font-bold text-gi-gold">{progressStats.completedPlans.length}</span>
                            </div>
                            <Progress value={progressStats.completedPlans.length * 20} className="h-2" />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                              <span className="text-lg font-bold text-purple-600">
                                {progressStats.totalPlans > 0 ? Math.round((progressStats.completedPlans.length / progressStats.totalPlans) * 100) : 0}%
                              </span>
                            </div>
                            <Progress 
                              value={progressStats.totalPlans > 0 ? (progressStats.completedPlans.length / progressStats.totalPlans) * 100 : 0} 
                              className="h-2" 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Plan Progress Details */}
                    <Card className="shadow-brand-lg border border-gi-primary/20">
                      <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                        <CardTitle className="flex items-center gap-2 font-poppins">
                          <Clock className="h-5 w-5 text-gi-primary" />
                          Active Plan Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <ScrollArea className="h-64">
                          {progressStats.activePlans.length > 0 ? (
                            <div className="space-y-4">
                              {progressStats.activePlans.map((plan) => (
                                <div key={plan.plan_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h4 className="font-semibold text-gray-800 font-poppins">{plan.plan_name}</h4>
                                      <p className="text-sm text-gray-600">Day {plan.current_day} of {plan.days}</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      {getProgressPercentage(plan.current_day, plan.days)}%
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <Progress value={getProgressPercentage(plan.current_day, plan.days)} className="h-3" />
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>Started: {new Date(plan.start_date).toLocaleDateString()}</span>
                                      <span>{plan.days - plan.current_day} days remaining</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-500">No active plans to track</p>
                              <Button 
                                onClick={() => {
                                  const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                                  const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                                  plansTab?.click();
                                }}
                                className="mt-3 bg-gi-primary hover:bg-gi-primary/90"
                                size="sm"
                              >
                                Start a Plan
                              </Button>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Achievement Badges */}
                  <Card className="shadow-brand-lg border border-gi-primary/20">
                    <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                      <CardTitle className="flex items-center gap-2 font-poppins">
                        <Award className="h-5 w-5 text-gi-primary" />
                        Your Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* First Plan Badge */}
                        <div className={`text-center p-4 rounded-lg border-2 transition-all ${
                          progressStats.totalPlans >= 1 
                            ? 'bg-gi-primary/5 border-gi-primary text-gi-primary' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <Star className={`h-8 w-8 mx-auto mb-2 ${progressStats.totalPlans >= 1 ? 'text-gi-gold' : 'text-gray-400'}`} />
                          <p className="font-semibold text-sm">First Steps</p>
                          <p className="text-xs">Start first plan</p>
                        </div>

                        {/* Week Streak Badge */}
                        <div className={`text-center p-4 rounded-lg border-2 transition-all ${
                          progressStats.totalDaysRead >= 7 
                            ? 'bg-gi-primary/5 border-gi-primary text-gi-primary' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <Calendar className={`h-8 w-8 mx-auto mb-2 ${progressStats.totalDaysRead >= 7 ? 'text-gi-gold' : 'text-gray-400'}`} />
                          <p className="font-semibold text-sm">Weekly Warrior</p>
                          <p className="text-xs">7 day streak</p>
                        </div>

                        {/* Plan Completion Badge */}
                        <div className={`text-center p-4 rounded-lg border-2 transition-all ${
                          progressStats.completedPlans.length >= 1 
                            ? 'bg-gi-primary/5 border-gi-primary text-gi-primary' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <Trophy className={`h-8 w-8 mx-auto mb-2 ${progressStats.completedPlans.length >= 1 ? 'text-gi-gold' : 'text-gray-400'}`} />
                          <p className="font-semibold text-sm">Plan Finisher</p>
                          <p className="text-xs">Complete 1 plan</p>
                        </div>

                        {/* Dedicated Reader Badge */}
                        <div className={`text-center p-4 rounded-lg border-2 transition-all ${
                          progressStats.totalDaysRead >= 30 
                            ? 'bg-gi-primary/5 border-gi-primary text-gi-primary' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <BookOpen className={`h-8 w-8 mx-auto mb-2 ${progressStats.totalDaysRead >= 30 ? 'text-gi-gold' : 'text-gray-400'}`} />
                          <p className="font-semibold text-sm">Dedicated</p>
                          <p className="text-xs">30 days read</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2 font-poppins">No Progress Data</h3>
                    <p className="text-gray-500 mb-6">Start a reading plan to see your detailed progress tracking here.</p>
                    <Button 
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                        const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                        plansTab?.click();
                      }}
                      className="bg-gi-primary hover:bg-gi-primary/90"
                    >
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}







