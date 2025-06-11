import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Send, 
  Search, 
  Heart, 
  Star, 
  Quote, 
  MessageCircle, 
  Loader2,
  Copy,
  BookmarkPlus,
  Lightbulb,
  RefreshCw
} from "lucide-react";

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

interface ScriptureCard {
  reference: string;
  text: string;
  context: string;
  saved: boolean;
}

export default function BibleChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Welcome to the AI-Powered Bible Study Assistant! I'm here to help you explore God's Word with deep insights, contextual understanding, and spiritual guidance. Ask me about any biblical topic, seek prayer guidance, or request verse recommendations.",
      timestamp: new Date(),
      insights: ["Interactive Bible Study", "AI-Powered Insights", "Prayer Guidance"]
    }
  ]);
  
  const [currentMessage, setCurrentMessage] = useState("");
  const [savedScriptures, setSavedScriptures] = useState<ScriptureCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'chat' | 'saved' | 'search'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/bible-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: messages.slice(-5) // Send last 5 messages for context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        scripture: data.scripture,
        insights: data.insights
      };
      
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessageMutation.mutate(currentMessage);
    setCurrentMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveScripture = (scripture: { reference: string; text: string; context?: string }) => {
    const newCard: ScriptureCard = {
      reference: scripture.reference,
      text: scripture.text,
      context: scripture.context || "From AI Bible Study",
      saved: true
    };
    
    setSavedScriptures(prev => [...prev, newCard]);
    toast({
      title: "Scripture Saved",
      description: `${scripture.reference} has been added to your collection.`
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard."
    });
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[80%] ${message.type === 'user' 
        ? 'bg-blue-600 text-white' 
        : 'bg-white border border-gray-200'} rounded-lg p-4 shadow-sm`}>
        
        {message.type === 'ai' && (
          <div className="flex items-center mb-2">
            <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">AI Bible Assistant</span>
          </div>
        )}
        
        <p className={`${message.type === 'user' ? 'text-white' : 'text-gray-800'} leading-relaxed`}>
          {message.content}
        </p>
        
        {message.scripture && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-800">{message.scripture.reference}</h4>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(`${message.scripture?.reference}: ${message.scripture?.text}`)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => saveScripture(message.scripture!)}
                >
                  <BookmarkPlus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-blue-700 italic">{message.scripture.text}</p>
          </div>
        )}
        
        {message.insights && message.insights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.insights.map((insight, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Lightbulb className="w-3 h-3 mr-1" />
                {insight}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="mt-2 text-xs opacity-60">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );

  const QuickPrompts = [
    "Explain the parable of the mustard seed",
    "What does the Bible say about prayer?",
    "Help me understand faith vs works",
    "Verses about God's love and grace",
    "How to pray for my family?",
    "Biblical perspective on forgiveness"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI-Powered Bible Study Assistant
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore Scripture with intelligent insights, get personalized prayer guidance, 
            and deepen your understanding of God's Word through AI-enhanced Bible study.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeTab === 'chat' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('chat')}
              className="mr-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Bible Chat
            </Button>
            <Button
              variant={activeTab === 'saved' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('saved')}
              className="mr-1"
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Saved ({savedScriptures.length})
            </Button>
            <Button
              variant={activeTab === 'search' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('search')}
            >
              <Search className="w-4 h-4 mr-2" />
              Scripture Search
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Interactive Bible Study
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </AnimatePresence>
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-gray-100 rounded-lg p-4 shadow-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                
                {/* Message Input */}
                <div className="border-t p-4 bg-gray-50">
                  <div className="flex space-x-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about any biblical topic, request prayer guidance, or seek verse recommendations..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Prompts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  Quick Bible Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {QuickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-3"
                      onClick={() => setCurrentMessage(prompt)}
                    >
                      <Quote className="w-3 h-3 mr-2 text-blue-500" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Saved Scriptures Preview */}
            {savedScriptures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" />
                    Recently Saved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {savedScriptures.slice(-3).map((scripture, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-800 text-sm">
                          {scripture.reference}
                        </h4>
                        <p className="text-blue-700 text-xs mt-1 line-clamp-2">
                          {scripture.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Heart className="w-5 h-5 mr-2 text-red-500" />
                  Study Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Messages Exchanged</span>
                    <Badge variant="secondary">{messages.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Scriptures Saved</span>
                    <Badge variant="secondary">{savedScriptures.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Topics Explored</span>
                    <Badge variant="secondary">
                      {new Set(messages.flatMap(m => m.insights || [])).size}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}