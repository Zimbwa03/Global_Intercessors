import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Copy,
  Share,
  Bot,
  User,
  Volume2
} from "lucide-react";
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
        insights: data.insights
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
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
      {/* Interactive Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gi-primary" />
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
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
    </div>
  );
}