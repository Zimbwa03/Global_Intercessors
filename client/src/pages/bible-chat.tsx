import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIBibleChatbook } from "@/components/dashboard/ai-bible-chatbook";
import { Book, MessageCircle, Search, Heart, Lightbulb, Globe } from "lucide-react";

export default function BibleChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Book className="w-10 h-10 text-gi-primary/600" />
            AI-Powered Bible Study Assistant
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore Scripture with intelligent insights, get personalized prayer guidance, 
            and deepen your understanding of God's Word through AI-enhanced Bible study.
          </p>
        </div>

        {/* Main Bible Chat Interface */}
        <div className="mb-8">
          <Card className="border-2 border-gi-primary/200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center">
                <MessageCircle className="w-6 h-6 mr-3" />
                Interactive Bible Study & Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <AIBibleChatbook />
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-gi-primary/100">
            <div className="w-12 h-12 bg-gi-primary/100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <img 
                src="/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className="w-6 h-6 object-contain absolute opacity-50"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <MessageCircle className="w-6 h-6 text-gi-primary/600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Interactive Chat</h3>
            <p className="text-gray-600 text-sm">
              Have conversations about biblical topics and receive scriptural guidance in real-time.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-green-100">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Verse Search</h3>
            <p className="text-gray-600 text-sm">
              Search for specific verses or topics across multiple Bible versions with AI explanations.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Insights</h3>
            <p className="text-gray-600 text-sm">
              Get intelligent explanations and spiritual insights for deeper biblical understanding.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-red-100">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Prayer Points</h3>
            <p className="text-gray-600 text-sm">
              Receive suggested prayer points based on your biblical study and spiritual needs.
            </p>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-gi-primary/200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-gi-primary/600 mr-3" />
                <h3 className="text-xl font-semibold text-gi-primary/800">
                  Multiple Bible Versions Supported
                </h3>
              </div>
              <p className="text-gi-primary/700 max-w-2xl mx-auto">
                Access KJV, NIV, ESV, NASB, and NLT Bible versions with AI-powered contextual understanding 
                and cross-reference capabilities for comprehensive biblical study.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}