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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Scripture Coach
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Transform your spiritual journey with structured Bible reading plans, 
            verse memorization, and daily devotionals designed for believers.
          </p>
        </motion.div>

        {/* Stats Overview */}
        {progressStats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Days Read</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{getStreakDays()}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Active Plans</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{progressStats.activePlans.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Completed</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{progressStats.completedPlans.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Book className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Total Plans</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{progressStats.totalPlans}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Today's Reading</span>
              <span className="sm:hidden">Today</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
            <TabsTrigger value="my-plans" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">My Plans</span>
              <span className="sm:hidden">My Plans</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
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
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <BookOpen className="h-6 w-6" />
                      Today's Reading
                    </CardTitle>
                    <div className="flex items-center gap-4 text-blue-100">
                      <span className="text-lg font-semibold">{todayReading.plan_name}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
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
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl"
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
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Reading Plan</h3>
                    <p className="text-gray-500 mb-6">
                      Start a reading plan to begin your daily Bible study journey.
                    </p>
                    <Button 
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                        const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                        plansTab?.click();
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
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
                    <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
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
                      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold text-gray-800">
                                  {plan.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">{plan.days} days</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
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
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
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
                      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                userPlan.is_active 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
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
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Reading Plans Yet</h3>
                    <p className="text-gray-500 mb-6">
                      Start your first reading plan to begin your spiritual journey.
                    </p>
                    <Button 
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]') as HTMLElement;
                        const plansTab = tabsList?.querySelector('[value="plans"]') as HTMLElement;
                        plansTab?.click();
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      Browse Reading Plans
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {progressStats ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Reading Statistics */}
                  <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Reading Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-gray-700">Total Days Read</span>
                        <span className="text-2xl font-bold text-blue-600">{progressStats.totalDaysRead}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-medium text-gray-700">Active Plans</span>
                        <span className="text-2xl font-bold text-green-600">{progressStats.activePlans.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <span className="font-medium text-gray-700">Completed Plans</span>
                        <span className="text-2xl font-bold text-yellow-600">{progressStats.completedPlans.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="font-medium text-gray-700">Total Plans</span>
                        <span className="text-2xl font-bold text-purple-600">{progressStats.totalPlans}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressStats.userPlans.length > 0 ? (
                        <div className="space-y-3">
                          {progressStats.userPlans.slice(0, 5).map((plan) => (
                            <div key={plan.plan_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  plan.is_active ? 'bg-green-500' : 'bg-gray-400'
                                }`}></div>
                                <div>
                                  <p className="font-medium text-gray-800">{plan.plan_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {plan.is_active ? `Day ${plan.current_day} of ${plan.days}` : 'Completed'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={plan.is_active ? "default" : "secondary"}>
                                {plan.is_active ? "Active" : "Done"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">No activity yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Progress Data</h3>
                    <p className="text-gray-500">Start a reading plan to see your progress here.</p>
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







