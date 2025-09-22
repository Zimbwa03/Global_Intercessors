import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase, type AuthUser } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { MobileDashboardOverview } from "@/components/dashboard/mobile-dashboard-overview";
import { PrayerSlotManagement } from "@/components/dashboard/prayer-slot-management";
import { UpdatesAnnouncements } from "@/components/dashboard/updates-announcements";
import { AIPrayerAssistant } from "@/components/dashboard/ai-prayer-assistant";
import { SlotCoverageMonitor } from "@/components/dashboard/slot-coverage-monitor";
import { AIBibleChatbook } from "@/components/dashboard/ai-bible-chatbook";
import { PrayerPlanner } from "@/components/dashboard/prayer-planner";
import { AudioBiblePlayer } from "@/components/dashboard/audio-bible-player";
import { NotificationSetup } from "@/components/dashboard/notification-setup";
import { UserProfile } from "@/components/dashboard/user-profile";

import { BibleVerseSearch } from "@/components/dashboard/bible-verse-search";
import { ScriptureCoach } from "@/components/dashboard/scripture-coach";
import { WhatsAppSettings } from "@/components/dashboard/whatsapp-settings";
import { IntercessorScheduleSettings } from "@/components/intercessor-schedule-settings";
import { WeeklyPrayerAttendance } from "@/components/weekly-prayer-attendance";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { notificationService } from "@/lib/notificationService";

// Helper function to get the current time of day for greeting
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadUpdates, setUnreadUpdates] = useState(3); // Track unread updates
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    console.log('Current activeTab:', activeTab); // Debug log
    switch (activeTab) {
      case "dashboard":
        return isMobile 
          ? <MobileDashboardOverview userEmail={user.email || ""} userId={user.id} onTabChange={setActiveTab} />
          : <DashboardOverview userEmail={user.email} />;
      case "prayer-slot":
      case "prayer-slots":
        console.log('Rendering PrayerSlotManagement for user:', user.email); // Debug log
        return <PrayerSlotManagement userEmail={user.email} />;
      case "bible-chatbook":
        return <AIBibleChatbook />;
      case "prayer-planner":
        return <PrayerPlanner />;
      case "bible-search":
        return <BibleVerseSearch />;
      case "scripture-coach":
        return <ScriptureCoach />;

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
      case "fasting-program":
        return <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gi-primary mb-4">Fasting Program</h2>
          <p className="text-gray-600">Join our community fasting events and spiritual growth programs.</p>
        </div>;
      case "analytics":
        return <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gi-primary mb-4">Prayer Analytics</h2>
          <p className="text-gray-600">Track your prayer consistency and spiritual growth metrics.</p>
        </div>;
      case "updates":
        // Mark updates as read when viewed
        if (unreadUpdates > 0) {
          setUnreadUpdates(0);
        }
        return <UpdatesAnnouncements />;
      case "profile":
        return <UserProfile userEmail={user.email} />;
      
      case "schedule":
        return (
          <div className="space-y-6">
            <div className="grid gap-6">
              <IntercessorScheduleSettings userId={user.id} />
              <WeeklyPrayerAttendance userId={user.id} />
            </div>
          </div>
        );
      
      case "settings":
        return <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gi-primary mb-4">Settings</h2>
          <p className="text-gray-600">Customize your app preferences and notification settings.</p>
        </div>;
      default:
        console.log('Falling back to dashboard for activeTab:', activeTab); // Debug log
        return <DashboardOverview userEmail={user.email} />;
    }
  };

  // Extract userProfile for easier access in the JSX
  const userProfile = user.profile;

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <MobileHeader 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          userProfile={userProfile || user.user_metadata}
          activeTab={activeTab}
          unreadCount={unreadUpdates}
          onTabChange={setActiveTab}
        />

        {/* Mobile Sidebar */}
        <MobileSidebar 
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          onSignOut={handleSignOut}
          userEmail={user.email}
          userProfile={userProfile || user.user_metadata}
          isOpen={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Mobile Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-6 pb-24 space-y-6">
            {/* Render the greeting section */}
            <div className="flex items-center space-x-4 mb-6">
              <img 
                src="/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="GI Logo" 
                className="w-12 h-12" 
              />
              <div>
                <h1 className="text-2xl font-bold text-gi-primary">Welcome back!</h1>
                <p className="text-gray-600">Good {getTimeOfDay()}, {userProfile?.fullName || userProfile?.full_name || userProfile?.name || user?.email?.split('@')[0] || 'User'}!</p>
              </div>
            </div>
            {renderContent()}
          </div>
        </main>



        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-gi-primary/20 lg:hidden z-20 shadow-lg">
          <div className="safe-bottom">
            <div className="flex items-center justify-around py-2 px-1">
              {[
                { id: "dashboard", label: "Home", icon: "🏠" },
                { id: "prayer-slot", label: "Prayer Slot", icon: "🕒" },
                { id: "bible-chatbook", label: "Bible Chat", icon: "📖" },
                { id: "prayer-planner", label: "Plan", icon: "📋" },
                { id: "bible-search", label: "Bible Search", icon: "🔍" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center px-2 py-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[64px] touch-button ${
                    activeTab === item.id
                      ? "text-gi-primary bg-gi-gold/20 scale-105 shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gi-primary/5"
                  }`}
                >
                  <span className="text-lg mb-1">{item.icon}</span>
                  <span className="text-xs font-semibold truncate leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
        userProfile={userProfile || user.user_metadata}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Desktop Main Content */}
      <main className={`flex-1 p-6 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Render the greeting section */}
        <div className="flex items-center space-x-4 mb-6">
          <img 
            src="https://lmhbvdxainxcjuveisfe.supabase.co/storage/v1/object/sign/global/WhatsApp%20Image%202025-08-11%20at%2017.00.22_905ceab9.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMzRkOTk0YS1mMTcxLTRhMDMtYWEzMS0wNDlkNDkwM2I2ZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwvV2hhdHNBcHAgSW1hZ2UgMjAyNS0wOC0xMSBhdCAxNy4wMC4yMl85MDVjZWFiOS5wbmciLCJpYXQiOjE3NTU2OTQ5NjUsImV4cCI6NTI1NjE5MDk2NX0.xYv5TPAGb7ylPV_15DASvdV8K0-MpvNOk-3p3Q2Z1Hc" 
            alt="GI Logo" 
            className="w-12 h-12" 
          />
          <div>
            <h1 className="text-2xl font-bold text-gi-primary">Welcome back!</h1>
            <p className="text-gray-600">Good {getTimeOfDay()}, {userProfile?.fullName || userProfile?.full_name || userProfile?.name || user?.email?.split('@')[0] || 'User'}!</p>
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
