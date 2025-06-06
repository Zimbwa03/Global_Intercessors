import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail?: string;
}

export function Sidebar({ activeTab, onTabChange, onSignOut, userEmail }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
    { id: "prayer-slot", label: "Prayer Slot", icon: "fas fa-clock" },
    { id: "notifications", label: "Notifications", icon: "fas fa-bell" },
    { id: "updates", label: "Updates", icon: "fas fa-bullhorn" },
    { id: "audio-bible", label: "Audio Bible", icon: "fas fa-volume-up" },
    { id: "bible-chatbook", label: "Bible Chatbook", icon: "fas fa-book" },
    { id: "prayer-planner", label: "Prayer Planner", icon: "fas fa-heart" },
  ];

  return (
    <div className={cn(
      "bg-brand-primary text-white h-full flex flex-col transition-brand shadow-brand-lg relative",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-800/30 to-blue-900/30"></div>

      {/* Header */}
      <div className="p-4 border-b border-blue-700/50 relative">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center shadow-brand">
                <i className="fas fa-praying-hands text-brand-primary text-sm"></i>
              </div>
              <h2 className="font-bold text-lg font-poppins">Global Intercessors</h2>
            </div>
          )}
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700/50 transition-brand"
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-blue-700/50 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-brand">
              <i className="fas fa-user text-brand-primary"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate font-poppins">
                {userEmail || "User"}
              </p>
              <p className="text-xs text-blue-200">Intercessor</p>
            </div>
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
                  "w-full justify-start text-left hover:bg-blue-700/50 transition-brand font-poppins",
                  activeTab === item.id ? "bg-brand-accent text-brand-primary shadow-brand" : "text-white",
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
      <div className="p-4 border-t border-blue-700/50 relative">
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