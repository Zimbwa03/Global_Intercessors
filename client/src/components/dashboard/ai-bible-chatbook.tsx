import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Book, Search, Copy, Volume2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BibleResponse {
  verse: string;
  reference: string;
  version: string;
  explanation: string;
  prayerPoint: string;
}

export function AIBibleChatbook() {
  const { toast } = useToast();
  const [phrase, setPhrase] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("KJV");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedVerse, setSelectedVerse] = useState("");
  const [response, setResponse] = useState<BibleResponse | null>(null);

  const bibleMutation = useMutation({
    mutationFn: async (data: {
      phrase: string;
      version: string;
      chapter?: string;
      verse?: string;
    }) => {
      const response = await fetch("/api/bible-chat", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to generate Bible response');
      return response.json();
    },
    onSuccess: (data) => {
      setResponse(data);
      toast({
        title: "Bible Response Generated",
        description: "Your biblical guidance is ready!"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate Bible response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) {
      toast({
        title: "Please enter a phrase",
        description: "Type a word, phrase, or situation to search for.",
        variant: "destructive"
      });
      return;
    }

    bibleMutation.mutate({
      phrase: phrase.trim(),
      version: selectedVersion,
      chapter: selectedChapter || undefined,
      verse: selectedVerse || undefined
    });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-brand-primary" />
            AI-Powered Bible Chatbook
          </CardTitle>
          <p className="text-sm text-gray-600">
            Type any word, phrase, or situation to receive biblical guidance with AI-powered explanations
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="phrase">Search Phrase or Situation</Label>
              <Input
                id="phrase"
                placeholder="e.g., fear, healing, protection, wisdom..."
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Bible Version Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bible Version</Label>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KJV">King James Version (KJV)</SelectItem>
                    <SelectItem value="NIV">New International Version (NIV)</SelectItem>
                    <SelectItem value="ESV">English Standard Version (ESV)</SelectItem>
                    <SelectItem value="NASB">New American Standard Bible (NASB)</SelectItem>
                    <SelectItem value="NLT">New Living Translation (NLT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chapter (Optional)</Label>
                <Input
                  placeholder="e.g., Psalm 23"
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Verse (Optional)</Label>
                <Input
                  placeholder="e.g., 4"
                  value={selectedVerse}
                  onChange={(e) => setSelectedVerse(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={bibleMutation.isPending}
            >
              {bibleMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-primary border-t-transparent mr-2" />
                  Generating Response...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Get Bible Verse & Explanation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Biblical Guidance</span>
              <Badge variant="secondary">{response.version}</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Bible Verse */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                  {response.reference}
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`${response.reference}\n"${response.verse}"`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => speakText(response.verse)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 italic text-lg leading-relaxed">
                "{response.verse}"
              </p>
            </div>

            {/* AI Explanation */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Book className="w-4 h-4" />
                AI Explanation
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {response.explanation}
                </p>
              </div>
            </div>

            {/* Prayer Point */}
            <div className="space-y-2">
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                Suggested Prayer Point
              </h3>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {response.prayerPoint}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => copyToClipboard(response.prayerPoint)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Prayer Point
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}