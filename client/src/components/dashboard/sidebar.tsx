import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { User } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail?: string;
  userProfile?: any;
  isMobile?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ activeTab, onTabChange, onSignOut, userEmail, userProfile, isMobile = false, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Notify parent component when collapse state changes
  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
    { id: "prayer-slot", label: "Prayer Slot", icon: "fas fa-clock" },
    { id: "prayer-journey", label: "Prayer Journey", icon: "fas fa-route" },
    { id: "updates", label: "Updates", icon: "fas fa-bullhorn" },
    { id: "bible-chatbook", label: "Bible Chatbook", icon: "fas fa-book" },
    { id: "bible-search", label: "Bible Search", icon: "fas fa-search" },
    { id: "prayer-planner", label: "Prayer Planner", icon: "fas fa-calendar-check" },
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
              { id: "schedule", label: "Prayer Schedule", icon: "fas fa-calendar-alt" },
              { id: "whatsapp-updates", label: "WhatsApp Updates", icon: "fab fa-whatsapp" }
            ].map((item) => (
              <li key={item.id}>
                <Button
                  onClick={() => {
                    console.log('Sidebar button clicked:', item.id);
                    onTabChange(item.id);
                  }}
                  variant="ghost"
                  disabled={false}
                  className={`w-full justify-start text-left p-4 h-auto transition-all duration-200 ${
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
      "bg-gi-primary text-white h-screen flex flex-col transition-brand shadow-brand-lg fixed left-0 top-0 z-30",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-gi-primary/30 to-gi-primary/30"></div>

      {/* Desktop Header */}
      <div className="p-4 border-b border-gi-gold/20 relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-2">
              <img
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png"
                alt="Global Intercessors"
                className="h-8 w-8"
              />
              <Button
                onClick={handleCollapseToggle}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gi-primary/50 transition-brand"
              >
                <i className="fas fa-chevron-right"></i>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <img
                  src="https://lmhbvdxainxcjuveisfe.supabase.co/storage/v1/object/sign/global/WhatsApp%20Image%202025-08-11%20at%2017.00.22_905ceab9.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMzRkOTk0YS1mMTcxLTRhMDMtYWEzMS0wNDlkNDkwM2I2ZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwvV2hhdHNBcHAgSW1hZ2UgMjAyNS0wOC0xMSBhdCAxNy4wMC4yMl85MDVjZWFiOS5wbmciLCJpYXQiOjE3NTU2OTYzMTcsImV4cCI6NTI1NjE5MjMxN30.tlH8qflQvmFV1dN8okIoPLc8NMEa1mbxIsqZo1SZh9k"
                  alt="Global Intercessors"
                  className="h-8 w-8"
                />
                <div>
                  <h2 className="text-lg font-semibold text-gi-white">
                    Global Intercessors
                  </h2>
                  <p className="text-sm text-gi-gold">Prayer Management</p>
                </div>
              </div>
              <Button
                onClick={handleCollapseToggle}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gi-primary/50 transition-brand"
              >
                <i className="fas fa-chevron-left"></i>
              </Button>
            </>
          )}
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
      <nav className="flex-1 p-4 space-y-2 relative">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => {
              console.log('Desktop sidebar button clicked:', item.id);
              onTabChange(item.id);
            }}
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-3'} py-2 h-auto text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-gi-gold text-gi-primary border-r-2 border-gi-gold'
                : 'text-gi-white hover:bg-gi-gold/10 hover:text-gi-gold'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <i className={`${item.icon} h-5 w-5`}></i>
            {!isCollapsed && <span>{item.label}</span>}
          </Button>
        ))}

        {/* Additional menu items */}
        <Button
          onClick={() => {
            console.log('Desktop sidebar button clicked: schedule');
            onTabChange('schedule');
          }}
          variant="ghost"
          className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start space-x-3 px-3'} py-2 h-auto text-sm font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'bg-gi-gold text-gi-primary border-r-2 border-gi-gold'
              : 'text-gi-white hover:bg-gi-gold/10 hover:text-gi-gold'
          }`}
          title={isCollapsed ? 'Prayer Schedule' : undefined}
        >
          <i className="fas fa-calendar-alt h-5 w-5"></i>
          {!isCollapsed && <span>Prayer Schedule</span>}
        </Button>

  

      {/* Logout */}
      <div className="p-4 border-t border-gi-gold/20">
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2`}>
          <User className="h-5 w-5 text-gi-gold" />
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-gi-white">Prayer Warrior</p>
              <p className="text-xs text-gi-gold/80">Active Session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
