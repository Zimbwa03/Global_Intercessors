import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase, type AuthUser } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PrayerSlotManagement } from "@/components/dashboard/prayer-slot-management";
import { UpdatesAnnouncements } from "@/components/dashboard/updates-announcements";
import { AIPrayerAssistant } from "@/components/dashboard/ai-prayer-assistant";
import { NotificationSetup } from "@/components/dashboard/notification-setup";
import { SlotCoverageMonitor } from "@/components/dashboard/slot-coverage-monitor";
import { AIBibleChatbook } from "@/components/dashboard/ai-bible-chatbook";
import { AIPrayerPlanner } from "@/components/dashboard/ai-prayer-planner";
import { AudioBiblePlayer } from "@/components/dashboard/audio-bible-player";

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user as AuthUser);
      } else {
        navigate("/");
      }
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while signing out.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-neutral">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-brand-primary mb-4"></i>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview userEmail={user.email} />;
      case "prayer-slot":
        return <PrayerSlotManagement userEmail={user.email} />;
      case "notifications":
        return <NotificationSetup />;
      case "updates":
        return <UpdatesAnnouncements />;
      case "ai-assistant":
        return <AIPrayerAssistant />;
      case "bible-chatbook":
        return <AIBibleChatbook />;
      case "prayer-planner":
        return <AIPrayerPlanner />;
            case "audio-bible":
        return (
          <AudioBiblePlayer
              isActive={true}
              onPlaybackChange={(isPlaying) => {
                console.log(`Audio Bible ${isPlaying ? 'started' : 'stopped'}`);
              }}
          />
        );
      default:
        return <DashboardOverview userEmail={user.email} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-neutral flex">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        userEmail={user.email}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}