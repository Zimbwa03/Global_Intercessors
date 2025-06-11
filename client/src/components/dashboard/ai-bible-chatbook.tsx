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

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  scripture?: {
    reference: string;
    text: string;
  };
  insights?: string[];
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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

  const chatMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      context: ChatMessage[];
    }) => {
      const response = await fetch("/api/bible-chat", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to process chat message');
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        scripture: data.scripture,
        insights: data.insights
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    chatMutation.mutate({
      message: currentMessage.trim(),
      context: messages.slice(-5) // Send last 5 messages for context
    });
    
    setCurrentMessage("");
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

  const MessageBubble = ({ message }: { message: ChatMessage }) => (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        message.type === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900 border'
      }`}>
        <p className="mb-2">{message.content}</p>
        {message.scripture && (
          <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-blue-700">{message.scripture.reference}</p>
            <p className="text-sm italic">{message.scripture.text}</p>
          </div>
        )}
        {message.insights && message.insights.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.insights.map((insight, idx) => (
              <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {insight}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Interactive Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-brand-primary" />
            Interactive Bible Chat
          </CardTitle>
          <p className="text-sm text-gray-600">
            Have a conversation about biblical topics, ask questions, and receive scriptural guidance
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Book className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Start a conversation about biblical topics</p>
                  <p className="text-sm">Ask questions, seek guidance, or explore Scripture</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-100 rounded-lg p-3 border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask about biblical topics, verses, or spiritual guidance..."
              className="flex-1"
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={chatMutation.isPending || !currentMessage.trim()}
            >
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bible Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-primary" />
            Bible Verse Search
          </CardTitle>
          <p className="text-sm text-gray-600">
            Search for specific verses or topics to receive biblical guidance with explanations
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