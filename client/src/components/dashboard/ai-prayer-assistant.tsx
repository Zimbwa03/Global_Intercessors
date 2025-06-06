import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<PrayerResponse | null>(null);
  const [recentRequests, setRecentRequests] = useState<string[]>([
    "Guide my prayer for strength during difficult times",
    "Help me pray for my family's financial breakthrough",
    "Prayer for healing and restoration"
  ]);
  const { toast } = useToast();

  const handlePrayerRequest = async () => {
    if (!prayerRequest.trim()) {
      toast({
        title: "Prayer Request Required",
        description: "Please enter what you'd like prayer guidance for",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // This would integrate with DeepSeek AI API and Bible API
      // For now, showing the structure with sample data
      toast({
        title: "API Integration Required",
        description: "AI prayer assistant requires DeepSeek API key and Bible API integration. Please provide the necessary API credentials.",
        variant: "destructive"
      });
      
      // Simulated response structure for UI demonstration
      setTimeout(() => {
        setResponse({
          bibleVerses: [
            {
              verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
              reference: "Jeremiah 29:11",
              version: "NIV"
            },
            {
              verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
              reference: "Romans 8:28",
              version: "NIV"
            }
          ],
          prayerPoints: [
            "Thank God for His faithfulness and constant presence in your life",
            "Ask for wisdom and discernment in making important decisions",
            "Pray for strength to overcome current challenges",
            "Request protection and guidance for your loved ones",
            "Declare God's promises over your situation"
          ],
          encouragement: "Remember that God hears every prayer and works all things together for your good. Trust in His perfect timing and plan for your life."
        });
        
        // Add to recent requests
        setRecentRequests(prev => [prayerRequest, ...prev.slice(0, 4)]);
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Unable to generate prayer guidance. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleQuickRequest = (request: string) => {
    setPrayerRequest(request);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Prayer Assistant</h2>
        <p className="text-gray-600">Get biblical guidance and structured prayer points for your needs</p>
      </div>

      {/* Prayer Request Input */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-robot text-brand-accent text-sm"></i>
            </div>
            What would you like prayer guidance for?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prayerRequest">Describe your prayer need</Label>
            <Textarea
              id="prayerRequest"
              value={prayerRequest}
              onChange={(e) => setPrayerRequest(e.target.value)}
              placeholder="e.g., I need strength during a difficult season, guidance for an important decision, healing for a loved one..."
              className="mt-2 min-h-[100px]"
            />
          </div>
          
          <Button
            onClick={handlePrayerRequest}
            disabled={isLoading || !prayerRequest.trim()}
            className="w-full bg-brand-accent text-brand-primary hover:bg-yellow-400 font-semibold"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Generating Prayer Guidance...
              </>
            ) : (
              <>
                <i className="fas fa-pray mr-2"></i>
                Get Prayer Guidance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Prayer Requests */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-lightning-bolt text-brand-accent text-sm"></i>
            </div>
            Quick Prayer Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Strength and courage",
              "Family relationships",
              "Financial breakthrough",
              "Health and healing",
              "Career guidance",
              "Spiritual growth",
              "Peace and comfort",
              "Wisdom and discernment"
            ].map((topic, index) => (
              <Button
                key={index}
                onClick={() => handleQuickRequest(`Guide my prayer for ${topic.toLowerCase()}`)}
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-brand-neutral text-left justify-start"
              >
                <i className="fas fa-plus mr-2 text-xs"></i>
                {topic}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-history text-brand-accent text-sm"></i>
            </div>
            Recent Prayer Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentRequests.map((request, index) => (
              <div
                key={index}
                onClick={() => setPrayerRequest(request)}
                className="p-3 bg-brand-neutral rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <p className="text-sm text-gray-700">{request}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Response */}
      {response && (
        <Card className="shadow-lg border-brand-accent border-2">
          <CardHeader>
            <CardTitle className="flex items-center text-brand-primary">
              <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-bible text-brand-primary text-sm"></i>
              </div>
              Prayer Guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bible Verses */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fas fa-book-open text-brand-accent mr-2"></i>
                Related Bible Verses
              </h4>
              <div className="space-y-3">
                {response.bibleVerses.map((verse, index) => (
                  <div key={index} className="bg-brand-neutral rounded-lg p-4">
                    <p className="text-gray-700 italic mb-2">"{verse.verse}"</p>
                    <p className="text-sm font-semibold text-brand-primary">
                      {verse.reference} ({verse.version})
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prayer Points */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <i className="fas fa-list text-brand-accent mr-2"></i>
                Structured Prayer Points
              </h4>
              <div className="space-y-2">
                {response.prayerPoints.map((point, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-brand-accent text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Encouragement */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                <i className="fas fa-heart text-green-600 mr-2"></i>
                Encouragement
              </h4>
              <p className="text-green-700">{response.encouragement}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-brand-neutral"
              >
                <i className="fas fa-copy mr-2"></i>
                Copy Prayer Points
              </Button>
              <Button
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-brand-neutral"
              >
                <i className="fas fa-share mr-2"></i>
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
            <i className="fas fa-info-circle text-yellow-600 mr-3 mt-1"></i>
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