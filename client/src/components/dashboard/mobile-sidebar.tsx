import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Menu, User, Home, Calendar, Book, MessageCircle, BarChart, Settings, LogOut, Clock, Bell, TrendingUp, FileText, Heart, Shield, Search, Users, Star, Zap } from "lucide-react";

interface MobileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail?: string;
  userProfile?: any;
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileSidebar({
  activeTab,
  onTabChange,
  onSignOut,
  userEmail,
  userProfile,
  isOpen,
  onToggle
}: MobileSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, description: "Overview & Quick Stats" },
    { id: "prayer-slots", label: "Prayer Slots", icon: Calendar, description: "Manage Your Prayer Time" },
    { id: "bible-chat", label: "Bible Chat", icon: Book, description: "AI-Powered Bible Study" },
    { id: "prayer-planner", label: "Prayer Planner", icon: MessageCircle, description: "Plan Your Prayers" },
    { id: "bible-verse-search", label: "Bible Verse Search", icon: Search, description: "Find Scripture" },
    { id: "prayer-journey", label: "Prayer Journey", icon: TrendingUp, description: "Track Your Growth" },
    { id: "audio-bible", label: "Audio Bible", icon: Heart, description: "Listen to Scripture" },
    { id: "analytics", label: "Analytics", icon: BarChart, description: "Prayer Statistics" },
  ];

  const handleItemClick = (tabId: string) => {
    onTabChange(tabId);
    onToggle(); // Close sidebar on mobile after selection
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-gi-primary to-gi-primary/90 transform transition-transform duration-300 ease-in-out z-50 lg:hidden flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gi-primary/20">
          <div className="flex items-center space-x-3">
            <img 
              src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
              alt="Global Intercessors" 
              className="w-10 h-10 rounded-full bg-white/10 p-1"
            />
            <div>
              <h2 className="text-lg font-bold text-white">Global Intercessors</h2>
              <p className="text-xs text-gi-primary/200">Prayer Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-white hover:bg-gi-primary/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Section */}
        <div className="p-4 border-b border-gi-primary/20">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gi-primary/20 rounded-lg p-3 transition-colors"
            onClick={() => handleItemClick('profile')}
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gi-gold rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                {userProfile?.profilePicture ? (
                  <img 
                    src={userProfile.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-gi-primary" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userProfile?.fullName || userEmail || "User"}
              </p>
              <p className="text-xs text-gi-primary/200 truncate">
                {userProfile?.city ? `${userProfile.city} • ` : ''}Intercessor
              </p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-xs text-green-300 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gi-primary/30 scrollbar-track-transparent">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Button
                    onClick={() => handleItemClick(item.id)}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left hover:bg-gi-primary/20 transition-all duration-200 font-medium h-auto p-3",
                      activeTab === item.id 
                        ? "bg-gi-gold text-gi-primary shadow-lg transform scale-105" 
                        : "text-white"
                    )}
                  >
                    <div className="flex items-center w-full">
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className={cn(
                          "text-xs mt-0.5",
                          activeTab === item.id ? "text-gi-primary/70" : "text-white/60"
                        )}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gi-primary/20">
          <Button
            onClick={onSignOut}
            variant="ghost"
            className="w-full justify-start text-left hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </>
  );
}