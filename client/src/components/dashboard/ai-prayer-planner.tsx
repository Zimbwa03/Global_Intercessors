import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Copy, Volume2, RefreshCw, Save, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface PrayerPoint {
  title: string;
  content: string;
  bibleVerse: string;
  reference: string;
  explanation: string;
}

interface PrayerPlanResponse {
  category: string;
  prayerPoints: PrayerPoint[];
  totalPoints: number;
}

const prayerCategories = [
  { value: "nation", label: "Nation & Government" },
  { value: "healing", label: "Healing & Health" },
  { value: "deliverance", label: "Deliverance & Freedom" },
  { value: "revival", label: "Revival & Awakening" },
  { value: "family", label: "Family & Relationships" },
  { value: "finance", label: "Financial Breakthrough" },
  { value: "protection", label: "Protection & Safety" },
  { value: "wisdom", label: "Wisdom & Guidance" },
  { value: "church", label: "Church & Ministry" },
  { value: "missions", label: "Missions & Evangelism" }
];

export function AIPrayerPlanner() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [prayerPlan, setPrayerPlan] = useState<PrayerPlanResponse | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Get current user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    })();
  }, []);

  const plannerMutation = useMutation({
    mutationFn: async (category: string) => {
      const response = await fetch("/api/prayer-planner", {
        method: "POST",
        body: JSON.stringify({ category }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to generate prayer plan');
      return response.json();
    },
    onSuccess: (data) => {
      setPrayerPlan(data);
      setIsSaved(false); // Reset saved status for new plan
      toast({
        title: "Prayer Plan Generated",
        description: `Generated ${data.totalPoints} prayer points for ${data.category}`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate prayer plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGeneratePlan = () => {
    if (!selectedCategory) {
      toast({
        title: "Please select a category",
        description: "Choose a prayer category to generate structured prayer points.",
        variant: "destructive"
      });
      return;
    }

    plannerMutation.mutate(selectedCategory);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Prayer point has been copied successfully."
    });
  };

  const copyAllPrayerPoints = () => {
    if (!prayerPlan) return;
    
    const allPoints = prayerPlan.prayerPoints.map((point, index) => 
      `${index + 1}. ${point.title}\n${point.content}\n\n${point.reference}: "${point.bibleVerse}"\n\n${point.explanation}\n\n---\n`
    ).join('\n');
    
    const fullText = `Prayer Points for ${prayerPlan.category}\n\n${allPoints}`;
    
    navigator.clipboard.writeText(fullText);
    toast({
      title: "All prayer points copied",
      description: "Complete prayer plan has been copied to clipboard."
    });
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Save prayer points to database
  const savePrayerPointsMutation = useMutation({
    mutationFn: async () => {
      if (!prayerPlan || !userId) throw new Error("Missing data");
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const categoryLabel = prayerCategories.find(c => c.value === selectedCategory)?.label || selectedCategory;
      
      // Save each prayer point
      const savePromises = prayerPlan.prayerPoints.map((point, index) => 
        fetch('/api/prayer-planner/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: point.title,
            content: `${point.content}\n\n📖 ${point.reference}: "${point.bibleVerse}"\n\n💡 ${point.explanation}`,
            notes: point.explanation,
            category: selectedCategory,
            date: today,
            userId: userId,
            isCompleted: false
          })
        })
      );
      
      await Promise.all(savePromises);
      return { count: prayerPlan.prayerPoints.length, category: categoryLabel };
    },
    onSuccess: (data) => {
      setIsSaved(true);
      toast({
        title: "✅ Prayer Points Saved!",
        description: `Successfully saved ${data.count} prayer points for ${data.category} to your prayer plan.`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save prayer points. Please try again.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-gi-primary" />
            AI-Powered Prayer Point Planner
          </CardTitle>
          <p className="text-sm text-gray-600">
            Generate structured, biblically-grounded prayer points for your intercession time
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Prayer Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a prayer focus..." />
              </SelectTrigger>
              <SelectContent>
                {prayerCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGeneratePlan}
            className="w-full md:w-auto px-6 py-3 text-sm md:text-base"
            disabled={plannerMutation.isPending || !selectedCategory}
          >
            {plannerMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gi-primary/primary border-t-transparent mr-2" />
                Generating Prayer Points...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Prayer Points
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Prayer Plan Display */}
      {prayerPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-gi-primary" />
                Prayer Points for {prayerCategories.find(c => c.value === selectedCategory)?.label}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{prayerPlan.totalPoints} Points</Badge>
                {isSaved && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Saved
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={isSaved ? "outline" : "default"}
                  onClick={() => savePrayerPointsMutation.mutate()}
                  disabled={savePrayerPointsMutation.isPending || isSaved || !userId}
                  data-testid="button-save-prayer-plan"
                >
                  {savePrayerPointsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Prayer Plan
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyAllPrayerPoints}
                  data-testid="button-copy-all-prayer-points"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {prayerPlan.prayerPoints.map((point, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg text-gi-primary">
                    {index + 1}. {point.title}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${point.title}\n${point.content}\n\n${point.reference}: "${point.bibleVerse}"`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => speakText(point.content)}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {point.content}
                </p>

                {/* Bible Verse */}
                <div className="bg-gi-primary/50 dark:bg-gi-primary/900/20 p-3 rounded-lg border-l-4 border-gi-primary/500">
                  <p className="text-sm font-medium text-gi-primary/700 dark:text-gi-primary/300 mb-1">
                    {point.reference}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 italic">
                    "{point.bibleVerse}"
                  </p>
                </div>

                {/* Explanation */}
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {point.explanation}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}