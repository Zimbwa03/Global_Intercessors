
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Copy, Volume2, Sparkles, BookOpen, Target } from "lucide-react";

interface PrayerResponse {
  bibleVerses: Array<{
    verse: string;
    reference: string;
    version: string;
  }>;
  prayerPoints: string[];
  encouragement: string;
}

export function AIPrayerAssistant() {
  const [prayerRequest, setPrayerRequest] = useState("");
  const [response, setResponse] = useState<PrayerResponse | null>(null);
  const [recentRequests, setRecentRequests] = useState<string[]>([
    "Guide my prayer for strength during difficult times",
    "Help me pray for my family's financial breakthrough",
    "Prayer for healing and restoration",
    "Wisdom for important life decisions",
    "Protection and safety for loved ones"
  ]);
  const { toast } = useToast();

  const prayerAssistantMutation = useMutation({
    mutationFn: async (request: string) => {
      const response = await fetch('/api/prayer-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get prayer guidance');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResponse(data);
      toast({
        title: "Prayer Guidance Generated",
        description: "Your personalized prayer guidance is ready."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate prayer guidance. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePrayerRequest = async () => {
    if (!prayerRequest.trim()) {
      toast({
        title: "Prayer Request Required",
        description: "Please enter what you'd like prayer guidance for",
        variant: "destructive"
      });
      return;
    }

    prayerAssistantMutation.mutate(prayerRequest.trim());
  };

  const handleQuickRequest = (request: string) => {
    setPrayerRequest(request);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied successfully."
    });
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const copyAllPrayerPoints = () => {
    if (!response) return;
    
    const allContent = [
      "=== Prayer Guidance ===",
      "",
      "Bible Verses:",
      ...response.bibleVerses.map(verse => `${verse.reference} (${verse.version}): "${verse.verse}"`),
      "",
      "Prayer Points:",
      ...response.prayerPoints.map((point, index) => `${index + 1}. ${point}`),
      "",
      "Encouragement:",
      response.encouragement
    ].join('\n');
    
    copyToClipboard(allContent);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Heart className="w-6 h-6 text-brand-primary" />
          AI Prayer Assistant
        </h2>
        <p className="text-gray-600">Get biblical guidance and structured prayer points for your needs</p>
      </div>

      {/* Prayer Request Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-primary" />
            Share Your Prayer Need
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe what you need prayer for... (e.g., 'I'm struggling with anxiety and need God's peace' or 'My family needs financial breakthrough')"
            value={prayerRequest}
            onChange={(e) => setPrayerRequest(e.target.value)}
            rows={4}
            className="w-full"
          />
          
          <Button 
            onClick={handlePrayerRequest}
            className="w-full"
            disabled={prayerAssistantMutation.isPending}
          >
            {prayerAssistantMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-primary border-t-transparent mr-2" />
                Generating Prayer Guidance...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Prayer Guidance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Request Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Prayer Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentRequests.map((request, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickRequest(request)}
                className="text-left justify-start h-auto p-3"
              >
                {request}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prayer Response */}
      {response && (
        <Card className="border-2 border-brand-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-primary" />
                Your Prayer Guidance
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={copyAllPrayerPoints}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Bible Verses */}
            {response.bibleVerses.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Scripture Foundation
                </h3>
                <div className="space-y-3">
                  {response.bibleVerses.map((verse, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-blue-800">
                          {verse.reference} ({verse.version})
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(`${verse.reference}: "${verse.verse}"`)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => speakText(verse.verse)}
                          >
                            <Volume2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-blue-700 italic">"{verse.verse}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prayer Points */}
            {response.prayerPoints.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-green-600" />
                  Prayer Points
                </h3>
                <div className="space-y-2">
                  {response.prayerPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <Badge variant="secondary" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <p className="text-green-800 flex-1">{point}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(point)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement */}
            {response.encouragement && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Encouragement
                </h3>
                <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <p className="text-purple-800 leading-relaxed">{response.encouragement}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-brand-neutral"
                onClick={copyAllPrayerPoints}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Prayer Points
              </Button>
              <Button
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-brand-neutral"
                onClick={() => {
                  const shareText = `Prayer Guidance:\n\n${response.prayerPoints.join('\n')}\n\n${response.encouragement}`;
                  if (navigator.share) {
                    navigator.share({ text: shareText });
                  } else {
                    copyToClipboard(shareText);
                  }
                }}
              >
                <Heart className="w-4 h-4 mr-2" />
                Share with Prayer Partner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Integration Notice */}
      <Card className="shadow-lg border-yellow-200 border-2 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start">
            <Sparkles className="text-yellow-600 mr-3 mt-1 w-5 h-5" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">AI Integration Required</h4>
              <p className="text-yellow-700 text-sm">
                To enable the AI Prayer Assistant, you'll need to provide API keys for DeepSeek AI and Bible API services. 
                This will allow real-time generation of personalized prayer guidance and biblical references.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
