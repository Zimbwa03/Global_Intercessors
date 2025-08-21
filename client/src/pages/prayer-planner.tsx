import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIPrayerPlanner } from "@/components/dashboard/ai-prayer-planner";
import { AIPrayerAssistant } from "@/components/dashboard/ai-prayer-assistant";
import { Heart, Sparkles, Target, BookOpen } from "lucide-react";

export default function PrayerPlannerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Heart className="w-10 h-10 text-gi-primary" />
            AI-Powered Prayer Planner
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Create personalized prayer plans with AI assistance, track your spiritual growth, 
            and receive intelligent suggestions for deeper spiritual growth and intercession.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* AI Prayer Planner Component */}
          <div className="space-y-6">
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center">
                  <Sparkles className="w-6 h-6 mr-3" />
                  Structured Prayer Point Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AIPrayerPlanner />
              </CardContent>
            </Card>
          </div>

          {/* AI Prayer Assistant Component */}
          <div className="space-y-6">
            <Card className="border-2 border-gi-primary/200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center">
                  <Target className="w-6 h-6 mr-3" />
                  Personal Prayer Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AIPrayerAssistant />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI-Generated Prayer Points</h3>
            <p className="text-gray-600 text-sm">
              Get biblically-grounded prayer points tailored to your specific needs and spiritual focus.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-gi-primary/100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-gi-primary/600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Scripture Integration</h3>
            <p className="text-gray-600 text-sm">
              Each prayer plan includes relevant Bible verses and spiritual insights for deeper understanding.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Personal Guidance</h3>
            <p className="text-gray-600 text-sm">
              Receive personalized prayer guidance and encouragement based on your prayer requests.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}