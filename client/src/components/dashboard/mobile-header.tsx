import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge"; // Assuming Badge component is available

// Define Update and AuthUser types if not already defined globally or imported
interface Update {
  id: number;
  title: string;
  message: string;
  timestamp: string;
}

interface AuthUser {
  id: string;
  username: string;
  profilePicture?: string;
  // other user properties
}

interface MobileHeaderProps {
  onMenuToggle: () => void;
  userProfile?: AuthUser; // Changed from any to AuthUser for type safety
  activeTab: string;
  unreadCount?: number; // This might be redundant if notificationCount is used internally
  onTabChange?: (tab: string) => void;
}

export function MobileHeader({
  onMenuToggle,
  userProfile,
  activeTab,
  unreadCount = 0, // Initial unreadCount, but internal state will manage it
  onTabChange
}: MobileHeaderProps) {

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [viewedNotifications, setViewedNotifications] = useState<Set<number>>(new Set());

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'prayer-slots': return 'Prayer Slots';
      case 'bible-chat': return 'Bible Chat';
      case 'prayer-planner': return 'Prayer Planner';
      case 'bible-verse-search': return 'Bible Search';
      case 'analytics': return 'Analytics'; // This case will be replaced by Planner component
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      case 'updates': return 'Updates';
      default: return 'Global Intercessors';
    }
  };

  // Fetch updates
  const { data: updatesData } = useQuery({
    queryKey: ["updates"],
    queryFn: async () => {
      const response = await fetch("/api/updates");
      if (!response.ok) throw new Error("Failed to fetch updates");
      return response.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (updatesData) {
      setUpdates(updatesData);
      // Count only unviewed notifications
      const unviewedCount = updatesData.filter((update: Update) => !viewedNotifications.has(update.id)).length;
      setNotificationCount(unviewedCount);
    }
  }, [updatesData, viewedNotifications]);

  // Placeholder for Planner component logic if it were to be embedded here directly
  // For now, we assume it's handled by the routing/tab change logic

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        {/* Left side - Menu and Title */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="text-gi-primary hover:bg-gi-primary/10"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-2">
            <img
              src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png"
              alt="GI"
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                console.error('Mobile header logo failed to load');
              }}
            />
            <div>
              <h1 className="text-lg font-bold text-gi-primary">
                {getPageTitle(activeTab)}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Global Intercessors
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Updates Button */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              if (onTabChange) {
                onTabChange('updates');
              }
              // Handle notification view logic here or within the updates tab
              setShowNotifications(!showNotifications);
              // Mark all current notifications as viewed when opening the notification panel
              if (!showNotifications) {
                const newViewedSet = new Set(viewedNotifications);
                updates.forEach(update => newViewedSet.add(update.id));
                setViewedNotifications(newViewedSet);
                setNotificationCount(0); // Reset count immediately
              }
            }}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* Profile Avatar */}
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            onClick={() => {
              if (onTabChange) {
                onTabChange('profile');
              }
            }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-gi-gold rounded-full flex items-center justify-center overflow-hidden">
                {userProfile?.profilePicture ? (
                  <img
                    src={userProfile.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-gi-primary" />
                )}
              </div>
              {/* Presence indicator (optional, can be removed if not needed) */}
              {/* <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div> */}
            </div>
          </Button>
        </div>
      </div>
      
    </header>
  );
}