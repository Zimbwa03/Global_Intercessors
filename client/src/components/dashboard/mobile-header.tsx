import { Button } from "@/components/ui/button";
import { Bell, Menu, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  onMenuToggle: () => void;
  userProfile?: any;
  activeTab: string;
  unreadCount?: number;
  onTabChange?: (tab: string) => void;
}

export function MobileHeader({ 
  onMenuToggle, 
  userProfile, 
  activeTab,
  unreadCount = 0,
  onTabChange
}: MobileHeaderProps) {
  
  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'prayer-slots': return 'Prayer Slots';
      case 'bible-chat': return 'Bible Chat';
      case 'prayer-planner': return 'Prayer Planner';
      case 'bible-verse-search': return 'Bible Search';
      case 'analytics': return 'Analytics';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      case 'updates': return 'Updates';
      default: return 'Global Intercessors';
    }
  };

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
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
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
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}