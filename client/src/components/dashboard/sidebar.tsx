import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { User } from "lucide-react";

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
  ];

  // Dummy navigation for the purpose of the example, replace with your actual navigation structure
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: (props: any) => <i className={`fas fa-home ${props.className}`}></i> },
    { name: "Prayer Slot", href: "/prayer-slot", icon: (props: any) => <i className={`fas fa-clock ${props.className}`}></i> },
    { name: "Prayer Journey", href: "/prayer-journey", icon: (props: any) => <i className={`fas fa-route ${props.className}`}></i> },
    { name: "Updates", href: "/updates", icon: (props: any) => <i className={`fas fa-bullhorn ${props.className}`}></i> },
    { name: "Bible Chatbook", href: "/bible-chatbook", icon: (props: any) => <i className={`fas fa-book ${props.className}`}></i> },
    { name: "Bible Search", href: "/bible-search", icon: (props: any) => <i className={`fas fa-search ${props.className}`}></i> },
    { name: "Prayer Planner", href: "/prayer-planner", icon: (props: any) => <i className={`fas fa-calendar-check ${props.className}`}></i> },
  ];

  const isActive = (href: string) => activeTab === href.replace('/', ''); // Simple check, adjust as needed

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
      <div className="absolute inset-0 bg-gradient-to-b from-gi-primary/30 to-gi-primary/30"></div>

      {/* Desktop Header */}
      <div className="p-4 border-b border-gi-gold/20 relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-2">
              <img
                src="/src/assets/GI_Logo_Main_1751586542563.png"
                alt="Global Intercessors"
                className="h-8 w-8"
              />
              <Button
                onClick={() => setIsCollapsed(!isCollapsed)}
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
                  src="/src/assets/GI_Logo_Main_1751586542563.png"
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
                onClick={() => setIsCollapsed(!isCollapsed)}
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
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-gi-gold text-gi-primary border-r-2 border-gi-gold'
                : 'text-gi-white hover:bg-gi-gold/10 hover:text-gi-gold'
            }`}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5" />
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

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