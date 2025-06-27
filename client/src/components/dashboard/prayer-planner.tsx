import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Plus, 
  Edit, 
  Save, 
  Trash2, 
  Copy, 
  Search, 
  Calendar, 
  BookOpen, 
  Lightbulb,
  RefreshCw,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Book
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface PrayerPoint {
  id: string;
  title: string;
  content: string;
  notes: string;
  category: string;
  isCompleted: boolean;
  createdAt: string;
  order: number;
}

interface DailyPrayerPlan {
  id: string;
  date: string;
  prayerPoints: PrayerPoint[];
  totalPoints: number;
  completedPoints: number;
}

interface AIGeneratedPoint {
  title: string;
  content: string;
  bibleVerse: string;
  reference: string;
  explanation: string;
}

interface PrayerGuideSection {
  title: string;
  content: string;
  icon: string;
  type: 'framework' | 'theme' | 'scripture' | 'principle';
}

const prayerCategories = [
  { value: "personal", label: "Personal Growth", icon: "🙏", color: "bg-blue-100 text-blue-800" },
  { value: "family", label: "Family & Relationships", icon: "👨‍👩‍👧‍👦", color: "bg-green-100 text-green-800" },
  { value: "church", label: "Church & Ministry", icon: "⛪", color: "bg-purple-100 text-purple-800" },
  { value: "nation", label: "Nation & Government", icon: "🏛️", color: "bg-red-100 text-red-800" },
  { value: "healing", label: "Healing & Health", icon: "💚", color: "bg-emerald-100 text-emerald-800" },
  { value: "missions", label: "Missions & Evangelism", icon: "🌍", color: "bg-cyan-100 text-cyan-800" },
  { value: "breakthrough", label: "Breakthrough & Deliverance", icon: "⚡", color: "bg-yellow-100 text-yellow-800" },
  { value: "wisdom", label: "Wisdom & Guidance", icon: "🧠", color: "bg-indigo-100 text-indigo-800" }
];

const prayerGuideData: PrayerGuideSection[] = [
  {
    title: "ACTS Framework",
    content: "Adoration - Praise God for who He is\nConfession - Acknowledge sins and seek forgiveness\nThanksgiving - Thank God for His blessings\nSupplication - Present your requests and intercessions",
    icon: "🎯",
    type: "framework"
  },
  {
    title: "PRAY Method",
    content: "Praise - Begin with worship and adoration\nRepent - Confess and turn from sin\nAsk - Present your requests and needs\nYield - Submit to God's will and timing",
    icon: "📋",
    type: "framework"
  },
  {
    title: "Intercessory Focus Areas",
    content: "• Family members and their spiritual growth\n• Church leadership and ministry effectiveness\n• Community transformation and revival\n• Nations and global evangelization\n• Those in authority and government\n• The persecuted church worldwide",
    icon: "🎯",
    type: "theme"
  },
  {
    title: "Scripture for Intercession",
    content: "1 Timothy 2:1-2 - 'I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people—for kings and all those in authority...'\n\nEzekiel 22:30 - 'I looked for someone among them who would build up the wall and stand before me in the gap on behalf of the land...'",
    icon: "📖",
    type: "scripture"
  },
  {
    title: "Effective Intercession Principles",
    content: "• Pray with faith and persistence\n• Use Scripture to guide your prayers\n• Listen for God's heart on matters\n• Pray specifically, not just generally\n• Stand in the gap for others\n• Pray until breakthrough comes",
    icon: "💡",
    type: "principle"
  }
];

