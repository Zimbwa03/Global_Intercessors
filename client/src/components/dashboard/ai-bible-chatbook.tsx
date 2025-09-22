import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { 
  MessageCircle, 
  Send, 
  Copy,
  Share,
  Bot,
  User,
  Volume2,
  History,
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

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
  sessionId?: string;
  scriptureReference?: string;
  scriptureText?: string;
  prayerPoint?: string;
}

interface ChatHistoryItem {
  id: number;
  user_id: string;
  message_type: 'user' | 'ai';
  message_content: string;
  scripture_reference?: string;
  scripture_text?: string;
  scripture_version?: string;
  ai_explanation?: string;
  prayer_point?: string;
  session_id: string;
  created_at: string;
}

interface ChatSession {
  chat_date: string;
  session_count: number;
  message_count: number;
  first_message_time?: string;
  last_message_time?: string;
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
  const queryClient = useQueryClient();
  const [phrase, setPhrase] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("KJV");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedVerse, setSelectedVerse] = useState("");
  const [response, setResponse] = useState<BibleResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  // Get current user and initialize session
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setCurrentSessionId(`session_${Date.now()}_${user?.id}`);
    };
    initializeUser();
  }, []);

  // Fetch chat history
  const { data: chatHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['bible-chat-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/bible-chat/history', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch chat history');
      const data = await response.json();
      return data.history as ChatHistoryItem[];
    },
    enabled: !!user,
    refetchOnWindowFocus: false
  });

  // Fetch chat sessions summary
  const { data: chatSessions } = useQuery({
    queryKey: ['bible-chat-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/bible-chat/sessions', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch chat sessions');
      const data = await response.json();
      return data.sessions as ChatSession[];
    },
    enabled: !!user,
    refetchOnWindowFocus: false
  });

  const chatMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      context: ChatMessage[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/bible-chat", {
        method: "POST",
        body: JSON.stringify({
          message: data.message,
          bibleVersion: selectedVersion,
          sessionId: currentSessionId
        }),
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process chat message');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        scripture: data.scripture,
        insights: data.insights,
        sessionId: data.sessionId
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
      // Refresh chat history to include the new messages
      refetchHistory();
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  });

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
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
        message.type === 'user' 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
          : 'bg-white text-gray-900 border border-gray-200'
      }`}>
        <div className="whitespace-pre-wrap leading-relaxed mb-3">
          {message.content}
        </div>

        {message.scripture && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-gi-primary/500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gi-primary/700 flex items-center gap-1">
                📖 {message.scripture.reference}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => copyToClipboard(`${message.scripture.reference}: "${message.scripture.text}"`)}
                  className="p-1 hover:bg-gi-primary/100 rounded text-gi-primary/600"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => speakText(message.scripture.text)}
                  className="p-1 hover:bg-gi-primary/100 rounded text-gi-primary/600"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-sm italic text-gray-700 leading-relaxed">
              "{message.scripture.text}"
            </p>
          </div>
        )}

        {message.insights && message.insights.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
              ✨ Key Insights
            </p>
            <div className="flex flex-wrap gap-2">
              {message.insights.map((insight, idx) => (
                <span 
                  key={idx} 
                  className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full border border-green-200"
                >
                  {insight}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs opacity-60 mt-3 flex items-center gap-1">
          🕒 {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-brand-lg border border-gi-primary/20">
        <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
          <CardTitle className="text-2xl font-bold text-gi-primary flex items-center font-poppins">
            <div className="w-8 h-8 bg-gi-primary rounded-lg flex items-center justify-center mr-3">
              <MessageCircle className="h-4 w-4 text-gi-gold" />
            </div>
            AI Bible Chatbook
          </CardTitle>
          <p className="text-gray-600">
            Ask spiritual questions and receive AI-powered biblical guidance with scripture references. 
            Chat history is saved for 7 days.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white border-b border-gi-primary/10">
              <TabsTrigger 
                value="chat" 
                className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
                {chatHistory && chatHistory.length > 0 && (
                  <Badge className="ml-1 bg-gi-gold/20 text-gi-primary text-xs">
                    {chatHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="flex items-center gap-2 data-[state=active]:bg-gi-primary data-[state=active]:text-white font-poppins"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="p-6 space-y-4">
              {/* Current Session Info */}
              <div className="flex items-center justify-between bg-gi-primary/5 rounded-lg p-3 border border-gi-primary/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gi-primary" />
                  <span className="text-sm font-medium text-gi-primary">Current Session</span>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </div>

              {/* Chat Messages Area */}
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-20">
                    <div className="w-16 h-16 bg-gi-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="h-8 w-8 text-gi-primary" />
                    </div>
                    <p className="text-lg font-medium text-gi-primary font-poppins">Start a conversation</p>
                    <p className="text-sm text-gray-600">Ask questions about faith, prayer, or any biblical topic</p>
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
                            <div className="w-2 h-2 bg-gi-primary rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gi-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gi-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                  className="bg-gi-primary hover:bg-gi-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            {/* Chat History Tab */}
            <TabsContent value="history" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gi-primary font-poppins">Chat History</h3>
                  <p className="text-sm text-gray-600">Your conversations from the past 7 days</p>
                </div>
                <Button
                  onClick={() => refetchHistory()}
                  size="sm"
                  variant="outline"
                  className="border-gi-primary/20"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              <ScrollArea className="h-[500px]">
                {chatHistory && chatHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group messages by session/date */}
                    {(() => {
                      const groupedMessages = chatHistory.reduce((groups: any, message) => {
                        const date = new Date(message.created_at).toDateString();
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(message);
                        return groups;
                      }, {});

                      return Object.entries(groupedMessages).map(([date, messages]: [string, any]) => (
                        <div key={date} className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-gi-primary" />
                            <span className="text-sm font-medium text-gi-primary">
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                            <Badge className="bg-gi-primary/10 text-gi-primary text-xs">
                              {messages.length} messages
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 ml-6 border-l-2 border-gi-primary/20 pl-4">
                            {messages.map((historyMessage: ChatHistoryItem) => (
                              <div key={historyMessage.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    historyMessage.message_type === 'user' 
                                      ? 'bg-gi-primary text-white' 
                                      : 'bg-gi-gold text-white'
                                  }`}>
                                    {historyMessage.message_type === 'user' ? (
                                      <User className="h-3 w-3" />
                                    ) : (
                                      <Bot className="h-3 w-3" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm text-gray-800 mb-1">
                                      {historyMessage.message_content}
                                    </div>
                                    {historyMessage.scripture_reference && (
                                      <div className="bg-gi-primary/5 p-2 rounded border border-gi-primary/10 mt-2">
                                        <div className="text-xs font-medium text-gi-primary mb-1">
                                          {historyMessage.scripture_reference}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {historyMessage.scripture_text}
                                        </div>
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-2">
                                      {new Date(historyMessage.created_at).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gi-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-gi-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-gi-primary mb-2 font-poppins">No Chat History</h3>
                    <p className="text-gray-600">Start a conversation to see your chat history here.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gi-primary font-poppins">Your Bible Chat Progress</h3>
                <p className="text-sm text-gray-600">Track your spiritual conversations over the past 7 days</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-gi-primary" />
                      <div>
                        <p className="text-sm text-gray-600">Total Messages</p>
                        <p className="text-2xl font-bold text-gi-primary">
                          {chatHistory?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Chat Days</p>
                        <p className="text-2xl font-bold text-green-600">
                          {chatSessions?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gi-gold" />
                      <div>
                        <p className="text-sm text-gray-600">Scripture Verses</p>
                        <p className="text-2xl font-bold text-gi-gold">
                          {chatHistory?.filter(msg => msg.scripture_reference).length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Activity Chart */}
              {chatSessions && chatSessions.length > 0 && (
                <Card className="shadow-brand-lg border border-gi-primary/20">
                  <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
                    <CardTitle className="flex items-center gap-2 font-poppins">
                      <TrendingUp className="h-5 w-5 text-gi-primary" />
                      Daily Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {chatSessions.map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gi-primary rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {new Date(session.chat_date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                {session.session_count} session{session.session_count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-gi-primary/10 text-gi-primary">
                            {session.message_count} messages
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Retention Notice */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Data Privacy & Retention</p>
                      <p className="text-xs">
                        Your chat history is automatically stored for 7 days to help you track your spiritual conversations. 
                        After 7 days, messages are automatically deleted to protect your privacy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}