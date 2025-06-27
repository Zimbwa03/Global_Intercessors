import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Calendar, 
  Heart, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Sparkles,
  Clock,
  Award,
  Plus,
  Star,
  ChevronRight,
  Lightbulb,
  Mountain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface PrayerJourneyVisualizerProps {
  userId?: string;
}

interface JourneyEntry {
  id: string;
  userId: string;
  journeyType: string;
  title: string;
  description: string;
  emotionalState: string;
  prayerFocus: string;
  scriptureMeditation?: string;
  personalNotes?: string;
  tags: string[];
  createdAt: string;
}

interface PrayerGoal {
  id: string;
  userId: string;
  goalType: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  status: string;
  isCompleted: boolean;
  createdAt: string;
}

interface SpiritualInsight {
  id: string;
  userId: string;
  insightDate: string;
  gratitudeNote?: string;
  prayerRequest?: string;
  answeredPrayer?: string;
  spiritualGrowthArea?: string;
  bibleVerse?: string;
  personalReflection?: string;
  moodRating?: number;
  faithLevel?: number;
}

export function PrayerJourneyVisualizer({ userId }: PrayerJourneyVisualizerProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'goals' | 'insights'>('overview');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || userId || null);
    };
    getCurrentUser();
  }, [userId]);

  // Fetch prayer journey data
  const { data: journeyData, isLoading, refetch } = useQuery({
    queryKey: ['prayer-journey', currentUserId, selectedTimeframe],
    queryFn: async () => {
      if (!currentUserId) return null;
      
      const response = await fetch(`/api/prayer-journey/${currentUserId}?timeframe=${selectedTimeframe}`);
      if (!response.ok) throw new Error('Failed to fetch prayer journey');
      return response.json();
    },
    enabled: !!currentUserId,
    refetchInterval: 60000 // Refetch every minute
  });

  const getJourneyTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone': return Award;
      case 'reflection': return Heart;
      case 'insight': return Lightbulb;
      case 'breakthrough': return Mountain;
      default: return Sparkles;
    }
  };

  const getEmotionalStateColor = (state: string) => {
    switch (state) {
      case 'joyful': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'peaceful': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'grateful': return 'bg-green-100 text-green-800 border-green-200';
      case 'seeking': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hopeful': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateJourneyStats = () => {
    if (!journeyData) return { totalEntries: 0, averageMood: 0, averageFaith: 0, completedGoals: 0 };
    
    const totalEntries = journeyData.journey?.length || 0;
    const insights = journeyData.insights || [];
    const goals = journeyData.goals || [];
    
    const averageMood = insights.length > 0 
      ? insights.reduce((sum: number, insight: SpiritualInsight) => sum + (insight.moodRating || 0), 0) / insights.length
      : 0;
    
    const averageFaith = insights.length > 0 
      ? insights.reduce((sum: number, insight: SpiritualInsight) => sum + (insight.faithLevel || 0), 0) / insights.length
      : 0;
    
    const completedGoals = goals.filter((goal: PrayerGoal) => goal.isCompleted).length;
    
    return { totalEntries, averageMood, averageFaith, completedGoals };
  };

  const stats = calculateJourneyStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-poppins font-semibold text-brand-text mb-2">Loading Your Prayer Journey...</h2>
          <p className="text-gray-600">Gathering your spiritual insights and growth data...</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Journey Stats */}
      <Card className="border border-blue-100 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Journey Entries</p>
              <p className="text-2xl font-bold text-brand-primary">{stats.totalEntries}</p>
            </div>
            <BookOpen className="w-8 h-8 text-brand-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-green-100 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Mood</p>
              <p className="text-2xl font-bold text-green-600">{stats.averageMood.toFixed(1)}/10</p>
            </div>
            <Heart className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-purple-100 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Faith Level</p>
              <p className="text-2xl font-bold text-purple-600">{stats.averageFaith.toFixed(1)}/10</p>
            </div>
            <Star className="w-8 h-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-yellow-100 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Goals Completed</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.completedGoals}</p>
            </div>
            <Target className="w-8 h-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderJourneyTimeline = () => (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {journeyData?.journey?.map((entry: JourneyEntry, index: number) => {
          const IconComponent = getJourneyTypeIcon(entry.journeyType);
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100 hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-brand-text font-poppins">{entry.title}</h4>
                  <Badge className={getEmotionalStateColor(entry.emotionalState)}>
                    {entry.emotionalState}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-2">{entry.description}</p>
                {entry.scriptureMeditation && (
                  <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 mb-2">
                    📖 {entry.scriptureMeditation}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{entry.prayerFocus}</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      {journeyData?.goals?.map((goal: PrayerGoal) => {
        const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
        return (
          <Card key={goal.id} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h4 className="font-semibold text-brand-text">{goal.title}</h4>
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  </div>
                </div>
                <Badge variant={goal.isCompleted ? 'default' : 'secondary'}>
                  {goal.status}
                </Badge>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{goal.currentValue}/{goal.targetValue}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-brand-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                {progress.toFixed(1)}% complete • {goal.goalType}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderInsights = () => (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {journeyData?.insights?.map((insight: SpiritualInsight, index: number) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-100"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-brand-text font-poppins">
                Daily Reflection
              </h4>
              <div className="flex items-center space-x-2">
                {insight.moodRating && (
                  <Badge className="bg-green-100 text-green-800">
                    Mood: {insight.moodRating}/10
                  </Badge>
                )}
                {insight.faithLevel && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Faith: {insight.faithLevel}/10
                  </Badge>
                )}
              </div>
            </div>
            
            {insight.gratitudeNote && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-green-700 mb-1">🙏 Gratitude</h5>
                <p className="text-sm text-gray-600">{insight.gratitudeNote}</p>
              </div>
            )}
            
            {insight.prayerRequest && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-blue-700 mb-1">🤲 Prayer Request</h5>
                <p className="text-sm text-gray-600">{insight.prayerRequest}</p>
              </div>
            )}
            
            {insight.bibleVerse && (
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 mb-2">
                📖 {insight.bibleVerse}
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {new Date(insight.insightDate).toLocaleDateString()}
              {insight.spiritualGrowthArea && ` • Growing in: ${insight.spiritualGrowthArea}`}
            </div>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-poppins text-xl">Prayer Journey Visualizer</span>
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(parseInt(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 3 months</option>
                <option value={365}>Last year</option>
              </select>
              <Button
                onClick={() => refetch()}
                size="sm"
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white rounded-lg p-2 shadow-sm border">
        {['overview', 'journey', 'goals', 'insights'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            onClick={() => setActiveTab(tab as any)}
            className="flex-1 capitalize"
          >
            {tab === 'overview' && <TrendingUp className="w-4 h-4 mr-2" />}
            {tab === 'journey' && <BookOpen className="w-4 h-4 mr-2" />}
            {tab === 'goals' && <Target className="w-4 h-4 mr-2" />}
            {tab === 'insights' && <Lightbulb className="w-4 h-4 mr-2" />}
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div>
              {renderOverview()}
              <Card className="shadow-lg border border-blue-100">
                <CardHeader>
                  <CardTitle className="text-lg font-poppins">Recent Journey Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderJourneyTimeline()}
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 'journey' && (
            <Card className="shadow-lg border border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg font-poppins">Prayer Journey Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {renderJourneyTimeline()}
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'goals' && (
            <Card className="shadow-lg border border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg font-poppins">Spiritual Goals & Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                {renderGoals()}
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'insights' && (
            <Card className="shadow-lg border border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg font-poppins">Daily Spiritual Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {renderInsights()}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {!journeyData?.journey?.length && !journeyData?.goals?.length && !journeyData?.insights?.length && (
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Prayer Journey</h3>
            <p className="text-gray-600 mb-4">
              Begin documenting your spiritual growth and prayer experiences
            </p>
            <Button className="bg-brand-primary hover:bg-brand-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add First Entry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}