import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase, type AuthUser } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { PrayerSlotManagement } from "@/components/dashboard/prayer-slot-management";
import { UpdatesAnnouncements } from "@/components/dashboard/updates-announcements";
import { AIPrayerAssistant } from "@/components/dashboard/ai-prayer-assistant";
import { SlotCoverageMonitor } from "@/components/dashboard/slot-coverage-monitor";
import { AIBibleChatbook } from "@/components/dashboard/ai-bible-chatbook";
import { PrayerPlanner } from "@/components/dashboard/prayer-planner";
import { AudioBiblePlayer } from "@/components/dashboard/audio-bible-player";
import { NotificationSetup } from "@/components/dashboard/notification-setup";
import { UserProfile } from "@/components/dashboard/user-profile";
import { PrayerJourneyVisualizer } from "@/components/dashboard/prayer-journey-visualizer";
import { BibleVerseSearch } from "@/components/dashboard/bible-verse-search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { notificationService } from "@/lib/notificationService";

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch user profile from database
        try {
          const { data: userProfile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
          }

          // Combine auth user with profile data
          const enrichedUser = {
            ...user,
            profile: userProfile || null
          } as AuthUser & { profile: any };

          setUser(enrichedUser);
          
          // Initialize notifications
          await notificationService.initialize();
          console.log('Notification service initialized:', notificationService.getFCMToken() !== null);
          
          // Schedule prayer slot reminders if user has active slots
          try {
            const response = await fetch(`/api/prayer-slot/${user.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.prayerSlot && data.prayerSlot.status === 'active') {
                notificationService.scheduleSlotReminders(data.prayerSlot);
                console.log('Prayer slot reminders scheduled for:', data.prayerSlot.slotTime);
              }
            }
          } catch (error) {
            console.error('Error scheduling prayer slot reminders:', error);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(user as AuthUser);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-gi-white">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-gi-primary mb-4"></i>
          <p className="text-gi-dark/80">Loading dashboard...</p>
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
      case "prayer-journey":
        return <PrayerJourneyVisualizer userId={user.id} />;
      case "updates":
        return <UpdatesAnnouncements />;
      case "ai-assistant":
        return <AIPrayerAssistant />;
      case "bible-chatbook":
        return <AIBibleChatbook />;
      case "bible-search":
        return <BibleVerseSearch />;
      case "prayer-planner":
        return <PrayerPlanner />;
      case "audio-bible":
        return (
          <AudioBiblePlayer
              isActive={true}
              onPlaybackChange={(isPlaying) => {
                console.log(`Audio Bible ${isPlaying ? 'started' : 'stopped'}`);
              }}
          />
        );
      case "notifications":
        return <NotificationSetup />;
      case "coverage-monitor":
        return <SlotCoverageMonitor />;
      case "profile":
        return <UserProfile userEmail={user.email} />;
      default:
        return <DashboardOverview userEmail={user.email} />;
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gi-white">
        {/* Mobile Header */}
        <header className="bg-gi-primary text-white p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gi-gold rounded-full flex items-center justify-center">
              <i className="fas fa-praying-hands text-gi-primary text-sm"></i>
            </div>
            <h1 className="font-bold text-lg font-poppins">Global Intercessors</h1>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gi-primary/80">
                <i className="fas fa-bars"></i>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <Sidebar 
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                onSignOut={handleSignOut}
                userEmail={user.email}
                isMobile={true}
              />
            </SheetContent>
          </Sheet>
        </header>

        {/* Mobile Navigation Pills */}
        <div className="bg-white border-b p-3 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {[
              { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
              { id: "prayer-slot", label: "Prayer", icon: "fas fa-clock" },
              { id: "prayer-journey", label: "Journey", icon: "fas fa-route" },
              { id: "audio-bible", label: "Audio", icon: "fas fa-volume-up" },
              { id: "bible-chatbook", label: "Bible Chat", icon: "fas fa-book" },
              { id: "bible-search", label: "Search", icon: "fas fa-search" },
              { id: "prayer-planner", label: "Planner", icon: "fas fa-calendar-check" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? "bg-gi-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <i className={`${item.icon} text-sm mb-1`}></i>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Content */}
        <main className="p-4 pb-20">
          {renderContent()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-neutral flex">
      {/* Desktop Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        userEmail={user.email}
      />

      {/* Desktop Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}