export function PrayerPlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPointTitle, setNewPointTitle] = useState("");
  const [newPointContent, setNewPointContent] = useState("");
  const [newPointCategory, setNewPointCategory] = useState("");
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  // Fetch daily prayer plan
  const { data: dailyPlan, refetch } = useQuery({
    queryKey: ['daily-prayer-plan', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/prayer-planner/daily?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch prayer plan');
      return response.json() as Promise<DailyPrayerPlan>;
    }
  });

  // Create new prayer point
  const createPointMutation = useMutation({
    mutationFn: async (pointData: Omit<PrayerPoint, 'id' | 'createdAt' | 'order'>) => {
      const response = await fetch('/api/prayer-planner/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pointData, date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to create prayer point');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setNewPointTitle("");
      setNewPointContent("");
      setNewPointCategory("");
      toast({
        title: "Prayer Point Added",
        description: "Your prayer point has been saved successfully."
      });
    }
  });

  // Update prayer point
  const updatePointMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PrayerPoint> }) => {
      const response = await fetch(`/api/prayer-planner/points/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update prayer point');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setEditingPoint(null);
      toast({
        title: "Prayer Point Updated",
        description: "Your changes have been saved."
      });
    }
  });

  // Delete prayer point
  const deletePointMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prayer-planner/points/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete prayer point');
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Prayer Point Deleted",
        description: "The prayer point has been removed."
      });
    }
  });

  // AI Assistant for prayer point generation
  const aiAssistantMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch('/api/prayer-planner/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category: newPointCategory })
      });
      if (!response.ok) throw new Error('Failed to get AI assistance');
      return response.json() as Promise<AIGeneratedPoint>;
    },
    onSuccess: (data) => {
      setNewPointTitle(data.title);
      setNewPointContent(data.content);
      setShowAIAssistant(false);
      toast({
        title: "AI Assistance Applied",
        description: "DeepSeek Assistant has generated prayer content for you."
      });
    }
  });

  const handleCreatePoint = () => {
    if (!newPointTitle.trim() || !newPointContent.trim() || !newPointCategory) {
      toast({
        title: "Missing Information",
        description: "Please fill in title, content, and category.",
        variant: "destructive"
      });
      return;
    }

    createPointMutation.mutate({
      title: newPointTitle.trim(),
      content: newPointContent.trim(),
      notes: "",
      category: newPointCategory,
      isCompleted: false
    });
  };

  const togglePointExpansion = (pointId: string) => {
    const newExpanded = new Set(expandedPoints);
    if (newExpanded.has(pointId)) {
      newExpanded.delete(pointId);
    } else {
      newExpanded.add(pointId);
    }
    setExpandedPoints(newExpanded);
  };

  const handleAIAssist = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please describe what you'd like to pray for.",
        variant: "destructive"
      });
      return;
    }
    aiAssistantMutation.mutate(aiPrompt);
  };

  const copyPointToClipboard = (point: PrayerPoint) => {
    const text = `${point.title}\n\n${point.content}\n\nNotes: ${point.notes || 'None'}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Prayer point has been copied."
    });
  };

  const getCategoryInfo = (categoryValue: string) => {
    return prayerCategories.find(cat => cat.value === categoryValue) || prayerCategories[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-poppins text-xl">Prayer Planner - Your Daily Intercession Companion</span>
            </span>
            <div className="flex items-center space-x-2">
              <Dialog open={showGuide} onOpenChange={setShowGuide}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Prayer Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Book className="w-5 h-5" />
                      Comprehensive Prayer Guide
                    </DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="frameworks" className="mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
                      <TabsTrigger value="themes">Themes</TabsTrigger>
                      <TabsTrigger value="scriptures">Scriptures</TabsTrigger>
                      <TabsTrigger value="principles">Principles</TabsTrigger>
                    </TabsList>
                    {['frameworks', 'themes', 'scriptures', 'principles'].map(tab => (
                      <TabsContent key={tab} value={tab} className="mt-4">
                        <div className="space-y-4">
                          {prayerGuideData
                            .filter(section => section.type === tab.slice(0, -1) || (tab === 'scriptures' && section.type === 'scripture'))
                            .map((section, index) => (
                              <Card key={index}>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <span className="text-2xl">{section.icon}</span>
                                    {section.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                                    {section.content}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </DialogContent>
              </Dialog>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              />
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Plan, organize, and track your daily intercession with AI-powered assistance
          </p>
        </CardHeader>
      </Card>

      {/* Prayer Plan Summary */}
      {dailyPlan && (
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">
                    {isToday(parseISO(selectedDate)) ? 'Today\'s Plan' : format(parseISO(selectedDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <Badge variant="secondary">
                  {dailyPlan.completedPoints}/{dailyPlan.totalPoints} Completed
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {dailyPlan.totalPoints} prayer points
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Prayer Point */}
      <Card className="shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            Create New Prayer Point
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter prayer point title..."
                value={newPointTitle}
                onChange={(e) => setNewPointTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={newPointCategory} onValueChange={setNewPointCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {prayerCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Prayer Content</label>
              <Dialog open={showAIAssistant} onOpenChange={setShowAIAssistant}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Sparkles className="w-4 h-4 mr-1" />
                    DeepSeek Assistant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      AI Prayer Assistant
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Describe what you'd like to pray for:</label>
                      <Textarea
                        placeholder="e.g., 'healing for my family member', 'breakthrough in finances', 'church revival'..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button 
                      onClick={handleAIAssist}
                      disabled={aiAssistantMutation.isPending}
                      className="w-full"
                    >
                      {aiAssistantMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Prayer Point
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Textarea
              placeholder="Enter detailed prayer content..."
              value={newPointContent}
              onChange={(e) => setNewPointContent(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={handleCreatePoint}
            disabled={createPointMutation.isPending}
            className="w-full"
          >
            {createPointMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Prayer Point
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Prayer Points List */}
      {dailyPlan && dailyPlan.prayerPoints.length > 0 && (
        <Card className="shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Today's Prayer Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                <AnimatePresence>
                  {dailyPlan.prayerPoints.map((point, index) => {
                    const categoryInfo = getCategoryInfo(point.category);
                    const isExpanded = expandedPoints.has(point.id);
                    
                    return (
                      <motion.div
                        key={point.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={point.isCompleted}
                              onChange={(e) => updatePointMutation.mutate({
                                id: point.id,
                                updates: { isCompleted: e.target.checked }
                              })}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className={`font-semibold ${point.isCompleted ? 'line-through text-gray-500' : ''}`}>
                                  {point.title}
                                </h3>
                                <Badge className={categoryInfo.color}>
                                  {categoryInfo.icon} {categoryInfo.label}
                                </Badge>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePointExpansion(point.id)}
                                className="p-0 h-auto text-left justify-start"
                              >
                                <div className="flex items-center gap-1">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  <span className="text-sm text-gray-600">
                                    {isExpanded ? 'Hide details' : 'Show details'}
                                  </span>
                                </div>
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyPointToClipboard(point)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPoint(point.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePointMutation.mutate(point.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 pt-3 border-t"
                            >
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-1">Prayer Content:</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{point.content}</p>
                              </div>
                              
                              {point.notes && (
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 mb-1">Personal Notes:</h4>
                                  <p className="text-gray-600 text-sm leading-relaxed">{point.notes}</p>
                                </div>
                              )}

                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                Created {format(parseISO(point.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Edit Mode */}
                        {editingPoint === point.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3 pt-3 border-t"
                          >
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input
                                defaultValue={point.title}
                                onChange={(e) => {
                                  // Handle title update
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Content</label>
                              <Textarea
                                defaultValue={point.content}
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Personal Notes</label>
                              <Textarea
                                defaultValue={point.notes}
                                placeholder="Add personal reflections, insights, or prayer answers..."
                                rows={2}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => setEditingPoint(null)}>
                                <Save className="w-4 h-4 mr-1" />
                                Save Changes
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingPoint(null)}>
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {dailyPlan && dailyPlan.prayerPoints.length === 0 && (
        <Card className="shadow-lg border border-gray-200">
          <CardContent className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prayer Points Yet</h3>
            <p className="text-gray-600 mb-4">
              Start your spiritual journey by creating your first prayer point for today.
            </p>
            <Button onClick={() => document.querySelector<HTMLInputElement>('[placeholder="Enter prayer point title..."]')?.focus()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Prayer Point
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}