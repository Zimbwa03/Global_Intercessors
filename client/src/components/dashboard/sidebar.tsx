import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail?: string;
  userProfile?: any;
  isMobile?: boolean;
}

export function Sidebar({ activeTab, onTabChange, onSignOut, userEmail, userProfile, isMobile = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
    { id: "prayer-slot", label: "Prayer Slot", icon: "fas fa-clock" },
    { id: "prayer-journey", label: "Prayer Journey", icon: "fas fa-route" },
    { id: "updates", label: "Updates", icon: "fas fa-bullhorn" },
    { id: "bible-chatbook", label: "Bible Chatbook", icon: "fas fa-book" },
    { id: "bible-search", label: "Bible Search", icon: "fas fa-search" },
    { id: "prayer-planner", label: "Prayer Planner", icon: "fas fa-calendar-check" },
    { id: "whatsapp-settings", label: "WhatsApp Bot", icon: "fas fa-mobile-alt" },
  ];

  if (isMobile) {
    return (
      <div className="bg-gi-primary text-white h-full flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-gi-primary/30 to-gi-primary/30"></div>

        {/* Mobile Header */}
        <div className="p-4 border-b border-gi-primary/50 relative">
          <div className="flex items-center space-x-3">
            <img 
              src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
              alt="Global Intercessors Icon" 
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                console.error('Mobile logo failed to load');
              }}
            />
            <h2 className="font-bold text-lg font-poppins">Global Intercessors</h2>
          </div>
        </div>

        {/* Mobile User Info */}
        <div className="p-4 border-b border-gi-primary/50 relative">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gi-primary/30 rounded-lg p-2 transition-colors"
            onClick={() => onTabChange('profile')}
          >
            <div className="w-10 h-10 bg-gi-gold rounded-full flex items-center justify-center">
              <i className="fas fa-user text-gi-primary"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white font-poppins">
                {userProfile?.fullName || userProfile?.full_name || userProfile?.name || "User"}
              </p>
              <p className="text-xs text-gi-gold/80">Intercessor</p>
            </div>
            <i className="fas fa-chevron-right text-gi-gold/80 text-xs"></i>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4 relative">
          <ul className="space-y-3">
            {[
              ...menuItems,
              { id: "ai-assistant", label: "AI Assistant", icon: "fas fa-robot" }
            ].map((item) => (
              <li key={item.id}>
                <Button
                  onClick={() => onTabChange(item.id)}
                  variant="ghost"
                  className={`w-full justify-start text-left p-4 h-auto ${
                    activeTab === item.id
                      ? "bg-gi-gold text-gi-primary font-semibold"
                      : "text-white hover:bg-gi-primary/50"
                  }`}
                >
                  <i className={`${item.icon} mr-3 text-lg`}></i>
                  <span className="text-base">{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Sign Out */}
        <div className="p-4 border-t border-gi-primary/50 relative">
          <Button
            onClick={onSignOut}
            variant="ghost"
            className="w-full justify-start text-white hover:bg-red-600/50 p-4"
          >
            <i className="fas fa-sign-out-alt mr-3"></i>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-gi-primary text-white h-full flex flex-col transition-brand shadow-brand-lg relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800/30 to-blue-900/30"></div>

      {/* Desktop Header */}
      <div className="p-4 border-b border-gi-primary/700/50 relative">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <img 
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className="w-8 h-8 object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.error('Logo failed to load');
                }}
              />
              <h2 className="font-bold text-lg font-poppins">Global Intercessors</h2>
            </div>
          )}
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gi-primary/700/50 transition-brand"
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gi-primary/700/50 relative">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gi-primary/700/30 rounded-lg p-2 transition-colors"
            onClick={() => onTabChange('profile')}
          >
            <div className="w-10 h-10 bg-gi-gold rounded-full flex items-center justify-center shadow-brand overflow-hidden">
              {userProfile?.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <i className="fas fa-user text-gi-primary"></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate font-poppins">
                {userProfile?.fullName || userProfile?.full_name || userProfile?.name || "User"}
              </p>
              <p className="text-xs text-gi-primary/200">
                {userProfile?.city ? `${userProfile.city} • ` : ''}Intercessor
              </p>
            </div>
            <i className="fas fa-chevron-right text-gi-primary/200 text-xs"></i>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 relative">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Button
                onClick={() => onTabChange(item.id)}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left hover:bg-gi-primary/700/50 transition-brand font-poppins",
                  activeTab === item.id ? "bg-gi-gold text-gi-primary shadow-brand" : "text-white",
                  isCollapsed ? "px-3" : "px-4"
                )}
              >
                <i className={`${item.icon} ${isCollapsed ? 'text-center w-full' : 'mr-3'}`}></i>
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gi-primary/700/50 relative">
        <Button
          onClick={onSignOut}
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-red-600/50 transition-brand font-poppins",
            isCollapsed ? "px-3" : "px-4"
          )}
        >
          <i className={`fas fa-sign-out-alt ${isCollapsed ? 'text-center w-full' : 'mr-3'}`}></i>
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}