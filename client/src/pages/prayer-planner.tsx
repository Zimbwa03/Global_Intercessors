import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar,
  Clock,
  Heart,
  Target,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Globe,
  Users,
  Lightbulb,
  BookOpen,
  Loader2,
  Save,
  RefreshCw,
  Star,
  Bookmark
} from "lucide-react";

interface PrayerPlan {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'family' | 'community' | 'global' | 'healing' | 'guidance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration: number; // in minutes
  scriptures: string[];
  prayerPoints: string[];
  aiInsights: string[];
  createdAt: Date;
  scheduledFor?: Date;
  completed: boolean;
  effectiveness?: number; // 1-5 rating
}

interface PrayerSuggestion {
  category: string;
  title: string;
  description: string;
  scriptures: string[];
  prayerPoints: string[];
  duration: number;
}

const categoryIcons = {
  personal: Heart,
  family: Users,
  community: Globe,
  global: Target,
  healing: Sparkles,
  guidance: Lightbulb
};

const categoryColors = {
  personal: 'bg-pink-100 text-pink-800 border-pink-200',
  family: 'bg-blue-100 text-blue-800 border-blue-200',
  community: 'bg-green-100 text-green-800 border-green-200',
  global: 'bg-purple-100 text-purple-800 border-purple-200',
  healing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  guidance: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

export default function PrayerPlannerPage() {
  const [prayerPlans, setPrayerPlans] = useState<PrayerPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Partial<PrayerPlan>>({
    category: 'personal',
    priority: 'medium',
    duration: 15,
    completed: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'plans' | 'suggestions'>('create');
  const [plannerQuery, setPlannerQuery] = useState("");
  const { toast } = useToast();

  // AI Prayer Planning Mutation
  const generatePrayerPlanMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/prayer-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          category: currentPlan.category,
          duration: currentPlan.duration
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate prayer plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentPlan(prev => ({
        ...prev,
        title: data.title,
        description: data.description,
        prayerPoints: data.prayerPoints,
        scriptures: data.scriptures,
        aiInsights: data.insights
      }));
      toast({
        title: "AI Prayer Plan Generated",
        description: "Your personalized prayer plan is ready for customization."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate prayer plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Get AI Prayer Suggestions
  const { data: aiSuggestions } = useQuery({
    queryKey: ['prayer-suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/prayer-suggestions');
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  const savePrayerPlan = () => {
    if (!currentPlan.title || !currentPlan.description) {
      toast({
        title: "Incomplete Plan",
        description: "Please add a title and description to your prayer plan.",
        variant: "destructive"
      });
      return;
    }

    const newPlan: PrayerPlan = {
      id: isEditing ? currentPlan.id! : Date.now().toString(),
      title: currentPlan.title!,
      description: currentPlan.description!,
      category: currentPlan.category!,
      priority: currentPlan.priority!,
      duration: currentPlan.duration!,
      scriptures: currentPlan.scriptures || [],
      prayerPoints: currentPlan.prayerPoints || [],
      aiInsights: currentPlan.aiInsights || [],
      createdAt: isEditing ? currentPlan.createdAt! : new Date(),
      scheduledFor: currentPlan.scheduledFor,
      completed: currentPlan.completed!
    };

    if (isEditing) {
      setPrayerPlans(prev => prev.map(plan => 
        plan.id === newPlan.id ? newPlan : plan
      ));
    } else {
      setPrayerPlans(prev => [newPlan, ...prev]);
    }

    // Reset form
    setCurrentPlan({
      category: 'personal',
      priority: 'medium',
      duration: 15,
      completed: false
    });
    setIsEditing(false);
    setPlannerQuery("");

    toast({
      title: "Prayer Plan Saved",
      description: `Your ${newPlan.category} prayer plan has been saved successfully.`
    });
  };

  const editPlan = (plan: PrayerPlan) => {
    setCurrentPlan(plan);
    setIsEditing(true);
    setActiveTab('create');
  };

  const deletePlan = (planId: string) => {
    setPrayerPlans(prev => prev.filter(plan => plan.id !== planId));
    toast({
      title: "Prayer Plan Deleted",
      description: "The prayer plan has been removed from your collection."
    });
  };

  const markCompleted = (planId: string, effectiveness?: number) => {
    setPrayerPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, completed: true, effectiveness }
        : plan
    ));
    toast({
      title: "Prayer Completed",
      description: "Thank you for your faithful intercession."
    });
  };

  const addPrayerPoint = () => {
    const newPoint = "";
    setCurrentPlan(prev => ({
      ...prev,
      prayerPoints: [...(prev.prayerPoints || []), newPoint]
    }));
  };

  const updatePrayerPoint = (index: number, value: string) => {
    setCurrentPlan(prev => ({
      ...prev,
      prayerPoints: prev.prayerPoints?.map((point, i) => 
        i === index ? value : point
      )
    }));
  };

  const removePrayerPoint = (index: number) => {
    setCurrentPlan(prev => ({
      ...prev,
      prayerPoints: prev.prayerPoints?.filter((_, i) => i !== index)
    }));
  };

  const PlanCard = ({ plan }: { plan: PrayerPlan }) => {
    const IconComponent = categoryIcons[plan.category];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${categoryColors[plan.category]}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{plan.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => editPlan(plan)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePlan(plan.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Plan Details */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <Badge variant={plan.priority === 'urgent' ? 'destructive' : 'secondary'}>
                  {plan.priority}
                </Badge>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {plan.duration} min
                </div>
              </div>
              {plan.completed && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>

            {/* Prayer Points Preview */}
            {plan.prayerPoints.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Prayer Points:</h4>
                <div className="space-y-1">
                  {plan.prayerPoints.slice(0, 3).map((point, index) => (
                    <div key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      {point}
                    </div>
                  ))}
                  {plan.prayerPoints.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{plan.prayerPoints.length - 3} more points
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {plan.aiInsights.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {plan.aiInsights.slice(0, 2).map((insight, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Sparkles className="w-2 h-2 mr-1" />
                    {insight}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              {!plan.completed ? (
                <Button
                  size="sm"
                  onClick={() => markCompleted(plan.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Heart className="w-3 h-3 mr-2" />
                  Begin Prayer
                </Button>
              ) : (
                <Button size="sm" disabled className="flex-1">
                  <CheckCircle className="w-3 h-3 mr-2" />
                  Prayer Completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI-Powered Prayer Planner
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Create personalized prayer plans with AI assistance, track your prayer journey, 
            and receive intelligent suggestions for deeper spiritual growth and intercession.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeTab === 'create' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('create')}
              className="mr-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
            <Button
              variant={activeTab === 'plans' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('plans')}
              className="mr-1"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              My Plans ({prayerPlans.length})
            </Button>
            <Button
              variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('suggestions')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Suggestions
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'create' && (
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isEditing ? 'Edit Prayer Plan' : 'Create AI-Enhanced Prayer Plan'}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  {/* AI Query Input */}
                  <div>
                    <Label htmlFor="aiQuery" className="text-base font-medium">
                      Describe Your Prayer Need
                    </Label>
                    <div className="flex space-x-2 mt-2">
                      <Textarea
                        id="aiQuery"
                        value={plannerQuery}
                        onChange={(e) => setPlannerQuery(e.target.value)}
                        placeholder="e.g., 'I need prayer for healing and strength during my recovery' or 'Help me pray for my family's unity and peace' or 'Guide me in interceding for my community's spiritual awakening'"
                        rows={3}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => generatePrayerPlanMutation.mutate(plannerQuery)}
                        disabled={!plannerQuery.trim() || generatePrayerPlanMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {generatePrayerPlanMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Basic Plan Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Prayer Plan Title</Label>
                      <Input
                        id="title"
                        value={currentPlan.title || ''}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Family Healing Prayer"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={currentPlan.category}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="personal">Personal</option>
                        <option value="family">Family</option>
                        <option value="community">Community</option>
                        <option value="global">Global</option>
                        <option value="healing">Healing</option>
                        <option value="guidance">Guidance</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <select
                        id="priority"
                        value={currentPlan.priority}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={currentPlan.duration}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        min="5"
                        max="120"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={currentPlan.description || ''}
                      onChange={(e) => setCurrentPlan(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the focus and purpose of this prayer plan..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Prayer Points */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">Prayer Points</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPrayerPoint}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Point
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {(currentPlan.prayerPoints || []).map((point, index) => (
                        <div key={index} className="flex space-x-2">
                          <Input
                            value={point}
                            onChange={(e) => updatePrayerPoint(index, e.target.value)}
                            placeholder="Enter prayer point..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrayerPoint(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insights Display */}
                  {currentPlan.aiInsights && currentPlan.aiInsights.length > 0 && (
                    <div>
                      <Label className="text-base font-medium">AI Insights</Label>
                      <div className="mt-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex flex-wrap gap-2">
                          {currentPlan.aiInsights.map((insight, index) => (
                            <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                              <Lightbulb className="w-3 h-3 mr-1" />
                              {insight}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scripture References */}
                  {currentPlan.scriptures && currentPlan.scriptures.length > 0 && (
                    <div>
                      <Label className="text-base font-medium">Scripture References</Label>
                      <div className="mt-2 space-y-2">
                        {currentPlan.scriptures.map((scripture, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <div className="flex items-center">
                              <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
                              <span className="font-medium text-blue-800">{scripture}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    onClick={savePrayerPlan}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update Prayer Plan' : 'Save Prayer Plan'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-6">
                {prayerPlans.length > 0 ? (
                  <div className="grid gap-4">
                    <AnimatePresence>
                      {prayerPlans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        No Prayer Plans Yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Create your first AI-enhanced prayer plan to begin your structured prayer journey.
                      </p>
                      <Button onClick={() => setActiveTab('create')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Plan
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                      AI-Generated Prayer Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiSuggestions ? (
                      <div className="grid gap-4">
                        {aiSuggestions.map((suggestion: PrayerSuggestion, index: number) => (
                          <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                            <h4 className="font-medium mb-2">{suggestion.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{suggestion.category}</Badge>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setCurrentPlan({
                                    ...currentPlan,
                                    title: suggestion.title,
                                    description: suggestion.description,
                                    prayerPoints: suggestion.prayerPoints,
                                    scriptures: suggestion.scriptures,
                                    duration: suggestion.duration,
                                    category: suggestion.category as any
                                  });
                                  setActiveTab('create');
                                }}
                              >
                                Use This Plan
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
                        <p className="text-gray-600">Loading AI suggestions...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prayer Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  Prayer Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Plans</span>
                    <Badge variant="secondary">{prayerPlans.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="secondary">
                      {prayerPlans.filter(p => p.completed).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Plans</span>
                    <Badge variant="secondary">
                      {prayerPlans.filter(p => !p.completed).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prayer Time</span>
                    <Badge variant="secondary">
                      {prayerPlans.reduce((acc, p) => acc + (p.completed ? p.duration : 0), 0)} min
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setPlannerQuery("Create a morning prayer plan for spiritual strength and guidance");
                      setActiveTab('create');
                    }}
                  >
                    <Calendar className="w-3 h-3 mr-2" />
                    Morning Prayer Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setPlannerQuery("Help me pray for my family's health, unity, and spiritual growth");
                      setActiveTab('create');
                    }}
                  >
                    <Users className="w-3 h-3 mr-2" />
                    Family Prayer Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setPlannerQuery("Create an intercession plan for global peace and healing");
                      setActiveTab('create');
                    }}
                  >
                    <Globe className="w-3 h-3 mr-2" />
                    Global Intercession
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {prayerPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Clock className="w-5 h-5 mr-2 text-green-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prayerPlans.slice(0, 3).map((plan) => (
                      <div key={plan.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className={`p-1 rounded ${categoryColors[plan.category]}`}>
                          {React.createElement(categoryIcons[plan.category], { className: "w-3 h-3" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{plan.title}</p>
                          <p className="text-xs text-gray-500">
                            {plan.completed ? 'Completed' : 'Active'} • {plan.duration} min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}